import React, { useEffect, useState } from 'react';
import { PresenceEvent } from '../firebase';
import { UserAvatar } from './UserAvatar';
import { Sparkles, X } from 'lucide-react';

interface PresenceToastProps {
  event: PresenceEvent | null;
  onDismiss: () => void;
}

export const PresenceToast: React.FC<PresenceToastProps> = ({ event, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [event, onDismiss]);

  if (!event || !visible) return null;

  const isRankPromotion = event.type === 'rank_promoted';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full transition-all duration-300 transform translate-y-0 opacity-100">
      <div className={`flex items-center gap-3 p-3.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border shadow-xl text-zinc-900 dark:text-zinc-100 ${
        isRankPromotion
          ? 'border-amber-500/50 shadow-amber-500/20 ring-1 ring-amber-400/40'
          : 'border-emerald-500/30 shadow-emerald-500/10'
      }`}>
        <div className="relative">
          <UserAvatar avatar={event.avatar} name={event.username} size="sm" isOnline={true} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isRankPromotion ? 'bg-amber-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              isRankPromotion ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${
            isRankPromotion ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRankPromotion ? '⭐ Новое звание!' : 'Новый пользователь в сети!'}</span>
          </div>
          <p className="text-xs sm:text-sm font-medium truncate mt-0.5">
            {isRankPromotion ? (
              <>
                <span className="text-zinc-900 dark:text-white font-bold">{event.username}</span> получил звание <span className="text-amber-500 font-bold">«Избранный»</span>
              </>
            ) : (
              <>
                <span className="text-zinc-900 dark:text-white font-semibold">{event.username}</span> вошел(ла) в сеть
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
          aria-label="Закрыть уведомление"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
