import type { AttributeField, ResourceMappingEntry } from '../types';
import { LOCATION_NAME_LIST } from '../../config/locations';
import { numericAttributeFields } from '../numerics/numericCatalog';

export const resourceMappings: ResourceMappingEntry[] = [
  {
    slot: '主菜单背景',
    source: 'picture/background/首页点击图.png',
    runtime: '/assets/ui/main-menu.png',
    note: '主菜单风格参考与背景底图',
  },
  {
    slot: '路线选择背景',
    source: 'picture/background/开局路线选择图.png',
    runtime: '/assets/ui/menu-route.png',
    note: '路线列表布局参考',
  },
  {
    slot: '属性加点背景',
    source: 'picture/background/开局属性加点.png',
    runtime: '/assets/ui/attribute-ui.png',
    note: '属性加点页对齐参考',
  },
  {
    slot: '寝殿活动背景',
    source: 'picture/background/寝殿活动界面.png',
    runtime: '/assets/ui/bedchamber-ui.png',
    note: '寝殿活动页对齐参考',
  },
  {
    slot: '皇宫地图背景',
    source: 'picture/background/大地图.png',
    runtime: '/assets/ui/palace-map.png',
    note: '大地图交互底图',
  },
];

export const routeOptions = [
  { id: 'lanyinxuguo', label: '兰因絮果', enabled: true },
  { id: 'fushengrumeng', label: '浮生如梦', enabled: true },
  { id: 'yingluoyeting', label: '影落掖庭', enabled: true },
  { id: 'chenyuansucuo', label: '尘缘夙错', enabled: true },
  { id: 'coming-soon', label: '未完待续', enabled: false },
] as const;

export const attributeFields: AttributeField[] = numericAttributeFields.map(({ runtimeMultiplier: _runtimeMultiplier, category: _category, ...field }) => ({
  ...field,
  note: field.note,
}));

export const mapAreas = LOCATION_NAME_LIST;

export const bedchamberActivities = [
  '练习音律',
  '训练舞技',
  '研读诗书',
  '女红刺绣',
  '请平安脉',
  '殿内休息',
  '离开寝居',
] as const;
