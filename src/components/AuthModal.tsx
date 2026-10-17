import React, { useState, useEffect } from 'react';
import { User, Lock, Sparkles, AlertCircle, ShieldAlert, Check, Laptop } from 'lucide-react';
import { AVATAR_PRESETS } from '../utils/assets';
import { validateUsername, MAX_ACCOUNTS_PER_DEVICE } from '../utils/rules';
import { registerOrLoginUser, AppUser } from '../firebase';
import { UserAvatar } from './UserAvatar';

interface AuthModalProps {
  deviceId: string;
  onSuccess: (user: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ deviceId, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('av1');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local accounts on this device
  const [localAccounts, setLocalAccounts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurachat_saved_accounts');
      if (saved) {
        setLocalAccounts(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const val = validateUsername(username);
    if (!val.valid) {
      setErrorMessage(val.error || 'Некорректное имя пользователя');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Пароль должен содержать минимум 4 символа');
      return;
    }

    const avatar = useCustomUrl && customAvatarUrl.trim() ? customAvatarUrl.trim() : selectedAvatar;

    setLoading(true);

    try {
      const result = await registerOrLoginUser({
        username,
        passwordHash: password,
        avatar,
        displayName: displayName.trim() || username.trim(),
        deviceId,
        isNewUser: isRegister
      });

      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Ошибка авторизации');
        setLoading(false);
        return;
      }

      const updated = Array.from(new Set([...localAccounts, result.user.username]));
      localStorage.setItem('aurachat_saved_accounts', JSON.stringify(updated));
      setLocalAccounts(updated);

      onSuccess(result.user);
    } catch {
      setErrorMessage('Не удалось выполнить вход. Проверьте сеть.');
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = isRegister && localAccounts.length >= MAX_ACCOUNTS_PER_DEVICE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md overflow-hidden">
      
      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-sm max-h-[94vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xl p-5 sm:p-6 text-zinc-900 dark:text-zinc-100 overflow-y-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-4 flex-shrink-0">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600 text-white shadow-xs mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">AuraChat</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Быстрый и защищенный мессенджер
          </p>

          {/* Device Limit Badge */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
            <Laptop className="w-3 h-3 text-violet-500" />
            <span>Устройство: {localAccounts.length}/{MAX_ACCOUNTS_PER_DEVICE}</span>
          </div>
        </div>

        {/* Tab Toggle: Вход / Регистрация */}
        <div className="flex p-1 mb-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Limit Reached Warning */}
        {isLimitReached && (
          <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-semibold">Достигнут лимит на устройстве</p>
              <p className="mt-0.5 opacity-90">
                Разрешено максимум 2 аккаунта на одном браузере. Войдите в один из созданных.
              </p>
            </div>
          </div>
        )}

        {/* Saved accounts on this device */}
        {localAccounts.length > 0 && !isRegister && (
          <div className="mb-3 flex-shrink-0">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Аккаунты на этом устройстве:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {localAccounts.map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => setUsername(acc)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    username === acc
                      ? 'bg-violet-600 text-white border-violet-600 font-medium'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/80 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-violet-400'
                  }`}
                >
                  @{acc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-3 flex-1">
          
          {/* Original Avatar Presets with Gradient & Emojis */}
          {isRegister && !isLimitReached && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Выберите аватарку
                </label>
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatar={useCustomUrl && customAvatarUrl ? customAvatarUrl : selectedAvatar}
                    name={username || 'Вы'}
                    size="sm"
                  />
                  <button
                    type="button"
                    onClick={() => setUseCustomUrl(!useCustomUrl)}
                    className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {useCustomUrl ? 'Коллекция' : 'Своя ссылка'}
                  </button>
                </div>
              </div>

              {useCustomUrl ? (
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              ) : (
                <div className="grid grid-cols-8 gap-1.5 p-1.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 max-h-32 overflow-y-auto">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedAvatar === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatar(preset.id)}
                        className={`relative aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                          isSelected
                            ? 'scale-110 ring-2 ring-violet-500 shadow-sm z-10'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        } bg-gradient-to-tr ${preset.bg}`}
                        title={preset.label}
                      >
                        <span>{preset.value}</span>
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-violet-600 rounded-full flex items-center justify-center text-[7px] text-white">
                            <Check className="w-2 h-2" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Логин
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                required
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Display Name */}
          {isRegister && !isLimitReached && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Имя в чате
              </label>
              <input
                type="text"
                placeholder="Ваше имя"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isLimitReached}
            className={`w-full mt-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all shadow-md ${
              isLimitReached
                ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25 active:scale-[0.99]'
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Вход...
              </span>
            ) : isRegister ? (
              'Создать аккаунт'
            ) : (
              'Войти'
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
