const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const inputFontDir = path.join(projectRoot, 'picture', 'font');
const outFontDir = path.join(projectRoot, 'public', 'assets', 'routes', 'fonts');
const outBtnDir = path.join(projectRoot, 'public', 'assets', 'routes', 'buttons');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const isNearWhite = (r, g, b, threshold = 245) => r >= threshold && g >= threshold && b >= threshold;

const toMaskPng = async (inputPath, outputPath) => {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isNearWhite(r, g, b)) {
      data[i + 3] = 0;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
};

const toTransparentPng = async (inputPath, outputPath) => {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isNearWhite(r, g, b)) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outputPath);
};

const main = async () => {
  ensureDir(outFontDir);
  ensureDir(outBtnDir);

  const routeFonts = [
    { input: '兰因絮果.jpg', output: 'lanyinxuguo-mask.png' },
    { input: '浮生如梦.jpg', output: 'fushengrumeng-mask.png' },
    { input: '影落掖庭.jpg', output: 'yingluoyeting-mask.png' },
    { input: '尘缘夙错.jpg', output: 'chenyuansucuo-mask.png' },
  ];

  for (const item of routeFonts) {
    await toMaskPng(path.join(inputFontDir, item.input), path.join(outFontDir, item.output));
  }

  const buttonAssets = [
    { input: '随机.jpg', output: 'random.png', mode: 'transparent' },
    { input: '确认.jpg', output: 'confirm.png', mode: 'transparent' },
    { input: '返回.jpg', output: 'back.png', mode: 'transparent' },
  ];

  for (const item of buttonAssets) {
    await toTransparentPng(path.join(inputFontDir, item.input), path.join(outBtnDir, item.output));
  }

  console.log(JSON.stringify({ outFontDir, outBtnDir }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

