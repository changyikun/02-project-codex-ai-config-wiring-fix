const sharp = require('sharp');
const path = require('path');

async function processImage() {
  const input = path.join(__dirname, '../picture/font/image.png');
  const output = path.join(__dirname, '../public/assets/title-transparent.png');
  
  // We want to turn white pixels to transparent, and maybe keep others as a mask or apply color.
  // Actually the prompt says "将字体图片中的白色像素透明化，仅保留金色字形；输出为带透明通道的 PNG"
  // Let's use sharp to make white transparent. A simple way is to use a threshold.
  // We can convert to RGBA, and change alpha based on luminance (inverse).
  
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    // If it's close to white
    if (r > 200 && g > 200 && b > 200) {
      data[i+3] = 0; // Set alpha to 0
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).toFile(output);
  console.log('Image processed:', output);
}

processImage().catch(console.error);
