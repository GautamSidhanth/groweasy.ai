# GrowEasy AI CSV Importer

An intelligent, AI-powered CSV importer built for the GrowEasy Software Developer Assignment. This application allows users to upload CRM datasets (like Facebook Leads, Google Ads, or custom Excel exports) with varying column structures. It uses an LLM to intelligently extract, standardize, and map those fields into a strict CRM schema.

---

## ✨ Features

- **Intelligent AI Field Mapping**: Uses OpenRouter (`gpt-4o-mini`) to dynamically identify and map unstandardized columns to strict CRM fields.
- **Data Standardization**: Automatically cleans phone numbers, extracts primary emails, and collapses overflow contact data into a `crm_note` field.
- **Smart Data Filtering**: Automatically drops invalid rows (those lacking both an email and a phone number).
- **Beautiful, Responsive UI**: A premium drag-and-drop interface mirroring GrowEasy's core design language, complete with file preview, animated loading states, and color-coded status badges.
- **Robust Error Handling**: Real-time frontend alerts, backend try/catch fallbacks, and a built-in safety truncation limit to prevent timeouts on massive (40,000+ row) datasets.

---

## 🛠️ Tech Stack

**Frontend:**
- [Next.js](https://nextjs.org/) (React Framework)
- `papaparse` for client-side CSV previewing
- Vanilla CSS Modules (Responsive, polished UI)

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Prisma ORM](https://www.prisma.io/) with SQLite database
- `openai` SDK (Configured with OpenRouter to leverage GPT models)
- `csv-parser` & `multer` for stream processing file uploads

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd Groweasy
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up your environment variables
# Create a .env file and add your OpenRouter/OpenAI API key
echo "OPENROUTER_API_KEY=your_api_key_here" > .env

# Initialize the SQLite database schema
npx prisma db push

# Start the development server
npm run dev
# Or run with tsx directly: npx tsx watch index.ts
```
*The backend will run on `http://localhost:3001`*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```
*The frontend will run on `http://localhost:3000`*

---

## 🧪 How to Test

1. Open your browser to `http://localhost:3000`.
2. Click **Download Sample CSV Template** to get a messy, unstructured test file.
3. Drag and drop the CSV into the upload zone and click **Confirm Import**.
4. Watch as the AI intelligently parses the data in the background (takes ~10 seconds).
5. View the meticulously mapped CRM leads on the success screen!

---

## 📝 Design Decisions & Architecture

- **Stateless AI Processing**: The AI processing is currently handled iteratively in batches of 20 to balance API rate limits with speed.
- **Performance Safeguard**: To prevent system hangs during edge-case testing, uploads are currently truncated to the first 100 rows. In a production environment, this would be replaced with a background worker queue (like BullMQ) and WebSockets for real-time progress tracking.
- **Hydration Safety**: Includes a custom Next.js `_document`/`layout` script to strip non-standard DOM attributes injected by aggressive browser extensions, ensuring a flawless React hydration experience.

---
*Developed for the GrowEasy Software Developer Assignment.*
