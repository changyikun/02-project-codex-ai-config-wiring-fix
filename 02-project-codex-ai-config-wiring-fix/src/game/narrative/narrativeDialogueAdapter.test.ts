import { describe, expect, it } from 'vitest';
import { renderNarrativeEntry } from './narrativeCatalog';
import {
  narrativeEntryToConsortTurn,
  narrativeEntryToGlobalDialogueFields,
  narrativeEntryToOpeningDialogueFields,
  narrativeEntryToPresentation,
} from './narrativeDialogueAdapter';

describe('narrativeDialogueAdapter', () => {
  it('maps a rendered csv entry into the common presentation shape', () => {
    const entry = renderNarrativeEntry('map.transition.enter-map', { fromResidence: '偏殿' });
    const presentation = narrativeEntryToPresentation(entry);

    expect(presentation.speakerIdentity).toBe('贴身宫女');
    expect(presentation.speakerName).toBe('娇娇');
    expect(presentation.narrationName).toBe('宫道');
    expect(presentation.text).toContain('偏殿');
  });

  it('maps csv metadata into opening and global dialogue payload fields', () => {
    const entry = renderNarrativeEntry('yangxin.verdict.summon');

    expect(narrativeEntryToOpeningDialogueFields(entry)).toMatchObject({
      speakerIdentity: '传旨内侍',
      speakerName: '内侍',
      portraitKey: 'eunuch',
      narrationName: '寝殿',
    });
    expect(narrativeEntryToGlobalDialogueFields(entry)).toMatchObject({
      characterIdentity: '传旨内侍',
      characterName: '内侍',
    });
  });

  it('builds consort dialogue turns from csv entries without runtime field-by-field assembly', () => {
    const entry = renderNarrativeEntry('consort.audience.follow-up', {
      actorName: '陈婉宁',
      optionLabel: '先按礼寒暄',
      residenceName: '长春宫',
      speakerIdentity: '容华',
      speakerLead: '她语气平稳。',
    });

    expect(narrativeEntryToConsortTurn(entry, { phase: 'finish' })).toMatchObject({
      mode: 'line',
      phase: 'finish',
      speakerIdentity: '容华',
      speakerName: '陈婉宁',
    });
  });
});
