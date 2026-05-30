import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  level: number;
  xp: number;
  coins: number;
  inventory: number[];
  equippedColor: string;
  equippedItems: Record<string, number>;
  profilePicture?: string;
  hitsoundUrl?: string;
  equippedWheelColor?: string;
  equippedKillEffect?: string;
  equippedTrail?: string;
  equippedTurboColor?: string;
  stats?: {
    wins: number;
    eliminations: number;
    demolitions: number;
    matchesPlayed: number;
  };
  missionProgress?: Record<number, number>; // missionId -> current progress
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateCoins: (newAmount: number) => void;
  addXp: (amount: number) => void;
  purchaseItem: (itemId: number, price: number) => boolean;
  equipColor: (colorHex: string) => void;
  equipLoadout: (colorHex: string, wheelColorHex: string, turboColorHex: string, items: Record<string, number>) => void;
  updateProfile: (profilePicture?: string, hitsoundUrl?: string) => void;
  updateStats: (updates: Partial<User['stats']>) => void;
  updateMissionProgress: (missionId: number, progressAmount: number) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (userData) => {
        // En login, combinamos lo que viene de la DB con posibles cosas locales
        set((state) => ({ 
          user: { 
            ...userData,
            username: userData.username.includes('#') ? userData.username : `${userData.username}#${Math.floor(1000 + Math.random() * 9000)}`,
            inventory: state.user?.inventory || userData.inventory || [], 
            equippedColor: state.user?.equippedColor || userData.equippedColor || '#ffffff',
            equippedItems: state.user?.equippedItems || userData.equippedItems || {},
            profilePicture: userData.profilePicture || state.user?.profilePicture,
            hitsoundUrl: userData.hitsoundUrl || state.user?.hitsoundUrl,
          }, 
          isAuthenticated: true 
        }));
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      updateCoins: (newAmount) => set((state) => ({
        user: state.user ? { ...state.user, coins: newAmount } : null
      })),
      updateProfile: (profilePicture, hitsoundUrl) => {
        let syncedState: User | null = null;
        set((state) => {
          if (!state.user) return state;
          syncedState = { ...state.user };
          if (profilePicture !== undefined) syncedState.profilePicture = profilePicture;
          if (hitsoundUrl !== undefined) syncedState.hitsoundUrl = hitsoundUrl;
          return { user: syncedState };
        });

        if (syncedState) {
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: (syncedState as User).id,
              profilePicture: (syncedState as User).profilePicture,
              hitsoundUrl: (syncedState as User).hitsoundUrl,
            })
          }).catch(console.error);
        }
      },
      purchaseItem: (itemId, price) => {
        let success = false;
        let syncedState: User | null = null;
        
        set((state) => {
          if (!state.user || state.user.coins < price || state.user.inventory.includes(itemId)) {
            return state;
          }
          success = true;
          syncedState = { 
            ...state.user, 
            coins: state.user.coins - price,
            inventory: [...state.user.inventory, itemId]
          };
          return { user: syncedState };
        });

        // Sincronizar con la base de datos de Prisma
        if (success && syncedState) {
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: (syncedState as User).id,
              coins: (syncedState as User).coins,
              items: (syncedState as User).inventory,
              equippedColor: (syncedState as User).equippedColor,
              equippedItems: (syncedState as User).equippedItems
            })
          }).catch(console.error);
        }
        
        return success;
      },
      equipColor: (colorHex) => {
        let syncedState: User | null = null;
        set((state) => {
          if (!state.user) return state;
          syncedState = { ...state.user, equippedColor: colorHex };
          return { user: syncedState };
        });

        if (syncedState) {
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: (syncedState as User).id,
              coins: (syncedState as User).coins,
              items: (syncedState as User).inventory,
              equippedColor: colorHex,
              equippedItems: (syncedState as User).equippedItems
            })
          }).catch(console.error);
        }
      },
      equipLoadout: (colorHex, wheelColorHex, turboColorHex, items) => {
        let syncedState: User | null = null;
        set((state) => {
          if (!state.user) return state;
          syncedState = { ...state.user, equippedColor: colorHex, equippedWheelColor: wheelColorHex, equippedTurboColor: turboColorHex, equippedItems: items };
          return { user: syncedState };
        });

        if (syncedState) {
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: (syncedState as User).id,
              coins: (syncedState as User).coins,
              items: (syncedState as User).inventory,
              equippedColor: colorHex,
              equippedWheelColor: wheelColorHex,
              equippedTurboColor: turboColorHex,
              equippedItems: items
            })
          }).catch(console.error);
        }
      },
      addXp: (amount) => set((state) => {
        if (!state.user) return state;
        
        // Logica basica de subida de nivel
        let newXp = state.user.xp + amount;
        let newLevel = state.user.level;
        const xpNeeded = newLevel * 1000; // Ej: Nivel 1 necesita 1000, Nivel 2 2000...
        
        if (newXp >= xpNeeded) {
          newLevel += 1;
          newXp -= xpNeeded;
        }
        
        return {
          user: { ...state.user, xp: newXp, level: newLevel }
        };
      }),
      updateStats: (updates) => set((state) => {
        if (!state.user) return state;
        return {
          user: {
            ...state.user,
            stats: {
              wins: (state.user.stats?.wins || 0) + (updates.wins || 0),
              eliminations: (state.user.stats?.eliminations || 0) + (updates.eliminations || 0),
              demolitions: (state.user.stats?.demolitions || 0) + (updates.demolitions || 0),
              matchesPlayed: (state.user.stats?.matchesPlayed || 0) + (updates.matchesPlayed || 0),
            }
          }
        };
      }),
      updateMissionProgress: (missionId, progressAmount) => set((state) => {
        if (!state.user) return state;
        const currentProgress = state.user.missionProgress?.[missionId] || 0;
        return {
          user: {
            ...state.user,
            missionProgress: {
              ...(state.user.missionProgress || {}),
              [missionId]: currentProgress + progressAmount
            }
          }
        };
      })
    }),
    {
      name: 'mangi-user-storage', // nombre de la key en localStorage
    }
  )
);
