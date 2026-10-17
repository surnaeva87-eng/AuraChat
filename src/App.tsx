import { useState, useEffect, useCallback } from 'react';
import {
  AppUser,
  ChatGroup,
  ChatMessage,
  PresenceEvent,
  testConnection,
  subscribeToUsers,
  subscribeToGroups,
  subscribeToMessages,
  subscribeToPresenceEvents,
  broadcastPresence,
  updateUserOnlineStatus,
  OFFICIAL_UPDATES_CHANNEL
} from './firebase';
import { getOrCreateDeviceId, getDirectChatId } from './utils/rules';
import { soundManager } from './utils/assets';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { SettingsModal } from './components/SettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PresenceToast } from './components/PresenceToast';

export default function App() {
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Data from Firebase
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Active Chat State
  const [activeTargetUser, setActiveTargetUser] = useState<AppUser | null>(null);
  const [activeTargetGroup, setActiveTargetGroup] = useState<ChatGroup | null>(null);

  // Active direct chats list (Only show chats with engaged contacts!)
  const [activeDirectUserIds, setActiveDirectUserIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('aurachat_active_direct_users') || '[]');
    } catch {
      return [];
    }
  });

  // User Profile Modal
  const [selectedProfileUser, setSelectedProfileUser] = useState<AppUser | null>(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [presenceToastEvent, setPresenceToastEvent] = useState<PresenceEvent | null>(null);

  // Responsive mobile view
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  // Theme settings
  const [theme, setTheme] = useState<'dark' | 'light' | 'midnight'>(() => {
    return (localStorage.getItem('aurachat_theme') as 'dark' | 'light' | 'midnight') || 'dark';
  });
  const [accent, setAccent] = useState<string>(() => {
    return localStorage.getItem('aurachat_accent') || 'violet';
  });

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'midnight', 'light');
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else if (theme === 'midnight') {
      root.classList.add('dark', 'midnight');
      root.setAttribute('data-theme', 'midnight');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('aurachat_theme', theme);
  }, [theme]);

  // Apply accent setting
  useEffect(() => {
    localStorage.setItem('aurachat_accent', accent);
  }, [accent]);

  // Connection test on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Restore user from localStorage
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('aurachat_current_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr) as AppUser;
        setCurrentUser(parsed);
        updateUserOnlineStatus(parsed.id, 'online');
      } else {
        setShowAuthModal(true);
      }
    } catch {
      setShowAuthModal(true);
    }
  }, []);

  // Real-time users & sync current user profile
  useEffect(() => {
    const unsub = subscribeToUsers((allUsers) => {
      setUsers(allUsers);
      if (currentUser) {
        const updatedSelf = allUsers.find(u => u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (updatedSelf && (
          updatedSelf.rank !== currentUser.rank ||
          updatedSelf.title !== currentUser.title ||
          updatedSelf.statusText !== currentUser.statusText ||
          JSON.stringify(updatedSelf.statusReactions) !== JSON.stringify(currentUser.statusReactions)
        )) {
          setCurrentUser(prev => prev ? { ...prev, ...updatedSelf } : updatedSelf);
          localStorage.setItem('aurachat_current_user', JSON.stringify({ ...currentUser, ...updatedSelf }));
        }
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Keep open profile modal in sync with realtime user data
  useEffect(() => {
    if (selectedProfileUser) {
      const fresh = users.find(u => u.id === selectedProfileUser.id || u.username.toLowerCase() === selectedProfileUser.username.toLowerCase());
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedProfileUser)) {
        setSelectedProfileUser(fresh);
      }
    }
  }, [users, selectedProfileUser]);

  // Real-time groups
  useEffect(() => {
    const unsub = subscribeToGroups((allGroups) => {
      setGroups(allGroups);
    });
    return () => unsub();
  }, []);

  // Default to official updates channel on load if no active chat
  useEffect(() => {
    if (!activeTargetUser && !activeTargetGroup && groups.length > 0) {
      const official = groups.find(g => g.id === OFFICIAL_UPDATES_CHANNEL.id || g.isOfficial) || groups[0];
      setActiveTargetGroup(official);
    }
  }, [groups, activeTargetUser, activeTargetGroup]);

  // Real-time presence announcements & rank promotion celebratory toasts
  useEffect(() => {
    const unsub = subscribeToPresenceEvents((event) => {
      if (event.type === 'rank_promoted') {
        setPresenceToastEvent(event);
        soundManager.playMessage();
      } else if (currentUser && event.userId !== currentUser.id) {
        setPresenceToastEvent(event);
        soundManager.playUserJoined();
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Online heartbeat
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      updateUserOnlineStatus(currentUser.id, 'online');
    }, 45000);

    const handleBeforeUnload = () => {
      updateUserOnlineStatus(currentUser.id, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Active chat ID
  const activeChatId = activeTargetUser && currentUser
    ? getDirectChatId(currentUser.id, activeTargetUser.id)
    : activeTargetGroup?.id || null;

  // Real-time messages
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const unsub = subscribeToMessages(activeChatId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsub();
  }, [activeChatId]);

  // Select Direct Chat
  const handleSelectDirectChat = useCallback((targetUser: AppUser) => {
    setActiveTargetUser(targetUser);
    setActiveTargetGroup(null);
    setMobileView('chat');

    // Add to engaged direct chats list
    setActiveDirectUserIds((prev) => {
      if (!prev.includes(targetUser.id)) {
        const updated = [...prev, targetUser.id];
        try {
          localStorage.setItem('aurachat_active_direct_users', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      }
      return prev;
    });
  }, []);

  // Select Group / Channel Chat
  const handleSelectGroupChat = useCallback((group: ChatGroup) => {
    setActiveTargetGroup(group);
    setActiveTargetUser(null);
    setMobileView('chat');
  }, []);

  // Auth success
  const handleAuthSuccess = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('aurachat_current_user', JSON.stringify(user));
    setShowAuthModal(false);
    broadcastPresence(user, 'join');
  };

  // Logout
  const handleLogout = () => {
    if (currentUser) {
      updateUserOnlineStatus(currentUser.id, 'offline');
    }
    localStorage.removeItem('aurachat_current_user');
    setCurrentUser(null);
    setActiveTargetUser(null);
    setActiveTargetGroup(null);
    setShowSettingsModal(false);
    setShowAuthModal(true);
  };

  // Switch account
  const handleSwitchAccount = (targetUsername: string) => {
    const found = users.find(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (found) {
      if (currentUser) {
        updateUserOnlineStatus(currentUser.id, 'offline');
      }
      setCurrentUser(found);
      localStorage.setItem('aurachat_current_user', JSON.stringify(found));
      updateUserOnlineStatus(found.id, 'online');
      broadcastPresence(found, 'join');
      setShowSettingsModal(false);
    } else {
      setShowSettingsModal(false);
      setShowAuthModal(true);
    }
  };

  return (
    <div className={`fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden select-none font-sans ${theme === 'midnight' ? 'bg-black text-zinc-100' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'}`}>
      
      {/* Real-time Presence Toast */}
      <PresenceToast
        event={presenceToastEvent}
        onDismiss={() => setPresenceToastEvent(null)}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex h-full w-full overflow-hidden">
        
        {/* Sidebar */}
        <div className={`h-full ${mobileView === 'sidebar' ? 'flex' : 'hidden'} md:flex flex-shrink-0`}>
          {currentUser && (
            <Sidebar
              currentUser={currentUser}
              users={users}
              groups={groups}
              activeChatId={activeChatId}
              activeDirectUserIds={activeDirectUserIds}
              onSelectDirectChat={handleSelectDirectChat}
              onSelectGroupChat={handleSelectGroupChat}
              onOpenCreateGroup={() => setShowCreateGroupModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
              onViewUserProfile={(u) => setSelectedProfileUser(u)}
            />
          )}
        </div>

        {/* Chat Area */}
        <div className={`flex-1 h-full ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-col min-w-0 overflow-hidden`}>
          {currentUser ? (
            <ChatArea
              currentUser={currentUser}
              targetUser={activeTargetUser}
              targetGroup={activeTargetGroup}
              messages={messages}
              users={users}
              onBackMobile={() => setMobileView('sidebar')}
              onViewUserProfile={(u) => setSelectedProfileUser(u)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-zinc-400">
              <p className="text-xs">Войдите в аккаунт для начала общения</p>
            </div>
          )}
        </div>

      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          deviceId={deviceId}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Create Group / Channel Modal */}
      {showCreateGroupModal && currentUser && (
        <CreateGroupModal
          currentUser={currentUser}
          availableUsers={users}
          onClose={() => setShowCreateGroupModal(false)}
          onCreated={(newGroupId) => {
            setShowCreateGroupModal(false);
            const foundGroup = groups.find(g => g.id === newGroupId);
            if (foundGroup) {
              handleSelectGroupChat(foundGroup);
            }
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && currentUser && (
        <SettingsModal
          currentUser={currentUser}
          theme={theme}
          setTheme={setTheme}
          accent={accent}
          setAccent={setAccent}
          onClose={() => setShowSettingsModal(false)}
          onLogout={handleLogout}
          onSwitchAccount={handleSwitchAccount}
        />
      )}

      {/* User Profile Modal (Click on any avatar or name!) */}
      {selectedProfileUser && currentUser && (
        <UserProfileModal
          user={selectedProfileUser}
          currentUser={currentUser}
          onClose={() => setSelectedProfileUser(null)}
          onStartChat={(target) => {
            setSelectedProfileUser(null);
            handleSelectDirectChat(target);
          }}
        />
      )}

    </div>
  );
}
