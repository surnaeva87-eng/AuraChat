import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { DeviceRecord, MAX_ACCOUNTS_PER_DEVICE, toggleSingleUserReaction } from './utils/rules';

// 1. Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Structured Error Handling as specified in Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

// 3. Connection Test on App Boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently in offline mode or waiting for initial sync.');
      return false;
    }
    return true;
  }
}

// Data Interfaces
export interface AppUser {
  id: string; // username
  username: string;
  displayName: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  statusText?: string; // Custom text status
  statusReactions?: Record<string, string[] | number>; // Reactions to user's status: emoji -> userIds or legacy count
  rank?: 'admin' | 'chosen' | 'regular'; // User title/rank
  title?: string; // Display title: Создатель | Избранный | Участник
  chosenAt?: number;
  lastSeen: number;
  createdAt: number;
  deviceId: string;
  passwordHash?: string;
}

export interface ChatMessageReply {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  type: 'text' | 'system';
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  replyTo?: ChatMessageReply;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdBy: string;
  members: string[];
  createdAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
  type?: 'group' | 'channel'; // 'group' = all write, 'channel' = selected writers only
  allowedWriters?: string[];
  isOfficial?: boolean;
  isPinned?: boolean;
}

export const OFFICIAL_UPDATES_CHANNEL: ChatGroup = {
  id: 'channel_aurachat_updates',
  name: 'Обновления AuraChat',
  description: 'Официальный канал новостей, релизов и обновлений AuraChat',
  avatar: 'g1',
  createdBy: 'admin',
  members: ['admin'],
  createdAt: 1700000000000,
  lastMessage: 'Добро пожаловать в официальный канал AuraChat! Здесь публикуются важные новости платформы.',
  lastMessageTime: Date.now(),
  type: 'channel',
  allowedWriters: ['admin'],
  isOfficial: true,
  isPinned: true
};

export interface PresenceEvent {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  type: 'join' | 'leave' | 'rank_promoted';
  timestamp: number;
  rankTitle?: string;
}

// 4. Presence and User Methods
export async function registerOrLoginUser(userData: {
  username: string;
  passwordHash: string;
  avatar: string;
  displayName?: string;
  deviceId: string;
  isNewUser: boolean;
}): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const userId = userData.username.trim().toLowerCase();
  const userRef = doc(db, 'users', userId);

  try {
    const existingSnap = await getDoc(userRef);

    if (userData.isNewUser) {
      if (existingSnap.exists()) {
        return { success: false, error: 'Пользователь с таким логином уже зарегистрирован! Войдите или выберите другое имя.' };
      }

      const deviceRef = doc(db, 'devices', userData.deviceId);
      const deviceSnap = await getDoc(deviceRef);
      let deviceData: DeviceRecord = {
        deviceId: userData.deviceId,
        accountCount: 0,
        accounts: []
      };

      if (deviceSnap.exists()) {
        deviceData = deviceSnap.data() as DeviceRecord;
      }

      if (deviceData.accountCount >= MAX_ACCOUNTS_PER_DEVICE) {
        return {
          success: false,
          error: `Превышен лимит: на этом устройстве уже зарегистрировано максимум ${MAX_ACCOUNTS_PER_DEVICE} аккаунта (${deviceData.accounts.join(', ')}). Войдите в один из них.`
        };
      }

      const isAdmin = userId === 'admin';
      const newUser: AppUser = {
        id: userId,
        username: userData.username.trim(),
        displayName: userData.displayName || userData.username.trim(),
        avatar: userData.avatar,
        status: 'online',
        statusText: 'На связи',
        statusReactions: {},
        rank: isAdmin ? 'admin' : 'regular',
        title: isAdmin ? 'Создатель' : 'Участник',
        lastSeen: Date.now(),
        createdAt: Date.now(),
        deviceId: userData.deviceId,
        passwordHash: userData.passwordHash
      };

      await setDoc(userRef, newUser);

      const updatedAccounts = Array.from(new Set([...deviceData.accounts, userData.username.trim()]));
      await setDoc(deviceRef, {
        deviceId: userData.deviceId,
        accountCount: updatedAccounts.length,
        accounts: updatedAccounts,
        updatedAt: Date.now()
      });

      return { success: true, user: newUser };
    } else {
      if (!existingSnap.exists()) {
        return { success: false, error: 'Пользователь не найден. Проверьте имя или зарегистрируйтесь.' };
      }

      const found = existingSnap.data() as AppUser;
      if (found.passwordHash && found.passwordHash !== userData.passwordHash) {
        return { success: false, error: 'Неверный пароль. Попробуйте еще раз.' };
      }

      const isAdmin = userId === 'admin';
      const userRank = isAdmin ? 'admin' : (found.rank || 'regular');
      const userTitle = isAdmin ? 'Создатель' : (found.title || 'Участник');

      await updateDoc(userRef, {
        status: 'online',
        lastSeen: Date.now(),
        rank: userRank,
        title: userTitle
      });

      return { success: true, user: { ...found, status: 'online', rank: userRank, title: userTitle } };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    return { success: false, error: 'Ошибка соединения с базой данных.' };
  }
}

export async function broadcastPresence(user: AppUser, type: 'join' | 'leave' = 'join') {
  try {
    const presenceRef = collection(db, 'presence_events');
    await addDoc(presenceRef, {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      type,
      timestamp: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'presence_events');
  }
}

export async function updateUserOnlineStatus(userId: string, status: 'online' | 'offline' | 'away') {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status,
      lastSeen: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// Update User Custom Text Status
export async function updateUserStatusText(userId: string, statusText: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      statusText: statusText.trim().slice(0, 60),
      lastSeen: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

// React to another user's status (Single reaction per user!)
export async function reactToUserStatus(targetUserId: string, emoji: string, currentUserId: string) {
  try {
    const userRef = doc(db, 'users', targetUserId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppUser;
    const rawReactions = data.statusReactions || {};
    const normalized: Record<string, string[]> = {};

    for (const [key, val] of Object.entries(rawReactions)) {
      if (Array.isArray(val)) {
        normalized[key] = [...val];
      }
    }

    const updated = toggleSingleUserReaction(normalized, emoji, currentUserId);

    await updateDoc(userRef, {
      statusReactions: updated
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
  }
}

// Promote user to "Избранный" rank when Admin replies/writes to them
export async function promoteUserToChosen(userId: string) {
  const normalized = userId.trim().toLowerCase();
  if (normalized === 'admin') return;

  try {
    const userRef = doc(db, 'users', normalized);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data() as AppUser;
    if (data.rank === 'chosen') return; // already chosen

    await updateDoc(userRef, {
      rank: 'chosen',
      title: 'Избранный',
      chosenAt: Date.now()
    });

    // Broadcast rank promotion announcement
    const presenceRef = collection(db, 'presence_events');
    await addDoc(presenceRef, {
      userId: normalized,
      username: data.username,
      avatar: data.avatar,
      type: 'rank_promoted',
      rankTitle: 'Избранный',
      timestamp: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${normalized}`);
  }
}

// 5. Send message
export async function sendChatMessage(msg: Omit<ChatMessage, 'id'>) {
  try {
    const isSenderAdmin = msg.senderId.trim().toLowerCase() === 'admin' ||
      msg.senderName.trim().toLowerCase() === 'admin';

    // Extra safety: block non-admins from writing to official updates channel
    if (msg.chatId === 'channel_aurachat_updates') {
      if (!isSenderAdmin) {
        throw new Error('Только администратор (@admin) может публиковать сообщения в канале обновлений.');
      }
    }

    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      ...msg,
      reactions: {}
    });

    if (!msg.chatId.startsWith('dm_')) {
      const groupRef = doc(db, 'groups', msg.chatId);
      await updateDoc(groupRef, {
        lastMessage: `${msg.senderName}: ${msg.text.slice(0, 80)}`,
        lastMessageTime: msg.timestamp
      });
    } else {
      // Direct message: if Admin sends a message, recipient gets "Избранный" rank!
      if (isSenderAdmin) {
        const parts = msg.chatId.replace('dm_', '').split('_');
        const recipientId = parts.find(p => p.toLowerCase() !== 'admin');
        if (recipientId) {
          await promoteUserToChosen(recipientId);
        }
      }
    }

    // If Admin replied to someone's message in ANY chat, promote recipient to "Избранный"
    if (isSenderAdmin && msg.replyTo?.senderId) {
      if (msg.replyTo.senderId.trim().toLowerCase() !== 'admin') {
        await promoteUserToChosen(msg.replyTo.senderId);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'messages');
    throw err;
  }
}

// Toggle Message Reaction (Single reaction per user!)
export async function toggleMessageReaction(messageId: string, emoji: string, userId: string) {
  try {
    const msgRef = doc(db, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data() as ChatMessage;
    const currentReactions = data.reactions || {};
    const updated = toggleSingleUserReaction(currentReactions, emoji, userId);

    await updateDoc(msgRef, {
      reactions: updated
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
  }
}

// 6. Create Group or Channel
export async function createChatGroup(groupData: Omit<ChatGroup, 'id' | 'createdAt'>): Promise<string> {
  try {
    const groupsRef = collection(db, 'groups');
    const docRef = await addDoc(groupsRef, {
      ...groupData,
      createdAt: Date.now(),
      lastMessage: groupData.type === 'channel' ? 'Канал создан' : 'Группа создана',
      lastMessageTime: Date.now()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'groups');
    throw err;
  }
}

// 7. Realtime subscriptions
export function subscribeToUsers(callback: (users: AppUser[]) => void) {
  const usersRef = collection(db, 'users');
  return onSnapshot(usersRef, (snapshot) => {
    const list: AppUser[] = [];
    snapshot.forEach((d) => {
      const u = { ...d.data(), id: d.id } as AppUser;
      const lower = (u.username || '').toLowerCase();
      // Filter out test user Alex if any remains
      if (lower !== 'алекс' && lower !== 'alex' && lower !== 'alex_pro' && d.id !== 'алекс' && d.id !== 'alex') {
        list.push(u);
      }
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'users');
  });
}

export function subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void) {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc'),
    limit(150)
  );

  return onSnapshot(q, (snapshot) => {
    const list: ChatMessage[] = [];
    snapshot.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as ChatMessage);
    });
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'messages');
  });
}

export function subscribeToGroups(callback: (groups: ChatGroup[]) => void) {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const list: ChatGroup[] = [];
    let hasOfficial = false;

    snapshot.forEach((d) => {
      const g = { ...d.data(), id: d.id } as ChatGroup;
      // Filter out 'Команда AuraChat'
      if (g.name?.includes('Команда AuraChat') || g.name === 'Команда') {
        return;
      }
      if (g.id === OFFICIAL_UPDATES_CHANNEL.id || g.isOfficial) {
        hasOfficial = true;
        list.push({ ...OFFICIAL_UPDATES_CHANNEL, ...g, isOfficial: true, isPinned: true });
      } else {
        list.push(g);
      }
    });

    if (!hasOfficial) {
      list.unshift(OFFICIAL_UPDATES_CHANNEL);
    } else {
      list.sort((a, b) => {
        if (a.isPinned || a.isOfficial) return -1;
        if (b.isPinned || b.isOfficial) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }

    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'groups');
    callback([OFFICIAL_UPDATES_CHANNEL]);
  });
}

export function subscribeToPresenceEvents(callback: (event: PresenceEvent) => void) {
  const now = Date.now() - 5000;
  const presenceRef = collection(db, 'presence_events');
  const q = query(presenceRef, where('timestamp', '>=', now), orderBy('timestamp', 'desc'), limit(1));

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback({ ...change.doc.data(), id: change.doc.id } as PresenceEvent);
      }
    });
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'presence_events');
  });
}
