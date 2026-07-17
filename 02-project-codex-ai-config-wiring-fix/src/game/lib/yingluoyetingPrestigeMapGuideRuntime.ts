import { resolvePlayerSurname } from './playerNameRuntime';
import { formatChineseAge } from './yingluoyetingFirstNightServiceRuntime';

export const YINGLUOYETING_PRESTIGE_MAP_GUIDE_SCRIPT_ID = 'yingluoyeting-prestige-map-guide' as const;

export type YingluoyetingPrestigeMapGuidePhase =
  | 'chamber-prestige'
  | 'force-map-exit'
  | 'map-jiaojiao'
  | 'force-jianzhanggong'
  | 'dowager-first-meet';

export type YingluoyetingPrestigeMapGuidePortraitKey = 'jiaojiao' | 'taihou';

export interface YingluoyetingPrestigeMapGuideStep {
  id: string;
  phase: YingluoyetingPrestigeMapGuidePhase;
  text: string;
  speakerIdentity: string;
  speakerName: string;
  background?: string;
  portraitKey?: YingluoyetingPrestigeMapGuidePortraitKey;
  effect?: {
    prestigeDelta?: number;
  };
  highlightText?: string;
  completesStory?: boolean;
}

interface BuildYingluoyetingPrestigeMapGuideStepsInput {
  playerName: string;
  rankLabel: string;
  age: number;
}

export const YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS = {
  chamberMorning: '/assets/routes/home/home_yeting_night%20till%20latenight.png',
  mapDawn: '/assets/map/map_spring_dawn.png',
  jianzhanggongOutside: '/assets/routes/backgrounds/yushufang_outside_daytime.png',
  jianzhanggongInside: '/assets/routes/backgrounds/jianzhanggong_daytime.png',
} as const;

const PAGE_BREAK = '\n<<PAGE_BREAK>>\n';
const narrationIdentity = '场景旁白';

const joinPages = (lines: readonly string[]): string => lines.join(PAGE_BREAK);

export const buildYingluoyetingPrestigeMapGuideSteps = ({
  playerName,
  rankLabel,
  age,
}: BuildYingluoyetingPrestigeMapGuideStepsInput): YingluoyetingPrestigeMapGuideStep[] => {
  const playerSurname = resolvePlayerSurname(playerName, '沈');
  const surnameTitle = `${playerSurname}小主`;
  const chineseAge = formatChineseAge(age);

  return [
    {
      id: 'chamber-jiaojiao-arrives',
      phase: 'chamber-prestige',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.chamberMorning,
      speakerIdentity: '贴身宫女',
      speakerName: '娇娇',
      portraitKey: 'jiaojiao',
      text: joinPages([
        '娇娇一溜烟跑进来，笑得眉眼弯弯。',
        '"主子！昨儿您去养心殿侍寝的事儿，今早半个后宫都知道了！"她压低声音，眉飞色舞，"这会子旁人见了您，可都得高看一眼了。"',
      ]),
    },
    {
      id: 'chamber-jiaojiao-prestige',
      phase: 'chamber-prestige',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.chamberMorning,
      speakerIdentity: '贴身宫女',
      speakerName: '娇娇',
      portraitKey: 'jiaojiao',
      effect: { prestigeDelta: 10 },
      text: joinPages([
        '她掰着指头给你算："这声望呐，说白了就是旁人怎么看您。声望越高，在宫里头办事越顺当，内务府拨的份例也更上心。往后得了陛下召见、宫宴露脸、或是贵人青眼，都能涨。"',
        '你点了点头。昨夜在养心殿，皇帝不过让你睡了一觉，不曾有什么实质亲近。但宫墙之内，旁人只看见太监提灯引路、你进了养心殿的门——传召本身，便是声望。无论那扇门后究竟发生了什么。',
        '"那声望会降吗？"你问。',
        '娇娇收了笑，认真想了想："会的。比方说——各宫主子每月都得去太后娘娘那请安。若是无故缺了，太后娘娘不满意，底下人议论起来，声望可就要往下掉了。"',
        `娇娇歪着脑袋思索，忽然一拍手："对了主子，您新封的${rankLabel}，按理该去建章宫给太后娘娘请个安、拜个面。早去比晚去好，趁着陛下刚召了您，太后那边多少也听见了风声，这时候去最是妥当。"`,
      ]),
    },
    {
      id: 'chamber-before-map',
      phase: 'chamber-prestige',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.chamberMorning,
      speakerIdentity: narrationIdentity,
      speakerName: '寝居',
      text: joinPages([
        '你应了一声。',
        '在掖庭时，你只从那堵高墙的缝隙里远远瞧过宫殿的飞檐翘角，金色琉璃瓦在日光下亮得刺眼，是另一个世界。昨夜跟着引路太监匆匆走过宫道，满心都悬着侍寝的事，哪里顾得上看两侧的景致。',
        '如今总算能以"主子"的身份，好好走一遭了。不知太后娘娘又是怎样一个人？',
      ]),
    },
    {
      id: 'force-map-exit',
      phase: 'force-map-exit',
      speakerIdentity: narrationIdentity,
      speakerName: '寝居',
      text: '',
    },
    {
      id: 'map-jiaojiao-intro',
      phase: 'map-jiaojiao',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.mapDawn,
      speakerIdentity: '贴身宫女',
      speakerName: '娇娇',
      portraitKey: 'jiaojiao',
      highlightText: '建章宫',
      text: joinPages([
        '"主子您瞧，"娇娇伸手一指远处连绵的殿宇，"其实奴婢最喜欢傍晚的皇宫，太阳将落不落的时候，这些琉璃瓦顶全染成橘红色，一整片一整片的。不同时辰来看，景致全然不同呢。"',
        '她转过身来，冲你眨了眨眼："往后主子得了空闲，这些地方都可以去逛逛。御花园、妙音堂、宫门，还有各位娘娘的宫殿，想去哪儿去哪儿。"说着她收了那股子散漫劲儿，正色道："不过眼下顶要紧的，是先去给太后娘娘请安。太后就住在建章宫。"',
        '她朝一处指了指，"主子，就是那儿。"',
      ]),
    },
    {
      id: 'force-jianzhanggong',
      phase: 'force-jianzhanggong',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.mapDawn,
      speakerIdentity: narrationIdentity,
      speakerName: '大地图',
      text: '',
    },
    {
      id: 'dowager-first-meet-outside',
      phase: 'dowager-first-meet',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.jianzhanggongOutside,
      speakerIdentity: narrationIdentity,
      speakerName: '建章宫',
      text: joinPages([
        `建章宫侍女见你来了，迎上前，目光在你面上一停，随即垂首："${surnameTitle}稍候，容奴婢进去通传。"`,
        '你点了点头，站在廊下等着。娇娇识趣地退到柱子旁，双手交握在身前，不再说话。晨风从廊柱间穿过，裙摆微微晃动。',
        `片刻后，那侍女折返出来，欠身道："太后娘娘宣${surnameTitle}进去。"你整了整衣襟，跟着她跨过门槛。殿内光线骤暗，某种香味扑面而来，比养心殿的龙涎香更清冽，松林泡过的雪水气。`,
      ]),
    },
    {
      id: 'dowager-first-meet-inside',
      phase: 'dowager-first-meet',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.jianzhanggongInside,
      speakerIdentity: '太后',
      speakerName: '太后',
      portraitKey: 'taihou',
      text: joinPages([
        '殿内陈设古朴厚重，黄花梨大案上搁着一只青瓷香炉，白烟袅袅。正中紫檀太师椅上端坐一位妇人。你没有抬头，目光只掠过那双搁在扶手上的手——手背覆着薄薄的皱纹，指间一枚碧玺戒面，色泽浓沉。',
        '你在殿心站定，提裙跪落。额头触地，双手平展。',
        `"臣妾${playerName}，给太后娘娘请安。太后娘娘万福金安。"`,
        '太后没有叫起。殿内静了好一阵，只有香炉里炭火偶尔细碎作响。你跪在方砖上，凉意一点一点透过裙料往膝盖里渗。',
        '"跪着回话便是。"头顶的声音不紧不慢。"哀家倒想先问问——前儿个宫宴上那个新点的人，就是你？"',
        '你额头贴着地面："回太后娘娘，正是臣妾。"',
        `"嗯。"太后的手指在扶手上点了一下。"新封的${rankLabel}，头一回来给哀家请安，规矩倒还知道些。"她顿了一顿。"只是哀家好奇——陛下宫宴上看了一眼，当夜便召了侍寝。后宫多少年没这样的事了。你说说，凭的什么？"`,
        '这话不好接。你跪在地上，脊背挺直，没有犹豫太久："回太后娘娘，臣妾不敢妄揣圣意。臣妾只知恪守本分，陛下恩典，臣妾唯有感念。"',
        '太后没接话。那枚碧玺戒面微微一转——她换了手势，食指搭上中指。旁边侍立的嬷嬷纹丝不动。',
        '"本分。"太后重复了这两个字。"好一个本分。那哀家再问你——你既入了后宫，往后打算怎么个本分法？"',
        '"回太后娘娘，"你答得平稳，"臣妾初入后宫，不敢妄言。唯愿晨昏定省，恪守宫规，不叫太后娘娘操心。"',
        '"晨昏定省。"太后又重复了一遍。这回没有追问，安静了片刻。衣料窸窣，她动了动身子。',
        '"行了，起来吧。跪了这半天了，抬起头来让哀家瞧瞧。"',
        '你撑着地面缓缓起身。膝盖跪得发麻，站稳了，才抬起头。视线从方砖上一路往上——掠过太师椅的雕花扶手，掠过那双搁在扶手上的手，最后落在太后面上。五十余岁的妇人，眉目间沉肃端凝，不怒自威。她正看着你。',
        '太后的目光落在你面上，停住了。一息、两息。她的手指从扶手上微微收拢，又松开。',
        '"生得倒是好模样。"太后终于开口。她收回目光，端起手边茶盏，揭了盖子，没有饮。"哪里人氏？"',
        '"回太后娘娘，臣妾祖籍江南。"你垂手立在殿心，目不斜视。',
        '"多大了？"',
        `"回太后娘娘，${chineseAge}。"`,
        '"读过书？"',
        '"回太后娘娘，幼时家中延请过先生，读过些。"',
        '太后嗯了一声，将茶盏搁回桌上。瓷与桌面碰出一声脆响。她没有再问，又看了你一眼。很短。然后偏过头去，对身旁嬷嬷微微抬了抬下巴。嬷嬷上前一步。',
        '"行了。"太后将视线收回面前茶盏，一只手搭在扶手上，指腹缓缓摩挲那枚碧玺戒面。"知道规矩就好。哀家这里每月设请安礼，你记着来。"',
        '她顿了顿。"下去吧。"',
        '你敛裙，再次跪落行了全礼："臣妾告退。谢太后娘娘教诲。"',
        '起身时，太后已垂下眼，端着茶盏，不再看你。',
      ]),
    },
    {
      id: 'dowager-first-meet-complete',
      phase: 'dowager-first-meet',
      background: YINGLUOYETING_PRESTIGE_MAP_GUIDE_BACKGROUNDS.jianzhanggongInside,
      speakerIdentity: narrationIdentity,
      speakerName: '建章宫',
      text: joinPages([
        '。。。',
        '。。',
        '。',
        '试玩版剧情到此结束，接下来小主可以自由探索游玩目前开放的部分场景与玩法~',
      ]),
      completesStory: true,
    },
  ];
};
