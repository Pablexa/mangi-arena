'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Coins, Car, MessageSquare, Ban, RefreshCcw, Eye, Lock } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { useUserStore } from '@/store/useUserStore';

import { io, Socket } from 'socket.io-client';

export default function AdminTrollPanel() {
  const { user } = useUserStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  // Estados de admin
  const [selectedTarget, setSelectedTarget] = useState('all');
  const [coinAmount, setCoinAmount] = useState(1000);
  const [announcementText, setAnnouncementText] = useState('');

  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = io();
    socketRef.current = socket;

    socket.emit('get_admin_data');
    socket.on('admin_data', (data) => {
      setActiveRooms(data.rooms);
      setOnlinePlayers(data.players);
    });

    const interval = setInterval(() => {
      socket.emit('get_admin_data');
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.username !== 'x') {
      setError('Acceso denegado: Tu cuenta no tiene permisos de administrador (Necesitas llamarte "X").');
      return;
    }
    if (passwordInput === 'toiletmango67') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Contraseña incorrecta.');
    }
  };

  const executeAction = (action: string, extraData: any = {}) => {
    if (!socketRef.current) return;
    socketRef.current.emit('admin_action', { action, target: selectedTarget, ...extraData });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans">
        <GlassCard className="max-w-md w-full p-8 relative overflow-hidden border-red-500/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          <div className="flex flex-col items-center mb-6">
            <ShieldAlert className="text-red-500 w-16 h-16 mb-4" />
            <h1 className="text-2xl font-black text-white uppercase tracking-widest text-center">
              Panel de <span className="text-red-500">Administración</span>
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Contraseña de Admin</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 pl-10 text-white outline-none focus:border-red-500 transition-colors"
                  placeholder="********"
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
            <GlowButton variant="danger" className="w-full py-3" onClick={() => { }}>
              ACCEDER AL PANEL
            </GlowButton>
          </form>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <ShieldAlert className="text-red-500 w-12 h-12" />
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-widest">
              PANEL TROLL <span className="text-red-500">SUPREMO</span>
            </h1>
            <p className="text-zinc-400">Control total sobre el servidor y los jugadores. Todo en tiempo real.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Salas y Objetivos */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="p-6 border-cyan-500/30">
              <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                <Eye className="text-cyan-400" /> Salas Activas
              </h2>
              <div className="space-y-3">
                {activeRooms.map(room => (
                  <div key={room.id} className="bg-black/50 p-3 rounded-lg border border-zinc-800 flex justify-between items-center cursor-pointer hover:border-cyan-500 transition-colors">
                    <div>
                      <p className="text-white font-bold text-sm">{room.id}</p>
                      <p className="text-zinc-500 text-xs">{room.map} - {room.players} jug.</p>
                    </div>
                    <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded uppercase">Espectar</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6 border-purple-500/30">
              <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                <Users className="text-purple-400" /> Objetivo
              </h2>
              <select
                className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-purple-500 transition-colors mb-4"
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
              >
                <option value="all">TODOS LOS JUGADORES (GLOBAL)</option>
                <option value="room-123">Sala ROOM-123</option>
                <option value="MangiDev">Usuario: MangiDev</option>
                <option value="RocketPro">Usuario: RocketPro</option>
              </select>
              <p className="text-xs text-zinc-500">Las acciones de la derecha se aplicarán al objetivo seleccionado.</p>
            </GlassCard>
          </div>

          {/* Columna Derecha: Acciones Troll */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Monedas */}
              <GlassCard className="p-6 border-yellow-500/30 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase mb-2 flex items-center gap-2">
                    <Coins className="text-yellow-400" /> Manipular Monedas
                  </h2>
                  <input
                    type="number"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(parseInt(e.target.value) || 0)}
                    className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white outline-none mb-3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => executeAction('add_coins', { amount: coinAmount })} className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50 p-2 rounded font-bold text-sm transition-colors">
                    + DAR REAL
                  </button>
                  <button onClick={() => executeAction('fake_coins', { amount: coinAmount })} className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/50 p-2 rounded font-bold text-sm transition-colors">
                    + DAR FAKE (TROLL)
                  </button>
                  <button onClick={() => executeAction('remove_coins', { amount: coinAmount })} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 p-2 rounded font-bold text-sm transition-colors col-span-2">
                    - QUITAR
                  </button>
                </div>
              </GlassCard>

              {/* Modelos de Auto */}
              <GlassCard className="p-6 border-blue-500/30 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white uppercase mb-2 flex items-center gap-2">
                    <Car className="text-blue-400" /> Cambiar Vehículo
                  </h2>
                  <p className="text-xs text-zinc-400 mb-4">Forzar el modelo de auto del objetivo en tiempo real.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => executeAction('set_car_model', { model: 'caldi' })} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/50 p-3 rounded font-bold uppercase transition-colors">
                    Transformar en "CALDI"
                  </button>
                  <button onClick={() => executeAction('set_car_model', { model: 'default' })} className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-600 p-2 rounded font-bold text-xs uppercase transition-colors mt-2">
                    <RefreshCcw className="inline w-3 h-3 mr-1" /> Revertir Cambios
                  </button>
                </div>
              </GlassCard>

              {/* Anuncios */}
              <GlassCard className="p-6 border-orange-500/30 md:col-span-2">
                <h2 className="text-lg font-bold text-white uppercase mb-2 flex items-center gap-2">
                  <MessageSquare className="text-orange-400" /> Jumpscare / Anuncio Gigante
                </h2>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Escribe el mensaje gigante para asustar..."
                    className="flex-1 bg-black border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-orange-500"
                  />
                  <button onClick={() => { executeAction('announcement', { text: announcementText }); setAnnouncementText(''); }} className="bg-orange-500 hover:bg-orange-400 text-black px-6 rounded-lg font-black uppercase transition-colors">
                    Enviar
                  </button>
                </div>
              </GlassCard>

              {/* Bans Troll */}
              <GlassCard className="p-6 border-red-500/30 md:col-span-2">
                <h2 className="text-lg font-bold text-white uppercase mb-2 flex items-center gap-2">
                  <Ban className="text-red-500" /> Fake Bans y Desconexión
                </h2>
                <div className="flex gap-4">
                  <button onClick={() => executeAction('fake_ban')} className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50 p-3 rounded font-bold uppercase transition-colors">
                    Fake Ban (Pantallazo Rojo)
                  </button>
                  <button onClick={() => executeAction('crash_client')} className="flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-600 p-3 rounded font-bold uppercase transition-colors">
                    Cerrar Juego (Crash Client)
                  </button>
                </div>
              </GlassCard>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
