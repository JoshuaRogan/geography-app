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

function getWrongAnswers(correctId, validIds, neighborMap, currentMode) {
  const db = MODES[currentMode].db;
  const correct = db[correctId];
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

  // Tier 1 — Hard: border neighbor (fall back to same region if island)
  tryPick(nbrs, 'neighbor') ||
  tryPick(pool.filter(id => db[id].region === correct.region), 'region');

  // Tier 2 — Medium: same sub-region (not already picked)
  tryPick(pool.filter(id => db[id].region === correct.region), 'region') ||
  tryPick(pool.filter(id => db[id].continent === correct.continent), 'continent');

  // Tier 3 — Easy: same broad area, different sub-region
  tryPick(
    pool.filter(id => db[id].continent === correct.continent && db[id].region !== correct.region),
    'continent'
  ) || tryPick(pool.filter(id => db[id].continent !== correct.continent), 'global');

  // Fill remaining
  while (result.length < 3) {
    const diff = pool.filter(id => db[id].continent !== correct.continent && !picked.has(id));
    const fb = diff.length ? diff : pool.filter(id => !picked.has(id));
    if (!fb.length) break;
    const id = pickRandom(fb); picked.add(id); result.push(id); diffLabels[id] = 'global';
  }

  return { ids: result, labels: diffLabels };
}

function matchFilter(id, currentMode, selectedFilters) {
  const db = MODES[currentMode].db;
  const info = db[id];
  const key = selectedFilters[currentMode];
  if (!info || key === 'all') return true;
  if (currentMode === 'world')
    return key === 'Americas' ? info.continent.includes('America') : info.continent === key;
  return info.continent === key;
}

export function useQuiz(currentMode) {
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [phase, setPhase] = useState('playing'); // 'playing' | 'score'
  const [feedback, setFeedback] = useState(null); // null | { correct, message }
  const [answerResults, setAnswerResults] = useState(null); // null | { correctId, chosenId, diffLabels }

  // selectedFilters persisted in localStorage
  const [selectedFilters, setSelectedFilters] = useState(() => {
    return Object.fromEntries(
      Object.keys(MODES).map(k => [k, localStorage.getItem(`geoquest-filter-${k}`) || 'all'])
    );
  });

  // Clear stale questions immediately when mode changes so GamePanel never renders
  // old-mode question IDs against the new-mode's DB (which crashes hintFn).
  const prevModeRef = useRef(currentMode);
  if (prevModeRef.current !== currentMode) {
    prevModeRef.current = currentMode;
    // Synchronous state resets during render are safe in React when guarded by a ref change
    setQuestions([]);
    setCurrentQ(0);
    setAnswered(false);
    setFeedback(null);
    setAnswerResults(null);
    setPhase('playing');
  }

  // Map data stored externally, passed in from useMapD3 via App
  const mapDataRef = useRef({ validIds: [], neighborMap: new Map() });

  const buildQuestions = useCallback((validIds, neighborMap, mode) => {
    const filteredIds = validIds.filter(id => matchFilter(id, mode, selectedFilters));
    const qs = shuffle(filteredIds).slice(0, TOTAL).map(correctId => {
      const { ids: wrongIds, labels } = getWrongAnswers(correctId, filteredIds, neighborMap, mode);
      const choices = shuffle([correctId, ...wrongIds]);
      return { correctId, choices, diffLabels: { [correctId]: 'correct', ...labels } };
    });
    return qs;
  }, [selectedFilters]);

  const startRound = useCallback((validIds, neighborMap, mode) => {
    mapDataRef.current = { validIds, neighborMap };
    const qs = buildQuestions(validIds, neighborMap, mode || currentMode);
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setAnswered(false);
    setPhase('playing');
    setFeedback(null);
    setAnswerResults(null);
  }, [buildQuestions, currentMode]);

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
        const correctName = MODES[currentMode]?.db[q.correctId]?.name || '';
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
  }, [answered, currentQ, currentMode]);

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
