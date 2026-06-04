import type { HiddenStatsState, RouteId, RouteSelectionProfile } from '../types';
import { YINGLUOYETING_INITIAL_RESIDENCE } from '../../config/haremPalaces';

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPick = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const resolveFavorPresentation = (favor: number): Pick<HiddenStatsState, 'favorLabel' | 'favorColor'> => {
  if (favor >= 81) return { favorLabel: '独宠', favorColor: '#FF0800' };
  if (favor >= 61) return { favorLabel: '盛宠', favorColor: '#E840B2' };
  if (favor >= 41) return { favorLabel: '得宠', favorColor: '#7371D8' };
  if (favor >= 21) return { favorLabel: '小宠', favorColor: '#70D1D7' };
  return { favorLabel: '无宠', favorColor: '#7C7B78' };
};

const defaultStats = {
  health: 2,
  fortune: 2,
  intrigue: 2,
  appearance: 2,
  temperament: 2,
  poetry: 0,
  talent: 0,
  painting: 0,
  embroidery: 0,
  medicine: 0,
  politics: 0,
};

export const buildRouteProfiles = (): RouteSelectionProfile[] => {
  const lanyinFavor = randomInt(40, 60);
  const fushengFavor = randomInt(0, 40);
  const yingluoFavor = randomInt(0, 30);
  const chenyuanFavor = randomInt(20, 60);
  const fushengInitialRank = randomPick(['更衣', '答应', '选侍', '御女', '常在', '才人', '美人', '婕妤']);
  const yingluoInitialRank = randomPick(['官女子', '更衣', '答应', '选侍']);

  return [
    {
      id: 'lanyinxuguo',
      label: '兰因絮果',
      labelArt: '/assets/routes/labels/lanyinxuguo-vertical.png',
      intro: '凤冠压顶，重逾千斤。是天下的国母，也是这深宫最尊贵的囚徒。',
      defaultName: '谢令仪',
      familyDisplay: '镇国公嫡女',
      residenceDisplay: '椒房殿',
      aptitudeDisplay: '未知',
      biography:
        '世人皆道皇后尊崇，却不知这凤袍之下，是如履薄冰的惊心。兰因已种，宫墙深深，最终结出的究竟是白头偕老的善果，还是相看两厌？',
      clearanceRequirement: '达成任意结局即可',
      difficulty: '中等',
      portrait: '/assets/player/lanyinxuguo-cutout.png',
      fontMask: '/assets/routes/fonts/lanyinxuguo-mask.png',
      bannerHeight: 78,
      bannerOffsetTop: 7,
      familyOptions: ['镇国公嫡女', '正三品文官嫡女', '正二品武官庶女', '正一品文官义女'],
      baseState: {
        name: '谢令仪',
        family: '镇国公嫡女',
        residenceName: '椒房殿',
        pointsTotal: randomInt(48, 51),
        pointsLeft: 0,
        age: randomInt(15, 23),
        stress: 30,
        stats: {
          ...defaultStats,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: lanyinFavor,
        trueHeart: randomInt(20, 50),
        ...resolveFavorPresentation(lanyinFavor),
        initialRank: '皇后',
      },
      statsLocked: false,
    },
    {
      id: 'fushengrumeng',
      label: '浮生如梦',
      labelArt: '/assets/routes/labels/fushengrumeng-vertical.png',
      intro: '红墙内，多少红颜白了头。入宫那日，花落无声。',
      defaultName: '宁小满',
      familyDisplay: '未知',
      residenceDisplay: '储秀宫',
      aptitudeDisplay: '未知',
      biography: '这是浮游众生中的一个，只有你知晓她的故事……',
      clearanceRequirement: '达成任意非意外死亡结局。',
      difficulty: '未知',
      portrait: '/assets/player/ningxiaoman-cutout.png',
      fontMask: '/assets/routes/fonts/fushengrumeng-mask.png',
      bannerHeight: 92,
      bannerOffsetTop: 19,
      familyOptions: ['商贾之女', '六品武官嫡女', '四品文官庶女', '一品文官义女'],
      baseState: {
        name: '宁小满',
        family: '未知',
        residenceName: '储秀宫',
        pointsTotal: randomInt(48, 54),
        pointsLeft: 0,
        age: randomInt(15, 23),
        stress: 0,
        stats: {
          ...defaultStats,
        },
      },
      hiddenStats: {
        silver: randomInt(300, 800),
        prestige: randomInt(50, 900),
        stress: 0,
        favor: fushengFavor,
        trueHeart: randomInt(0, 60),
        ...resolveFavorPresentation(fushengFavor),
        initialRank: fushengInitialRank,
      },
      statsLocked: false,
    },
    {
      id: 'yingluoyeting',
      label: '影落掖庭',
      labelArt: '/assets/routes/labels/yingluoyeting-vertical.png',
      intro: '掖庭的夜很冷，远处通明的灯火，是如今唯一的生路。',
      defaultName: '沉璧',
      familyDisplay: '罪臣之后',
      residenceDisplay: YINGLUOYETING_INITIAL_RESIDENCE,
      aptitudeDisplay: '未知',
      biography:
        '粗衣粝食，磨不掉骨中傲气。身陷囫囵，又怎会放过任何可以翻盘的机会。只是这一次的路无人知晓结局。',
      clearanceRequirement: '十年内到达妃位，并达成结局【沉冤得雪】。',
      difficulty: '困难',
      portrait: '/assets/routes/portraits/yingluoyeting.png',
      fontMask: '/assets/routes/fonts/yingluoyeting-mask.png',
      bannerHeight: 82,
      bannerOffsetTop: 4,
      familyOptions: ['罪臣之后'],
      baseState: {
        name: '沉璧',
        family: '罪臣之后',
        residenceName: YINGLUOYETING_INITIAL_RESIDENCE,
        pointsTotal: 54,
        pointsLeft: 0,
        age: randomInt(15, 23),
        stress: 30,
        stats: {
          ...defaultStats,
        },
      },
      hiddenStats: {
        silver: 50,
        prestige: 0,
        stress: 30,
        favor: yingluoFavor,
        trueHeart: randomInt(0, 40),
        ...resolveFavorPresentation(yingluoFavor),
        initialRank: yingluoInitialRank,
      },
      statsLocked: false,
    },
    {
      id: 'chenyuansucuo',
      label: '尘缘夙错',
      labelArt: '/assets/routes/labels/chenyuansucuo-vertical.png',
      intro: '马蹄声远，和书已成。跨过那道关口，便成了这宫城里最华丽的异类。',
      defaultName: '乌兰托娅',
      familyDisplay: '和亲公主',
      residenceDisplay: '玉清宫',
      aptitudeDisplay: '已知',
      biography:
        '曾是草原上最耀眼的彩霞。如今带着母国的和书，也带着藏在袖中的淬毒。这一局，不知是心先死，还是人先亡。',
      clearanceRequirement: '达成任意结局即可。',
      difficulty: '中等',
      portrait: '/assets/routes/portraits/chenyuansucuo.png',
      fontMask: '/assets/routes/fonts/chenyuansucuo-mask.png',
      bannerHeight: 84,
      bannerOffsetTop: 11,
      familyOptions: ['和亲公主'],
      baseState: {
        name: '乌兰托娅',
        family: '和亲公主',
        residenceName: '玉清宫',
        pointsTotal: 0,
        pointsLeft: 0,
        age: randomInt(15, 23),
        stress: 40,
        stats: {
          health: 6,
          fortune: 3,
          intrigue: 6.99,
          appearance: 8.99,
          temperament: 8,
          poetry: 0,
          talent: 6,
          painting: 6,
          embroidery: 1,
          medicine: 5,
          politics: 4,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: randomInt(1000, 1500),
        stress: 40,
        favor: chenyuanFavor,
        trueHeart: randomInt(-20, 20),
        ...resolveFavorPresentation(chenyuanFavor),
        initialRank: '和亲入宫',
      },
      statsLocked: true,
    },
  ];
};

export const getRouteProfileById = (routeId: RouteId): RouteSelectionProfile | undefined => {
  return buildRouteProfiles().find((route) => route.id === routeId);
};
