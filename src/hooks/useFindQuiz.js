import { useState, useCallback, useRef } from 'react';
import { MODES } from '../config/modes.js';

const TOTAL = 15;

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function matchFilter(id, mode, filterKey) {
  const db = MODES[mode]?.db;
  if (!db) return true;
  const info = db[id];
  if (!info || !filterKey || filterKey === 'all') return true;
  if (mode === 'world')
    return filterKey === 'Americas' ? info.continent.includes('America') : info.continent === filterKey;
  return info.region === filterKey || info.continent === filterKey;
}

export function useFindQuiz(currentMode) {
  const [score, setScore] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [phase, setPhase] = useState('playing'); // 'playing' | 'found' | 'score'
  const [attempts, setAttempts] = useState(0);
  const [lastGuess, setLastGuess] = useState(null); // { featureId, distanceKm, heat, correct }
  const [foundOnFirst, setFoundOnFirst] = useState(false);

  const [selectedFilters, setSelectedFilters] = useState(() =>
    Object.fromEntries(
      Object.keys(MODES).map(k => [k, localStorage.getItem(`geoquest-filter-${k}`) || 'all'])
    )
  );

  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;
  const selectedFiltersRef = useRef(selectedFilters);
  selectedFiltersRef.current = selectedFilters;
  const attemptsRef = useRef(attempts);
  attemptsRef.current = attempts;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const currentQRef = useRef(currentQ);
  currentQRef.current = currentQ;

  const prevModeRef = useRef(currentMode);
  if (prevModeRef.current !== currentMode) {
    prevModeRef.current = currentMode;
    setQuestions([]);
    setCurrentQ(0);
    setPhase('playing');
    setAttempts(0);
    setLastGuess(null);
    setFoundOnFirst(false);
  }

  const startRound = useCallback((validIds, neighborMap, mode) => {
    const m = mode || currentModeRef.current;
    const filterKey = selectedFiltersRef.current[m] || 'all';
    const filtered = validIds.filter(id => matchFilter(id, m, filterKey));
    const qs = shuffle(filtered).slice(0, TOTAL).map(id => ({ targetId: id }));
    setQuestions(qs);
    setCurrentQ(0);
    setScore(0);
    setAttempts(0);
    setLastGuess(null);
    setFoundOnFirst(false);
    setPhase('playing');
  }, []);

  const handleGuess = useCallback((guessId, distanceKm, heatInfo) => {
    const qs = questionsRef.current;
    const q = qs[currentQRef.current];
    if (!q || phase === 'found' || phase === 'score') return;

    const correct = guessId === q.targetId;
    setLastGuess({ featureId: guessId, distanceKm, ...heatInfo, correct });

    if (correct) {
      const first = attemptsRef.current === 0;
      setFoundOnFirst(first);
      if (first) setScore(s => s + 1);
      setPhase('found');

      setTimeout(() => {
        const nextQ = currentQRef.current + 1;
        const total = questionsRef.current.length;
        setCurrentQ(nextQ);
        setAttempts(0);
        setLastGuess(null);
        setFoundOnFirst(false);
        if (nextQ >= total) {
          setPhase('score');
        } else {
          setPhase('playing');
        }
      }, 1800);
    } else {
      setAttempts(a => a + 1);
    }
  }, [phase]);

  const setFilter = useCallback((mode, key) => {
    localStorage.setItem(`geoquest-filter-${mode}`, key);
    setSelectedFilters(prev => ({ ...prev, [mode]: key }));
  }, []);

  return {
    score,
    currentQ,
    questions,
    phase,
    attempts,
    lastGuess,
    foundOnFirst,
    selectedFilters,
    setFilter,
    startRound,
    handleGuess,
    TOTAL,
  };
}
