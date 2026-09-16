import React, { useEffect } from "react";

function GamePlaceholder({ level, onBack }) {
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "NEUROSYNC_BACK_TO_LEVELS") onBack();
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onBack]);

  if (!level) return null;

  if (!level.route) {
    return (
      <main className="game-page"><div className="game-container">
        <button className="game-back" onClick={onBack}>← Back to levels</button>
        <div className="game-placeholder"><h2>{level.world}</h2><p>{level.name}</p><p>This world has not been connected yet.</p></div>
      </div></main>
    );
  }

  return (
    <main className="actual-game-page">
      <div className="actual-game-header">
        <button className="game-back-overlay" onClick={onBack}>← Back to levels</button>
        <div className="selected-game-info"><strong>{level.world}</strong><span>{level.name} · {level.levels}</span></div>
      </div>
      <iframe title={`${level.world} - ${level.name}`} src={level.route} className="level-game-frame" allow="camera; microphone" />
    </main>
  );
}
export default GamePlaceholder;
