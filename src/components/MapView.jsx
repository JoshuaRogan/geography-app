import React, { useEffect, useRef } from 'react';

export function MapView({ isLoading, loadingLabel, onSvgReady, onZoomIn, onZoomOut, onZoomReset }) {
  const svgRef = useRef(null);
  // Keep a stable ref to the latest callback so the mount-only effect can call it
  const onSvgReadyRef = useRef(onSvgReady);
  useEffect(() => { onSvgReadyRef.current = onSvgReady; });

  // Call onSvgReady exactly once, on mount
  useEffect(() => {
    if (svgRef.current) onSvgReadyRef.current(svgRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id="map-container">
      {isLoading && (
        <div id="loading" style={{ display: 'flex' }}>
          <div className="spinner" />
          <div className="loading-text">{loadingLabel || 'Loading map…'}</div>
        </div>
      )}
      <svg id="world-map" ref={svgRef} />
      <div id="map-controls">
        <button className="map-btn" title="Zoom in" onClick={onZoomIn}>+</button>
        <button className="map-btn" title="Zoom out" onClick={onZoomOut}>−</button>
        <button className="map-btn" title="Reset view" onClick={onZoomReset}>⌂</button>
      </div>
    </div>
  );
}
