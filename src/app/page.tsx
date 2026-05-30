'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlowButton } from '@/components/GlowButton';
import { GlassCard } from '@/components/GlassCard';
import { Play, Shield, Zap, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MangiLogo } from '@/components/MangiLogo';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background with animated glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
         <motion.div 
           className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-mangi-orange/10 rounded-full blur-[120px]"
           animate={{
             scale: [1, 1.1, 1],
             opacity: [0.3, 0.5, 0.3],
           }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
         />
         <motion.div 
           className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-mangi-red/10 rounded-full blur-[100px]"
           animate={{
             scale: [1, 1.2, 1],
             opacity: [0.2, 0.4, 0.2],
           }}
           transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
         />
         <motion.div 
           className="absolute top-[10%] right-[20%] w-[400px] h-[400px] bg-mangi-leaf/10 rounded-full blur-[90px]"
           animate={{
             scale: [1, 1.3, 1],
             opacity: [0.1, 0.3, 0.1],
           }}
           transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
         />
         {/* Grid overlay */}
         <div className="absolute inset-0 bg-[url('/branding/grid.svg')] bg-center opacity-5" />
      </div>

      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center pt-24 px-4 sm:px-8 text-center max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl flex flex-col items-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
            className="mb-8"
          >
            <MangiLogo size="xl" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
            WELCOME TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-mangi-red via-mangi-orange to-mangi-gold">MANGI</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-mangi-text-secondary mb-10 max-w-2xl mx-auto">
            The ultimate chaotic multiplayer racing combat game. Survive, destroy, and dominate the arena.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <GlowButton size="lg" variant="mango" onClick={() => router.push('/dashboard')}>
              <Play className="fill-current" />
              PLAY NOW
            </GlowButton>
            <GlowButton size="lg" variant="primary" onClick={() => router.push('/register')}>
              CREATE ACCOUNT
            </GlowButton>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 w-full"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <GlassCard className="p-8 text-left group" interactive>
             <div className="w-14 h-14 rounded-2xl bg-mangi-panel border border-mangi-border flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-mangi-orange transition-all duration-300 shadow-[0_0_15px_rgba(255,159,28,0)] group-hover:shadow-[0_0_15px_rgba(255,159,28,0.3)]">
                <Zap className="text-mangi-orange" size={28} />
             </div>
             <h3 className="text-2xl font-bold mb-3">Super Charge</h3>
             <p className="text-mangi-text-secondary leading-relaxed">Boost for 3 seconds to enter Super Charge state and demolish any car in your path.</p>
          </GlassCard>

          <GlassCard className="p-8 text-left group" interactive>
             <div className="w-14 h-14 rounded-2xl bg-mangi-panel border border-mangi-border flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-mangi-leaf transition-all duration-300 shadow-[0_0_15px_rgba(59,170,53,0)] group-hover:shadow-[0_0_15px_rgba(59,170,53,0.3)]">
                <Shield className="text-mangi-leaf" size={28} />
             </div>
             <h3 className="text-2xl font-bold mb-3">Custom Loadouts</h3>
             <p className="text-mangi-text-secondary leading-relaxed">Customize your white car with nitro trails, colors, explosions and ridiculous hats.</p>
          </GlassCard>

          <GlassCard className="p-8 text-left group" interactive>
             <div className="w-14 h-14 rounded-2xl bg-mangi-panel border border-mangi-border flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-mangi-red transition-all duration-300 shadow-[0_0_15px_rgba(201,42,29,0)] group-hover:shadow-[0_0_15px_rgba(201,42,29,0.3)]">
                <Target className="text-mangi-red" size={28} />
             </div>
             <h3 className="text-2xl font-bold mb-3">Random Events</h3>
             <p className="text-mangi-text-secondary leading-relaxed">Survive meteor rains, lava floors and slippery bananas. Every 20 seconds is a new nightmare.</p>
          </GlassCard>
        </motion.div>
      </div>

      <footer className="w-full border-t border-mangi-border bg-mangi-bg-primary/50 py-8 text-center mt-20 text-mangi-text-muted">
        <p>© 2026 MANGI Platform. Build your chaos.</p>
      </footer>
    </main>
  );
}
