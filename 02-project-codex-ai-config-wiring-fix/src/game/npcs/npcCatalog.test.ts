import { describe, expect, it } from 'vitest';
import {
  getBondUnlockFlagForNpc,
  getRomanceableNonConsortNpcProfiles,
  nonConsortNpcProfiles,
  requireNonConsortNpcProfile,
} from './npcCatalog';

describe('npcCatalog', () => {
  it('loads unique non-consort NPC profiles without legacy ids or old Lianqiao entries', () => {
    const ids = nonConsortNpcProfiles.map((profile) => profile.npcId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => !id.startsWith('npc-'))).toBe(true);
    expect(nonConsortNpcProfiles.map((profile) => profile.displayName)).not.toContain('连翘');
  });

  it('marks the first romanceable non-consort NPC set exactly', () => {
    expect(getRomanceableNonConsortNpcProfiles().map((profile) => profile.npcId).sort()).toEqual([
      'aling',
      'buziyou',
      'dangyi',
      'jianning',
      'lu-anping',
      'miaoyin-dancer',
      'miaoyin-musician',
      'rongan',
    ]);
  });

  it('requires romanceable profiles to carry bond copy and portrait metadata', () => {
    for (const profile of getRomanceableNonConsortNpcProfiles()) {
      expect(profile.bondTitle).toBeTruthy();
      expect(profile.bondSceneType).toBeTruthy();
      expect(profile.summary).toBeTruthy();
      expect(profile.portraitKey).toBeTruthy();
    }
    expect(requireNonConsortNpcProfile('miaoyin-musician').displayName).toBe('凌萧');
    expect(requireNonConsortNpcProfile('miaoyin-dancer').isRomanceable).toBe(true);
    expect(getBondUnlockFlagForNpc('miaoyin-musician')).toBe('bondNpcUnlocked:miaoyin-musician');
  });
});

