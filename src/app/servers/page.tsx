'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { Search, Globe, Users, Lock, Unlock, Zap, Signal } from 'lucide-react';
import { playHover, playClickConfirm, playNotification } from '@/utils/sound';
import { MangiLogo } from '@/components/MangiLogo';

export default function ServerBrowserPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [joinPin, setJoinPin] = useState('');
  const [hostPrivacy, setHostPrivacy] = useState('Público');
  const [hostPin, setHostPin] = useState('');
  const servers = [
    { id: 1, name: 'MANGI Chaos Official #1', region: 'US East', players: 8, maxPlayers: 12, ping: 24, mode: 'Chaos Survival', isPrivate: false, friends: ['@nico'] },
    { id: 2, name: 'EU Let\'s Crash', region: 'Europe', players: 11, maxPlayers: 12, ping: 38, mode: 'Chaos Survival', isPrivate: false, friends: [] },
    { id: 3, name: 'Tournament Practice', region: 'US West', players: 4, maxPlayers: 8, ping: 45, mode: 'Team Chaos', isPrivate: true, friends: [] },
    { id: 4, name: 'Crazy Bananas Only', region: 'SA', players: 12, maxPlayers: 12, ping: 12, mode: 'Banana Rain 24/7', isPrivate: false, friends: ['@mateo', '@valen'] },
    { id: 5, name: 'MANGI Chaos Official #2', region: 'US East', players: 2, maxPlayers: 12, ping: 25, mode: 'Chaos Survival', isPrivate: false, friends: [] },
  ];

  const filteredServers = servers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleJoinClick = (server: any) => {
    playClickConfirm();
    if (server.isPrivate) {
      setSelectedServer(server);
      setJoinModalOpen(true);
      setJoinPin('');
    } else {
      handleJoin(server);
    }
  };

  const handleJoin = (server: any) => {
    playNotification();
    window.location.href = '/play';
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col relative">
      {/* Background Glow */}
      <div className="absolute top-[30%] left-[10%] w-[500px] h-[500px] bg-mangi-orange/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-mangi-red/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <Navbar />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-mangi-gold to-mangi-orange mb-2 flex items-center gap-4">
            <Globe className="text-mangi-orange" size={32} />
            SERVER BROWSER
          </h1>
          <p className="text-mangi-text-secondary">Find a match or create your own private arena.</p>
        </div>
        <GlowButton variant="mango" size="lg" className="hidden md:flex" onClick={() => setIsHostModalOpen(true)}>
          CREATE PRIVATE ROOM
        </GlowButton>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-1/4 flex flex-col gap-4">
          <GlassCard className="p-4">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mangi-text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search servers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-mangi-bg-secondary/50 border border-mangi-border rounded-lg py-2 pl-10 pr-4 text-mangi-text-primary focus:outline-none focus:border-mangi-orange transition-colors"
              />
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-mangi-text-secondary uppercase mb-3">Region</h3>
                <div className="flex flex-col gap-2">
                  {['Any', 'US East', 'US West', 'Europe', 'SA'].map((region, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 rounded border border-mangi-border group-hover:border-mangi-orange flex items-center justify-center transition-colors">
                        {i === 0 && <div className="w-2 h-2 bg-mangi-orange rounded-sm" />}
                      </div>
                      <span className="text-mangi-text-primary group-hover:text-white transition-colors">{region}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-mangi-text-secondary uppercase mb-3">Game Mode</h3>
                <div className="flex flex-col gap-2">
                  {['Any', 'Chaos Survival', 'Team Chaos', 'No Weapons'].map((mode, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 rounded border border-mangi-border group-hover:border-mangi-orange flex items-center justify-center transition-colors">
                        {i === 0 && <div className="w-2 h-2 bg-mangi-orange rounded-sm" />}
                      </div>
                      <span className="text-mangi-text-primary group-hover:text-white transition-colors">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Server List */}
        <div className="w-full lg:w-3/4 flex flex-col gap-4">
          <AnimatePresence>
            {filteredServers.map((server, i) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <GlassCard interactive className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center group">
                  <div className="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${server.isPrivate ? 'bg-mangi-bg-secondary border-mangi-border' : 'bg-mangi-orange/10 border-mangi-orange/30 shadow-[inset_0_0_10px_rgba(255,159,28,0.2)]'}`}>
                      {server.isPrivate ? <Lock className="text-mangi-text-muted" /> : <MangiLogo size="sm" />}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold group-hover:text-mangi-orange transition-colors">{server.name}</h3>
                        {server.friends.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-mangi-leaf/20 text-mangi-leaf border border-mangi-leaf/30">
                            {server.friends.length} Friends
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-mangi-text-secondary mt-1">
                        <span className="flex items-center gap-1"><Zap size={14} /> {server.mode}</span>
                        <span className="flex items-center gap-1"><Globe size={14} /> {server.region}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <Users size={16} className={server.players === server.maxPlayers ? 'text-mangi-danger' : 'text-mangi-text-primary'} />
                        <span className={`font-bold ${server.players === server.maxPlayers ? 'text-mangi-danger' : 'text-mangi-text-primary'}`}>
                          {server.players} <span className="text-mangi-text-secondary">/ {server.maxPlayers}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-mangi-success">
                        <Signal size={12} /> {server.ping}ms
                      </div>
                    </div>

                    <GlowButton 
                      variant={server.players === server.maxPlayers ? 'secondary' : 'primary'}
                      className="min-w-[100px]"
                      onClick={() => handleJoinClick(server)}
                    >
                      {server.players === server.maxPlayers ? 'FULL' : 'JOIN'}
                    </GlowButton>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
            
            {filteredServers.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="py-20 text-center flex flex-col items-center justify-center text-mangi-text-muted"
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 grayscale opacity-50">
                  <MangiLogo size="md" />
                </div>
                <p className="text-lg">No servers found matching your criteria.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CREATE SERVER MODAL */}
      {isHostModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-950 border border-mangi-orange/50 p-8 rounded-3xl shadow-[0_0_40px_rgba(249,115,22,0.2)] max-w-md w-full"
          >
            <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-6">Hostear <span className="text-mangi-orange">Partida</span></h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Nombre del Servidor</label>
                <input 
                  type="text" 
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors"
                  defaultValue={`Lobby Mangi`}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Modo de Juego</label>
                <select id="servers-host-mode-select" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                  <option>Deathmatch (Todos vs Todos)</option>
                  <option>Team Deathmatch</option>
                  <option>Supervivencia (Meteoritos)</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Mapa Inicial</label>
                <select id="servers-host-map-select" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                  <option>Arena Clásica</option>
                  <option>Cyberpunk City</option>
                  <option>Lava Volcano</option>
                  <option>Neon Tron</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Max Jugadores</label>
                  <input type="number" defaultValue={12} min={2} max={24} className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors" />
                </div>
                <div className="flex-1">
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Privacidad</label>
                  <select 
                    value={hostPrivacy}
                    onChange={(e) => setHostPrivacy(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors"
                  >
                    <option>Público</option>
                    <option>Privado (Con PIN)</option>
                  </select>
                </div>
              </div>
              {hostPrivacy === 'Privado (Con PIN)' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">PIN del Servidor</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 1234" 
                    value={hostPin}
                    onChange={(e) => setHostPin(e.target.value)}
                    maxLength={10}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors" 
                  />
                </motion.div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Rotación de Mapas</label>
                  <select id="servers-host-map-rotation" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                    <option value="all">Rotar todos los mapas</option>
                    <option value="single">Jugar solo en el seleccionado</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Tiempo de Juego</label>
                  <select id="servers-host-time-limit" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                    <option value="180">3 Minutos</option>
                    <option value="300">5 Minutos</option>
                    <option value="600">10 Minutos</option>
                    <option value="infinite">Infinito</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase cursor-pointer">
                  <input type="checkbox" id="servers-host-infinite-ammo" className="accent-mangi-orange w-4 h-4" />
                  Munición Infinita
                </label>
                <div className="flex-1 flex flex-col justify-center">
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block flex justify-between">
                    Gravedad
                  </label>
                  <input type="range" id="servers-host-gravity" min="0.1" max="3" step="0.1" defaultValue="1" className="w-full accent-mangi-orange" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsHostModalOpen(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">CANCELAR</button>
              <GlowButton variant="mango" className="w-full py-3 flex-1" onClick={() => {
                 const mapSelect = document.getElementById('servers-host-map-select') as HTMLSelectElement;
                 const modeSelect = document.getElementById('servers-host-mode-select') as HTMLSelectElement;
                 const mapRotation = document.getElementById('servers-host-map-rotation') as HTMLSelectElement;
                 const timeLimit = document.getElementById('servers-host-time-limit') as HTMLSelectElement;
                 const infiniteAmmo = document.getElementById('servers-host-infinite-ammo') as HTMLInputElement;
                 const gravity = document.getElementById('servers-host-gravity') as HTMLInputElement;
                 
                 localStorage.setItem('mangiHostSettings', JSON.stringify({
                   map: mapSelect?.value || 'Arena Clásica',
                   mode: modeSelect?.value || 'Deathmatch',
                   privacy: hostPrivacy,
                   pin: hostPin,
                   mapRotation: mapRotation?.value || 'all',
                   timeLimit: timeLimit?.value,
                   infiniteAmmo: infiniteAmmo?.checked || false,
                   gravity: parseFloat(gravity?.value || '1'),
                 }));
                 window.location.href = `/play`;
              }}>INICIAR HOST</GlowButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* JOIN PIN MODAL */}
      {joinModalOpen && selectedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-6">
              <Lock className="text-mangi-orange" size={24} />
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest leading-none">SERVER PRIVADO</h2>
                <p className="text-zinc-500 text-xs font-bold uppercase mt-1">{selectedServer.name}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Ingresa el PIN</label>
              <input 
                type="text" 
                placeholder="PIN" 
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                maxLength={10}
                className="w-full bg-black border border-zinc-800 rounded-lg p-4 text-center text-2xl font-mono text-white outline-none focus:border-mangi-orange transition-colors" 
                autoFocus
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setJoinModalOpen(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">CANCELAR</button>
              <GlowButton variant="mango" className="w-full py-3 flex-1" onClick={() => {
                if (joinPin.trim() !== '') {
                  handleJoin(selectedServer);
                } else {
                  playNotification(); // Maybe an error sound later
                }
              }}>UNIRSE</GlowButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
