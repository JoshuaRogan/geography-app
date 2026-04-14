import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { MODES } from './config/modes.js';
import { useQuiz } from './hooks/useQuiz.js';
import { useFindQuiz } from './hooks/useFindQuiz.js';
import { useMapD3 } from './hooks/useMapD3.js';
import { Header } from './components/Header.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { MapView } from './components/MapView.jsx';
import { GamePanel } from './components/GamePanel.jsx';
import { FindPanel } from './components/FindPanel.jsx';

function resolveMode(param) {
  if (param && MODES[param]) return param;
  const saved = localStorage.getItem('geoquest-mode');
  return (saved && MODES[saved]) ? saved : 'world';
}

function haversineKm(lng1, lat1, lng2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

// Piecewise scale with domain stops aligned to label breakpoints so each label
// maps to the right hue: hot=red/orange, warm=orange/yellow, cool=yellow→teal,
// cold=blue, freezing=dark blue.
const heatColorScale = d3.scaleLinear()
  .domain([0, 0.02, 0.05, 0.15, 0.35, 0.60, 1.0])
  .range(['#f44336', '#ff5722', '#ff9800', '#ffd740', '#29b6f6', '#1565c0', '#0d47a1']);

// Breakpoints are % of target-relative max distance (farthest feature from the target).
// This normalises per-question so Hawaii/Alaska don't skew the continental US scale.
function getHeatInfo(distKm, maxDist) {
  const pct = Math.min(1, distKm / maxDist);
  const color = heatColorScale(pct);
  if (pct < 0.02) return { emoji: '🔥', label: 'Burning hot!', color };
  if (pct < 0.05) return { emoji: '🔥', label: 'Hot',          color };
  if (pct < 0.15) return { emoji: '♨️',  label: 'Warm',         color };
  if (pct < 0.35) return { emoji: '💧', label: 'Cool',         color };
  if (pct < 0.60) return { emoji: '❄️',  label: 'Cold',         color };
  return             { emoji: '🧊', label: 'Freezing!',     color };
}

export function App() {
  const { mode: modeParam } = useParams();
  const navigate = useNavigate();
  const currentMode = resolveMode(modeParam);

  const [gameType, setGameType] = useState(() => localStorage.getItem('geoquest-gametype') || 'identify');
  const isFindMode = gameType === 'find';

  const [loading, setLoading] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState('Loading map…');
  const [svgReady, setSvgReady] = useState(false);
  const [mapData, setMapData] = useState({
    features: [],
    featureById: new Map(),
    neighborMap: new Map(),
    validIds: [],
    centroids: new Map(),
  });

  const quiz = useQuiz(currentMode);
  const findQuiz = useFindQuiz(currentMode);

  // Active quiz based on game type
  const activeQuiz = isFindMode ? findQuiz : quiz;
  const { score, currentQ, questions, phase, selectedFilters, setFilter, startRound, TOTAL } = activeQuiz;

  // Identify-mode-specific props
  const { streak, answered, feedback, answerResults, handleAnswer } = quiz;
  // Find-mode-specific props
  const { attempts, lastGuess, foundOnFirst, handleGuess } = findQuiz;

  const loadedModeRef = useRef(null);
  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;
  const gameTypeRef = useRef(gameType);
  gameTypeRef.current = gameType;

  // Cache target-relative maxDist per question to avoid recomputing on every click
  const targetMaxDistRef = useRef(null);
  const targetMaxDistForRef = useRef(null);

  const handleModeLoaded = useCallback(({ features, featureById, neighborMap, validIds, centroids }) => {
    setMapData({ features, featureById, neighborMap, validIds, centroids: centroids || new Map() });
    setLoading(false);
  }, []);

  // Feature click handler for find mode
  const handleFeatureClick = useCallback((featureId) => {
    if (gameTypeRef.current !== 'find') return;
    const md = mapDataRef.current;
    const q = findQuiz.questions[findQuiz.currentQ];
    if (!q) return;

    const clickedCentroid = md.centroids.get(featureId);
    const targetCentroid = md.centroids.get(q.targetId);
    if (!clickedCentroid || !targetCentroid) return;

    const distKm = haversineKm(
      clickedCentroid[0], clickedCentroid[1],
      targetCentroid[0], targetCentroid[1]
    );

    // Compute max distance from this target to any valid feature (once per question)
    if (targetMaxDistForRef.current !== q.targetId) {
      let max = 100;
      for (const id of md.validIds) {
        const c = md.centroids.get(id);
        if (c) {
          const d = haversineKm(targetCentroid[0], targetCentroid[1], c[0], c[1]);
          if (d > max) max = d;
        }
      }
      targetMaxDistRef.current = max;
      targetMaxDistForRef.current = q.targetId;
    }

    const { emoji, label, color } = getHeatInfo(distKm, targetMaxDistRef.current);
    findQuiz.handleGuess(featureId, distKm, { emoji, label, color });
  }, [findQuiz]);

  const mapD3 = useMapD3({ onModeLoaded: handleModeLoaded, onFeatureClick: handleFeatureClick });
  const { initSvg, switchMode, highlightFeature, markAnswer, clearHighlights,
          zoomToFeature, zoomIn, zoomOut, zoomReset,
          markFindGuess, markFindCorrect, clearFindGuesses } = mapD3;

  const handleSvgReady = useCallback((svgEl) => {
    initSvg(svgEl);
    setSvgReady(true);
  }, [initSvg]);

  // Load mode when SVG is ready or route changes
  useEffect(() => {
    if (!svgReady) return;
    if (loadedModeRef.current === currentMode) return;
    loadedModeRef.current = currentMode;
    setLoading(true);
    setLoadingLabel(`Loading ${MODES[currentMode]?.label || currentMode}…`);
    clearHighlights();
    clearFindGuesses();
    switchMode(currentMode);
  }, [svgReady, currentMode, switchMode, clearHighlights, clearFindGuesses]);

  // Start round when map data finishes loading
  useEffect(() => {
    if (!loading && mapData.validIds.length > 0) {
      startRound(mapData.validIds, mapData.neighborMap, currentMode);
    }
  }, [loading, mapData, currentMode, startRound]);

  // Restart round when filter changes
  const prevFiltersRef = useRef(selectedFilters);
  useEffect(() => {
    if (prevFiltersRef.current === selectedFilters) return;
    prevFiltersRef.current = selectedFilters;
    clearHighlights();
    clearFindGuesses();
    const md = mapDataRef.current;
    if (!loading && md.validIds.length > 0) {
      startRound(md.validIds, md.neighborMap, currentMode);
    }
  }, [selectedFilters, loading, currentMode, startRound, clearHighlights, clearFindGuesses]);

  // Restart round when game type changes
  const prevGameTypeRef = useRef(gameType);
  useEffect(() => {
    if (prevGameTypeRef.current === gameType) return;
    prevGameTypeRef.current = gameType;
    clearHighlights();
    clearFindGuesses();
    const md = mapDataRef.current;
    if (!loading && md.validIds.length > 0) {
      startRound(md.validIds, md.neighborMap, currentMode);
    }
  }, [gameType, loading, currentMode, startRound, clearHighlights, clearFindGuesses]);

  // ── Identify mode effects ──

  // Highlight current question on the map
  useEffect(() => {
    if (isFindMode) return;
    if (phase !== 'playing' || questions.length === 0 || currentQ >= questions.length) return;
    const q = questions[currentQ];
    if (!q) return;
    highlightFeature(q.correctId);
    const feature = mapData.featureById.get(q.correctId);
    if (feature) zoomToFeature(feature);
  }, [isFindMode, currentQ, questions, phase, mapData.featureById, highlightFeature, zoomToFeature]);

  // Mark answer on the map
  useEffect(() => {
    if (isFindMode) return;
    if (!answerResults) return;
    const { correctId, chosenId } = answerResults;
    markAnswer(correctId, chosenId, chosenId === correctId);
  }, [isFindMode, answerResults, markAnswer]);

  // Clear highlights when identify round ends
  useEffect(() => {
    if (isFindMode) return;
    if (phase === 'score') clearHighlights();
  }, [isFindMode, phase, clearHighlights]);

  // ── Find mode effects ──

  // Handle guess result on map
  useEffect(() => {
    if (!isFindMode || !lastGuess) return;
    if (lastGuess.correct) {
      markFindCorrect(lastGuess.featureId);
    } else {
      markFindGuess(lastGuess.featureId, lastGuess.color);
    }
  }, [isFindMode, lastGuess, markFindGuess, markFindCorrect]);

  // On new find-mode question: clear markers and zoom reset
  const prevFindQRef = useRef(0);
  useEffect(() => {
    if (!isFindMode) return;
    if (prevFindQRef.current === findQuiz.currentQ && prevFindQRef.current === 0) {
      // initial load — just reset zoom
      zoomReset();
      return;
    }
    if (prevFindQRef.current === findQuiz.currentQ) return;
    prevFindQRef.current = findQuiz.currentQ;
    clearFindGuesses();
    if (findQuiz.phase !== 'score') zoomReset();
  }, [isFindMode, findQuiz.currentQ, findQuiz.phase, clearFindGuesses, zoomReset]);

  // Zoom reset when entering find mode
  useEffect(() => {
    if (isFindMode) zoomReset();
  }, [isFindMode, zoomReset]);

  // Clear find markers when find round ends
  useEffect(() => {
    if (!isFindMode) return;
    if (findQuiz.phase === 'score') clearFindGuesses();
  }, [isFindMode, findQuiz.phase, clearFindGuesses]);

  const handleModeChange = useCallback((modeName) => {
    if (modeName === currentMode) return;
    localStorage.setItem('geoquest-mode', modeName);
    navigate(modeName === 'world' ? '/' : `/${modeName}`);
  }, [currentMode, navigate]);

  const handleFilterChange = useCallback((mode, key) => {
    setFilter(mode, key);
  }, [setFilter]);

  const handlePlayAgain = useCallback(() => {
    const md = mapDataRef.current;
    clearFindGuesses();
    clearHighlights();
    startRound(md.validIds, md.neighborMap, currentMode);
  }, [startRound, currentMode, clearFindGuesses, clearHighlights]);

  const handleGameTypeChange = useCallback((type) => {
    localStorage.setItem('geoquest-gametype', type);
    setGameType(type);
  }, []);

  const total = questions.length || TOTAL;
  const progress = phase === 'score' ? 100 : total > 0 ? (Math.min(currentQ, total) / total * 100) : 0;

  return (
    <div id="app">
      <Header score={score} currentQ={currentQ} streak={isFindMode ? 0 : streak} totalQ={total} />
      <FilterBar
        currentMode={currentMode}
        selectedFilters={selectedFilters}
        onModeChange={handleModeChange}
        onFilterChange={handleFilterChange}
        gameType={gameType}
        onGameTypeChange={handleGameTypeChange}
      />
      <div id="progress-bar-wrap">
        <div id="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div id="main" className={isFindMode ? 'find-mode' : ''}>
        <MapView
          isLoading={loading}
          loadingLabel={loadingLabel}
          onSvgReady={handleSvgReady}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
        />
        {isFindMode ? (
          <FindPanel
            currentMode={currentMode}
            questions={findQuiz.questions}
            currentQ={findQuiz.currentQ}
            score={findQuiz.score}
            phase={findQuiz.phase}
            attempts={attempts}
            lastGuess={lastGuess}
            foundOnFirst={foundOnFirst}
            onPlayAgain={handlePlayAgain}
            TOTAL={TOTAL}
          />
        ) : (
          <GamePanel
            currentMode={currentMode}
            questions={questions}
            currentQ={currentQ}
            score={score}
            answered={answered}
            feedback={feedback}
            answerResults={answerResults}
            phase={phase}
            onAnswer={handleAnswer}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>
    </div>
  );
}
