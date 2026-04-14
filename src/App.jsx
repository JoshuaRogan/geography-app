import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MODES } from './config/modes.js';
import { useQuiz } from './hooks/useQuiz.js';
import { useMapD3 } from './hooks/useMapD3.js';
import { Header } from './components/Header.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { MapView } from './components/MapView.jsx';
import { GamePanel } from './components/GamePanel.jsx';

function resolveMode(param) {
  if (param && MODES[param]) return param;
  const saved = localStorage.getItem('geoquest-mode');
  return (saved && MODES[saved]) ? saved : 'world';
}

export function App() {
  const { mode: modeParam } = useParams();
  const navigate = useNavigate();
  const currentMode = resolveMode(modeParam);

  const [loading, setLoading] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState('Loading map…');
  const [svgReady, setSvgReady] = useState(false);
  const [mapData, setMapData] = useState({
    features: [],
    featureById: new Map(),
    neighborMap: new Map(),
    validIds: [],
  });

  const quiz = useQuiz(currentMode);
  const { score, streak, currentQ, questions, answered, phase, feedback, answerResults, selectedFilters, setFilter, startRound, handleAnswer, TOTAL } = quiz;

  const loadedModeRef = useRef(null);
  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  const handleModeLoaded = useCallback(({ features, featureById, neighborMap, validIds }) => {
    setMapData({ features, featureById, neighborMap, validIds });
    setLoading(false);
  }, []);

  const mapD3 = useMapD3({ onModeLoaded: handleModeLoaded });
  const { initSvg, switchMode, highlightFeature, markAnswer, clearHighlights, zoomToFeature, zoomIn, zoomOut, zoomReset } = mapD3;

  // Called once when the SVG element mounts
  const handleSvgReady = useCallback((svgEl) => {
    initSvg(svgEl);
    setSvgReady(true);
  }, [initSvg]);

  // Load the correct mode whenever the SVG is ready or the route changes
  useEffect(() => {
    if (!svgReady) return;
    if (loadedModeRef.current === currentMode) return;
    loadedModeRef.current = currentMode;
    setLoading(true);
    setLoadingLabel(`Loading ${MODES[currentMode]?.label || currentMode}…`);
    switchMode(currentMode);
  }, [svgReady, currentMode, switchMode]);

  // Start a new round when map data finishes loading
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
    const md = mapDataRef.current;
    if (!loading && md.validIds.length > 0) {
      startRound(md.validIds, md.neighborMap, currentMode);
    }
  }, [selectedFilters, loading, currentMode, startRound]);

  // Highlight current question on the map
  useEffect(() => {
    if (phase !== 'playing' || questions.length === 0 || currentQ >= questions.length) return;
    const q = questions[currentQ];
    if (!q) return;
    highlightFeature(q.correctId);
    const feature = mapData.featureById.get(q.correctId);
    if (feature) zoomToFeature(feature);
  }, [currentQ, questions, phase, mapData.featureById, highlightFeature, zoomToFeature]);

  // Mark answer on the map
  useEffect(() => {
    if (!answerResults) return;
    const { correctId, chosenId } = answerResults;
    markAnswer(correctId, chosenId, chosenId === correctId);
  }, [answerResults, markAnswer]);

  // Clear highlights when round ends
  useEffect(() => {
    if (phase === 'score') clearHighlights();
  }, [phase, clearHighlights]);

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
    startRound(md.validIds, md.neighborMap, currentMode);
  }, [startRound, currentMode]);

  const total = questions.length || TOTAL;
  const progress = phase === 'score' ? 100 : total > 0 ? (Math.min(currentQ, total) / total * 100) : 0;

  return (
    <div id="app">
      <Header score={score} currentQ={currentQ} streak={streak} totalQ={total} />
      <FilterBar
        currentMode={currentMode}
        selectedFilters={selectedFilters}
        onModeChange={handleModeChange}
        onFilterChange={handleFilterChange}
      />
      <div id="progress-bar-wrap">
        <div id="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div id="main">
        <MapView
          isLoading={loading}
          loadingLabel={loadingLabel}
          onSvgReady={handleSvgReady}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
        />
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
      </div>
    </div>
  );
}
