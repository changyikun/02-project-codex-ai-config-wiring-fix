import { getFavorTierByValue } from '../../config/constants';
import type { HiddenStatsState, RouteId, RouteSelectionProfile } from '../types';
import {
  getRouteInitialProfileConfig,
  getRouteInitialStatDefaults,
  resolveRouteInitialPointsTotal,
} from '../numerics/numericCatalog';

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomRange = (range: readonly [number, number]): number => randomInt(range[0], range[1]);
const randomPick = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];

const resolveFavorPresentation = (favor: number): Pick<HiddenStatsState, 'favorLabel' | 'favorColor'> => {
  const tier = getFavorTierByValue(favor);
  return {
    favorLabel: tier.label,
    favorColor: tier.color,
  };
};

const buildInitialProfileState = (routeId: RouteId) => {
  const config = getRouteInitialProfileConfig(routeId);
  const stats = getRouteInitialStatDefaults(routeId);
  const favor = randomRange(config.favorRange);
  const initialRank = randomPick(config.initialRankOptions);

  return {
    config,
    baseState: {
      name: config.defaultName,
      family: config.familyDisplay,
      residenceName: config.residenceDisplay,
      pointsTotal: resolveRouteInitialPointsTotal(routeId, config.familyDisplay),
      pointsLeft: 0,
      age: randomRange(config.ageRange),
      stress: randomRange(config.stressRange),
      stats,
    },
    hiddenStats: {
      silver: randomRange(config.silverRange),
      prestige: randomRange(config.prestigeRange),
      stress: randomRange(config.stressRange),
      favor,
      trueHeart: randomRange(config.trueHeartRange),
      ...resolveFavorPresentation(favor),
      initialRank,
    },
  };
};

export const buildRouteProfiles = (): RouteSelectionProfile[] => {
  const lanyin = buildInitialProfileState('lanyinxuguo');
  const fusheng = buildInitialProfileState('fushengrumeng');
  const yingluo = buildInitialProfileState('yingluoyeting');
  const chenyuan = buildInitialProfileState('chenyuansucuo');

  return [
    {
      id: 'lanyinxuguo',
      label: '兰因絮果',
      labelArt: '/assets/routes/labels/lanyinxuguo-vertical.png',
      intro: '凤冠压顶，重逾千斤。是天下的国母，也是这深宫最尊贵的囚徒。',
      defaultName: lanyin.config.defaultName,
      familyDisplay: lanyin.config.familyDisplay,
      residenceDisplay: lanyin.config.residenceDisplay,
      aptitudeDisplay: '未知',
      biography:
        '世人皆道皇后尊崇，却不知这凤袍之下，是如履薄冰的惊心。兰因已种，宫墙深深，最终结出的究竟是白头偕老的善果，还是相看两厌？',
      clearanceRequirement: '达成任意结局即可',
      difficulty: '中等',
      portrait: '/assets/player/lanyinxuguo-cutout.png',
      fontMask: '/assets/routes/fonts/lanyinxuguo-mask.png',
      bannerHeight: 78,
      bannerOffsetTop: 7,
      familyOptions: lanyin.config.familyOptions,
      baseState: lanyin.baseState,
      hiddenStats: lanyin.hiddenStats,
      statsLocked: lanyin.config.statsLocked,
    },
    {
      id: 'fushengrumeng',
      label: '浮生如梦',
      labelArt: '/assets/routes/labels/fushengrumeng-vertical.png',
      intro: '红墙内，多少红颜白了头。入宫那日，花落无声。',
      defaultName: fusheng.config.defaultName,
      familyDisplay: fusheng.config.familyDisplay,
      residenceDisplay: fusheng.config.residenceDisplay,
      aptitudeDisplay: '未知',
      biography: '这是浮游众生中的一个，只有你知晓她的故事……',
      clearanceRequirement: '达成任意非意外死亡结局。',
      difficulty: '未知',
      portrait: '/assets/player/ningxiaoman-cutout.png',
      fontMask: '/assets/routes/fonts/fushengrumeng-mask.png',
      bannerHeight: 92,
      bannerOffsetTop: 19,
      familyOptions: fusheng.config.familyOptions,
      baseState: fusheng.baseState,
      hiddenStats: fusheng.hiddenStats,
      statsLocked: fusheng.config.statsLocked,
    },
    {
      id: 'yingluoyeting',
      label: '影落掖庭',
      labelArt: '/assets/routes/labels/yingluoyeting-vertical.png',
      intro: '掖庭的夜很冷，远处通明的灯火，是如今唯一的生路。',
      defaultName: yingluo.config.defaultName,
      familyDisplay: yingluo.config.familyDisplay,
      residenceDisplay: yingluo.config.residenceDisplay,
      aptitudeDisplay: '未知',
      biography:
        '粗衣粝食，磨不掉骨中傲气。身陷囹圄，又怎会放过任何可以翻盘的机会。只是这一次的路无人知晓结局。',
      clearanceRequirement: '十年内到达妃位，并达成结局【沉冤得雪】。',
      difficulty: '困难',
      portrait: '/assets/characters/women/chenbi.png',
      fontMask: '/assets/routes/fonts/yingluoyeting-mask.png',
      bannerHeight: 82,
      bannerOffsetTop: 4,
      familyOptions: yingluo.config.familyOptions,
      baseState: yingluo.baseState,
      hiddenStats: yingluo.hiddenStats,
      statsLocked: yingluo.config.statsLocked,
    },
    {
      id: 'chenyuansucuo',
      label: '尘缘夙错',
      labelArt: '/assets/routes/labels/chenyuansucuo-vertical.png',
      intro: '马蹄声远，和书已成。跨过那道关口，便成了这宫城里最华丽的异类。',
      defaultName: chenyuan.config.defaultName,
      familyDisplay: chenyuan.config.familyDisplay,
      residenceDisplay: chenyuan.config.residenceDisplay,
      aptitudeDisplay: '已知',
      biography:
        '曾是草原上最耀眼的彩霞。如今带着母国的和书，也带着藏在袖中的淬毒。这一局，不知是心先死，还是人先亡。',
      clearanceRequirement: '达成任意结局即可。',
      difficulty: '中等',
      portrait: '/assets/routes/portraits/chenyuansucuo.png',
      fontMask: '/assets/routes/fonts/chenyuansucuo-mask.png',
      bannerHeight: 84,
      bannerOffsetTop: 11,
      familyOptions: chenyuan.config.familyOptions,
      baseState: chenyuan.baseState,
      hiddenStats: chenyuan.hiddenStats,
      statsLocked: chenyuan.config.statsLocked,
    },
  ];
};

export const getRouteProfileById = (routeId: RouteId): RouteSelectionProfile | undefined => {
  return buildRouteProfiles().find((route) => route.id === routeId);
};
