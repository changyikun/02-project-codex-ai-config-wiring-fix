type ChamberActionNarrativeInput = {
  actionId: string;
  actionLabel: string;
  actionSummary: string;
  playerName?: string;
  residenceName: string;
  timeLabel: string;
};

type MapTransitionNarrativeInput =
  | {
      kind: 'enter-map';
      fromResidence: string;
    }
  | {
      kind: 'inspect-location';
      locationName: string;
      locationDescription?: string;
    }
  | {
      kind: 'enter-location';
      locationName: string;
    }
  | {
      kind: 'return-chamber';
      fromLocation?: string;
      residenceName: string;
    };

type XunTransitionNarrativeInput = {
  currentMonth: number;
  currentXun: number;
};

type LocationActionNarrativeInput = {
  locationId: 'kitchen' | 'tai-hospital' | 'miaoyin-hall' | 'baohua-hall';
  actionId: string;
  actionLabel: string;
  resultText?: string;
};

const chamberActionLead: Record<string, (input: ChamberActionNarrativeInput) => string> = {
  study: ({ residenceName, playerName }) =>
    `${residenceName}窗下灯影微明，${playerName ?? '你'}翻开案头旧卷，把今日要记的句读一一圈定。`,
  painting: ({ actionLabel, residenceName, playerName }) =>
    `${residenceName}里新磨的墨尚带清香，${playerName ?? '你'}拂开宣纸，提笔试水，砚边墨色渐浓，顺势做了一回${actionLabel}。`,
  music: ({ residenceName, playerName }) => `${residenceName}内琴弦轻响，${playerName ?? '你'}按着旧谱反复校音，半晌才让曲意稳住。`,
  embroidery: ({ residenceName, playerName }) =>
    `${residenceName}的绣架被移到光亮处，${playerName ?? '你'}拈针理线，将一段花样慢慢补齐。`,
  rest: ({ residenceName }) => `${residenceName}帘影低垂，娇娇替你撤下闲人，只留一盏温茶在榻边。`,
};

export function buildChamberActionNarrative(input: ChamberActionNarrativeInput): string {
  const lead =
    chamberActionLead[input.actionId]?.(input) ??
    `${input.residenceName}里短暂安静下来，${input.playerName ?? '你'}按下心绪，专心料理了${input.actionLabel}。`;
  return `${lead}${input.timeLabel}，${input.actionLabel}告一段落，${input.actionSummary}。`;
}

export function buildMapTransitionNarrative(input: MapTransitionNarrativeInput): string {
  switch (input.kind) {
    case 'enter-map':
      return `从${input.fromResidence}出殿时，廊下宫人纷纷避让。娇娇替你拢好披风，低声提醒：宫中各处都在眼前，只看娘娘今日想往哪里去。`;
    case 'inspect-location':
      return input.locationDescription
        ? `${input.locationName}近在眼前，${input.locationDescription}`
        : `${input.locationName}近在眼前，宫道上的声息也随之变得分明。`;
    case 'enter-location':
      return `行至${input.locationName}前，娇娇先一步打点通传。门内光影一换，${input.locationName}的场景已在眼前铺开。`;
    case 'return-chamber':
      return input.fromLocation
        ? `从${input.fromLocation}折返时天色已沉，你扶着娇娇的手回到${input.residenceName}，殿内茶炉还温着。`
        : `宫道绕过一重影壁，你扶着娇娇的手回到${input.residenceName}，殿内茶炉还温着。`;
    default: {
      const exhaustive: never = input;
      return exhaustive;
    }
  }
}

export function buildXunTransitionNarrative(input: XunTransitionNarrativeInput): string {
  return `${input.currentMonth}月${input.currentXun}旬将尽，宫门落钥，内侍沿廊传更。旧账合上，新一旬的风声也在夜里慢慢铺开。`;
}

const locationActionLead: Record<LocationActionNarrativeInput['locationId'], Record<string, string>> = {
  kitchen: {
    stroll: '御膳房里灶火正旺，蒸汽贴着梁柱往上走。你沿着食案与炊烟慢慢转过一圈，只听锅勺声把闲话都盖得半真半假。',
    buy: '掌膳宫人把食盒推到案边，热食香气一层层散开。银钱过手之后，食单上的名字也被仔细记下。',
    meet: '灶间热气里有人抬头望来，那一点生活气比宫墙外的风还鲜明。',
  },
  'tai-hospital': {
    stroll: '太医院药柜沉沉，脉案旁的铜炉吐着细烟。你放轻脚步穿过药廊，只让药香先替你探一探今日的风声。',
    consultation: '脉案前的医官低声论证，药方在纸上添删数回。你按下性子旁听，不越医者本分，只把药理脉络慢慢记牢。',
    meet: '药帘轻动，简宁从脉案后抬眼。他仍旧把分寸守得清楚，先问病症，再看人心。',
  },
  'miaoyin-hall': {
    listen: '妙音堂里丝竹初歇，余音却还停在帘影之间。你没有急着开口，只借这一曲把心绪一点点放平。',
    stroll: '曲廊转角处仍有余音未散，宫人抱着谱册来去。你缓步穿过帘下，像是在听曲，也像是在等谁回头。',
    'sign-up': '妙音堂的报名册摊在案上，司乐女官逐字核过曲名。你递上曲谱，只让乐理与分寸先替自己说话。',
    practice: '连翘把谱页压在琴案边，逐句替你拆开转调与气口。你按她所说反复试了几遍，才让曲意慢慢落稳。',
    meet: '半幅珠帘后有琴声收住，连翘抬眸时并不急着多言，只把余音留给你慢慢接住。',
  },
  'baohua-hall': {
    worship: '宝华殿香火极静，钟磬声落下后，连衣袖擦过蒲团都显得清楚。你俯身礼佛，把心事暂且压在香烟之后。',
    pray: '供灯一盏盏亮着，香火绕过佛前。你合掌祈福，只求这一念能落在该落的因果里。',
    stroll: '宝华殿回廊清冷，香灰落在铜炉边。你绕过供灯慢行，像是在避开俗声，也像是在看谁把心事带到了佛前。',
    meet: '供灯后有人静立，当一垂眼收住佛珠，话未出口，戒律与慈悲已经先横在中间。',
  },
};

export function buildLocationActionNarrative(input: LocationActionNarrativeInput): string {
  const locationLeads = locationActionLead[input.locationId];
  const lead =
    locationLeads[input.actionId] ??
    locationLeads.meet ??
    `${input.actionLabel}之后，场中声息慢慢落定。`;
  return input.resultText ? `${lead}${input.resultText}` : lead;
}
