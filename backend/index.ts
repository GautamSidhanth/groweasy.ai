import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csvParser from 'csv-parser';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

// Initialize OpenAI SDK for OpenRouter
const ai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "GrowEasy CRM Importer"
  }
});

const leadSchema = {
  type: "object",
  properties: {
    records: {
      type: "array",
      description: "List of valid extracted leads. Exclude records that do not contain an email AND do not contain a mobile number.",
      items: {
        type: "object",
        properties: {
          created_at: { type: ["string", "null"], description: "Lead creation date (must be convertible to JS Date). Leave null if missing." },
          name: { type: ["string", "null"] },
          email: { type: ["string", "null"], description: "Primary email. If multiple, use first and append rest to crm_note." },
          country_code: { type: ["string", "null"] },
          mobile_without_country_code: { type: ["string", "null"], description: "Primary mobile. If multiple, use first and append rest to crm_note." },
          company: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          state: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          lead_owner: { type: ["string", "null"] },
          crm_status: { type: ["string", "null"], description: "Only: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE" },
          crm_note: { type: ["string", "null"], description: "Remarks, follow-ups, extra emails, extra phones." },
          data_source: { type: ["string", "null"], description: "Only: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots" },
          possession_time: { type: ["string", "null"] },
          description: { type: ["string", "null"] }
        },
        required: ["created_at", "name", "email", "country_code", "mobile_without_country_code", "company", "city", "state", "country", "lead_owner", "crm_status", "crm_note", "data_source", "possession_time", "description"],
        additionalProperties: false
      }
    }
  },
  required: ["records"],
  additionalProperties: false
};

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results: any[] = [];
  const filePath = req.file.path;

  // Parse CSV
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Remove temporary file
      fs.unlinkSync(filePath);

      try {
        const batchSize = 20;
        const processedRecords: any[] = [];
        const skippedCount = { value: 0 };
        
        // LIMIT TO 100 ROWS FOR PERFORMANCE
        const MAX_ROWS = 100;
        if (results.length > MAX_ROWS) {
           console.log(`File is too large (${results.length} rows). Truncating to ${MAX_ROWS} rows.`);
           skippedCount.value += (results.length - MAX_ROWS);
           results.length = MAX_ROWS;
        }

        const totalUploaded = results.length;

        for (let i = 0; i < results.length; i += batchSize) {
          console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(results.length / batchSize)}...`);
          const batch = results.slice(i, i + batchSize);
          
          const prompt = `
You are an expert data mapping assistant. I have a batch of rows parsed from a CSV file.
Map each row to our CRM Lead format based on these rules:

1. Map to fields: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.
2. If a record has NEITHER email NOR mobile number, you MUST OMIT it from the output completely (it is considered invalid).
3. If multiple emails exist, use the first as \`email\` and append the rest to \`crm_note\`.
4. If multiple mobile numbers exist, use the first as \`mobile_without_country_code\` and append the rest to \`crm_note\`.
5. \`crm_status\` can only be: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE. If none match, leave it null.
6. \`data_source\` can only be: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots. If none match, leave it null.
7. \`created_at\` must be an ISO 8601 date string so it can be parsed by JavaScript's new Date().
8. Any extra useful info from unmapped columns should be appended to \`crm_note\`.

You must output valid JSON containing a "records" array, strictly adhering to this schema:
${JSON.stringify(leadSchema, null, 2)}

Input JSON rows:
${JSON.stringify(batch)}
          `;

          let response: any = null;
          let retries = 3;
          while (retries > 0) {
            try {
              const completion = await ai.chat.completions.create({
                model: 'openai/gpt-4o-mini',
                messages: [
                    { role: "system", content: "You are an expert data mapper. You must return valid JSON." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0,
              });
              
              const text = completion.choices[0].message.content;
              if (text) {
                response = JSON.parse(text);
              }
              break;
            } catch (error: any) {
              if ((error?.status === 429 || error?.status >= 500) && retries > 1) {
                console.warn(`API error hit, retrying in 5s... (${retries - 1} retries left)`);
                await new Promise(res => setTimeout(res, 5000));
                retries--;
              } else {
                throw error;
              }
            }
          }

          if (response) {
             const parsed = response;
             if (parsed.records && Array.isArray(parsed.records)) {
                // Determine how many were skipped
                const validRecordsCount = parsed.records.length;
                skippedCount.value += (batch.length - validRecordsCount);

                // Save to database
                for (const rec of parsed.records) {
                  // Pre-process date
                  let createdAt = undefined;
                  if (rec.created_at) {
                    const dt = new Date(rec.created_at);
                    if (!isNaN(dt.getTime())) {
                       createdAt = dt;
                    }
                  }

                  const saved = await prisma.lead.create({
                    data: {
                      created_at: createdAt,
                      name: rec.name,
                      email: rec.email,
                      country_code: rec.country_code,
                      mobile_without_country_code: rec.mobile_without_country_code,
                      company: rec.company,
                      city: rec.city,
                      state: rec.state,
                      country: rec.country,
                      lead_owner: rec.lead_owner,
                      crm_status: rec.crm_status,
                      crm_note: rec.crm_note,
                      data_source: rec.data_source,
                      possession_time: rec.possession_time,
                      description: rec.description,
                    }
                  });
                  processedRecords.push(saved);
                }
             } else {
                skippedCount.value += batch.length; // whole batch failed parsing maybe
             }
          }
        }

        res.json({
          success: true,
          total_imported: processedRecords.length,
          total_skipped: skippedCount.value,
          total_rows_uploaded: totalUploaded,
          records: processedRecords
        });

      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Error processing CSV with AI', details: err.message });
      }
    });
});

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
