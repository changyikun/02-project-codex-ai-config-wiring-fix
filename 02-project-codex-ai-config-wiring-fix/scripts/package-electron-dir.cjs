const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');
const distAppDir = path.join(rootDir, 'dist-app');
const releaseDir = path.join(rootDir, 'release');
const outputDir = path.join(releaseDir, 'fenghualu-win-x64');
const appDir = path.join(outputDir, 'resources', 'app');
const gameExeName = '凤华录.exe';

const ensureInside = (target, parent) => {
  const relative = path.relative(parent, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to operate outside ${parent}: ${target}`);
  }
};

if (!fs.existsSync(path.join(electronDistDir, 'electron.exe'))) {
  const installScript = path.join(rootDir, 'node_modules', 'electron', 'install.js');
  if (!fs.existsSync(installScript)) {
    throw new Error('Electron install script is missing. Run `npm install` first.');
  }
  execFileSync(process.execPath, [installScript], {
    cwd: rootDir,
    env: {
      ...process.env,
      ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/',
    },
    stdio: 'inherit',
  });
}

if (!fs.existsSync(path.join(electronDistDir, 'electron.exe'))) {
  throw new Error('Electron runtime is missing after install.');
}

if (!fs.existsSync(path.join(distAppDir, 'index.html'))) {
  throw new Error('dist-app/index.html is missing. Run `npm run build:app` first.');
}

fs.mkdirSync(releaseDir, { recursive: true });
ensureInside(outputDir, releaseDir);
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

fs.cpSync(electronDistDir, outputDir, { recursive: true });

const defaultAppAsar = path.join(outputDir, 'resources', 'default_app.asar');
fs.rmSync(defaultAppAsar, { force: true });

fs.mkdirSync(appDir, { recursive: true });
fs.cpSync(distAppDir, path.join(appDir, 'dist-app'), { recursive: true });
fs.cpSync(path.join(rootDir, 'electron'), path.join(appDir, 'electron'), { recursive: true });

fs.writeFileSync(
  path.join(appDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'fenghualu-desktop',
      version: '0.1.0',
      main: 'electron/main.cjs',
    },
    null,
    2,
  )}\n`,
  'utf8',
);

fs.renameSync(path.join(outputDir, 'electron.exe'), path.join(outputDir, gameExeName));

console.log(`Packaged Windows executable directory: ${outputDir}`);
console.log(`Executable: ${path.join(outputDir, gameExeName)}`);
