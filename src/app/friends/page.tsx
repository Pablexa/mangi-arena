'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { Search, UserPlus, Users, UserX, MessageSquare, Gamepad2 } from 'lucide-react';
import { playHover, playClickConfirm, playSuccess, playError } from '@/utils/sound';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/store/useUserStore';

type Tab = 'All' | 'Online' | 'Requests' | 'Blocked';

export default function FriendsPage() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<Tab>('Online');
  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendName, setAddFriendName] = useState('');
  
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [friendData, setFriendData] = useState<{ friends: string[], pending: string[] }>({ friends: [], pending: [] });
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?.username) return;
    const s = io();
    setSocket(s);
    
    s.emit('user_online', user.username);
    
    s.on('online_users_updated', (users: string[]) => {
      setOnlineUsers(users);
    });
    
    s.on('friend_data_sync', (data) => {
      setFriendData(data || { friends: [], pending: [] });
    });
    
    return () => { s.disconnect(); };
  }, [user]);

  const friends = (friendData?.friends || []).map(f => ({
    id: f, name: f, status: onlineUsers.includes(f) ? 'Online' : 'Offline', isOnline: onlineUsers.includes(f)
  }));

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (activeTab === 'All' || (activeTab === 'Online' && f.isOnline))
  );

  const tabs: { id: Tab, label: string }[] = [
    { id: 'Online', label: 'Online' },
    { id: 'All', label: 'All Friends' },
    { id: 'Requests', label: `Pending${(friendData?.pending?.length || 0) > 0 ? ` (${friendData.pending.length})` : ''}` },
    { id: 'Blocked', label: 'Blocked' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col">
      <Navbar />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black flex items-center gap-4">
          <Users className="text-mangi-leaf" size={36} />
          FRIENDS
        </h1>
        <GlowButton variant="secondary" size="md" onClick={() => {
          const target = window.prompt("Enter friend's username:");
          if (target && target !== user?.username) {
            socket?.emit('send_friend_request', { from: user?.username, to: target });
            playSuccess();
          }
        }}>
          <UserPlus size={18} className="mr-2" /> Add Friend
        </GlowButton>
      </div>

      <GlassCard className="flex-1 flex flex-col min-h-[600px] overflow-hidden">
        {/* Header Tabs */}
        <div className="flex border-b border-mangi-border bg-mangi-bg-primary/30 px-4 pt-4 gap-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { playClickConfirm(); setActiveTab(tab.id); }}
                onMouseEnter={playHover}
                className={`relative pb-3 font-bold transition-colors ${
                  isActive ? 'text-mangi-text-primary' : 'text-mangi-text-secondary hover:text-mangi-text-primary'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div 
                    layoutId="friends-tab-indicator"
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-mangi-leaf"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        {(activeTab === 'Online' || activeTab === 'All') && (
          <div className="p-4 border-b border-mangi-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mangi-text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search friends..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-mangi-bg-secondary/50 border border-mangi-border rounded-lg py-2 pl-10 pr-4 text-mangi-text-primary focus:outline-none focus:border-mangi-leaf transition-colors"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {(activeTab === 'Online' || activeTab === 'All') && (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <div 
                      key={friend.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-white/5 hover:border-mangi-border transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-mangi-bg-secondary flex items-center justify-center font-black text-xl border border-mangi-border">
                            {friend.name.substring(0, 1).toUpperCase()}
                          </div>
                          {friend.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-mangi-leaf rounded-full border-2 border-mangi-bg-primary shadow-[0_0_8px_rgba(59,170,53,0.8)]" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{friend.name}</h3>
                          <p className={`text-sm ${friend.isOnline ? 'text-mangi-leaf' : 'text-mangi-text-muted'}`}>
                            {friend.status}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GlowButton variant="secondary" size="sm" onClick={playClickConfirm}>
                          <MessageSquare size={16} />
                        </GlowButton>
                        <GlowButton variant="secondary" size="sm" onClick={playClickConfirm}>
                          <UserPlus size={16} /> Invite to Party
                        </GlowButton>
                        {friend.isOnline && friend.status.includes('Playing') && (
                          <GlowButton variant="leaf" size="sm" onClick={() => playSuccess()}>
                            <Gamepad2 size={16} className="mr-1" /> Join Game
                          </GlowButton>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {filteredFriends.length === 0 && (
                    <div className="text-center py-20 text-mangi-text-muted">
                      No friends found matching your search.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Requests' && (
                <div className="space-y-2">
                  {(friendData?.pending || []).length > 0 ? (
                    friendData.pending.map((req, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-mangi-border bg-mangi-bg-secondary/30">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-mangi-panel flex items-center justify-center font-black text-xl border border-mangi-border">
                            {req.substring(0, 1).toUpperCase()}
                          </div>
                          <h3 className="font-bold text-lg">{req}</h3>
                        </div>
                        <div className="flex gap-2">
                          <GlowButton variant="danger" size="sm" onClick={() => {
                            socket?.emit('decline_friend_request', { from: req, to: user?.username });
                            playError();
                          }}>Decline</GlowButton>
                          <GlowButton variant="leaf" size="sm" onClick={() => {
                            socket?.emit('accept_friend_request', { from: req, to: user?.username });
                            playSuccess();
                          }}>Accept</GlowButton>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-mangi-text-muted">
                      <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
                      <p>You have no pending requests.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Blocked' && (
                <div className="text-center py-20 text-mangi-text-muted">
                  <UserX size={48} className="mx-auto mb-4 opacity-50" />
                  <p>You haven't blocked anyone.</p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
}
