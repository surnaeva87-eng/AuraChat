import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Send, Smile, ArrowLeft, MessageSquare, ShieldCheck, Users, ChevronDown, Heart, Lock, Megaphone, Sparkles, Check, Info, Reply, X } from 'lucide-react';
import { AppUser, ChatGroup, ChatMessage, sendChatMessage, toggleMessageReaction, reactToUserStatus } from '../firebase';
import { UserAvatar } from './UserAvatar';
import { formatChatTime, canUserWriteInChat, getUserRankInfo } from '../utils/rules';
import { soundManager, GROUP_AVATAR_PRESETS } from '../utils/assets';

interface ChatAreaProps {
  currentUser: AppUser;
  targetUser: AppUser | null;
  targetGroup: ChatGroup | null;
  messages: ChatMessage[];
  users: AppUser[];
  onBackMobile: () => void;
  onViewUserProfile: (user: AppUser) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '👀', '✨', '☕', '👋'];
const MESSAGE_REACTIONS = ['❤️', '👍', '🔥', '😂', '👏', '🚀'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  targetUser,
  targetGroup,
  messages,
  users,
  onBackMobile,
  onViewUserProfile
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isGroup = !!targetGroup;
  const currentChatId = targetUser
    ? `dm_${[currentUser.id, targetUser.id].sort()[0]}_${[currentUser.id, targetUser.id].sort()[1]}`
    : targetGroup?.id || '';

  // Check write permissions
  const isOfficialUpdatesChannel = targetGroup?.id === 'channel_aurachat_updates' ||
    targetGroup?.isOfficial ||
    targetGroup?.name === 'Обновления AuraChat';
  const isGlobalAdmin = currentUser.username.trim().toLowerCase() === 'admin';
  const writePermission = targetGroup ? canUserWriteInChat(targetGroup, currentUser) : { allowed: true };
  const canWrite = targetUser ? true : writePermission.allowed;

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useLayoutEffect(() => {
    scrollToBottom('auto');
  }, [currentChatId]);

  useEffect(() => {
    if (messages.length > 0) {
      const container = scrollContainerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 160) {
          scrollToBottom('smooth');
        }
      }
    }
  }, [messages.length]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsScrolledUp(distanceFromBottom > 180);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canWrite) return; // Strict lock!
    const text = inputText.trim();
    if (!text || isSending || !currentChatId) return;

    const replyData = replyingToMessage ? {
      id: replyingToMessage.id,
      senderId: replyingToMessage.senderId,
      senderName: replyingToMessage.senderName,
      text: replyingToMessage.text.slice(0, 120)
    } : undefined;

    setReplyingToMessage(null);
    setInputText('');
    setShowEmojiPicker(false);
    setIsSending(true);

    try {
      await sendChatMessage({
        chatId: currentChatId,
        senderId: currentUser.id,
        senderName: currentUser.displayName || currentUser.username,
        senderAvatar: currentUser.avatar,
        text,
        timestamp: Date.now(),
        type: 'text',
        replyTo: replyData
      });

      soundManager.playMessage();
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMessageId(null);
    await toggleMessageReaction(messageId, emoji, currentUser.id);
  };

  const handleStatusReaction = async (emoji: string) => {
    if (targetUser) {
      await reactToUserStatus(targetUser.id, emoji, currentUser.id);
    }
  };

  // Helper to open sender profile on avatar click
  const handleOpenSenderProfile = (senderId: string, senderName: string, senderAvatar: string) => {
    const found = users.find(u => u.id === senderId || u.username.toLowerCase() === senderId.toLowerCase());
    if (found) {
      onViewUserProfile(found);
    } else {
      // Create minimal AppUser view for profile modal
      onViewUserProfile({
        id: senderId,
        username: senderName,
        displayName: senderName,
        avatar: senderAvatar,
        status: 'online',
        lastSeen: Date.now(),
        createdAt: Date.now(),
        deviceId: 'unknown'
      });
    }
  };

  if (!targetUser && !targetGroup) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-100/60 dark:bg-zinc-950 select-none h-full relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-zinc-200/80 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mb-3 border border-zinc-300/60 dark:border-zinc-800 shadow-2xs">
            <MessageSquare className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">Выберите диалог или канал</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Выберите чат из списка или перейдите во вкладку «Люди», чтобы написать пользователю.
          </p>

          <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Синхронизация</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5 text-violet-500" />
              <span>Каналы и группы</span>
            </span>
          </div>
        </div>
      </main>
    );
  }

  const groupPreset = isGroup && targetGroup
    ? (GROUP_AVATAR_PRESETS.find(p => p.id === targetGroup.avatar) || GROUP_AVATAR_PRESETS[0])
    : null;

  return (
    <main className="flex-1 flex flex-col h-full bg-zinc-100/50 dark:bg-zinc-950 min-w-0 overflow-hidden relative">
      
      {/* Active Chat Header */}
      <div className="h-14 sm:h-15 px-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Назад к чатам"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Clickable Header Avatar -> opens profile! */}
          {isGroup && groupPreset ? (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${groupPreset.bg} flex items-center justify-center text-lg flex-shrink-0 shadow-2xs`}>
              <span>{groupPreset.emoji}</span>
            </div>
          ) : targetUser ? (
            <button
              type="button"
              onClick={() => onViewUserProfile(targetUser)}
              className="relative group transition-transform hover:scale-105"
              title="Открыть профиль пользователя"
            >
              <UserAvatar
                avatar={targetUser.avatar}
                name={targetUser.username}
                size="sm"
                isOnline={targetUser.status === 'online'}
              />
            </button>
          ) : null}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (targetUser) onViewUserProfile(targetUser);
                }}
                className={`font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white truncate text-left ${targetUser ? 'hover:text-violet-600 transition-colors' : ''}`}
              >
                {isGroup ? targetGroup?.name : (targetUser?.displayName || targetUser?.username)}
              </button>

              {/* Special badges */}
              {isOfficialUpdatesChannel && (
                <span className="px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-semibold border border-violet-200 dark:border-violet-800/60 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Официальный</span>
                </span>
              )}

              {isGroup && !isOfficialUpdatesChannel && targetGroup?.type === 'channel' && (
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800/60">
                  Канал
                </span>
              )}

              {!isGroup && targetUser && (
                (() => {
                  const r = getUserRankInfo(targetUser);
                  if (r.rank === 'regular') return null;
                  return (
                    <span className={r.badgeClass}>
                      {r.badgeText}
                    </span>
                  );
                })()
              )}
            </div>

            {/* Subtitle / status */}
            {!isGroup && targetUser ? (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                <span className="truncate">
                  {targetUser.statusText ? `«${targetUser.statusText}»` : `@${targetUser.username}`}
                </span>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span className={targetUser.status === 'online' ? 'text-emerald-500 font-medium' : 'text-zinc-400'}>
                  {targetUser.status === 'online' ? 'в сети' : 'был(а) недавно'}
                </span>
                
                {/* Status reaction shortcuts in header */}
                <div className="hidden sm:flex items-center gap-0.5 ml-1">
                  {['👍', '❤️', '🔥'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleStatusReaction(emoji)}
                      className="px-1 py-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[10px] transition-transform hover:scale-125"
                      title={`Реакция на статус: ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400 truncate">
                {isOfficialUpdatesChannel
                  ? 'Новости платформы • Только @admin'
                  : targetGroup?.type === 'channel'
                    ? 'Трансляция авторов'
                    : `${targetGroup?.members?.length || 1} участников`}
              </p>
            )}
          </div>
        </div>

        {/* Header Right Action */}
        {targetUser && (
          <button
            onClick={() => onViewUserProfile(targetUser)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-violet-500" />
            <span>Профиль</span>
          </button>
        )}
      </div>

      {/* Message Feed (Scroll Container) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center mb-2 text-zinc-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Сообщений пока нет</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isOfficialUpdatesChannel
                ? 'Администратор скоро опубликует первое обновление'
                : 'Начните диалог первым'}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const prevMsg = messages[index - 1];
            const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
            const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
            const isReactionPickerOpen = activeReactionMessageId === msg.id;

            return (
              <div
                key={msg.id || index}
                className={`flex gap-2.5 group relative ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Sender Avatar next to bubble (clickable to open profile!) */}
                {!isMe && (
                  <div className="flex-shrink-0 self-end mb-0.5">
                    {!isSameSender ? (
                      <button
                        type="button"
                        onClick={() => handleOpenSenderProfile(msg.senderId, msg.senderName, msg.senderAvatar)}
                        className="transition-transform hover:scale-110 active:scale-95"
                        title={`Открыть профиль @${msg.senderName}`}
                      >
                        <UserAvatar avatar={msg.senderAvatar} name={msg.senderName} size="xs" />
                      </button>
                    ) : (
                      <div className="w-7 h-7" />
                    )}
                  </div>
                )}

                <div className="relative max-w-[85%] sm:max-w-[72%]">
                  
                  {/* Floating Action buttons on hover */}
                  <div className={`absolute top-0 ${isMe ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:flex items-center gap-1`}>
                    <button
                      type="button"
                      onClick={() => setReplyingToMessage(msg)}
                      className="p-1 rounded-full bg-white dark:bg-zinc-800 text-zinc-400 hover:text-violet-600 dark:hover:text-violet-300 border border-zinc-200 dark:border-zinc-700 shadow-xs transition-colors"
                      title="Ответить на сообщение"
                      aria-label="Ответить"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveReactionMessageId(isReactionPickerOpen ? null : msg.id)}
                      className="p-1 rounded-full bg-white dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-xs"
                      title="Поставить реакцию (1 на сообщение)"
                      aria-label="Поставить реакцию"
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Reaction Picker Popover */}
                  {isReactionPickerOpen && (
                    <div className={`absolute top-full mt-1.5 ${isMe ? 'right-0' : 'left-0'} z-30 p-1.5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl flex items-center gap-1 animate-in fade-in zoom-in-95`}>
                      {MESSAGE_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 text-base transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Distinctive Speech Bubble with modern micro-border */}
                  <div
                    onDoubleClick={() => handleToggleReaction(msg.id, '❤️')}
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                      isMe
                        ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-br-xs shadow-violet-500/10'
                        : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Quoted replied message */}
                    {msg.replyTo && (
                      <div className={`mb-2 pl-2.5 py-1.5 pr-2 rounded-xl border-l-2 text-[11px] select-none ${
                        isMe
                          ? 'bg-black/15 border-white/80 text-white'
                          : 'bg-zinc-100/80 dark:bg-zinc-800/80 border-violet-500 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        <div className="flex items-center gap-1 font-bold text-[10px]">
                          <Reply className="w-3 h-3 opacity-70" />
                          <span>@{msg.replyTo.senderName}</span>
                        </div>
                        <p className="truncate opacity-90 italic mt-0.5">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {!isMe && (!isSameSender || isGroup) && (
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenSenderProfile(msg.senderId, msg.senderName, msg.senderAvatar)}
                          className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline text-left truncate"
                        >
                          {msg.senderName}
                        </button>
                        {(() => {
                          const senderUser = users.find(u => u.id === msg.senderId || u.username.toLowerCase() === msg.senderName.toLowerCase());
                          const r = getUserRankInfo(senderUser || { username: msg.senderName });
                          if (r.rank === 'regular') return null;
                          return (
                            <span className={r.badgeClass}>
                              {r.badgeText}
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>

                    <div
                      className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${
                        isMe ? 'text-white/70' : 'text-zinc-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setReplyingToMessage(msg)}
                        className="sm:hidden px-1.5 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-0.5 text-[9px] font-medium"
                        title="Ответить"
                      >
                        <Reply className="w-2.5 h-2.5" />
                        <span>Ответ</span>
                      </button>
                      <span>{formatChatTime(msg.timestamp)}</span>
                      {isMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Message Reactions Badges: Single Reaction per user guarantee */}
                  {hasReactions && (
                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions!).map(([emoji, userIds]) => {
                        if (!Array.isArray(userIds) || userIds.length === 0) return null;
                        const hasReacted = userIds.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border transition-all ${
                              hasReacted
                                ? 'bg-violet-50 dark:bg-violet-950/60 border-violet-500 text-violet-700 dark:text-violet-300 font-bold scale-105 shadow-xs'
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400'
                            }`}
                            title={hasReacted ? `Вы отреагировали ${emoji} (нажмите, чтобы убрать)` : `Поставить реакцию ${emoji}`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-semibold">{userIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {isScrolledUp && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-18 right-5 z-20 p-2.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 shadow-xl border border-zinc-200 dark:border-zinc-700 hover:scale-105 transition-all"
          title="Вниз к новым сообщениям"
          aria-label="Вниз"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Quick Emoji Picker Drawer */}
      {showEmojiPicker && canWrite && (
        <div className="mx-3 p-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl flex items-center gap-1.5 overflow-x-auto flex-shrink-0 animate-in fade-in">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl text-base transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input or Read-Only Banner */}
      {canWrite ? (
        <div className="bg-white/90 dark:bg-zinc-900/90 border-t border-zinc-200/80 dark:border-zinc-800 backdrop-blur-xl flex-shrink-0">
          
          {/* Active Reply Banner */}
          {replyingToMessage && (
            <div className="px-4 py-2 bg-violet-50/90 dark:bg-violet-950/50 border-b border-violet-200/70 dark:border-violet-800/50 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Reply className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-violet-700 dark:text-violet-300 text-[11px]">
                    Ответ на сообщение @{replyingToMessage.senderName}
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate italic">
                    «{replyingToMessage.text}»
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                title="Отменить ответ"
                aria-label="Отменить ответ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="p-3">
            <form onSubmit={handleSend} className="flex items-center gap-2">
            
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-xl transition-colors ${
                showEmojiPicker
                  ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Эмодзи"
              aria-label="Эмодзи"
            >
              <Smile className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={
                isOfficialUpdatesChannel
                  ? '📢 Опубликовать официальное обновление от имени @admin...'
                  : isGroup
                    ? targetGroup?.type === 'channel'
                      ? 'Опубликовать в канал как автор...'
                      : 'Написать сообщение в группу...'
                    : 'Написать сообщение...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className={`p-2 rounded-xl transition-all ${
                inputText.trim() && !isSending
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs active:scale-95'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed border border-transparent'
              }`}
              title="Отправить"
              aria-label="Отправить"
            >
              <Send className="w-4 h-4" />
            </button>

            </form>
          </div>
        </div>
      ) : (
        /* Read-Only State for non-admins in official updates channel or channel subscribers */
        <div className="p-3.5 bg-zinc-100/80 dark:bg-zinc-900/80 border-t border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md flex items-center justify-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
          {isOfficialUpdatesChannel ? (
            <>
              <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span>
                Официальный канал в режиме чтения: только <b>@admin</b> может публиковать сообщения. Вы можете читать и ставить реакции.
              </span>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-3.5 h-3.5" />
              </div>
              <span>
                Канал в режиме трансляции: публиковать сообщения могут только авторы канала.
              </span>
            </>
          )}
        </div>
      )}

    </main>
  );
};
