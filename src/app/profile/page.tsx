'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { GlassCard } from '@/components/GlassCard';
import { GlowButton } from '@/components/GlowButton';
import { useUserStore } from '@/store/useUserStore';
import { Upload, Music, Image as ImageIcon, Globe, Play, Check } from 'lucide-react';
import { sounds } from '@/utils/sound';

export default function ProfilePage() {
  const { user, updateProfile } = useUserStore();
  const [uploading, setUploading] = useState(false);
  const [hitsounds, setHitsounds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'community' | 'mine'>('community');
  const [makePublic, setMakePublic] = useState(true);

  useEffect(() => {
    fetch('/api/public-hitsounds')
      .then(res => res.json())
      .then(data => {
        if (data.hitsounds) setHitsounds(data.hitsounds);
      });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pfp' | 'hitsound') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (type === 'pfp') {
      const maxSize = 8 * 1024 * 1024; // 8MB
      if (file.size > maxSize) {
        alert("El archivo de tu foto de perfil es muy grande. El límite es de 8MB. (Se recomienda 128x128 píxeles o usar una imagen cuadrada nítida)");
        return;
      }
      performUpload(file, type);
    } else if (type === 'hitsound') {
      const maxSize = 512 * 1024; // 512KB
      if (file.size > maxSize) {
        alert("El archivo de sonido es muy grande. El límite es de 512KB para mantener la fluidez en partida.");
        return;
      }
      
      setUploading(true);
      const audio = new Audio(URL.createObjectURL(file));
      audio.onloadedmetadata = () => {
        if (audio.duration > 5.1) {
          alert(`El sonido dura ${audio.duration.toFixed(1)}s. El límite máximo es de 5 segundos, similar a Discord.`);
          setUploading(false);
          return;
        }
        performUpload(file, type);
      };
      audio.onerror = () => {
        alert("El archivo no es un audio válido.");
        setUploading(false);
      }
    }
  };

  const performUpload = async (file: File, type: 'pfp' | 'hitsound') => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        if (type === 'pfp') {
          updateProfile(data.url, user?.hitsoundUrl);
        } else {
          updateProfile(user?.profilePicture, data.url);
          if (makePublic) {
            publishHitsound(data.url, file.name.split('.')[0]);
          } else {
            publishHitsound(data.url, file.name.split('.')[0], false);
          }
        }
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
    setUploading(false);
  };

  const publishHitsound = async (url: string, defaultName: string, isPublic: boolean = true) => {
    if (!user) return;
    const name = prompt(`Dale un nombre a tu hitsound ${isPublic ? 'público' : 'privado'}:`, defaultName);
    if (!name) return;

    try {
      const res = await fetch('/api/public-hitsounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url: url,
          uploaderId: user.username,
          isPublic
        })
      });
      const data = await res.json();
      if (data.success) {
        setHitsounds([data.hitsound, ...hitsounds]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const playHitsound = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  if (!user) return <div className="p-20 text-white">Debes iniciar sesión.</div>;

  const filteredHitsounds = hitsounds.filter(hs => {
    const matchesTab = activeTab === 'mine' ? hs.uploaderId === user.username : hs.isPublic;
    const matchesSearch = hs.name.toLowerCase().includes(searchQuery.toLowerCase()) || hs.uploaderId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-8 max-w-5xl mx-auto">
      <Navbar />

      <h1 className="text-4xl font-black text-white mb-8">Personalizar Perfil</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Picture */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ImageIcon className="text-mangi-orange" />
            Foto de Perfil (PFP)
          </h2>
          
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-mangi-panel border-2 border-mangi-border overflow-hidden relative">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="PFP" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-mangi-orange bg-mangi-orange/10">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            
            <div>
              <label className="cursor-pointer inline-block">
                <span className="relative inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200 overflow-hidden outline-none px-4 py-2 text-sm bg-transparent hover:bg-white/5 text-mangi-text-secondary border border-mangi-border">
                  {uploading ? 'Subiendo...' : 'Subir Nueva Imagen'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'pfp')} disabled={uploading} />
              </label>
              <p className="text-xs text-mangi-text-secondary mt-2">Formatos: JPG, PNG, GIF.<br/>Máx: 8MB. Recom: 128x128px.</p>
            </div>
          </div>
        </GlassCard>

        {/* Custom Hitsound */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Music className="text-mangi-electric" />
            Subir Sonido de Impacto
          </h2>
          
          <div className="flex flex-col gap-4 mb-6">
            <div className="p-4 bg-black/40 rounded-lg border border-mangi-border flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-white">HitSound Equipado</p>
                <p className="text-xs text-mangi-text-secondary">{user.hitsoundUrl ? 'Sonido Personalizado' : 'Por Defecto (hitmarker)'}</p>
              </div>
              <button 
                onClick={() => user.hitsoundUrl ? playHitsound(user.hitsoundUrl) : sounds.play('hitmarker', 0.5, false)}
                className="w-10 h-10 rounded-full bg-mangi-panel flex items-center justify-center hover:bg-mangi-orange transition-colors"
              >
                <Play size={16} className="text-white fill-current" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-mangi-text-secondary mb-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={makePublic} 
                  onChange={(e) => setMakePublic(e.target.checked)}
                  className="w-4 h-4 accent-mangi-orange bg-black/50 border-mangi-border rounded"
                />
                Hacer público en la comunidad (Cualquiera podrá usarlo)
              </label>
              <label className="cursor-pointer w-full">
                <span className="relative inline-flex w-full items-center justify-center font-bold rounded-lg transition-all duration-200 overflow-hidden outline-none px-4 py-2 text-sm bg-mangi-orange/20 hover:bg-mangi-orange/30 text-mangi-orange border border-mangi-orange/50">
                  {uploading ? '...' : <><Upload size={16} className="mr-2"/> Seleccionar Archivo (.mp3) y Subir</>}
                </span>
                <input type="file" accept="audio/mpeg, audio/wav" className="hidden" onChange={(e) => handleFileUpload(e, 'hitsound')} disabled={uploading} />
              </label>
              <p className="text-xs text-mangi-text-secondary mt-1 text-center">Máx: 5 segundos y 512KB (Estilo Discord).</p>
            </div>
          </div>
        </GlassCard>

        {/* HitSounds Library */}
        <GlassCard className="p-6 md:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe className="text-mangi-leaf" />
              Biblioteca de HitSounds
            </h2>
            
            <input 
              type="text" 
              placeholder="Buscar por nombre o autor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/50 border border-mangi-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-mangi-orange w-full md:w-64"
            />
          </div>
          
          <div className="flex gap-4 mb-6 border-b border-mangi-border">
            <button 
              onClick={() => setActiveTab('community')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'community' ? 'text-mangi-orange border-b-2 border-mangi-orange' : 'text-mangi-text-secondary hover:text-white'}`}
            >
              Comunidad
            </button>
            <button 
              onClick={() => setActiveTab('mine')}
              className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'mine' ? 'text-mangi-orange border-b-2 border-mangi-orange' : 'text-mangi-text-secondary hover:text-white'}`}
            >
              Mis Sonidos
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredHitsounds.length === 0 ? (
              <p className="text-mangi-text-secondary col-span-3 text-center py-8">
                {searchQuery ? 'No se encontraron resultados.' : 'Aún no hay HitSounds en esta categoría.'}
              </p>
            ) : (
              filteredHitsounds.map((hs, i) => (
                <div key={i} className="p-3 bg-black/40 rounded-lg border border-mangi-border flex justify-between items-center group hover:border-mangi-orange transition-colors">
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                      {hs.name}
                      {!hs.isPublic && <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">Privado</span>}
                    </p>
                    <p className="text-xs text-mangi-text-secondary truncate">por @{hs.uploaderId}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => playHitsound(hs.url)}
                      className="w-8 h-8 rounded-full bg-mangi-panel flex items-center justify-center hover:bg-mangi-orange transition-colors"
                    >
                      <Play size={12} className="text-white fill-current" />
                    </button>
                    <button 
                      onClick={() => updateProfile(user.profilePicture, hs.url)}
                      className="w-8 h-8 rounded-full bg-mangi-panel flex items-center justify-center hover:bg-mangi-leaf transition-colors"
                      title="Equipar"
                    >
                      {user.hitsoundUrl === hs.url ? <Check size={14} className="text-mangi-leaf" /> : <Upload size={14} className="text-white" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
