export type AliasMapping = Record<string, string[]>;

const ALIAS_STORAGE_KEY = 'formula_aliases';

// 加载别名
export function loadAliases(): AliasMapping {
  try {
    const stored = localStorage.getItem(ALIAS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load aliases from localStorage', error);
  }
  return {};
}

// 保存别名
export function saveAliases(aliases: AliasMapping): void {
  try {
    localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(aliases));
  } catch (error) {
    console.error('Failed to save aliases to localStorage', error);
  }
}
