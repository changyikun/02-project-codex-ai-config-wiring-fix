import type { RouteId } from '../types';

export interface OpeningNpcContext {
  npcId: string;
  identity: string;
  publicFace: string;
  hiddenCore: string;
  speechStyle: string[];
  sceneDuty: string[];
}

export interface OpeningRouteContext {
  playerRoleSummary: string;
  routePressure: string;
  mapFeatureSummary: string;
  choiceFocus: string;
}

const OPENING_PROFILE_BY_ROUTE: Record<
  RouteId,
  {
    npcIdentity: string;
    playerRoleSummary: string;
    routePressure: string;
    mapFeatureSummary: string;
    choiceFocus: string;
    publicFace: string;
    hiddenCore: string;
    speechStyle: string[];
    sceneDuty: string[];
  }
> = {
  lanyinxuguo: {
    npcIdentity: '中宫掌事宫女',
    playerRoleSummary: '您如今坐在中宫凤位，一举一动都得先顾着体面与规矩。',
    routePressure: '宫里人人看着中宫，哪怕一句闲话，也可能牵出权位轻重。',
    mapFeatureSummary: '御书房牵着朝堂，宝华殿管着祈福因果，后宫与养心殿更关着人心去向。',
    choiceFocus: '中宫起手，更看重藏锋、示恩，还是先稳住人心。',
    publicFace: '固定陪侍宫女，负责寝殿陪侍、日常提示与生活引导。',
    hiddenCore: '熟悉中宫规矩与后宫风向，说话稳妥，不越礼，也不会替主子抢拿主意。',
    speechStyle: ['稳妥', '细致', '先规矩后安慰', '话不说满'],
    sceneDuty: ['解释时辰银两体力', '引导地图与常驻入口', '提醒中宫处境与下一步'],
  },
  fushengrumeng: {
    npcIdentity: '储秀宫陪侍宫女',
    playerRoleSummary: '您眼下只是新入宫的宫妃，根基浅，人情与位分都得慢慢攒。',
    routePressure: '这条路最忌冒进，先活稳、先看清谁能靠近，比一时出头更要紧。',
    mapFeatureSummary: '储秀宫与后宫日常最先要紧，御膳房、御花园和宝华殿也常是摸清风向的地方。',
    choiceFocus: '初入宫墙时，是先低调自保、先露风华，还是先攒人情。',
    publicFace: '固定陪侍宫女，负责引玩家熟悉储秀宫日常与宫中生存节奏。',
    hiddenCore: '更擅长提醒新入宫者少说多看，先稳住日子，再图后手。',
    speechStyle: ['轻声', '谨慎', '偏生活化', '带着照拂意味'],
    sceneDuty: ['解释基础系统', '提醒低位起步的处境', '引导地图熟悉与回宫安排'],
  },
  yingluoyeting: {
    npcIdentity: '掖庭引路宫女',
    playerRoleSummary: '您如今还背着罪臣之后的旧名，能走到哪一步，全靠自己一点点挣。',
    routePressure: '掖庭出身最怕露怯，也最怕轻信旁人，翻身的每一步都得拿命数着走。',
    mapFeatureSummary: '冷宫旧案、太医院消息与后宫风声都可能是翻盘线索，御书房与建章宫更要慎进。',
    choiceFocus: '眼下起手，是先藏锋等时机，还是先替自己争一条活路。',
    publicFace: '固定引路宫女，负责把掖庭线的基础规矩与生存入口说清。',
    hiddenCore: '知道这条线处境险，提醒时更短更稳，不轻易给人空泛安慰。',
    speechStyle: ['克制', '利落', '不空劝', '先讲风险'],
    sceneDuty: ['说明掖庭线生存压力', '引导线索型地图地点', '提醒先稳住脚跟'],
  },
  chenyuansucuo: {
    npcIdentity: '陪嫁侍女',
    playerRoleSummary: '您是和亲入宫的公主，人人看的先是来处、礼数与异邦分寸。',
    routePressure: '宫里既盯着您的体面，也盯着您背后的故国，越是显眼，越要把话和心思收稳。',
    mapFeatureSummary: '玉清宫、宫门、养心殿与御书房都牵着去留与权衡，宝华殿和太医院也常藏着别样转机。',
    choiceFocus: '和亲开局最难的，是先守住体面、试出人心，还是先替自己留退路。',
    publicFace: '固定陪嫁侍女，负责和亲线的寝殿陪侍、提示与礼数提醒。',
    hiddenCore: '懂异邦入宫的敏感处，说话会同时顾着故国、宫规与主子的脸面。',
    speechStyle: ['低声', '审慎', '顾及故国', '留有退路'],
    sceneDuty: ['解释和亲处境', '提醒关键地图地点', '引导先定待人章法'],
  },
};

export const buildOpeningNarrativeContext = (routeId: RouteId): {
  npcContext: OpeningNpcContext;
  routeContext: OpeningRouteContext;
} => {
  const profile = OPENING_PROFILE_BY_ROUTE[routeId];

  return {
    npcContext: {
      npcId: 'tool_jiaojiao',
      identity: profile.npcIdentity,
      publicFace: profile.publicFace,
      hiddenCore: profile.hiddenCore,
      speechStyle: profile.speechStyle,
      sceneDuty: profile.sceneDuty,
    },
    routeContext: {
      playerRoleSummary: profile.playerRoleSummary,
      routePressure: profile.routePressure,
      mapFeatureSummary: profile.mapFeatureSummary,
      choiceFocus: profile.choiceFocus,
    },
  };
};
