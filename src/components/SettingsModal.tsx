import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Settings } from '@/types';
import { getCurrentZodiacYearName } from '@/utils/mappings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  // 使用字符串状态来管理输入，避免数字转换问题
  const [offsetInput, setOffsetInput] = useState(settings.offset.toString());
  const [periodsInput, setPeriodsInput] = useState(settings.periods.toString());
  const [leftExpandInput, setLeftExpandInput] = useState(settings.leftExpand.toString());
  const [rightExpandInput, setRightExpandInput] = useState(settings.rightExpand.toString());
  const [targetPeriodInput, setTargetPeriodInput] = useState(
    settings.targetPeriod?.toString() || ''
  );

  useEffect(() => {
    setOffsetInput(settings.offset.toString());
    setPeriodsInput(settings.periods.toString());
    setLeftExpandInput(settings.leftExpand.toString());
    setRightExpandInput(settings.rightExpand.toString());
    setTargetPeriodInput(settings.targetPeriod?.toString() || '');
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

  // 处理输入变化，允许空值和负号
  const handleInputChange = (value: string, setter: (val: string) => void, allowNegative = false) => {
    // 只允许数字和负号（如果允许负数）
    if (value === '' || value === '-') {
      setter(value);
      return;
    }
    
    // 如果是允许负数，检查负号开头
    if (allowNegative && value.startsWith('-')) {
      const numPart = value.slice(1);
      if (numPart === '' || /^\d*$/.test(numPart)) {
        setter(value);
      }
      return;
    }
    
    // 只允许数字
    if (/^\d*$/.test(value)) {
      setter(value);
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              补偿值
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={offsetInput}
              onChange={(e) => handleInputChange(e.target.value, setOffsetInput, true)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-gray-300',
                'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
                'text-sm'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              验证期数
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={periodsInput}
              onChange={(e) => handleInputChange(e.target.value, setPeriodsInput, false)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-gray-300',
                'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
                'text-sm'
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                左扩展
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={leftExpandInput}
                onChange={(e) => handleInputChange(e.target.value, setLeftExpandInput, false)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-gray-300',
                  'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
                  'text-sm'
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                右扩展
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={rightExpandInput}
                onChange={(e) => handleInputChange(e.target.value, setRightExpandInput, false)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-gray-300',
                  'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
                  'text-sm'
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目标期数
              <span className="text-xs text-gray-500 ml-1">(留空表示验证最新期)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={targetPeriodInput}
              onChange={(e) => handleInputChange(e.target.value, setTargetPeriodInput, false)}
              placeholder="例如: 2026042"
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-gray-300',
                'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
                'text-sm'
              )}
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800">
                当前生肖年
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {getCurrentZodiacYearName()}年
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              号码生肖属性已自动更新
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
