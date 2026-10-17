import React, { useState } from 'react';
import { Search, Plus, Settings, Users, MessageSquare, Sparkles, Edit3, Check, Pin, Megaphone, Info, ShieldAlert } from 'lucide-react';
import { AppUser, ChatGroup, updateUserStatusText, reactToUserStatus, OFFICIAL_UPDATES_CHANNEL } from '../firebase';
import { UserAvatar } from './UserAvatar';
import { GROUP_AVATAR_PRESETS } from '../utils/assets';
import { formatChatTime, getUserRankInfo } from '../utils/rules';

interface SidebarProps {
  currentUser: AppUser;
  users: AppUser[];
  groups: ChatGroup[];
  activeChatId: string | null;
  activeDirectUserIds: string[];
  onSelectDirectChat: (user: AppUser) => void;
  onSelectGroupChat: (group: ChatGroup) => void;
  onOpenCreateGroup: () => void;
  onOpenSettings: () => void;
  onViewUserProfile: (user: AppUser) => void;
}

const STATUS_QUICK_REACTIONS = ['👍', '❤️', '🔥', '🎉', '☕', '✨'];

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  users,
  groups,
  activeChatId,
  activeDirectUserIds,
  onSelectDirectChat,
  onSelectGroupChat,
  onOpenCreateGroup,
  onOpenSettings,
  onViewUserProfile
}) => {
  const [tab, setTab] = useState<'chats' | 'users' | 'groups'>('chats');
  
  // Dedicated search queries for each tab
  const [chatSearch, setChatSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Status editing state
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState(currentUser.statusText || '');

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const onlineCount = users.filter(u => u.status === 'online').length;

  // DIRECT CHATS FILTER: Only show users with whom a chat was actually started!
  // Not everyone in the database!
  const engagedUsers = otherUsers.filter(u =>
    activeDirectUserIds.includes(u.id) || activeDirectUserIds.includes(u.username.toLowerCase())
  );

  const filteredChatUsers = engagedUsers.filter(u =>
    u.username.toLowerCase().includes(chatSearch.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(chatSearch.toLowerCase())) ||
    (u.statusText && u.statusText.toLowerCase().includes(chatSearch.toLowerCase()))
  );

  // Groups and Channels
  const filteredChatGroups = groups.filter(g =>
    g.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(chatSearch.toLowerCase()))
  );

  // Pinned Official Updates Channel is ALWAYS first!
  const officialGroup = groups.find(g => g.id === OFFICIAL_UPDATES_CHANNEL.id || g.isOfficial) || OFFICIAL_UPDATES_CHANNEL;
  const regularChatGroups = filteredChatGroups.filter(g => g.id !== officialGroup.id && !g.isOfficial);

  // All Users in database tab
  const filteredDatabaseUsers = otherUsers.filter(u =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.statusText && u.statusText.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Channels tab
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(groupSearch.toLowerCase()))
  );

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserStatusText(currentUser.id, statusInput);
    setIsEditingStatus(false);
  };

  const handleReactToUserStatus = async (e: React.MouseEvent, targetUserId: string, emoji: string) => {
    e.stopPropagation();
    await reactToUserStatus(targetUserId, emoji, currentUser.id);
  };

  return (
    <aside className="w-full md:w-80 lg:w-88 h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800/80 select-none overflow-hidden flex-shrink-0 z-20">
      
      {/* Top Header Card */}
      <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800/80 flex-shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          
          {/* User Profile Capsule */}
          <button
            type="button"
            onClick={() => onViewUserProfile(currentUser)}
            className="flex items-center gap-2.5 min-w-0 text-left group p-1 -ml-1 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Ваш профиль"
          >
            <div className="relative">
              <UserAvatar avatar={currentUser.avatar} name={currentUser.username} size="sm" isOnline={true} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-xs text-zinc-900 dark:text-white truncate group-hover:text-violet-600 transition-colors">
                  {currentUser.displayName || currentUser.username}
                </p>
                {(() => {
                  const myRank = getUserRankInfo(currentUser);
                  return (
                    <span className={myRank.badgeClass}>
                      {myRank.badgeText}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[10px] text-zinc-400 truncate">@{currentUser.username}</p>
            </div>
          </button>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenCreateGroup}
              className="p-2 text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Создать группу или канал"
              aria-label="Создать группу или канал"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Настройки"
              aria-label="Настройки"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Status Bar (Text only!) */}
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {isEditingStatus ? (
            <form onSubmit={handleSaveStatus} className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={60}
                placeholder="Ваш статус (только текст)..."
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                autoFocus
                className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="submit"
                className="p-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                title="Сохранить статус"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setStatusInput(currentUser.statusText || '');
                setIsEditingStatus(true);
              }}
              className="w-full text-left flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 py-0.5 px-1 rounded-md transition-colors group"
              title="Нажмите, чтобы изменить статус (только текст)"
            >
              <span className="truncate italic">
                {currentUser.statusText ? `«${currentUser.statusText}»` : 'Установить статус...'}
              </span>
              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-zinc-400 dark:text-zinc-500 transition-opacity ml-1.5 flex-shrink-0" />
            </button>
          )}

          {/* User's own status reactions display */}
          {currentUser.statusReactions && Object.keys(currentUser.statusReactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 px-0.5">
              {Object.entries(currentUser.statusReactions).map(([emoji, val]) => {
                const count = Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
                if (count === 0) return null;
                return (
                  <span
                    key={emoji}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs"
                    title={`Реакций: ${count}`}
                  >
                    <span>{emoji}</span>
                    <span className="font-bold text-[9px] text-violet-600 dark:text-violet-400">{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modern Segmented Navigation Capsule */}
      <div className="p-2.5 flex-shrink-0">
        <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
          <button
            onClick={() => setTab('chats')}
            className={`flex-1 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'chats'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Чаты</span>
          </button>

          <button
            onClick={() => setTab('users')}
            className={`flex-1 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'users'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Люди</span>
          </button>

          <button
            onClick={() => setTab('groups')}
            className={`flex-1 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'groups'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Каналы</span>
          </button>
        </div>
      </div>

      {/* Tab-Specific Search Input */}
      <div className="px-2.5 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
          {tab === 'chats' && (
            <input
              type="text"
              placeholder="Поиск по чатам и каналам..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          )}
          {tab === 'users' && (
            <input
              type="text"
              placeholder="Поиск по базе пользователей..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          )}
          {tab === 'groups' && (
            <input
              type="text"
              placeholder="Поиск каналов и групп..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          )}
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        
        {/* Tab 1: Chats (Pinned Official channel first + only actual direct conversations!) */}
        {tab === 'chats' && (
          <div className="space-y-1 pt-1">
            
            {/* PINNED OFFICIAL CHANNEL: ALWAYS AT THE VERY TOP */}
            <div className="mb-2">
              <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                <span className="flex items-center gap-1">
                  <Pin className="w-3 h-3 rotate-45" />
                  <span>Закрепленный канал</span>
                </span>
                <span>@admin</span>
              </div>

              <button
                key={officialGroup.id}
                onClick={() => onSelectGroupChat(officialGroup)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-all border ${
                  activeChatId === officialGroup.id
                    ? 'bg-violet-600/10 border-violet-500 text-violet-950 dark:text-violet-100 ring-1 ring-violet-500/50 shadow-md shadow-violet-500/10'
                    : 'bg-violet-50/40 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/40 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-lg flex-shrink-0 shadow-md shadow-violet-500/20">
                  <span>📢</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-zinc-900 dark:text-white truncate flex items-center gap-1">
                      <span>{officialGroup.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    </p>
                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Инфо</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {officialGroup.lastMessage || 'Официальные новости от @admin'}
                  </p>
                </div>
              </button>
            </div>

            {/* Other Group Channels */}
            {regularChatGroups.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 pt-1 pb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Каналы и группы
                  </span>
                </div>

                {regularChatGroups.map((group) => {
                  const isActive = activeChatId === group.id;
                  const preset = GROUP_AVATAR_PRESETS.find(p => p.id === group.avatar) || GROUP_AVATAR_PRESETS[0];
                  return (
                    <button
                      key={group.id}
                      onClick={() => onSelectGroupChat(group)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-2xl text-left transition-all ${
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 ring-1 ring-violet-500/40'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${preset.bg} flex items-center justify-center text-base flex-shrink-0 shadow-xs`}>
                        <span>{preset.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs text-zinc-900 dark:text-white truncate">{group.name}</p>
                          {group.lastMessageTime && (
                            <span className="text-[10px] text-zinc-400 ml-1">
                              {formatChatTime(group.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {group.lastMessage || `${group.members?.length || 1} участников`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Direct Chats (Only users with active dialogs!) */}
            <div className="pt-2">
              <div className="px-2 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Личные сообщения ({filteredChatUsers.length})
                </span>
                <button
                  type="button"
                  onClick={() => setTab('users')}
                  className="text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Все пользователи →
                </button>
              </div>

              {filteredChatUsers.length === 0 ? (
                <div className="p-4 my-2 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800/50">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    У вас пока нет активных диалогов
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Выберите собеседника в списке всех пользователей
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('users')}
                    className="mt-2.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shadow-xs"
                  >
                    Перейти к «Люди»
                  </button>
                </div>
              ) : (
                filteredChatUsers.map((user) => {
                  const isOnline = user.status === 'online';
                  const isActive = activeChatId?.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-2.5 p-2 rounded-2xl text-left transition-all ${
                        isActive
                          ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 ring-1 ring-violet-500/40'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {/* Avatar clicks open profile */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewUserProfile(user);
                        }}
                        className="transition-transform hover:scale-105"
                        title="Профиль"
                      >
                        <UserAvatar avatar={user.avatar} name={user.username} size="sm" isOnline={isOnline} />
                      </button>

                      {/* Content click selects chat */}
                      <button
                        type="button"
                        onClick={() => onSelectDirectChat(user)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                              {user.displayName || user.username}
                            </p>
                            {(() => {
                              const r = getUserRankInfo(user);
                              if (r.rank === 'regular') return null;
                              return (
                                <span className={`flex-shrink-0 ${r.badgeClass}`}>
                                  {r.badgeText}
                                </span>
                              );
                            })()}
                          </div>
                          <span className={`text-[10px] flex-shrink-0 ${isOnline ? 'text-emerald-500 font-medium' : 'text-zinc-400'}`}>
                            {isOnline ? 'онлайн' : 'оффлайн'}
                          </span>
                        </div>
                        {user.statusText ? (
                          <p className="text-[10px] text-zinc-400 truncate italic">«{user.statusText}»</p>
                        ) : (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">@{user.username}</p>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* Tab 2: All Users in Database */}
        {tab === 'users' && (
          <div className="space-y-1 pt-1">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                База пользователей ({filteredDatabaseUsers.length})
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">
                {onlineCount} в сети
              </span>
            </div>

            {filteredDatabaseUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                {userSearch ? 'Пользователь не найден' : 'База пользователей пуста'}
              </div>
            ) : (
              filteredDatabaseUsers.map((user) => {
                const isOnline = user.status === 'online';
                return (
                  <div
                    key={user.id}
                    className="p-2 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Avatar click -> profile */}
                      <button
                        type="button"
                        onClick={() => onViewUserProfile(user)}
                        className="transition-transform hover:scale-105"
                        title="Открыть профиль"
                      >
                        <UserAvatar avatar={user.avatar} name={user.username} size="sm" isOnline={isOnline} />
                      </button>

                      <button
                        onClick={() => onSelectDirectChat(user)}
                        className="flex-1 min-w-0 text-left"
                        title="Начать диалог"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                              {user.displayName || user.username}
                            </p>
                            {(() => {
                              const r = getUserRankInfo(user);
                              if (r.rank === 'regular') return null;
                              return (
                                <span className={`flex-shrink-0 ${r.badgeClass}`}>
                                  {r.badgeText}
                                </span>
                              );
                            })()}
                          </div>
                          <span className={`text-[10px] flex-shrink-0 ${isOnline ? 'text-emerald-500 font-medium' : 'text-zinc-400'}`}>
                            {isOnline ? 'В сети' : 'Не в сети'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">@{user.username}</p>
                      </button>

                      {/* Quick Chat button */}
                      <button
                        type="button"
                        onClick={() => onSelectDirectChat(user)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-xs"
                      >
                        Написать
                      </button>
                    </div>

                    {/* Status & Reactions */}
                    {user.statusText && (
                      <div className="mt-1.5 pl-9 flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-zinc-500 dark:text-zinc-400 italic truncate">
                          «{user.statusText}»
                        </span>

                        {/* Single Reaction bar */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {STATUS_QUICK_REACTIONS.slice(0, 3).map((emoji) => {
                            const val = user.statusReactions?.[emoji];
                            const userIds = Array.isArray(val) ? val : [];
                            const count = Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
                            const hasReacted = userIds.includes(currentUser.id);

                            return (
                              <button
                                key={emoji}
                                onClick={(e) => handleReactToUserStatus(e, user.id, emoji)}
                                className={`px-1.5 py-0.5 rounded-md text-[10px] flex items-center gap-0.5 transition-transform hover:scale-115 ${
                                  hasReacted
                                    ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold'
                                    : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                }`}
                                title={hasReacted ? `Убрать ${emoji}` : `Поставить ${emoji}`}
                              >
                                <span>{emoji}</span>
                                {count > 0 && <span className="text-[9px] font-bold">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Channels / Groups */}
        {tab === 'groups' && (
          <div className="space-y-1 pt-1">
            <div className="p-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Каналы и группы ({filteredGroups.length})
              </span>
              <button
                onClick={onOpenCreateGroup}
                className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Создать</span>
              </button>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="py-8 text-center px-4">
                <p className="text-xs text-zinc-400">
                  {groupSearch ? 'Каналы не найдены' : 'Каналы пока не созданы'}
                </p>
                <button
                  onClick={onOpenCreateGroup}
                  className="mt-2 text-xs font-semibold px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
                >
                  Создать канал
                </button>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isActive = activeChatId === group.id;
                const isOff = group.id === OFFICIAL_UPDATES_CHANNEL.id || group.isOfficial;
                const preset = GROUP_AVATAR_PRESETS.find(p => p.id === group.avatar) || GROUP_AVATAR_PRESETS[0];

                return (
                  <button
                    key={group.id}
                    onClick={() => onSelectGroupChat(group)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200 ring-1 ring-violet-500/40'
                        : isOff
                          ? 'bg-violet-50/30 dark:bg-violet-950/20 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-zinc-800 dark:text-zinc-200'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${isOff ? 'from-violet-600 to-indigo-600' : preset.bg} flex items-center justify-center text-base flex-shrink-0 shadow-xs`}>
                      <span>{isOff ? '📢' : preset.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-xs text-zinc-900 dark:text-white truncate flex items-center gap-1">
                          <span>{group.name}</span>
                          {isOff && <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">✦</span>}
                        </p>
                        <span className="text-[10px] text-zinc-400 ml-1">
                          {group.type === 'channel' ? 'Канал' : 'Группа'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {group.description || `${group.members?.length || 1} участников`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Clean Subtle Footer */}
      <div className="h-10 px-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 flex-shrink-0 bg-zinc-50/30 dark:bg-zinc-900/30">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Синхронизировано</span>
        </span>
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">AuraChat</span>
      </div>

    </aside>
  );
};
