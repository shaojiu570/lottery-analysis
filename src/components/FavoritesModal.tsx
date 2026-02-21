import { useState } from 'react';
import { cn } from '@/utils/cn';
import { FavoriteGroup } from '@/types';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: FavoriteGroup[];
  onAddGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
  onRenameGroup?: (id: string, newName: string) => void;
  onSelectFormulas: (formulas: string[]) => void;
  onRemoveFormula: (groupId: string, formula: string) => void;
}

export function FavoritesModal({
  isOpen,
  onClose,
  groups,
  onAddGroup,
  onDeleteGroup,
  onRenameGroup,
  onSelectFormulas,
  onRemoveFormula,
}: FavoritesModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    groups.length > 0 ? groups[0].id : null
  );
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const toggleGroupSelection = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleLoadSelected = () => {
    const allFormulas: string[] = [];
    for (const groupId of selectedGroups) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        allFormulas.push(...group.formulas);
      }
    }
    if (allFormulas.length > 0) {
      onSelectFormulas(allFormulas);
      onClose();
    }
  };

  const handleLoadAll = () => {
    if (currentGroup && currentGroup.formulas.length > 0) {
      onSelectFormulas(currentGroup.formulas);
    }
  };

  if (!isOpen) return null;

  const currentGroup = groups.find(g => g.id === selectedGroup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg">📚 我的收藏</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 分组列表 */}
          <div className="w-20 sm:w-32 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
            <div className="p-1.5 sm:p-2 border-b border-gray-200">
              <button
                onClick={() => setShowAddGroup(true)}
                className="w-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded flex items-center justify-center gap-1"
              >
                <span>+</span>
                <span className="hidden sm:inline">新建</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1">
              {groups.map(group => (
                <div
                  key={group.id}
                  className={cn(
                    'flex items-center gap-1 px-1 py-1 rounded-lg cursor-pointer',
                    selectedGroup === group.id
                      ? 'bg-emerald-100'
                      : 'hover:bg-gray-200'
                  )}
                  onClick={() => {
                    if (selectedGroups.size > 0) {
                      toggleGroupSelection(group.id);
                    } else {
                      setSelectedGroup(group.id);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.id)}
                    onChange={() => toggleGroupSelection(group.id)}
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {editingGroupId === group.id ? (
                    <input
                      type="text"
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      onBlur={() => {
                        if (onRenameGroup && editingGroupName.trim()) {
                          onRenameGroup(group.id, editingGroupName.trim());
                        }
                        setEditingGroupId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (onRenameGroup && editingGroupName.trim()) {
                            onRenameGroup(group.id, editingGroupName.trim());
                          }
                          setEditingGroupId(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 px-1 py-0.5 text-xs sm:text-sm border border-blue-400 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroup(group.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onRenameGroup) {
                          setEditingGroupId(group.id);
                          setEditingGroupName(group.name);
                        }
                      }}
                      className={cn(
                        'flex-1 px-1 py-1 text-left text-xs sm:text-sm rounded-lg flex items-center justify-between',
                        selectedGroup === group.id
                          ? 'bg-emerald-600 text-white'
                          : 'hover:bg-gray-200 text-gray-700'
                      )}
                    >
                      <span className="truncate" title="双击修改名称">{group.name}</span>
                      <span className="text-xs opacity-70 shrink-0">{group.formulas.length}</span>
                    </button>
                  )}
                </div>
              ))}
              {selectedGroups.size > 0 && (
                <div className="pt-2 border-t border-gray-300 mt-2">
                  <button
                    onClick={handleLoadSelected}
                    disabled={selectedGroups.size === 0}
                    className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    加载选中分组 ({selectedGroups.size})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGroups(new Set());
                    }}
                    className="w-full mt-1 px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消多选
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 公式列表 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentGroup ? (
              <>
                <div className="px-3 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0 gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 truncate">
                    {currentGroup.name} ({currentGroup.formulas.length})
                  </span>
                  <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={handleLoadAll}
                      disabled={currentGroup.formulas.length === 0}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded disabled:opacity-50"
                    >
                      加载
                    </button>
                    {currentGroup.id !== 'default' && (
                      <button
                        onClick={() => {
                          onDeleteGroup(currentGroup.id);
                          setSelectedGroup(groups[0]?.id || null);
                        }}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  {currentGroup.formulas.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-4xl mb-2">📭</p>
                      <p className="text-sm">暂无公式</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentGroup.formulas.map((formula, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-2 sm:p-3"
                        >
                          <span className="font-mono text-xs sm:text-sm text-gray-700 truncate flex-1 mr-2">
                            {formula}
                          </span>
                          <button
                            onClick={() => onRemoveFormula(currentGroup.id, formula)}
                            className="text-gray-400 hover:text-red-500 shrink-0 w-5 h-5 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                选择分组
              </div>
            )}
          </div>
        </div>

        {/* 新建分组对话框 */}
        {showAddGroup && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-xs">
              <h3 className="font-bold text-gray-800 mb-3">新建分组</h3>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="输入分组名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddGroup(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (newGroupName.trim()) {
                      onAddGroup(newGroupName.trim());
                      setNewGroupName('');
                      setShowAddGroup(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
