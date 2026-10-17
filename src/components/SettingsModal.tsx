import React, { useState } from 'react';
import { X, Moon, Sun, Bell, Volume2, VolumeX, Shield, Laptop, LogOut, Check, User, Sparkles, Award, ShieldCheck } from 'lucide-react';
import { THEME_ACCENTS, soundManager } from '../utils/assets';
import { AppUser } from '../firebase';
import { UserAvatar } from './UserAvatar';
import { getUserRankInfo } from '../utils/rules';

interface SettingsModalProps {
  currentUser: AppUser;
  theme: 'dark' | 'light' | 'midnight';
  setTheme: (t: 'dark' | 'light' | 'midnight') => void;
  accent: string;
  setAccent: (a: string) => void;
  onClose: () => void;
  onLogout: () => void;
  onSwitchAccount: (username: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  theme,
  setTheme,
  accent,
  setAccent,
  onClose,
  onLogout,
  onSwitchAccount
}) => {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isSoundEnabled());
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const localAccounts: string[] = (() => {
    try {
      const s = localStorage.getItem('aurachat_saved_accounts');
      return s ? JSON.parse(s) : [currentUser.username];
    } catch {
      return [currentUser.username];
    }
  })();

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
    if (next) {
      soundManager.playMessage();
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        new Notification('AuraChat', {
          body: 'Уведомления успешно включены!',
          icon: '/favicon.ico'
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 text-zinc-900 dark:text-zinc-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold">Настройки</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Персонализация внешнего вида и звуков</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Закрыть окно"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm">
          
          {/* Current Profile Card with Rank */}
          {(() => {
            const rankMeta = getUserRankInfo(currentUser);
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar avatar={currentUser.avatar} name={currentUser.username} size="md" isOnline={true} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight truncate">
                          {currentUser.displayName || currentUser.username}
                        </p>
                        <span className={rankMeta.badgeClass}>
                          {rankMeta.badgeText}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">@{currentUser.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1 flex-shrink-0 border border-rose-200/50 dark:border-rose-900/50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </button>
                </div>

                {/* Rank explanation card */}
                <div className={`p-3 rounded-2xl border text-xs ${
                  rankMeta.rank === 'admin'
                    ? 'bg-violet-50/60 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50 text-violet-900 dark:text-violet-200'
                    : rankMeta.rank === 'chosen'
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-950 dark:text-amber-200'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Award className="w-4 h-4 text-violet-500" />
                    <span>Звание: {rankMeta.title}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {rankMeta.rank === 'admin' && '✦ Создатель платформы: полные права управления и эксклюзивная публикация в канале обновлений.'}
                    {rankMeta.rank === 'chosen' && '⭐ Вы получили статус «Избранный», так как Администратор (@admin) ответил на ваше сообщение!'}
                    {rankMeta.rank === 'regular' && '👤 Обычное звание участника. Если @admin ответит вам в чате, вы мгновенно получите статус «Избранный»!'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Theme Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Тема оформления
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Светлая</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Тёмная</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('midnight')}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  theme === 'midnight'
                    ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Midnight (OLED)</span>
              </button>
            </div>
          </div>

          {/* Accent Colors */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Акцентный цвет интерфейса
            </label>
            <div className="flex items-center gap-3">
              {THEME_ACCENTS.map((item) => {
                const isActive = accent === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAccent(item.id)}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs ${
                      isActive ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: item.hex }}
                    title={item.name}
                  >
                    {isActive && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications & Sounds */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold">Звуковые эффекты</p>
                  <p className="text-[11px] text-zinc-400">Звуки сообщений и входа пользователей</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => soundManager.playMessage()}
                  className="text-[11px] px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                >
                  Тест
                </button>
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                    soundEnabled ? 'bg-violet-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                  aria-label="Переключить звук"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Browser push notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Браузерные уведомления</p>
                  <p className="text-[11px] text-zinc-400">
                    Статус: {notificationPermission === 'granted' ? 'Включены' : 'Выключены'}
                  </p>
                </div>
              </div>

              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium"
                >
                  Включить
                </button>
              ) : (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Активны
                </span>
              )}
            </div>
          </div>

          {/* Device Account Switcher */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-violet-500" />
                <span>Аккаунты на этом устройстве ({localAccounts.length}/2)</span>
              </label>
            </div>

            <div className="space-y-1.5">
              {localAccounts.map((acc) => {
                const isCurrent = acc === currentUser.username;
                return (
                  <div
                    key={acc}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                      isCurrent
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">@{acc}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 font-semibold">
                          текущий
                        </span>
                      )}
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onSwitchAccount(acc)}
                        className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                      >
                        Переключиться
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finished Product Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/60 dark:to-zinc-800/30 border border-zinc-200/80 dark:border-zinc-700/80 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>AuraChat Messenger</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                v2.4.0 Final
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Готовая защищенная платформа мгновенных сообщений. Облачная синхронизация, каналы вещания и персонализированные звания.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
