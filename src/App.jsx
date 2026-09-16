import React, { useState } from "react";
import SetupPage from "./pages/SetupPage";
import PrivacyPage from "./pages/PrivacyPage";
import LevelSelectPage from "./pages/LevelSelectPage";
import GamePlaceholder from "./pages/GamePlaceholder";

function App() {
  const [page, setPage] = useState("setup");
  const [patient, setPatient] = useState({
    name: "",
    affectedSide: "Left Arm",
    severity: "Moderate"
  });
  const [selectedLevel, setSelectedLevel] = useState(null);

  const startGame = (patientData) => {
    setPatient(patientData);
    localStorage.setItem("neurosync_patient", JSON.stringify(patientData));
    setPage("levels");
  };

  return (
    <div className="app">
      <header className="top-header">
        <div className="brand"><span className="brand-icon">🔒</span><span>NeuroSync VR</span></div>
        <div className="processing-badge">🔒 On-device processing</div>
      </header>

      {page === "setup" && (
        <SetupPage patient={patient} onStart={startGame} onPrivacy={() => setPage("privacy")} />
      )}
      {page === "privacy" && (
        <PrivacyPage patient={patient} onBack={() => setPage("setup")} />
      )}
      {page === "levels" && (
        <LevelSelectPage
          patient={patient}
          onSelectLevel={(level) => { setSelectedLevel(level); setPage("game"); }}
          onBack={() => setPage("setup")}
        />
      )}
      {page === "game" && (
        <GamePlaceholder
          patient={patient}
          level={selectedLevel}
          onBack={() => { setSelectedLevel(null); setPage("levels"); }}
        />
      )}
    </div>
  );
}

export default App;
