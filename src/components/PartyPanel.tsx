'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronUp, ChevronDown, Plus, X, MessageSquare, Send } from 'lucide-react';
import { playHover, playClickConfirm, playNotification } from '@/utils/sound';
import { useUserStore } from '@/store/useUserStore';
import io, { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

export const PartyPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useUserStore();
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inicializar Socket.io
    const socket = io(window.location.origin);
    socketRef.current = socket;

    socket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      if (!isOpen) playNotification(); // Notify if panel is closed
      
      // Auto-scroll
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen]);

  const togglePanel = () => {
    playClickConfirm();
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !user) return;

    socketRef.current?.emit('send_message', {
      sender: user.username,
      content: chatInput.trim()
    });
    
    setChatInput('');
  };

  // Mock data for UI
  const partyMembers = user ? [
    { id: user.id, name: user.username, isLeader: true, status: 'In Lobby' },
  ] : [];

  return (
    <div className="fixed bottom-0 right-8 z-50 flex flex-col items-end">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-80 bg-mangi-panel backdrop-blur-xl border border-mangi-border rounded-t-xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col mb-2 h-[450px]"
          >
            {/* Party Section */}
            <div className="p-4 border-b border-mangi-border bg-mangi-bg-primary/50 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm uppercase tracking-widest text-mangi-orange flex items-center gap-2">
                  <Users size={16} /> GLOBAL CHAT
                </h3>
              </div>
              
              <div className="space-y-2">
                {partyMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-mangi-border">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-md bg-mangi-bg-secondary flex items-center justify-center font-bold text-xs border border-mangi-border">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      {member.isLeader && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-mangi-gold rounded-full shadow-[0_0_5px_rgba(255,209,102,0.8)] border border-mangi-bg-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-mangi-orange">{member.name}</div>
                      <div className="text-xs text-mangi-text-secondary">{member.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-mangi-text-muted opacity-50">
                  <MessageSquare size={32} className="mb-2" />
                  <p className="text-xs">No messages yet.<br/>Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === user?.username ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-mangi-text-secondary mb-0.5">{msg.sender} • {msg.timestamp}</span>
                    <div className={`px-3 py-1.5 rounded-lg text-sm max-w-[85%] ${
                      msg.sender === user?.username 
                        ? 'bg-mangi-orange text-mangi-bg-primary font-bold rounded-tr-sm' 
                        : 'bg-mangi-bg-secondary text-white border border-mangi-border rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Party Chat Input */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-mangi-border bg-mangi-bg-primary/80 flex gap-2 shrink-0">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={user ? "Type a message..." : "Login to chat"} 
                disabled={!user}
                className="flex-1 bg-transparent border-none text-sm text-mangi-text-primary focus:outline-none px-2"
              />
              <button 
                type="submit"
                disabled={!user || !chatInput.trim()}
                className="p-1.5 text-mangi-text-secondary hover:text-mangi-orange disabled:opacity-50 disabled:hover:text-mangi-text-secondary transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button 
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={togglePanel}
        className={`flex items-center gap-3 px-6 py-3 rounded-t-xl font-bold transition-all border border-b-0 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] ${
          isOpen 
            ? 'bg-mangi-orange border-mangi-orange text-mangi-bg-primary' 
            : 'bg-mangi-panel backdrop-blur-md border-mangi-border text-mangi-text-primary hover:bg-mangi-panel-hover hover:border-mangi-orange/50'
        }`}
      >
        <div className="flex items-center gap-2">
           <MessageSquare size={18} className={isOpen ? 'text-mangi-bg-primary' : 'text-mangi-orange'} />
           CHAT
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && !isOpen && (
            <span className="w-2 h-2 rounded-full bg-mangi-red animate-pulse mr-1" />
          )}
          {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </motion.button>
    </div>
  );
};
