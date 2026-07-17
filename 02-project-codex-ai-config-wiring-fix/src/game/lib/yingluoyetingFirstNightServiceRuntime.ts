import { resolvePlayerSurname } from './playerNameRuntime';

export const YINGLUOYETING_FIRST_NIGHT_SERVICE_SCRIPT_ID = 'yingluoyeting-first-night-service' as const;

type FirstNightPortraitKey = 'jiaojiao' | 'taijian' | 'emperor';

export interface YingluoyetingFirstNightServiceStep {
  id: string;
  background: string;
  speakerIdentity: string;
  speakerName: string;
  narrationName?: string;
  portraitKey?: FirstNightPortraitKey;
  text: string;
  transition?: 'black';
  autoAdvanceMs?: number;
  completesStory?: boolean;
}

interface BuildFirstNightServiceStepsInput {
  playerName: string;
  rankLabel: string;
  age: number;
}

const BACKGROUNDS = {
  chamberNight: '/assets/routes/home/home_yeting_night%20till%20latenight.png',
  palaceRoadNight: '/assets/routes/backgrounds/hougong_outside_night.png',
  encounterGuard: '/assets/routes/backgrounds/encounter_guard.png',
  yangxinOutsideNight: '/assets/routes/backgrounds/yangxindian_outside_night.png',
  yangxinInsideNight: '/assets/routes/backgrounds/yangxindian_inside_night.png',
  shiqin: '/assets/routes/backgrounds/shiqin.png',
  shiqinFirst: '/assets/routes/backgrounds/shiqin_first.png',
} as const;

const PAGE_BREAK = '\n<<PAGE_BREAK>>\n';
const NARRATION_IDENTITY = '场景旁白';

const text = (lines: readonly string[]): string => lines.join(PAGE_BREAK);

const narrationStep = (
  id: string,
  background: string,
  lines: readonly string[],
  extra: Partial<YingluoyetingFirstNightServiceStep> = {},
): YingluoyetingFirstNightServiceStep => ({
  id,
  background,
  speakerIdentity: NARRATION_IDENTITY,
  speakerName: extra.narrationName ?? '寝殿夜晚',
  narrationName: extra.narrationName ?? '寝殿夜晚',
  text: text(lines),
  ...extra,
});

const spokenStep = (
  id: string,
  background: string,
  speakerName: string,
  portraitKey: FirstNightPortraitKey,
  lines: readonly string[],
  extra: Partial<YingluoyetingFirstNightServiceStep> = {},
): YingluoyetingFirstNightServiceStep => ({
  id,
  background,
  speakerIdentity: speakerName,
  speakerName,
  portraitKey,
  text: text(lines),
  ...extra,
});

export const formatChineseAge = (age: number): string => {
  const normalized = Math.max(0, Math.floor(Number.isFinite(age) ? age : 0));
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (normalized < 10) {
    return digits[normalized] ?? String(normalized);
  }
  if (normalized < 20) {
    return normalized === 10 ? '十' : `十${digits[normalized % 10]}`;
  }
  if (normalized < 100) {
    const tens = Math.floor(normalized / 10);
    const ones = normalized % 10;
    return `${digits[tens]}十${ones > 0 ? digits[ones] : ''}`;
  }
  return String(normalized);
};

export const buildYingluoyetingFirstNightServiceSteps = ({
  playerName,
  rankLabel,
  age,
}: BuildFirstNightServiceStepsInput): YingluoyetingFirstNightServiceStep[] => {
  const playerSurname = resolvePlayerSurname(playerName, '沉');
  const formalName = `${rankLabel}${playerName}`;
  const surnameTitle = `${playerSurname}小主`;
  const chineseAge = formatChineseAge(age);

  return [
    spokenStep('summon-jiaojiao-arrives', BACKGROUNDS.chamberNight, '娇娇', 'jiaojiao', [
      '"主子！主子！养心殿来人了！"娇娇几乎是小跑着进来的，双螺髻上的绒花都跟着颤。',
      '你回过头，看见她身后站着一个穿石青色袍子的小太监，垂手立在门外。',
    ]),
    spokenStep('summon-eunuch-edict', BACKGROUNDS.chamberNight, '内侍', 'taijian', [
      `那小太监进了屋，行了个礼，开口道："陛下口谕，宣${formalName}今夜往养心殿侍寝。"说完也不多留，又行了个礼便退了出去。`,
    ]),
    spokenStep('summon-jiaojiao-congratulates', BACKGROUNDS.chamberNight, '娇娇', 'jiaojiao', [
      '"主子！这是天大的好事啊！"娇娇一叠声地恭喜。',
      '"宫宴才过了一日，陛下就召您侍寝！奴婢就说主子不是寻常人！"她说着，去衣柜前翻找起来，嘴里还在念叨："得换身好衣裳，头发也得重新梳，香……对，得熏香——"',
    ]),
    narrationStep('summon-player-still', BACKGROUNDS.chamberNight, [
      '你坐在原处没动。手搁在膝上，指尖微凉。娇娇的欢喜隔了一层纱，模模糊糊的，落不到实处。你垂着眼，看着自己搭在膝头的那双手。',
      '侍寝。皇帝召你侍寝。宫宴那夜，你跪伏在地，他轻描淡写的一句"倒是个美人胚子"，怎么就变成了今夜的口谕？',
    ]),
    spokenStep('summon-jiaojiao-dresses-player', BACKGROUNDS.chamberNight, '娇娇', 'jiaojiao', [
      '"主子？"娇娇抱着一件月白色的襦裙回来了，见你还愣在原地，歪了歪脑袋，"您怎么不高兴呀？"你抬起头看她。十三四岁的小丫头，笑得眉毛弯弯的，两只眼睛亮晶晶地望着你。',
      '你张了张口，想说什么，最终只是扯了扯嘴角："高兴。"娇娇显然不信，但也没追问，只是把那件襦裙抖开在你面前比了比："奴婢觉得这件好，配您的肤色。主子先净面，奴婢去烧水。"',
      '接下来的小半个时辰，娇娇忙得脚不沾地。她替你净了面，上了薄薄一层妆粉，又拆了白日里的简单发髻重新梳过——发间别了一支银簪，是从赏赐里挑出来的。你由着她摆弄，看向铜镜里映出的脸。妆容淡得几乎看不出，但眉眼间多了几分颜色。',
      '"好了！"娇娇退后两步，上下打量你一番，满意地拍了拍手，"主子真好看。"你站起身，月白色的襦裙垂到脚面，裙摆绣着几枝淡蓝色的忍冬花，随着动作微微摇晃。',
      '娇娇凑过来，往你衣领边轻轻按了按，嘀咕道："就是没有好香料……奴婢找了半天，只找着一小盒，熏了一点在帕子上，主子揣袖子里，凑合着用。"你接过那方帕子，鼻尖掠过一缕清淡的香。',
      '"时辰差不多了。"你说。娇娇点头，又忍不住叮嘱了一句："主子到了养心殿，凡事别慌，陛下问什么答什么就成。奴婢在这儿等您回来！"她说这话时攥着你的袖角，手指头使了点劲儿。你低头看了她一眼，轻轻拍了拍她的手背："知道了。"',
    ]),
    narrationStep('summon-door', BACKGROUNDS.chamberNight, ['门外果然已经候着人了。']),
    spokenStep('summon-guide-eunuch', BACKGROUNDS.chamberNight, '内侍', 'taijian', [
      `引路的太监提着一盏羊角灯，见你出来便躬身道了句"${surnameTitle}请"。你跟在他身后，踏出了储秀宫的院门。`,
    ]),
    narrationStep('palace-road-night', BACKGROUNDS.palaceRoadNight, [
      '夜风迎面扑来，这个时节的风带着料峭的凉意，你微微缩了缩肩。头顶那弯薄月被云丝缠着，光线时有时无地洒在宫道的青石砖上。',
      '宫道很长。两侧的红墙在夜色里暗成了近乎黑色的沉赭，墙头的琉璃瓦反着一点月光，如同一排沉默的牙齿。',
      '你跟着那盏羊角灯往前走，灯影在脚边晃来晃去，你的影子被拉得很长，又很短，长了，又短了。四周安静极了，只有两个人的脚步声交替着落在石板上。',
      '拐过月洞门，前方的长廊里忽然传来两个女子的笑声，压得低低的，却在空旷的夜里格外清晰。',
      '"……你没瞧见他那张脸，冷得能冻死人！我跟他请安，他就那么\'嗯\'一声，连眼皮都不抬一下——"',
      '"那是御前的人，你还指望人家对你笑？谢大人那脾气，怕是看谁都跟看柱子似的。"',
      '"那也是整座宫里头最好看的柱子！"',
      '两人咯咯笑成一团。',
      '宫灯晃了一下。引路太监清了清嗓子，脚步声在石板上响亮了几分。那两个宫女的笑声戛然而止——转角处冒出两张慌乱的脸，待看清了太监提灯引路、你跟在后头的架势，双双变了脸色，齐齐蹲身行礼："奴婢给小主请安——"',
      '你微微颔首，没有停步。太监鼻子里哼了一声，径直走了过去。身后传来两人如释重负的声音，然后是急促的脚步跑远了。',
      '谢大人。你在心里默念了一遍，没有多想。',
      '过了月洞门，宫道豁然开阔。两侧的宫灯换成了连排的八角琉璃灯，比先前明亮了几倍，整条甬道照得通透。脚下的青石砖也换成了更细密的方砖，走上去没有一点声响。越靠近养心殿，一切都变得更安静、更规整，连空气里都带着一股肃穆的味道。',
      '前方拐角处传来齐整的靴底声。',
      '一队巡夜的侍卫从拐角转出来。四人成列，步伐整齐，腰间佩刀的刀鞘随步伐轻轻晃动。',
      '夜色里看不太清面目，但为首那人——你的目光几乎是本能地被牵了过去。',
      '他比身后的人高出小半个头，一身白色劲装在月光底下泛着清冷的银光，衣料上隐约可见蓝色的纹路蜿蜒攀附，鱼龙翻腾，鳞片与浪花交缠，肩甲与腰封上的银质扣件在石灯笼的光里一闪一闪。黑发束得极高，发尾从玄色冠带里倾泻而下。',
      '引路太监侧了侧身，贴着廊柱让出路中间，你也跟着退到一侧。',
      '两拨人擦肩而过的瞬间，他从你左侧经过，距离不过三尺。那一瞬间你看清了他的侧脸——',
    ]),
    narrationStep('encounter-guard', BACKGROUNDS.encounterGuard, [
      '极年轻的一张脸，却绷得很紧，嘴唇抿成一条平直的线。',
      '对方的目光扫过来，先落在引路太监身上，又掠过你——不过一瞬他便收回了视线，步伐未有丝毫停顿地继续向前。',
      '你侧头望了一眼他的背影。白色劲装上的鱼龙纹在月光下游动，很快便被尽头的阴影吞没了。',
      '"小主，快跟上。"引路太监的声音从前头传来，带着一点催促。你回过头，加快了脚步。那个白衣侍卫的面孔在脑海里停留了一瞬，便被你按下去了。今夜有更要紧的事。',
    ]),
    narrationStep('yangxin-outside', BACKGROUNDS.yangxinOutsideNight, [
      `养心殿到了。殿前的台阶很宽，一级一级铺着汉白玉，在夜色里泛着冷白的光。两侧各立着四名侍卫，纹丝不动，和廊柱融为一体。门口还候着两个内侍，见引路太监过来，其中一个迎上前低声说了几句，引路太监便退到一旁，朝你微微躬身："${surnameTitle}，到了。"`,
      '你点了下头。那内侍便转身引你上了台阶。汉白玉的阶面，你一级一级走上去，目光落在面前那扇半掩的殿门上。门缝里透出暖融融的光，和外头清冷的月色截然不同。殿内飘出来一缕龙涎香的味道，混着暖意扑在你面上。',
      `"${formalName}，觐见——"内侍在门外通传了一声。片刻后，门内传来一个字："进。"`,
      '你深吸一口气，跨过了那道门槛。',
    ]),
    narrationStep('yangxin-inside', BACKGROUNDS.yangxinInsideNight, [
      '殿内比你想象中更暗。并非没有光——红烛燃着，宫灯也亮着，但那光被深色的木质墙壁与家具吞去了大半，只余下昏沉沉的暖意，裹挟着浓重的龙涎香，扑面压来。一架黄花梨的大屏风挡在正中，将殿内隔出前后两重空间，你站在屏风这一侧，什么人也没看见。',
      '引路太监在门外便止了步，身后的宫门被人从外面轻轻合上。殿内安静得只剩下烛芯偶尔炸裂的细响。',
      '"过来。"',
      '声音从屏风后传来。你攥了攥袖中的帕子，绕过屏风，往那个方向走去。',
    ], { narrationName: '养心殿' }),
    narrationStep('shiqin-before-emperor', BACKGROUNDS.shiqin, [
      '绕过屏风，视野骤然开阔了些。拔步床上，白色纱帐从床顶垂落，被烛光染成浅淡的橘。床前一只青铜香炉吐着细细的白烟。而窗边——一个人背对着你站在那里。',
      '月白色的寝衣，宽袍大袖，松松系着腰带。窗半开着，夜风从缝隙里灌进来，吹得烛火晃了一下。他一手负在身后，另一只手搭在窗框上，望着窗外。',
      '你在三步之外站定，提裙跪了下去。膝盖陷入厚实柔软的地毯。你垂首，额头几乎贴上手背。',
      `"臣妾${playerName}，参见陛下。"`,
      '安静了一息。衣料窸窣，靴底在地毯上碾过。那个人转过身来了。',
      '"起来吧。"',
      '一只手伸到了你面前。修长的手指，指腹有薄茧，袖口的月白丝缎在烛火下泛着温润的光。',
    ], { narrationName: '养心殿' }),
    narrationStep('shiqin-first', BACKGROUNDS.shiqinFirst, [
      '你抬起头。红烛的光从他身后映来，将他的轮廓勾出一道暖色的边。宫宴上隔得远，看不真切的面容，此刻近在咫尺。',
      '你借着那只手站起来。他的指尖掠过你腕上的玉镯边缘，随即松开了。他比你高出许多，站得这样近，龙涎香浓得几乎将人裹住。',
      '他的视线在你面上停了片刻，不急不缓地扫过，然后移开了。"坐吧。"他偏头朝窗边的一张紫檀小榻示意了一下。',
    ], { narrationName: '养心殿' }),
    spokenStep('shiqin-emperor-talk', BACKGROUNDS.shiqin, '容安', 'emperor', [
      '你依言走过去，在小榻边缘坐下。坐得很浅，脊背挺得笔直，两只手规规矩矩地叠放在膝上。纱衣在暗红的榻面上铺开一小片浅淡的颜色。',
      '殿内安静了一阵。红烛在角落里噼啪响了一声，火苗跳了跳。',
      '"紧张？"他忽然开口。你抬起头——他正看着你，微微笑着。',
      '你张了张嘴，想说"不紧张"，但觉得这话说出来未免太假。低下头，老实答了一句："有一些。"他笑了一声，没有追问。',
      '"昨日宫宴上那支舞，"他拿起茶盏，手指在扶手上轻轻点了两下，"跟谁学的？"',
      '你愣了一下，没想到他会问这个。"回陛下，是……臣妾幼时家中请了舞师，后来又跟着妙音堂的姑姑们练了些日子。',
      '他靠在椅背里，一只手支着下颌，半阖着眼。红烛的光映在他侧脸上，将那道鼻梁投下一道深浅分明的阴影。',
      '皇帝，天子。此刻坐在你对面的这个人，是掌着天下人生死的那个人。',
      '"你今年多大了？"他睁开眼。',
      `"回陛下，${chineseAge}。"`,
      '他点了点头，没说什么。又是一阵安静。你听见窗外夜风吹动树梢的沙沙声，远处更鼓沉闷地响了一下。',
      '"夜深了。"',
      '你攥紧了袖中的手，等着他下一句话。但他只是朝床的方向偏了偏头。"去睡吧。"',
      '你愣住了。去睡吧？你看了看他，又看了看那张铺着暗红锦被的拔步床。你不确定自己是不是听错了。',
      '"……陛下？"',
      '他已经走回了圈椅边，重新坐下，拿起桌上一卷折子翻开了。"朕还有些折子要看。"',
    ]),
    narrationStep('shiqin-sleep', BACKGROUNDS.shiqin, [
      '你站在原地，一时不知该动还是不该动。侍寝，不是这样的吧？掖庭的姑姑们虽然从未跟你细说过，但你多少听过那些含糊的暗示。那些故事里，从没有"你先睡，朕看折子"这一项。',
      '你站了几息，终于慢慢走向那张床。',
      '床铺很软。暗红色的锦被厚实而暖，你坐在床沿脱了绣鞋，弯腰将那双绣鞋齐齐摆在床沿下方。锦被掀开时带起一阵龙涎香，你皱了皱鼻尖。侧身躺下去，后脑陷进柔软的枕中，头顶是白纱帐的褶皱，被烛光映成浅金色。',
      '太软了。枕头太软，被子太厚，连空气都是暖的。你在掖庭睡了那么久的硬板床和薄被，此刻整个人陷在这一团绵软里，反而浑身不自在。',
      '你侧过身去，白纱帐垂在眼前，薄薄一层，透过去能看见外头的烛光。那人坐在圈椅里，折子摊在膝上，一只手执着朱笔，偶尔落下一笔批注。',
      '朱笔触纸的声音很轻。沙沙，沙沙。间或是翻页时纸张窸窣的响动。你盯着纱帐上那团模糊的人影，一动不敢动。后背僵直得一块木板。',
      '你想不通。册封当日便召侍寝，到了却只让你睡觉。他看折子，你躺在他的床上——这算什么？你在掖庭时听过各种各样的传闻，那些关于帝王夜幸的隐晦说法，没有一条跟眼下的情形对得上。',
      '但你不敢问。你甚至不敢翻身翻得太大声。于是就这么僵着，听那沙沙的落笔声，一下，又一下。红烛烧了许久，烛泪顺着烛台淌下去，凝成一小滩。你看着那滩烛泪的影子映在纱帐上，慢慢变大，慢慢凝住。',
      '不知过了多久。你的眼皮开始发沉。短短几日发生了太多事情，你的身体早就疲透了。只是方才那根弦绷得太紧，此刻松下来，困意便一层一层地漫上来。',
      '翻折子的声音还在继续。沙沙。沙沙。那声音不知怎的，听久了竟有一种奇异的安稳感。你恍惚想起小时候在书房里，父亲坐在灯下批阅公文，你趴在一旁的矮榻上，听着笔尖触纸的声音，不知不觉就睡着了。',
      '你眨了眨眼。纱帐上那团人影变得模糊起来，轮廓在视野里一晃一晃的。你努力睁了一下眼，又合上。再睁开时，那人影换了个姿势——偏过了头，朝你这边看了一眼。但你已经看不清了。',
      '迷迷糊糊间，你听见椅子轻响了一声。脚步声，很轻，从圈椅的方向走到了门边。然后是极低的说话声——你听不清内容。',
      '片刻后，殿内的光暗了下去。有人在灭灯。一盏，两盏，三盏。那些宫灯一盏接一盏地熄了，最后只剩下床头一盏小小的红烛还亮着，火苗矮矮地跳动。',
      '你的意识已经散得七七八八了。眼皮重得抬不起来，身体沉在柔软的被褥里，暖意从四面八方裹上来。最后的清醒里，你隐约感觉到有什么东西轻轻碰了碰你的眉心。顺着眉骨，缓慢地描过去。那触碰轻得没有重量，从眉心到眉尾，从眉尾到鬓角，在鬓角停了一瞬。然后收回去了。',
      '你睡着了。在皇帝的寝殿里，在龙涎香浓厚的气味中，在翻折子的沙沙声中。你睡得很沉，没有做梦。',
    ], { narrationName: '养心殿' }),
    narrationStep('first-night-fade-to-morning', BACKGROUNDS.shiqin, [], {
      narrationName: '一夜过去',
      transition: 'black',
      autoAdvanceMs: 3600,
      completesStory: true,
    }),
  ];
};
