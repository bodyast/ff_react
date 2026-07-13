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
            formData={
                {
                  "formVersionUuid": "019f3233-dc74-7239-8146-30f69d2a8bec",
                  "submittedAt": "",
                  "data": {
                    "site_id": null,
                    "job_id": null,
                    "customer_name": null,
                    "site_full_address": null,
                    "collector_contractor_name": null,
                    "time_of_arrival": "2026-07-13 18:21:00.000",
                    "reason_for_test": null,
                    "specify_reason": null,
                    "donors": [],
                    "date_01kx0z2yq9csmmce45nzac6eem": null,
                    "patient_address": null,
                    "patient_city": null,
                    "patient_state": null,
                    "patient_zip": null,
                    "patient_phone": null,
                    "physicians_clinic_name": null,
                    "job_canceled_upon_arrival": null,
                    "onsite_contact_name": null,
                    "onsite_contact_signature": null,
                    "cancelation_reason": null,
                    "wait_time_required": null,
                    "wait_time_comment": null,
                    "total_donors_expected": 0,
                    "number_of_donors_tested": 0,
                    "time_of_departure": null,
                    "odometer_start": null,
                    "odometer_finish": null,
                    "total_miles": null,
                    "tracking_service": null,
                    "shipment_tracking_number": null,
                    "shipment_date": "2026-07-08T00:00:00.000Z",
                    "button_01kx0z2yyyv9jny0tjxagn32ft": null
                  },
                  "metadata": {}
                }}
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
