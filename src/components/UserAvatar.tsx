import React from 'react';
import { AVATAR_PRESETS } from '../utils/assets';

interface UserAvatarProps {
  avatar?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar = 'av1',
  name,
  size = 'md',
  isOnline,
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-13 h-13 text-xl',
    xl: 'w-18 h-18 text-2xl'
  };

  const badgeSize = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-1.5',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-3.5 h-3.5 ring-2'
  };

  const preset = AVATAR_PRESETS.find(p => p.id === avatar);
  const isCustomUrl = avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image'));

  return (
    <div className={`relative inline-flex flex-shrink-0 select-none ${className}`}>
      {isCustomUrl ? (
        <img
          src={avatar}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
        />
      ) : preset ? (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${preset.bg} flex items-center justify-center font-medium text-white shadow-2xs`}
        >
          <span>{preset.value}</span>
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-2xs tracking-wider`}
        >
          <span>{name ? name.slice(0, 2).toUpperCase() : 'AC'}</span>
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-white dark:ring-zinc-950 ${badgeSize[size]} ${
            isOnline ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'
          }`}
          title={isOnline ? 'В сети' : 'Не в сети'}
        />
      )}
    </div>
  );
};
