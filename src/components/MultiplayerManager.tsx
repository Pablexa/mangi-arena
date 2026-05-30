import React, { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { io, Socket } from 'socket.io-client';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useGLTF, Text } from '@react-three/drei';

const WEAPON_MODELS = {
  sniper: { file: '/models/Sniper.glb', scale: 0.8 },
  shotgun: { file: '/models/Shotgun.glb', scale: 0.6 },
  revolver: { file: '/models/Revolver.glb', scale: 1.2 }
};

function NetworkCar({ socketId, transform, username, color = '#ff0000', weapon = 'sniper' }: any) {
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

  const wData = WEAPON_MODELS[weapon as keyof typeof WEAPON_MODELS] || WEAPON_MODELS.sniper;
  const weaponModel = useGLTF(wData.file);
  const weaponScene = React.useMemo(() => weaponModel.scene.clone(), [weaponModel.scene, weapon]);

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
      name={`car_${socketId}`}
      position={transform.position} 
      rotation={transform.rotation}
    >
      <primitive object={carScene} />
      <group position={[0, 0.8, -0.5]}>
        <primitive object={weaponScene} scale={wData.scale} rotation={[0, Math.PI, 0]} />
      </group>
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

export function MultiplayerManager({ myCarRef, myUsername, activeWeapon }) {
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

    socket.on('existing_players', (playersList) => {
       const initialPlayers: Record<string, any> = {};
       playersList.forEach((p: any) => {
         if (p.id !== socket.id) {
           initialPlayers[p.id] = p;
           window.dispatchEvent(new CustomEvent('network-player-joined', { detail: p }));
         }
       });
       setPlayers(prev => ({ ...prev, ...initialPlayers }));
    });

    socket.on('player_joined', (data) => {
       setPlayers(prev => ({ ...prev, [data.id]: data }));
       window.dispatchEvent(new CustomEvent('network-player-joined', { detail: data }));
    });
    
    socket.on('player_left', (id) => {
       setPlayers(prev => {
         const next = { ...prev };
         delete next[id];
         return next;
       });
       window.dispatchEvent(new CustomEvent('network-player-left', { detail: id }));
    });

    socket.on('player_updated', (data) => {
       setPlayers(prev => ({
         ...prev,
         [data.id]: { 
           ...prev[data.id], 
           transform: data.transform || prev[data.id]?.transform, 
           color: data.color || prev[data.id]?.color, 
           weapon: data.weapon || prev[data.id]?.weapon,
           isAlive: data.isAlive 
         }
       }));
    });

    socket.on('player_shot', (data) => {
       window.dispatchEvent(new CustomEvent('network-player-shoot', { detail: data }));
    });
    
    socket.on('player_hit', (data) => {
       // Check if the target is exactly this socket's ID!
       if (data.target === socket.id) {
          window.dispatchEvent(new CustomEvent('network-player-hit', { detail: data }));
       }
    });

    socket.on('player_killed', (data) => {
       window.dispatchEvent(new CustomEvent('network-player-killed', { detail: data }));
    });

    socket.on('sync_state', (data) => {
       window.dispatchEvent(new CustomEvent('network-sync-state', { detail: data }));
    });

    socket.on('map_changed', (newMap) => {
       window.dispatchEvent(new CustomEvent('network-map-changed', { detail: newMap }));
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
    const handleMapChangeRequest = (e: any) => {
       socket.emit('change_map', serverId, e.detail);
    };
    
    window.addEventListener('local-player-shoot', handleLocalShoot);
    window.addEventListener('local-player-hit', handleLocalHit);
    window.addEventListener('local-player-died', handleLocalDeath);
    window.addEventListener('request-map-change', handleMapChangeRequest);

    return () => { 
      window.removeEventListener('local-player-shoot', handleLocalShoot);
      window.removeEventListener('local-player-hit', handleLocalHit);
      window.removeEventListener('local-player-died', handleLocalDeath);
      window.removeEventListener('request-map-change', handleMapChangeRequest);
      socket.disconnect(); 
    };
  }, [serverId, myUsername]);

  const lastSyncTime = useRef(0);
  
  useFrame((state) => {
    if (!socketRef.current || !serverId) return;
    
    // Throttle updates to ~60 FPS for maximum smoothness
    if (state.clock.elapsedTime - lastSyncTime.current > 1/60) {
      if (myCarRef.current) {
        const t = myCarRef.current.translation();
        const r = myCarRef.current.rotation();
        // Read active weapon from props
        socketRef.current.emit('player_update', serverId, { 
          transform: { position: [t.x, t.y, t.z], rotation: [r.x, r.y, r.z, r.w] },
          weapon: activeWeapon,
          isAlive: true
        });
      } else {
        socketRef.current.emit('player_update', serverId, { isAlive: false });
      }
      lastSyncTime.current = state.clock.elapsedTime;
    }
  });

  return (
    <>
      {Object.values(players).map((p: any) => {
        if (!p.transform || p.isAlive === false) return null;
        return <NetworkCar key={p.id} socketId={p.id} transform={p.transform} username={p.username} color={p.color} weapon={p.weapon} />;
      })}
    </>
  );
}
