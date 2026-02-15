import { useState } from 'react';
import { VerifyResult } from '@/types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: VerifyResult[];
  onFilter: (filteredResults: VerifyResult[]) => void;
}

type HitRateCondition = 'gt' | 'lt' | 'eq' | 'between' | 'none';
type LastPeriodCondition = 'hit' | 'miss' | 'none';

export function FilterModal({ isOpen, onClose, results, onFilter }: FilterModalProps) {
  const [hitRateCondition, setHitRateCondition] = useState<HitRateCondition>('none');
  const [hitRateValue, setHitRateValue] = useState(80);
  const [hitRateMin, setHitRateMin] = useState(70);
  const [hitRateMax, setHitRateMax] = useState(90);
  const [lastPeriodCondition, setLastPeriodCondition] = useState<LastPeriodCondition>('none');

  if (!isOpen) return null;

  const handleFilter = () => {
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
        // 最新一期是数组的最后一个元素
        const lastHit = r.hits.length > 0 ? r.hits[r.hits.length - 1] : false;
        if (lastPeriodCondition === 'hit') return lastHit;
        if (lastPeriodCondition === 'miss') return !lastHit;
        return true;
      });
    }

    onFilter(filtered);
    onClose();
  };

  const handleClear = () => {
    onFilter(results);
    onClose();
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

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            当前公式数: {results.length}
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex justify-between gap-2">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
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
      </div>
    </div>
  );
}
