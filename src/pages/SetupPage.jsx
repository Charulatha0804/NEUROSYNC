import React, { useState } from "react";

function SetupPage({ patient, onStart, onPrivacy }) {
  const [name, setName] = useState(patient.name || "");
  const [affectedSide, setAffectedSide] = useState(patient.affectedSide || "Left Arm");
  const [severity, setSeverity] = useState(patient.severity || "Moderate");

  const handleStart = async () => {
    const patientData = { name: name.trim(), affectedSide, severity };
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Camera access is not available in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      onStart(patientData);
    } catch (error) {
      console.error("Camera permission error:", error);
      alert("Camera access is required to start the rehabilitation game. Please allow camera permission and try again.");
    }
  };

  return (
    <main className="setup-page">
      <div className="setup-card">
        <h1>Begin Calibration</h1>
        <p className="subtitle">Enable webcam to control the avatar.</p>
        <label>Patient Name (Optional for Anonymous Mode)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter patient name" />
        <label>Affected Side</label>
        <select value={affectedSide} onChange={(e) => setAffectedSide(e.target.value)}>
          <option value="Left Arm">Left Arm</option>
          <option value="Right Arm">Right Arm</option>
        </select>
        <label>Severity</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="Mild">Mild</option>
          <option value="Moderate">Moderate</option>
          <option value="Severe">Severe</option>
        </select>
        <button className="start-button" onClick={handleStart}>Start Webcam &amp; Game</button>
        <button className="privacy-button" onClick={onPrivacy}>Privacy &amp; Data</button>
      </div>
    </main>
  );
}
export default SetupPage;
