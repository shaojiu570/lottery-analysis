// 开奖数据结构
export interface LotteryData {
  period: number;          // 期数（主键）
  numbers: number[];       // 7个号码（落球顺序）
  timestamp: number;       // 时间戳
}

// 公式结构
export interface Formula {
  id: string;
  expression: string;      // 原始公式表达式
  rule: 'D' | 'L';        // D=排序 L=落球
  resultType: ResultType;  // 结果类型
  offset: number;          // 补偿值
  periods: number;         // 验证期数
  leftExpand: number;      // 左扩展
  rightExpand: number;     // 右扩展
}

// 结果类型
export type ResultType = '尾数类' | '头数类' | '合数类' | '波色类' | '五行类' | '肖位类' | '单特类';

// 验证结果
export interface VerifyResult {
  formula: Formula;
  hits: boolean[];         // 每期命中情况
  hitCount: number;        // 命中次数
  totalPeriods: number;    // 总期数
  hitRate: number;         // 命中率
  results: string[];       // 结果集合
  periodResults: PeriodResult[]; // 每期详细结果
}

// 每期详细结果
export interface PeriodResult {
  period: number;
  result: number;          // 计算结果
  expandedResults: number[]; // 扩展后的结果
  targetValue: number;     // 目标值（特码对应的属性值）
  hit: boolean;
}

// 收藏分组
export interface FavoriteGroup {
  id: string;
  name: string;
  formulas: string[];      // 公式表达式列表
  createdAt: number;
}

// 设置
export interface Settings {
  offset: number;          // 补偿值
  periods: number;         // 验证期数
  leftExpand: number;      // 左扩展
  rightExpand: number;     // 右扩展
  searchOffset: number;    // 搜索补偿
  searchPeriods: number;   // 搜索期数
  searchLeft: number;      // 搜索左扩
  searchRight: number;     // 搜索右扩
}

// 搜索策略
export type SearchStrategy = 'fast' | 'standard' | 'deep';

// 搜索参数
export interface SearchParams {
  hitRate: number;         // 目标命中率
  count: number;           // 搜索数量
  strategy: SearchStrategy;
  resultTypes: ResultType[];
  offset: number;
  periods: number;
  leftExpand: number;
  rightExpand: number;
}

// 筛选条件
export interface FilterCondition {
  type: 'hitRate' | 'lastHit';
  operator?: '>' | '<' | '=' | 'range';
  value?: number;
  minValue?: number;
  maxValue?: number;
  lastHit?: boolean;       // true=上期命中, false=上期未命中
}
