'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, Text, Preload, Trail } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, RoundCuboidCollider, useRapier } from '@react-three/rapier';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useUserStore } from '@/store/useUserStore';
import { usePlayerControls } from '@/utils/usePlayerControls';
import { sounds } from '@/utils/sound';
import { STORE_ITEMS } from '@/utils/storeItems';
import { ShieldAlert } from 'lucide-react';

export const globalCameraState = {
  isDragging: false,
  azimuth: 0,
  polar: Math.PI / 3, // 60 grados hacia abajo
  distance: 10
};

// Referencia global del turbo y vida para evitar re-renders masivos
export const turboState = {
  amount: 100
};
export const healthState = {
  amount: 100
};

// Configuraciones Globales (Ajustables con 'O')
let initialSettings = {
  graphics: 'high',
  bloom: false,
  vignette: false,
  chromaticAberration: false,
  reflections: true,
  resolution: 1, // DPR (Escala de resolución)
  fov: 45,       // Campo de visión
  turnSens: 1,
  cameraSens: 1,
  airSens: 1,
  airTurnSens: 1,
  masterVolume: 1,
  sfxVolume: 1,
};

if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('mangi-global-settings');
  if (saved) {
    try {
      initialSettings = { ...initialSettings, ...JSON.parse(saved) };
    } catch (e) {}
  }
}

export const globalSettings = initialSettings;

export const saveGlobalSettings = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mangi-global-settings', JSON.stringify(globalSettings));
  }
};

export const applyGraphicsPreset = (preset: string) => {
  globalSettings.graphics = preset;
  if (preset === 'ultra') {
    globalSettings.bloom = true;
    globalSettings.vignette = true;
    globalSettings.chromaticAberration = true;
    globalSettings.reflections = true;
    globalSettings.resolution = 1;
  } else if (preset === 'high') {
    globalSettings.bloom = false;
    globalSettings.vignette = false;
    globalSettings.chromaticAberration = false;
    globalSettings.reflections = true;
    globalSettings.resolution = 1;
  } else if (preset === 'low') {
    globalSettings.bloom = false;
    globalSettings.vignette = false;
    globalSettings.chromaticAberration = false;
    globalSettings.reflections = false;
    globalSettings.resolution = 0.5;
  }
  saveGlobalSettings();
};

// Referencia global de la posición del auto para que los meteoritos sepan a qué distancia cayeron
export const globalPlayerPos = new THREE.Vector3();

// Componente oculto que calcula los FPS y actualiza el HUD directamente
function HUDUpdater() {
  const frames = useRef(0);
  const prevTime = useRef(performance.now());

  useFrame(() => {
    // 1. Update FPS
    frames.current++;
    const time = performance.now();
    if (time >= prevTime.current + 1000) {
      const fps = Math.round((frames.current * 1000) / (time - prevTime.current));
      const el = document.getElementById('fps-counter');
      if (el) el.innerText = `FPS: ${fps}`;
      frames.current = 0;
      prevTime.current = time;
    }
    
    // 2. Update Turbo Bar smoothly
    const turboBar = document.getElementById('turbo-bar-inner');
    if (turboBar) turboBar.style.width = `${turboState.amount}%`;
    
    // 3. Update Health Bar smoothly
    const healthBar = document.getElementById('health-bar-inner');
    const healthText = document.getElementById('health-text-inner');
    if (healthBar) healthBar.style.width = `${healthState.amount}%`;
    if (healthText) healthText.innerText = `${Math.round(healthState.amount)} / 100`;
  });

  return null;
}

// Pre-renderizamos materiales, modelos y fuentes para evitar tirones (lag spikes) la primera vez que se usan
function MaterialPreloader() {
  const sniper = useGLTF('/models/Sniper.glb');
  const shotgun = useGLTF('/models/Shotgun.glb');
  const revolver = useGLTF('/models/Revolver.glb');
  const healthpack = useGLTF('/models/healthpack.glb');
  const crater = useGLTF('/models/crater.glb');
  const meteor = useGLTF('/models/Meteor.glb');
  const carScene = useGLTF('/models/car_default.glb');
  const turboScene = useGLTF('/models/turbo.glb');

  return (
    <group position={[0, -1000, 0]}>
      <primitive object={sniper.scene} />
      <primitive object={shotgun.scene} />
      <primitive object={revolver.scene} />
      <primitive object={healthpack.scene} />
      <primitive object={crater.scene} />
      <primitive object={meteor.scene} />
      <primitive object={carScene.scene} />
      <primitive object={turboScene.scene} />
      
      {/* Pre-calentar físicas de Rapier para evitar lag al disparar por primera vez */}
      <RigidBody colliders="ball">
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#FF4D2E" emissive="#FF4D2E" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </RigidBody>
      
      <RigidBody colliders="cuboid">
        <mesh>
          <ringGeometry args={[0.5, 1, 32]} />
          <meshBasicMaterial color="#FF4D2E" transparent opacity={1} side={THREE.DoubleSide} />
        </mesh>
      </RigidBody>
      
      <Text fontSize={1} color="#f97316" outlineWidth={0.05} outlineColor="#000">0</Text>
    </group>
  );
}

// Armas disponibles con sus estadísticas
const WEAPONS: any = {
  sniper: { file: '/models/Sniper.glb', maxAmmo: 5, reloadTime: 2000, cooldown: 1000, speed: 400, scale: 2, damage: 100 },
  shotgun: { file: '/models/Shotgun.glb', maxAmmo: 8, reloadTime: 1500, cooldown: 500, speed: 100, scale: 2, damage: 20 }, // x5 pellets = 100 total
  revolver: { file: '/models/Revolver.glb', maxAmmo: 6, reloadTime: 1000, cooldown: 300, speed: 150, scale: 2, damage: 34 }
};

// Componente para los Proyectiles
function Projectile({ id, position, direction, velocity, speed, onHit, weapon }: any) {
  const bulletRef = useRef<any>(null);
  const isHit = useRef(false);

  useEffect(() => {
    if (bulletRef.current) {
      bulletRef.current.setLinvel({
        x: velocity.x + direction.x * speed,
        y: velocity.y + direction.y * speed,
        z: velocity.z + direction.z * speed
      }, true);
    }
    const timer = setTimeout(() => {
      if (!isHit.current) {
        isHit.current = true;
        onHit(id, null, weapon, null, '');
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <RigidBody 
      name="projectile"
      ref={bulletRef} 
      position={position} 
      colliders="ball" 
      mass={0.5} 
      ccd={true} 
      gravityScale={0}
      onCollisionEnter={(e) => {
        if (!isHit.current) {
          isHit.current = true;
          if (bulletRef.current) {
            const hitPos = bulletRef.current.translation();
            const dist = new THREE.Vector3(hitPos.x, hitPos.y, hitPos.z).distanceTo(new THREE.Vector3(...position));
            const hitName = (e.rigidBodyObject?.name || e.colliderObject?.name) as string || '';
            onHit(id, dist, weapon, [hitPos.x, hitPos.y, hitPos.z], hitName);
          } else {
            onHit(id, null, weapon, null, '');
          }
        }
      }}
    >
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#FF4D2E" emissive="#FF4D2E" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

// Componente para los Hitmarkers visuales (Números de daño flotantes)
function DamageNumber({ position, amount }: { position: [number, number, number], amount: number }) {
  const ref = useRef<any>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y += delta * 3;
      ref.current.material.opacity = Math.max(0, ref.current.material.opacity - delta * 1.5);
    }
  });
  return (
    <Text ref={ref} position={position} fontSize={1} color="#f97316" outlineWidth={0.05} outlineColor="#000">
      -{amount}
    </Text>
  );
}

function KillEffect({ position, hex }: { position: [number, number, number], hex: string }) {
  const ref = useRef<any>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.scale.x += delta * 20;
      ref.current.scale.y += delta * 20;
      ref.current.scale.z += delta * 20;
      ref.current.material.opacity = Math.max(0, ref.current.material.opacity - delta * 2);
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={hex} emissive={hex} emissiveIntensity={5} transparent opacity={1} />
    </mesh>
  );
}

// Pastillas de Vida en el piso
function HealthPickup({ position, id, onPickup }: any) {
  const { scene } = useGLTF('/models/healthpack.glb');
  const ref = useRef<any>(null);
  
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 1.5;
      ref.current.position.y = position[1] + Math.sin(Date.now() / 300) * 0.2;
    }
  });

  // Hitbox expandida para poder dispararle en el aire más fácilmente
  return (
    <RigidBody name={`health_${id}`} type="fixed" position={position} colliders={false} sensor onIntersectionEnter={() => onPickup(id)}>
      <CuboidCollider args={[2, 3, 2]} />
      <group ref={ref} scale={1.5}>
        <primitive object={scene.clone()} />
      </group>
    </RigidBody>
  );
}

// Cráter y Efecto de Shockwave
function CraterAndShockwave({ position, normal }: any) {
  const { scene } = useGLTF('/models/crater.glb');
  const ringRef = useRef<any>(null);
  
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const n = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize();
    return new THREE.Quaternion().setFromUnitVectors(up, n);
  }, [normal]);
  
  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.scale.x += delta * 20;
      ringRef.current.scale.y += delta * 20;
      ringRef.current.material.opacity = Math.max(0, ringRef.current.material.opacity - delta);
    }
  });

  return (
    <group position={[position[0], position[1], position[2]]} quaternion={quaternion}>
      {/* Modelo 3D del Crater alineado a la normal de la rampa/piso, y más grande */}
      <primitive object={scene.clone()} scale={3} />
      
      {/* Shockwave Expansiva */}
      <mesh ref={ringRef} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.5, 1, 32]} />
        <meshBasicMaterial color="#FF4D2E" transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Meteorito cayendo
function Meteor({ id, position, onImpact }: any) {
  const { scene } = useGLTF('/models/Meteor.glb');
  const { world, rapier } = useRapier();
  const bodyRef = useRef<any>(null);
  const hasHit = useRef(false);

  return (
    <RigidBody 
      ref={bodyRef}
      position={position}
      colliders="ball"
      mass={500}
      ccd={true}
      onCollisionEnter={(e) => {
        if (!hasHit.current) {
          hasHit.current = true;
          const hitPos = bodyRef.current.translation();
          
          // Conseguir la normal de la superficie (Try-Catch para que no crashee y no se quede el meteorito bugeado en el piso)
          let normal = [0, 1, 0];
          try {
            const ray = new rapier.Ray({ x: hitPos.x, y: hitPos.y + 1, z: hitPos.z }, { x: 0, y: -1, z: 0 });
            const hit = world.castRay(ray, 2, true);
            if (hit && (hit as any).normal) normal = [(hit as any).normal.x, (hit as any).normal.y, (hit as any).normal.z];
          } catch(err) {
            // Ignorar errores de raycast
          }

          onImpact(id, [hitPos.x, hitPos.y, hitPos.z], normal);
        }
      }}
    >
      <primitive object={scene.clone()} scale={3} />
    </RigidBody>
  );
}

// Pastillas de Nitro en el piso
function NitroPickup({ position, id, onPickup }: any) {
  const { scene } = useGLTF('/models/turbo.glb');
  const turboScene = useMemo(() => scene.clone(), [scene]);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.05;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 5) * 0.2;
    }
  });

  // Hitbox expandida para poder dispararle
  return (
    <RigidBody 
      name={`nitro_${id}`}
      type="fixed" 
      colliders={false} 
      position={position} 
      sensor 
      onIntersectionEnter={(e) => {
        onPickup(id);
      }}
    >
      <CuboidCollider args={[2, 3, 2]} />
      <group ref={ref} scale={0.7}>
        <primitive object={turboScene} />
      </group>
    </RigidBody>
  );
}

function SpectatorCamera() {
  const controls = usePlayerControls();
  useFrame((state, delta) => {
    const speed = controls.turbo ? 80 : 40;
    const cam = state.camera;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    forward.y = 0; right.y = 0;
    forward.normalize(); right.normalize();

    if (controls.forward) cam.position.addScaledVector(forward, speed * delta);
    if (controls.backward) cam.position.addScaledVector(forward, -speed * delta);
    if (controls.left) cam.position.addScaledVector(right, -speed * delta);
    if (controls.right) cam.position.addScaledVector(right, speed * delta);
    if (controls.jump) cam.position.y += speed * delta;
    if (controls.brake) cam.position.y -= speed * delta;
    
    // Clamp to map
    cam.position.x = Math.max(-150, Math.min(150, cam.position.x));
    cam.position.z = Math.max(-150, Math.min(150, cam.position.z));
    cam.position.y = Math.max(1, Math.min(100, cam.position.y));

    // Look around (Minecraft Spectator style)
    const { azimuth, polar } = globalCameraState;
    cam.rotation.set(-polar + Math.PI/2, -azimuth, 0, 'YXZ');
  });
  return null;
}

function CinematicCamera() {
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    state.camera.position.x = Math.sin(time * 0.3) * 60;
    state.camera.position.z = Math.cos(time * 0.3) * 60;
    state.camera.position.y = 25 + Math.sin(time * 0.5) * 10;
    state.camera.lookAt(0, 5, 0);
  });
  return null;
}

const _quat = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _carPos = new THREE.Vector3();
const _idealCamPos = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _flatForward = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _correctionAxis = new THREE.Vector3();

function InteractiveCar({ externalCarRef, carModel = 'default', color, wheelColor, trailColor, turboColor, activeWeapon, onShoot, cameraSystem, initialPosition = [0, 2, 0] }: any) {
  const modelPath = carModel === 'caldi' ? '/models/caldi.glb' : '/models/car_default.glb';
  const { scene } = useGLTF(modelPath);
  const internalCarRef = useRef<any>(null);
  const carRef = externalCarRef || internalCarRef;
  const visualRef = useRef<any>(null);
  const controls = usePlayerControls();
  const lastShootTime = useRef(0);
  const lastJumpTime = useRef(0);
  const isStuckTimer = useRef(0);
  const flipTimer = useRef(0);
  
  const { rapier, world } = useRapier();

  // Efecto visual del turbo
  const exhaustRef = useRef<THREE.Mesh>(null);

  // Armas (Fallback a sniper si ocurre un bug de recarga en caliente)
  const weaponData = WEAPONS[activeWeapon] || WEAPONS.sniper;
  const weaponModel = useGLTF(weaponData.file);
  const weaponScene = useMemo(() => weaponModel.scene.clone(), [weaponModel.scene, activeWeapon]);
  const weaponRef = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && 'color' in mesh.material) {
          const mat = (mesh.material as THREE.Material).clone();
          const isWheel = child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire') || child.name.toLowerCase().includes('cylinder');
          (mat as any).color.set(isWheel && wheelColor ? wheelColor : color);
          mesh.material = mat;
        }
      }
    });
  }, [scene, color, wheelColor]);

  useEffect(() => {
    return () => {
      if (externalCarRef) {
        externalCarRef.current = null;
      }
    };
  }, [externalCarRef]);

  useEffect(() => {
    const onRespawn = (e: any) => {
      if (carRef.current) {
        const p = e.detail;
        carRef.current.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
        carRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        carRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    };
    window.addEventListener('player-respawn', onRespawn);
    return () => window.removeEventListener('player-respawn', onRespawn);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: CustomEvent) => {
      const targetPoint = e.detail;
      if (!carRef.current || !weaponRef.current) return;
      
      const body = carRef.current;
      const pos = body.translation();
      const vel = body.linvel();
      
      weaponRef.current.lookAt(targetPoint.x, targetPoint.y, targetPoint.z);
      
      const now = performance.now();
      if (now - lastShootTime.current > weaponData.cooldown) {
        lastShootTime.current = now;
        
        const spawnPos = new THREE.Vector3(pos.x, pos.y + 1.2, pos.z);
        const direction = new THREE.Vector3().subVectors(targetPoint, spawnPos).normalize();
        const offsetSpawnPos = spawnPos.clone().add(direction.clone().multiplyScalar(2.5));
        
        // Efecto de retroceso visual
        weaponRef.current.position.z += 0.2;
        setTimeout(() => { if (weaponRef.current) weaponRef.current.position.z -= 0.2; }, 100);

        onShoot([offsetSpawnPos.x, offsetSpawnPos.y, offsetSpawnPos.z], direction, vel, weaponData.speed, activeWeapon);
      }
    };
    
    // Escuchamos pointerdown y el evento custom para que agarre con 1 solo click rápido
    window.addEventListener('car-shoot', handleGlobalClick as any);
    return () => window.removeEventListener('car-shoot', handleGlobalClick as any);
  }, [activeWeapon, weaponData]);

  const ACCELERATION = 40; 
  const TURBO_ACCELERATION = 120; 
  const MAX_SPEED = 30; 
  const MAX_TURBO_SPEED = 70; 
  const TURN_SPEED = 90; 
  const LATERAL_FRICTION = 5;
  const JUMP_FORCE = 6;

  useFrame((state, delta) => {
    if (!carRef.current) return;
    
    const body = carRef.current;
    const pos = body.translation();
    const rot = body.rotation();
    const vel = body.linvel();
    
    if (!pos || !rot || !vel) return;
    
    _quat.set(rot.x, rot.y, rot.z, rot.w);
    _forward.set(0, 0, 1).applyQuaternion(_quat).normalize();
    _right.set(-1, 0, 0).applyQuaternion(_quat).normalize();
    _up.set(0, 1, 0).applyQuaternion(_quat).normalize();
    _vel.set(vel.x, vel.y, vel.z);

    const currentSpeed = _vel.dot(_forward);
    const lateralSpeed = _vel.dot(_right);

    const isTryingToMove = controls.forward || controls.backward || controls.turbo;
    const isUpsideDown = _up.y < 0.3;
    const isVelocityZero = Math.abs(currentSpeed) < 1 && Math.abs(lateralSpeed) < 1;
    
    // Auto-Volteo Automático (0.5s boca abajo y quieto)
    if (isUpsideDown && isVelocityZero) {
      flipTimer.current += delta;
      if (flipTimer.current > 0.5) {
        body.setTranslation({ x: pos.x, y: pos.y + 1, z: pos.z }, true);
        body.setRotation({ x: 0, y: rot.y, z: 0, w: rot.w }, true);
        flipTimer.current = 0;
      }
    } else {
      flipTimer.current = 0;
    }

    // Auto-Desestanque (0.4s estancado contra una pared/objeto y queriendo moverse)
    if (isVelocityZero && isTryingToMove && Math.abs(currentSpeed) < 0.5) {
      isStuckTimer.current += delta;
      if (isStuckTimer.current > 0.4) {
        // Empuje fuerte en la dirección opuesta a donde queremos ir para desatascarnos
        const escapeDir = controls.forward ? -1 : 1; 
        body.applyImpulse({ 
          x: _forward.x * 40 * escapeDir, 
          y: 6, 
          z: _forward.z * 40 * escapeDir 
        }, true);
        isStuckTimer.current = 0;
      }
    } else {
      isStuckTimer.current = 0;
    }

    // Ocultar siempre el UI viejo de la V (ya que ahora todo es automático)
    const stuckEl = document.getElementById('stuck-ui');
    if (stuckEl) stuckEl.style.opacity = '0';

    // 1. ACELERACIÓN Y TURBO
    let engineForce = 0;
    const isTurboing = controls.turbo && turboState.amount > 0;
    
    if (isTurboing) {
      turboState.amount = Math.max(0, turboState.amount - 20 * delta);
      if (exhaustRef.current) exhaustRef.current.scale.set(1, 1, 1 + Math.random() * 2);
    } else {
      if (exhaustRef.current) exhaustRef.current.scale.set(0, 0, 0);
    }

    const activeMaxSpeed = isTurboing ? MAX_TURBO_SPEED : MAX_SPEED;

    // Restauramos la detección original que permitía volar sin bugs
    const isGrounded = pos.y < 1.5 || Math.abs(vel.y) < 0.1;

    // Solo puedes acelerar si estás en el suelo, o si estás usando turbo
    if (isTurboing && currentSpeed < activeMaxSpeed) {
      engineForce = TURBO_ACCELERATION;
    } else if (isGrounded) {
      if (controls.forward && currentSpeed < activeMaxSpeed) {
        engineForce = ACCELERATION;
      } else if (controls.backward) {
        engineForce = -ACCELERATION;
      }
    }

    if (engineForce !== 0) {
      if (isTurboing && !isGrounded) {
        // En el aire con turbo: Permitir impulso en 3D para volar libremente (Airfly)
        body.applyImpulse({ 
          x: _forward.x * engineForce * delta, 
          y: _forward.y * engineForce * delta, 
          z: _forward.z * engineForce * delta 
        }, true);
      } else {
        // En el suelo: Proyectar impulso en el plano XZ para no volar por error al acelerar
        _flatForward.set(_forward.x, 0, _forward.z).normalize();
        body.applyImpulse({ 
          x: _flatForward.x * engineForce * delta, 
          y: 0, 
          z: _flatForward.z * engineForce * delta 
        }, true);
      }
    }

    // 2. SALTO (ESPACIO)
    if (controls.jump) {
      const now = performance.now();
      if (now - lastJumpTime.current > 1000 && isGrounded) {
        lastJumpTime.current = now;
        body.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        
        if (controls.left) body.applyTorqueImpulse({ x: 0, y: 0, z: -1.5 }, true); 
        if (controls.right) body.applyTorqueImpulse({ x: 0, y: 0, z: 1.5 }, true);
      }
    }

    // 3. AIR CONTROL & DIRECCIÓN
    if (Math.abs(currentSpeed) > 0.5 || isTurboing) { 
      const turnMultiplier = -1; 
      
      let turnForce = 0;
      const currentTurnSens = isGrounded ? globalSettings.turnSens : globalSettings.airTurnSens;
      const activeTurnSpeed = (isTurboing ? TURN_SPEED * 1.5 : TURN_SPEED) * currentTurnSens;
      
      if (controls.left) turnForce = -activeTurnSpeed;
      if (controls.right) turnForce = activeTurnSpeed;

      if (currentSpeed < -0.5) turnForce = -turnForce;

      if (turnForce !== 0) {
        body.applyTorqueImpulse({ 
          x: _up.x * turnForce * turnMultiplier * delta, 
          y: _up.y * turnForce * turnMultiplier * delta, 
          z: _up.z * turnForce * turnMultiplier * delta 
        }, true);
      }
    }

    if (!isGrounded) {
      const PITCH_FORCE = 7.5 * globalSettings.airSens * delta;
      if (controls.backward) {
        body.applyTorqueImpulse({ x: _right.x * PITCH_FORCE, y: _right.y * PITCH_FORCE, z: _right.z * PITCH_FORCE }, true);
      }
    }

    // 4. FRICCIÓN LATERAL
    if (Math.abs(lateralSpeed) > 0.1 && pos.y < 1.5) {
      body.applyImpulse({
        x: -_right.x * lateralSpeed * LATERAL_FRICTION * delta,
        y: -_right.y * lateralSpeed * LATERAL_FRICTION * delta,
        z: -_right.z * lateralSpeed * LATERAL_FRICTION * delta
      }, true);
    }

    // 5. ESTABILIZADOR
    const isAirControlling = !isGrounded && (controls.backward || controls.forward || controls.left || controls.right);
    
    if (!isAirControlling) {
      const angleToUp = _up.angleTo(_worldUp);
      if (angleToUp > 0.05) {
        _correctionAxis.crossVectors(_up, _worldUp);
        if (_correctionAxis.lengthSq() > 0.001) {
          _correctionAxis.normalize();
          const correctionForce = angleToUp * (isGrounded ? 10 : 2) * delta; 
          body.applyTorqueImpulse({
            x: _correctionAxis.x * correctionForce,
            y: _correctionAxis.y * correctionForce,
            z: _correctionAxis.z * correctionForce
          }, true);
        }
      }
    }
    
    if (controls.brake) {
      body.setLinearDamping(4);
    } else if (engineForce === 0) {
      body.setLinearDamping(1.5);
    } else {
      body.setLinearDamping(0.2);
    }
    body.setAngularDamping(3.5);

    // CÁMARA
    _carPos.set(pos.x, pos.y, pos.z);
    globalPlayerPos.copy(_carPos); 
    
    if (cameraSystem === 'chase') {
      _camOffset.set(0, 3, -7).applyQuaternion(_quat);
      _idealCamPos.copy(_carPos).add(_camOffset);
    } else if (cameraSystem === 'free') {
      const { azimuth, polar, distance } = globalCameraState;
      const x = Math.sin(polar) * Math.sin(azimuth) * distance;
      const y = Math.cos(polar) * distance;
      const z = Math.sin(polar) * Math.cos(azimuth) * distance;
      _idealCamPos.copy(_carPos).add(_camOffset.set(x, 1 + y, z));
    }
    
    _idealCamPos.y = Math.max(0.5, _idealCamPos.y);
    
    _camDir.subVectors(_idealCamPos, _carPos).normalize();
    const maxDistance = _idealCamPos.distanceTo(_carPos);
    
    const ray = new rapier.Ray(_carPos, _camDir);
    const hit = world.castRay(ray, maxDistance, true, undefined, undefined, undefined, carRef.current);
    
    if (hit && hit.toi < maxDistance) {
      _idealCamPos.copy(_carPos).add(_camDir.multiplyScalar(Math.max(1.5, hit.toi - 0.5)));
    }
    
    const lerpFactor = Math.min((30 * delta) * globalSettings.cameraSens, 1);
    state.camera.position.lerp(_idealCamPos, lerpFactor);  
    state.camera.lookAt(_carPos.x, _carPos.y + 1, _carPos.z);
  });

  return (
    <RigidBody 
      name="my_car"
      ref={carRef} 
      colliders={false} 
      position={initialPosition} 
      restitution={0.1} 
      friction={1}
      ccd={true}
    >
      <CuboidCollider args={[1, 0.5, 2]} position={[0, 0, 0]} mass={1} />

      {/* Efecto de Escape / Turbo */}
      <mesh ref={exhaustRef} position={[0, 0.2, -2.5]} scale={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={turboColor || "#22d3ee"} emissive={turboColor || "#22d3ee"} emissiveIntensity={5} toneMapped={false} />
      </mesh>

      <group position={[0, 0.8, -0.5]} ref={weaponRef}>
        <primitive 
          object={weaponScene} 
          scale={weaponData.scale} 
          rotation={[0, Math.PI, 0]} 
        />
      </group>
      
      {trailColor && (
        <Trail
          width={1.5}
          length={15}
          color={new THREE.Color(trailColor)}
          attenuation={(t) => t * t}
          target={exhaustRef}
        />
      )}
      
      <group ref={visualRef}>
        <primitive object={scene} scale={1.5} rotation={[0, -Math.PI / 2, 0]} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload('/models/car_default.glb');
useGLTF.preload('/models/Sniper.glb');
useGLTF.preload('/models/Shotgun.glb');
useGLTF.preload('/models/Revolver.glb');
useGLTF.preload('/models/turbo.glb');

// --- MAPA 2: ANCESTRIM (AQUADOME) ---
function Bubbles() {
  const count = 150;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random() * 100,
        speed: 0.01 + Math.random() / 100,
        x: (Math.random() - 0.5) * 140,
        y: (Math.random() - 0.5) * 140,
        z: (Math.random() - 0.5) * 140,
        scale: 0.1 + Math.random() * 0.3
      });
    }
    return temp;
  }, [count]);
  
  const mesh = useRef<THREE.InstancedMesh>(null);
  
  useFrame(() => {
    if (!mesh.current) return;
    particles.forEach((particle, i) => {
      particle.t += particle.speed;
      // Movimiento ondulante de burbujas hacia arriba
      dummy.position.set(
        particle.x + Math.sin(particle.t * 5) * 2,
        (particle.y + particle.t * 15) % 60, // Suben hasta y=60 y reaparecen
        particle.z + Math.cos(particle.t * 5) * 2
      );
      dummy.scale.setScalar(particle.scale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#7dd3fc" transparent opacity={0.4} />
    </instancedMesh>
  );
}
function MapCyberpunk({ onShootClick }: any) {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide }), []);
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: '#f472b6', transmission: 0.9, opacity: 1, metalness: 0.1, roughness: 0.1, ior: 1.5, side: THREE.DoubleSide, transparent: true
  }), []);
  const neonPink = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ec4899', emissive: '#be185d', emissiveIntensity: 2, toneMapped: false, side: THREE.DoubleSide }), []);
  const neonBlue = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0ea5e9', emissive: '#0284c7', emissiveIntensity: 2, toneMapped: false, side: THREE.DoubleSide }), []);
  
  const MAP_RADIUS = 90;

  return (
    <group onPointerDown={onShootClick}>
      <RigidBody type="fixed" friction={2}>
        <CuboidCollider args={[2000, 0.5, 2000]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow material={floorMat}>
          <cylinderGeometry args={[MAP_RADIUS, MAP_RADIUS, 1, 64]} />
        </mesh>
      </RigidBody>
      
      <RigidBody type="fixed" friction={0.5} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} receiveShadow material={floorMat}>
          <torusGeometry args={[MAP_RADIUS - 5, 5, 16, 64]} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" friction={0.0} restitution={0.2} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} material={glassMat}>
          <sphereGeometry args={[MAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </RigidBody>

      {/* Cyberpunk Skyscrapers */}
      <RigidBody type="fixed" position={[-30, 10, -30]}>
        <mesh material={neonPink}><boxGeometry args={[10, 20, 10]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[30, 15, -30]}>
        <mesh material={neonBlue}><boxGeometry args={[15, 30, 15]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 5, 40]}>
        <mesh material={neonPink}><boxGeometry args={[20, 10, 10]} /></mesh>
      </RigidBody>

      {/* Crossing Neon Bridge */}
      <RigidBody type="fixed" position={[0, 8, 0]} rotation={[0, Math.PI / 4, 0]} colliders="trimesh">
        <mesh material={floorMat}>
          <boxGeometry args={[80, 1, 10]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-35, 4, -35]} rotation={[0, Math.PI / 4, -Math.PI / 6]} friction={0.1}>
        <mesh material={neonBlue}><boxGeometry args={[30, 1, 10]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[35, 4, 35]} rotation={[0, Math.PI / 4, -Math.PI / 6]} friction={0.1}>
        <mesh material={neonBlue}><boxGeometry args={[30, 1, 10]} /></mesh>
      </RigidBody>
    </group>
  );
}

function MapVolcano({ onShootClick }: any) {
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide }), []);
  const lavaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 3, toneMapped: false, side: THREE.DoubleSide }), []);
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: '#ef4444', transmission: 0.9, opacity: 1, metalness: 0.1, roughness: 0.2, ior: 1.5, side: THREE.DoubleSide, transparent: true
  }), []);
  
  const MAP_RADIUS = 90;

  return (
    <group onPointerDown={onShootClick}>
      <RigidBody type="fixed" friction={2}>
        <CuboidCollider args={[2000, 0.5, 2000]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow material={rockMat}>
          <cylinderGeometry args={[MAP_RADIUS, MAP_RADIUS, 1, 64]} />
        </mesh>
      </RigidBody>
      
      <RigidBody type="fixed" friction={0.5} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} receiveShadow material={rockMat}>
          <torusGeometry args={[MAP_RADIUS - 5, 5, 16, 64]} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" friction={0.0} restitution={0.2} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} material={glassMat}>
          <sphereGeometry args={[MAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </RigidBody>

      {/* Lava Pools (Visual only, flat with floor) */}
      <RigidBody type="fixed" position={[0, 0.1, 0]}>
        <mesh material={lavaMat} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[15, 32]} />
        </mesh>
      </RigidBody>

      {/* Volcanic Rocks */}
      <RigidBody type="fixed" position={[-20, 3, 30]}>
        <mesh material={rockMat}><dodecahedronGeometry args={[6]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[40, 5, -20]}>
        <mesh material={rockMat}><dodecahedronGeometry args={[10]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-30, 4, -40]}>
        <mesh material={rockMat}><dodecahedronGeometry args={[8]} /></mesh>
      </RigidBody>

      {/* Lava Ramps */}
      <RigidBody type="fixed" position={[-25, 2, -25]} rotation={[0, Math.PI / 4, Math.PI / 6]} friction={0.1}>
        <mesh material={lavaMat}><boxGeometry args={[15, 1, 20]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[25, 2, 25]} rotation={[0, Math.PI / 4, Math.PI / 6]} friction={0.1}>
        <mesh material={lavaMat}><boxGeometry args={[15, 1, 20]} /></mesh>
      </RigidBody>
    </group>
  );
}

function MapTron({ onShootClick }: any) {
  const gridMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide }), []);
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: '#0ff', transmission: 0.9, opacity: 1, metalness: 0.1, roughness: 0, ior: 1.1, side: THREE.DoubleSide, transparent: true
  }), []);
  const tronCyan = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0ff', emissive: '#0ff', emissiveIntensity: 2, toneMapped: false, side: THREE.DoubleSide }), []);
  const tronMagenta = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f0f', emissive: '#f0f', emissiveIntensity: 2, toneMapped: false, side: THREE.DoubleSide }), []);
  
  const MAP_RADIUS = 90;

  return (
    <group onPointerDown={onShootClick}>
      <RigidBody type="fixed" friction={2}>
        <CuboidCollider args={[2000, 0.5, 2000]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow material={gridMat}>
          <cylinderGeometry args={[MAP_RADIUS, MAP_RADIUS, 1, 64]} />
        </mesh>
      </RigidBody>
      
      {/* Visual Grid Lines on floor */}
      <RigidBody type="fixed" position={[0, 0.05, 0]} colliders={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[180, 180, 20, 20]} />
          <meshBasicMaterial color="#0ff" wireframe transparent opacity={0.3} />
        </mesh>
      </RigidBody>
      
      <RigidBody type="fixed" friction={0.5} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} receiveShadow material={gridMat}>
          <torusGeometry args={[MAP_RADIUS - 5, 5, 16, 64]} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" friction={0.0} restitution={0.2} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} material={glassMat}>
          <sphereGeometry args={[MAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </RigidBody>

      {/* Tron Pyramids */}
      <RigidBody type="fixed" position={[-30, 4, 30]}>
        <mesh material={tronCyan}><coneGeometry args={[8, 10, 4]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[30, 4, -30]}>
        <mesh material={tronMagenta}><coneGeometry args={[8, 10, 4]} /></mesh>
      </RigidBody>

      {/* Tron Half-Pipes / Ramps */}
      <RigidBody type="fixed" position={[0, 3, -40]} rotation={[0, 0, 0]} colliders="trimesh">
        <mesh material={gridMat}>
          <cylinderGeometry args={[15, 15, 30, 32, 1, false, 0, Math.PI]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[0, 3, 40]} rotation={[0, Math.PI, 0]} colliders="trimesh">
        <mesh material={gridMat}>
          <cylinderGeometry args={[15, 15, 30, 32, 1, false, 0, Math.PI]} />
        </mesh>
      </RigidBody>

      {/* Central Ring */}
      <RigidBody type="fixed" position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} colliders="trimesh">
        <mesh material={tronCyan}>
          <torusGeometry args={[15, 1, 16, 64]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

function MapAncestrim({ onShootClick }: any) {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#082f49', roughness: 0.2, metalness: 0.6, side: THREE.DoubleSide }), []);
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({ 
    color: '#0ea5e9', transmission: 0.9, opacity: 1, metalness: 0.1, roughness: 0, ior: 1.2, side: THREE.DoubleSide, transparent: true
  }), []);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0369a1', emissive: '#0284c7', emissiveIntensity: 2, toneMapped: false, side: THREE.DoubleSide }), []);
  const coralMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#059669', emissiveIntensity: 1, side: THREE.DoubleSide }), []);
  
  const MAP_RADIUS = 90;

  return (
    <group onPointerDown={onShootClick}>
      {/* PISO VISIBLE Y COLISIONADOR GLOBAL */}
      <RigidBody type="fixed" friction={2}>
        <CuboidCollider args={[2000, 0.5, 2000]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow material={floorMat}>
          <cylinderGeometry args={[MAP_RADIUS, MAP_RADIUS, 1, 64]} />
        </mesh>
      </RigidBody>
      
      {/* RAMPA PERIMETRAL CURVA (Estilo Rocket League) 
          Esto suaviza la esquina de 90 grados entre el piso y el cristal, 
          evitando que el auto se trabe y permitiendo subir por las paredes. */}
      <RigidBody type="fixed" friction={0.5} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} receiveShadow material={floorMat}>
          <torusGeometry args={[MAP_RADIUS - 5, 5, 16, 64]} />
        </mesh>
      </RigidBody>

      {/* CÚPULA DE CRISTAL (El cristal real funciona como pared de colisión) */}
      <RigidBody type="fixed" friction={0.0} restitution={0.2} colliders="trimesh">
        <mesh position={[0, -0.5, 0]} material={glassMat}>
          <sphereGeometry args={[MAP_RADIUS, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </RigidBody>

      {/* RAMPAS ACUÁTICAS CLÁSICAS (Hitboxes exactas a la geometría de la plataforma) */}
      
      {/* Rampa Noroeste */}
      <RigidBody type="fixed" position={[-45, 2, -45]} rotation={[0.3, Math.PI / 4, 0]} friction={0.1}>
        <mesh material={accentMat}><boxGeometry args={[15, 1, 25]} /></mesh>
      </RigidBody>

      {/* Rampa Noreste */}
      <RigidBody type="fixed" position={[45, 2, -45]} rotation={[0.3, -Math.PI / 4, 0]} friction={0.1}>
        <mesh material={accentMat}><boxGeometry args={[15, 1, 25]} /></mesh>
      </RigidBody>

      {/* Rampa Suroeste */}
      <RigidBody type="fixed" position={[-45, 2, 45]} rotation={[-0.3, -Math.PI / 4, 0]} friction={0.1}>
        <mesh material={accentMat}><boxGeometry args={[15, 1, 25]} /></mesh>
      </RigidBody>

      {/* Rampa Sureste */}
      <RigidBody type="fixed" position={[45, 2, 45]} rotation={[-0.3, Math.PI / 4, 0]} friction={0.1}>
        <mesh material={accentMat}><boxGeometry args={[15, 1, 25]} /></mesh>
      </RigidBody>

      {/* PILARES CENTRALES (Aro) */}
      {/* Añadido colliders="trimesh" para que el hueco del aro sea real y puedas pasar por el centro */}
      <RigidBody type="fixed" position={[0, 4, 0]} colliders="trimesh">
        <mesh material={accentMat}>
          <torusGeometry args={[10, 1, 16, 32]} />
        </mesh>
      </RigidBody>

      {/* DECORACIONES: CORALES NEÓN */}
      <RigidBody type="fixed" position={[20, 1, 20]}>
        <mesh material={coralMat}><cylinderGeometry args={[1, 2, 8]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-20, 1, 20]}>
        <mesh material={coralMat}><cylinderGeometry args={[0.5, 1.5, 6]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[20, 1, -20]}>
        <mesh material={coralMat}><cylinderGeometry args={[1.5, 2, 10]} /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-20, 1, -20]}>
        <mesh material={coralMat}><cylinderGeometry args={[1, 1, 5]} /></mesh>
      </RigidBody>
    </group>
  );
}

const SPAWN_POINTS = [
      [30, 8, 0],
  [-30, 8, 0],
  [0, 8, 30],
  [0, 8, -30],
  [40, 8, 40],
  [-40, 8, -40]
];

import { MultiplayerManager } from './MultiplayerManager';

export const WebGLDemo = ({ selectedMap = 'Arena Clásica' }: { selectedMap?: string }) => {
  const myCarRef = useRef<any>(null);
  const { user, updateCoins } = useUserStore();
  const equippedColor = user?.equippedColor || '#ffffff';
  const controls = usePlayerControls();
  
  const [projectiles, setProjectiles] = useState<any[]>([]);
  const [activeWeapon, setActiveWeapon] = useState('sniper');
  const [cameraSystem, setCameraSystem] = useState('chase');
  
  const [ammoUI, setAmmoUI] = useState(WEAPONS.sniper.maxAmmo);
  const [isReloadingUI, setIsReloadingUI] = useState(false);
  const ammoRef = useRef(WEAPONS.sniper.maxAmmo);
  const isReloadingRef = useRef(false);

  // Kill Feed State
  const [killFeed, setKillFeed] = useState<{ id: number; killer: string; victim: string; weapon: string; distance?: number }[]>([]);
  
  // Hitmarkers State
  const [hitMarkers, setHitMarkers] = useState<{ id: number; pos: [number, number, number]; amount: number }[]>([]);
  const [killEffects, setKillEffects] = useState<{ id: number; pos: [number, number, number]; hex: string }[]>([]);

  const [leaderboard, setLeaderboard] = useState([
    { name: user?.username || 'You', ping: 12, kills: 0, deaths: 0, profilePicture: user?.profilePicture, isMe: true, team: 'none' }
  ]);
  const [hasChosenTeam, setHasChosenTeam] = useState(false);
  const [isServerLocked, setIsServerLocked] = useState(false);

  const MOCK_PLAYERS = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.kills - a.kills).slice(0, 5);
  }, [leaderboard]);

  const [initialSpawn] = useState(() => SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)]);

  const [deathScreen, setDeathScreen] = useState<{ killer: string, weapon: string, distance?: number } | null>(null);

  const [jumpscareText, setJumpscareText] = useState('');
  const [fakeBan, setFakeBan] = useState(false);
  const [adminCarModel, setAdminCarModel] = useState('default');

  useEffect(() => {
    const onNetAdmin = (e: any) => {
      const data = e.detail;
      if (data.action === 'add_coins') {
         updateCoins((user?.coins || 0) + data.amount);
         // Play happy sound
      } else if (data.action === 'remove_coins') {
         updateCoins(Math.max(0, (user?.coins || 0) - data.amount));
      } else if (data.action === 'fake_coins') {
         // Show visual effect but don't actually update DB
         const fakeEl = document.createElement('div');
         fakeEl.innerText = `+${data.amount} FCOINS`;
         fakeEl.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-yellow-500 z-[9999] animate-bounce drop-shadow-2xl';
         document.body.appendChild(fakeEl);
         setTimeout(() => fakeEl.remove(), 4000);
      } else if (data.action === 'announcement') {
         setJumpscareText(data.text);
         setTimeout(() => setJumpscareText(''), 5000);
      } else if (data.action === 'fake_ban') {
         setFakeBan(true);
      } else if (data.action === 'crash_client') {
         while (true) { console.log('crash'); } // freeze the tab
      } else if (data.action === 'set_car_model') {
         setAdminCarModel(data.model);
      }
    };
    window.addEventListener('network-admin-command', onNetAdmin);
    return () => window.removeEventListener('network-admin-command', onNetAdmin);
  }, [user]);

  useEffect(() => {
    const onNetShoot = (e: any) => {
      const { id, position, direction, velocity, speed, weapon } = e.detail;
      const dirVec = new THREE.Vector3(direction.x, direction.y, direction.z);
      const velVec = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
      setProjectiles(prev => [...prev, { id: Date.now() + Math.random(), position: [position.x, position.y, position.z], direction: dirVec, velocity: velVec, speed, weapon }]);
    };
    
    const onNetHit = (e: any) => {
      const { shooter, damage, weapon } = e.detail;
      if (healthState.amount > 0) {
        healthState.amount = Math.max(0, healthState.amount - damage);
        if (healthState.amount <= 0 && !deathScreen) {
          window.dispatchEvent(new CustomEvent('local-player-died', { detail: { killer: shooter, weapon } }));
          setDeathScreen({ killer: shooter, weapon });
          const killId = Date.now() + Math.random();
          setKillFeed(prev => [...prev, { id: killId, killer: shooter, victim: user?.username || 'You', weapon }]);
          setTimeout(() => setKillFeed(current => current.filter(k => k.id !== killId)), 7000);
        }
      }
    };
    
    const onNetKilled = (e: any) => {
      const { victim, killer, weapon } = e.detail;
      const killId = Date.now() + Math.random();
      setKillFeed(prev => [...prev, { id: killId, killer, victim, weapon }]);
      setTimeout(() => setKillFeed(current => current.filter(k => k.id !== killId)), 7000);
      
      // Update leaderboard kills & deaths
      setLeaderboard(prev => prev.map(p => {
        if (p.name === killer) return { ...p, kills: p.kills + 1 };
        if (p.name === victim) return { ...p, deaths: p.deaths + 1 };
        return p;
      }));
    };

    const onNetPlayerJoined = (e: any) => {
      const data = e.detail;
      setLeaderboard(prev => {
        if (prev.find(p => p.id === data.id)) return prev;
        return [...prev, { id: data.id, name: data.username || 'Player', ping: Math.floor(Math.random() * 30) + 10, kills: 0, deaths: 0, profilePicture: data.profilePicture, isMe: false, team: 'none' }];
      });
    };

    const onNetPlayerLeft = (e: any) => {
      const id = e.detail;
      setLeaderboard(prev => prev.filter(p => p.id !== id));
    };

    const onNetSyncState = (e: any) => {
      setMatchTime(e.detail.time);
      if (e.detail.map && localMap !== e.detail.map) {
         setLocalMap(e.detail.map);
      }
    };
    
    const onNetMapChanged = (e: any) => {
      setLocalMap(e.detail);
    };

    window.addEventListener('network-player-shoot', onNetShoot);
    window.addEventListener('network-player-hit', onNetHit);
    window.addEventListener('network-player-killed', onNetKilled);
    window.addEventListener('network-sync-state', onNetSyncState);
    window.addEventListener('network-map-changed', onNetMapChanged);
    const onNetMetadata = (e: any) => {
      const data = e.detail;
      setLeaderboard(prev => prev.map(p => {
        if (p.name === data.username) {
          return { ...p, profilePicture: data.profilePicture };
        }
        return p;
      }));
    };
    
    window.addEventListener('network-player-metadata', onNetMetadata);
    window.addEventListener('network-player-joined', onNetPlayerJoined);
    window.addEventListener('network-player-left', onNetPlayerLeft);
    return () => {
      window.removeEventListener('network-player-shoot', onNetShoot);
      window.removeEventListener('network-player-hit', onNetHit);
      window.removeEventListener('network-player-killed', onNetKilled);
      window.removeEventListener('network-sync-state', onNetSyncState);
      window.removeEventListener('network-map-changed', onNetMapChanged);
      window.removeEventListener('network-player-metadata', onNetMetadata);
      window.removeEventListener('network-player-joined', onNetPlayerJoined);
      window.removeEventListener('network-player-left', onNetPlayerLeft);
    };
  }, [user?.username, deathScreen]);

  const [matchTime, setMatchTime] = useState(180); // 3 minutos de partida
  const [intermission, setIntermission] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [mapVotes, setMapVotes] = useState<{ [key: string]: number }>({ 'Arena Clásica': 0, 'Cyberpunk City': 0, 'Desierto Mangi': 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [intermissionTimer, setIntermissionTimer] = useState(15);
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string, isSystem?: boolean}[]>([
    {sender: 'System', text: 'Welcome to Mangi Arena! Press G to chat.', isSystem: true}
  ]);
  const [hostSettings, setHostSettings] = useState({
    gravity: 1,
    infiniteAmmo: false,
    gameSpeed: 1,
    infiniteTime: false,
    mapRotation: 'all',
    mode: 'Deathmatch (Todos vs Todos)',
  });
  const [localMap, setLocalMap] = useState(selectedMap);

  // Sync prop with local map if it changes from outside
  useEffect(() => { setLocalMap(selectedMap); }, [selectedMap]);
  
  useEffect(() => {
    const stored = localStorage.getItem('mangiHostSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.map) setLocalMap(parsed.map);
        if (parsed.timeLimit === 'infinite') {
          setHostSettings(prev => ({ ...prev, infiniteTime: true }));
        } else if (parsed.timeLimit) {
          setMatchTime(parseInt(parsed.timeLimit));
        }
        setHostSettings(prev => ({ 
          ...prev, 
          mapRotation: parsed.mapRotation || 'all',
          gravity: parsed.gravity ?? 1,
          infiniteAmmo: parsed.infiniteAmmo || false,
          mode: parsed.mode || 'Deathmatch (Todos vs Todos)'
        }));
      } catch (e) {}
    }
  }, []);
  // Evento M para espectador
  useEffect(() => {
    const handleM = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyM' && !isSpectator && !intermission && !deathScreen) {
        if (confirm('¿Estás seguro que quieres ponerte en modo espectador? (Saldrás de tu auto)')) {
          setIsSpectator(true);
          healthState.amount = 0; // Desactivar HUD
        }
      }
    };
    window.addEventListener('keydown', handleM);
    return () => window.removeEventListener('keydown', handleM);
  }, [isSpectator, intermission, deathScreen]);

  // End of match handling
  useEffect(() => {
    if (hostSettings.infiniteTime) return;
    if (matchTime <= 0 && !intermission) {
      setIntermission(true);
      
      const finalLeaderboard = [...leaderboard].sort((a, b) => b.kills - a.kills);
      const myRank = finalLeaderboard.findIndex(p => p.isMe);
      if (myRank === 0) updateCoins((user?.coins || 0) + 100);
      else if (myRank === 1) updateCoins((user?.coins || 0) + 50);
      else if (myRank === 2) updateCoins((user?.coins || 0) + 25);
    }
  }, [matchTime, intermission, hostSettings.infiniteTime, leaderboard, user?.coins, updateCoins]);

  // Intermission Timer
  useEffect(() => {
    if (intermission && intermissionTimer > 0) {
      const timer = setInterval(() => setIntermissionTimer(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (intermission && intermissionTimer <= 0) {
      if (hostSettings.mapRotation === 'all') {
        const MAPS = ['Arena Clásica', 'Cyberpunk City', 'Lava Volcano', 'Neon Tron'];
        const currentIdx = MAPS.indexOf(localMap);
        const nextMap = MAPS[(currentIdx + 1) % MAPS.length];
        const stored = localStorage.getItem('mangiHostSettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.map = nextMap;
          localStorage.setItem('mangiHostSettings', JSON.stringify(parsed));
        }
      }
      window.location.reload(); 
    }
  }, [intermission, intermissionTimer, hostSettings.mapRotation, localMap]);


  
  const [nitros, setNitros] = useState([
    { id: 1, pos: [0, 0.5, 0] }, // En el puro suelo
    { id: 2, pos: [-30, 0.5, -30] }, // Cerca rampa NW
    { id: 3, pos: [30, 0.5, 30] }, // Cerca rampa SE
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          setIsChatOpen(false);
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'i' || e.key === 'I') setIsHostPanelOpen(prev => !prev);
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setIsChatOpen(true);
        setTimeout(() => document.getElementById('chat-input')?.focus(), 10);
      }
      
      if (e.key === '1') switchWeapon('sniper');
      if (e.key === '2') switchWeapon('shotgun');
      if (e.key === '3') switchWeapon('revolver');
      if (e.key === 'r' || e.key === 'R') forceReload();
      if (e.key === 't' || e.key === 'T') setCameraSystem(prev => prev === 'chase' ? 'free' : 'chase');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWeapon]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) globalCameraState.isDragging = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) globalCameraState.isDragging = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (globalCameraState.isDragging && cameraSystem === 'free') {
        globalCameraState.azimuth -= e.movementX * 0.01;
        globalCameraState.polar -= e.movementY * 0.01;
        globalCameraState.polar = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, globalCameraState.polar));
      }
    };
    const handleWheel = (e: WheelEvent) => {
      if (cameraSystem === 'free') {
        globalCameraState.distance += e.deltaY * 0.01;
        globalCameraState.distance = Math.max(3, Math.min(30, globalCameraState.distance));
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel);
    
    const handleContextMenu = (e: Event) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [cameraSystem]);

  const switchWeapon = (key: string) => {
    if (isReloadingRef.current) return;
    setActiveWeapon(key);
    ammoRef.current = WEAPONS[key].maxAmmo;
    setAmmoUI(WEAPONS[key].maxAmmo);
  };

  // Eventos de Mapa (Health, Meteoritos)
  const [healthpacks, setHealthpacks] = useState<any[]>([
    { id: 1, pos: [20, 0.5, 0] },
    { id: 2, pos: [-20, 0.5, 0] }
  ]);
  const [meteors, setMeteors] = useState<any[]>([]);
  const [craters, setCraters] = useState<{ id: number, pos: [number, number, number], normal: [number, number, number] }[]>([]);

  // Estado del menú de Configuración
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setForceRender] = useState(0);

  const [isSocialOpen, setIsSocialOpen] = useState(false);

  // Escuchar teclas para menús y chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'o') {
        setIsSettingsOpen(prev => !prev);
      }
      if (e.key.toLowerCase() === 'i') {
        if (sessionStorage.getItem('isHost') === 'true') {
          setIsHostPanelOpen(prev => !prev);
        } else {
          setChatMessages(prev => [...prev, { sender: 'System', text: 'Solo el Host puede abrir el panel de control.', isSystem: true }]);
        }
      }
      if (e.key.toLowerCase() === 'p') {
        setIsSocialOpen(prev => !prev);
      }
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsChatOpen(true);
        setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lógica del Partido (Temporizador y Ciclo de Eventos)
  const [currentEvent, setCurrentEvent] = useState<'normal' | 'meteor'>('normal');

  // Sistema de respawn tras morir
  useEffect(() => {
    if (!deathScreen) return;
    const timerId = setTimeout(() => respawnPlayer(), 3000);
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        clearTimeout(timerId);
        respawnPlayer();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timerId);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [deathScreen]);

  const respawnPlayer = () => {
    healthState.amount = 100;
    const spawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
    window.dispatchEvent(new CustomEvent('player-respawn', { detail: spawn }));
    setDeathScreen(null);
  };

  // El servidor controla el matchTime, reaccionamos a los cambios para los eventos
  useEffect(() => {
    const elapsed = 180 - matchTime;
    const cycleIndex = Math.floor(elapsed / 20) % 2;
    setCurrentEvent(cycleIndex === 1 ? 'meteor' : 'normal');
  }, [matchTime]);

  // Spawner de Meteoritos dependiente del Evento Activo
  useEffect(() => {
    if (currentEvent !== 'meteor') return;
    
    const interval = setInterval(() => {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      setMeteors(prev => [...prev, { id: Date.now() + Math.random(), position: [x, 80, z] }]);
    }, 3000); // Caen cada 3s durante el evento
    return () => clearInterval(interval);
  }, [currentEvent]);

  const handleDeath = (killer: string, weapon: string, distance?: number) => {
    if (healthState.amount <= 0 && !deathScreen) {
      setDeathScreen({ killer, weapon, distance });
      const killId = Date.now() + Math.random();
      setKillFeed(prev => [...prev, { id: killId, killer: killer, victim: user?.username || 'You', weapon: weapon, distance }]);
      setTimeout(() => setKillFeed(current => current.filter(k => k.id !== killId)), 7000);
    }
  };

  const handleMeteorImpact = (id: number, hitPos: [number, number, number], normal: [number, number, number]) => {
    // 1. Quitar Meteorito
    setMeteors(prev => prev.filter(m => m.id !== id));
    
    // 2. Spawnear Cráter alineado (Ajustamos Y -1.5 porque el meteorito tiene radio 1.5)
    const craterId = Date.now() + Math.random();
    const groundPos: [number, number, number] = [hitPos[0], hitPos[1] - 1.5, hitPos[2]];
    setCraters(prev => [...prev, { id: craterId, pos: groundPos, normal }]);
    setTimeout(() => setCraters(current => current.filter(c => c.id !== craterId)), 5000);

    // 3. Daño al Jugador
    const dist = globalPlayerPos.distanceTo(new THREE.Vector3(groundPos[0], groundPos[1], groundPos[2]));
    if (dist < 4) {
      if (healthState.amount > 0) {
        healthState.amount = 0;
        handleDeath('Madre Naturaleza', 'Impacto Directo');
      }
      setHitMarkers(prev => [...prev, { id: craterId, pos: groundPos, amount: 100 }]);
    } else if (dist < 15) {
      if (healthState.amount > 0 && healthState.amount - 50 <= 0) {
        healthState.amount = 0;
        handleDeath('Madre Naturaleza', 'Onda Expansiva Meteorito');
      } else {
        healthState.amount = Math.max(0, healthState.amount - 50);
      }
      setHitMarkers(prev => [...prev, { id: craterId, pos: groundPos, amount: 50 }]);
    }
  };

  const forceReload = () => {
    if (isReloadingRef.current || ammoRef.current === WEAPONS[activeWeapon].maxAmmo) return;
    isReloadingRef.current = true;
    setIsReloadingUI(true);
    setTimeout(() => {
      ammoRef.current = WEAPONS[activeWeapon].maxAmmo;
      setAmmoUI(ammoRef.current);
      isReloadingRef.current = false;
      setIsReloadingUI(false);
    }, WEAPONS[activeWeapon].reloadTime);
  };

  const handleShoot = (position: any, direction: any, velocity: any, speed: number, weaponType: string) => {
    if (ammoRef.current <= 0 || isReloadingRef.current) {
      if (ammoRef.current <= 0 && !isReloadingRef.current) forceReload();
      return;
    }

    if (weaponType === 'shotgun') {
      const newProjs = [];
      for(let i = 0; i < 5; i++) {
        const spreadDir = direction.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.2, 
          (Math.random() - 0.5) * 0.2, 
          (Math.random() - 0.5) * 0.2
        )).normalize();
        newProjs.push({ id: Date.now() + i, position, direction: spreadDir, velocity, speed, weapon: weaponType });
        
        // Emit to network
        window.dispatchEvent(new CustomEvent('local-player-shoot', { detail: { position: {x: position[0], y: position[1], z: position[2]}, direction: {x: spreadDir.x, y: spreadDir.y, z: spreadDir.z}, velocity, speed, weapon: weaponType } }));
      }
      setProjectiles(prev => [...prev, ...newProjs]);
    } else {
      setProjectiles(prev => [...prev, { id: Date.now(), position, direction, velocity, speed, weapon: weaponType }]);
      
      // Emit to network
      window.dispatchEvent(new CustomEvent('local-player-shoot', { detail: { position: {x: position[0], y: position[1], z: position[2]}, direction: {x: direction.x, y: direction.y, z: direction.z}, velocity, speed, weapon: weaponType } }));
    }

    if (!hostSettings.infiniteAmmo) {
      ammoRef.current -= 1;
      setAmmoUI(ammoRef.current);
      
      if (ammoRef.current <= 0) forceReload();
    }
  };

  const pickupNitro = (id: number) => {
    setNitros(prev => prev.filter(n => n.id !== id));
    turboState.amount = Math.min(100, turboState.amount + 50); 
    setTimeout(() => {
      const radius = Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      setNitros(prev => [...prev, { id: Date.now(), pos: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius] }]);
    }, 5000);
  };

  const pickupHealth = (id: number) => {
    const hp = healthpacks.find(x => x.id === id);
    if (!hp) return;
    setHealthpacks(arr => arr.filter(x => x.id !== id));
    healthState.amount = Math.min(100, healthState.amount + 50);
    setTimeout(() => {
      setHealthpacks(arr => [...arr, { id: Date.now(), pos: hp.pos }]);
    }, 15000); // Respawn en 15s
  };

  const handleGlobalClick = (e: any) => {
    e.stopPropagation();
    if (e.button !== 2) {
      window.dispatchEvent(new CustomEvent('car-shoot', { detail: e.point }));
    }
  };

  return (
    <div 
      className="absolute inset-0 bg-zinc-950 overflow-hidden cursor-crosshair select-none font-sans"
      onPointerDown={(e) => {
        if (e.shiftKey) e.preventDefault();
      }}
    >
      <Canvas 
        shadows={globalSettings.graphics === 'high' || globalSettings.graphics === 'ultra'} 
        camera={{ position: [0, 5, 10], fov: globalSettings.fov }}
        dpr={[1, globalSettings.resolution]}
      >
        <color attach="background" args={['#031122']} />
        {/* Fog menos intenso */}
        <fog attach="fog" args={['#031122', 40, 250]} />
        
        {/* Si no hay reflejos, aumentamos la luz base para que el plástico se vea bien y no oscuro */}
        <ambientLight intensity={globalSettings.reflections ? 0.4 : 1.2} color="#7dd3fc" />
        <spotLight position={[0, 60, 0]} angle={1.2} penumbra={1} intensity={globalSettings.reflections ? 2.5 : 3.5} color="#38bdf8" castShadow={globalSettings.graphics !== 'low'} />
        
        <React.Suspense fallback={null}>
          <HUDUpdater />
          <Bubbles />
          {intermission && <CinematicCamera />}
          {isSpectator && <SpectatorCamera />}
          <Preload all />
          <Physics timeStep="vary" gravity={[0, -9.81 * hostSettings.gravity, 0]}>
            <MaterialPreloader />
            <MultiplayerManager 
              myCarRef={myCarRef} 
              myUsername={user?.username || 'Player'} 
              myProfilePicture={user?.profilePicture}
              myCarModel={adminCarModel}
              myColor={equippedColor}
              activeWeapon={activeWeapon} 
            />
            {!deathScreen && !isSpectator && !intermission && (
              <InteractiveCar 
                externalCarRef={myCarRef}
                carModel={adminCarModel}
                color={equippedColor} 
                wheelColor={user?.equippedWheelColor || '#222222'}
                turboColor={user?.equippedTurboColor || '#22d3ee'}
                trailColor={STORE_ITEMS.find(i => i.id === user?.equippedItems?.['Trails'])?.hex}
                activeWeapon={activeWeapon} 
                onShoot={handleShoot}
                cameraSystem={cameraSystem}
                initialPosition={initialSpawn}
              />
            )}
            
            {projectiles.map(p => (
              <Projectile key={p.id} {...p} onHit={(id: number, hitDist: number | null, weaponType: string, hitPos: [number, number, number] | null, hitName: string) => {
                setProjectiles(arr => arr.filter(x => x.id !== id));
                
                // Si el proyectil impactó contra algo físico
                if (hitDist !== null) {
                  // Prevenir chocar con tu propio auto
                  if (hitName === 'my_car') return;

                  // Combos: Dispararle a las curas o nitros
                  if (hitName.startsWith('nitro_')) {
                    pickupNitro(parseInt(hitName.split('_')[1]));
                    return;
                  }
                  if (hitName.startsWith('health_')) {
                    pickupHealth(parseInt(hitName.split('_')[1]));
                    return;
                  }

                  // Hit físico simple
                  sounds.play(user?.hitsoundUrl || 'hitmarker', 0.5, !!user?.hitsoundUrl);
                  
                  let damage = WEAPONS[weaponType].damage;
                  if (weaponType === 'shotgun') {
                    damage = Math.max(5, damage - (hitDist * 0.2));
                  }
                  
                  // Hit another player!
                  if (hitName.startsWith('car_') && hitPos) {
                     const targetUsername = hitName.replace('car_', '');
                     window.dispatchEvent(new CustomEvent('local-player-hit', { detail: { target: targetUsername, damage, weapon: weaponType, distance: hitDist } }));
                     setHitMarkers(prev => [...prev, { id: Date.now() + Math.random(), pos: hitPos as [number, number, number], amount: Math.floor(damage) }]);
                  }
                  
                  if (hitPos) {
                    if (user?.equippedItems?.['Explosions']) {
                       const explosionEffect = STORE_ITEMS.find(i => i.id === user.equippedItems['Explosions']);
                       if (explosionEffect) {
                         const killId = Date.now() + Math.random();
                         setKillEffects(prev => [...prev, { id: killId, pos: hitPos, hex: explosionEffect.hex }]);
                         setTimeout(() => setKillEffects(prev => prev.filter(e => e.id !== killId)), 1500);
                       }
                    }
                  }
                }
              }} />
            ))}
            
            {/* Renderizar Hitmarkers */}
            {hitMarkers.map(m => (
              <DamageNumber key={m.id} position={m.pos} amount={m.amount} />
            ))}
            
            {/* Renderizar Kill Effects */}
            {killEffects.map(e => (
              <KillEffect key={e.id} position={e.pos} hex={e.hex} />
            ))}
            
            {/* Eventos: Healthpacks, Meteoritos, Cráteres */}
            {healthpacks.map(h => (
              <HealthPickup key={h.id} id={h.id} position={h.pos} onPickup={pickupHealth} />
            ))}

            {meteors.map(m => (
              <Meteor key={m.id} id={m.id} position={m.position} onImpact={handleMeteorImpact} />
            ))}

            {craters.map(c => (
              <CraterAndShockwave key={c.id} position={c.pos} normal={c.normal} />
            ))}
            
            {nitros.map(n => (
              <NitroPickup key={n.id} id={n.id} position={n.pos} onPickup={pickupNitro} />
            ))}

            {localMap === 'Arena Clásica' && <MapAncestrim onShootClick={handleGlobalClick} />}
            {localMap === 'Cyberpunk City' && <MapCyberpunk onShootClick={handleGlobalClick} />}
            {localMap === 'Lava Volcano' && <MapVolcano onShootClick={handleGlobalClick} />}
            {localMap === 'Neon Tron' && <MapTron onShootClick={handleGlobalClick} />}

            {/* Esfera gigante invisible para disparos al vacío */}
            <mesh onPointerDown={handleGlobalClick}>
              <sphereGeometry args={[3000, 16, 16]} />
              <meshBasicMaterial side={THREE.BackSide} transparent opacity={0} depthWrite={false} />
            </mesh>
          </Physics>
        </React.Suspense>
        
        {globalSettings.reflections && <Environment preset="city" />}
        
        {/* ULTRA GRAPHICS: Shaders y Postprocesado */}
        {(globalSettings.bloom || globalSettings.vignette || globalSettings.chromaticAberration) && (
          <EffectComposer>
            {globalSettings.bloom && <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={1.5} />}
            {globalSettings.vignette && <Vignette eskil={false} offset={0.1} darkness={1.1} />}
            {globalSettings.chromaticAberration && <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />}
          </EffectComposer>
        )}
      </Canvas>
      
      {/* UI Overlay: Información del Mapa */}
      {(!intermission && !isSpectator && !deathScreen) && (
        <div className="absolute top-8 left-8 pointer-events-none">
          <h1 className="text-4xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] tracking-widest uppercase italic">
            {localMap.split(' ')[0]} <span className="text-white">{localMap.split(' ').slice(1).join(' ')}</span>
          </h1>
        <div className="flex gap-3 mt-3">
          <div className="flex flex-col gap-1">
            <div id="fps-counter" className="bg-zinc-900/60 backdrop-blur-md px-4 py-1.5 rounded-md border border-zinc-700/50 text-cyan-100 font-mono text-sm shadow-lg">
              FPS: 60
            </div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase text-center bg-black/40 rounded py-0.5">O para ajustes</div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-md px-4 py-1.5 h-fit rounded-md border border-zinc-700/50 text-cyan-100 font-mono text-sm shadow-lg">
            Ping: {Math.floor(Math.random() * 5) + 12}ms
          </div>
        </div>
      </div>
      )}

      {/* KILLTRACKER SUPERIOR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none drop-shadow-xl z-50">
        {MOCK_PLAYERS.map(p => (
          <div key={p.name} className="relative w-14 h-14 border border-zinc-900 bg-black overflow-hidden rounded-sm">
            <img src={p.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt={p.name} className="w-full h-full object-cover opacity-90" />
            <div className="absolute bottom-0 right-0 px-1 text-white font-black text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,1)] leading-none" style={{ WebkitTextStroke: '1px black' }}>
              {p.kills}
            </div>
            {p.name === (user?.username || 'You') && (
              <div className="absolute top-0 left-0 w-full h-full border-2 border-cyan-400 opacity-50"></div>
            )}
          </div>
        ))}
      </div>

      {/* ANUNCIADOR DE EVENTOS */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
        <div className="text-white font-mono text-lg bg-black/60 px-4 py-1 rounded-full mb-1 border border-white/10 backdrop-blur-md">
          {hostSettings.infiniteTime ? '∞' : `${Math.floor(matchTime / 60)}:${(matchTime % 60).toString().padStart(2, '0')}`}
        </div>
        {currentEvent === 'meteor' ? (
          <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ WebkitTextStroke: '0.5px black' }}>
            ¡Lluvia de Meteoritos!
          </h2>
        ) : (
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest opacity-80" style={{ WebkitTextStroke: '0.5px black' }}>
            Fase Estándar
          </h2>
        )}
      </div>

      {/* Kill Feed (Con Animaciones) */}
      <div className="absolute top-8 right-8 pointer-events-none flex flex-col items-end gap-2">
        {killFeed.map((kill, i) => {
          const killerData = leaderboard.find(p => p.name === kill.killer);
          const victimData = leaderboard.find(p => p.name === kill.victim);
          
          return (
            <div 
              key={kill.id} 
              className="bg-gradient-to-r from-transparent to-black/80 backdrop-blur-sm px-6 py-2 rounded-l-full border-r-4 border-mangi-orange flex items-center gap-4 animate-fade-in-right shadow-2xl transition-all duration-300 transform scale-100 hover:scale-105"
            >
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{kill.killer}</span>
                <img src={killerData?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kill.killer}`} alt={kill.killer} className="w-6 h-6 rounded border border-zinc-700" />
              </div>
              <span className="text-zinc-400 text-[10px] uppercase tracking-widest flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                {kill.weapon}
                {kill.distance && <span className="text-cyan-400 font-mono">({kill.distance}m)</span>}
              </span>
              <div className="flex items-center gap-2">
                <img src={victimData?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kill.victim}`} alt={kill.victim} className="w-6 h-6 rounded border border-zinc-700" />
                <span className="text-mangi-orange font-black text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">{kill.victim}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vehículo Estancado UI (Opacidad controlada por JS nativo) */}
      <div id="stuck-ui" className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md px-8 py-4 rounded-2xl border-2 border-red-500/50 text-center shadow-[0_0_30px_rgba(239,68,68,0.3)] transition-opacity duration-300 pointer-events-none opacity-0 z-40">
        <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-1">¡Vehículo Estancado!</h2>
        <p className="text-zinc-300 font-bold text-lg">Presiona la tecla <span className="text-white bg-red-500 px-2 py-1 rounded mx-1">V</span> para voltear</p>
      </div>

      {(!isSpectator && !intermission && !deathScreen) && (
        <div className="absolute bottom-8 right-8 pointer-events-none flex flex-col items-end gap-4">
          
          {/* HUD de Armas (Con Hover y Animaciones) */}
          <div className="bg-zinc-900/80 backdrop-blur-lg p-5 rounded-2xl border border-zinc-700/50 text-right shadow-2xl min-w-[200px] transition-transform duration-300 hover:scale-105">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Arma Activa</p>
            <h2 className="text-3xl font-black text-white uppercase tracking-wider">{activeWeapon}</h2>
            <div className="mt-1 text-3xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              {isReloadingUI ? (
                <span className="animate-pulse text-mangi-orange">RECARGANDO</span>
              ) : (
                `${ammoUI} / ${WEAPONS[activeWeapon].maxAmmo}`
              )}
            </div>
          </div>

          {/* HUD de Stats (Salud y Turbo) */}
          <div className="bg-zinc-900/80 backdrop-blur-lg p-5 rounded-2xl border border-zinc-700/50 text-right w-72 shadow-2xl">
            
            {/* Salud */}
            <div className="mb-4 group">
              <div className="flex justify-between items-end mb-2 transition-transform duration-300 group-hover:-translate-y-1">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Vida</span>
                <span id="health-text-inner" className="text-mangi-orange font-black text-lg drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]">100 / 100</span>
              </div>
              <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80 shadow-inner">
                <div 
                  id="health-bar-inner"
                  className="h-full bg-mangi-orange shadow-[0_0_15px_#f97316] transition-all duration-300 ease-out"
                  style={{ width: `${healthState.amount}%` }}
                />
              </div>
            </div>

            {/* Turbo */}
            <div className="group">
              <div className="flex justify-between items-end mb-2 transition-transform duration-300 group-hover:-translate-y-1">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Turbo (Shift)</span>
              </div>
              <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80 shadow-inner">
                <div 
                  id="turbo-bar-inner"
                  className="h-full bg-cyan-400 shadow-[0_0_15px_#22d3ee] transition-all duration-75 ease-linear"
                  style={{ width: `${turboState.amount}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PANTALLA DE MUERTE */}
      {deathScreen && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-[150] flex flex-col items-center justify-center pointer-events-auto animate-fade-in-up">
          <h1 className="text-7xl font-black text-white uppercase tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]" style={{ WebkitTextStroke: '2px black' }}>ESTÁS MUERTO</h1>
          <p className="text-3xl text-zinc-300 font-bold mb-6">
            Asesinado por <span className="text-mangi-orange drop-shadow-[0_0_10px_rgba(249,115,22,0.8)] text-4xl">{deathScreen.killer}</span>
          </p>
          <div className="flex gap-6 text-cyan-400 font-mono font-bold bg-black/60 px-8 py-4 rounded-xl border-2 border-white/10 text-xl shadow-2xl">
            <span>ARMA: {deathScreen.weapon}</span>
            {deathScreen.distance !== undefined && <span>DISTANCIA: {deathScreen.distance}m</span>}
          </div>
          <p className="mt-12 text-zinc-500 font-bold uppercase tracking-widest animate-pulse text-lg">
            Respawn automático en 3s o presiona <span className="bg-white text-black px-3 py-1 rounded">ESPACIO</span> para volver instantáneamente
          </p>
        </div>
      )}

      {/* PANTALLA DE FIN DE PARTIDA / INTERMISION */}
      {intermission && (
        <div className="absolute inset-0 bg-transparent z-[200] flex flex-col items-center justify-center pointer-events-auto animate-fade-in-up">
          <div className="bg-black/60 backdrop-blur-md p-10 rounded-3xl border border-zinc-700/50 shadow-2xl flex flex-col items-center">
            <h1 className="text-7xl font-black text-cyan-400 uppercase tracking-widest mb-2 drop-shadow-[0_0_25px_rgba(34,211,238,0.8)]" style={{ WebkitTextStroke: '2px black' }}>VOTACIÓN DE MAPA</h1>
            <p className="text-3xl text-white font-bold mb-2 drop-shadow-md">La partida ha finalizado. Elige el siguiente mapa:</p>
            <p className="text-xl text-mangi-orange font-black mb-10 drop-shadow-md">Cargando en {intermissionTimer} segundos...</p>
            
            <div className="flex gap-8 mb-4">
              {Object.entries(mapVotes).map(([mapName, votes]) => (
                <div 
                  key={mapName}
                  onClick={() => {
                    if (!hasVoted) {
                      setMapVotes(prev => ({ ...prev, [mapName]: prev[mapName] + 1 }));
                      setHasVoted(true);
                    }
                  }}
                  className={`group relative overflow-hidden rounded-2xl border-4 transition-all ${hasVoted ? 'opacity-50 cursor-not-allowed border-zinc-800' : 'cursor-pointer border-zinc-800 hover:border-mangi-orange hover:scale-105'}`}
                >
                  <div className="w-64 h-40 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={{
                        'Arena Clásica': 'https://images.unsplash.com/photo-1541535650810-10d26f5c2ab3?w=500&q=80',
                        'Cyberpunk City': 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=500&q=80',
                        'Lava Volcano': 'https://images.unsplash.com/photo-1610471257912-709ea912eb89?w=500&q=80',
                        'Neon Tron': 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&q=80'
                      }[mapName]} 
                      alt={mapName}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="absolute bottom-0 w-full bg-black/90 py-3 text-center">
                    <h3 className="text-white font-black uppercase text-lg">{mapName}</h3>
                    <p className="text-cyan-400 font-bold">{votes} Votos</p>
                  </div>
                </div>
              ))}
            </div>
            
            {hasVoted ? (
              <p className="text-cyan-400 font-bold tracking-widest uppercase mb-6 text-lg animate-pulse">¡Voto Registrado!</p>
            ) : (
              <div className="h-10 mb-6"></div>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="bg-mangi-orange hover:bg-orange-400 text-white px-10 py-5 rounded-2xl font-black text-2xl uppercase tracking-widest hover:scale-110 transition-transform shadow-[0_0_20px_#f97316]"
            >
              Forzar Siguiente Mapa
            </button>
          </div>
        </div>
      )}

      {/* Scoreboard Modal (Mantenido con TAB) */}
      {controls.scoreboard && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-[600px] shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">Mangi Scoreboard</h2>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-4 text-zinc-500 font-bold text-sm uppercase px-4 pb-2 border-b border-zinc-800">
                <span>Jugador</span>
                <span className="text-right">Ping</span>
                <span className="text-right">Kills</span>
                <span className="text-right">Deaths</span>
              </div>
              {MOCK_PLAYERS.sort((a, b) => b.kills - a.kills).map((p, i) => (
                <div key={i} className={`grid grid-cols-4 px-4 py-3 rounded ${p.name === (user?.username || 'You') ? 'bg-mangi-orange/20 border border-mangi-orange/50' : 'bg-zinc-800/50'}`}>
                  <span className="text-white font-bold">{p.name}</span>
                  <span className="text-right text-zinc-400">{p.ping}ms</span>
                  <span className="text-right text-mangi-orange font-black">{p.kills}</span>
                  <span className="text-right text-zinc-400 font-bold">{p.deaths}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Menú de Configuración (Tecla O) */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-md pointer-events-auto">
          <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl custom-scrollbar">
            <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-wider text-center">Configuración del Juego</h2>
            
            <div className="grid grid-cols-2 gap-8">
              {/* COLUMNA 1: JUEGO Y CÁMARA */}
              <div className="flex flex-col gap-5">
                <h3 className="text-mangi-orange font-black uppercase tracking-widest border-b border-zinc-700 pb-2">Controles y Cámara</h3>
                
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>Sensibilidad de Giro</span>
                    <span className="text-cyan-400">{globalSettings.turnSens.toFixed(1)}x</span>
                  </label>
                  <input 
                    type="range" min="0.5" max="2" step="0.1" 
                    value={globalSettings.turnSens} 
                    onChange={(e) => { globalSettings.turnSens = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>Sens. de Cámara Libre</span>
                    <span className="text-cyan-400">{globalSettings.cameraSens.toFixed(1)}x</span>
                  </label>
                  <input 
                    type="range" min="0.5" max="3" step="0.1" 
                    value={globalSettings.cameraSens} 
                    onChange={(e) => { globalSettings.cameraSens = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>Sens. de Vuelo (Airfly)</span>
                    <span className="text-cyan-400">{globalSettings.airSens.toFixed(1)}x</span>
                  </label>
                  <input 
                    type="range" min="0.1" max="3" step="0.1" 
                    value={globalSettings.airSens} 
                    onChange={(e) => { globalSettings.airSens = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>Sens. Giro en Aire (Yaw)</span>
                    <span className="text-cyan-400">{globalSettings.airTurnSens.toFixed(1)}x</span>
                  </label>
                  <input 
                    type="range" min="0.1" max="3" step="0.1" 
                    value={globalSettings.airTurnSens} 
                    onChange={(e) => { globalSettings.airTurnSens = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>FOV (Campo de Visión)</span>
                    <span className="text-cyan-400">{globalSettings.fov}°</span>
                  </label>
                  <input 
                    type="range" min="30" max="110" step="1" 
                    value={globalSettings.fov} 
                    onChange={(e) => { globalSettings.fov = parseInt(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* COLUMNA 2: GRÁFICOS Y AUDIO */}
              <div className="flex flex-col gap-5">
                <h3 className="text-cyan-400 font-black uppercase tracking-widest border-b border-zinc-700 pb-2">Video y Audio</h3>
                
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Preset Gráfico</label>
                  <select 
                    className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none"
                    value={globalSettings.graphics}
                    onChange={(e) => { applyGraphicsPreset(e.target.value); setForceRender(Date.now()); }}
                  >
                    <option value="ultra">Ultra (Shaders + Postprocesado)</option>
                    <option value="high">Altos (Sombras Dinámicas)</option>
                    <option value="low">Bajos (Máximo Rendimiento)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block flex items-center gap-2">
                      <input type="checkbox" checked={globalSettings.reflections} onChange={(e) => { globalSettings.reflections = e.target.checked; globalSettings.graphics = 'custom'; setForceRender(Date.now()); saveGlobalSettings(); }} />
                      Reflejos
                    </label>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block flex items-center gap-2">
                      <input type="checkbox" checked={globalSettings.bloom} onChange={(e) => { globalSettings.bloom = e.target.checked; globalSettings.graphics = 'custom'; setForceRender(Date.now()); saveGlobalSettings(); }} />
                      Bloom (Brillo)
                    </label>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block flex items-center gap-2">
                      <input type="checkbox" checked={globalSettings.vignette} onChange={(e) => { globalSettings.vignette = e.target.checked; globalSettings.graphics = 'custom'; setForceRender(Date.now()); saveGlobalSettings(); }} />
                      Vignette
                    </label>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block flex items-center gap-2">
                      <input type="checkbox" checked={globalSettings.chromaticAberration} onChange={(e) => { globalSettings.chromaticAberration = e.target.checked; globalSettings.graphics = 'custom'; setForceRender(Date.now()); saveGlobalSettings(); }} />
                      Aberración C.
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Escala de Resolución</label>
                  <select 
                    className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none"
                    value={globalSettings.resolution}
                    onChange={(e) => { globalSettings.resolution = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                  >
                    <option value={1}>100% (Resolución Nativa)</option>
                    <option value={0.75}>75% (Más FPS)</option>
                    <option value={0.5}>50% (Potato PC)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>Volumen General</span>
                    <span className="text-cyan-400">{Math.round(globalSettings.masterVolume * 100)}%</span>
                  </label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={globalSettings.masterVolume} 
                    onChange={(e) => { globalSettings.masterVolume = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-mangi-orange"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-2 flex justify-between">
                    <span>Volumen Efectos (SFX)</span>
                    <span className="text-cyan-400">{Math.round(globalSettings.sfxVolume * 100)}%</span>
                  </label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={globalSettings.sfxVolume} 
                    onChange={(e) => { globalSettings.sfxVolume = parseFloat(e.target.value); setForceRender(Date.now()); saveGlobalSettings(); }}
                    className="w-full accent-mangi-orange"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-3 rounded-xl font-black w-full mt-8 uppercase tracking-widest transition-colors"
            >
              Cerrar Ajustes
            </button>
          </div>
        </div>
      )}

      {/* CHAT IN-GAME */}
      <div className="absolute bottom-4 left-4 z-[100] flex flex-col justify-end pointer-events-none w-96 h-64">
        <div className="overflow-y-auto flex-1 flex flex-col gap-1 mb-2 pr-2" style={{ maskImage: 'linear-gradient(to top, black 80%, transparent 100%)' }}>
          {chatMessages.map((msg, i) => (
            <div key={i} className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded text-sm break-words border-l-2 border-cyan-500">
              {msg.isSystem ? (
                <span className="text-cyan-400 font-bold italic">{msg.text}</span>
              ) : (
                <>
                  <span className={msg.sender === (user?.username || 'You') ? 'text-mangi-orange font-bold mr-2' : 'text-zinc-300 font-bold mr-2'}>{msg.sender}:</span>
                  <span className="text-white">{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>
        {isChatOpen && (
          <div className="pointer-events-auto flex gap-2">
            <input 
              id="chat-input"
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  setChatMessages(prev => [...prev, { sender: user?.username || 'You', text: chatInput.trim() }]);
                  setChatInput('');
                  setIsChatOpen(false);
                  (e.target as HTMLElement).blur();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="w-full bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400 shadow-xl"
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {/* PANEL DE HOST */}
      {isHostPanelOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950/95 backdrop-blur-xl p-8 rounded-3xl border border-mangi-orange/50 shadow-[0_0_50px_rgba(249,115,22,0.2)] z-[200] w-96 pointer-events-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-widest">
              Panel <span className="text-mangi-orange">Host</span>
            </h2>
            <button onClick={() => setIsHostPanelOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Forzar Mapa</label>
              <select 
                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-mangi-orange"
                value={localMap}
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent('request-map-change', { detail: e.target.value }));
                  setChatMessages(prev => [...prev, { sender: 'System', text: `Host cambió el mapa a ${e.target.value}`, isSystem: true }]);
                }}
              >
                <option value="Arena Clásica">Arena Clásica</option>
                <option value="Cyberpunk City">Cyberpunk City</option>
                <option value="Lava Volcano">Lava Volcano</option>
                <option value="Neon Tron">Neon Tron</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Gravedad</label>
              <input 
                type="range" min="0.1" max="3" step="0.1" 
                value={hostSettings.gravity} 
                onChange={(e) => setHostSettings(s => ({...s, gravity: parseFloat(e.target.value)}))}
                className="w-full accent-mangi-orange"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>Lunar</span><span>Normal ({hostSettings.gravity}x)</span><span>Alta</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-zinc-800">
              <span className="text-white font-bold text-sm uppercase">Munición Infinita</span>
              <input 
                type="checkbox" 
                checked={hostSettings.infiniteAmmo}
                onChange={(e) => setHostSettings(s => ({...s, infiniteAmmo: e.target.checked}))}
                className="w-5 h-5 accent-mangi-orange rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-zinc-800">
              <span className="text-white font-bold text-sm uppercase">Tiempo Infinito</span>
              <input 
                type="checkbox" 
                checked={hostSettings.infiniteTime}
                onChange={(e) => setHostSettings(s => ({...s, infiniteTime: e.target.checked}))}
                className="w-5 h-5 accent-mangi-orange rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs font-bold uppercase mb-2 block">Rotación</label>
              <select 
                className="w-full bg-black border border-zinc-700 rounded p-2 text-white outline-none focus:border-mangi-orange"
                value={hostSettings.mapRotation}
                onChange={(e) => setHostSettings(s => ({...s, mapRotation: e.target.value}))}
              >
                <option value="all">Rotar todos los mapas</option>
                <option value="single">Fijar este mapa</option>
              </select>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-zinc-400 text-xs font-bold uppercase">Jugadores</h3>
                <button 
                  onClick={() => setIsServerLocked(v => !v)}
                  className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isServerLocked ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}
                >
                  {isServerLocked ? 'Desbloquear' : 'Bloquear (Nadie entra)'}
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {MOCK_PLAYERS.map(p => (
                  <div key={p.name} className="flex justify-between items-center bg-black/30 p-2 rounded">
                    <span className="text-white font-bold text-sm flex flex-col">
                      {p.name}
                      {hostSettings.mode === 'Team Deathmatch' && <span className={`text-[10px] ${p.team === 'red' ? 'text-red-400' : 'text-blue-400'}`}>{p.team.toUpperCase()}</span>}
                    </span>
                    <div className="flex gap-1">
                      {hostSettings.mode === 'Team Deathmatch' && (
                        <button 
                          onClick={() => {
                            setLeaderboard(l => l.map(pl => pl.name === p.name ? { ...pl, team: pl.team === 'red' ? 'blue' : 'red' } : pl));
                          }}
                          className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold uppercase bg-cyan-400/10 hover:bg-cyan-400/20 px-2 py-1 rounded"
                        >
                          Team
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setChatMessages(prev => [...prev, { sender: 'System', text: `Host puso a ${p.name} en espectador.`, isSystem: true }]);
                          if (p.isMe) setIsSpectator(true);
                        }}
                        className="text-purple-400 hover:text-purple-300 text-[10px] font-bold uppercase bg-purple-400/10 hover:bg-purple-400/20 px-2 py-1 rounded"
                      >
                        Spec
                      </button>
                      <button 
                        onClick={() => {
                          setChatMessages(prev => [...prev, { sender: 'System', text: `${p.name} fue expulsado.`, isSystem: true }]);
                        }}
                        className="text-red-500 hover:text-red-400 text-[10px] font-bold uppercase bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded"
                      >
                        Kick
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM SELECTOR */}
      {hostSettings.mode === 'Team Deathmatch' && !hasChosenTeam && !isSpectator && !intermission && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-8">
          <h1 className="text-5xl font-black text-white uppercase tracking-widest mb-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            Elige <span className="text-mangi-orange">Tu Equipo</span>
          </h1>
          <div className="flex gap-8 w-full max-w-4xl h-96">
            <button 
              onClick={() => { setLeaderboard(l => l.map(p => p.isMe ? { ...p, team: 'blue' } : p)); setHasChosenTeam(true); }}
              className="flex-1 rounded-3xl border-4 border-blue-500 bg-blue-900/20 hover:bg-blue-500/40 transition-all flex flex-col items-center justify-center group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-6xl font-black text-blue-400 group-hover:scale-110 transition-transform">AZUL</span>
            </button>
            <button 
              onClick={() => { setLeaderboard(l => l.map(p => p.isMe ? { ...p, team: 'red' } : p)); setHasChosenTeam(true); }}
              className="flex-1 rounded-3xl border-4 border-red-500 bg-red-900/20 hover:bg-red-500/40 transition-all flex flex-col items-center justify-center group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-6xl font-black text-red-400 group-hover:scale-110 transition-transform">ROJO</span>
            </button>
          </div>
        </div>
      )}

      {/* PANEL SOCIAL / PARTY (P) */}
      {isSocialOpen && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950/95 backdrop-blur-xl p-8 rounded-3xl border border-mangi-blue/50 shadow-[0_0_50px_rgba(34,211,238,0.2)] z-[200] w-[500px] pointer-events-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
              Social <span className="text-cyan-400">& Party</span>
            </h2>
            <button onClick={() => setIsSocialOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <button className="flex-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 py-2 rounded-lg font-bold uppercase hover:bg-cyan-500/30 transition-colors">
              Amigos (3)
            </button>
            <button className="flex-1 bg-zinc-800/50 text-zinc-400 border border-zinc-700 py-2 rounded-lg font-bold uppercase hover:bg-zinc-800 transition-colors">
              Solicitudes (1)
            </button>
            <button className="flex-1 bg-zinc-800/50 text-zinc-400 border border-zinc-700 py-2 rounded-lg font-bold uppercase hover:bg-zinc-800 transition-colors">
              Party
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {[
              { name: 'Nico', status: 'Jugando MANGI Chaos', isOnline: true },
              { name: 'Mateo', status: 'En el Menú', isOnline: true },
              { name: 'Valen', status: 'Desconectado', isOnline: false }
            ].map(friend => (
              <div key={friend.name} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} alt={friend.name} />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${friend.isOnline ? 'bg-green-500' : 'bg-zinc-500'}`} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{friend.name}</h4>
                    <p className={`text-xs ${friend.isOnline ? 'text-cyan-400' : 'text-zinc-500'}`}>{friend.status}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-colors" title="Mensaje Directo">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </button>
                  {friend.isOnline && (
                    <button className="bg-mangi-orange/20 hover:bg-mangi-orange/30 text-mangi-orange border border-mangi-orange/50 p-2 rounded-lg transition-colors" title="Invitar a la Party">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-zinc-400 text-xs font-bold uppercase mb-3">Añadir Amigo</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nombre de usuario..." 
                className="flex-1 bg-black border border-zinc-700 rounded-lg p-2 text-white outline-none focus:border-cyan-400"
              />
              <button className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 rounded-lg font-bold uppercase transition-colors">
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ADMIN TROLL OVERLAYS */}
      {jumpscareText && (
        <div className="absolute inset-0 pointer-events-none z-[9999] flex items-center justify-center bg-red-900/40 animate-pulse">
          <h1 className="text-[12rem] font-black text-red-500 uppercase tracking-tighter drop-shadow-[0_0_100px_rgba(239,68,68,1)] text-center leading-none" style={{ WebkitTextStroke: '4px black' }}>
            {jumpscareText}
          </h1>
        </div>
      )}

      {fakeBan && (
        <div className="absolute inset-0 z-[10000] bg-red-600 flex flex-col items-center justify-center p-8 pointer-events-auto">
          <ShieldAlert className="text-white w-48 h-48 mb-8" />
          <h1 className="text-7xl font-black text-white uppercase tracking-widest mb-4">
            BANEADO DEL SERVIDOR
          </h1>
          <p className="text-2xl text-red-100 font-bold mb-12">Razón: Comportamiento no permitido detectado por Administrador.</p>
          <button onClick={() => window.location.href = '/servers'} className="bg-white text-red-600 px-8 py-4 rounded-xl font-black text-2xl uppercase hover:scale-105 transition-transform">
            SALIR AL LOBBY
          </button>
        </div>
      )}

    </div>
  );
};

export default WebGLDemo;
