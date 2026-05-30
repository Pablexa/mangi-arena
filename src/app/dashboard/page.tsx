'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { Play, Trophy, Crosshair, Users, Activity, Zap } from 'lucide-react';
import { playHover, playClickConfirm } from '@/utils/sound';

import { useUserStore } from '@/store/useUserStore';
import { getDailyMissions } from '@/utils/missions';

import { io } from 'socket.io-client';

export default function DashboardPage() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [activeServers, setActiveServers] = useState<any[]>([]);

  const fetchServers = () => {
    fetch('/api/active-servers')
      .then(res => res.json())
      .then(data => setActiveServers(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchServers();
    const socket = io();
    socket.on('rooms_updated', (rooms) => {
      setActiveServers(rooms);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const dailyMissions = getDailyMissions();

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto">
      <Navbar />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row gap-8"
      >
        {/* Left Column - User Info & Play */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <GlassCard className="p-6 relative overflow-hidden">
             {/* Level Ring background */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-mangi-orange/10 rounded-full blur-2xl pointer-events-none" />
             
             <div className="flex items-center gap-6 mb-6">
               <div className="relative w-24 h-24 rounded-2xl bg-mangi-panel border-2 border-mangi-border overflow-hidden shadow-[0_0_15px_rgba(255,159,28,0.2)]">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-mangi-orange/10 text-mangi-orange text-4xl font-black">
                      {user ? user.username.substring(0, 2).toUpperCase() : 'G'}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 w-full bg-mangi-bg-primary/80 backdrop-blur text-center text-xs py-1 font-bold text-mangi-gold border-t border-mangi-border">
                    LVL {user ? user.level : 1}
                  </div>
               </div>
               <div>
                 <h2 className="text-2xl font-black">{user ? user.username : 'Guest'}</h2>
                 <p className="text-mangi-text-secondary">@{user ? user.username.toLowerCase() : 'guest'}</p>
               </div>
             </div>

             <div className="space-y-4 mb-6">
               <div>
                 <div className="flex justify-between text-sm mb-2">
                   <span className="text-mangi-text-secondary">XP to Level {user ? user.level + 1 : 2}</span>
                   <span className="text-mangi-text-primary font-bold">{user ? user.xp : 0} / {(user ? user.level : 1) * 1000}</span>
                 </div>
                 <div className="h-2 w-full bg-mangi-bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-mangi-orange to-mangi-gold"
                      initial={{ width: 0 }}
                      animate={{ width: user ? `${(user.xp / (user.level * 1000)) * 100}%` : '0%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                 </div>
               </div>
               
               <div className="flex justify-between p-3 rounded-lg bg-mangi-bg-secondary/50 border border-mangi-border">
                 <span className="text-mangi-text-secondary">Coins</span>
                 <span className="text-mangi-gold font-black flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full bg-mangi-gold shadow-[0_0_5px_rgba(255,209,102,0.8)]" />
                   {user ? user.coins.toLocaleString() : 0}
                 </span>
               </div>
             </div>

             <Link href="/play?mode=training" className="w-full">
               <GlowButton size="lg" variant="mango" className="w-full py-4 text-xl mt-4 bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white">
                 <Play className="fill-current" size={24} />
                 TRAINING GROUND
               </GlowButton>
             </Link>
          </GlassCard>

          <GlassCard className="p-6">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <Activity className="text-mangi-orange" /> Misiones Diarias
             </h3>
             <div className="space-y-3">
               {dailyMissions.map((mission, i) => {
                 const current = user?.missionProgress?.[mission.id] || 0;
                 const complete = current >= mission.required;
                 return (
                   <div key={i} className={`p-3 rounded-lg border transition-colors ${complete ? 'bg-mangi-leaf/10 border-mangi-leaf/30' : 'bg-mangi-bg-secondary/50 border-mangi-border'}`}>
                     <div className="flex justify-between items-center text-sm">
                       <span className={complete ? 'text-mangi-text-primary' : 'text-mangi-text-secondary'}>{mission.title}</span>
                       <span className={complete ? 'text-mangi-leaf font-bold' : 'text-mangi-text-primary'}>{Math.min(current, mission.required)}/{mission.required}</span>
                     </div>
                     <div className="h-1 w-full bg-mangi-bg-secondary rounded-full overflow-hidden mt-2">
                        <div 
                          className="h-full bg-mangi-orange"
                          style={{ width: `${(Math.min(current, mission.required) / mission.required) * 100}%` }}
                        />
                     </div>
                   </div>
                 );
               })}
             </div>
          </GlassCard>
        </div>

        {/* Right Column - Stats & Active Servers */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
              <Trophy className="text-mangi-gold mb-2" />
              <span className="text-2xl font-black">{user?.stats?.wins || 0}</span>
              <span className="text-xs text-mangi-text-secondary uppercase">Wins</span>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
              <Crosshair className="text-mangi-red mb-2" />
              <span className="text-2xl font-black">{user?.stats?.eliminations || 0}</span>
              <span className="text-xs text-mangi-text-secondary uppercase">Eliminations</span>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
              <Zap className="text-mangi-electric mb-2" />
              <span className="text-2xl font-black">{user?.stats?.demolitions || 0}</span>
              <span className="text-xs text-mangi-text-secondary uppercase">Demolitions</span>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
              <Users className="text-mangi-leaf mb-2" />
              <span className="text-2xl font-black">0</span>
              <span className="text-xs text-mangi-text-secondary uppercase">Online Friends</span>
            </GlassCard>
          </div>

          {/* Active Servers */}
          <GlassCard className="p-6 flex-1 relative">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl flex items-center gap-2"><Activity className="text-mangi-orange"/> Servidores Activos</h3>
                <div className="flex gap-2">
                  <GlowButton variant="secondary" size="sm" onClick={() => setIsHostModalOpen(true)}>Crear Servidor</GlowButton>
                  <GlowButton variant="primary" size="sm" onClick={fetchServers}>Actualizar</GlowButton>
                </div>
             </div>
             
             <div className="space-y-4">
               {activeServers.length === 0 ? (
                 <p className="text-mangi-text-secondary text-sm text-center py-8">No hay servidores activos. ¡Crea uno!</p>
               ) : activeServers.map((server: any, i: number) => (
                 <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-mangi-bg-secondary/50 border border-mangi-border hover:border-mangi-orange/50 transition-colors">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 hidden sm:block">
                        <img src={server.img} alt={server.map} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-bold text-mangi-text-primary">{server.name}</h4>
                        <p className="text-sm text-mangi-text-secondary">{server.mode} • Mapa: {server.map} • Ping: {server.ping}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-sm bg-white/5 px-3 py-1 rounded-md text-mangi-text-primary border border-mangi-border">
                        {server.players}/{server.maxPlayers}
                      </div>
                      <Link href="/play" className="flex-1 sm:flex-none">
                        <GlowButton variant="primary" size="sm" className="w-full">
                          UNIRSE
                        </GlowButton>
                      </Link>
                    </div>
                 </div>
               ))}
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
                         name="roomName"
                         type="text" 
                         className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors"
                         defaultValue={`${user?.username || 'Player'}'s Lobby`}
                       />
                     </div>
                     <div>
                       <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Modo de Juego</label>
                       <select className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                         <option>Deathmatch (Todos vs Todos)</option>
                         <option>Team Deathmatch</option>
                         <option>Supervivencia (Meteoritos)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Mapa Inicial</label>
                       <select id="host-map-select" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
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
                         <select className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                           <option>Público</option>
                           <option>Privado (Con PIN)</option>
                         </select>
                       </div>
                     </div>
                     <div className="flex gap-4">
                       <div className="flex-1">
                         <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Rotación de Mapas</label>
                         <select id="host-map-rotation" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                           <option value="all">Rotar todos los mapas</option>
                           <option value="single">Jugar solo en el seleccionado</option>
                         </select>
                       </div>
                       <div className="flex-1">
                         <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Tiempo de Juego</label>
                         <select id="host-time-limit" className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-mangi-orange transition-colors">
                           <option value="180">3 Minutos</option>
                           <option value="300">5 Minutos</option>
                           <option value="600">10 Minutos</option>
                           <option value="infinite">Infinito</option>
                         </select>
                       </div>
                     </div>
                     <div className="flex gap-4">
                       <label className="flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase cursor-pointer">
                         <input type="checkbox" id="host-infinite-ammo" className="accent-mangi-orange w-4 h-4" />
                         Munición Infinita
                       </label>
                       <div className="flex-1 flex flex-col justify-center">
                         <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block flex justify-between">
                           Gravedad
                         </label>
                         <input type="range" id="host-gravity" min="0.1" max="3" step="0.1" defaultValue="1" className="w-full accent-mangi-orange" />
                       </div>
                     </div>
                   </div>

                   <div className="flex gap-4 mt-8">
                     <button onClick={() => setIsHostModalOpen(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors">CANCELAR</button>
                     <GlowButton variant="mango" className="w-full py-3 flex-1" onClick={() => {
                        const nameInput = document.querySelector('input[name="roomName"]') as HTMLInputElement;
                        const mapSelect = document.getElementById('host-map-select') as HTMLSelectElement;
                        const mapRotation = document.getElementById('host-map-rotation') as HTMLSelectElement;
                        const timeLimit = document.getElementById('host-time-limit') as HTMLSelectElement;
                        const infiniteAmmo = document.getElementById('host-infinite-ammo') as HTMLInputElement;
                        const gravity = document.getElementById('host-gravity') as HTMLInputElement;
                        
                        localStorage.setItem('mangiHostSettings', JSON.stringify({
                          map: mapSelect?.value || 'Arena Clásica',
                          mapRotation: mapRotation?.value || 'all',
                          timeLimit: timeLimit?.value,
                          infiniteAmmo: infiniteAmmo?.checked || false,
                          gravity: parseFloat(gravity?.value || '1'),
                        }));

                        const socket = io();
                        socket.emit('create_room', {
                          name: nameInput?.value || `${user?.username || 'Player'}'s Lobby`,
                          map: mapSelect?.value || 'Arena Clásica',
                          mode: 'Chaos Survival', // or grab from select if we give it an ID
                          maxPlayers: 12
                        });
                        
                        window.location.href = `/play`;
                     }}>INICIAR HOST</GlowButton>
                   </div>
                 </motion.div>
               </div>
             )}
          </GlassCard>
        </div>
      </motion.div>
    </div>
  );
}
