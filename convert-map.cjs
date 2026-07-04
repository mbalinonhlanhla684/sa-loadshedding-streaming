const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'data', 'za.json');
const outputPath = path.join(__dirname, 'province-paths-output.txt');

const raw = fs.readFileSync(inputPath, 'utf8');
const geo = JSON.parse(raw);

const WIDTH = 600;
const HEIGHT = 640;
const PADDING = 10;

let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

function walkCoords(coords, depth) {
  if (depth === 0) {
    const [lng, lat] = coords;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  } else {
    coords.forEach(c => walkCoords(c, depth - 1));
  }
}

function getDepth(geometry) {
  return geometry.type === 'MultiPolygon' ? 3 : 2;
}

geo.features.forEach(f => {
  const depth = getDepth(f.geometry);
  walkCoords(f.geometry.coordinates, depth);
});

const lngRange = maxLng - minLng;
const latRange = maxLat - minLat;
const scale = Math.min((WIDTH - 2 * PADDING) / lngRange, (HEIGHT - 2 * PADDING) / latRange);

function project([lng, lat]) {
  const x = (lng - minLng) * scale + PADDING;
  const y = (maxLat - lat) * scale + PADDING;
  return [x.toFixed(1), y.toFixed(1)];
}

function ringToPath(ring) {
  return ring.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
}

function polygonToPath(coords) {
  return coords.map(ring => ringToPath(ring.map(project))).join(' ');
}

function featureToPath(geometry) {
  if (geometry.type === 'Polygon') {
    return polygonToPath(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(polygonToPath).join(' ');
  }
  return '';
}

function getName(props) {
  return props.name || props.NAME || props.NAME_1 || props.province || props.PROVINCE || JSON.stringify(props);
}

const results = geo.features.map(f => {
  const name = getName(f.properties);
  const d = featureToPath(f.geometry);
  return { name, d };
});

let out = '// Auto-generated province paths. Paste the array below into App.jsx\n\n';
out += 'const PROVINCES = [\n';
results.forEach(r => {
  out += `  { name: '${r.name}', stage: 2, path: '${r.d}' },\n`;
});
out += '];\n';

fs.writeFileSync(outputPath, out, 'utf8');

console.log('Done! Found', results.length, 'features:');
results.forEach(r => console.log(' -', r.name));
console.log('\nOutput written to:', outputPath);