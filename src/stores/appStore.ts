import { create } from 'zustand';
import { LotteryData, Settings, FavoriteGroup, VerifyResult, Formula } from '@/types';
import { 
  getSettings, 
  saveSettings, 
  getFavoriteGroups, 
  saveFavoriteGroups,
  addFavoriteGroup,
  deleteFavoriteGroup,
  addFormulaToGroup,
  removeFormulaFromGroup,
  getHistoryData,
  saveHistoryData,
  clearHistoryData,
  deleteHistoryItem
} from '@/utils/storage';

interface AppState {
  // 公式输入
  formulaInput: string;
  setFormulaInput: (value: string) => void;
  
  // 验证结果
  verifyResults: VerifyResult[];
  setVerifyResults: (results: VerifyResult[]) => void;
  
  // 历史数据
  historyData: LotteryData[];
  setHistoryData: (data: LotteryData[]) => void;
  loadHistoryData: () => Promise<void>;
  importHistoryData: (data: LotteryData[]) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  deleteHistoryItem: (period: number) => Promise<void>;
  
  // 收藏
  favoriteGroups: FavoriteGroup[];
  loadFavorites: () => void;
  addGroup: (name: string) => void;
  removeGroup: (id: string) => void;
  addToFavorites: (groupId: string, formula: string) => void;
  removeFromFavorites: (groupId: string, formula: string) => void;
  
  // 设置
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  
  // UI状态
  isVerifying: boolean;
  setIsVerifying: (value: boolean) => void;
  
  // 弹窗状态
  showFavorites: boolean;
  setShowFavorites: (value: boolean) => void;
  showSearch: boolean;
  setShowSearch: (value: boolean) => void;
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  
  // 最新期数
  latestPeriod: number;
  setLatestPeriod: (period: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // 公式输入
  formulaInput: '',
  setFormulaInput: (value) => set({ formulaInput: value }),
  
  // 验证结果
  verifyResults: [],
  setVerifyResults: (results) => set({ verifyResults: results }),
  
  // 历史数据
  historyData: [],
  setHistoryData: (data) => set({ historyData: data }),
  loadHistoryData: async () => {
    const data = await getHistoryData();
    const latestPeriod = data.length > 0 ? data[0].period : 0;
    set({ historyData: data, latestPeriod });
  },
  importHistoryData: async (data) => {
    const current = get().historyData;
    const merged = [...current, ...data];
    const unique = merged.filter((item, index, self) => 
      index === self.findIndex((t) => t.period === item.period)
    );
    unique.sort((a, b) => b.period - a.period);
    await saveHistoryData(unique);
    const latestPeriod = unique.length > 0 ? unique[0].period : 0;
    set({ historyData: unique, latestPeriod });
  },
  clearAllHistory: async () => {
    await clearHistoryData();
    set({ historyData: [], latestPeriod: 0 });
  },
  deleteHistoryItem: async (period) => {
    await deleteHistoryItem(period);
    const data = get().historyData.filter(d => d.period !== period);
    const latestPeriod = data.length > 0 ? data[0].period : 0;
    set({ historyData: data, latestPeriod });
  },
  
  // 收藏
  favoriteGroups: [],
  loadFavorites: () => {
    const groups = getFavoriteGroups();
    set({ favoriteGroups: groups });
  },
  addGroup: (name) => {
    addFavoriteGroup(name);
    const groups = getFavoriteGroups();
    set({ favoriteGroups: groups });
  },
  removeGroup: (id) => {
    deleteFavoriteGroup(id);
    const groups = getFavoriteGroups();
    set({ favoriteGroups: groups });
  },
  addToFavorites: (groupId, formula) => {
    addFormulaToGroup(groupId, formula);
    const groups = getFavoriteGroups();
    set({ favoriteGroups: groups });
  },
  removeFromFavorites: (groupId, formula) => {
    removeFormulaFromGroup(groupId, formula);
    const groups = getFavoriteGroups();
    set({ favoriteGroups: groups });
  },
  
  // 设置
  settings: getSettings(),
  updateSettings: (newSettings) => {
    saveSettings(newSettings);
    set({ settings: getSettings() });
  },
  
  // UI状态
  isVerifying: false,
  setIsVerifying: (value) => set({ isVerifying: value }),
  
  // 弹窗状态
  showFavorites: false,
  setShowFavorites: (value) => set({ showFavorites: value }),
  showSearch: false,
  setShowSearch: (value) => set({ showSearch: value }),
  showHistory: false,
  setShowHistory: (value) => set({ showHistory: value }),
  showSettings: false,
  setShowSettings: (value) => set({ showSettings: value }),
  
  // 最新期数
  latestPeriod: 0,
  setLatestPeriod: (period) => set({ latestPeriod: period }),
}));
