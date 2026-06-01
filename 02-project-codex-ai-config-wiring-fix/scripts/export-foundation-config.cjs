const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const baseDir = path.resolve(__dirname, '../server/config/foundation');
const outDir = path.resolve(__dirname, '../reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const family = JSON.parse(fs.readFileSync(path.join(baseDir, 'family-backgrounds.json'), 'utf8'));
const stress = JSON.parse(fs.readFileSync(path.join(baseDir, 'route-stress.json'), 'utf8'));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(family), '家世配置');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stress), '压力配置');

const xlsxPath = path.join(outDir, 'foundation-config.xlsx');
XLSX.writeFile(wb, xlsxPath);

const jsonPath = path.join(outDir, 'foundation-config.bundle.json');
fs.writeFileSync(jsonPath, JSON.stringify({ family, stress }, null, 2), 'utf8');

console.log(JSON.stringify({ xlsxPath, jsonPath }, null, 2));
