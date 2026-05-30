'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { MangiLogo } from '@/components/MangiLogo';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { playHover, playClickConfirm, playSuccess } from '@/utils/sound';
import Link from 'next/link';

import { useUserStore } from '@/store/useUserStore';

export default function RegisterPage() {
  const router = useRouter();
  const loginToStore = useUserStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simple password strength visual
  const getStrength = (pass: string) => {
    if (pass.length === 0) return 0;
    if (pass.length < 6) return 1;
    if (pass.length < 10) return 2;
    return 3;
  };

  const strength = getStrength(password);
  const strengthColors = ['bg-mangi-bg-secondary', 'bg-mangi-danger', 'bg-mangi-orange', 'bg-mangi-leaf'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickConfirm();
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }
      
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
      <div className="absolute top-[30%] left-[10%] w-[600px] h-[600px] bg-mangi-orange/10 rounded-full blur-[150px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-mangi-leaf/5 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse-fast" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 sm:p-10 border-t-4 border-t-mangi-leaf shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <div className="flex flex-col items-center mb-8">
            <MangiLogo size="lg" className="mb-6" />
            <h1 className="text-3xl font-black text-white">JOIN THE CHAOS</h1>
            <p className="text-mangi-text-secondary mt-2 text-center">
              Create your account to start playing and customizing your car.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-mangi-text-secondary uppercase tracking-widest">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-mangi-text-muted group-focus-within:text-mangi-leaf transition-colors" size={20} />
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}

                  className="w-full bg-mangi-bg-secondary border border-mangi-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-mangi-leaf focus:shadow-[0_0_15px_rgba(59,170,53,0.2)] transition-all"
                  placeholder="PlayerOne"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-mangi-text-secondary uppercase tracking-widest">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-mangi-text-muted group-focus-within:text-mangi-leaf transition-colors" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}

                  className="w-full bg-mangi-bg-secondary border border-mangi-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-mangi-leaf focus:shadow-[0_0_15px_rgba(59,170,53,0.2)] transition-all"
                  placeholder="racer@mangi.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-mangi-text-secondary uppercase tracking-widest">
                Password
              </label>
              <div className="relative group mb-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-mangi-text-muted group-focus-within:text-mangi-leaf transition-colors" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}

                  className="w-full bg-mangi-bg-secondary border border-mangi-border rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-mangi-leaf focus:shadow-[0_0_15px_rgba(59,170,53,0.2)] transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="flex items-center justify-between px-1">
                  <div className="flex gap-1 flex-1 mr-4">
                    {[1, 2, 3].map((level) => (
                      <div 
                        key={level} 
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${strength >= level ? strengthColors[strength] : 'bg-mangi-bg-secondary'}`} 
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-bold ${strength === 3 ? 'text-mangi-leaf' : strength === 2 ? 'text-mangi-orange' : 'text-mangi-danger'}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            <GlowButton 
              type="submit" 
              variant="leaf" 
              className="w-full py-4 text-lg mt-6"
              disabled={isLoading || strength === 0}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="mr-2" size={20} /> CREATE ACCOUNT
                </>
              )}
            </GlowButton>

          </form>

          <div className="mt-8 text-center text-sm text-mangi-text-secondary border-t border-mangi-border pt-6">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-mangi-leaf font-bold hover:text-white transition-colors"
              onClick={playClickConfirm}
            >
              Login Here
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
