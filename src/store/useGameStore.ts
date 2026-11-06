import { create } from 'zustand';
import defaultQuests from '@/data/quests.json';
import defaultItems from '@/data/items.json';

export type UIOverlayType = 'none' | 'dialogue' | 'minigame' | 'inventory';

export interface DialogueOption {
  id: string;
  label: string;
  translation?: string;
  nextDialogueId?: string;
  action?: () => void;
}

export interface DialoguePayload {
  speaker: string;
  text: string;
  translation?: string;
  avatar?: string;
  options?: DialogueOption[];
}

export interface InventoryItem {
  id: string;
  name: string;
  article: 'der' | 'die' | 'das';
  plural: string;
  translation: string;
  description: string;
  cost: number;
  icon: string;
  quantity: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  coinReward: number;
}

export interface GameState {
  // Player Stats
  xp: number;
  coins: number;
  level: number;

  // Inventory & Quests
  inventory: InventoryItem[];
  quests: Quest[];

  // Settings
  soundEnabled: boolean;

  // UI & Overlay State
  activeOverlay: UIOverlayType;
  currentDialogue: DialoguePayload | null;
  interactionPrompt: string | null;

  // Actions
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  setOverlay: (overlay: UIOverlayType) => void;
  openDialogue: (dialogue: DialoguePayload) => void;
  closeDialogue: () => void;
  setInteractionPrompt: (prompt: string | null) => void;
  toggleSound: () => void;
  useItem: (itemId: string) => void;
  addItem: (item: InventoryItem) => void;
  updateQuestProgress: (questId: string, amount: number) => void;
  resetPlayerStats: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  xp: 0,
  coins: 50,
  level: 1,

  inventory: defaultItems as InventoryItem[],
  quests: defaultQuests as Quest[],
  soundEnabled: true,

  activeOverlay: 'none',
  currentDialogue: null,
  interactionPrompt: null,

  addXP: (amount) =>
    set((state) => {
      const newXP = state.xp + amount;
      const nextLevel = Math.floor(newXP / 100) + 1;
      return {
        xp: newXP,
        level: Math.max(state.level, nextLevel),
      };
    }),

  addCoins: (amount) =>
    set((state) => ({
      coins: Math.max(0, state.coins + amount),
    })),

  setOverlay: (overlay) =>
    set(() => ({
      activeOverlay: overlay,
      currentDialogue: overlay === 'none' ? null : undefined,
    })),

  openDialogue: (dialogue) =>
    set(() => ({
      activeOverlay: 'dialogue',
      currentDialogue: dialogue,
    })),

  closeDialogue: () =>
    set(() => ({
      activeOverlay: 'none',
      currentDialogue: null,
    })),

  setInteractionPrompt: (prompt) =>
    set(() => ({
      interactionPrompt: prompt,
    })),

  toggleSound: () =>
    set((state) => ({
      soundEnabled: !state.soundEnabled,
    })),

  useItem: (itemId) =>
    set((state) => {
      const item = state.inventory.find((i) => i.id === itemId);
      if (!item || item.quantity <= 0) return state;

      // Brezel grants +15 XP
      let bonusXP = 0;
      if (itemId === 'brezel') bonusXP = 15;
      if (itemId === 'apfel') bonusXP = 10;

      const updatedInventory = state.inventory
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);

      const newXP = state.xp + bonusXP;
      const nextLevel = Math.floor(newXP / 100) + 1;

      return {
        inventory: updatedInventory,
        xp: newXP,
        level: Math.max(state.level, nextLevel),
      };
    }),

  addItem: (newItem) =>
    set((state) => {
      const existing = state.inventory.find((i) => i.id === newItem.id);
      if (existing) {
        return {
          inventory: state.inventory.map((i) =>
            i.id === newItem.id ? { ...i, quantity: i.quantity + newItem.quantity } : i
          ),
        };
      }
      return {
        inventory: [...state.inventory, newItem],
      };
    }),

  updateQuestProgress: (questId, amount) =>
    set((state) => {
      let earnedXP = 0;
      let earnedCoins = 0;

      const updatedQuests = state.quests.map((q) => {
        if (q.id === questId && !q.completed) {
          const newCurrent = Math.min(q.target, q.current + amount);
          const isComplete = newCurrent >= q.target;
          if (isComplete) {
            earnedXP += q.xpReward;
            earnedCoins += q.coinReward;
          }
          return {
            ...q,
            current: newCurrent,
            completed: isComplete,
          };
        }
        return q;
      });

      const newXP = state.xp + earnedXP;
      const nextLevel = Math.floor(newXP / 100) + 1;

      return {
        quests: updatedQuests,
        xp: newXP,
        coins: state.coins + earnedCoins,
        level: Math.max(state.level, nextLevel),
      };
    }),

  resetPlayerStats: () =>
    set(() => ({
      xp: 0,
      coins: 50,
      level: 1,
      inventory: defaultItems as InventoryItem[],
      quests: defaultQuests as Quest[],
      activeOverlay: 'none',
      currentDialogue: null,
      interactionPrompt: null,
    })),
}));
