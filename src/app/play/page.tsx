'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { Loader2, Maximize } from 'lucide-react';
import { playHover, playClickConfirm, playNotification } from '@/utils/sound';

import { WebGLDemo } from '@/components/WebGLDemo';

export default function PlayPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedMap, setSelectedMap] = useState('Arena Clásica');
  const [ping, setPing] = useState(12);
  const MAPS = ['Arena Clásica', 'Cyberpunk City', 'Lava Volcano', 'Neon Tron'];

  useEffect(() => {
    // Verificar si el usuario está en un servidor (ha clickeado JUGAR o CREAR)
    const currentServer = sessionStorage.getItem('currentServer');
    if (!currentServer) {
      window.location.href = '/servers';
      return;
    }

    // Prevenir 2 partidas a la vez usando BroadcastChannel
    const channel = new BroadcastChannel('mangi_game_channel');
    
    // Alguien más pregunta si estamos jugando, le decimos que sí
    channel.onmessage = (e) => {
      if (e.data === 'check_active') {
        channel.postMessage('already_playing');
      } else if (e.data === 'already_playing') {
        // Alguien más respondió que ya está jugando, nos vamos
        alert("Ya tienes una partida abierta en otra pestaña. Cierra esta para continuar.");
        window.location.href = '/servers';
      }
    };
    
    // Preguntamos si hay alguien más jugando
    channel.postMessage('check_active');

    const interval = setInterval(() => {
      const start = performance.now();
      fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
        .then(() => setPing(Math.round(performance.now() - start)))
        .catch(() => setPing(Math.round(12 + Math.random() * 5)));
    }, 2000);
    
    return () => {
      clearInterval(interval);
      channel.close();
    };
  }, []);

  useEffect(() => {
    // Simulador de carga de Unity WebGL
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsLoading(false);
            playNotification();
          }, 500);
          return 100;
        }
        return p + Math.floor(Math.random() * 15);
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleFullscreen = () => {
    playClickConfirm();
    const elem = document.getElementById("game-container");
    if (elem?.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 flex flex-col relative">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full">
        
        <div className="w-full flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black text-white italic tracking-wider">MODO <span className="text-mangi-orange">DE PRUEBA</span></h1>
          
          {/* Map selection removed for final version */}
        </div>

        <GlassCard className="w-full aspect-video p-1 flex flex-col overflow-hidden relative group" id="game-container">
          
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-mangi-bg-primary z-10">
              <div className="w-24 h-24 relative mb-8">
                <div className="absolute inset-0 border-4 border-mangi-border rounded-full" />
                <div 
                  className="absolute inset-0 border-4 border-mangi-orange rounded-full border-t-transparent animate-spin" 
                  style={{ animationDuration: '1s' }} 
                />
                <div className="absolute inset-0 flex items-center justify-center font-black text-mangi-orange text-xl">
                  {Math.min(100, progress)}%
                </div>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">LOADING MANGI ENGINE</h2>
              <p className="text-mangi-text-secondary">Downloading WebGL Assets...</p>
            </div>
          ) : (
            <>
              <WebGLDemo selectedMap={selectedMap} />
              
              {/* UI Overlay de la Web para el juego */}
              <button 
                onClick={handleFullscreen}
                onMouseEnter={playHover}
                className="absolute bottom-4 right-4 bg-black/50 hover:bg-mangi-orange text-white p-3 rounded-lg backdrop-blur opacity-0 group-hover:opacity-100 transition-all z-20"
              >
                <Maximize size={20} />
              </button>
            </>
          )}

        </GlassCard>

        {!isLoading && (
          <div className="mt-6 flex items-center justify-between w-full px-4">
             <div className="flex items-center gap-4 text-sm text-mangi-text-secondary">
               <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-mangi-leaf animate-pulse" /> Connected to São Paulo</span>
               <span>Ping: {ping}ms</span>
             </div>
             <p className="text-mangi-text-muted text-xs">Press ESC to exit fullscreen</p>
          </div>
        )}

      </div>
    </div>
  );
}
