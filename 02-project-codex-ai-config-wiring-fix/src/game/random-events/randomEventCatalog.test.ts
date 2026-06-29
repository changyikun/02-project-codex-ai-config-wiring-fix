import { describe, expect, it } from 'vitest';
import {
  findUnresolvedRandomEventVariables,
  getRandomEvent,
  parseRandomEventCsv,
  parseRandomEventEffectJson,
  randomEventCatalog,
  renderRandomEventTemplate,
} from './randomEventCatalog';

const header =
  'eventId,rowType,poolId,weight,repeatPolicy,prerequisiteEventIds,branchId,order,speakerIdentity,speakerName,portraitKey,portraitPlacement,narrationName,text,sceneHint,optionId,optionLabel,nextBranchId,effectJson,unlockEventIds,notes';

const validCsv = `${header}
base,event,pool.alpha,2,once,,,,,,,,,,,,,,,,
base,line,,,,,start,1,旁白,,,,,"正文 {{playerName}}",,,,,,
base,option,,,,,start,,,,,,,,,choose,选择,result,"{""player"":{""prestige"":1}}",locked,
base,line,,,,,result,1,旁白,,,,,结果,,,,,,
locked,event,pool.alpha,1,once,base,,,,,,,,,,,,,,,
locked,line,,,,,start,1,旁白,,,,,后续,,,,,,
repeat,event,pool.alpha,,repeatable,,,,,,,,,,,,,,,,
repeat,line,,,,,start,1,旁白,,,,,日常,,,,,,`;

describe('randomEventCatalog', () => {
  it('loads the project random event catalog', () => {
    expect(getRandomEvent('garden.first-meet').branches.start.options).toHaveLength(2);
    expect(randomEventCatalog.eventsByPool['target.public']).toContain('garden.daily-weather');
    expect(randomEventCatalog.optionLockedEventIds.has('garden.follow-up')).toBe(true);
  });

  it('parses event, line and option rows with branches and effect json', () => {
    const catalog = parseRandomEventCsv(validCsv);
    expect(catalog.events.base.weight).toBe(2);
    expect(catalog.events.repeat.weight).toBe(1);
    expect(catalog.events.base.branches.start.lines[0].text).toContain('{{playerName}}');
    expect(catalog.events.base.branches.start.options[0].effect?.player?.prestige).toBe(1);
    expect(catalog.optionLockedEventIds.has('locked')).toBe(true);
  });

  it('rejects invalid catalog structures', () => {
    expect(() =>
      parseRandomEventCsv(`${header}\ndup,event,pool,1,once,,,,,,,,,,,,,,,,\ndup,event,pool,1,once,,,,,,,,,,,,,,,,`),
    ).toThrow(/duplicate event row/);
    expect(() => parseRandomEventCsv(`${header}\nbad,event,pool,1,sometimes,,,,,,,,,,,,,,,,`)).toThrow(/invalid repeatPolicy/);
    expect(() =>
      parseRandomEventCsv(`${header}\nbad,event,pool,1,once,missing,,,,,,,,,,,,,,,\nbad,line,,,,,start,1,,,,,,正文,,,,,,`),
    ).toThrow(/unknown prerequisiteEventId/);
    expect(() =>
      parseRandomEventCsv(`${header}\nbad,event,pool,1,once,,,,,,,,,,,,,,,,\nbad,line,,,,,start,1,,,,,,正文,,,,,,missing,`),
    ).toThrow(/unknown unlockEventId/);
    expect(() =>
      parseRandomEventCsv(`${header}\nbad,event,pool,1,once,,,,,,,,,,,,,,,,\nbad,line,,,,,start,1,,,,,,正文,,,,,,\nbad,line,,,,,result,1,,,,,,结果,,,,,,`),
    ).toThrow(/non-start branch without options/);
    expect(() =>
      parseRandomEventCsv(
        `${header}\nbad,event,pool,1,once,,,,,,,,,,,,,,,,\nbad,line,,,,,start,1,,,,,,正文,,,,,,\nbad,option,,,,,start,,,,,,,,,go,去,result,,,\nbad,line,,,,,result,1,,,,,,结果,,,,,,\nbad,option,,,,,result,,,,,,,,,again,再来,start,,,`,
      ),
    ).toThrow(/must be on branchId=start/);
  });

  it('validates effect json shape', () => {
    expect(parseRandomEventEffectJson('{"player":{"silver":3},"inventory":{"gain":[{"itemId":"plain","quantity":1}]}}')?.player?.silver).toBe(3);
    expect(
      parseRandomEventEffectJson(
        '{"inventory":{"gain":[{"itemId":"plain-1","templateItemId":"plain","quantity":1,"description":"带字","metadata":{"owner":"a"}}]}}',
      )?.inventory?.gain?.[0].templateItemId,
    ).toBe('plain');
    expect(() => parseRandomEventEffectJson('{"flags":{"x":true}}')).toThrow(/unsupported root field/);
    expect(() => parseRandomEventEffectJson('{"player":{"unknown":1}}')).toThrow(/unsupported player field/);
    expect(() => parseRandomEventEffectJson('{"inventory":{"gain":[{"itemId":"x","quantity":0}]}}')).toThrow(/positive integer/);
    expect(() => parseRandomEventEffectJson('{"inventory":{"gain":[{"itemId":"x","quantity":1,"metadata":{"bad":{}}}]}}')).toThrow(
      /must be a string, number, boolean or null/,
    );
  });

  it('renders templates and keeps missing variables visible', () => {
    const text = renderRandomEventTemplate('请{{playerAddress}}见{{targetName}}，{{missing}}。', {
      playerAddress: '娘娘',
      targetName: '姚铃儿',
    });
    expect(text).toContain('娘娘');
    expect(text).toContain('{{missing}}');
    expect(findUnresolvedRandomEventVariables(text)).toEqual(['missing']);
  });
});
