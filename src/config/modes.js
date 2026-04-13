import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { COUNTRIES, WORLD_SKIP } from '../data/countries.js';
import { STATES, STATES_SKIP } from '../data/states.js';
import { IRELAND_COUNTIES, IRELAND_NEIGHBORS } from '../data/ireland.js';
import { FRANCE_REGIONS } from '../data/france.js';
import { GERMANY_STATES } from '../data/germany.js';
import { SPAIN_PROVINCES } from '../data/spain.js';
import { JAPAN_PREFECTURES } from '../data/japan.js';
import { AUSTRALIA_STATES } from '../data/australia.js';
import { CANADA_PROVINCES } from '../data/canada.js';
import { BRAZIL_STATES } from '../data/brazil.js';
import { MEXICO_STATES } from '../data/mexico.js';
import { INDIA_STATES } from '../data/india.js';
import { CHINA_PROVINCES } from '../data/china.js';
import { SOUTH_AFRICA_PROVINCES } from '../data/southafrica.js';
import { ARGENTINA_PROVINCES } from '../data/argentina.js';
import { NIGERIA_STATES } from '../data/nigeria.js';
import { INDONESIA_PROVINCES } from '../data/indonesia.js';
import { NEW_ZEALAND_REGIONS } from '../data/newzealand.js';
import { EGYPT_GOVERNORATES } from '../data/egypt.js';
import { TURKEY_PROVINCES } from '../data/turkey.js';
import { POLAND_VOIVODESHIPS } from '../data/poland.js';
import { ROMANIA_COUNTIES } from '../data/romania.js';

export const MODES = {
  world: {
    group: 'primary', slug: 'world', label: 'World',
    db: COUNTRIES,
    skip: WORLD_SKIP,
    url: 'data/countries-110m.json',
    objName: 'countries',
    questionTag: 'Identify the country',
    emoji: '🌍',
    hintFn: id => { const c = COUNTRIES[id]; return c ? `${c.region} · ${c.continent}` : ''; },
    buildProjection: (topo, W, H) =>
      d3.geoNaturalEarth1().scale(153).translate([W / 2, H / 2]),
    buildBordersDatum: topo =>
      topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b),
    outlineDatum: null,
    useGraticule: true,
    landClass: '',
  },
  states: {
    group: 'primary', slug: 'states', label: 'US States',
    db: STATES,
    skip: STATES_SKIP,
    url: 'data/states-10m.json',
    objName: 'states',
    questionTag: 'Identify the state',
    emoji: '🗺',
    hintFn: id => { const s = STATES[id]; return s ? `${s.region} · ${s.continent}` : ''; },
    buildProjection: (topo, W, H) => {
      const nation = topojson.feature(topo, topo.objects.nation);
      return d3.geoAlbersUsa().fitExtent([[24, 24], [W - 24, H - 24]], nation);
    },
    buildBordersDatum: topo =>
      topojson.mesh(topo, topo.objects.states, (a, b) => a !== b),
    outlineDatum: topo =>
      topojson.mesh(topo, topo.objects.nation),
    useGraticule: false,
    landClass: 'mode-states',
  },

  // ── Detail modes ─────────────────────────────────────────────
  ireland: {
    group: 'detail', slug: 'ireland', label: 'Ireland', emoji: '🍀',
    db: IRELAND_COUNTIES,
    skip: new Set(),
    url: 'https://gist.githubusercontent.com/vool/969e3be0cfac519560755cce0b91e097/raw',
    format: 'geojson',
    neighbors: IRELAND_NEIGHBORS,
    getFeatureId: f => (f.properties?.NAME_1 || '').toLowerCase().trim(),
    questionTag: 'Identify the county',
    hintFn: id => {
      const c = IRELAND_COUNTIES[id];
      return c ? `${c.region} · ${c.continent}` : '';
    },
    buildProjection: (_topo, W, H, feats) =>
      d3.geoMercator().fitExtent([[30, 20], [W - 30, H - 20]],
        { type: 'FeatureCollection', features: feats }),
    useGraticule: false,
    landClass: 'mode-ireland',
  },

  france: {
    group: 'detail', slug: 'france', label: 'France', emoji: '🇫🇷',
    db: FRANCE_REGIONS, skip: new Set(['guyane française','martinique','guadeloupe','la réunion','mayotte']),
    url: 'data/countries/fr/fr-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the region',
    hintFn: id => { const r = FRANCE_REGIONS[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => { const skip = new Set(['guyane française','martinique','guadeloupe','la réunion','mayotte']); return d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>!skip.has(f.id))}); },
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  germany: {
    group: 'detail', slug: 'germany', label: 'Germany', emoji: '🇩🇪',
    db: GERMANY_STATES, skip: new Set(),
    url: 'data/countries/de/de-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the state',
    hintFn: id => { const r = GERMANY_STATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  spain: {
    group: 'detail', slug: 'spain', label: 'Spain', emoji: '🇪🇸',
    db: SPAIN_PROVINCES, skip: new Set(['ceuta','melilla','santa cruz de tenerife','las palmas']),
    url: 'data/countries/es/es-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the province',
    hintFn: id => { const r = SPAIN_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => { const skip = new Set(['ceuta','melilla','santa cruz de tenerife','las palmas']); return d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>!skip.has(f.id))}); },
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  japan: {
    group: 'detail', slug: 'japan', label: 'Japan', emoji: '🇯🇵',
    db: JAPAN_PREFECTURES, skip: new Set(),
    url: 'data/countries/jp/jp-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the prefecture',
    hintFn: id => { const r = JAPAN_PREFECTURES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  australia: {
    group: 'detail', slug: 'australia', label: 'Australia', emoji: '🇦🇺',
    db: AUSTRALIA_STATES, skip: new Set(['norfolk island','jervis bay territory']),
    url: 'data/countries/au/au-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the state or territory',
    hintFn: id => { const r = AUSTRALIA_STATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => { const skip = new Set(['norfolk island','jervis bay territory']); return d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>!skip.has(f.id))}); },
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  canada: {
    group: 'detail', slug: 'canada', label: 'Canada', emoji: '🇨🇦',
    db: CANADA_PROVINCES, skip: new Set(),
    url: 'data/countries/ca/ca-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the province or territory',
    hintFn: id => { const r = CANADA_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) =>
      d3.geoConicConformal().parallels([49, 77]).rotate([100, 0])
        .fitExtent([[30,20],[W-30,H-20]], {type:'FeatureCollection', features:feats.filter(f=>f.id)}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  brazil: {
    group: 'detail', slug: 'brazil', label: 'Brazil', emoji: '🇧🇷',
    db: BRAZIL_STATES, skip: new Set(),
    url: 'data/countries/br/br-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the state',
    hintFn: id => { const r = BRAZIL_STATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  mexico: {
    group: 'detail', slug: 'mexico', label: 'Mexico', emoji: '🇲🇽',
    db: MEXICO_STATES, skip: new Set(),
    url: 'data/countries/mx/mx-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the state',
    hintFn: id => { const r = MEXICO_STATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>f.id)}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  india: {
    group: 'detail', slug: 'india', label: 'India', emoji: '🇮🇳',
    db: INDIA_STATES, skip: new Set(['andaman and nicobar islands','lakshadweep']),
    url: 'data/countries/in/in-all.topo.json',
    objName: 'default',
    getFeatureId: f => {
      const n = (f.properties?.name || '').toLowerCase().trim();
      if (n === 'orissa') return 'odisha';
      if (n === 'uttaranchal') return 'uttarakhand';
      return n;
    },
    questionTag: 'Identify the state or territory',
    hintFn: id => { const r = INDIA_STATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => { const skip = new Set(['andaman and nicobar islands','lakshadweep']); return d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>!skip.has(f.id))}); },
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  china: {
    group: 'detail', slug: 'china', label: 'China', emoji: '🇨🇳',
    db: CHINA_PROVINCES, skip: new Set(['paracel islands']),
    url: 'data/countries/cn/cn-all.topo.json',
    objName: 'default',
    getFeatureId: f => {
      const n = (f.properties?.name || '').toLowerCase().trim();
      if (n === 'xizang') return 'tibet';
      if (n === 'inner mongol') return 'inner mongolia';
      return n;
    },
    questionTag: 'Identify the province',
    hintFn: id => { const r = CHINA_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>f.id !== 'paracel islands')}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  southafrica: {
    group: 'detail', slug: 'southafrica', label: 'South Africa', emoji: '🇿🇦',
    db: SOUTH_AFRICA_PROVINCES, skip: new Set(),
    url: 'data/countries/za/za-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the province',
    hintFn: id => { const r = SOUTH_AFRICA_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  argentina: {
    group: 'detail', slug: 'argentina', label: 'Argentina', emoji: '🇦🇷',
    db: ARGENTINA_PROVINCES, skip: new Set(),
    url: 'data/countries/ar/ar-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the province',
    hintFn: id => { const r = ARGENTINA_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  nigeria: {
    group: 'detail', slug: 'nigeria', label: 'Nigeria', emoji: '🇳🇬',
    db: NIGERIA_STATES, skip: new Set(),
    url: 'data/countries/ng/ng-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the state',
    hintFn: id => { const r = NIGERIA_STATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  indonesia: {
    group: 'detail', slug: 'indonesia', label: 'Indonesia', emoji: '🇮🇩',
    db: INDONESIA_PROVINCES, skip: new Set(),
    url: 'data/countries/id/id-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the province',
    hintFn: id => { const r = INDONESIA_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>f.id)}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  newzealand: {
    group: 'detail', slug: 'newzealand', label: 'New Zealand', emoji: '🇳🇿',
    db: NEW_ZEALAND_REGIONS, skip: new Set(['bounty islands','three kings islands','the snares']),
    url: 'data/countries/nz/nz-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the region',
    hintFn: id => { const r = NEW_ZEALAND_REGIONS[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => { const skip = new Set(['bounty islands','three kings islands','the snares']); return d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>!skip.has(f.id))}); },
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  egypt: {
    group: 'detail', slug: 'egypt', label: 'Egypt', emoji: '🇪🇬',
    db: EGYPT_GOVERNORATES, skip: new Set(),
    url: 'data/countries/eg/eg-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the governorate',
    hintFn: id => { const r = EGYPT_GOVERNORATES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>f.id)}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  turkey: {
    group: 'detail', slug: 'turkey', label: 'Turkey', emoji: '🇹🇷',
    db: TURKEY_PROVINCES, skip: new Set(),
    url: 'data/countries/tr/tr-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the province',
    hintFn: id => { const r = TURKEY_PROVINCES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats.filter(f=>f.id)}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  poland: {
    group: 'detail', slug: 'poland', label: 'Poland', emoji: '🇵🇱',
    db: POLAND_VOIVODESHIPS, skip: new Set(),
    url: 'data/countries/pl/pl-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the voivodeship',
    hintFn: id => { const r = POLAND_VOIVODESHIPS[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
  romania: {
    group: 'detail', slug: 'romania', label: 'Romania', emoji: '🇷🇴',
    db: ROMANIA_COUNTIES, skip: new Set(),
    url: 'data/countries/ro/ro-all.topo.json',
    objName: 'default', getFeatureId: f => (f.properties?.name || '').toLowerCase().trim(),
    questionTag: 'Identify the county',
    hintFn: id => { const r = ROMANIA_COUNTIES[id]; return r ? `${r.region} · ${r.continent}` : ''; },
    buildProjection: (topo, W, H, feats) => d3.geoMercator().fitExtent([[30,20],[W-30,H-20]],{type:'FeatureCollection',features:feats}),
    buildBordersDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a!==b),
    outlineDatum: topo => topojson.mesh(topo, topo.objects.default, (a,b) => a===b),
    useGraticule: false, landClass: 'mode-detail',
  },
};
