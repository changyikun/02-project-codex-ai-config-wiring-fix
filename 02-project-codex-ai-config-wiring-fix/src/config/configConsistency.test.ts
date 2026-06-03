import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TIME_SLOTS } from './constants';
import { ALL_WOMEN_PORTRAIT_IDS, getConcubinePortraitPath } from '../game/data/concubineRoster';
import { LOCATION_NAME_LIST, LOCATION_OPEN_TIME } from './locations';
import { LocationOpenMode } from './types';

const configDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(configDir, '..');

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });

describe('config consistency', () => {
  it('LOCATION_OPEN_TIME keys match LOCATION_NAME_LIST', () => {
    const keys = Object.keys(LOCATION_OPEN_TIME).sort();
    const list = [...LOCATION_NAME_LIST].sort();
    expect(keys).toEqual(list);
  });

  it('LOCATION_NAME_LIST has no duplicates', () => {
    const set = new Set(LOCATION_NAME_LIST);
    expect(set.size).toBe(LOCATION_NAME_LIST.length);
  });

  it('openSlots only use TIME_SLOTS', () => {
    const slotSet = new Set(TIME_SLOTS);
    for (const [name, config] of Object.entries(LOCATION_OPEN_TIME)) {
      if (config.mode === LocationOpenMode.AllDay || config.mode === LocationOpenMode.Slots || config.mode === LocationOpenMode.EventOnly) {
        for (const slot of config.openSlots) {
          expect(slotSet.has(slot)).toBe(true);
        }
      } else {
        throw new Error(`Unknown open mode for ${name}`);
      }
    }
  });

  it('location scene background source files exist', () => {
    const source = readFileSync(resolve(configDir, 'locationSceneBackgrounds.ts'), 'utf8');
    const moduleAssetRefs = [...source.matchAll(/new URL\('([^']+)', import\.meta\.url\)/g)].map((match) => match[1]);
    const publicAssetRefs = [...source.matchAll(/'\/assets\/[^']+'/g)].map((match) => match[0].slice(1, -1));
    const assetRefs = [...moduleAssetRefs, ...publicAssetRefs];

    expect(assetRefs.length).toBeGreaterThan(0);

    for (const assetRef of moduleAssetRefs) {
      expect(existsSync(resolve(configDir, assetRef)), assetRef).toBe(true);
    }

    for (const assetRef of publicAssetRefs) {
      expect(existsSync(resolve(configDir, '../../public', decodeURI(assetRef).slice('/'.length))), assetRef).toBe(true);
    }
  });

  it('module-relative asset URLs point to files that exist', () => {
    for (const sourceFile of listSourceFiles(srcDir)) {
      const source = readFileSync(sourceFile, 'utf8');
      const assetRefs = [...source.matchAll(/new URL\('([^']+)', import\.meta\.url\)/g)].map((match) => match[1]);

      for (const assetRef of assetRefs) {
        expect(existsSync(resolve(dirname(sourceFile), assetRef)), `${sourceFile}: ${assetRef}`).toBe(true);
      }
    }
  });

  it('concubine portrait paths point to existing public assets', () => {
    const portraitIds = [...ALL_WOMEN_PORTRAIT_IDS, '阿翎', '太后', '杜娘', '娇娇', 'unknown-consort'];

    for (const portraitId of portraitIds) {
      const portraitPath = getConcubinePortraitPath(portraitId);
      expect(portraitPath.startsWith('/assets/characters/women/')).toBe(true);
      expect(existsSync(resolve(configDir, '../../public', portraitPath.slice('/'.length))), `${portraitId}: ${portraitPath}`).toBe(true);
    }
  });
});
