import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { io, Socket } from 'socket.io-client';
import * as THREE from 'three';

export function MultiplayerManager({ myCarRef, myUsername }) {
  const [players, setPlayers] = useState<Record<string, any>>({});
  const socketRef = useRef<Socket | null>(null);
  const serverId = typeof window !== 'undefined' ? sessionStorage.getItem('currentServer') : null;

  useEffect(() => {
    if (!serverId) return;
    
    const socket = io();
    socketRef.current = socket;
    
    socket.emit('join_game', serverId, { username: myUsername });

    socket.on('player_joined', (data) => {
       setPlayers(prev => ({ ...prev, [data.id]: data }));
    });
    
    socket.on('player_left', (id) => {
       setPlayers(prev => {
         const next = { ...prev };
         delete next[id];
         return next;
       });
    });

    socket.on('player_updated', (data) => {
       setPlayers(prev => ({
         ...prev,
         [data.id]: { ...prev[data.id], transform: data.transform }
       }));
    });

    return () => { socket.disconnect(); };
  }, [serverId, myUsername]);

  // Sync our position 30 times per second
  const lastSyncTime = useRef(0);
  
  useFrame((state) => {
    if (!socketRef.current || !myCarRef.current || !serverId) return;
    
    // Throttle updates to ~30 FPS to save bandwidth
    if (state.clock.elapsedTime - lastSyncTime.current > 1/30) {
      const t = myCarRef.current.translation();
      const r = myCarRef.current.rotation();
      socketRef.current.emit('player_update', serverId, { 
        transform: { position: [t.x, t.y, t.z], rotation: [r.x, r.y, r.z, r.w] } 
      });
      lastSyncTime.current = state.clock.elapsedTime;
    }
  });

  return (
    <>
      {Object.values(players).map((p: any) => {
        if (!p.transform) return null;
        return (
          <group key={p.id} position={p.transform.position} quaternion={p.transform.rotation}>
            {/* Simple representation of another player */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[2, 1, 4]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.2} />
            </mesh>
            {/* Floating Name */}
            <mesh position={[0, 3, 0]}>
               <planeGeometry args={[p.username?.length * 0.4 || 3, 1]} />
               <meshBasicMaterial color="black" opacity={0.5} transparent />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
