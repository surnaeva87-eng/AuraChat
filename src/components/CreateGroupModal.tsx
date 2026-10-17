import React, { useState } from 'react';
import { X, Users, Check, Sparkles, Radio, MessageSquare, Megaphone, Shield } from 'lucide-react';
import { GROUP_AVATAR_PRESETS } from '../utils/assets';
import { AppUser, createChatGroup } from '../firebase';
import { UserAvatar } from './UserAvatar';

interface CreateGroupModalProps {
  currentUser: AppUser;
  availableUsers: AppUser[];
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  currentUser,
  availableUsers,
  onClose,
  onCreated
}) => {
  const [chatType, setChatType] = useState<'group' | 'channel'>('group');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(GROUP_AVATAR_PRESETS[0]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([currentUser.id]);
  const [allowedWriterIds, setAllowedWriterIds] = useState<string[]>([currentUser.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (id: string) => {
    if (id === currentUser.id) return;
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(m => m !== id));
      setAllowedWriterIds(allowedWriterIds.filter(w => w !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const toggleWriter = (id: string) => {
    if (id === currentUser.id) return; // Creator is always writer
    if (allowedWriterIds.includes(id)) {
      setAllowedWriterIds(allowedWriterIds.filter(w => w !== id));
    } else {
      setAllowedWriterIds([...allowedWriterIds, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError(chatType === 'channel' ? 'Название канала должно содержать минимум 2 символа' : 'Название группы должно содержать минимум 2 символа');
      return;
    }

    setLoading(true);
    try {
      const newGroupId = await createChatGroup({
        name: name.trim(),
        description: description.trim(),
        avatar: selectedPreset.id,
        createdBy: currentUser.id,
        members: selectedMemberIds,
        type: chatType,
        allowedWriters: chatType === 'channel' ? allowedWriterIds : selectedMemberIds
      });

      onCreated(newGroupId);
    } catch {
      setError('Не удалось создать сообщество. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  };

  const otherUsers = availableUsers.filter(u => u.id !== currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md overflow-hidden select-none">
      <div className="relative w-full max-w-md max-h-[94vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl p-5 sm:p-6 text-zinc-900 dark:text-zinc-100 overflow-y-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-2xs">
              {chatType === 'channel' ? <Megaphone className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {chatType === 'channel' ? 'Создать канал' : 'Создать группу'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {chatType === 'channel' ? 'Трансляция контента с авторами' : 'Совместный чат для всех участников'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Закрыть окно"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-3.5 space-y-3.5 flex-1">
          
          {/* Distinctive Type Selector: Group vs Channel */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Тип сообщества
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChatType('group')}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  chatType === 'group'
                    ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 ring-1 ring-violet-500 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Группа</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Все участники могут свободно писать и отвечать
                </p>
              </button>

              <button
                type="button"
                onClick={() => setChatType('channel')}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  chatType === 'channel'
                    ? 'border-violet-600 bg-violet-50/50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 ring-1 ring-violet-500 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                  <Megaphone className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Канал</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Публикации только от выбранных авторов
                </p>
              </button>
            </div>
          </div>

          {/* Preset Icon */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
              Иконка
            </label>
            <div className="grid grid-cols-6 gap-2">
              {GROUP_AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset)}
                    className={`relative aspect-square rounded-2xl flex items-center justify-center text-lg transition-all ${
                      isSelected
                        ? 'ring-2 ring-violet-500 scale-105 shadow-md'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    } bg-gradient-to-tr ${preset.bg}`}
                    title={preset.label}
                  >
                    <span>{preset.emoji}</span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-violet-600 rounded-full flex items-center justify-center text-[8px] text-white shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Название {chatType === 'channel' ? 'канала' : 'группы'} *
            </label>
            <input
              type="text"
              required
              placeholder={chatType === 'channel' ? 'Новости студии' : 'Команда проекта'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Описание (необязательно)
            </label>
            <input
              type="text"
              placeholder={chatType === 'channel' ? 'Официальные публикации и анонсы' : 'Обсуждение задач и планов'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                {chatType === 'channel' ? 'Подписчики / участники' : 'Участники'} ({selectedMemberIds.length})
              </label>
              <span className="text-[10px] text-zinc-400">
                {otherUsers.length} в базе
              </span>
            </div>

            <div className="max-h-32 overflow-y-auto space-y-1 p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
              {otherUsers.length === 0 ? (
                <div className="py-2.5 text-center text-xs text-zinc-400">
                  Другие пользователи пока не зарегистрированы
                </div>
              ) : (
                otherUsers.map((u) => {
                  const isChecked = selectedMemberIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleMember(u.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                        isChecked
                          ? 'bg-violet-50/70 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar avatar={u.avatar} name={u.username} size="xs" isOnline={u.status === 'online'} />
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{u.displayName || u.username}</p>
                          <p className="text-[10px] text-zinc-400">@{u.username}</p>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                        isChecked
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Author Selection for Channels */}
          {chatType === 'channel' && selectedMemberIds.length > 1 && (
            <div className="p-3 bg-violet-50/40 dark:bg-violet-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/40 animate-in fade-in">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <label className="text-[11px] font-bold text-violet-900 dark:text-violet-200">
                  Кто может публиковать сообщения в канал
                </label>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2">
                Вы (@{currentUser.username}) — создатель и автор по умолчанию. Отметьте других участников, которым разрешена публикация:
              </p>

              <div className="space-y-1 max-h-24 overflow-y-auto">
                {otherUsers.filter(u => selectedMemberIds.includes(u.id)).map(u => {
                  const isWriter = allowedWriterIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleWriter(u.id)}
                      className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-800 text-left text-xs transition-colors"
                    >
                      <span className="font-medium">@{u.username}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isWriter
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {isWriter ? 'Автор (может писать)' : 'Читатель'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold rounded-2xl bg-violet-600 hover:bg-violet-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-violet-500/25 active:scale-98"
            >
              {loading ? (
                <span>Создание...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{chatType === 'channel' ? 'Создать канал' : 'Создать группу'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
