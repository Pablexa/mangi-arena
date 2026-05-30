'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { MangiLogo } from '@/components/MangiLogo';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { playHover, playClickConfirm, playSuccess } from '@/utils/sound';
import Link from 'next/link';

import { useUserStore } from '@/store/useUserStore';

export default function LoginPage() {
  const router = useRouter();
  const loginToStore = useUserStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickConfirm();
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }
      
      // Update global state
      loginToStore({
        id: data.user.id,
        username: data.user.username,
        level: data.user.level || 1,
        xp: data.user.xp || 0,
        coins: data.user.coins || 0
      });

      playSuccess();
      router.push('/dashboard');
    } catch (error: any) {
      alert(error.message); // Placeholder error UI
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animated Glows */}
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-mangi-orange/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-fast" />
      <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-mangi-red/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[url('/branding/grid.svg')] bg-center opacity-5 pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 sm:p-10 border-t-4 border-t-mangi-orange shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <div className="flex flex-col items-center mb-8">
            <MangiLogo size="lg" className="mb-6" />
            <h1 className="text-3xl font-black text-white">WELCOME BACK</h1>
            <p className="text-mangi-text-secondary mt-2 text-center">
              Login to access your garage and dominate the chaotic arena.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-mangi-text-secondary uppercase tracking-widest">
                Email / Username
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-mangi-text-muted group-focus-within:text-mangi-orange transition-colors" size={20} />
                <input 
                  type="text" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}

                  className="w-full bg-mangi-bg-secondary border border-mangi-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-mangi-orange focus:shadow-[0_0_15px_rgba(255,159,28,0.2)] transition-all"
                  placeholder="racer@mangi.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-mangi-text-secondary uppercase tracking-widest">
                  Password
                </label>
                <Link href="#" className="text-xs text-mangi-orange hover:text-mangi-gold transition-colors font-bold">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-mangi-text-muted group-focus-within:text-mangi-orange transition-colors" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}

                  className="w-full bg-mangi-bg-secondary border border-mangi-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-mangi-orange focus:shadow-[0_0_15px_rgba(255,159,28,0.2)] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <GlowButton 
              type="submit" 
              variant="mango" 
              className="w-full py-4 text-lg mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="mr-2" size={20} /> LOGIN TO MANGI
                </>
              )}
            </GlowButton>

          </form>

          <div className="mt-8 text-center text-sm text-mangi-text-secondary border-t border-mangi-border pt-6">
            Don't have an account?{' '}
            <Link 
              href="/register" 
              className="text-mangi-orange font-bold hover:text-mangi-gold transition-colors"
              onClick={playClickConfirm}
            >
              Create Account
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
