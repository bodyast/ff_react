import React, { useState, useCallback } from "react";
import type { FormStructure, FormSubmissionPayload } from "@iqtechnology/ff-forms-react";

// ---------------------------------------------------------------------------
// Paste your form schema here OR load from a JSON file:
//   import schema from "./form.json";
// ---------------------------------------------------------------------------
import schema from "./form.json";
import { FFForm } from "../src";

export default function App() {
  const [submitted, setSubmitted] = useState<FormSubmissionPayload | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function handleSubmit(payload: FormSubmissionPayload) {
    console.log("[onSubmit] payload:", payload);
    setSubmitted(payload);
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] Submitted`,
      ...prev,
    ]);
  }

  const handleUploadMedia = useCallback(async (file: File, fieldId: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] Upload: ${file.name} (field: ${fieldId})`, ...prev]);
    // Simulate upload — replace with real logic
    await new Promise((r) => setTimeout(r, 500));
    return { url: URL.createObjectURL(file) };
  }, []);

  const handleFetchLookupList = useCallback(async (listId: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] Fetch lookup: ${listId}`, ...prev]);
    // Simulate lookup response
    await new Promise((r) => setTimeout(r, 500));

    if (listId === "019f3233-db15-7393-93af-8fe82e27707a") {
      return {
        data: {
          uuid: listId,
          items: [
            { id: "1059", name: "Ap Electrical Ltd" },
            { id: "1260", name: "Bob Tractors" },
            { id: "726", name: "Charlie Construction" },
            { id: "452", name: "Contractor Co ABC" },
            { id: "455", name: "Contractor Co QWE" },
          ],
        },
      };
    }
    return { data: { uuid: listId, items: [] } };
  }, []);

  return (
    <div style={{ display: "flex", gap: 24, padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ flex: 1, maxWidth: 700 }}>
        <h2 style={{ marginTop: 0 }}>FF Forms Playground</h2>
        <FFForm
          schema={schema as unknown as FormStructure}
          onSubmit={handleSubmit}
          onUploadMedia={handleUploadMedia}
          onFetchMedia={(fileUuid) => {
            console.log("Fetching media for submission:", fileUuid);
          }}
          onFetchLookupList={handleFetchLookupList}
        />
      </div>

      <div style={{ width: 380 }}>
        <h3 style={{ marginTop: 0 }}>Submit Payload</h3>
        {submitted ? (
          <pre
            style={{
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: 16,
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              maxHeight: "80vh",
            }}
          >
            {JSON.stringify(submitted, null, 2)}
          </pre>
        ) : (
          <p style={{ color: "#999" }}>Submit the form to see the payload.</p>
        )}

        {log.length > 0 && (
          <>
            <h3>Log</h3>
            <ul style={{ fontSize: 12, color: "#666", padding: "0 0 0 16px" }}>
              {log.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
