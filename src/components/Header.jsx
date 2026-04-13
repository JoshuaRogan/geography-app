import React from 'react';

export function Header({ score, currentQ, streak, totalQ }) {
  const qDisplay = totalQ > 0
    ? `${Math.min(currentQ + 1, totalQ)}/${totalQ}`
    : '—';

  return (
    <div id="header">
      <div className="logo">
        <div className="logo-icon">🌍</div>
        GeoQuest
      </div>
      <div id="stats">
        <div className="stat">
          <span className="stat-label">Score</span>
          <span className="stat-value" id="score-display">{score}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Question</span>
          <span className="stat-value" id="q-counter">{qDisplay}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Streak</span>
          <span className="stat-value" id="streak-display">{streak}</span>
        </div>
      </div>
    </div>
  );
}
