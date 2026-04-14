import React from 'react';
import { MODES } from '../config/modes.js';
import { FILTERS } from '../config/filters.js';

export function FilterBar({ currentMode, selectedFilters, onModeChange, onFilterChange, gameType, onGameTypeChange }) {
  const isDetail = MODES[currentMode]?.group === 'detail';
  const filters = FILTERS[currentMode] || [];
  const activeFilter = selectedFilters[currentMode] || 'all';

  return (
    <div id="filter-bar">
      <div className="game-type-toggle">
        <button
          className={`game-type-btn${gameType === 'identify' ? ' active' : ''}`}
          onClick={() => onGameTypeChange('identify')}
          title="Identify: pick the highlighted region"
        >
          🎯 Identify
        </button>
        <button
          className={`game-type-btn${gameType === 'find' ? ' active' : ''}`}
          onClick={() => onGameTypeChange('find')}
          title="Find It: click the named region on the map"
        >
          🔍 Find It
        </button>
      </div>

      <div className="filter-sep" />

      <div id="mode-toggle">
        {Object.entries(MODES)
          .filter(([, cfg]) => cfg.group === 'primary')
          .map(([key, cfg]) => (
            <button
              key={key}
              className={`mode-btn${key === currentMode ? ' active' : ''}`}
              onClick={() => onModeChange(key)}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}

        <div className="mode-group-sep" />

        <select
          className={`mode-select${isDetail ? ' active' : ''}`}
          value={isDetail ? currentMode : ''}
          onChange={e => { if (e.target.value) onModeChange(e.target.value); }}
        >
          <option value="" disabled>🌐 Countries</option>
          {Object.entries(MODES)
            .filter(([, cfg]) => cfg.group === 'detail')
            .map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
        </select>
      </div>

      <div className="filter-sep" />

      <div id="filter-chips">
        {filters.map(f => (
          <button
            key={f.key}
            className={`filter-chip${f.key === activeFilter ? ' active' : ''}`}
            onClick={() => onFilterChange(currentMode, f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
