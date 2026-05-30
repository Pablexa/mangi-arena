'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Zap } from 'lucide-react';
import { MangiLogo } from './MangiLogo';

export const HUDPanel = () => {
  const [hp, setHp] = useState(100);
  const [nitro, setNitro] = useState(0);
  const [superCharge, setSuperCharge] = useState(false);

  // Simulate gameplay logic for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      setNitro((prev) => {
        const next = prev + 5;
        if (next >= 100 && prev < 100) {
          setSuperCharge(true);
          setTimeout(() => { setSuperCharge(false); setNitro(0); }, 3000);
        }
        return next > 100 ? 100 : next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none p-6 flex flex-col justify-between font-sans">
      
      {/* Top Left: Event Warning & Logo */}
      <div className="flex justify-between items-start">
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4 bg-mangi-panel backdrop-blur-md p-3 rounded-xl border border-mangi-border shadow-lg"
        >
          <div className="w-10 h-10 opacity-70">
            <MangiLogo size="sm" />
          </div>
          <div className="h-8 w-[1px] bg-mangi-border" />
          <div className="text-white">
            <p className="text-xs text-mangi-text-secondary uppercase tracking-widest font-bold">Current Event</p>
            <p className="text-mangi-red font-black flex items-center gap-2">
              <ShieldAlert size={16} /> METEOR RAIN
            </p>
          </div>
        </motion.div>

        {/* Top Right: Score / Kill Feed */}
        <div className="flex flex-col items-end gap-2">
          <div className="bg-mangi-panel backdrop-blur-md px-4 py-2 rounded-lg border border-mangi-border text-right shadow-lg">
            <p className="text-xs text-mangi-text-secondary uppercase font-bold">Survivors</p>
            <p className="text-2xl font-black text-white">4 / 12</p>
          </div>
        </div>
      </div>

      {/* Bottom: Player Stats (HP & Nitro) */}
      <div className="flex justify-between items-end">
        
        {/* Bottom Left: HP & Armor */}
        <div className="w-64">
           <div className="flex justify-between items-end mb-1">
             <span className="text-white font-bold uppercase tracking-widest text-sm">HP</span>
             <span className="text-mangi-text-primary font-black text-2xl">{hp}</span>
           </div>
           <div className="h-4 w-full bg-mangi-bg-secondary rounded-full overflow-hidden border border-mangi-border shadow-lg">
             <motion.div 
               className="h-full bg-mangi-leaf"
               animate={{ width: `${hp}%` }}
               transition={{ duration: 0.3 }}
             />
           </div>
        </div>

        {/* Bottom Right: Nitro / Super Charge */}
        <div className="w-80 flex flex-col items-end">
           {superCharge && (
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.8, opacity: 0 }}
               className="mb-2 text-mangi-orange font-black text-3xl italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,159,28,0.8)]"
             >
               SUPER CHARGE
             </motion.div>
           )}
           <div className="w-full">
             <div className="flex justify-between items-end mb-1">
               <span className="text-mangi-orange font-black text-xl flex items-center gap-1">
                 <Zap size={20} className={superCharge ? "animate-pulse" : ""} />
                 {nitro}%
               </span>
               <span className="text-white font-bold uppercase tracking-widest text-sm">Nitro</span>
             </div>
             <div className="h-6 w-full bg-mangi-bg-secondary rounded-full overflow-hidden border-2 border-mangi-bg-primary shadow-lg relative">
               <motion.div 
                 className={`h-full ${superCharge ? 'bg-mangi-red' : 'bg-gradient-to-r from-mangi-orange to-mangi-gold'}`}
                 animate={{ width: `${nitro}%` }}
                 transition={{ ease: "linear", duration: 0.5 }}
               />
               {/* Super Charge threshold indicator */}
               <div className="absolute top-0 bottom-0 left-[75%] w-1 bg-white/30" />
             </div>
           </div>
        </div>
      </div>
      
      {/* Super Charge Screen Overlay */}
      {superCharge && (
        <motion.div 
           className="absolute inset-0 border-8 border-mangi-orange/50 shadow-[inset_0_0_150px_rgba(255,159,28,0.4)] pointer-events-none -z-10"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
        />
      )}

    </div>
  );
};
