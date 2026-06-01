const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'picture', 'women');
const outputDir = path.join(projectRoot, 'public', 'assets', 'characters', 'women');

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const OUTPUT_NAME_ALIASES = {
  姚玲儿: '姚铃儿',
};
const CLI_ARGS = process.argv.slice(2);

const CORNER_PATCH_RATIO = 0.1;
const BACKGROUND_BRIGHTNESS_MARGIN = 18;
const SEED_DISTANCE_THRESHOLD = 24;
const FILL_DISTANCE_THRESHOLD = 38;
const HALO_TRIM_DISTANCE_THRESHOLD = 24;
const HALO_TRIM_BRIGHTNESS_MARGIN = 18;
const STRONG_FOREGROUND_DISTANCE = 22;
const STRONG_FOREGROUND_BRIGHTNESS_DELTA = 16;
const STRONG_FOREGROUND_CONTRAST = 18;
const SPAN_GAP_LIMIT = 28;
const ENVELOPE_PADDING = 4;
const DILATION_RADIUS = 2;
const EDGE_SOFTEN_DISTANCE_FLOOR = 6;
const EDGE_SOFTEN_DISTANCE_THRESHOLD = 52;
const EDGE_SOFTEN_BRIGHTNESS_MARGIN = 30;
const EDGE_SOFTEN_MIN_ALPHA = 0.12;
const LI_RUOYAO_ROW_PADDING = 34;
const LI_RUOYAO_ROW_FEATHER = 12;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getPixelIndex = (x, y, width) => (y * width + x) * 4;

const getBrightness = (r, g, b) => (r + g + b) / 3;

const getColorDistance = (r, g, b, reference) =>
  Math.hypot(r - reference[0], g - reference[1], b - reference[2]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clampByte = (value) => clamp(Math.round(value), 0, 255);

const getDistanceToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  const projectedX = x1 + dx * t;
  const projectedY = y1 + dy * t;
  return Math.hypot(px - projectedX, py - projectedY);
};

const getEllipseKeepRatio = (x, y, centerX, centerY, radiusX, radiusY, feather) => {
  const normalized = Math.hypot((x - centerX) / radiusX, (y - centerY) / radiusY);
  if (normalized <= 1) {
    return 1;
  }

  const pixelOvershoot = (normalized - 1) * ((radiusX + radiusY) / 2);
  return clamp(1 - pixelOvershoot / feather, 0, 1);
};

const getCapsuleKeepRatio = (x, y, x1, y1, x2, y2, radius, feather) => {
  const distance = getDistanceToSegment(x, y, x1, y1, x2, y2);
  if (distance <= radius) {
    return 1;
  }

  return clamp(1 - (distance - radius) / feather, 0, 1);
};

const buildAlphaMask = (data) => {
  const mask = new Uint8Array(data.length / 4);
  for (let pixelIndex = 0; pixelIndex < mask.length; pixelIndex += 1) {
    mask[pixelIndex] = data[pixelIndex * 4 + 3] === 0 ? 1 : 0;
  }
  return mask;
};

const buildColorMaps = (data, width, height, referenceColor) => {
  const pixelCount = width * height;
  const brightnessMap = new Float32Array(pixelCount);
  const distanceMap = new Float32Array(pixelCount);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    brightnessMap[pixelIndex] = getBrightness(data[offset], data[offset + 1], data[offset + 2]);
    distanceMap[pixelIndex] = getColorDistance(data[offset], data[offset + 1], data[offset + 2], referenceColor);
  }

  return { brightnessMap, distanceMap };
};

const getNeighborContrast = (data, x, y, width, height) => {
  const offset = getPixelIndex(x, y, width);
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  let maxContrast = 0;

  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];

  for (const [nx, ny] of neighbors) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
      continue;
    }
    const neighborOffset = getPixelIndex(nx, ny, width);
    const contrast =
      (Math.abs(r - data[neighborOffset]) +
        Math.abs(g - data[neighborOffset + 1]) +
        Math.abs(b - data[neighborOffset + 2])) /
      3;
    if (contrast > maxContrast) {
      maxContrast = contrast;
    }
  }

  return maxContrast;
};

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const collectReferenceColor = (data, width, height) => {
  const channels = [[], [], []];
  const patchWidth = Math.max(12, Math.round(width * CORNER_PATCH_RATIO));
  const patchHeight = Math.max(12, Math.round(height * CORNER_PATCH_RATIO));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inTopLeftCorner = x < patchWidth && y < patchHeight;
      const inTopRightCorner = x >= width - patchWidth && y < patchHeight;
      if (!inTopLeftCorner && !inTopRightCorner) {
        continue;
      }

      const index = getPixelIndex(x, y, width);
      const alpha = data[index + 3];
      if (alpha === 0) {
        continue;
      }

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      if (getBrightness(r, g, b) < 180) {
        continue;
      }

      channels[0].push(r);
      channels[1].push(g);
      channels[2].push(b);
    }
  }

  if (channels[0].length === 0) {
    return [245, 245, 245];
  }

  return [median(channels[0]), median(channels[1]), median(channels[2])];
};

const collectTopReferenceColor = (data, width, height) => {
  const channels = [[], [], []];
  const cornerPatch = Math.max(12, Math.round(Math.min(width, height) * 0.08));
  const sidePatchWidth = Math.max(18, Math.round(width * 0.14));
  const sidePatchHeight = Math.max(24, Math.round(height * 0.24));
  const sampleBoxes = [
    [0, 0, cornerPatch, cornerPatch],
    [width - cornerPatch, 0, width, cornerPatch],
    [0, 0, sidePatchWidth, sidePatchHeight],
    [width - sidePatchWidth, 0, width, sidePatchHeight],
  ];

  for (const [startX, startY, endX, endY] of sampleBoxes) {
    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const index = getPixelIndex(x, y, width);
        const alpha = data[index + 3];
        if (alpha === 0) {
          continue;
        }

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        if (getBrightness(r, g, b) < 220) {
          continue;
        }

        channels[0].push(r);
        channels[1].push(g);
        channels[2].push(b);
      }
    }
  }

  if (channels[0].length === 0) {
    return collectReferenceColor(data, width, height);
  }

  return [median(channels[0]), median(channels[1]), median(channels[2])];
};

const parseOnlyPortraitName = (args) => {
  const inlineOnlyArg = args.find((arg) => arg.startsWith('--only='));
  if (inlineOnlyArg) {
    return inlineOnlyArg.slice('--only='.length).trim();
  }

  const onlyFlagIndex = args.findIndex((arg) => arg === '--only');
  if (onlyFlagIndex === -1) {
    return null;
  }

  const portraitName = args[onlyFlagIndex + 1];
  return portraitName ? portraitName.trim() : null;
};

const ONLY_PORTRAIT_NAME = parseOnlyPortraitName(CLI_ARGS);

const fillSpanGaps = (starts, ends, maxGap) => {
  let previousIndex = -1;

  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index] === -1 || ends[index] === -1) {
      continue;
    }

    if (previousIndex !== -1) {
      const gapSize = index - previousIndex - 1;
      if (gapSize > 0 && gapSize <= maxGap) {
        for (let offset = 1; offset <= gapSize; offset += 1) {
          const ratio = offset / (gapSize + 1);
          starts[previousIndex + offset] = Math.round(starts[previousIndex] + (starts[index] - starts[previousIndex]) * ratio);
          ends[previousIndex + offset] = Math.round(ends[previousIndex] + (ends[index] - ends[previousIndex]) * ratio);
        }
      }
    }

    previousIndex = index;
  }
};

const expandSpans = (starts, ends, size, padding) => {
  for (let index = 0; index < starts.length; index += 1) {
    if (starts[index] === -1 || ends[index] === -1) {
      continue;
    }
    starts[index] = Math.max(0, starts[index] - padding);
    ends[index] = Math.min(size - 1, ends[index] + padding);
  }
};

const smoothSpans = (starts, ends, size, radius) => {
  const nextStarts = new Int32Array(starts);
  const nextEnds = new Int32Array(ends);

  for (let index = 0; index < size; index += 1) {
    if (starts[index] === -1 || ends[index] === -1) {
      continue;
    }

    let totalStart = 0;
    let totalEnd = 0;
    let count = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const neighborIndex = index + offset;
      if (neighborIndex < 0 || neighborIndex >= size || starts[neighborIndex] === -1 || ends[neighborIndex] === -1) {
        continue;
      }
      totalStart += starts[neighborIndex];
      totalEnd += ends[neighborIndex];
      count += 1;
    }

    if (count === 0) {
      continue;
    }

    nextStarts[index] = Math.round(totalStart / count);
    nextEnds[index] = Math.round(totalEnd / count);
  }

  starts.set(nextStarts);
  ends.set(nextEnds);
};

const collectRunsForRow = (width, predicate) => {
  const runs = [];
  let start = -1;

  for (let x = 0; x < width; x += 1) {
    if (predicate(x)) {
      if (start === -1) {
        start = x;
      }
      continue;
    }

    if (start !== -1) {
      const end = x - 1;
      runs.push({
        start,
        end,
        length: end - start + 1,
        center: (start + end) / 2,
      });
      start = -1;
    }
  }

  if (start !== -1) {
    const end = width - 1;
    runs.push({
      start,
      end,
      length: end - start + 1,
      center: (start + end) / 2,
    });
  }

  return runs;
};

const expandLiRuoyaoSpans = (starts, ends, width, height) => {
  for (let y = 0; y < height; y += 1) {
    if (starts[y] === -1 || ends[y] === -1) {
      continue;
    }

    const ratio = y / Math.max(height - 1, 1);
    let padding = 12;

    if (ratio >= 0.2 && ratio < 0.44) {
      padding = 18;
    } else if (ratio >= 0.44 && ratio < 0.82) {
      padding = 24;
    } else if (ratio >= 0.82) {
      padding = 16;
    }

    starts[y] = Math.max(0, starts[y] - padding);
    ends[y] = Math.min(width - 1, ends[y] + padding);
  }
};

const keepLargestConnectedComponent = (data, width, height) => {
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const components = [];
  const neighbors = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex] || data[pixelIndex * 4 + 3] === 0) {
        continue;
      }

      const queue = [pixelIndex];
      const pixels = [];
      visited[pixelIndex] = 1;

      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        pixels.push(current);
        const currentX = current % width;
        const currentY = Math.floor(current / width);

        for (const [dx, dy] of neighbors) {
          const nextX = currentX + dx;
          const nextY = currentY + dy;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
            continue;
          }

          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex] || data[nextIndex * 4 + 3] === 0) {
            continue;
          }

          visited[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }

      components.push(pixels);
    }
  }

  if (components.length <= 1) {
    return;
  }

  let largestIndex = 0;
  for (let index = 1; index < components.length; index += 1) {
    if (components[index].length > components[largestIndex].length) {
      largestIndex = index;
    }
  }

  for (let index = 0; index < components.length; index += 1) {
    if (index === largestIndex) {
      continue;
    }

    for (const pixelIndex of components[index]) {
      data[pixelIndex * 4 + 3] = 0;
    }
  }
};

const dilateMask = (mask, width, height, radius) => {
  const dilated = new Uint8Array(mask);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (!mask[pixelIndex]) {
        continue;
      }

      for (let dy = -radius; dy <= radius; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          continue;
        }
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) {
            continue;
          }
          dilated[ny * width + nx] = 1;
        }
      }
    }
  }

  return dilated;
};

const buildProtectionMaps = (data, width, height, referenceColor) => {
  const pixelCount = width * height;
  const distanceMap = new Float32Array(pixelCount);
  const brightnessMap = new Float32Array(pixelCount);
  const strongForeground = new Uint8Array(pixelCount);
  const rowStarts = new Int32Array(height).fill(-1);
  const rowEnds = new Int32Array(height).fill(-1);
  const columnStarts = new Int32Array(width).fill(-1);
  const columnEnds = new Int32Array(width).fill(-1);
  const referenceBrightness = getBrightness(referenceColor[0], referenceColor[1], referenceColor[2]);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const offset = pixelIndex * 4;
      const alpha = data[offset + 3];
      if (alpha === 0) {
        continue;
      }

      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const distance = getColorDistance(r, g, b, referenceColor);
      const brightness = getBrightness(r, g, b);
      const brightnessDelta = referenceBrightness - brightness;
      const contrast = getNeighborContrast(data, x, y, width, height);

      distanceMap[pixelIndex] = distance;
      brightnessMap[pixelIndex] = brightness;

      const isStrongForeground =
        distance >= STRONG_FOREGROUND_DISTANCE ||
        brightnessDelta >= STRONG_FOREGROUND_BRIGHTNESS_DELTA ||
        (distance >= 8 && contrast >= STRONG_FOREGROUND_CONTRAST);

      if (!isStrongForeground) {
        continue;
      }

      strongForeground[pixelIndex] = 1;
      rowStarts[y] = rowStarts[y] === -1 ? x : Math.min(rowStarts[y], x);
      rowEnds[y] = Math.max(rowEnds[y], x);
      columnStarts[x] = columnStarts[x] === -1 ? y : Math.min(columnStarts[x], y);
      columnEnds[x] = Math.max(columnEnds[x], y);
    }
  }

  fillSpanGaps(rowStarts, rowEnds, SPAN_GAP_LIMIT);
  fillSpanGaps(columnStarts, columnEnds, SPAN_GAP_LIMIT);
  expandSpans(rowStarts, rowEnds, width, ENVELOPE_PADDING);
  expandSpans(columnStarts, columnEnds, height, ENVELOPE_PADDING);

  const dilatedForeground = dilateMask(strongForeground, width, height, DILATION_RADIUS);
  const protectedMask = new Uint8Array(pixelCount);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const inEnvelope =
        rowStarts[y] !== -1 &&
        rowEnds[y] !== -1 &&
        columnStarts[x] !== -1 &&
        columnEnds[x] !== -1 &&
        x >= rowStarts[y] &&
        x <= rowEnds[y] &&
        y >= columnStarts[x] &&
        y <= columnEnds[x];

      if (inEnvelope || dilatedForeground[pixelIndex]) {
        protectedMask[pixelIndex] = 1;
      }
    }
  }

  return {
    brightnessMap,
    distanceMap,
    hardProtectedMask: dilatedForeground,
    protectedMask,
    referenceBrightness,
  };
};

const isBackgroundCandidate = (distance, brightness, referenceBrightness, distanceThreshold) =>
  brightness >= referenceBrightness - BACKGROUND_BRIGHTNESS_MARGIN && distance <= distanceThreshold;

const trimBackgroundHalo = (visited, hardProtectedMask, distanceMap, brightnessMap, referenceBrightness, width, height) => {
  const queue = [];
  const isTrimCandidate = (pixelIndex) =>
    brightnessMap[pixelIndex] >= referenceBrightness - HALO_TRIM_BRIGHTNESS_MARGIN &&
    distanceMap[pixelIndex] <= HALO_TRIM_DISTANCE_THRESHOLD;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex] || hardProtectedMask[pixelIndex] || !isTrimCandidate(pixelIndex)) {
        continue;
      }

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      if (
        neighbors.some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < width && ny < height && visited[ny * width + nx])
      ) {
        visited[pixelIndex] = 1;
        queue.push(pixelIndex);
      }
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const pixelIndex = queue[head];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const neighborPixelIndex = ny * width + nx;
      if (visited[neighborPixelIndex] || hardProtectedMask[neighborPixelIndex] || !isTrimCandidate(neighborPixelIndex)) {
        continue;
      }

      visited[neighborPixelIndex] = 1;
      queue.push(neighborPixelIndex);
    }
  }
};

const softenForegroundEdge = (
  data,
  visited,
  distanceMap,
  brightnessMap,
  referenceColor,
  referenceBrightness,
  width,
  height,
) => {
  const alphaUpdates = new Float32Array(width * height);
  const sourceData = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) {
        continue;
      }

      let backgroundNeighbors = 0;
      let foregroundNeighbors = 0;
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited[ny * width + nx]) {
          backgroundNeighbors += 1;
        } else {
          foregroundNeighbors += 1;
        }
      }

      if (backgroundNeighbors === 0) {
        continue;
      }

      const distance = distanceMap[pixelIndex];
      const brightness = brightnessMap[pixelIndex];
      if (brightness < referenceBrightness - EDGE_SOFTEN_BRIGHTNESS_MARGIN || distance > EDGE_SOFTEN_DISTANCE_THRESHOLD) {
        continue;
      }

      const distanceRatio = clamp(
        (distance - EDGE_SOFTEN_DISTANCE_FLOOR) / (EDGE_SOFTEN_DISTANCE_THRESHOLD - EDGE_SOFTEN_DISTANCE_FLOOR),
        0,
        1,
      );
      const supportRatio = foregroundNeighbors / Math.max(1, foregroundNeighbors + backgroundNeighbors);
      const exposureRatio = backgroundNeighbors / 8;
      const backgroundSimilarity = 1 - distanceRatio;
      const brightnessSimilarity = clamp(
        (brightness - (referenceBrightness - EDGE_SOFTEN_BRIGHTNESS_MARGIN)) / EDGE_SOFTEN_BRIGHTNESS_MARGIN,
        0,
        1,
      );
      const contamination = backgroundSimilarity * brightnessSimilarity;
      const alpha = clamp(
        EDGE_SOFTEN_MIN_ALPHA + distanceRatio * 0.58 + supportRatio * 0.22 - exposureRatio * 0.08,
        EDGE_SOFTEN_MIN_ALPHA,
        0.9,
      ) * (1 - contamination * 0.45);

      alphaUpdates[pixelIndex] = clamp(alpha, EDGE_SOFTEN_MIN_ALPHA, 0.9);
    }
  }

  for (let pixelIndex = 0; pixelIndex < alphaUpdates.length; pixelIndex += 1) {
    const alpha = alphaUpdates[pixelIndex];
    if (alpha === 0) {
      continue;
    }

    const offset = pixelIndex * 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    let neighborR = 0;
    let neighborG = 0;
    let neighborB = 0;
    let neighborCount = 0;
    const distanceRatio = clamp(
      (distanceMap[pixelIndex] - EDGE_SOFTEN_DISTANCE_FLOOR) / (EDGE_SOFTEN_DISTANCE_THRESHOLD - EDGE_SOFTEN_DISTANCE_FLOOR),
      0,
      1,
    );

    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const neighborPixelIndex = ny * width + nx;
      if (visited[neighborPixelIndex]) {
        continue;
      }

      if (
        alphaUpdates[neighborPixelIndex] > 0 &&
        distanceMap[neighborPixelIndex] <= distanceMap[pixelIndex] + 6 &&
        brightnessMap[neighborPixelIndex] >= brightnessMap[pixelIndex] - 8
      ) {
        continue;
      }

      const neighborOffset = neighborPixelIndex * 4;
      neighborR += sourceData[neighborOffset];
      neighborG += sourceData[neighborOffset + 1];
      neighborB += sourceData[neighborOffset + 2];
      neighborCount += 1;
    }

    for (let channel = 0; channel < 3; channel += 1) {
      const recovered = (sourceData[offset + channel] - referenceColor[channel] * (1 - alpha)) / Math.max(alpha, 0.01);
      if (neighborCount === 0) {
        data[offset + channel] = clampByte(recovered);
        continue;
      }

      const neighborAverage =
        channel === 0 ? neighborR / neighborCount : channel === 1 ? neighborG / neighborCount : neighborB / neighborCount;
      const blendWeight = clamp(0.2 + (1 - distanceRatio) * 0.5, 0.2, 0.7);
      data[offset + channel] = clampByte(recovered * (1 - blendWeight) + neighborAverage * blendWeight);
    }
    data[offset + 3] = Math.min(data[offset + 3], clampByte(255 * alpha));
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (visited[pixelIndex] || alphaUpdates[pixelIndex] > 0) {
        continue;
      }

      const brightness = brightnessMap[pixelIndex];
      const distance = distanceMap[pixelIndex];
      if (brightness < referenceBrightness - EDGE_SOFTEN_BRIGHTNESS_MARGIN - 6 || distance > EDGE_SOFTEN_DISTANCE_THRESHOLD + 12) {
        continue;
      }

      let touchesSoftEdge = false;
      let innerR = 0;
      let innerG = 0;
      let innerB = 0;
      let innerCount = 0;

      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }

        const neighborPixelIndex = ny * width + nx;
        if (alphaUpdates[neighborPixelIndex] > 0) {
          touchesSoftEdge = true;
          continue;
        }

        if (visited[neighborPixelIndex]) {
          continue;
        }

        const neighborOffset = neighborPixelIndex * 4;
        innerR += sourceData[neighborOffset];
        innerG += sourceData[neighborOffset + 1];
        innerB += sourceData[neighborOffset + 2];
        innerCount += 1;
      }

      if (!touchesSoftEdge || innerCount === 0) {
        continue;
      }

      const offset = pixelIndex * 4;
      const blendWeight = 0.38;
      data[offset] = clampByte(sourceData[offset] * (1 - blendWeight) + (innerR / innerCount) * blendWeight);
      data[offset + 1] = clampByte(sourceData[offset + 1] * (1 - blendWeight) + (innerG / innerCount) * blendWeight);
      data[offset + 2] = clampByte(sourceData[offset + 2] * (1 - blendWeight) + (innerB / innerCount) * blendWeight);
    }
  }
};

const buildLiRuoyaoRowSpans = (data, width, height, referenceColor) => {
  const rowStarts = new Int32Array(height).fill(-1);
  const rowEnds = new Int32Array(height).fill(-1);
  const referenceBrightness = getBrightness(referenceColor[0], referenceColor[1], referenceColor[2]);
  const alphaRunsByRow = Array.from({ length: height }, () => []);
  const trackRunsByRow = Array.from({ length: height }, () => []);
  const middleX = width / 2;

  for (let y = 0; y < height; y += 1) {
    alphaRunsByRow[y] = collectRunsForRow(width, (x) => data[getPixelIndex(x, y, width) + 3] > 0).filter(
      (run) => run.length >= 3,
    );
    trackRunsByRow[y] = collectRunsForRow(width, (x) => {
      const offset = getPixelIndex(x, y, width);
      const alpha = data[offset + 3];
      if (alpha === 0) {
        return false;
      }

      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const brightness = getBrightness(r, g, b);
      const distance = getColorDistance(r, g, b, referenceColor);
      const contrast = getNeighborContrast(data, x, y, width, height);

      return distance >= 16 || brightness <= referenceBrightness - 10 || contrast >= 14 || alpha < 238;
    }).filter((run) => run.length >= 3);
  }

  let anchor = null;
  for (let y = Math.floor(height * 0.18); y < Math.floor(height * 0.72); y += 1) {
    for (const run of trackRunsByRow[y]) {
      const score =
        run.length * 1.6 -
        Math.abs(run.center - middleX) * 1.2 +
        (run.start <= middleX && run.end >= middleX ? 60 : 0) +
        (y >= height * 0.32 && y <= height * 0.58 ? 24 : 0);

      if (!anchor || score > anchor.score) {
        anchor = {
          y,
          run,
          score,
        };
      }
    }
  }

  if (!anchor) {
    return { rowStarts, rowEnds };
  }

  const selectTrackingRun = (runs, previousRun) => {
    let bestRun = null;
    let bestScore = -Infinity;

    for (const run of runs) {
      const overlap = Math.max(0, Math.min(run.end, previousRun.end) - Math.max(run.start, previousRun.start) + 1);
      const gap = Math.max(0, Math.max(previousRun.start - run.end, run.start - previousRun.end));
      const score =
        run.length * 1.3 +
        overlap * 3 -
        gap * 1.8 -
        Math.abs(run.center - previousRun.center) * 0.8 +
        (run.start <= middleX && run.end >= middleX ? 28 : 0);

      if (score > bestScore) {
        bestRun = run;
        bestScore = score;
      }
    }

    return bestRun;
  };

  rowStarts[anchor.y] = anchor.run.start;
  rowEnds[anchor.y] = anchor.run.end;

  let previousRun = anchor.run;
  for (let y = anchor.y - 1; y >= 0; y -= 1) {
    if (trackRunsByRow[y].length === 0) {
      continue;
    }
    const selectedRun = selectTrackingRun(trackRunsByRow[y], previousRun);
    if (!selectedRun) {
      continue;
    }
    rowStarts[y] = selectedRun.start;
    rowEnds[y] = selectedRun.end;
    previousRun = selectedRun;
  }

  previousRun = anchor.run;
  for (let y = anchor.y + 1; y < height; y += 1) {
    if (trackRunsByRow[y].length === 0) {
      continue;
    }
    const selectedRun = selectTrackingRun(trackRunsByRow[y], previousRun);
    if (!selectedRun) {
      continue;
    }
    rowStarts[y] = selectedRun.start;
    rowEnds[y] = selectedRun.end;
    previousRun = selectedRun;
  }

  for (let y = 0; y < height; y += 1) {
    if (rowStarts[y] === -1 || rowEnds[y] === -1) {
      continue;
    }

    let spanStart = rowStarts[y];
    let spanEnd = rowEnds[y];
    let expanded = true;

    while (expanded) {
      expanded = false;
      for (const run of alphaRunsByRow[y]) {
        if (run.end < spanStart - 42 || run.start > spanEnd + 42) {
          continue;
        }
        if (run.start < spanStart || run.end > spanEnd) {
          spanStart = Math.min(spanStart, run.start);
          spanEnd = Math.max(spanEnd, run.end);
          expanded = true;
        }
      }
    }

    rowStarts[y] = spanStart;
    rowEnds[y] = spanEnd;
  }

  fillSpanGaps(rowStarts, rowEnds, 36);
  smoothSpans(rowStarts, rowEnds, height, 2);
  expandLiRuoyaoSpans(rowStarts, rowEnds, width, height);

  return { rowStarts, rowEnds };
};

const applyRowSpanMask = (data, width, height, rowStarts, rowEnds, feather) => {
  for (let y = 0; y < height; y += 1) {
    const spanStart = rowStarts[y];
    const spanEnd = rowEnds[y];
    if (spanStart === -1 || spanEnd === -1) {
      for (let x = 0; x < width; x += 1) {
        data[getPixelIndex(x, y, width) + 3] = 0;
      }
      continue;
    }

    for (let x = 0; x < width; x += 1) {
      const alphaOffset = getPixelIndex(x, y, width) + 3;
      const alpha = data[alphaOffset];
      if (alpha === 0) {
        continue;
      }

      if (x < spanStart - feather || x > spanEnd + feather) {
        data[alphaOffset] = 0;
        continue;
      }

      if (x < spanStart) {
        const ratio = clamp((x - (spanStart - feather)) / feather, 0, 1);
        data[alphaOffset] = Math.min(alpha, clampByte(alpha * ratio));
        continue;
      }

      if (x > spanEnd) {
        const ratio = clamp(((spanEnd + feather) - x) / feather, 0, 1);
        data[alphaOffset] = Math.min(alpha, clampByte(alpha * ratio));
      }
    }
  }
};

const applyShapeKeepMask = (data, width, height, ellipses, capsules, feather) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alphaOffset = getPixelIndex(x, y, width) + 3;
      const alpha = data[alphaOffset];
      if (alpha === 0) {
        continue;
      }

      let keepRatio = 0;

      for (const ellipse of ellipses) {
        keepRatio = Math.max(
          keepRatio,
          getEllipseKeepRatio(x, y, ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, feather),
        );
      }

      for (const capsule of capsules) {
        keepRatio = Math.max(
          keepRatio,
          getCapsuleKeepRatio(x, y, capsule.x1, capsule.y1, capsule.x2, capsule.y2, capsule.radius, feather),
        );
      }

      if (keepRatio === 0) {
        data[alphaOffset] = 0;
        continue;
      }

      data[alphaOffset] = Math.min(alpha, clampByte(alpha * keepRatio));
    }
  }
};

const eraseCapsulesWithCondition = (data, width, height, referenceColor, capsules) => {
  const referenceBrightness = getBrightness(referenceColor[0], referenceColor[1], referenceColor[2]);

  for (const capsule of capsules) {
    const xMin = Math.max(0, Math.floor(Math.min(capsule.x1, capsule.x2) - capsule.radius - 2));
    const xMax = Math.min(width - 1, Math.ceil(Math.max(capsule.x1, capsule.x2) + capsule.radius + 2));
    const yMin = Math.max(0, Math.floor(Math.min(capsule.y1, capsule.y2) - capsule.radius - 2));
    const yMax = Math.min(height - 1, Math.ceil(Math.max(capsule.y1, capsule.y2) + capsule.radius + 2));

    for (let y = yMin; y <= yMax; y += 1) {
      for (let x = xMin; x <= xMax; x += 1) {
        const offset = getPixelIndex(x, y, width);
        const alpha = data[offset + 3];
        if (alpha === 0) {
          continue;
        }

        const distanceToCapsule = getDistanceToSegment(x, y, capsule.x1, capsule.y1, capsule.x2, capsule.y2);
        if (distanceToCapsule > capsule.radius) {
          continue;
        }

        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const brightness = getBrightness(r, g, b);
        const colorDistance = getColorDistance(r, g, b, referenceColor);
        const contrast = getNeighborContrast(data, x, y, width, height);
        const isRibbonLike =
          brightness >= referenceBrightness - 34 &&
          colorDistance <= 34 &&
          contrast <= 22;

        if (!isRibbonLike) {
          continue;
        }

        const falloff = clamp((capsule.radius - distanceToCapsule) / Math.max(capsule.radius, 1), 0, 1);
        data[offset + 3] = clampByte(alpha * (1 - falloff));
      }
    }
  }
};

const clearBackgroundConnectedToTransparency = (data, width, height, referenceColor) => {
  const pixelCount = width * height;
  const queue = [];
  const visited = new Uint8Array(pixelCount);
  const referenceBrightness = getBrightness(referenceColor[0], referenceColor[1], referenceColor[2]);
  const { brightnessMap, distanceMap } = buildColorMaps(data, width, height, referenceColor);
  const isBackgroundLike = (pixelIndex) => {
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    return (
      data[pixelIndex * 4 + 3] > 0 &&
      brightnessMap[pixelIndex] >= referenceBrightness - 16 &&
      distanceMap[pixelIndex] <= 20 &&
      getNeighborContrast(data, x, y, width, height) <= 18
    );
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      if (!isBackgroundLike(pixelIndex)) {
        continue;
      }

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ];

      if (
        neighbors.some(([nx, ny]) => nx < 0 || ny < 0 || nx >= width || ny >= height || data[getPixelIndex(nx, ny, width) + 3] === 0)
      ) {
        visited[pixelIndex] = 1;
        queue.push(pixelIndex);
      }
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const pixelIndex = queue[head];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const neighborIndex = ny * width + nx;
      if (visited[neighborIndex] || !isBackgroundLike(neighborIndex)) {
        continue;
      }

      visited[neighborIndex] = 1;
      queue.push(neighborIndex);
    }
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (visited[pixelIndex]) {
      data[pixelIndex * 4 + 3] = 0;
    }
  }
};

const applyLiRuoyaoCleanup = (data, width, height, referenceColor) => {
  const { rowStarts, rowEnds } = buildLiRuoyaoRowSpans(data, width, height, referenceColor);
  applyRowSpanMask(data, width, height, rowStarts, rowEnds, LI_RUOYAO_ROW_FEATHER);

  eraseCapsulesWithCondition(data, width, height, referenceColor, [
    { x1: width * 0.03, y1: height * 0.645, x2: width * 0.26, y2: height * 0.735, radius: width * 0.045 },
    { x1: width * 0.22, y1: height * 0.708, x2: width * 0.62, y2: height * 0.712, radius: width * 0.04 },
    { x1: width * 0.55, y1: height * 0.708, x2: width * 0.96, y2: height * 0.655, radius: width * 0.044 },
  ]);

  clearBackgroundConnectedToTransparency(data, width, height, referenceColor);
  keepLargestConnectedComponent(data, width, height);
  clearBackgroundConnectedToTransparency(data, width, height, referenceColor);

  const { brightnessMap, distanceMap } = buildColorMaps(data, width, height, referenceColor);
  softenForegroundEdge(
    data,
    buildAlphaMask(data),
    distanceMap,
    brightnessMap,
    referenceColor,
    getBrightness(referenceColor[0], referenceColor[1], referenceColor[2]),
    width,
    height,
  );
};

const applySpecialPortraitCleanup = (portraitName, data, width, height, referenceColor) => {
  if (portraitName === '李若瑶') {
    applyLiRuoyaoCleanup(data, width, height, referenceColor);
  }
};

const removeLiRuoyaoBackground = async (inputPath, outputPath) => {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = [];
  const referenceColor = collectTopReferenceColor(data, width, height);
  const referenceBrightness = getBrightness(referenceColor[0], referenceColor[1], referenceColor[2]);

  const trySeed = (x, y, distanceThreshold, brightnessMargin) => {
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) {
      return;
    }

    const offset = getPixelIndex(x, y, width);
    const distance = getColorDistance(data[offset], data[offset + 1], data[offset + 2], referenceColor);
    const brightness = getBrightness(data[offset], data[offset + 1], data[offset + 2]);
    if (distance > distanceThreshold || Math.abs(brightness - referenceBrightness) > brightnessMargin) {
      return;
    }

    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  };

  for (let x = 0; x < width; x += 1) {
    trySeed(x, 0, 40, 30);
  }

  const sideSeedLimit = Math.floor(height * 0.58);
  for (let y = 0; y < sideSeedLimit; y += 1) {
    trySeed(0, y, 38, 28);
    trySeed(width - 1, y, 38, 28);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const pixelIndex = queue[head];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const neighborPixelIndex = ny * width + nx;
      if (visited[neighborPixelIndex]) {
        continue;
      }

      const offset = getPixelIndex(nx, ny, width);
      const distance = getColorDistance(data[offset], data[offset + 1], data[offset + 2], referenceColor);
      const brightness = getBrightness(data[offset], data[offset + 1], data[offset + 2]);
      const distanceThreshold = ny < height * 0.45 ? 42 : 34;
      const brightnessMargin = ny < height * 0.45 ? 32 : 26;
      if (distance > distanceThreshold || Math.abs(brightness - referenceBrightness) > brightnessMargin) {
        continue;
      }

      visited[neighborPixelIndex] = 1;
      queue.push(neighborPixelIndex);
    }
  }

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (visited[pixelIndex]) {
      data[pixelIndex * 4 + 3] = 0;
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = getPixelIndex(x, y, width);
      const alpha = data[offset + 3];
      if (alpha === 0) {
        continue;
      }

      const distance = getColorDistance(data[offset], data[offset + 1], data[offset + 2], referenceColor);
      const brightness = getBrightness(data[offset], data[offset + 1], data[offset + 2]);
      if (distance >= 62 || Math.abs(brightness - referenceBrightness) >= 34) {
        continue;
      }

      let adjacentTransparency = false;
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (data[getPixelIndex(nx, ny, width) + 3] === 0) {
          adjacentTransparency = true;
          break;
        }
      }

      if (!adjacentTransparency) {
        continue;
      }

      const keepRatio = clamp((distance - 14) / 40, 0.12, 1);
      const nextAlpha = clampByte(alpha * keepRatio);
      data[offset + 3] = distance < 22 && Math.abs(brightness - referenceBrightness) < 18 ? Math.min(nextAlpha, 72) : nextAlpha;
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);
};

const removeConnectedBackground = async (inputPath, outputPath, portraitName) => {
  if (portraitName === '李若瑶') {
    await removeLiRuoyaoBackground(inputPath, outputPath);
    return;
  }

  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = [];
  const referenceColor = collectReferenceColor(data, width, height);
  const { brightnessMap, distanceMap, hardProtectedMask, protectedMask, referenceBrightness } = buildProtectionMaps(
    data,
    width,
    height,
    referenceColor,
  );

  const trySeed = (x, y) => {
    const pixelIndex = y * width + x;
    if (visited[pixelIndex] || protectedMask[pixelIndex]) {
      return;
    }
    if (!isBackgroundCandidate(distanceMap[pixelIndex], brightnessMap[pixelIndex], referenceBrightness, SEED_DISTANCE_THRESHOLD)) {
      return;
    }
    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  };

  for (let x = 0; x < width; x += 1) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  for (let head = 0; head < queue.length; head += 1) {
    const pixelIndex = queue[head];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const neighborPixelIndex = ny * width + nx;
      if (visited[neighborPixelIndex] || protectedMask[neighborPixelIndex]) {
        continue;
      }

      if (
        !isBackgroundCandidate(
          distanceMap[neighborPixelIndex],
          brightnessMap[neighborPixelIndex],
          referenceBrightness,
          FILL_DISTANCE_THRESHOLD,
        )
      ) {
        continue;
      }

      visited[neighborPixelIndex] = 1;
      queue.push(neighborPixelIndex);
    }
  }

  trimBackgroundHalo(visited, hardProtectedMask, distanceMap, brightnessMap, referenceBrightness, width, height);

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (!visited[pixelIndex]) {
      continue;
    }
    data[pixelIndex * 4 + 3] = 0;
  }

  softenForegroundEdge(data, visited, distanceMap, brightnessMap, referenceColor, referenceBrightness, width, height);
  applySpecialPortraitCleanup(portraitName, data, width, height, referenceColor);

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);
};

const resolveOutputName = (entryName) => {
  const baseName = path.parse(entryName).name;
  return OUTPUT_NAME_ALIASES[baseName] ?? baseName;
};

const main = async () => {
  ensureDir(outputDir);

  const entries = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .filter((entry) => {
      if (!ONLY_PORTRAIT_NAME) {
        return true;
      }

      const sourceName = path.parse(entry.name).name;
      const outputName = resolveOutputName(entry.name);
      return sourceName === ONLY_PORTRAIT_NAME || outputName === ONLY_PORTRAIT_NAME;
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  const results = [];

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const outputName = resolveOutputName(entry.name);
    const outputPath = path.join(outputDir, `${outputName}.png`);
    await removeConnectedBackground(sourcePath, outputPath, outputName);
    results.push({
      source: path.relative(projectRoot, sourcePath).replace(/\\/g, '/'),
      output: path.relative(projectRoot, outputPath).replace(/\\/g, '/'),
    });
  }

  console.log(JSON.stringify({ processed: results.length, results }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
