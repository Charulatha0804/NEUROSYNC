import React, { useState } from "react";
import PrivacyConsentModal from "../components/PrivacyConsentModal";

function PrivacyPage({ patient, onBack }) {
  const [showConsent, setShowConsent] = useState(false);

  const exportData = () => {
    let patientData = patient;
    const stored = localStorage.getItem("neurosync_patient");
    if (stored) { try { patientData = JSON.parse(stored); } catch { patientData = patient; } }
    const report = {
      application: "NeuroSync VR",
      exportedAt: new Date().toISOString(),
      patient: {
        name: patientData?.name || "",
        affectedSide: patientData?.affectedSide || "",
        severity: patientData?.severity || ""
      },
      privacy: { cameraFramesStored: false, cloudSync: false, processing: "on-device" },
      sessions: []
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neurosync-rehab-report.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const deleteLocalData = () => {
    if (!window.confirm("Delete all NeuroSync local data?")) return;
    localStorage.clear();
    alert("All local NeuroSync data has been deleted.");
    onBack();
  };

  return (
    <main className="privacy-page">
      <div className="privacy-layout">
        <section className="privacy-intro">
          <div className="privacy-pill">🔒 Privacy first</div>
          <h1>Your data stays here.</h1>
          <p>Pose frames are processed in the browser. Session summaries are stored locally. WebRTC is only used when you explicitly start a tele-rehab connection.</p>
          <div className="privacy-tags"><span>No gameplay upload</span><span>Encrypted local storage</span><span>Offline capable after assets load</span></div>
        </section>
        <section className="data-card">
          <h2>Data inventory</h2>
          <div className="data-row"><span>Patient profile</span><strong>Local</strong></div>
          <div className="data-row"><span>Session summaries</span><strong>Local</strong></div>
          <div className="data-row"><span>Camera frames</span><strong>Not stored</strong></div>
          <div className="data-row"><span>Cloud sync</span><strong>Disabled by default</strong></div>
          <div className="data-actions">
            <button className="export-button" onClick={() => setShowConsent(true)}>Export with consent</button>
            <button className="delete-button" onClick={deleteLocalData}>Delete local data</button>
          </div>
        </section>
      </div>
      <button className="back-button" onClick={onBack}>← Back to Setup</button>
      {showConsent && <PrivacyConsentModal onAllow={() => { setShowConsent(false); exportData(); }} onDeny={() => setShowConsent(false)} />}
    </main>
  );
}
export default PrivacyPage;
