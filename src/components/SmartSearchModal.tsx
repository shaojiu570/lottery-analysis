import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { LotteryData, ResultType, SearchStrategy, Settings } from '@/types';
import { smartSearch, SearchResult } from '@/utils/search';

interface SmartSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyData: LotteryData[];
  settings: Settings;
  onAddFormulas: (formulas: string[]) => void;
}

const RESULT_TYPES: ResultType[] = ['尾数类', '头数类', '合数类', '波色类', '五行类', '肖位类', '单特类'];
const STRATEGIES: { value: SearchStrategy; label: string }[] = [
  { value: 'fast', label: '快速' },
  { value: 'standard', label: '标准' },
  { value: 'deep', label: '深度' },
];

export function SmartSearchModal({
  isOpen,
  onClose,
  historyData,
  settings,
  onAddFormulas,
}: SmartSearchModalProps) {
  // 初始值从 settings 读取
  const [hitRate, setHitRate] = useState(60);
  const [count, setCount] = useState(500);
  const [strategy, setStrategy] = useState<SearchStrategy>('fast');
  const [selectedTypes, setSelectedTypes] = useState<ResultType[]>(['尾数类']);
  // 使用字符串状态管理数字输入
  const [offsetInput, setOffsetInput] = useState(settings.searchOffset.toString());
  const [periodsInput, setPeriodsInput] = useState(settings.searchPeriods.toString());
  const [leftExpandInput, setLeftExpandInput] = useState(settings.searchLeft.toString());
  const [rightExpandInput, setRightExpandInput] = useState(settings.searchRight.toString());
  
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());

  // 弹窗打开时初始化参数和清空结果
  useEffect(() => {
    if (isOpen) {
      setHitRate(60);
      setCount(500);
      setStrategy('fast');
      setSelectedTypes(['尾数类']);
      setOffsetInput(settings.searchOffset.toString());
      setPeriodsInput(settings.searchPeriods.toString());
      setLeftExpandInput(settings.searchLeft.toString());
      setRightExpandInput(settings.searchRight.toString());
      setResults([]);
      setSelectedResults(new Set());
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTypeToggle = (type: ResultType) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // 处理输入变化，允许空值和负号
  const handleInputChange = (value: string, setter: (val: string) => void, allowNegative = false) => {
    if (value === '' || value === '-') {
      setter(value);
      return;
    }
    
    if (allowNegative && value.startsWith('-')) {
      const numPart = value.slice(1);
      if (numPart === '' || /^\d*$/.test(numPart)) {
        setter(value);
      }
      return;
    }
    
    if (/^\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleSearch = async () => {
    if (historyData.length === 0) {
      alert('请先导入开奖记录');
      return;
    }
    if (selectedTypes.length === 0) {
      alert('请至少选择一种结果类型');
      return;
    }

    // 转换字符串为数字
    const offset = offsetInput === '' ? 0 : parseInt(offsetInput) || 0;
    const periods = periodsInput === '' ? 15 : parseInt(periodsInput) || 15;
    const leftExpand = leftExpandInput === '' ? 0 : parseInt(leftExpandInput) || 0;
    const rightExpand = rightExpandInput === '' ? 0 : parseInt(rightExpandInput) || 0;

    setSearching(true);
    setResults([]);
    setSelectedResults(new Set());

    try {
      const searchResults = await smartSearch(
        historyData,
        hitRate,
        count,
        strategy,
        selectedTypes,
        offset,
        periods,
        leftExpand,
        rightExpand,
        (current, total) => setProgress({ current, total })
      );
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map((_, i) => i)));
    }
  };

  const handleToggleSelect = (index: number) => {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    const formulas = results
      .filter((_, i) => selectedResults.has(i))
      .map(r => r.formula);
    if (formulas.length > 0) {
      onAddFormulas(formulas);
      onClose();
    }
  };

  const handleAddAll = () => {
    const formulas = results.map(r => r.formula);
    if (formulas.length > 0) {
      onAddFormulas(formulas);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg">🎯 智能搜索</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* 搜索参数 */}
          <div className="p-3 sm:p-4 border-b border-gray-200 space-y-3 sm:space-y-4">
            {/* 参数提示行 */}
            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-2 sm:px-3 py-2 rounded-lg gap-2">
              <span className="truncate">补偿:{offsetInput || '0'} 期:{periodsInput || '15'} 左:{leftExpandInput || '0'} 右:{rightExpandInput || '0'}</span>
              <button
                onClick={handleSearch}
                disabled={searching}
                className={cn(
                  'px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold shrink-0',
                  'bg-emerald-600 hover:bg-emerald-700 text-white',
                  'disabled:opacity-50'
                )}
              >
                {searching ? '搜索中...' : '🚀 搜索'}
              </button>
            </div>

            {/* 命中率滑块 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                命中率: {hitRate}%
              </label>
              <input
                type="range"
                value={hitRate}
                onChange={(e) => setHitRate(parseInt(e.target.value))}
                min={0}
                max={100}
                className="w-full"
              />
            </div>

            {/* 数量和策略 */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  数量
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
                >
                  {[100, 200, 500, 1000, 2000, 3000].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  策略
                </label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as SearchStrategy)}
                  className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
                >
                  {STRATEGIES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 结果类型选择 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                结果类型
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {RESULT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    className={cn(
                      'px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg border',
                      selectedTypes.includes(type)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 参数设置 - 使用字符串输入 */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <div>
                <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">补偿</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={offsetInput}
                  onChange={(e) => handleInputChange(e.target.value, setOffsetInput, true)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">期数</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={periodsInput}
                  onChange={(e) => handleInputChange(e.target.value, setPeriodsInput, false)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">左扩</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={leftExpandInput}
                  onChange={(e) => handleInputChange(e.target.value, setLeftExpandInput, false)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">右扩</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rightExpandInput}
                  onChange={(e) => handleInputChange(e.target.value, setRightExpandInput, false)}
                  className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* 搜索进度 */}
          {searching && (
            <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600">搜索中...</span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* 搜索结果 */}
          {results.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className="text-xs sm:text-sm text-gray-600">
                  {results.length}个
                </span>
                <div className="flex gap-1.5 sm:gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {selectedResults.size === results.length ? '取消' : '全选'}
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedResults.size === 0}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded disabled:opacity-50"
                  >
                    {selectedResults.size}
                  </button>
                  <button
                    onClick={handleAddAll}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleToggleSelect(index)}
                    className={cn(
                      'flex items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer',
                      selectedResults.has(index)
                        ? 'bg-emerald-50 border border-emerald-300'
                        : 'bg-gray-50 border border-gray-200 hover:border-emerald-300'
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={cn(
                        'w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center text-[10px] sm:text-xs shrink-0',
                        selectedResults.has(index)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-gray-300'
                      )}>
                        {selectedResults.has(index) && '✓'}
                      </span>
                      <span className="font-mono text-xs sm:text-sm text-gray-700 truncate">
                        {result.formula}
                      </span>
                    </div>
                    <span className={cn(
                      'text-xs sm:text-sm font-medium shrink-0 ml-2',
                      result.hitRate >= 0.8 ? 'text-emerald-600' :
                      result.hitRate >= 0.5 ? 'text-yellow-600' :
                      'text-red-600'
                    )}>
                      {(result.hitRate * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
