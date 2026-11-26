const fs = require('fs');
const path = require('path');

const selected = JSON.parse(fs.readFileSync('/tmp/olongapo_selected.json', 'utf8'));

// Map OSM categories to our app categories
function mapCategory(r) {
  if (r.tags.amenity === 'bus_station' || r.tags.amenity === 'terminal') return 'terminal';
  if (r.tags.amenity === 'hospital' || r.tags.amenity === 'clinic') return 'hospital';
  if (r.tags.amenity === 'marketplace') return 'market';
  if (r.tags.shop === 'mall') return 'mall';
  if (r.tags.shop === 'supermarket' || r.tags.shop === 'convenience' || r.tags.shop === 'department_store') return 'shop';
  if (r.tags.amenity === 'school' || r.tags.amenity === 'university' || r.tags.amenity === 'college') return 'school';
  if (r.tags.amenity === 'place_of_worship' || r.tags.amenity === 'church' || r.tags.amenity === 'mosque' || r.tags.amenity === 'temple') return 'church';
  if (r.tags.amenity === 'townhall') return 'barangay';
  if (r.tags.place === 'barangay') return 'barangay';
  if (r.tags.place === 'city') return 'city';
  if (r.tags.place === 'suburb' || r.tags.place === 'neighbourhood') return 'barangay';
  if (r.tags.amenity === 'bank' || r.tags.amenity === 'atm') return 'bank';
  if (r.tags.amenity === 'fuel') return 'fuel';
  if (r.tags.amenity === 'pharmacy') return 'pharmacy';
  if (r.tags.amenity === 'park' || r.tags.amenity === 'playground') return 'park';
  if (r.category === 'landmark') return 'landmark';
  if (r.tags.place === 'village') return 'barangay';
  return 'other';
}

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// Deduplicate slugs
const slugCount = {};
const entries = selected.map(r => {
  const cat = mapCategory(r);
  let slug = slugify(r.name);
  if (slugCount[slug] !== undefined) {
    slugCount[slug]++;
    slug = slug + '-' + slugCount[slug];
  } else {
    slugCount[slug] = 0;
  }
  return { id: slug, name: r.name, full: r.name + ', Olongapo City', lat: r.lat, lng: r.lng, category: cat };
});

let js = '// ── Curated Olongapo City locations for Leaflet map presets ──\n';
js += '// Coordinates sourced from OpenStreetMap via Overpass API (ODbL licensed).\n';
js += '// Attribution: © OpenStreetMap contributors\n';
js += '// These are used as quick-select pickups/dropoffs in MapApp.\n';
js += '// Dynamic search (/api/places/search) remains the source of truth for\n';
js += '// arbitrary addresses; this file only seeds common Olongapo points.\n\n';
js += 'export const OLONGAPO_LOCATIONS = [\n';

for (const e of entries) {
  js += '  {\n';
  js += `    id: '${e.id}',\n`;
  js += `    name: '${e.name.replace(/'/g, "\\'")}',\n`;
  js += `    full: '${e.full.replace(/'/g, "\\'")}',\n`;
  js += `    lat: ${e.lat},\n`;
  js += `    lng: ${e.lng},\n`;
  js += `    category: '${e.category}',\n`;
  js += '  },\n';
}

js += '];\n\n';
js += "// Lookup a location by id.\n";
js += "export function findOlongapoLocation(id) {\n";
js += "  return OLONGAPO_LOCATIONS.find((l) => l.id === id) || null;\n";
js += "}\n\n";
js += "// Group locations by category for display.\n";
js += "export function olongapoLocationsByCategory() {\n";
js += "  const grouped = {};\n";
js += "  for (const loc of OLONGAPO_LOCATIONS) {\n";
js += "    (grouped[loc.category] = grouped[loc.category] || []).push(loc);\n";
js += "  }\n";
js += "  return grouped;\n";
js += "}\n\n";
js += "// Default map center for Olongapo City.\n";
js += "export const OLONGAPO_CENTER = { lat: 14.8320, lng: 120.2830 };\n";
js += "export const OLONGAPO_ZOOM = 14;\n";

const outPath = path.join('D:', 'Downloads', 'Appdev', 'fairtrike-modern', 'fairtrike-modern', 'frontend', 'src', 'lib', 'olongapo-locations.js');
fs.writeFileSync(outPath, js);
console.log('Written', entries.length, 'entries to', outPath);
const cats = {};
for (const e of entries) cats[e.category] = (cats[e.category] || 0) + 1;
console.log('Categories:', cats);
