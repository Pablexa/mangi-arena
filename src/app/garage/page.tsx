'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { Box, PaintBucket, Wind, Zap, AudioLines, Search, Lock, Coins, CheckCircle2 } from 'lucide-react';
import { playHover, playEquip, playClickConfirm, sounds } from '@/utils/sound';
import { MangiLogo } from '@/components/MangiLogo';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Center, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { HexColorPicker, HexColorInput } from 'react-colorful';

import { useUserStore } from '@/store/useUserStore';
import { STORE_ITEMS } from '@/utils/storeItems';

function ExplosionPreview({ hex }: { hex: string }) {
  const ref = React.useRef<any>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      ref.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      ref.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
    }
  });
  return (
    <mesh ref={ref} position={[2, 1.5, -2]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={hex} emissive={hex} emissiveIntensity={3} transparent opacity={0.8} />
    </mesh>
  );
}

function CarModel({ color, wheelColor, activeTrailHex, activeExplosionHex }: { color: string, wheelColor: string, activeTrailHex?: string, activeExplosionHex?: string }) {
  const { scene } = useGLTF('/models/car_default.glb');
  const carRef = React.useRef<THREE.Group>(null);
  const visualRef = React.useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (carRef.current) carRef.current.rotation.y += delta * 1.5; // Girar más rápido para ver el trail
  });

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

  const trailTargetRef = React.useRef<THREE.Group>(null);

  return (
    <group ref={carRef} rotation={[0, -Math.PI / 4, 0]} position={[0, 0, 0]}>
      {activeExplosionHex && <ExplosionPreview hex={activeExplosionHex} />}
      <Center position={[0, 0, 0]}>
        <group ref={visualRef}>
          <primitive object={scene} scale={1.5} />
          <group ref={trailTargetRef} position={[0, 0.5, -2]} />
        </group>
        {activeTrailHex && (
          <Trail
            width={1.5}
            length={15}
            color={new THREE.Color(activeTrailHex)}
            attenuation={(t) => t * t}
            target={trailTargetRef}
          />
        )}
      </Center>
    </group>
  );
}

export default function GaragePage() {
  const { user, equipLoadout, purchaseItem } = useUserStore();
  const [activeCategory, setActiveCategory] = useState<string>('Car Color');
  const [localColor, setLocalColor] = useState(user?.equippedColor || '#ffffff');
  const [localWheelColor, setLocalWheelColor] = useState(user?.equippedWheelColor || '#222222');
  const [localTurboColor, setLocalTurboColor] = useState(user?.equippedTurboColor || '#22d3ee');
  const [localItems, setLocalItems] = useState<Record<string, number>>(user?.equippedItems || {});
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (user?.equippedColor) setLocalColor(user.equippedColor);
    if (user?.equippedWheelColor) setLocalWheelColor(user.equippedWheelColor);
    if (user?.equippedTurboColor) setLocalTurboColor(user.equippedTurboColor);
    if (user?.equippedItems) setLocalItems(user.equippedItems);
  }, [user?.equippedColor, user?.equippedWheelColor, user?.equippedTurboColor, user?.equippedItems]);

  const categories = [
    { id: 'Car Color', icon: PaintBucket },
    { id: 'Wheel Color', icon: Box },
    { id: 'Turbo Color', icon: Zap },
    { id: 'Trails', icon: Wind },
    { id: 'Explosions', icon: Zap },
    { id: 'Horns', icon: AudioLines },
  ];

  const colors = [
    '#ffffff', '#000000', '#222222', '#FF9F1C', '#FFD166', '#FF4D2E', '#3BAA35', '#38BDF8', '#8B5CF6', '#EC4899', '#22d3ee'
  ];

  const handleEquipColor = (color: string) => {
    playEquip();
    if (activeCategory === 'Car Color') setLocalColor(color);
    else if (activeCategory === 'Wheel Color') setLocalWheelColor(color);
    else if (activeCategory === 'Turbo Color') setLocalTurboColor(color);
  };

  const handleSave = () => {
    equipLoadout(localColor, localWheelColor, localTurboColor, localItems);
    playClickConfirm();
    alert("Loadout Saved! The color and items are now equipped globally and visible in the Mangi Engine.");
  };

  const handleBuy = (item: any) => {
    if (user && user.coins >= item.price) {
      playClickConfirm();
      purchaseItem(item.id, item.price);
      // Auto-equip on buy
      setLocalItems(prev => ({ ...prev, [item.type]: item.id }));
    } else {
      sounds.play('error');
      alert("No tienes suficientes monedas para esto.");
    }
  };

  const filteredItems = useMemo(() => {
    return STORE_ITEMS
      .filter(item => item.type === activeCategory)
      .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col">
      <Navbar />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-4xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,159,28,0.3)]">
          GARAGE <span className="text-mangi-orange">& STORE</span>
        </h1>
        <div className="flex items-center gap-3 bg-black/50 border border-mangi-orange/30 px-6 py-3 rounded-2xl backdrop-blur-md">
          <Coins className="text-mangi-gold" size={24} />
          <span className="text-2xl font-black text-white">{user?.coins || 0}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: 3D Preview */}
        <div className="w-full lg:w-2/5 flex flex-col relative h-[50vh] lg:h-auto">
          {/* MANGI Brand Stamp */}
          <div className="absolute top-4 left-4 z-30 opacity-20 pointer-events-none grayscale">
             <MangiLogo size="lg" />
          </div>

          <GlassCard className="flex-1 flex items-center justify-center relative overflow-hidden group border-cyan-500/20">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
            
            {/* Ambient light for background glow based on car color */}
            <motion.div 
              className="absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none"
              style={{ backgroundColor: localColor }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-20">
              <Canvas camera={{ position: [4, 2, 5], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
                
                <React.Suspense fallback={null}>
                  <CarModel 
                    color={localColor} 
                    wheelColor={localWheelColor} 
                    activeTrailHex={STORE_ITEMS.find(i => i.id === localItems['Trails'])?.hex}
                    activeExplosionHex={STORE_ITEMS.find(i => i.id === localItems['Explosions'])?.hex}
                  />
                  <Environment preset="city" />
                  <ContactShadows position={[0, -0.6, 0]} opacity={0.6} scale={10} blur={2.5} far={4} />
                </React.Suspense>
                
                <OrbitControls enablePan={false} enableZoom={true} minDistance={3} maxDistance={8} />
              </Canvas>
            </div>

            <div className="absolute bottom-6 w-full px-6 flex justify-between z-30">
               <GlowButton variant="secondary" onClick={() => {
                  setLocalColor(user?.equippedColor || '#ffffff');
                  setLocalWheelColor(user?.equippedWheelColor || '#222222');
                  setLocalItems(user?.equippedItems || {});
               }}>Revert</GlowButton>
               <GlowButton variant="mango" onClick={handleSave}>Save Loadout</GlowButton>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Customization Grid */}
        <div className="w-full lg:w-3/5 flex flex-col h-[70vh] lg:h-auto">
          <GlassCard className="flex-1 flex flex-col overflow-hidden bg-black/60 border-zinc-800">
            
            {/* Categories Header */}
            <div className="flex overflow-x-auto p-4 border-b border-zinc-800 gap-2 hide-scrollbar">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { playClickConfirm(); setActiveCategory(cat.id); }}
                    onMouseEnter={playHover}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-mangi-orange text-black shadow-[0_0_15px_rgba(255,159,28,0.4)]' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={18} />
                    {cat.id}
                  </button>
                );
              })}
            </div>

            {/* Search Bar for items */}
            {activeCategory !== 'Car Color' && activeCategory !== 'Wheel Color' && activeCategory !== 'Turbo Color' && (
              <div className="px-6 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    placeholder={`Buscar en ${activeCategory}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-mangi-orange transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Items Grid Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {(activeCategory === 'Car Color' || activeCategory === 'Wheel Color' || activeCategory === 'Turbo Color') && (
                    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto pt-4">
                      {/* Color Wheel */}
                      <div className="w-full custom-color-picker drop-shadow-2xl">
                        <HexColorPicker 
                          color={activeCategory === 'Car Color' ? localColor : (activeCategory === 'Wheel Color' ? localWheelColor : localTurboColor)} 
                          onChange={(color) => activeCategory === 'Car Color' ? setLocalColor(color) : (activeCategory === 'Wheel Color' ? setLocalWheelColor(color) : setLocalTurboColor(color))} 
                          style={{ width: '100%', height: '250px' }} 
                        />
                      </div>
                      
                      {/* Hex Input */}
                      <div className="w-full relative group">
                         <div 
                           className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded border-2 border-zinc-700 transition-colors" 
                           style={{ backgroundColor: activeCategory === 'Car Color' ? localColor : (activeCategory === 'Wheel Color' ? localWheelColor : localTurboColor) }} 
                         />
                         <HexColorInput 
                           color={activeCategory === 'Car Color' ? localColor : (activeCategory === 'Wheel Color' ? localWheelColor : localTurboColor)} 
                           onChange={(color) => activeCategory === 'Car Color' ? setLocalColor(color) : (activeCategory === 'Wheel Color' ? setLocalWheelColor(color) : setLocalTurboColor(color))} 
                           prefixed 
                           className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-14 pr-4 text-white font-bold uppercase tracking-widest focus:outline-none focus:border-mangi-orange transition-all"
                         />
                      </div>
                      
                      {/* Quick Presets */}
                      <div className="grid grid-cols-5 gap-3 w-full mt-4">
                        {colors.map((color, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEquipColor(color)}
                            className={`w-full aspect-square rounded-xl border-2 transition-all cursor-pointer ${
                              (activeCategory === 'Car Color' ? localColor : (activeCategory === 'Wheel Color' ? localWheelColor : localTurboColor)).toUpperCase() === color.toUpperCase() ? 'border-mangi-orange shadow-[0_0_15px_rgba(255,159,28,0.5)]' : 'border-zinc-800 hover:border-zinc-500'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {activeCategory !== 'Car Color' && activeCategory !== 'Wheel Color' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {filteredItems.map((item) => {
                        const isOwned = user?.inventory?.includes(item.id) || false;
                        const isEquipped = localItems[activeCategory] === item.id;
                        
                        return (
                          <div 
                            key={item.id}
                            onClick={() => {
                              if (isOwned) {
                                playEquip();
                                setLocalItems(prev => ({ ...prev, [activeCategory]: item.id }));
                              }
                            }}
                            className={`relative bg-black rounded-2xl border-2 p-4 flex flex-col items-center text-center transition-all overflow-hidden ${
                              isEquipped 
                                ? 'border-mangi-orange shadow-[0_0_20px_rgba(255,159,28,0.3)]' 
                                : isOwned
                                  ? 'border-zinc-700 hover:border-zinc-500 cursor-pointer'
                                  : 'border-zinc-900 opacity-80 cursor-default'
                            }`}
                          >
                            {/* Visual Effect Preview */}
                            <div className="w-full aspect-square bg-zinc-900 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                               <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${item.color}`} />
                               {activeCategory === 'Trails' && (
                                  <div className={`w-full h-2 bg-gradient-to-r ${item.color} -rotate-45 shadow-[0_0_15px_currentColor]`} />
                               )}
                               {activeCategory === 'Explosions' && (
                                  <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${item.color} shadow-[0_0_25px_currentColor] animate-pulse`} />
                               )}
                               {activeCategory === 'Horns' && (
                                  <AudioLines className={`w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />
                               )}
                               
                               {isEquipped && (
                                 <div className="absolute top-2 right-2 text-mangi-orange drop-shadow-md">
                                   <CheckCircle2 size={20} className="fill-black/50" />
                                 </div>
                               )}
                            </div>
                            
                            <h4 className={`font-bold text-sm mb-1 ${isOwned ? 'text-white' : 'text-zinc-400'}`}>{item.name}</h4>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{item.rarity}</p>
                            
                            {!isOwned && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                                className="mt-3 w-full flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2 rounded-lg transition-colors group"
                              >
                                <Lock size={12} className="text-zinc-400 group-hover:text-white" />
                                <span>{item.price}</span>
                                <Coins size={12} className="text-mangi-gold" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {filteredItems.length === 0 && (
                        <div className="col-span-full text-center py-12 text-zinc-500 font-bold uppercase tracking-widest">
                          No se encontraron items.
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

          </GlassCard>
        </div>

      </div>
    </div>
  );
}
