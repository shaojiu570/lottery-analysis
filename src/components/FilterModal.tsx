import { useState } from 'react';
import { VerifyResult } from '@/types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: VerifyResult[];
  formulaInput: string;
  onFilter: (filteredResults: VerifyResult[]) => void;
  onUpdateFormulas: (newFormulaInput: string) => void;
}

type HitRateCondition = 'gt' | 'lt' | 'eq' | 'between' | 'none';
type LastPeriodCondition = 'hit' | 'miss' | 'none';

export function FilterModal({ isOpen, onClose, results, formulaInput, onFilter, onUpdateFormulas }: FilterModalProps) {
  const [hitRateCondition, setHitRateCondition] = useState<HitRateCondition>('none');
  const [hitRateValue, setHitRateValue] = useState(80);
  const [hitRateMin, setHitRateMin] = useState(70);
  const [hitRateMax, setHitRateMax] = useState(90);
  const [lastPeriodCondition, setLastPeriodCondition] = useState<LastPeriodCondition>('none');
  
  const [consecutiveMissEnabled, setConsecutiveMissEnabled] = useState(false);
  const [consecutiveMissPeriods, setConsecutiveMissPeriods] = useState(5);

  if (!isOpen) return null;

  const calculateConsecutiveMiss = (hits: boolean[]): number => {
    let count = 0;
    for (const hit of hits) {
      if (!hit) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  const getFilteredResults = () => {
    let filtered = [...results];

    if (hitRateCondition !== 'none') {
      filtered = filtered.filter(r => {
        const rate = r.hitRate * 100;
        switch (hitRateCondition) {
          case 'gt':
            return rate > hitRateValue;
          case 'lt':
            return rate < hitRateValue;
          case 'eq':
            return Math.abs(rate - hitRateValue) < 1;
          case 'between':
            return rate >= hitRateMin && rate <= hitRateMax;
          default:
            return true;
        }
      });
    }

    if (lastPeriodCondition !== 'none') {
      filtered = filtered.filter(r => {
        const lastHit = r.hits.length > 0 ? r.hits[0] : false;
        if (lastPeriodCondition === 'hit') return lastHit;
        if (lastPeriodCondition === 'miss') return !lastHit;
        return true;
      });
    }

    if (consecutiveMissEnabled) {
      filtered = filtered.filter(r => {
        const missCount = calculateConsecutiveMiss(r.hits);
        return missCount >= consecutiveMissPeriods;
      });
    }

    return filtered;
  };

  const handleFilter = () => {
    const filtered = getFilteredResults();
    onFilter(filtered);
    onClose();
  };

  // 应用筛选到公式输入框（只显示筛选出的公式）
  const handleApplyToFormulas = () => {
    const filtered = getFilteredResults();
    if (filtered.length === 0) {
      alert('没有符合条件的公式');
      return;
    }
    
    if (filtered.length === results.length) {
      alert('筛选条件没有排除任何公式');
      return;
    }
    
    // 获取筛选出的公式原始行索引
    const filteredIndices = new Set(filtered.map(r => r.originalLineIndex));
    const allLines = formulaInput.split('\n');
    const keptLines: string[] = [];
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      if (!line.trim()) continue;
      if (filteredIndices.has(i)) {
        keptLines.push(line);
      }
    }
    
    if (keptLines.length === 0) {
      alert('无法匹配公式');
      return;
    }
    
    // 更新公式输入框（重新编号）
    const newInput = keptLines.map((line, index) => {
      const cleanLine = line.replace(/^\[\d+\]\s*/, '').trim();
      return `[${(index + 1).toString().padStart(3, '0')}] ${cleanLine}`;
    }).join('\n');
    
    onUpdateFormulas(newInput);
    onFilter(filtered);
    onClose();
    alert(`已在输入框中筛选出 ${keptLines.length} 个公式`);
  };

  const handleClear = () => {
    onFilter(results);
    onClose();
  };

  // 保留筛选出的公式，删除其他
  const handleKeepFiltered = () => {
    const filtered = getFilteredResults();
    if (filtered.length === 0) {
      alert('没有符合条件的公式');
      return;
    }
    
    // 获取筛选出的公式原始行索引
    const filteredIndices = new Set(filtered.map(r => r.originalLineIndex));
    
    // 从原始输入中保留这些公式
    const allLines = formulaInput.split('\n');
    const keptLines: string[] = [];
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      if (!line.trim()) continue;
      
      // 检查行索引是否在筛选结果中
      if (filteredIndices.has(i)) {
        keptLines.push(line);
      }
    }
    
    if (keptLines.length === 0) {
      alert('无法匹配公式，请重新验证后再试');
      return;
    }
    
    // 更新公式输入（重新编号）
    const newInput = keptLines.map((line, index) => {
      const cleanLine = line.replace(/^\[\d+\]\s*/, '').trim();
      return `[${(index + 1).toString().padStart(3, '0')}] ${cleanLine}`;
    }).join('\n');
    
    onUpdateFormulas(newInput);
    onClose();
    alert(`已保留 ${keptLines.length} 个公式，删除了 ${allLines.filter(l => l.trim()).length - keptLines.length} 个`);
  };

  // 删除筛选出的公式，保留其他
  const handleDeleteFiltered = () => {
    const filtered = getFilteredResults();
    if (filtered.length === 0) {
      alert('没有符合条件的公式');
      return;
    }
    
    // 获取筛选出的公式原始行索引
    const filteredIndices = new Set(filtered.map(r => r.originalLineIndex));
    
    // 从原始输入中删除这些公式
    const allLines = formulaInput.split('\n');
    const keptLines: string[] = [];
    
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      if (!line.trim()) continue;
      
      // 检查行索引是否不在筛选结果中（即保留）
      if (!filteredIndices.has(i)) {
        keptLines.push(line);
      }
    }
    
    // 更新公式输入（重新编号）
    const newInput = keptLines.map((line, index) => {
      const cleanLine = line.replace(/^\[\d+\]\s*/, '').trim();
      return `[${(index + 1).toString().padStart(3, '0')}] ${cleanLine}`;
    }).join('\n');
    
    onUpdateFormulas(newInput);
    onClose();
    alert(`已删除 ${filtered.length} 个公式，保留了 ${keptLines.length} 个`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base">筛选</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              命中率
            </label>
            <select
              value={hitRateCondition}
              onChange={(e) => setHitRateCondition(e.target.value as HitRateCondition)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-2"
            >
              <option value="none">不限</option>
              <option value="gt">大于</option>
              <option value="lt">小于</option>
              <option value="eq">等于</option>
              <option value="between">范围内</option>
            </select>
            
            {hitRateCondition !== 'none' && hitRateCondition !== 'between' && (
              <input
                type="number"
                inputMode="numeric"
                value={hitRateValue}
                onChange={(e) => setHitRateValue(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                placeholder="命中率%"
              />
            )}
            
            {hitRateCondition === 'between' && (
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={hitRateMin}
                  onChange={(e) => setHitRateMin(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="最小"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={hitRateMax}
                  onChange={(e) => setHitRateMax(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="最大"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上期结果
            </label>
            <select
              value={lastPeriodCondition}
              onChange={(e) => setLastPeriodCondition(e.target.value as LastPeriodCondition)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="none">不限</option>
              <option value="hit">命中</option>
              <option value="miss">未命中</option>
            </select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              连错筛选
            </label>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={consecutiveMissEnabled}
                onChange={(e) => setConsecutiveMissEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-600">连错≥</span>
              <input
                type="number"
                inputMode="numeric"
                value={consecutiveMissPeriods}
                onChange={(e) => setConsecutiveMissPeriods(parseInt(e.target.value) || 1)}
                disabled={!consecutiveMissEnabled}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                min={1}
              />
              <span className="text-sm text-gray-600">期未命中</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            当前: {results.length} 个 | 筛选后: {getFilteredResults().length} 个
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 space-y-2">
          {/* 筛选显示按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm border border-gray-300"
            >
              清除
            </button>
            <button
              onClick={handleFilter}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
            >
              应用
            </button>
          </div>
          
          {/* 应用到公式按钮 */}
          <button
            onClick={handleApplyToFormulas}
            className="w-full px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm border border-purple-200"
            title="在公式输入框中只显示筛选出的公式"
          >
            📝 应用到公式输入框
          </button>
          
          {/* 公式编辑按钮 */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleKeepFiltered}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm border border-blue-200"
              title="只保留筛选出的公式，删除其他"
            >
              ✅ 保留筛选
            </button>
            <button
              onClick={handleDeleteFiltered}
              className="flex-1 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm border border-red-200"
              title="删除筛选出的公式，保留其他"
            >
              🗑️ 删除筛选
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
