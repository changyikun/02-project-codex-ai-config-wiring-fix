import type { InventoryItem } from '../types';

export const INITIAL_PALACE_INVENTORY: readonly InventoryItem[] = [
  {
    itemId: 'embroidered-sachet',
    name: '缠枝香囊',
    category: 'gift',
    rarity: 'green',
    quantity: 2,
    price: 70,
    favorDelta: 5,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '绣样秀雅，最适合日常探望时送作人情。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'pine-wind-scroll',
    name: '松风小幅',
    category: 'gift',
    rarity: 'blue',
    quantity: 1,
    price: 140,
    favorDelta: 10,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '一卷清雅字画，落款不显，却胜在意趣干净，适合御前奉礼。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'imperial-delicacy',
    name: '御膳珍馐',
    category: 'food',
    rarity: 'green',
    quantity: 1,
    price: 60,
    favorDelta: 5,
    healthDelta: 20,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '太液池新送来的时令珍馐，送去总显得不失礼数。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'jade-ointment',
    name: '玉露花膏',
    category: 'medicine',
    rarity: 'blue',
    quantity: 1,
    price: 130,
    favorDelta: 10,
    healthDelta: 40,
    appearanceDelta: 10,
    temperamentDelta: 0,
    description: '润养身子的细膏，既可示好，也能让对方面色略有起色。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'cold-incense-pill',
    name: '冷香丸',
    category: 'rare',
    rarity: 'red',
    quantity: 1,
    price: 500,
    favorDelta: 20,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 100,
    description: '极稀罕的名贵香丸，用得好时，最能抬一抬气韵。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'beauty-pellet',
    name: '驻颜丹',
    category: 'rare',
    rarity: 'red',
    quantity: 1,
    price: 500,
    favorDelta: 20,
    healthDelta: 0,
    appearanceDelta: 100,
    temperamentDelta: 0,
    description: '入手难得的养颜丹药，多半只在极亲近时才舍得拿出来。',
    canSell: true,
    canRecycle: true,
  },
] as const;

export const cloneInitialInventory = (): InventoryItem[] => INITIAL_PALACE_INVENTORY.map((item) => ({ ...item }));

export interface DuNiangShopEntry extends InventoryItem {
  stock: number | null;
  isRareOffer?: boolean;
}

const KITCHEN_FOOD_ITEMS: readonly InventoryItem[] = [
  {
    itemId: 'osmanthus-milk-custard',
    name: '桂花酥酪',
    category: 'food',
    rarity: 'green',
    quantity: 1,
    price: 45,
    favorDelta: 3,
    healthDelta: 12,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '甜香清润，最适合顺手带回去垫垫胃口。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'lotus-seed-soup',
    name: '莲子银耳羹',
    category: 'food',
    rarity: 'green',
    quantity: 1,
    price: 58,
    favorDelta: 4,
    healthDelta: 18,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '清甜温养，宫里人常拿它做一份不失礼数的小心意。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'jade-shrimp-dumpling',
    name: '水晶虾饺',
    category: 'food',
    rarity: 'blue',
    quantity: 1,
    price: 76,
    favorDelta: 5,
    healthDelta: 16,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '皮薄馅鲜，若趁热送去，总显得你待人更周到些。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'eight-treasure-duck',
    name: '八宝鸭',
    category: 'food',
    rarity: 'blue',
    quantity: 1,
    price: 96,
    favorDelta: 6,
    healthDelta: 24,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '膳房压轴的大菜，拿去做人情最体面，也最费银子。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'snow-pear-broth',
    name: '雪梨燕窝盏',
    category: 'food',
    rarity: 'purple',
    quantity: 1,
    price: 128,
    favorDelta: 8,
    healthDelta: 30,
    appearanceDelta: 6,
    temperamentDelta: 0,
    description: '清润养身，既能补气色，也适合拿去做一份细致人情。',
    canSell: true,
    canRecycle: true,
  },
] as const;

const DU_NIANG_ALWAYS_AVAILABLE_ITEMS: readonly InventoryItem[] = [
  {
    itemId: 'embroidered-sachet',
    name: '缠枝香囊',
    category: 'gift',
    rarity: 'green',
    quantity: 1,
    price: 70,
    favorDelta: 5,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '绿色绣品，最适合日常探望时送作人情。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'brocade-handkerchief',
    name: '霁月绣帕',
    category: 'gift',
    rarity: 'blue',
    quantity: 1,
    price: 130,
    favorDelta: 10,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '蓝色绣品，针脚细密，适合拿去做顺水人情。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'plum-blossom-scroll',
    name: '寒梅小轴',
    category: 'gift',
    rarity: 'blue',
    quantity: 1,
    price: 150,
    favorDelta: 10,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '蓝色字画，寒梅一枝，胜在风骨清简，拿到御前也不显俗气。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'running-script-copybook',
    name: '行草小帖',
    category: 'gift',
    rarity: 'purple',
    quantity: 1,
    price: 260,
    favorDelta: 14,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '紫色字帖，笔意藏锋，懂书法的人看了会多留一眼。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'imperial-delicacy',
    name: '御膳珍馐',
    category: 'food',
    rarity: 'green',
    quantity: 1,
    price: 60,
    favorDelta: 5,
    healthDelta: 20,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '时令珍馐，既能补一补身子，也适合送去做人情。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'jade-ointment',
    name: '玉露花膏',
    category: 'medicine',
    rarity: 'blue',
    quantity: 1,
    price: 130,
    favorDelta: 10,
    healthDelta: 40,
    appearanceDelta: 10,
    temperamentDelta: 0,
    description: '蓝色补品，细膏润养，既可示好，也能让气色更好。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'linglong-rouge',
    name: '玲珑胭脂',
    category: 'gift',
    rarity: 'green',
    quantity: 1,
    price: 90,
    favorDelta: 6,
    healthDelta: 0,
    appearanceDelta: 12,
    temperamentDelta: 0,
    description: '常见的细盒胭脂，既能自己留用，也适合顺手送礼。',
    canSell: true,
    canRecycle: true,
  },
] as const;

const YETING_POISON_ITEMS: readonly InventoryItem[] = [
  {
    itemId: 'hedandinghong',
    name: '鹤顶红',
    category: 'medicine',
    rarity: 'red',
    quantity: 1,
    price: 500,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '剧毒之物，宫斗事务里若真要下手，往往先从它起念。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'shexiang',
    name: '麝香',
    category: 'medicine',
    rarity: 'purple',
    quantity: 1,
    price: 250,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '气味极重，若被人追查起来，痕迹也最难彻底抹净。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'yunyandan',
    name: '陨颜丹',
    category: 'medicine',
    rarity: 'purple',
    quantity: 1,
    price: 150,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '药性阴狠，常被拿来针对容貌与气质。',
    canSell: true,
    canRecycle: true,
  },
] as const;

const DU_NIANG_RARE_POOL: readonly InventoryItem[] = [
  {
    itemId: 'cold-incense-pill',
    name: '冷香丸',
    category: 'rare',
    rarity: 'red',
    quantity: 1,
    price: 500,
    favorDelta: 20,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 100,
    description: '稀有香丸，可大幅抬升气韵。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'beauty-pellet',
    name: '驻颜丹',
    category: 'rare',
    rarity: 'red',
    quantity: 1,
    price: 500,
    favorDelta: 20,
    healthDelta: 0,
    appearanceDelta: 100,
    temperamentDelta: 0,
    description: '稀有养颜丹药，可显著提升容貌。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'longevity-pill',
    name: '延寿丹',
    category: 'rare',
    rarity: 'red',
    quantity: 1,
    price: 500,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '只在极少数时候现身的丹药，传闻可延寿数载。',
    canSell: true,
    canRecycle: true,
  },
  {
    itemId: 'chanmeng-incense',
    name: '缠梦香',
    category: 'rare',
    rarity: 'red',
    quantity: 1,
    price: 1000,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '极罕见的暗香，送与目标后，往往会牵出更阴的后果。',
    canSell: true,
    canRecycle: true,
  },
] as const;

const MUSIC_SCORE_LIBRARY: readonly InventoryItem[] = [
  {
    id: 'score-phoenix-return',
    itemId: 'score-phoenix-return',
    name: '凤归云阙谱',
    color: 'red',
    category: 'music-score',
    rarity: 'red',
    quantity: 1,
    price: 0,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '红色曲谱，转调繁复，若在宫宴上演成，最易压住满堂杂音。',
    canSell: false,
    canRecycle: false,
  },
  {
    id: 'score-spring-river',
    itemId: 'score-spring-river',
    name: '春江引谱',
    color: 'purple',
    category: 'music-score',
    rarity: 'purple',
    quantity: 1,
    price: 0,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '紫色曲谱，曲意清润绵长，适合在妙音堂试一试气口与层次。',
    canSell: false,
    canRecycle: false,
  },
  {
    id: 'score-mist-pavilion',
    itemId: 'score-mist-pavilion',
    name: '烟水长亭谱',
    color: 'purple',
    category: 'music-score',
    rarity: 'purple',
    quantity: 1,
    price: 0,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '紫色曲谱，旋律温缓，最见行腔细腻处的分寸。',
    canSell: false,
    canRecycle: false,
  },
  {
    id: 'score-cinnabar-dream',
    itemId: 'score-cinnabar-dream',
    name: '朱弦入梦谱',
    color: 'red',
    category: 'music-score',
    rarity: 'red',
    quantity: 1,
    price: 0,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '红色曲谱，板眼华丽，最适合做压轴之用。',
    canSell: false,
    canRecycle: false,
  },
  {
    id: 'score-moon-on-paulownia',
    itemId: 'score-moon-on-paulownia',
    name: '桐月流辉谱',
    color: 'purple',
    category: 'music-score',
    rarity: 'purple',
    quantity: 1,
    price: 0,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '紫色曲谱，音色冷净，最重收放与留白。',
    canSell: false,
    canRecycle: false,
  },
  {
    id: 'score-vermilion-feathers',
    itemId: 'score-vermilion-feathers',
    name: '丹羽朝仪谱',
    color: 'red',
    category: 'music-score',
    rarity: 'red',
    quantity: 1,
    price: 0,
    favorDelta: 0,
    healthDelta: 0,
    appearanceDelta: 0,
    temperamentDelta: 0,
    description: '红色曲谱，起势明艳，若唱得稳，最容易教人一眼记住。',
    canSell: false,
    canRecycle: false,
  },
] as const;

const hashSeed = (seed: string): number =>
  seed.split('').reduce((accumulator, char, index) => accumulator + char.charCodeAt(0) * (index + 17), 0);

const DU_NIANG_RARE_SHELF_LIMIT = 2;
const YETING_POISON_ITEM_IDS = ['yunyandan', 'shexiang', 'hedandinghong'] as const;
const YETING_POISON_ITEM_ID_BY_NAME: Record<string, (typeof YETING_POISON_ITEM_IDS)[number]> = {
  陨颜丹: 'yunyandan',
  麝香: 'shexiang',
  鹤顶红: 'hedandinghong',
};

const resolveRareOfferStock = (seed: string, itemId: string): number => {
  const hash = hashSeed(`${seed}:${itemId}`);
  if (hash % 100 >= 40) {
    return 0;
  }
  return hash % 2 === 0 ? 1 : 2;
};

export const buildDuNiangShopCatalog = (seed: string): DuNiangShopEntry[] => {
  const alwaysAvailableEntries = DU_NIANG_ALWAYS_AVAILABLE_ITEMS.map((item) => ({
    ...item,
    stock: null,
  }));
  const rareTargetCount = hashSeed(`${seed}:rare-target`) % (DU_NIANG_RARE_SHELF_LIMIT + 1);
  const rareEntries = DU_NIANG_RARE_POOL.map((item) => ({
    ...item,
    stock: resolveRareOfferStock(seed, item.itemId),
    isRareOffer: true,
  }))
    .filter((item) => item.stock > 0)
    .sort(
      (left, right) =>
        hashSeed(`${seed}:${left.itemId}:slot`) - hashSeed(`${seed}:${right.itemId}:slot`),
    )
    .slice(0, rareTargetCount);

  return [...alwaysAvailableEntries, ...rareEntries];
};

export const getInventoryRecyclePrice = (item: InventoryItem): number => {
  if (typeof item.recyclePriceOverride === 'number') {
    return Math.max(0, Math.floor(item.recyclePriceOverride));
  }

  return Math.max(0, Math.floor(item.price * 0.8));
};

export const buildKitchenFoodCatalog = (): InventoryItem[] =>
  KITCHEN_FOOD_ITEMS.map((item) => ({
    ...item,
  }));

export const buildYetingPoisonCatalog = (): InventoryItem[] =>
  YETING_POISON_ITEMS.filter((item) =>
    YETING_POISON_ITEM_IDS.includes(item.itemId as (typeof YETING_POISON_ITEM_IDS)[number]),
  ).map((item) => ({
    ...item,
    quantity: 1,
  }));

export const getPoisonInventoryItemIdByName = (poisonName: string): string | undefined =>
  YETING_POISON_ITEM_ID_BY_NAME[poisonName];

export const isPoisonInventoryItem = (item: InventoryItem): boolean =>
  YETING_POISON_ITEM_IDS.includes(item.itemId as (typeof YETING_POISON_ITEM_IDS)[number]);

export const isMusicScoreItem = (item: InventoryItem): boolean => item.category === 'music-score';

export const buildMusicScoreItem = (itemId: string): InventoryItem | null => {
  const template = MUSIC_SCORE_LIBRARY.find((item) => item.itemId === itemId);
  return template ? { ...template } : null;
};

export const buildRandomMusicScoreItem = (seed: string): InventoryItem => {
  const template = MUSIC_SCORE_LIBRARY[hashSeed(seed) % MUSIC_SCORE_LIBRARY.length];
  return { ...template };
};

export const buildMusicScoreRewardBundle = (seed: string, quantity: number): InventoryItem[] =>
  Array.from({ length: Math.max(1, quantity) }, (_, index) => buildRandomMusicScoreItem(`${seed}:${index}`));
