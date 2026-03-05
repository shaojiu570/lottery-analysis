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

export function FilterModal({ isOpen, onClose, results, formulaInput, onFilter, onUpdateFormulas }: FilterModalProps) {
  const [hitCountCondition, setHitCountCondition] = useState<'gt' | 'lt' | 'eq' | 'none'>('none');
  const [hitCountValue, setHitCountValue] = useState(15);
  const [missCountCondition, setMissCountCondition] = useState<'gt' | 'lt' | 'eq' | 'none'>('none');
  const [missCountValue, setMissCountValue] = useState(5);

  if (!isOpen) return null;

  const getFilteredResults = () => {
    let filtered = [...results];

    // 命中总数筛选
    if (hitCountCondition !== 'none') {
      filtered = filtered.filter(r => {
        switch (hitCountCondition) {
          case 'gt':
            return r.hitCount > hitCountValue;
          case 'lt':
            return r.hitCount < hitCountValue;
          case 'eq':
            return r.hitCount === hitCountValue;
          default:
            return true;
        }
      });
    }

    // 未命中总数筛选
    if (missCountCondition !== 'none') {
      filtered = filtered.filter(r => {
        const missCount = r.totalPeriods - r.hitCount;
        switch (missCountCondition) {
          case 'gt':
            return missCount > missCountValue;
          case 'lt':
            return missCount < missCountValue;
          case 'eq':
            return missCount === missCountValue;
          default:
            return true;
        }
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base text-white">筛选条件</h2>
          <button onClick={onClose} className="text-2xl text-white hover:opacity-70 w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* 命中总数筛选 */}
          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">命中总数</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={hitCountCondition}
                onChange={(e) => setHitCountCondition(e.target.value as any)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="none">不限</option>
                <option value="gt">大于</option>
                <option value="lt">小于</option>
                <option value="eq">等于</option>
              </select>
              <input
                type="number"
                inputMode="numeric"
                value={hitCountValue}
                onChange={(e) => setHitCountValue(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                min={0}
                disabled={hitCountCondition === 'none'}
              />
            </div>
          </div>

          {/* 未命中总数筛选 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">未命中总数</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={missCountCondition}
                onChange={(e) => setMissCountCondition(e.target.value as any)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="none">不限</option>
                <option value="gt">大于</option>
                <option value="lt">小于</option>
                <option value="eq">等于</option>
              </select>
              <input
                type="number"
                inputMode="numeric"
                value={missCountValue}
                onChange={(e) => setMissCountValue(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                min={0}
                disabled={missCountCondition === 'none'}
              />
            </div>
          </div>

          <div className="text-center py-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <span className="text-xs text-gray-400">
              当前 <span className="font-bold text-emerald-600">{results.length}</span> 个公式
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-xs text-gray-400">
              筛选后 <span className="font-bold text-emerald-600">{getFilteredResults().length}</span> 个
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-3 space-y-3 shrink-0 bg-gray-50">
          {/* 主操作按钮组 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors text-sm border border-gray-200 bg-white"
            >
              重置
            </button>
            <button
              onClick={handleFilter}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-200 text-sm"
            >
              应用预览
            </button>
          </div>
          
          {/* 高级操作按钮组 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleApplyToFormulas}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors border border-purple-100"
              title="应用到输入框"
            >
              <span className="text-lg">📝</span>
              <span className="text-[10px] mt-1 font-bold">同步</span>
            </button>
            <button
              onClick={handleKeepFiltered}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100"
              title="仅保留筛选"
            >
              <span className="text-lg">✅</span>
              <span className="text-[10px] mt-1 font-bold">保留</span>
            </button>
            <button
              onClick={handleDeleteFiltered}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-100"
              title="删除筛选项"
            >
              <span className="text-lg">🗑️</span>
              <span className="text-[10px] mt-1 font-bold">删除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
