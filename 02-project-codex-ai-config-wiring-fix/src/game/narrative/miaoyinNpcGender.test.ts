import { describe, expect, it } from 'vitest';
import { renderNarrativeEntry } from './narrativeCatalog';

describe('miaoyin npc gendered copy', () => {
  it('describes musician Ling Xiao as the brother with masculine pronouns and self-reference', () => {
    const firstMeet = renderNarrativeEntry('miaoyin.musician.first-meet');
    const talk = renderNarrativeEntry('miaoyin.musician.talk');

    expect(firstMeet.speakerName).toBe('凌萧');
    expect(firstMeet.text).toContain('小人也可');
    expect(talk.text).toContain('他话不多');
    expect(talk.text).not.toContain('她话不多');
  });
});
