import { useState } from 'react';
import { FavoriteGroup } from '@/types';

interface AddToFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: FavoriteGroup[];
  formulas: string[];
  onAdd: (groupId: string, formulas: string[]) => void;
}

export function AddToFavoritesModal({
  isOpen,
  onClose,
  groups,
  formulas,
  onAdd,
}: AddToFavoritesModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(groups.length > 0 ? groups[0].id : '');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (selectedGroup && formulas.length > 0) {
      onAdd(selectedGroup, formulas);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base">⭐ 收藏到分组</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-3">
            共 {formulas.length} 个公式
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-emerald-50 border-2 border-emerald-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <span className="text-sm font-medium text-gray-700">{group.name}</span>
                <span className="text-xs text-gray-500">{group.formulas.length}个</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex justify-between gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
          >
            取消
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedGroup || formulas.length === 0}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
