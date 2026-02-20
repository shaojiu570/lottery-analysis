import { useState, useEffect } from 'react';
import { Settings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
  onBatchReplace?: (find: string, replace: string) => void;
  formulaInput?: string;
}

const RESULT_TYPES = ['尾数类', '头数类', '合数类', '波色类', '五行类', '肖位类', '单特类', '大小单双类'];

export function SettingsModal({ isOpen, onClose, settings, onSave, onBatchReplace, formulaInput }: SettingsModalProps) {
  const [offsetInput, setOffsetInput] = useState(settings.offset.toString());
  const [periodsInput, setPeriodsInput] = useState(settings.periods.toString());
  const [leftExpandInput, setLeftExpandInput] = useState(settings.leftExpand.toString());
  const [rightExpandInput, setRightExpandInput] = useState(settings.rightExpand.toString());
  const [targetPeriodInput, setTargetPeriodInput] = useState(
    settings.targetPeriod?.toString() || ''
  );
  
  const [replaceRule, setReplaceRule] = useState<'D' | 'L' | ''>('L');
  const [replaceType, setReplaceType] = useState<string>('肖位类');
  const [replaceCount, setReplaceCount] = useState(0);

  useEffect(() => {
    setOffsetInput(settings.offset.toString());
    setPeriodsInput(settings.periods.toString());
    setLeftExpandInput(settings.leftExpand.toString());
    setRightExpandInput(settings.rightExpand.toString());
    setTargetPeriodInput(settings.targetPeriod?.toString() || '');
    setReplaceCount(0);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const offset = offsetInput === '' ? 0 : parseInt(offsetInput) || 0;
    const periods = periodsInput === '' ? 15 : parseInt(periodsInput) || 15;
    const leftExpand = leftExpandInput === '' ? 0 : parseInt(leftExpandInput) || 0;
    const rightExpand = rightExpandInput === '' ? 0 : parseInt(rightExpandInput) || 0;
    const targetPeriod = targetPeriodInput === '' ? null : parseInt(targetPeriodInput) || null;
    
    onSave({ offset, periods, leftExpand, rightExpand, targetPeriod });
    onClose();
  };

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

  const handleBatchReplace = () => {
    if (!onBatchReplace || !formulaInput) return;
    
    let findPattern: RegExp;
    let replaceStr: string;
    
    if (replaceRule === '') {
      // 不限：只替换类型部分，保留原规则D或L
      // 例如：[L五行类] -> [L肖位类]，保留L
      findPattern = /\[([DL])([^[\]]+)\]/g;
      replaceStr = `[$1${replaceType}]`;
    } else {
      findPattern = /\[[DL][^\]]+\]/g;
      replaceStr = `[${replaceRule}${replaceType}]`;
    }
    
    const matches = formulaInput.match(findPattern) || [];
    
    if (matches.length > 0) {
      onBatchReplace(findPattern.source, replaceStr);
      setReplaceCount(matches.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base sm:text-lg">⚙️ 验证设置</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <span>补偿:{offsetInput || '0'} 期:{periodsInput || '15'} 左:{leftExpandInput || '0'} 右:{rightExpandInput || '0'}</span>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              保存
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <div>
              <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">补偿</label>
              <input
                type="text"
                inputMode="numeric"
                value={offsetInput}
                onChange={(e) => handleInputChange(e.target.value, setOffsetInput, true)}
                className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">期数</label>
              <input
                type="text"
                inputMode="numeric"
                value={periodsInput}
                onChange={(e) => handleInputChange(e.target.value, setPeriodsInput, false)}
                className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">左扩</label>
              <input
                type="text"
                inputMode="numeric"
                value={leftExpandInput}
                onChange={(e) => handleInputChange(e.target.value, setLeftExpandInput, false)}
                className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">右扩</label>
              <input
                type="text"
                inputMode="numeric"
                value={rightExpandInput}
                onChange={(e) => handleInputChange(e.target.value, setRightExpandInput, false)}
                className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">
              目标期数 <span className="text-gray-400">(留空验证最新期)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={targetPeriodInput}
              onChange={(e) => handleInputChange(e.target.value, setTargetPeriodInput, false)}
              placeholder="例如: 2026042"
              className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
            />
          </div>

          {onBatchReplace && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">📝 批量替换公式类型</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">替换为:</span>
                <select
                  value={replaceRule}
                  onChange={(e) => setReplaceRule(e.target.value as 'D' | 'L' | '')}
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="">不限</option>
                  <option value="D">D</option>
                  <option value="L">L</option>
                </select>
                <select
                  value={replaceType}
                  onChange={(e) => setReplaceType(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded flex-1 min-w-0"
                >
                  {RESULT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  onClick={handleBatchReplace}
                  className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  替换
                </button>
              </div>
              {replaceCount > 0 && (
                <p className="text-xs text-emerald-600 mt-2">✓ 已替换 {replaceCount} 处</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
