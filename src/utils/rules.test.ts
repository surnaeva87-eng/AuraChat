import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRegisterOnDevice,
  getDirectChatId,
  validateUsername,
  formatChatTime,
  toggleSingleUserReaction,
  canUserWriteInChat,
  getUserRankInfo,
  MAX_ACCOUNTS_PER_DEVICE
} from './rules.ts';

test('Device account limit: allows up to 2 accounts and blocks the 3rd', () => {
  // Empty device record allows registration
  const first = canRegisterOnDevice(null, 'alex');
  assert.equal(first.allowed, true);
  assert.equal(first.currentCount, 0);

  // 1 registered account allows second
  const oneAccountRecord = {
    deviceId: 'dev_123',
    accountCount: 1,
    accounts: ['alex']
  };
  const second = canRegisterOnDevice(oneAccountRecord, 'maria');
  assert.equal(second.allowed, true);

  // 2 registered accounts blocks 3rd new account
  const twoAccountRecord = {
    deviceId: 'dev_123',
    accountCount: 2,
    accounts: ['alex', 'maria']
  };
  const third = canRegisterOnDevice(twoAccountRecord, 'ivan');
  assert.equal(third.allowed, false);
  assert.match(third.reason || '', /Превышен лимит!/);

  // Re-registering existing username on same device is allowed
  const existing = canRegisterOnDevice(twoAccountRecord, 'alex');
  assert.equal(existing.allowed, true);
});

test('Direct chat ID generation is deterministic regardless of participant order', () => {
  const id1 = getDirectChatId('user_alpha', 'user_beta');
  const id2 = getDirectChatId('user_beta', 'user_alpha');
  assert.equal(id1, id2);
  assert.equal(id1, 'dm_user_alpha_user_beta');
});

test('Username validation checks min length, max length and valid characters', () => {
  assert.equal(validateUsername('ab').valid, false);
  assert.equal(validateUsername('valid_user').valid, true);
  assert.equal(validateUsername('Иван_123').valid, true);
  assert.equal(validateUsername('invalid space').valid, false);
  assert.equal(validateUsername('user@special!').valid, false);
});

test('Format chat time outputs correct format for today', () => {
  const now = Date.now();
  const formatted = formatChatTime(now);
  assert.match(formatted, /^\d{2}:\d{2}$/);
});

test('Single reaction per user: replaces previous reaction or toggles off', () => {
  let reactions: Record<string, string[]> = {};

  // User adds heart
  reactions = toggleSingleUserReaction(reactions, '❤️', 'user1');
  assert.deepEqual(reactions['❤️'], ['user1']);

  // User clicks same heart -> removed (toggle off)
  reactions = toggleSingleUserReaction(reactions, '❤️', 'user1');
  assert.equal(reactions['❤️'], undefined);

  // User adds fire
  reactions = toggleSingleUserReaction(reactions, '🔥', 'user1');
  assert.deepEqual(reactions['🔥'], ['user1']);

  // User clicks thumbs up -> fire removed, thumbs up added!
  reactions = toggleSingleUserReaction(reactions, '👍', 'user1');
  assert.equal(reactions['🔥'], undefined);
  assert.deepEqual(reactions['👍'], ['user1']);

  // Another user can also react
  reactions = toggleSingleUserReaction(reactions, '👍', 'user2');
  assert.deepEqual(reactions['👍'], ['user1', 'user2']);
});

test('Channel write permissions: group allows all, channel restricts to authors, official channel only @admin', () => {
  const regularUser = { id: 'u1', username: 'danil' };
  const adminUser = { id: 'admin', username: 'admin' };
  const authorUser = { id: 'u2', username: 'author1' };

  // Official updates channel
  const officialChannel = { id: 'channel_aurachat_updates', isOfficial: true, type: 'channel' as const };
  assert.equal(canUserWriteInChat(officialChannel, regularUser).allowed, false);
  assert.equal(canUserWriteInChat(officialChannel, authorUser).allowed, false);
  assert.equal(canUserWriteInChat(officialChannel, adminUser).allowed, true);

  // Custom channel with allowed writers
  const customChannel = {
    id: 'ch_1',
    type: 'channel' as const,
    createdBy: 'u2',
    allowedWriters: ['u2']
  };
  assert.equal(canUserWriteInChat(customChannel, regularUser).allowed, false);
  assert.equal(canUserWriteInChat(customChannel, authorUser).allowed, true); // is creator & allowedWriter
  assert.equal(canUserWriteInChat(customChannel, adminUser).allowed, true); // admin can always write

  // Standard group allows everyone
  const standardGroup = { id: 'grp_1', type: 'group' as const };
  assert.equal(canUserWriteInChat(standardGroup, regularUser).allowed, true);
});

test('User ranks: admin is Создатель, chosen gets ⭐ Избранный, default gets Участник', () => {
  // Admin rank
  const adminRank = getUserRankInfo({ username: 'admin' });
  assert.equal(adminRank.rank, 'admin');
  assert.equal(adminRank.title, 'Создатель');
  assert.match(adminRank.badgeText, /Создатель/);

  // Chosen rank (awarded after admin replies)
  const chosenUser = { username: 'maxim', rank: 'chosen' };
  const chosenRank = getUserRankInfo(chosenUser);
  assert.equal(chosenRank.rank, 'chosen');
  assert.equal(chosenRank.title, 'Избранный');
  assert.match(chosenRank.badgeText, /⭐/);

  // Regular user (default)
  const regular = { username: 'ivan' };
  const regularRank = getUserRankInfo(regular);
  assert.equal(regularRank.rank, 'regular');
  assert.equal(regularRank.title, 'Участник');
});
