// 统一地点库：后续如需增删改地点，只需要维护这个数组。
const LOCATION_LIST = [
  '北化北区',
  '北化东区',
  '北化西区',
  '昌平西山口',
  '乐多港万达',
  '昌平悦荟',
  '昌平区医院',
  '昌平北站',
  '南口镇',
  '首都机场',
  '大兴机场',
  '北京南站',
  '北京西站',
  '北京站',
  '北京朝阳站',
  '北京丰台站',
  '清河站/北京北站'
]

const LOCATION_ALIAS_MAP = {
  北化昌平校区: '北化北区',
  西山口地铁站: '昌平西山口'
}

function getLocations() {
  return LOCATION_LIST.slice()
}

function getLocationFilterOptions() {
  return ['全部', ...LOCATION_LIST]
}

function normalizeLocationName(name) {
  const normalizedName = LOCATION_ALIAS_MAP[name] || name
  return normalizedName
}

module.exports = {
  getLocations,
  getLocationFilterOptions,
  normalizeLocationName
}
