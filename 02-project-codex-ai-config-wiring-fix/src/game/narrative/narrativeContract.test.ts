import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const scanRoots = [
  'src/components',
  'src/views',
  'src/game/lib',
  'src/game/types.ts',
  'src/ai',
  'server/src/types',
  'server/src/modules/ai/consortDialogueService.ts',
];

const codeFilePattern = /\.(ts|tsx|js|jsx)$/u;
const forbiddenPatterns = [
  { label: 'nextActionLabel', pattern: /\bnextActionLabel\b/u },
  { label: 'buildFallbackText', pattern: /\bbuildFallbackText\b/u },
  { label: 'buildFallbackTurn', pattern: /\bbuildFallbackTurn\b/u },
  { label: 'request*WithFallback', pattern: /\brequest[A-Za-z0-9_]*WithFallback\b/u },
  { label: 'usedFallback', pattern: /\busedFallback\b/u },
  { label: 'fallbackToneTag', pattern: /\bfallbackToneTag\b/u },
  { label: "source: 'fallback'", pattern: /source:\s*['"]fallback['"]/u },
];

const collectCodeFiles = (entry: string): string[] => {
  const absolute = join(repoRoot, entry);
  const stat = statSync(absolute);
  if (stat.isFile()) {
    return codeFilePattern.test(absolute) ? [absolute] : [];
  }

  return readdirSync(absolute).flatMap((child) => collectCodeFiles(join(entry, child)));
};

describe('narrative runtime contract', () => {
  it('keeps current gameplay code on local CSV/static narrative contracts', () => {
    const violations = scanRoots
      .flatMap(collectCodeFiles)
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        return forbiddenPatterns
          .filter(({ pattern }) => pattern.test(text))
          .map(({ label }) => `${relative(repoRoot, file)} -> ${label}`);
      });

    expect(violations).toEqual([]);
  });
});
