const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assets = [
  {
    input: 'picture/font/对话框.jpg',
    output: 'public/assets/ui/dialogue-frame.png',
    type: 'frame' // Special processing to keep inner content
  },
  {
    input: 'picture/women/娇娇.jpg',
    output: 'public/assets/dialogue/jiaojiao.png',
    type: 'portrait'
  },
  {
    input: 'picture/font/时间表.jpg',
    output: 'public/assets/dialogue/time-status.png',
    type: 'frame'
  }
];

async function processAssets() {
  for (const asset of assets) {
    const inputPath = path.resolve(process.cwd(), asset.input);
    const outputPath = path.resolve(process.cwd(), asset.output);

    if (!fs.existsSync(inputPath)) {
      console.warn(`Input not found: ${inputPath}`);
      continue;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (asset.type === 'frame') {
      // For frames, we want to remove pure white background on the outside.
      // Usually these are rectangular or have a clear border.
      // We'll use a threshold to make white transparent.
      // However, the user says "方框中的颜色不许去除".
      // This is tricky without a mask. If the inside is not pure white, we can use a higher threshold.
      // Or we can assume the border is the outermost non-white part.
      
      await sharp(inputPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If it's nearly white (outside), make it transparent.
            // But how to detect "outside"?
            // Let's try a simple threshold first. If the frame itself has white, this will fail.
            // A better way for VN frames is often to remove the specific white background color.
            if (r > 245 && g > 245 && b > 245) {
              data[i + 3] = 0;
            }
          }
          return sharp(data, { raw: info }).png().toFile(outputPath);
        });
    } else {
      // For portraits, we usually remove the white background.
      await sharp(inputPath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 240 && g > 240 && b > 240) {
              data[i + 3] = 0;
            }
          }
          return sharp(data, { raw: info }).png().toFile(outputPath);
        });
    }
    console.log(`Processed: ${asset.input} -> ${asset.output}`);
  }
}

processAssets();
