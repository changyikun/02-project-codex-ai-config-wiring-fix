import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findUnresolvedNarrativeVariables,
  parseNarrativeCsv,
  renderNarrativeTemplate,
} from './csvNarrativeLoader';
import { getNarrativeEntry, narrativeEntries, renderNarrativeEntry, renderNarrativeText } from './narrativeCatalog';

const header =
  'id,group,routeId,locationId,actorKey,actionId,variant,order,speakerIdentity,speakerName,portraitKey,portraitPlacement,narrationName,text,sceneHint,notes';

describe('csvNarrativeLoader', () => {
  it('parses quoted csv fields with commas, quotes, escaped line breaks and placeholders', () => {
    const csv = `${header}\n"test.id","test-group","","","","","","1","场景旁白","测试","","dialogue-left","","她说：""小主，{{name}}。""\\n下一句","含,逗号","备注"`;
    const [entry] = parseNarrativeCsv(csv, 'test.csv');

    expect(entry.id).toBe('test.id');
    expect(entry.portraitPlacement).toBe('dialogue-left');
    expect(entry.text).toBe('她说："小主，{{name}}。"\n下一句');
    expect(entry.sceneHint).toBe('含,逗号');
    expect(renderNarrativeTemplate(entry.text, { name: '谢令仪' })).toContain('谢令仪');
  });

  it('rejects incomplete rows and invalid portrait placement', () => {
    expect(() => parseNarrativeCsv(`${header}\n"","","","","","","","","","","","","","正文","",""`, 'bad.csv')).toThrow(
      /empty id/,
    );
    expect(() =>
      parseNarrativeCsv(
        `${header}\n"bad.id","bad","","","","","","","","","","right","","正文","",""`,
        'bad.csv',
      ),
    ).toThrow(/invalid portraitPlacement/);
  });

  it('loads the project narrative catalog with globally unique ids', () => {
    const ids = narrativeEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getNarrativeEntry('opening.default.turn1').group).toBe('opening');
    expect(renderNarrativeText('map.transition.enter-map', { fromResidence: '椒房殿' })).toContain('椒房殿');
    const renderedEntry = renderNarrativeEntry('map.transition.enter-map', { fromResidence: '椒房殿' });
    expect(renderedEntry.speakerName).toBe('娇娇');
    expect(renderedEntry.narrationName).toBe('宫道');
    expect(renderedEntry.text).toContain('椒房殿');
  });

  it('does not use 娘娘 in 娇娇 spoken narrative lines', () => {
    const jiaojiaoLinesWithNiangniang = narrativeEntries
      .filter((entry) => entry.actorKey === 'jiaojiao' || entry.speakerName === '娇娇')
      .filter((entry) => entry.text.includes('娘娘'));

    expect(jiaojiaoLinesWithNiangniang).toEqual([]);
  });

  it('keeps unresolved placeholders visible for tests to catch', () => {
    const text = renderNarrativeText('opening.default.turn1', { playerTitle: '小主' });
    expect(findUnresolvedNarrativeVariables(text)).toContain('npcName');
  });

  it('resolves every narrative id referenced by code', () => {
    const sourceRoot = join(process.cwd(), 'src');
    const codeFiles: string[] = [];
    const collect = (directory: string) => {
      readdirSync(directory).forEach((entryName) => {
        const entryPath = join(directory, entryName);
        if (entryPath.includes(`${join('game', 'narrative', 'csv')}`)) {
          return;
        }
        const stats = statSync(entryPath);
        if (stats.isDirectory()) {
          collect(entryPath);
          return;
        }
        if (/\.(ts|tsx)$/.test(entryName)) {
          codeFiles.push(entryPath);
        }
      });
    };

    collect(sourceRoot);

    const referencedIds = new Set<string>();
    const referencePattern = /\brenderNarrative(?:Text|Entry)\(\s*['"]([^'"]+)['"]/g;
    codeFiles.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      for (const match of source.matchAll(referencePattern)) {
        referencedIds.add(match[1]);
      }
    });

    expect(referencedIds.size).toBeGreaterThan(0);
    referencedIds.forEach((id) => {
      expect(() => getNarrativeEntry(id)).not.toThrow();
    });
  });
});
