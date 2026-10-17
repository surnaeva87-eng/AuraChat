import React from 'react';
import { X, MessageSquare, Shield, Clock, Calendar, Laptop, Sparkles, Award } from 'lucide-react';
import { AppUser, reactToUserStatus } from '../firebase';
import { UserAvatar } from './UserAvatar';
import { getUserRankInfo } from '../utils/rules';

interface UserProfileModalProps {
  user: AppUser;
  currentUser: AppUser;
  onClose: () => void;
  onStartChat: (user: AppUser) => void;
}

const STATUS_REACTION_EMOJIS = ['👍', '❤️', '🔥', '🎉', '☕', '✨'];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  currentUser,
  onClose,
  onStartChat
}) => {
  const isMe = user.id === currentUser.id;
  const isOnline = user.status === 'online';
  const rankMeta = getUserRankInfo(user);

  const handleReact = async (emoji: string) => {
    await reactToUserStatus(user.id, emoji, currentUser.id);
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Недавно';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md overflow-hidden select-none">
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl p-6 text-zinc-900 dark:text-zinc-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Card Center */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <UserAvatar avatar={user.avatar} name={user.username} size="xl" isOnline={isOnline} />
          </div>

          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <span>{user.displayName || user.username}</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">@{user.username}</p>

          {/* User Rank Badge */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className={rankMeta.badgeClass}>
              {rankMeta.badgeText}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <span>{isOnline ? 'В сети' : 'Не в сети'}</span>
            </span>
          </div>

          {/* Rank Description Pill */}
          <div className={`mt-3 w-full p-2.5 rounded-2xl border text-xs text-left ${
            rankMeta.rank === 'admin'
              ? 'bg-violet-50/70 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800/60 text-violet-950 dark:text-violet-200'
              : rankMeta.rank === 'chosen'
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              <Award className="w-3.5 h-3.5 text-violet-500" />
              <span>Звание: {rankMeta.title}</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">{rankMeta.description}</p>
          </div>
        </div>

        {/* Status text section */}
        <div className="mt-5 p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span>Статус</span>
          </p>
          <p className="text-xs text-zinc-800 dark:text-zinc-200 italic font-medium">
            {user.statusText ? `«${user.statusText}»` : 'Статус не указан'}
          </p>

          {/* Quick status reactions: single reaction per user */}
          {!isMe && (
            <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <p className="text-[10px] text-zinc-400 mb-1.5">Реакция на статус (1 от вас):</p>
              <div className="flex items-center gap-1">
                {STATUS_REACTION_EMOJIS.map((emoji) => {
                  const val = user.statusReactions?.[emoji];
                  const userIds = Array.isArray(val) ? val : [];
                  const count = Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
                  const hasReacted = userIds.includes(currentUser.id);

                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className={`px-2 py-1 rounded-xl text-xs transition-transform hover:scale-115 flex items-center gap-1 border shadow-2xs ${
                        hasReacted
                          ? 'bg-violet-100 dark:bg-violet-900/60 border-violet-500 text-violet-700 dark:text-violet-200 font-bold'
                          : 'bg-white dark:bg-zinc-700 border-zinc-200/60 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200'
                      }`}
                      title={hasReacted ? `Убрать реакцию ${emoji}` : `Поставить реакцию ${emoji}`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[9px] font-bold text-violet-500">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isMe && user.statusReactions && Object.keys(user.statusReactions).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(user.statusReactions).map(([emoji, val]) => {
                const count = Array.isArray(val) ? val.length : (typeof val === 'number' ? val : 0);
                if (count === 0) return null;
                return (
                  <span
                    key={emoji}
                    className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-700 text-xs text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-600 flex items-center gap-1"
                  >
                    <span>{emoji}</span>
                    <span className="font-bold text-[10px]">{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Info list */}
        <div className="mt-4 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Регистрация</span>
            </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{formattedDate}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Безопасность</span>
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Сквозной канал</span>
          </div>
        </div>

        {/* Action Button */}
        {!isMe ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartChat(user);
            }}
            className="w-full mt-5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-500/25 flex items-center justify-center gap-2 active:scale-98"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Написать сообщение</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
          >
            Закрыть
          </button>
        )}

      </div>
    </div>
  );
};
