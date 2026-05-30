'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { ShoppingCart, Flame, Star, Zap, Wind } from 'lucide-react';
import { playHover, playClickConfirm, playSuccess } from '@/utils/sound';
import { useUserStore } from '@/store/useUserStore';

type Category = 'Featured' | 'Trails' | 'Explosions' | 'Horns';

export default function StorePage() {
  React.useEffect(() => {
    window.location.href = '/garage';
  }, []);
  
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto flex items-center justify-center">
      <h1 className="text-white text-2xl font-bold">Redirigiendo a Garage & Store...</h1>
    </div>
  );
}
