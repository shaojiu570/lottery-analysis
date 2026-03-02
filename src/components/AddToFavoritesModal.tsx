import { useState, useEffect } from 'react';
import { FavoriteGroup } from '@/types';

interface AddToFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: FavoriteGroup[];
  formulas: string[];
  onAdd: (groupId: string, formulas: string[]) => void;
  onAddGroup: (name: string) => string; // 返回新分组的 ID
}

export function AddToFavoritesModal({
  isOpen,
  onClose,
  groups,
  formulas,
  onAdd,
  onAddGroup,
}: AddToFavoritesModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 默认选择第一个分组
      setSelectedGroup(groups.length > 0 ? groups[0].id : '');
      setIsCreating(false);
      setNewGroupName('');
    }
  }, [isOpen, groups]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (isCreating) {
      if (newGroupName.trim()) {
        const newGroupId = onAddGroup(newGroupName.trim());
        onAdd(newGroupId, formulas);
        onClose();
      }
    } else {
      if (selectedGroup && formulas.length > 0) {
        onAdd(selectedGroup, formulas);
        onClose();
      }
    }
  };

  const renderGroupSelector = () => (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {groups.map(group => (
        <button
          key={group.id}
          onClick={() => {
            setSelectedGroup(group.id);
            setIsCreating(false);
          }}
          className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
            selectedGroup === group.id && !isCreating
              ? 'bg-emerald-50 border-2 border-emerald-500'
              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
          }`}
        >
          <span className="text-sm font-medium text-gray-700">{group.name}</span>
          <span className="text-xs text-gray-500">{group.formulas.length}个</span>
        </button>
      ))}
    </div>
  );

  const renderCreateGroup = () => (
    <div>
      <input
        type="text"
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
        placeholder="输入新分组名称"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );

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

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setIsCreating(false)}
              className={`flex-1 py-2 text-sm rounded-lg ${!isCreating ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              选择分组
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className={`flex-1 py-2 text-sm rounded-lg ${isCreating ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              新建分组
            </button>
          </div>

          {isCreating ? renderCreateGroup() : renderGroupSelector()}
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
            disabled={formulas.length === 0 || (isCreating ? !newGroupName.trim() : !selectedGroup)}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
          >
            {isCreating ? '创建并添加' : '添加到分组'}
          </button>
        </div>
      </div>
    </div>
  );
}
