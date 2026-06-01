const mammoth = require('mammoth');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const input = path.resolve('game word/游戏架构目录.docx');
  const out = path.resolve('reports/game-architecture.txt');
  const result = await mammoth.extractRawText({ path: input });
  fs.writeFileSync(out, result.value, 'utf8');
  console.log(out);
})();
