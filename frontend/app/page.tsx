"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import Papa from "papaparse";

const STATUS_BADGE: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: styles.badgeSuccess,
  SALE_DONE: styles.badgePurple,
  DID_NOT_CONNECT: styles.badgeWarning,
  BAD_LEAD: styles.badgeError,
};

const STATUS_LABEL: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "Good Lead",
  SALE_DONE: "Sale Done",
  DID_NOT_CONNECT: "Not Connected",
  BAD_LEAD: "Bad Lead",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  // Step: 0=upload, 1=preview, 2=processing, 3=results
  const step = results ? 3 : isUploading ? 2 : file ? 1 : 0;

  const processFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a valid .csv file.");
      return;
    }
    setError(null);
    setFile(f);
    setResults(null);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length > 0) {
          setColumns(Object.keys(result.data[0] as object));
          setPreviewData(result.data.slice(0, 10));
        }
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleReset = () => {
    setFile(null); setPreviewData([]); setColumns([]);
    setResults(null); setError(null); setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        let errData: any;
        try { errData = await response.json(); } catch (_) {}
        throw new Error(errData?.details || errData?.error || "Upload failed");
      }
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSample = () => {
    const csv = `created_at,name,email,country_code,mobile_without_country_code,company,city,state,country,lead_owner,crm_status,crm_note,data_source,possession_time,description
2026-05-13 14:20:48,John Doe,john.doe@example.com,+91,9876543210,GrowEasy,Mumbai,Maharashtra,India,test@gmail.com,GOOD_LEAD_FOLLOW_UP,Client is asking to reschedule demo,,,
2026-05-13 14:25:30,Sarah Johnson,sarah.johnson@example.com,+91,9876543211,Tech Solutions,Bangalore,Karnataka,India,test@gmail.com,DID_NOT_CONNECT,"Person was busy, will try again",,,
2026-05-13 14:30:15,Rajesh Patel,rajesh.patel@example.com,+91,9876543212,Startup Inc,Delhi,Delhi,India,test@gmail.com,BAD_LEAD,Not interested in our services,,,
2026-05-13 14:35:22,Priya Singh,priya.singh@example.com,+91,9876543213,Enterprise Corp,Pune,Maharashtra,India,test@gmail.com,SALE_DONE,"Deal closed, onboarding in progress",,,`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "groweasy_sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className={styles.logoText}>GrowEasy</span>
        </div>
        <div className={styles.navRight}>
          <span className={styles.navBadge}>AI CSV Importer</span>
        </div>
      </nav>

      <div className={styles.body}>
        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroTag}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Powered by AI
          </div>
          <h1 className={styles.heroTitle}>Import Leads from <span>Any CSV</span></h1>
          <p className={styles.heroDesc}>
            Upload any CSV format — Facebook Leads, Google Ads, Real Estate CRMs, Excel exports — and our AI will intelligently map it to the GrowEasy CRM format.
          </p>
        </div>

        {/* Card */}
        <div className={styles.card}>
          {/* Card Header */}
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Import Leads via CSV</div>
              <div className={styles.cardSubtitle}>Upload a CSV file to bulk import leads into your system.</div>
            </div>
            <div className={styles.stepPills}>
              <span className={`${styles.stepPill} ${step === 0 ? styles.stepPillActive : step > 0 ? styles.stepPillDone : ""}`}>① Upload</span>
              <span className={`${styles.stepPill} ${step === 1 ? styles.stepPillActive : step > 1 ? styles.stepPillDone : ""}`}>② Preview</span>
              <span className={`${styles.stepPill} ${step >= 2 ? styles.stepPillActive : ""}`}>③ Results</span>
            </div>
          </div>

          {/* ── STEP 0: Upload ── */}
          {step === 0 && (
            <>
              <div className={styles.cardBody}>
                {error && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", marginBottom: 16, fontWeight: 500 }}>
                    ⚠️ {error}
                  </div>
                )}
                <div
                  className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  aria-label="Upload CSV file"
                >
                  <div className={styles.uploadIconWrap}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div className={styles.dropzoneTitle}>Drop your CSV file here</div>
                  <div className={styles.dropzoneDesc}>or click to browse files</div>
                  <div className={styles.dropzoneMeta}>Supported file: .csv (max 5MB)</div>
                  <input type="file" accept=".csv" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
                </div>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button className={styles.sampleBtn} onClick={(e) => { e.stopPropagation(); downloadSample(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Sample CSV Template
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 1: Preview ── */}
          {step === 1 && (
            <>
              <div className={styles.cardBody}>
                {/* File Chip */}
                <div className={styles.fileChip}>
                  <div className={styles.fileIcon}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.fileName}>{file?.name}</div>
                    <div className={styles.fileSize}>{formatBytes(file?.size ?? 0)} &nbsp;·&nbsp; {previewData.length}+ rows detected</div>
                  </div>
                  <button className={styles.fileRemove} onClick={handleReset} title="Remove file">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* Preview table */}
                <div className={styles.previewMeta}>
                  <span className={styles.previewLabel}>Preview</span>
                  <span className={styles.previewCount}>Showing first {previewData.length} rows</span>
                </div>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>{columns.map((col, i) => <th key={i}>{col}</th>)}</tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {columns.map((col, j) => (
                            <td key={j} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {row[col] || <span style={{ color: "#d1d5db" }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleReset}>Cancel</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleConfirmImport}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Confirm Import
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Processing ── */}
          {step === 2 && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <div className={styles.loadingTitle}>Processing with AI…</div>
              <div className={styles.loadingDesc}>
                Our AI is reading your CSV columns and intelligently mapping them to CRM fields. This usually takes 10–30 seconds.
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} />
              </div>
            </div>
          )}

          {/* ── STEP 3: Results ── */}
          {step === 3 && results && (
            <>
              <div className={styles.cardBody}>
                {error && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: "0.85rem", marginBottom: 16, fontWeight: 500 }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Stats */}
                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: "#d1fae5", color: "#059669" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div>
                      <div className={styles.statNumber} style={{ color: "#059669" }}>{results.total_imported}</div>
                      <div className={styles.statName}>Successfully Imported</div>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: "#fee2e2", color: "#dc2626" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </div>
                    <div>
                      <div className={styles.statNumber} style={{ color: "#dc2626" }}>{results.total_skipped}</div>
                      <div className={styles.statName}>Skipped (Invalid / No Contact)</div>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: "#dbeafe", color: "#2563eb" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                    </div>
                    <div>
                      <div className={styles.statNumber} style={{ color: "#2563eb" }}>{results.total_rows_uploaded ?? results.total_imported + results.total_skipped}</div>
                      <div className={styles.statName}>Total Rows Processed</div>
                    </div>
                  </div>
                </div>

                {/* Results table */}
                {results.records && results.records.length > 0 ? (
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Lead Name</th>
                          <th>Email</th>
                          <th>Contact</th>
                          <th>Date Created</th>
                          <th>Company</th>
                          <th>City</th>
                          <th>Status</th>
                          <th>Source</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.records.map((rec: any, i: number) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{rec.name || "—"}</td>
                            <td style={{ color: "#4b5563" }}>{rec.email || "—"}</td>
                            <td>
                              {rec.country_code || rec.mobile_without_country_code
                                ? `${rec.country_code ?? ""} ${rec.mobile_without_country_code ?? ""}`.trim()
                                : "—"}
                            </td>
                            <td style={{ color: "#6b7280" }}>
                              {rec.created_at
                                ? new Date(rec.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                : "—"}
                            </td>
                            <td>{rec.company || "—"}</td>
                            <td>{rec.city || "—"}</td>
                            <td>
                              {rec.crm_status ? (
                                <span className={`${styles.badge} ${STATUS_BADGE[rec.crm_status] ?? styles.badgeInfo}`}>
                                  {STATUS_LABEL[rec.crm_status] ?? rec.crm_status}
                                </span>
                              ) : <span style={{ color: "#d1d5db" }}>—</span>}
                            </td>
                            <td style={{ color: "#6b7280" }}>{rec.data_source || "—"}</td>
                            <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", color: "#6b7280" }} title={rec.crm_note ?? ""}>
                              {rec.crm_note || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p>No valid leads were found. The file may not contain email or mobile data.</p>
                  </div>
                )}
              </div>
              <div className={styles.cardFooter}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleReset}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 15 21 21 15 21"/><path d="M3 9V3h6"/><path d="M21 21L3 3"/>
                  </svg>
                  Import Another File
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
