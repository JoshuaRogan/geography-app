import React from 'react';
import { MODES } from '../config/modes.js';

export function GamePanel({
  currentMode,
  questions,
  currentQ,
  score,
  answered,
  feedback,
  answerResults,
  phase,
  onAnswer,
  onPlayAgain,
}) {
  const cfg = MODES[currentMode] || {};
  const db = cfg.db || {};
  // During a mode transition, questions may still hold IDs from the previous mode.
  // Validate that the current question's correctId exists in the new mode's DB;
  // if not, treat it as no question (the new round will arrive on the next render).
  const raw = questions[currentQ];
  const q = (raw && db[raw.correctId]) ? raw : null;

  const noun = (cfg.questionTag || 'Identify the region').replace(/^Identify the /i, '');

  const getGrade = (pct, isStates) => {
    if (pct === 100) return 'Perfect Score! 🏆';
    if (pct >= 87)  return isStates ? 'Geography Champion'    : 'Master Navigator';
    if (pct >= 73)  return isStates ? 'State Capital Scholar' : 'Skilled Explorer';
    if (pct >= 53)  return isStates ? 'Regional Enthusiast'   : 'Apprentice Cartographer';
    if (pct >= 33)  return isStates ? 'Map Curious'           : 'Curious Traveler';
    return isStates ? 'Need More Road Trips'  : 'Landlubber';
  };

  if (phase === 'score') {
    const total = questions.length || 15;
    const pct = Math.round((score / total) * 100);
    const isStates = currentMode === 'states';
    const grade = getGrade(pct, isStates);

    return (
      <div id="game-panel">
        <div id="score-screen" className="visible" style={{ display: 'flex' }}>
          <div className="score-globe">{cfg.emoji || '🌍'}</div>
          <div className="score-title">Round Complete</div>
          <div className="score-big">{score}/{total}</div>
          <div className="score-grade">{grade}</div>
          <div className="score-accuracy">{pct}% accuracy</div>
          <button id="play-again" onClick={onPlayAgain}>Play Again</button>
        </div>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div id="game-panel">
      <div id="question-section">
        <div id="question-tag">{cfg.questionTag || 'Identify the region'}</div>
        <div id="question-text">
          {q ? `Which ${noun} is highlighted?` : 'Loading…'}
        </div>
        <div id="region-hint">
          {q ? (cfg.hintFn?.(q.correctId) ?? '') : ''}
        </div>
      </div>

      <div id="answers" style={{ display: 'flex' }}>
        {q && q.choices.map((id, i) => {
          let btnClass = 'answer-btn';
          let badgeText = '';
          let badgeClass = 'diff-badge';
          let badgeStyle = {};

          if (answerResults) {
            const { correctId, chosenId, diffLabels } = answerResults;
            const diff = diffLabels[id] || 'global';

            if (id === correctId) {
              btnClass += ' correct-answer';
              badgeText = '✓ Correct';
              badgeClass += ' diff-continent';
            } else if (id === chosenId && chosenId !== correctId) {
              btnClass += ' wrong-answer';
              badgeText = diff === 'neighbor'   ? '⚡ Neighbor'      :
                          diff === 'region'     ? '~ Same division'  :
                          diff === 'continent'  ? '~ Same area'      : '✗ Wrong';
              badgeClass += ` diff-${diff}`;
            } else {
              badgeText = diff === 'neighbor'  ? '⚡ Neighbor'    :
                          diff === 'region'    ? '~ Division'      :
                          diff === 'continent' ? '~ Area'          : '';
              if (badgeText) {
                badgeClass += ` diff-${diff}`;
                badgeStyle = { opacity: 0.5 };
              }
            }
          }

          return (
            <button
              key={id}
              className={btnClass}
              disabled={answered}
              onClick={() => onAnswer(id)}
            >
              <span className="letter">{letters[i]}</span>
              {db[id]?.name || 'Unknown'}
              <span className={badgeClass} style={badgeStyle}>{badgeText}</span>
            </button>
          );
        })}
      </div>

      <div
        id="feedback"
        className={
          feedback
            ? feedback.correct
              ? 'correct-fb visible'
              : 'wrong-fb visible'
            : ''
        }
      >
        {feedback && (
          feedback.correct
            ? <><span className="fb-icon">✓</span> {feedback.message}</>
            : <><span className="fb-icon">✗</span> That&apos;s <strong>{feedback.correctName}</strong></>
        )}
      </div>
    </div>
  );
}
