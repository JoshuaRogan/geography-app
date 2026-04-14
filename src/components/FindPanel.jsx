import React, { useState, useEffect } from 'react';
import { MODES } from '../config/modes.js';

function getGrade(pct) {
  if (pct === 100) return 'Perfect Navigator! 🏆';
  if (pct >= 87) return 'Master Explorer';
  if (pct >= 73) return 'Skilled Scout';
  if (pct >= 53) return 'Apprentice Pathfinder';
  if (pct >= 33) return 'Map Curious';
  return 'Lost at Sea';
}

export function FindPanel({
  currentMode,
  questions,
  currentQ,
  score,
  phase,
  attempts,
  lastGuess,
  foundOnFirst,
  onPlayAgain,
  TOTAL,
}) {
  const cfg = MODES[currentMode] || {};
  const db = cfg.db || {};
  const [clueRevealed, setClueRevealed] = useState(false);

  // Reset clue on new question OR new round (questions is a new array ref each startRound)
  useEffect(() => {
    setClueRevealed(false);
  }, [currentQ, questions]);

  if (phase === 'score') {
    const total = questions.length || TOTAL;
    const pct = Math.round((score / total) * 100);
    return (
      <div id="game-panel">
        <div id="score-screen" className="visible" style={{ display: 'flex' }}>
          <div className="score-globe">{cfg.emoji || '🌍'}</div>
          <div className="score-title">Round Complete</div>
          <div className="score-big">{score}/{total}</div>
          <div className="score-grade">{getGrade(pct)}</div>
          <div className="score-accuracy">{pct}% first-click accuracy</div>
          <button id="play-again" onClick={onPlayAgain}>Play Again</button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const target = q ? db[q.targetId] : null;
  const hint = q && cfg.hintFn ? cfg.hintFn(q.targetId) : '';
  const wrongGuess = lastGuess && !lastGuess.correct;

  return (
    <div id="game-panel">
      <div id="find-target-section">
        <div id="question-tag">🔍 Find It</div>
        <div id="find-target-name">
          {target ? target.name : 'Loading…'}
        </div>
        {hint && (
          clueRevealed
            ? <div id="find-clue-text">{hint}</div>
            : <button id="find-clue-btn" onClick={() => setClueRevealed(true)}>💡 Show Clue</button>
        )}
      </div>

      <div id="find-feedback-area">
        {phase === 'found' ? (
          <div className="find-result find-result-found">
            <div className="find-result-icon">✅</div>
            <div className="find-result-text">
              {foundOnFirst ? 'First try!' : `Found in ${attempts + 1} tries`}
            </div>
          </div>
        ) : wrongGuess ? (
          <div className="find-result find-result-miss">
            <div className="find-result-heat" style={{ color: lastGuess.color }}>
              {lastGuess.emoji} {lastGuess.label}
            </div>
            <div className="find-result-distance">
              {lastGuess.distanceKm < 1
                ? '< 1 km away'
                : `${Math.round(lastGuess.distanceKm).toLocaleString()} km away`}
            </div>
            <div className="find-result-hint">
              {attempts === 1 ? 'Try again!' : `${attempts} attempts — keep going!`}
            </div>
          </div>
        ) : (
          <div className="find-result find-result-idle">
            <div className="find-click-prompt">Click on the map to guess</div>
          </div>
        )}
      </div>

      <div id="find-progress">
        <span>Question {Math.min(currentQ + 1, questions.length || TOTAL)} / {questions.length || TOTAL}</span>
        <span className="find-score">{score} ★</span>
      </div>
    </div>
  );
}
