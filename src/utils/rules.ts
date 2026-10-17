/**
 * Pure business logic for messenger rules, device account constraints,
 * chat IDs, and formatting. Decoupled for unit testing with node:test.
 */

export interface DeviceRecord {
  deviceId: string;
  accountCount: number;
  accounts: string[];
}

export const MAX_ACCOUNTS_PER_DEVICE = 2;

/**
 * Validates if an account can be created on this device.
 */
export function canRegisterOnDevice(record: DeviceRecord | null | undefined, username: string): {
  allowed: boolean;
  reason?: string;
  currentCount: number;
} {
  const normalized = username.trim().toLowerCase();
  if (!record) {
    return { allowed: true, currentCount: 0 };
  }

  // If already registered with this exact username on this device, allow re-registration / password reset
  if (record.accounts.some(acc => acc.toLowerCase() === normalized)) {
    return { allowed: true, currentCount: record.accountCount };
  }

  if (record.accountCount >= MAX_ACCOUNTS_PER_DEVICE) {
    return {
      allowed: false,
      reason: `Превышен лимит! На одном устройстве можно создать максимум ${MAX_ACCOUNTS_PER_DEVICE} аккаунта (уже созданы: ${record.accounts.join(', ')}).`,
      currentCount: record.accountCount
    };
  }

  return { allowed: true, currentCount: record.accountCount };
}

/**
 * Deterministically generates a unique 1-on-1 direct chat ID between two users
 */
export function getDirectChatId(uid1: string, uid2: string): string {
  const sorted = [uid1.trim(), uid2.trim()].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Validates username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Имя пользователя должно содержать минимум 3 символа' };
  }
  if (trimmed.length > 25) {
    return { valid: false, error: 'Имя пользователя не должно превышать 25 символов' };
  }
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Разрешены только буквы, цифры, дефис и подчеркивание' };
  }
  return { valid: true };
}

/**
 * Generates a stable device ID or retrieves an existing one
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'mock-device-id';
  let deviceId = localStorage.getItem('aurachat_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('aurachat_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Formats relative or absolute time for chat timestamps
 */
export function formatChatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  if (isToday) {
    return `${hours}:${minutes}`;
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
}

/**
 * Toggles a user's reaction so each user can have at most ONE reaction.
 * If user already has `emoji`: removes it (toggle off).
 * If user has a different emoji: replaces it with `emoji`.
 * If user has no reaction: adds `emoji`.
 */
export function toggleSingleUserReaction(
  currentReactions: Record<string, string[]> | undefined,
  emoji: string,
  userId: string
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  let hadThisEmoji = false;

  // First copy existing and remove userId from all emojis
  if (currentReactions) {
    for (const [e, users] of Object.entries(currentReactions)) {
      if (Array.isArray(users)) {
        if (e === emoji && users.includes(userId)) {
          hadThisEmoji = true;
        }
        const filtered = users.filter(u => u !== userId);
        if (filtered.length > 0) {
          result[e] = filtered;
        }
      }
    }
  }

  // If user didn't have this emoji, add them to it
  if (!hadThisEmoji) {
    result[emoji] = [...(result[emoji] || []), userId];
  }

  return result;
}

/**
 * Checks if a user has permission to post a message in a chat or channel
 */
export function canUserWriteInChat(
  chat: {
    id?: string;
    type?: 'group' | 'channel';
    createdBy?: string;
    allowedWriters?: string[];
    isOfficial?: boolean;
  } | null,
  user: {
    id: string;
    username: string;
  } | null
): { allowed: boolean; reason?: string } {
  if (!chat || !user) return { allowed: false, reason: 'Нет доступа к чату' };

  const isGlobalAdmin = user.username.trim().toLowerCase() === 'admin';

  // Official updates channel: only @admin can write!
  if (chat.isOfficial || chat.id === 'channel_aurachat_updates') {
    if (isGlobalAdmin) return { allowed: true };
    return {
      allowed: false,
      reason: 'Только администратор (@admin) может публиковать сообщения в официальном канале.'
    };
  }

  // Regular group: all members can write
  if (!chat.type || chat.type === 'group') {
    return { allowed: true };
  }

  // Channel: only creator, global admin, or explicitly allowed writers
  if (chat.type === 'channel') {
    if (isGlobalAdmin) return { allowed: true };
    if (chat.createdBy === user.id || chat.createdBy?.toLowerCase() === user.username.toLowerCase()) {
      return { allowed: true };
    }
    if (chat.allowedWriters?.includes(user.id) || chat.allowedWriters?.includes(user.username)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Это информационный канал. Публиковать сообщения могут только авторы.'
    };
  }

  return { allowed: true };
}

export type UserRank = 'admin' | 'chosen' | 'regular';

export interface UserRankMeta {
  rank: UserRank;
  title: string;
  badgeText: string;
  badgeClass: string;
  avatarRing: string;
  description: string;
}

/**
 * Resolves user title/rank:
 * - Admin (@admin) -> 'Создатель' (✦ Создатель)
 * - Chosen (replied by admin) -> 'Избранный' (⭐ Избранный)
 * - All other users -> 'Участник' (Обычное звание)
 */
export function getUserRankInfo(user: { username?: string; rank?: string } | null | undefined): UserRankMeta {
  const username = (user?.username || '').trim().toLowerCase();

  if (username === 'admin' || user?.rank === 'admin') {
    return {
      rank: 'admin',
      title: 'Создатель',
      badgeText: 'Создатель',
      badgeClass: 'bg-violet-600 text-white font-semibold text-[10px] px-2 py-0.5 rounded-md shadow-xs',
      avatarRing: 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-zinc-900',
      description: 'Главный администратор и создатель мессенджера AuraChat'
    };
  }

  if (user?.rank === 'chosen') {
    return {
      rank: 'chosen',
      title: 'Избранный',
      badgeText: '⭐ Избранный',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 font-semibold text-[10px] px-2 py-0.5 rounded-md shadow-2xs',
      avatarRing: 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-zinc-900',
      description: 'Пользователь, удостоенный личного ответа от Администратора'
    };
  }

  return {
    rank: 'regular',
    title: 'Участник',
    badgeText: 'Участник',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-[10px] px-1.5 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60',
    avatarRing: '',
    description: 'Обычный участник платформы AuraChat'
  };
}
