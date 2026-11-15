const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.jsx', 'utf8');
const fixedFunction = fs.readFileSync('src/pages/renderOverview_clean.jsx', 'utf8');

// Find the broken renderOverview function
const startIdx = content.indexOf('const renderOverview = () => {');
const endIdx = content.indexOf('  };', startIdx + 2000);

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find function boundaries');
  console.log('startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

console.log('Found from', startIdx, 'to', endIdx);
console.log('Content around start:', content.substring(startIdx, startIdx + 50));

const before = content.substring(0, startIdx);
const after = content.substring(endIdx + '  };'.length);

const newContent = before + fixedFunction + after;
fs.writeFileSync('src/pages/AdminDashboard.jsx', newContent);
console.log('Replaced renderOverview function');