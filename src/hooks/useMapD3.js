import { useRef, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { MODES } from '../config/modes.js';

const W = 960, H = 500;

// Per-mode cache so data is only fetched once
const modeCache = {};

export function useMapD3({ onModeLoaded }) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const pathGenRef = useRef(null);
  const mapGRef = useRef(null);

  const initSvg = useCallback((svgEl) => {
    if (!svgEl || mapGRef.current) return;

    const svg = d3.select(svgEl)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // SVG filter for glow effect
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'glow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'blur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const zoom = d3.zoom()
      .scaleExtent([0.6, 20])
      .on('zoom', e => mapGRef.current?.attr('transform', e.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    const mapG = svg.append('g');
    mapG.append('path').attr('class', 'graticule');
    mapG.append('path').attr('class', 'nation-outline');
    mapG.append('g').attr('class', 'countries-group');
    mapG.append('path').attr('class', 'borders').attr('data-role', 'borders');
    mapGRef.current = mapG;
    svgRef.current = svg;
  }, []);

  const zoomToFeature = useCallback((feature, duration = 750) => {
    if (!feature || !pathGenRef.current || !svgRef.current || !zoomRef.current) return;
    const pathGen = pathGenRef.current;
    const [[x0, y0], [x1, y1]] = pathGen.bounds(feature);
    const bw = x1 - x0, bh = y1 - y0;

    if (!isFinite(x0) || bw > W * 0.7 || bw < 1 || bh < 1) {
      const [cx, cy] = pathGen.centroid(feature);
      if (!isFinite(cx)) return;
      const t = d3.zoomIdentity.translate(W / 2 - 3.5 * cx, H / 2 - 3.5 * cy).scale(3.5);
      svgRef.current.transition().duration(duration).call(zoomRef.current.transform, t);
      return;
    }

    const pad = 72;
    const scale = Math.min(
      (W - pad * 2) / Math.max(bw, 1),
      (H - pad * 2) / Math.max(bh, 1),
      14
    ) * 0.85;

    const t = d3.zoomIdentity
      .translate(W / 2 - scale * (x0 + x1) / 2, H / 2 - scale * (y0 + y1) / 2)
      .scale(scale);
    svgRef.current.transition().duration(duration).call(zoomRef.current.transform, t);
  }, []);

  const renderMap = useCallback((topo, cfg, feats, currentMode) => {
    if (!mapGRef.current) return;
    const mapG = mapGRef.current;

    const projection = cfg.buildProjection(topo, W, H, feats);
    const pathGen = d3.geoPath().projection(projection);
    pathGenRef.current = pathGen;

    const graticuleEl = mapG.select('.graticule');
    if (cfg.useGraticule) {
      graticuleEl.datum(d3.geoGraticule()()).attr('d', pathGen).style('display', null);
    } else {
      graticuleEl.style('display', 'none');
    }

    const outlineEl = mapG.select('.nation-outline');
    const outlineDatum = cfg.outlineDatum ? cfg.outlineDatum(topo) : null;
    if (outlineDatum) {
      outlineEl.datum(outlineDatum).attr('d', pathGen).style('display', null);
    } else {
      outlineEl.style('display', 'none');
    }

    mapG.select('.countries-group')
      .attr('class', `countries-group ${cfg.landClass}`)
      .selectAll('path')
      .data(feats)
      .join('path')
      .attr('class', 'country')
      .attr('id', d => `c${d.id}`)
      .attr('d', pathGen);

    const bordersEl = mapG.select('[data-role="borders"]');
    if (topo && cfg.buildBordersDatum) {
      bordersEl
        .datum(cfg.buildBordersDatum(topo))
        .attr('class', cfg.group === 'detail' || currentMode === 'states' ? 'borders-us' : 'borders')
        .attr('d', pathGen)
        .style('display', null);
    } else {
      bordersEl.style('display', 'none');
    }
  }, []);

  const loadMode = useCallback(async (modeName) => {
    if (modeCache[modeName]) return modeCache[modeName];

    const cfg = MODES[modeName];
    let feats, nMap, topo;

    if (cfg.format === 'geojson') {
      const gj = await d3.json(cfg.url);
      feats = gj.features || gj;
      feats.forEach(f => { f.id = cfg.getFeatureId(f); });
      nMap = cfg.neighbors || new Map();
      topo = null;
    } else {
      topo = await d3.json(cfg.url);
      const geometries = topo.objects[cfg.objName].geometries;
      const neighborIdxs = topojson.neighbors(geometries);
      const fc = topojson.feature(topo, topo.objects[cfg.objName]);
      feats = fc.features;

      if (cfg.getFeatureId) {
        feats.forEach(f => { f.id = cfg.getFeatureId(f); });
      } else {
        feats.forEach(f => { f.id = typeof f.id === 'string' ? +f.id : f.id; });
      }

      nMap = new Map();
      feats.forEach((feat, i) => {
        nMap.set(feat.id, new Set(neighborIdxs[i].map(j => feats[j].id)));
      });
    }

    const fbId = new Map(feats.map(f => [f.id, f]));
    const vIds = feats.map(f => f.id).filter(id => cfg.db[id] && !cfg.skip.has(id));

    const cache = { topo, features: feats, featureById: fbId, neighborMap: nMap, validIds: vIds };
    modeCache[modeName] = cache;
    return cache;
  }, []);

  const switchMode = useCallback(async (modeName) => {
    const cfg = MODES[modeName];
    const data = await loadMode(modeName);

    if (svgRef.current && zoomRef.current) {
      svgRef.current.call(zoomRef.current.transform, d3.zoomIdentity);
    }

    renderMap(data.topo, cfg, data.features, modeName);

    onModeLoaded({
      modeName,
      features: data.features,
      featureById: data.featureById,
      neighborMap: data.neighborMap,
      validIds: data.validIds,
    });
  }, [loadMode, renderMap, onModeLoaded]);

  const highlightFeature = useCallback((id) => {
    if (!mapGRef.current) return;
    mapGRef.current.selectAll('.country')
      .classed('highlighted', false)
      .classed('correct', false)
      .classed('wrong', false)
      .style('filter', null);
    d3.select(`[id="c${id}"]`).classed('highlighted', true);
  }, []);

  const markAnswer = useCallback((correctId, chosenId, isCorrect) => {
    if (!mapGRef.current) return;
    d3.select(`[id="c${correctId}"]`).classed('highlighted', false).classed('correct', true).style('filter', null);
    if (!isCorrect) {
      d3.select(`[id="c${chosenId}"]`).classed('wrong', true);
    }
  }, []);

  const clearHighlights = useCallback(() => {
    if (!mapGRef.current) return;
    mapGRef.current.selectAll('.country')
      .classed('highlighted', false)
      .classed('correct', false)
      .classed('wrong', false)
      .style('filter', null);
    if (svgRef.current && zoomRef.current) {
      svgRef.current.transition().duration(800).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    svgRef.current.transition().duration(300).call(zoomRef.current.scaleBy, 1.6);
  }, []);

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    svgRef.current.transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.6);
  }, []);

  const zoomReset = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    svgRef.current.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  return {
    initSvg,
    switchMode,
    highlightFeature,
    markAnswer,
    clearHighlights,
    zoomToFeature,
    zoomIn,
    zoomOut,
    zoomReset,
  };
}
