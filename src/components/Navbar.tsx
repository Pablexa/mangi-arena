'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, LayoutDashboard, Wrench, Globe, ShoppingCart, Settings, Home } from 'lucide-react';
import { playHover, playClickConfirm } from '@/utils/sound';
import { MangiLogo } from './MangiLogo';
import { useUserStore } from '@/store/useUserStore';

export const Navbar = () => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useUserStore();

  const links = [
    { href: '/dashboard', label: 'DASHBOARD', icon: Home },
    { href: '/garage', label: 'GARAGE & STORE', icon: Wrench },
    { href: '/servers', label: 'SERVERS', icon: Globe },
    { href: '/friends', label: 'FRIENDS', icon: Users },
  ];

  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-mangi-bg-primary/80 backdrop-blur-md border-b border-mangi-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="group" onClick={() => playClickConfirm()}>
          <MangiLogo size="sm" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            
            return (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => playClickConfirm()}
                className={`flex items-center gap-2 font-black tracking-widest text-sm transition-all ${
                  isActive 
                    ? 'text-mangi-orange drop-shadow-[0_0_10px_rgba(255,159,28,0.5)]' 
                    : 'text-mangi-text-secondary hover:text-white'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-mangi-orange' : ''} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User Stats / Auth */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              {/* Coins */}
              <div className="hidden sm:flex items-center gap-2 bg-mangi-bg-secondary px-3 py-1.5 rounded-lg border border-mangi-border cursor-pointer hover:border-mangi-gold transition-colors group">
                <div className="w-3 h-3 bg-mangi-gold rounded-full shadow-[0_0_5px_rgba(255,209,102,0.8)]" />
                <span className="font-bold text-mangi-gold group-hover:text-yellow-400">{user.coins.toLocaleString()}</span>
              </div>
              
              {/* User Avatar & Logout */}
              <div className="flex items-center gap-4">
                <Link href="/profile" className="flex items-center gap-3 group" onClick={() => playClickConfirm()}>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-white group-hover:text-mangi-orange transition-colors">{user.username}</div>
                    <div className="text-xs text-mangi-text-secondary">Level {user.level}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-mangi-panel border border-mangi-border flex items-center justify-center overflow-hidden relative group-hover:border-mangi-orange transition-colors">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="PFP" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-mangi-orange text-lg">{user.username.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </Link>
                
                <button 
                  onClick={() => {
                    useUserStore.getState().logout();
                    playClickConfirm();
                  }}
                  className="text-xs font-bold text-mangi-text-muted hover:text-mangi-danger transition-colors"
                >
                  LOGOUT
                </button>
              </div>
            </>
          ) : (
            <Link href="/login" onClick={() => playClickConfirm()}>
              <div className="flex items-center gap-2 font-bold text-mangi-orange hover:text-white transition-colors cursor-pointer">
                LOGIN
              </div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
