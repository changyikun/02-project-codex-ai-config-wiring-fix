const fs = require('node:fs');
const path = require('node:path');

const outDir = path.resolve(process.argv[2] ?? 'dist-app');
const assetRoot = path.join(outDir, 'assets');

const appFileExtensions = new Set(['.html', '.js', '.mjs']);
const cssFileExtensions = new Set(['.css']);

const toPosix = (value) => value.replace(/\\/g, '/');

const ensureDotRelative = (value) => {
  if (!value || value === '.') {
    return '.';
  }
  return value.startsWith('.') ? value : `./${value}`;
};

const walkFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return [fullPath];
  });
};

const replaceRootAssetUrls = (source, prefix) =>
  source
    .replace(/(["'])\/assets\//g, `$1${prefix}/`)
    .replace(/url\(\s*\/assets\//g, `url(${prefix}/`)
    .replace(/url\(\s*'\/assets\//g, `url('${prefix}/`)
    .replace(/url\(\s*"\/assets\//g, `url("${prefix}/`);

const hasRootAssetUrl = (source) => /(^|[^.])\/assets\//.test(source);

if (!fs.existsSync(outDir)) {
  throw new Error(`HBuilderX build output directory does not exist: ${outDir}`);
}

const files = walkFiles(outDir);
let rewrittenCount = 0;

files.forEach((filePath) => {
  const extension = path.extname(filePath);
  if (!appFileExtensions.has(extension) && !cssFileExtensions.has(extension)) {
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let prefix = './assets';

  if (cssFileExtensions.has(extension)) {
    prefix = ensureDotRelative(toPosix(path.relative(path.dirname(filePath), assetRoot)));
  }

  const next = replaceRootAssetUrls(original, prefix);
  if (next === original) {
    return;
  }

  fs.writeFileSync(filePath, next);
  rewrittenCount += 1;
});

const residualRootAssetRefs = files
  .filter((filePath) => appFileExtensions.has(path.extname(filePath)) || cssFileExtensions.has(path.extname(filePath)))
  .flatMap((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return hasRootAssetUrl(content) ? [path.relative(outDir, filePath)] : [];
  });

if (residualRootAssetRefs.length > 0) {
  throw new Error(`HBuilderX build still contains root asset paths: ${residualRootAssetRefs.join(', ')}`);
}

console.log(`Prepared HBuilderX app build in ${path.relative(process.cwd(), outDir) || outDir}. Rewrote ${rewrittenCount} files.`);
