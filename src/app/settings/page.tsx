'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { Settings as SettingsIcon, Monitor, Volume2, Gamepad2, Shield, Eye, Undo2 } from 'lucide-react';
import { playHover, playClickConfirm, playSuccess } from '@/utils/sound';

type SettingsTab = 'Account' | 'Graphics' | 'Audio' | 'Controls' | 'Privacy';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Graphics');
  const [masterVolume, setMasterVolume] = useState(80);
  const [graphicsQuality, setGraphicsQuality] = useState('High');

  const tabs = [
    { id: 'Account', icon: Shield },
    { id: 'Graphics', icon: Monitor },
    { id: 'Audio', icon: Volume2 },
    { id: 'Controls', icon: Gamepad2 },
    { id: 'Privacy', icon: Eye },
  ] as const;

  const handleSave = () => {
    playSuccess();
    // Save logic here
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-5xl mx-auto flex flex-col">
      <Navbar />

      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-mangi-panel border border-mangi-border flex items-center justify-center">
          <SettingsIcon className="text-mangi-orange" />
        </div>
        <h1 className="text-3xl font-black">SETTINGS</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { playClickConfirm(); setActiveTab(tab.id); }}
                onMouseEnter={playHover}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all text-left ${
                  isActive 
                    ? 'bg-mangi-panel text-mangi-text-primary border border-mangi-border shadow-[inset_4px_0_0_var(--color-mangi-orange)]' 
                    : 'text-mangi-text-secondary hover:text-mangi-text-primary hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-mangi-orange' : ''} />
                {tab.id}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <GlassCard className="flex-1 p-8 min-h-[500px] flex flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                
                {activeTab === 'Graphics' && (
                  <>
                    <div>
                      <h3 className="text-xl font-bold mb-4">Graphics Quality</h3>
                      <div className="flex gap-4">
                        {['Low', 'Medium', 'High', 'Ultra'].map((q) => (
                          <button
                            key={q}
                            onClick={() => { playClickConfirm(); setGraphicsQuality(q); }}
                            onMouseEnter={playHover}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all border ${
                              graphicsQuality === q 
                                ? 'bg-mangi-orange/20 text-mangi-orange border-mangi-orange shadow-[0_0_15px_rgba(255,159,28,0.3)]' 
                                : 'bg-mangi-panel text-mangi-text-secondary border-mangi-border hover:bg-white/10'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 rounded-lg bg-mangi-bg-secondary/50 border border-mangi-border">
                        <div>
                          <p className="font-bold">Motion Blur</p>
                          <p className="text-sm text-mangi-text-secondary">Enable cinematic blur during high speeds.</p>
                        </div>
                        <div className="w-12 h-6 bg-mangi-panel rounded-full border border-mangi-border relative cursor-pointer" onClick={playClickConfirm}>
                          <div className="w-5 h-5 bg-mangi-text-secondary rounded-full absolute left-[2px] top-[1px] transition-all" />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 rounded-lg bg-mangi-bg-secondary/50 border border-mangi-border">
                        <div>
                          <p className="font-bold">Screen Shake</p>
                          <p className="text-sm text-mangi-text-secondary">Camera effects on impacts and explosions.</p>
                        </div>
                        <div className="w-12 h-6 bg-mangi-orange rounded-full border border-mangi-orange relative cursor-pointer" onClick={playClickConfirm}>
                          <div className="w-5 h-5 bg-white rounded-full absolute right-[2px] top-[1px] transition-all shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'Audio' && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">Master Volume</h3>
                        <span className="text-mangi-orange font-bold">{masterVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={masterVolume} 
                        onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                        className="w-full h-2 bg-mangi-panel rounded-lg appearance-none cursor-pointer accent-mangi-orange"
                      />
                    </div>
                  </>
                )}

                {(activeTab === 'Account' || activeTab === 'Controls' || activeTab === 'Privacy') && (
                  <div className="text-center py-20 text-mangi-text-muted">
                    <p>Settings for {activeTab} will appear here.</p>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pt-6 mt-6 border-t border-mangi-border flex justify-between items-center">
            <GlowButton variant="secondary" className="gap-2">
              <Undo2 size={16} /> Restore Defaults
            </GlowButton>
            <GlowButton variant="mango" onClick={handleSave}>
              Save Changes
            </GlowButton>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
