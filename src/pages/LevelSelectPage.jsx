import React from "react";
import { levels } from "../data/levels";

function LevelSelectPage({ onSelectLevel, onBack }) {
  return (
    <main className="level-page">
      <div className="level-container">
        <div className="level-top-row">
          <button className="home-back" onClick={onBack}>← Back to setup</button>
          <div className="on-device">🔒 On-device processing</div>
        </div>
        <section className="level-hero">
          <div className="game-pill">NEUROSYNC VR · MOVEMENT-CONTROLLED GAME</div>
          <h1>Recovery,<br />as an adventure.</h1>
          <p>Use your webcam to control the game with your arm. Your affected-hand movement controls the avatar and lets you reach, catch, follow and place targets through progressively harder rehabilitation challenges.</p>
        </section>
        <section className="world-grid">
          {levels.map((level) => (
            <button key={level.id} className="world-card" onClick={() => onSelectLevel(level)}>
              <div className="world-title"><span className="world-icon">{level.icon}</span><span>{level.world}</span></div>
              <div className="world-description">{level.description} · {level.levels}</div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
export default LevelSelectPage;
