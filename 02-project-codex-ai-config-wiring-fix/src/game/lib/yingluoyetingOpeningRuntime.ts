import { numericInventoryItems } from '../numerics/numericCatalog';
import type { InventoryItem } from '../types';

const PAGE_BREAK = '\n<<PAGE_BREAK>>\n';

export type YingluoyetingOpeningPerformanceTier = 'low' | 'middle' | 'high';
export type YingluoyetingOpeningChoiceId = 'go-out' | 'wait-inside';

export interface YingluoyetingOpeningOption {
  id: YingluoyetingOpeningChoiceId;
  label: string;
}

export interface YingluoyetingOpeningStep {
  id: string;
  background: string;
  speakerIdentity: string;
  speakerName: string;
  narrationName?: string;
  portraitKey?: 'jiaojiao' | 'li-gonggong' | 'taijian';
  delayPortraitUntilBackgroundSettled?: boolean;
  text: string;
  autoAdvanceMs?: number;
  transition?: 'black';
  options?: readonly YingluoyetingOpeningOption[];
}

export interface YingluoyetingOpeningReward {
  item: InventoryItem;
  quantity: number;
}

export const YINGLUOYETING_OPENING_REWARD_ITEM_IDS = {
  muttonFatJadeBracelet: 'opening-mutton-fat-jade-bracelet',
  silkBrocade: 'opening-silk-brocade',
  jadeHandledWhisk: 'opening-jade-handled-whisk',
  silverHairpin: 'opening-silver-hairpin',
  cottonCloth: 'opening-cotton-cloth',
} as const;

const BACKGROUNDS = {
  poetry: '/assets/routes/backgrounds/poetry.png',
  banquet: '/assets/routes/backgrounds/gongyan.png',
  lamp: '/assets/routes/backgrounds/liuli_lamp.png',
  fire: '/assets/routes/backgrounds/liuli_fire.png',
  eye: '/assets/routes/backgrounds/eye.png',
  chuyuLi: '/assets/routes/backgrounds/chuyu_li.png',
  shabbyRoom: '/assets/routes/backgrounds/loushi.png',
  chamberNight: '/assets/routes/home/home_yeting_night%20till%20latenight.png',
} as const;

const narrationStep = (
  id: string,
  background: string,
  text: string,
  extra: Partial<YingluoyetingOpeningStep> = {},
): YingluoyetingOpeningStep => ({
  id,
  background,
  speakerIdentity: '场景旁白',
  speakerName: extra.narrationName ?? '第一章·掖庭夜·宫宴华',
  narrationName: extra.narrationName ?? '第一章·掖庭夜·宫宴华',
  text,
  ...extra,
});

export const YINGLUOYETING_OPENING_STORY_STEPS: readonly YingluoyetingOpeningStep[] = [
  narrationStep(
    'poetry',
    BACKGROUNDS.poetry,
    ['墨泼青衫簪折雪，玉堕朱门骨未销。', '金阙遥知非故里，寒宵谁共立中宵。'].join(PAGE_BREAK),
  ),
  narrationStep(
    'banquet-intro',
    BACKGROUNDS.banquet,
    [
      '殿中香烟缭绕，九龙衔灯，金砖映壁，照得满堂如白昼。',
      '丝竹声起，妙音堂新排的《上元乐》正奏至最华彩处，编钟沉鸣，琵琶声如碎玉溅珠。宫娥捧盏穿行，步履无声，衣袂带起一阵阵沉水香。',
      '你站在西侧廊柱后的阴影里。身上穿着一件素青色新制宫装，料子算不得上等，胜在裁剪合度——这是那位遣人送来的，说是“仪容不可失礼”。',
      '你垂着眼，看向手中已被揉得皱成一团的帕子。',
      '复又抬首。',
    ].join(PAGE_BREAK),
    { narrationName: '宫宴' },
  ),
  narrationStep(
    'lamp',
    BACKGROUNDS.lamp,
    ['殿内的光太亮了。', '那些琉璃灯盏折射出万千碎芒，刺得人眼眶泛酸。'].join(PAGE_BREAK),
    { narrationName: '琉璃灯' },
  ),
  narrationStep(
    'fire',
    BACKGROUNDS.fire,
    '闭上眼，耳畔的满堂笑语与丝竹乐声，愈渐高亢，扭曲，如同记忆中尖锐的、断断续续的哭喊声。',
    { narrationName: '火光' },
  ),
  narrationStep(
    'performance-call-lamp',
    BACKGROUNDS.lamp,
    [
      '“——乐人沉璧，献舞！”',
      '太监拖长了尾音的唱报声，将你猛地拽回灯火通明的殿中。',
    ].join(PAGE_BREAK),
    { narrationName: '琉璃灯' },
  ),
  narrationStep(
    'banquet-return',
    BACKGROUNDS.banquet,
    [
      '你睁开眼，心跳如擂鼓，手指在袖中微微发颤。你知道，殿中所有人的目光此刻都落在自己将要踏出的那一步上。',
      '是生路。还是绝路。',
      '你深吸一口气，将那一丝颤意压入五脏六腑的最深处。',
      '掖庭之人入宫宴献舞，本是天方夜谭，那人只说会在中间“稍作安排”——这些事你不需要知道得太多，只需要知道，今日站在这里的人是自己。旁人是罪奴，是枯骨，但你不是。',
      '你知道自己会抓住这个机会。',
      '哪怕只有一线天光，你也要从那缝隙里挣出去。',
      '你低头敛目，步履踩在编钟余韵的节拍上，一步步踏入殿心。',
    ].join(PAGE_BREAK),
    { narrationName: '宫宴' },
  ),
  narrationStep(
    'palace-center',
    BACKGROUNDS.banquet,
    [
      '殿中静了一瞬。',
      '你跪伏在地。坐在皇帝下首第三席的一位妃子，见状微微一笑，起身向皇帝座前略一欠身，开口说了什么。',
      '你只听见几个零碎的字眼。',
      '皇帝没有立刻答话。',
      '你跪伏在地，殿内一切都静了下来。视线所及，只有御座一截明黄色的袍角，还有那袍角下露出的一双玄色云纹靴。',
      '“抬起头来。”头顶的声音传来。',
      '那声音不疾不徐，带着一种天然的、浸透了帝王威仪的低沉与从容。像是极远处滚过的闷雷，又像是冬日里煨在炭火上的那一盏温酒——看似温和，实则每一字都压得人喘不过气来。',
      '你的指尖扣进掌心，极缓地，抬起了头。',
    ].join(PAGE_BREAK),
    { narrationName: '殿心' },
  ),
  narrationStep(
    'eye-scene',
    BACKGROUNDS.eye,
    [
      '然后撞进了一双眼睛里。',
      '那双眼睛。',
      '帝王的眼睛，生得极好。深邃如远山暮色下的深潭，浓黑的睫羽微微覆着，此刻正定定地落在你面上。你心头猛地一跳——掖庭某位姑姑曾对着你的脸叹过一口气，说：“你这孩子，五官生得太淡了，像一幅褪了色的工笔画，在这深宫里，怕是不讨喜。”',
      '你当时只是笑了笑，没有反驳。',
      '此刻，从那双沉静的眼眸中，你看不出任何的喜怒。那目光落在你身上，并非灼热的审视，也非轻佻的玩味，反而更像是……冬日里封冻的深潭，被什么东西极轻地触了一下水面。',
      '有一圈涟漪。极浅。极轻。然而你看得分明。',
      '但那涟漪很快就消散了，沉入一片幽邃的、望不见底的漆黑之中。帝王的脸上没有任何多余的表情，甚至没有多停留片刻的失态。他只是微微偏了一下头，像是对一件寻常物事的打量结束了。',
    ].join(PAGE_BREAK),
    { narrationName: '殿心' },
  ),
  narrationStep(
    'eye-scene-removed',
    BACKGROUNDS.banquet,
    [
      '“倒是个美人胚子。”他说。语气平淡，像是在评价今日的茶汤是否煮得恰好。',
      '那沉默短得像是错觉。我甚至不确定自己是否真的看到了那一丝涟漪。',
      '“开始吧。”',
    ].join(PAGE_BREAK),
    { narrationName: '殿心' },
  ),
  narrationStep(
    'time-passes-before-loushi',
    BACKGROUNDS.shabbyRoom,
    '',
    { narrationName: '夜色流转', transition: 'black', autoAdvanceMs: 2000 },
  ),
  narrationStep(
    'li-gonggong-branch',
    BACKGROUNDS.shabbyRoom,
    [
      '夜已深了。殿中的笙歌散尽，只剩下远处零星几点灯火。',
      '你坐在掖庭偏室那张窄硬的木板床上，双手交握，指尖掐得发白。',
      '你不知道自己该想什么，方才的宫宴如同幻梦一般。',
      '你等了很久。久到几乎以为，这条生路已然封死。',
      '门外有脚步声。',
      '极轻的、靴子踩在青石砖上的声响。',
      '你猛地抬起头——',
    ].join(PAGE_BREAK),
    {
      narrationName: '掖庭偏室',
      options: [
        { id: 'go-out', label: '出去看看' },
        { id: 'wait-inside', label: '原地等候' },
      ],
    },
  ),
  {
    id: 'imperial-edict',
    background: BACKGROUNDS.shabbyRoom,
    speakerIdentity: '李公公',
    speakerName: '李公公',
    portraitKey: 'li-gonggong',
    text: [
      '他伸手取了绢帛。指节在灯下白得像冷玉，然后转过身来，面对着你。',
      '你跪了下去。额头触地，双手举过头顶，掌心朝上。',
      '"沉氏女沉璧，念在其温婉知礼，才艺可嘉，今册为选侍，赐居储秀宫西偏殿，即日迁入。钦此。"',
      '他的声音不高不低，一个字一个字地从上方传来，尾音里似乎还带着若有似无的笑意。你跪在地上，额头抵着冰凉的地面，听见自己的心跳声盖过了掖庭的夜风。',
      '那卷明黄色的绢帛被轻轻放入你掌心。指尖擦过你的指腹——凉的，像玉。然后他收回手，退后半步："恭喜沉选侍。往后便是在册的主子了。"',
      '你捧着那卷圣旨，指节微微泛白——悬了一整夜的心，仿佛终于落回了实处。你跪伏在地，双手举过头顶。',
      '“奴婢接旨。”',
      '你抬起头看他，他正垂着眼，那张狐狸似的面容上带着一丝淡淡的笑意，像浮在冰面上的薄霜，看得见，摸不着。他没有多停留，侧身向身后瞥了一眼：“这是拨给您使唤的宫女，叫娇娇。”然后袍角一旋，带着两个小太监转身离去。',
      '你目送他的背影消失在门框边，只看到一截银白色的发尾掠过烛火，一转便消失在夜色里。你这才发现自己还攥着那卷圣旨，指尖捏得发白。你缓缓站起来，走到门边，廊下的灯还亮着，但人已经走远了。',
    ].join(PAGE_BREAK),
  },
  {
    id: 'jiaojiao',
    background: BACKGROUNDS.shabbyRoom,
    speakerIdentity: '娇娇',
    speakerName: '娇娇',
    portraitKey: 'jiaojiao',
    text: [
      '“主子主子！”',
      '门又被推开了，一个梳着双螺髻的小宫女一溜烟跑进来，声音清脆得像初春屋檐下融化的冰凌——“奴婢叫娇娇！是掖庭新拨过来的！方才奴婢在门外听见那卷圣旨念完，又听见李公公说让奴婢跟了您，简直比自己得了赏还欢喜！”',
      '她一边说一边利落地替你将那卷明黄圣旨捧到桌上放好，然后回身仰着脸看你，一双眼睛弯成了月牙儿。',
      '“奴婢远远瞧见主子今儿从殿上回来，就知道主子不是寻常人！”她压低了声音，带着几分少女特有的狡黠劲儿，“您往那儿一站呀，这掖庭的灰扑扑都活过来了！旁人穿那青衫是枯叶，您穿是……”',
      '她想了想，歪着头道：“是雨后竹林里的新笋！一看就是要往上长的！”',
      '你看着她那满面真诚的、圆圆的脸，心头那根绷了太久的弦，终于悄悄地、悄悄地松了一丝。',
      '你张了张口，想说什么，却被她先一步拉住了手：“主子别怕，往后有娇娇在呢！这宫里头的门道，奴婢虽然年纪小，但从小在掖庭摸爬滚打长大的，什么犄角旮旯的事儿都晓得一星半点儿！”',
      '她说这话时，眼睛亮晶晶的，没有半点谄媚，满是雀跃的、真诚的欢喜。',
      '你终于轻轻弯了一下唇角。掖庭的夜很冷。但此刻窗外远处，那一线通明的灯火，是这片黑暗里唯一的光。',
      '也是你如今唯一的生路。',
    ].join(PAGE_BREAK),
  },
  narrationStep(
    'time-passes-before-chamber',
    BACKGROUNDS.chamberNight,
    '',
    { narrationName: '夜色流转', transition: 'black', autoAdvanceMs: 3600 },
  ),
  narrationStep(
    'chapter-end',
    BACKGROUNDS.chamberNight,
    [
      '夜深了。娇娇替你在新居里点好了灯，铺好了床褥，又跑前跑后地烧了一壶热水端来。',
      '你坐在窗边，望着窗外那一方被宫墙切割得四四方方的夜空。月是一弯极薄的钩子，悬在飞檐翘角之上，泠泠地散着清光。',
      '手中握着那卷明黄色的圣旨，绢帛的触感冰凉而光滑。',
      '从今日起，你是选侍沉氏了。不再是无依无靠的掖庭罪奴。',
      '可你心里明白得很——这深宫里的每一寸金砖下面，都埋着数不清的白骨。今夜你踏出了第一步，往后是福是祸，无人知晓。',
      '你低头看了看圣旨上那枚朱红的御印，忽然想起父亲曾经教你写字时说过的话——',
      '“璧者，玉也。玉在石中，其光内蕴。终有一日，会有人识得它的。”',
      '父亲。你轻轻闭上眼，将那卷圣旨贴在胸口。',
      '你会活下去，会查清一切。',
      '远处灯火通明，而你站在这头，终于有了往那头走的资格。',
      '——第一章·完——',
    ].join(PAGE_BREAK),
    { narrationName: '储秀宫西偏殿' },
  ),
];

export const YINGLUOYETING_OPENING_CHOICE_STEPS: Record<YingluoyetingOpeningChoiceId, readonly YingluoyetingOpeningStep[]> = {
  'go-out': [
    narrationStep(
      'li-gonggong-go-out-open-door',
      BACKGROUNDS.shabbyRoom,
      [
      '你几乎是本能地站了起来。你不想等了。你不想缩在这间昏暗潮湿的偏室里，像一只待宰的羔羊，等着命运来叩你的门。你要自己走过去看。',
      '你几步跨到门边，手指搭上了木门的边缘，用力拉开了那扇门——',
      ].join(PAGE_BREAK),
      { narrationName: '掖庭偏室' },
    ),
    narrationStep(
      'li-gonggong-go-out-outside',
      BACKGROUNDS.chuyuLi,
      [
        '来人正要抬手叩门，你的动作让他顿了一瞬。',
        '空气中流淌过一缕似有若无的沉水香。',
        '来人站在门外，一袭墨色袍子，鲜红的内衬映着廊下摇曳的灯火，在掖庭昏暗的光影里泛着温润的光，像是刚踏过宫宴的灯火就径直来了这里。',
        '你下意识抬起视线。掠过他线条分明的下颌，淡色的唇，最后对上了一双丹凤眼——那双眼微微睁大，代表着主人片刻的意外，如同林中漫步的狐狸被忽然惊起的飞鸟打断，愣了一息。',
        '然后那点意外便被他化开了。唇角先动，眼尾跟着弯下来，一个若有似无的笑意浮上来，把他方才那一瞬间的失态不紧不慢地盖了过去，像是水面上的涟漪散尽后，又恢复了惯常的从容。',
      ].join(PAGE_BREAK),
      { narrationName: '掖庭偏室' },
    ),
    narrationStep(
      'li-gonggong-go-out-speech',
      BACKGROUNDS.shabbyRoom,
      [
        '“沉姑娘。”他开口了。声音不是宦官应有的尖细，不高不低，温润如玉。“陛下口谕。”',
        '他站在门外，安安静静地等你让出进屋的路。那笑意还挂在他唇边，不浓不淡的，像一盏文火煮着的茶汤上浮着的薄薄的光。掖庭的夜风从你们之间穿过去，他垂在肩侧的白发被撩起来，又落回去，你又闻到了沉水香。',
        '你退开半步。他跨过门槛时经过你身侧，那缕沉水香倏地浓了一瞬，又随着他站定的动作淡开。',
        '你回过神来，转身面向他。他已经在屋中站定，黑袍在昏黄的烛火下泛着沉沉的光。身后跟着的两个小太监一左一右捧着托盘，盘中放着一卷明黄色的绢帛。',
      ].join(PAGE_BREAK),
      {
        narrationName: '掖庭偏室',
        speakerIdentity: '李公公',
        speakerName: '李公公',
        portraitKey: 'li-gonggong',
        delayPortraitUntilBackgroundSettled: true,
      },
    ),
  ],
  'wait-inside': [
    narrationStep(
      'li-gonggong-wait-inside-before-entrance',
      BACKGROUNDS.shabbyRoom,
      [
        '你的指尖掐进掌心，后背抵着墙。你听见那脚步声在门外停住了，紧接着是衣袖拂过衣料的细微声响——来人已经站在了门外。',
        '你深吸一口气。告诉自己——不能慌，不管来的是好消息还是坏消息，你都要泰然坐在这里，安安静静地等命运走进来，站在你面前，把它的判词说给你听。',
        '你把交握的双手轻轻放平在膝上，挺直了腰背，下巴微微抬起，目光落在门板上。那扇门被推开了。',
        '一只手先探进来。那手指极长极白，骨节分明，指甲修剪得干干净净，搭在门框边缘时像一块冷玉贴在陈旧的木头上。然后是一截墨色的袍角，轻轻拂过门槛。一双暗金云纹的宫靴踏进门来。',
        '你抬起眼来。',
      ].join(PAGE_BREAK),
      { narrationName: '掖庭偏室' },
    ),
    narrationStep(
      'li-gonggong-wait-inside-portrait',
      BACKGROUNDS.shabbyRoom,
      [
        '面前的人白发如雪，半数束在玄色冠帽中，鬓角没有一根杂色。眉目极淡极长，一双丹凤眼微微上挑，瞳色在灯下泛着浅琥珀般的光。他生着一张玉雕似的面容，此刻正垂着眼看你，目光落下来，从你端正的坐姿上缓缓扫过，眼里透着淡淡的兴味。',
        '“沉姑娘。”他开口了。声音不高不低，温润如玉，带着一种极轻的玉石相击般的质感。“陛下口谕。”',
        '他在屋中站定，黑袍在昏黄的烛火下泛着沉沉的光。身后跟着的两个小太监一左一右捧着托盘，盘中放着一卷明黄色的绢帛。',
      ].join(PAGE_BREAK),
      {
        narrationName: '掖庭偏室',
        speakerIdentity: '李公公',
        speakerName: '李公公',
        portraitKey: 'li-gonggong',
      },
    ),
  ],
};

export const YINGLUOYETING_OPENING_PERFORMANCE_STEPS: Record<YingluoyetingOpeningPerformanceTier, readonly YingluoyetingOpeningStep[]> = {
  high: [
    narrationStep(
    'performance-high',
    BACKGROUNDS.banquet,
    [
      '你起身。阖目一瞬，再睁眼时，眸中已是一片澄明。',
      '乐声再起，你旋身而舞。舞姿如行云掠水，身段轻盈得像是没有分量，广袖翻飞间，衣袂在空中划出流畅的弧。她每一步都踩在宫商角徵的转折处，乐理造诣之深，让她整支舞与乐声浑然一体，仿佛不是她在伴乐，而是乐在随她而起。',
      '满殿的目光开始凝聚。有妃嫔手中杯盏停在半途，忘了饮下。有朝臣忍不住微微倾身。太乐署的乐师们指尖一顿，几乎要停下演奏来看她——那腰肢的每一折、指尖的每一捻，都在无声地诉说一段故国旧梦般的哀婉与孤清。',
      '殿中静得只剩下乐声和衣袂拂风之声。',
      '最后一个旋身落地，青色的裙摆如荷叶般铺开，你微微侧首，低眉敛目，呼吸未乱，只是胸口起伏微微加快了些许。',
      '短暂的寂静后，不知是谁率先击了一掌。',
      '然后，掌声如潮水般涌起。',
    ].join(PAGE_BREAK),
    { narrationName: '惊艳四座' },
    ),
    narrationStep(
    'performance-high-eye',
    BACKGROUNDS.eye,
    [
      '你忍不住抬眼——高座之上的那个人，目光仍落在你身上。与方才一样，专注、沉静、未曾移开过一分。可你总觉得，那目光里似乎比方才多了一点什么——你读不懂。大约是……认可？又或者只是好奇。',
      '你不敢深想。',
    ].join(PAGE_BREAK),
    { narrationName: '惊艳四座' },
    ),
    narrationStep(
    'performance-high-banquet-return',
    BACKGROUNDS.banquet,
    [
      '有人含笑抚掌，对皇帝道：“臣妾就说，这孩子是个有灵性的。”',
      '皇帝嗯了一声，随即偏头向身侧的内侍示意。',
    ].join(PAGE_BREAK),
    { narrationName: '惊艳四座' },
    ),
    {
      id: 'performance-high-reward',
      background: BACKGROUNDS.banquet,
      speakerIdentity: '内侍',
      speakerName: '内侍',
      portraitKey: 'taijian',
      narrationName: '惊艳四座',
      text: [
      '片刻后，内侍手捧玉盘而下，盘中最醒目的是一对羊脂白玉的镯子，色泽温润如凝脂。',
      '“陛下赏赐，沉姑娘收下吧。”内侍的声音不高不低，却清晰地传遍大殿。',
      '满殿妃嫔看向你的目光多了一层意味。',
      '【获得赏赐】羊脂白玉镯×2、绸缎×2、玉柄拂尘×1、银簪×2、棉布×1',
      ].join(PAGE_BREAK),
    },
  ],
  middle: [
    narrationStep(
    'performance-middle',
    BACKGROUNDS.banquet,
    [
      '你起身。深吸一口气，将心神沉入旋律之中。',
      '你起舞时并不炫技，姿态干净利落，广袖流转间自有一段天然的风流。你的舞步并未紧紧追着乐声的每一处转折，反而留出了几分余白，让那鼓点与你的身姿之间生出一种微妙的疏离感——像水墨画中的留白，反而更衬得整幅画面清雅如风。',
      '有几位年长的妃嫔微微颔首，目光中露出欣赏之色。席间有低低的交谈声，不知是在议论身段，还是在评说气韵。',
      '落地时你微微有些气喘，额角沁出了薄薄一层细汗，但腰背依然挺得笔直。',
      '掌声疏落却真诚。',
    ].join(PAGE_BREAK),
    { narrationName: '清新脱俗' },
    ),
    narrationStep(
    'performance-middle-eye',
    BACKGROUNDS.eye,
    [
      '皇帝的目光落在你身上，仍旧是那副看不出情绪的模样。专注。一直没有移开。但那专注里似乎没有太多温度的起伏，像在看一支不错的曲子，看完了便罢了。',
    ].join(PAGE_BREAK),
    { narrationName: '清新脱俗' },
    ),
    narrationStep(
    'performance-middle-banquet-return',
    BACKGROUNDS.banquet,
    [
      '那位妃子笑着看了皇帝一眼，道：“沉璧这孩子，倒有几分说不出的韵味。”',
      '皇帝略一点头，没多说什么。',
    ].join(PAGE_BREAK),
    { narrationName: '清新脱俗' },
    ),
    {
      id: 'performance-middle-reward',
      background: BACKGROUNDS.banquet,
      speakerIdentity: '内侍',
      speakerName: '内侍',
      portraitKey: 'taijian',
      narrationName: '清新脱俗',
      text: [
      '内侍随后捧来赏赐：在那之中，一柄玉拂尘吸引了你的主意。',
      '“陛下赏赐，沉姑娘收下吧。”',
      '你叩首谢恩。那拂尘入手温凉，御赐之物品质果然上乘。',
      '【获得赏赐】玉柄拂尘×1、银簪×2、棉布×1',
      ].join(PAGE_BREAK),
    },
  ],
  low: [
    narrationStep(
    'performance-low',
    BACKGROUNDS.banquet,
    [
      '你起身。指尖发凉。',
      '乐声起，你也跟着动了起来。舞姿并没有出错，每一步都算规矩，腰身也柔软，但总觉得少了些什么。像是临摹的字帖，形在，神散。你没能压住那鼓点的气势，有几处本该旋身扬袖的地方，你转得略有些局促，袖尾没能完全展开。',
      '席间的人看了几眼，便各自说笑起来。没有多少人在认真看你。',
      '你心里咯噔一下，但仍咬着牙将整支舞跳完了。落地时你微微躬身，额上冷汗涔涔。',
      '掌声稀稀落落的，带着敷衍。',
    ].join(PAGE_BREAK),
    { narrationName: '平平无奇' },
    ),
    narrationStep(
    'performance-low-eye',
    BACKGROUNDS.eye,
    [
      '皇帝的目光仍落在你身上。你不敢直视，却感觉得到那视线——平静、无波、始终没有移开。尽管那双深潭般的眼眸里什么都读不出来。',
    ].join(PAGE_BREAK),
    { narrationName: '平平无奇' },
    ),
    narrationStep(
    'performance-low-banquet-return',
    BACKGROUNDS.banquet,
    [
      '那位妃子的笑容淡了一瞬，随即又恢复如常，她温声道：“倒也算规矩。”',
      '皇帝嗯了一声。',
    ].join(PAGE_BREAK),
    { narrationName: '平平无奇' },
    ),
    {
      id: 'performance-low-reward',
      background: BACKGROUNDS.banquet,
      speakerIdentity: '内侍',
      speakerName: '内侍',
      portraitKey: 'taijian',
      narrationName: '平平无奇',
      text: [
      '内侍捧来赏赐：似乎是一对银簪，外加一匹素色棉布。',
      '“陛下赏，银簪一对，棉布一匹。”',
      '你叩首领赏。那银簪在灯下泛着银白的光，触手微凉。',
      '【获得赏赐】银簪×2、棉布×1',
      ].join(PAGE_BREAK),
    },
  ],
};

const normalizeAllocatedScorePart = (value: number, runtimeRatio: number): number => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue > 16 ? Math.round(safeValue / runtimeRatio) : Math.round(safeValue);
};

export const resolveYingluoyetingOpeningPerformanceTier = (
  stats: Partial<Record<'temperament' | 'talent', number>>,
): YingluoyetingOpeningPerformanceTier => {
  const temperamentPoints = normalizeAllocatedScorePart(Number(stats.temperament ?? 0), 100);
  const talentPoints = normalizeAllocatedScorePart(Number(stats.talent ?? 0), 10);
  const score = temperamentPoints + talentPoints;

  if (score <= 5) return 'low';
  if (score <= 10) return 'middle';
  return 'high';
};

const rewardCatalog = new Map(numericInventoryItems.map((item) => [item.itemId, item]));

const cloneRewardItem = (itemId: string): InventoryItem => {
  const item = rewardCatalog.get(itemId);
  if (!item) {
    throw new Error(`Missing yingluoyeting opening reward item "${itemId}".`);
  }
  const { pools: _pools, tags: _tags, ...inventoryItem } = item;
  return { ...inventoryItem, quantity: 1 };
};

export const buildYingluoyetingOpeningRewardBundle = (
  tier: YingluoyetingOpeningPerformanceTier,
): YingluoyetingOpeningReward[] => {
  const rewardIdsByTier: Record<YingluoyetingOpeningPerformanceTier, Array<[string, number]>> = {
    high: [
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.muttonFatJadeBracelet, 2],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.silkBrocade, 2],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.jadeHandledWhisk, 1],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.silverHairpin, 2],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.cottonCloth, 1],
    ],
    middle: [
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.jadeHandledWhisk, 1],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.silverHairpin, 2],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.cottonCloth, 1],
    ],
    low: [
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.silverHairpin, 2],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.cottonCloth, 1],
    ],
  };

  return rewardIdsByTier[tier].map(([itemId, quantity]) => ({
    item: cloneRewardItem(itemId),
    quantity,
  }));
};
