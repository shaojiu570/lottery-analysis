import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Settings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [offset, setOffset] = useState(settings.offset);
  const [periods, setPeriods] = useState(settings.periods);
  const [leftExpand, setLeftExpand] = useState(settings.leftExpand);
  const [rightExpand, setRightExpand] = useState(settings.rightExpand);

  useEffect(() => {
    setOffset(settings.offset);
    setPeriods(settings.periods);
    setLeftExpand(settings.leftExpand);
    setRightExpand(settings.rightExpand);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ offset, periods, leftExpand, rightExpand });
    onClose();
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
              type="number"
              inputMode="numeric"
              value={offset}
              onChange={(e) => setOffset(parseInt(e.target.value) || 0)}
              min={-99}
              max={99}
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
              type="number"
              inputMode="numeric"
              value={periods}
              onChange={(e) => setPeriods(parseInt(e.target.value) || 15)}
              min={1}
              max={200}
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
                type="number"
                inputMode="numeric"
                value={leftExpand}
                onChange={(e) => setLeftExpand(parseInt(e.target.value) || 0)}
                min={0}
                max={10}
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
                type="number"
                inputMode="numeric"
                value={rightExpand}
                onChange={(e) => setRightExpand(parseInt(e.target.value) || 0)}
                min={0}
                max={10}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-gray-300',
                  'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
                  'text-sm'
                )}
              />
            </div>
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
