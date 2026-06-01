import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { readEnv } from '../../src/config/env';

let app: Awaited<ReturnType<typeof buildApp>>;

const calcPayload = {
  traceId: 'trace-int-1',
  action: '献艺',
  player: {
    routeId: 'xiunv',
    name: '沈容华',
    silver: 180,
    stamina: 88,
    currentRankId: 'xuanhui',
    baseStats: { charm: 72, intellect: 58, intrigue: 46, prestige: 35, favor: 40, resilience: 60 },
    skills: { etiquette: 42, intrigue: 30, performance: 50, governance: 20, insight: 36 },
    persona: {
      title: '初入深宫的新枝',
      summary: '容色出众，尚未彻底学会隐藏锋芒。',
      strengths: ['容貌惊艳'],
      weaknesses: ['根基单薄'],
    },
  },
  emperor: { mood: '审视', sincerity: 42, nightlyInterest: 38 },
  location: '寝宫',
  time: { year: 1, month: 1, xun: 1, slotIndex: 0, slot: '晨起' },
  weights: { risk: 0.65, reward: 0.75, stability: 0.4 },
};

const openingPayload = {
  routeId: 'lanyinxuguo',
  playerName: '谢令仪',
  family: '镇国公嫡女',
  playerTitle: '皇后娘娘',
  residenceName: '椒房殿',
  npcName: '娇娇',
  topic: 'opening-guide',
  turn: 1,
  history: [],
  playerContext: {
    currentRank: '皇后',
    personality: '未定',
    routeLabel: '兰因絮果',
    favor: 50,
    stress: 30,
    prestige: 2500,
    trueHeart: 35,
    silver: 1000,
    stamina: 4,
    stats: { health: 2, intrigue: 2, politics: 0 },
  },
  npcContext: {
    npcId: 'tool_jiaojiao',
    identity: '中宫掌事宫女',
    publicFace: '固定陪侍宫女，负责寝殿陪侍、日常提示与生活引导。',
    hiddenCore: '熟悉中宫规矩与后宫风向，说话稳妥，不越礼，也不会替主子抢拿主意。',
    speechStyle: ['稳妥', '细致', '先规矩后安慰', '话不说满'],
    sceneDuty: ['解释时辰银两体力', '引导地图与常驻入口', '提醒中宫处境与下一步'],
  },
  routeContext: {
    playerRoleSummary: '您如今坐在中宫凤位，一举一动都得先顾着体面与规矩。',
    routePressure: '宫里人人看着中宫，哪怕一句闲话，也可能牵出权位轻重。',
    mapFeatureSummary: '御书房牵着朝堂，宝华殿管着祈福因果，后宫与养心殿更关着人心去向。',
    choiceFocus: '中宫起手，更看重藏锋、示恩，还是先稳住人心。',
  },
  timeContext: { year: 1, month: 1, xun: 1, slotIndex: 0, slot: '清晨', slotProgress: 0 },
};

describe('AI routes integration', () => {
  beforeAll(async () => {
    process.env.REDIS_URL = 'memory://integration';
    process.env.EPONE_API_KEY = '';
    process.env.TEXT_AI_API_KEY = '';
    process.env.STAT_AI_API_KEY = '';
    process.env.AI_TIMEOUT_MS = '50';
    app = await buildApp(readEnv());
  });

  afterAll(async () => {
    await app.close();
  });

  it('calc 完成后可读取 narrative', async () => {
    const calcResponse = await app.inject({ method: 'POST', url: '/api/v1/ai/calc', payload: calcPayload });
    const calcBody = JSON.parse(calcResponse.body) as { traceId: string };
    expect(calcResponse.statusCode).toBe(200);
    expect(calcBody.traceId).toBe(calcPayload.traceId);

    const narrativeResponse = await app.inject({ method: 'GET', url: `/api/v1/ai/narrative/${calcPayload.traceId}` });
    expect([200, 404]).toContain(narrativeResponse.statusCode);
  });

  it('opening-dialogue 保持当前固定开场链路契约', async () => {
    const lineResponse = await app.inject({ method: 'POST', url: '/api/v1/ai/opening-dialogue', payload: openingPayload });
    const lineBody = JSON.parse(lineResponse.body) as {
      mode: string;
      options: unknown[];
      dataEffects: { favor: number };
    };
    expect(lineResponse.statusCode).toBe(200);
    expect(lineBody.mode).toBe('line');
    expect(lineBody.options).toEqual([]);
    expect(lineBody.dataEffects.favor).toBe(0);

    const branchResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/opening-dialogue',
      payload: { ...openingPayload, turn: 3 },
    });
    const branchBody = JSON.parse(branchResponse.body) as {
      mode: string;
      phase: string;
      options: Array<{ id: string; hiddenEffects: { favor: number; prestige: number } }>;
    };
    expect(branchResponse.statusCode).toBe(200);
    expect(branchBody.mode).toBe('branch');
    expect(branchBody.phase).toBe('finish');
    expect(branchBody.options.map((item) => item.id)).toEqual(['steady', 'radiant', 'balanced']);
    expect(branchBody.options.every((item) => item.hiddenEffects.favor === 0 && item.hiddenEffects.prestige === 0)).toBe(true);
  });

  it('opening-dialogue 会按不同开局角色上下文给出不同口吻', async () => {
    const lanyinResponse = await app.inject({ method: 'POST', url: '/api/v1/ai/opening-dialogue', payload: openingPayload });
    const chenyuanResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/opening-dialogue',
      payload: {
        ...openingPayload,
        routeId: 'chenyuansucuo',
        family: '和亲公主',
        playerTitle: '公主',
        residenceName: '玉清宫',
        npcContext: {
          npcId: 'tool_jiaojiao',
          identity: '陪嫁侍女',
          publicFace: '固定陪嫁侍女，负责和亲线的寝殿陪侍、提示与礼数提醒。',
          hiddenCore: '懂异邦入宫的敏感处，说话会同时顾着故国、宫规与主子的脸面。',
          speechStyle: ['低声', '审慎', '顾及故国', '留有退路'],
          sceneDuty: ['解释和亲处境', '提醒关键地图地点', '引导先定待人章法'],
        },
        routeContext: {
          playerRoleSummary: '您是和亲入宫的公主，人人看的先是来处、礼数与异邦分寸。',
          routePressure: '宫里既盯着您的体面，也盯着您背后的故国，越是显眼，越要把话和心思收稳。',
          mapFeatureSummary: '玉清宫、宫门、养心殿与御书房都牵着去留与权衡，宝华殿和太医院也常藏着别样转机。',
          choiceFocus: '和亲开局最难的，是先守住体面、试出人心，还是先替自己留退路。',
        },
      },
    });

    const lanyinBody = JSON.parse(lanyinResponse.body) as { speakerIdentity: string; text: string };
    const chenyuanBody = JSON.parse(chenyuanResponse.body) as { speakerIdentity: string; text: string };

    expect(lanyinBody.speakerIdentity).toBe('中宫掌事宫女');
    expect(chenyuanBody.speakerIdentity).toBe('陪嫁侍女');
    expect(lanyinBody.text).toContain('中宫');
    expect(chenyuanBody.text).toMatch(/和亲|故国|异邦/);
    expect(lanyinBody.text).not.toBe(chenyuanBody.text);
  });

  it('consort-dialogue 返回受控的妃嫔对白与三项分支选项', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/consort-dialogue',
      payload: {
        routeId: 'lanyinxuguo',
        playerName: '谢令仪',
        playerRank: '皇后',
        playerResidence: '椒房殿',
        playerOpeningTendency: '韬光养晦',
        canPunish: true,
        topic: 'action',
        actionId: 'greet',
        actionLabel: '问好',
        history: [],
        recentContext: [],
        playerContext: {
          favor: 50,
          stress: 30,
          prestige: 2500,
          trueHeart: 35,
          silver: 1000,
          stamina: 10,
          stats: { health: 2, intrigue: 2, politics: 0 },
        },
        consortContext: {
          id: 'fixed-yao',
          name: '姚铃儿',
          rank: '贵妃',
          residence: '长春宫主殿',
          stateLabel: '寻常',
          personality: '骄矜、好胜、重脸面、嫉妒、权位',
          summary: '贵妃，十九岁，得宠而高傲，极重体面。',
          currentGoodwill: -20,
          currentAffection: 0,
          emperorFavor: 72,
          stress: 32,
          allies: [],
          rivals: ['玩家'],
        },
        timeContext: { year: 1, month: 1, xun: 1, slotIndex: 1, slot: '上午', slotProgress: 0 },
      },
    });

    const body = JSON.parse(response.body) as {
      speakerIdentity: string;
      speakerName: string;
      options: Array<{ fallbackToneTag: string }>;
      nextActionLabel: string;
    };

    expect(response.statusCode).toBe(200);
    expect(body.speakerIdentity).toBe('贵妃');
    expect(body.speakerName).toBe('姚铃儿');
    expect(body.options).toHaveLength(3);
    expect(body.options.every((item) => ['friendly', 'flirt', 'cold', 'reject', 'neutral'].includes(item.fallbackToneTag))).toBe(true);
    expect(body.nextActionLabel).toBe('收起');
  });

  it('relationship-judge 返回受控的语气标签与微调结果', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/relationship-judge',
      payload: {
      routeId: 'lanyinxuguo',
      npcId: 'rongan',
      sceneType: '中宫议事',
      optionText: '婉拒靠近',
      npcProfile: '中宫夫妻 / 权力伴侣。言语稍偏，便会牵动帝后之间的分寸。',
      currentFavor: 0,
      currentAffection: 0,
      recentContext: ['温声问安 -> friendly'],
      },
    });
    const body = JSON.parse(response.body) as {
      toneTag: string;
      favorDelta: number;
      affectionDelta: number;
      reason: string;
    };

    expect(response.statusCode).toBe(200);
    expect(body.toneTag).toBe('reject');
    expect(body.favorDelta).toBe(0);
    expect(body.affectionDelta).toBe(-1);
    expect(typeof body.reason).toBe('string');
  });

  it('temple-ambient 返回宝华殿短句文本', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/temple-ambient',
      payload: {
        routeId: 'lanyinxuguo',
        playerName: '谢令仪',
        playerRank: '皇后',
        location: '宝华殿',
        action: 'stroll-idle',
        stateHint: '闲逛第1次',
        timeContext: { year: 1, month: 1, xun: 1, slotIndex: 2, slot: '中午', slotProgress: 0 },
      },
    });
    const body = JSON.parse(response.body) as { text: string };

    expect(response.statusCode).toBe(200);
    expect(typeof body.text).toBe('string');
    expect(body.text.length).toBeGreaterThan(0);
  });
});
