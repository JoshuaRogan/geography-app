import { useState, useCallback, useRef } from 'react';
import { MODES } from '../config/modes.js';

const TOTAL = 15;

const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function getWrongAnswers(correctId, validIds, neighborMap, mode) {
  const db = MODES[mode].db;
  const correct = db[correctId];
  if (!correct) return { ids: [], labels: {} };
  const nbrs = [...(neighborMap.get(correctId) || [])].filter(id => db[id]);
  const pool = validIds.filter(id => id !== correctId);
  const picked = new Set();
  const result = [];
  const diffLabels = {};

  function tryPick(candidates, label) {
    const avail = candidates.filter(id => !picked.has(id));
    if (!avail.length) return false;
    const id = pickRandom(avail);
    picked.add(id); result.push(id); diffLabels[id] = label;
    return true;
  }

  tryPick(nbrs, 'neighbor') ||
  tryPick(pool.filter(id => db[id]?.region === correct.region), 'region');

  tryPick(pool.filter(id => db[id]?.region === correct.region), 'region') ||
  tryPick(pool.filter(id => db[id]?.continent === correct.continent), 'continent');

  tryPick(
    pool.filter(id => db[id]?.continent === correct.continent && db[id]?.region !== correct.region),
    'continent'
  ) || tryPick(pool.filter(id => db[id]?.continent !== correct.continent), 'global');

  while (result.length < 3) {
    const diff = pool.filter(id => db[id]?.continent !== correct.continent && !picked.has(id));
    const fb = diff.length ? diff : pool.filter(id => !picked.has(id));
    if (!fb.length) break;
    const id = pickRandom(fb); picked.add(id); result.push(id); diffLabels[id] = 'global';
  }

  return { ids: result, labels: diffLabels };
}

function matchFilter(id, mode, filterKey) {
  const db = MODES[mode]?.db;
  if (!db) return true;
  const info = db[id];
  if (!info || !filterKey || filterKey === 'all') return true;
  if (mode === 'world')
    return filterKey === 'Americas' ? info.continent.includes('America') : info.continent === filterKey;
  return info.region === filterKey || info.continent === filterKey;
}

function buildQuestions(validIds, neighborMap, mode, filterKey) {
  const filteredIds = validIds.filter(id => matchFilter(id, mode, filterKey));
  return shuffle(filteredIds).slice(0, TOTAL).map(correctId => {
    const { ids: wrongIds, labels } = getWrongAnswers(correctId, filteredIds, neighborMap, mode);
    const choices = shuffle([correctId, ...wrongIds]);
    return { correctId, choices, diffLabels: { [correctId]: 'correct', ...labels } };
  });
}

export function useQuiz(currentMode) {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [phase, setPhase] = useState('playing');
  const [feedback, setFeedback] = useState(null);
  const [answerResults, setAnswerResults] = useState(null);

  // selectedFilters persisted in localStorage
  const [selectedFilters, setSelectedFilters] = useState(() =>
    Object.fromEntries(
      Object.keys(MODES).map(k => [k, localStorage.getItem(`geoquest-filter-${k}`) || 'all'])
    )
  );

  // Keep refs so callbacks always read the latest values without needing them as deps.
  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;
  const selectedFiltersRef = useRef(selectedFilters);
  selectedFiltersRef.current = selectedFilters;

  // Clear stale questions immediately when mode changes so GamePanel never renders
  // old-mode question IDs against the new-mode's DB.
  const prevModeRef = useRef(currentMode);
  if (prevModeRef.current !== currentMode) {
    prevModeRef.current = currentMode;
    setQuestions([]);
    setCurrentQ(0);
    setAnswered(false);
    setFeedback(null);
    setAnswerResults(null);
    setPhase('playing');
  }

  // startRound always reads latest mode and filters from refs — no stale closures.
  const startRound = useCallback((validIds, neighborMap, mode) => {
    const m = mode || currentModeRef.current;
    const filterKey = selectedFiltersRef.current[m] || 'all';
    const qs = buildQuestions(validIds, neighborMap, m, filterKey);
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(false);
    setPhase('playing');
    setFeedback(null);
    setAnswerResults(null);
  }, []); // stable — reads from refs

  const handleAnswer = useCallback((chosenId) => {
    if (answered) return;
    setAnswered(true);

    setQuestions(qs => {
      const q = qs[currentQ];
      if (!q) return qs;
      const correct = chosenId === q.correctId;

      if (correct) {
        setScore(s => s + 1);
        setStreak(s => s + 1);
        setFeedback({ correct: true, message: pickRandom(['Excellent!', 'Nailed it!', 'Perfect!', 'Well done!', "That's right!"]) });
      } else {
        setStreak(0);
        const correctName = MODES[currentModeRef.current]?.db[q.correctId]?.name || '';
        setFeedback({ correct: false, correctName });
      }

      setAnswerResults({ correctId: q.correctId, chosenId, diffLabels: q.diffLabels });

      const delay = correct ? 1500 : 2200;
      setTimeout(() => {
        setCurrentQ(prev => {
          const next = prev + 1;
          if (next >= qs.length) {
            setPhase('score');
          }
          return next;
        });
        setAnswered(false);
        setFeedback(null);
        setAnswerResults(null);
      }, delay);

      return qs;
    });
  }, [answered, currentQ]);

  const setFilter = useCallback((mode, key) => {
    localStorage.setItem(`geoquest-filter-${mode}`, key);
    setSelectedFilters(prev => ({ ...prev, [mode]: key }));
  }, []);

  return {
    score,
    streak,
    currentQ,
    questions,
    answered,
    phase,
    feedback,
    answerResults,
    selectedFilters,
    setFilter,
    startRound,
    handleAnswer,
    TOTAL,
  };
}
