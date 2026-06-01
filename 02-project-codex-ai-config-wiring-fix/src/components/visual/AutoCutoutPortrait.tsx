import { useEffect, useState, type ImgHTMLAttributes } from 'react';

interface AutoCutoutPortraitProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  threshold?: number;
  sampleInset?: number;
}

interface CutoutAttemptResult {
  dataUrl: string;
  visibleRatio: number;
}

const averageColor = (samples: Array<[number, number, number]>): [number, number, number] => {
  if (samples.length === 0) {
    return [240, 240, 240];
  }

  const total = samples.reduce<[number, number, number]>(
    (accumulator, sample) => [
      accumulator[0] + sample[0],
      accumulator[1] + sample[1],
      accumulator[2] + sample[2],
    ],
    [0, 0, 0],
  );

  return [
    Math.round(total[0] / samples.length),
    Math.round(total[1] / samples.length),
    Math.round(total[2] / samples.length),
  ];
};

const getColorDistance = (red: number, green: number, blue: number, background: [number, number, number]): number =>
  Math.sqrt(
    (red - background[0]) ** 2 +
      (green - background[1]) ** 2 +
      (blue - background[2]) ** 2,
  );

const isNearNeutralWhite = (
  red: number,
  green: number,
  blue: number,
  minimumBrightness = 228,
  maximumSpread = 24,
): boolean => {
  const brightness = (red + green + blue) / 3;
  const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);
  return brightness >= minimumBrightness && colorSpread <= maximumSpread;
};

const renderCutoutAttempt = (
  image: HTMLImageElement,
  threshold: number,
  sampleInset: number,
): CutoutAttemptResult => {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');

  if (!context || canvas.width === 0 || canvas.height === 0) {
    return { dataUrl: image.src, visibleRatio: 1 };
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queueX: number[] = [];
  const queueY: number[] = [];

  const safeInset = Math.max(0, Math.min(sampleInset, Math.floor(Math.min(width, height) / 8)));
  const samplePoints = [
    [safeInset, safeInset],
    [width - 1 - safeInset, safeInset],
    [safeInset, height - 1 - safeInset],
    [width - 1 - safeInset, height - 1 - safeInset],
    [Math.floor(width / 2), safeInset],
    [Math.floor(width / 2), height - 1 - safeInset],
  ];

  const background = averageColor(
    samplePoints
      .map(([x, y]) => {
        const pixelIndex = (y * width + x) * 4;
        return [data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2]] as [number, number, number];
      })
      .filter((sample) => sample.every((channel) => Number.isFinite(channel))),
  );

  const isBackgroundPixel = (x: number, y: number): boolean => {
    const pixelIndex = (y * width + x) * 4;
    if (data[pixelIndex + 3] <= 10) {
      return true;
    }

    const red = data[pixelIndex];
    const green = data[pixelIndex + 1];
    const blue = data[pixelIndex + 2];

    return (
      getColorDistance(red, green, blue, background) <= threshold ||
      isNearNeutralWhite(red, green, blue)
    );
  };

  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const visitIndex = y * width + x;
    if (visited[visitIndex] || !isBackgroundPixel(x, y)) {
      return;
    }

    visited[visitIndex] = 1;
    queueX.push(x);
    queueY.push(y);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let head = 0; head < queueX.length; head += 1) {
    const x = queueX[head];
    const y = queueY[head];
    const pixelIndex = (y * width + x) * 4;

    data[pixelIndex + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  let opaquePixelCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      const visitIndex = y * width + x;

      if (visited[visitIndex]) {
        data[pixelIndex + 3] = 0;
        continue;
      }

      let hasTransparentNeighbor = false;
      for (let offsetY = -1; offsetY <= 1 && !hasTransparentNeighbor; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) {
            continue;
          }

          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
            continue;
          }

          if (visited[nextY * width + nextX]) {
            hasTransparentNeighbor = true;
            break;
          }
        }
      }

      const red = data[pixelIndex];
      const green = data[pixelIndex + 1];
      const blue = data[pixelIndex + 2];
      const brightness = (red + green + blue) / 3;
      const colorSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

      if (hasTransparentNeighbor && isNearNeutralWhite(red, green, blue, 224, 28)) {
        data[pixelIndex + 3] = 0;
        continue;
      }

      if (hasTransparentNeighbor && brightness >= 214 && colorSpread <= 24) {
        data[pixelIndex] = Math.max(0, red - 18);
        data[pixelIndex + 1] = Math.max(0, green - 18);
        data[pixelIndex + 2] = Math.max(0, blue - 18);
        data[pixelIndex + 3] = Math.min(data[pixelIndex + 3], 214);
      }

      if (data[pixelIndex + 3] > 0) {
        opaquePixelCount += 1;
      }
    }
  }

  const visibleRatio = opaquePixelCount / (width * height);
  context.putImageData(imageData, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    visibleRatio,
  };
};

const buildCutoutDataUrl = (image: HTMLImageElement, threshold: number, sampleInset: number): string => {
  const attempts = [threshold, threshold + 8, threshold + 14];
  let bestAttempt: CutoutAttemptResult | null = null;

  for (const nextThreshold of attempts) {
    const attempt = renderCutoutAttempt(image, nextThreshold, sampleInset);
    bestAttempt = attempt;

    if (attempt.visibleRatio >= 0.08 && attempt.visibleRatio <= 0.88) {
      return attempt.dataUrl;
    }
  }

  if (bestAttempt && bestAttempt.visibleRatio >= 0.08) {
    return bestAttempt.dataUrl;
  }

  return image.src;
};

export function AutoCutoutPortrait({
  src,
  alt,
  threshold = 34,
  sampleInset = 6,
  ...imageProps
}: AutoCutoutPortraitProps) {
  const [resolvedSrc, setResolvedSrc] = useState('');

  useEffect(() => {
    let disposed = false;

    if (typeof window === 'undefined') {
      setResolvedSrc(src);
      return undefined;
    }

    setResolvedSrc('');

    const image = new Image();
    image.decoding = 'async';
    image.src = src;

    image.onload = () => {
      if (disposed) {
        return;
      }

      try {
        setResolvedSrc(buildCutoutDataUrl(image, threshold, sampleInset));
      } catch {
        setResolvedSrc(src);
      }
    };

    image.onerror = () => {
      if (!disposed) {
        setResolvedSrc(src);
      }
    };

    return () => {
      disposed = true;
    };
  }, [sampleInset, src, threshold]);

  if (!resolvedSrc) {
    return null;
  }

  return <img {...imageProps} src={resolvedSrc} alt={alt} />;
}
