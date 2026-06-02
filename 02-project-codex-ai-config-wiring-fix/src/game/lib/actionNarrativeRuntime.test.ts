import { describe, expect, it } from 'vitest';

import {
  buildChamberActionNarrative,
  buildLocationActionNarrative,
  buildMapTransitionNarrative,
  buildXunTransitionNarrative,
} from './actionNarrativeRuntime';

describe('actionNarrativeRuntime', () => {
  it('builds scene feedback for chamber training actions beyond numeric summaries', () => {
    const narrative = buildChamberActionNarrative({
      actionId: 'painting',
      actionLabel: '泼墨作画',
      actionSummary: '铺纸试墨',
      playerName: '谢令仪',
      residenceName: '椒房殿',
      timeLabel: '1年1月1旬上午',
    });

    expect(narrative).toContain('砚');
    expect(narrative).toContain('泼墨作画');
    expect(narrative).toContain('铺纸试墨');
    expect(narrative).not.toContain('丹青 +2');
  });

  it('builds transition feedback for map movement and returning chamber', () => {
    expect(buildMapTransitionNarrative({ kind: 'enter-map', fromResidence: '椒房殿' })).toContain('出殿');
    expect(buildMapTransitionNarrative({ kind: 'enter-location', locationName: '御花园' })).toContain('御花园');
    expect(buildMapTransitionNarrative({ kind: 'return-chamber', fromLocation: '御花园', residenceName: '椒房殿' })).toContain('回到椒房殿');
  });

  it('builds transition feedback for ending the current xun', () => {
    expect(buildXunTransitionNarrative({ currentMonth: 1, currentXun: 1 })).toContain('宫门落钥');
  });

  it('builds location action feedback inside local npc story boundaries', () => {
    const taiyi = buildLocationActionNarrative({
      locationId: 'tai-hospital',
      actionId: 'consultation',
      actionLabel: '会诊',
      resultText: '药理略有进益。',
    });
    expect(taiyi).toContain('脉案');
    expect(taiyi).toContain('药理略有进益');
    expect(taiyi).not.toContain('假死药');

    const miaoyin = buildLocationActionNarrative({
      locationId: 'miaoyin-hall',
      actionId: 'listen',
      actionLabel: '听曲',
      resultText: '压力-1。',
    });
    expect(miaoyin).toContain('余音');
    expect(miaoyin).toContain('压力-1');
    expect(miaoyin).not.toContain('争宠');

    const baohua = buildLocationActionNarrative({
      locationId: 'baohua-hall',
      actionId: 'pray',
      actionLabel: '祈福',
      resultText: '福德微增。',
    });
    expect(baohua).toContain('香火');
    expect(baohua).toContain('福德微增');
    expect(baohua).not.toContain('假死');

    const kitchen = buildLocationActionNarrative({
      locationId: 'kitchen',
      actionId: 'stroll',
      actionLabel: '闲逛',
      resultText: '并无他人。',
    });
    expect(kitchen).toContain('灶火');
    expect(kitchen).toContain('并无他人');
    expect(kitchen).not.toContain('下毒');
  });
});
