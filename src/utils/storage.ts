import { LotteryData, FavoriteGroup, Settings, SavedVerification } from '@/types';

const DB_NAME = 'LotteryAnalyzer';
const DB_VERSION = 1;
const HISTORY_STORE = 'history';

// IndexedDB初始化
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'period' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
  
  return dbPromise;
}

// 历史记录操作
export async function saveHistoryData(data: LotteryData[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE);
  
  for (const item of data) {
    store.put(item);
  }
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHistoryData(): Promise<LotteryData[]> {
  const db = await getDB();
  const tx = db.transaction(HISTORY_STORE, 'readonly');
  const store = tx.objectStore(HISTORY_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const data = request.result as LotteryData[];
      // 按期数降序排列
      data.sort((a, b) => b.period - a.period);
      resolve(data);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearHistoryData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteHistoryItem(period: number): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(HISTORY_STORE, 'readwrite');
  const store = tx.objectStore(HISTORY_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(period);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 收藏管理 (localStorage)
const FAVORITES_KEY = 'lottery_favorites';

export function getFavoriteGroups(): FavoriteGroup[] {
  const data = localStorage.getItem(FAVORITES_KEY);
  if (!data) {
    // 创建默认分组
    const defaultGroup: FavoriteGroup = {
      id: 'default',
      name: '常用',
      formulas: [],
      createdAt: Date.now(),
    };
    saveFavoriteGroups([defaultGroup]);
    return [defaultGroup];
  }
  return JSON.parse(data);
}

export function saveFavoriteGroups(groups: FavoriteGroup[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(groups));
}

export function addFavoriteGroup(name: string): FavoriteGroup {
  const groups = getFavoriteGroups();
  const newGroup: FavoriteGroup = {
    id: `g_${Date.now()}`,
    name,
    formulas: [],
    createdAt: Date.now(),
  };
  groups.push(newGroup);
  saveFavoriteGroups(groups);
  return newGroup;
}

export function deleteFavoriteGroup(id: string): void {
  const groups = getFavoriteGroups().filter(g => g.id !== id);
  saveFavoriteGroups(groups);
}

export function addFormulaToGroup(groupId: string, formula: string): void {
  const groups = getFavoriteGroups();
  const group = groups.find(g => g.id === groupId);
  if (group && !group.formulas.includes(formula)) {
    group.formulas.push(formula);
    saveFavoriteGroups(groups);
  }
}

export function removeFormulaFromGroup(groupId: string, formula: string): void {
  const groups = getFavoriteGroups();
  const group = groups.find(g => g.id === groupId);
  if (group) {
    group.formulas = group.formulas.filter(f => f !== formula);
    saveFavoriteGroups(groups);
  }
}

// 设置管理 (localStorage)
const SETTINGS_KEY = 'lottery_settings';

const DEFAULT_SETTINGS: Settings = {
  offset: 0,
  periods: 15,
  leftExpand: 0,
  rightExpand: 0,
  targetPeriod: null,  // null表示验证最新一期
  zodiacYear: 7,      // 默认马年（7=马），用户可手动更改
  searchOffset: 0,
  searchPeriods: 15,
  searchLeft: 0,
  searchRight: 0,
};

export function getSettings(): Settings {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
}

export function saveSettings(settings: Partial<Settings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// 解析导入的历史数据
// 支持多种格式：
// 格式1: 期数,号码1,号码2,号码3,号码4,号码5,号码6,号码7
// 格式2: 期数 号码1 号码2 号码3 号码4 号码5 号码6 号码7
// 格式3: 期数:号码1,号码2,号码3,号码4,号码5,号码6,号码7
// 格式4: 期数;号码1;号码2;号码3;号码4;号码5;号码6;号码7
// 格式5: 期数|号码1|号码2|号码3|号码4|号码5|号码6|号码7
export function parseHistoryInput(input: string, currentZodiacYear?: number): LotteryData[] {
  const lines = input.trim().split('\n');
  const data: LotteryData[] = [];
  const seen = new Set<number>();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 先尝试匹配格式3/4/5（冒号/分号/竖线分隔）
    let parts: string[] = [];
    
    if (trimmed.includes(':')) {
      // 格式3: 期数:号码1,号码2...
      const [periodPart, numbersPart] = trimmed.split(':', 2);
      if (periodPart && numbersPart) {
        const numbers = numbersPart.split(/[,;|]/).map(n => n.trim()).filter(n => n);
        parts = [periodPart.trim(), ...numbers];
      }
    } else if (trimmed.includes(';')) {
      // 格式4: 期数;号码1;号码2...
      parts = trimmed.split(';').map(n => n.trim()).filter(n => n);
    } else if (trimmed.includes('|')) {
      // 格式5: 期数|号码1|号码2...
      parts = trimmed.split('|').map(n => n.trim()).filter(n => n);
    } else {
      // 格式1和2: 逗号或空格分隔
      parts = trimmed.split(/[,\s]+/).filter(n => n);
    }
    
    if (parts.length >= 8) {
      const period = parseInt(parts[0]);
      const numbers = parts.slice(1, 8).map(n => parseInt(n));
      
      // 验证数据
      if (
        !isNaN(period) &&
        numbers.length === 7 &&
        numbers.every(n => n >= 1 && n <= 49) &&
        new Set(numbers).size === 7 &&
        !seen.has(period)
      ) {
        seen.add(period);
        data.push({
          period,
          numbers,
          timestamp: Date.now(),
          zodiacYear: currentZodiacYear || getSettings().zodiacYear, // 使用传入的或当前设置的生肖年份
        });
      }
    }
  }
  
  // 按期数降序排列
  data.sort((a, b) => b.period - a.period);
  return data;
}

// 保存的验证记录管理
const SAVED_VERIFICATIONS_KEY = 'lottery_saved_verifications';

export function getSavedVerifications(): SavedVerification[] {
  const data = localStorage.getItem(SAVED_VERIFICATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveVerification(verification: SavedVerification): void {
  const current = getSavedVerifications();
  current.unshift(verification); // 新记录放前面
  localStorage.setItem(SAVED_VERIFICATIONS_KEY, JSON.stringify(current.slice(0, 50))); // 最多保存50条
}

export function deleteVerification(id: string): void {
  const current = getSavedVerifications();
  const filtered = current.filter(v => v.id !== id);
  localStorage.setItem(SAVED_VERIFICATIONS_KEY, JSON.stringify(filtered));
}

export function clearAllSavedVerifications(): void {
  localStorage.removeItem(SAVED_VERIFICATIONS_KEY);
}
