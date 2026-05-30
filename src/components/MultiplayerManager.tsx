import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { io, Socket } from 'socket.io-client';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGLTF, Text } from '@react-three/drei';

function NetworkCar({ transform, username, color = '#ff0000' }: any) {
  const { scene } = useGLTF('/models/car_default.glb');
  const carScene = React.useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && 'color' in mesh.material) {
          const mat = (mesh.material as THREE.Material).clone();
          const isWheel = child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire') || child.name.toLowerCase().includes('cylinder');
          if (!isWheel) {
            (mat as any).color.set(color);
          }
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, color]);

  // Smooth interpolation without memory leaks (pre-allocate objects)
  const groupRef = useRef<any>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Update target vectors from transform
    targetPos.current.set(...transform.position as [number, number, number]);
    targetQuat.current.set(...transform.rotation as [number, number, number, number]);

    // Interpolate position and rotation to smooth out 30FPS ticks
    const currentPos = groupRef.current.translation();
    const currentQuat = groupRef.current.rotation();
    
    const nextPos = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).lerp(targetPos.current, 10 * delta);
    const nextQuat = new THREE.Quaternion(currentQuat.x, currentQuat.y, currentQuat.z, currentQuat.w).slerp(targetQuat.current, 10 * delta);
    
    groupRef.current.setNextKinematicTranslation(nextPos);
    groupRef.current.setNextKinematicRotation(nextQuat);
  });

  return (
    <RigidBody 
      ref={groupRef} 
      type="kinematicPosition" 
      colliders="cuboid" 
      name={`car_${username}`}
      position={transform.position} 
      rotation={transform.rotation}
    >
      <primitive object={carScene} />
      <Text 
        position={[0, 2.5, 0]} 
        fontSize={0.8} 
        color="#ffffff" 
        outlineWidth={0.05} 
        outlineColor="#000000"
      >
        {username || 'Player'}
      </Text>
    </RigidBody>
  );
}

export function MultiplayerManager({ myCarRef, myUsername }) {
  const [players, setPlayers] = useState<Record<string, any>>({});
  const socketRef = useRef<Socket | null>(null);
  const serverId = typeof window !== 'undefined' ? sessionStorage.getItem('currentServer') : null;

  useEffect(() => {
    if (!serverId) return;
    
    const socket = io();
    socketRef.current = socket;
    
    // When joining, send equipped color
    const userStore = localStorage.getItem('user-storage');
    let myColor = '#ffffff';
    if (userStore) {
       try { myColor = JSON.parse(userStore).state.user.equippedColor; } catch(e){}
    }

    socket.emit('join_game', serverId, { username: myUsername, color: myColor });

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
         [data.id]: { ...prev[data.id], transform: data.transform, color: data.color || prev[data.id]?.color }
       }));
    });

    socket.on('player_shot', (data) => {
       window.dispatchEvent(new CustomEvent('network-player-shoot', { detail: data }));
    });
    
    socket.on('player_hit', (data) => {
       // if we are the target, take damage!
       if (data.target === myUsername) {
          window.dispatchEvent(new CustomEvent('network-player-hit', { detail: data }));
       }
    });

    socket.on('player_killed', (data) => {
       window.dispatchEvent(new CustomEvent('network-player-killed', { detail: data }));
    });

    const handleLocalShoot = (e: any) => {
       socket.emit('player_shoot', serverId, e.detail);
    };
    const handleLocalHit = (e: any) => {
       socket.emit('player_hit', serverId, { shooter: myUsername, ...e.detail });
    };
    const handleLocalDeath = (e: any) => {
       socket.emit('player_killed', serverId, { victim: myUsername, ...e.detail });
    };
    
    window.addEventListener('local-player-shoot', handleLocalShoot);
    window.addEventListener('local-player-hit', handleLocalHit);
    window.addEventListener('local-player-died', handleLocalDeath);

    return () => { 
      window.removeEventListener('local-player-shoot', handleLocalShoot);
      window.removeEventListener('local-player-hit', handleLocalHit);
      window.removeEventListener('local-player-died', handleLocalDeath);
      socket.disconnect(); 
    };
  }, [serverId, myUsername]);

  const lastSyncTime = useRef(0);
  
  useFrame((state) => {
    if (!socketRef.current || !myCarRef.current || !serverId) return;
    
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
        return <NetworkCar key={p.id} transform={p.transform} username={p.username} color={p.color} />;
      })}
    </>
  );
}
