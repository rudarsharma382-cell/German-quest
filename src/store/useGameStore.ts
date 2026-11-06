import { create } from 'zustand';

export type UIOverlayType = 'none' | 'dialogue' | 'minigame';

export interface DialoguePayload {
  speaker: string;
  text: string;
  translation?: string;
  avatar?: string;
}

export interface GameState {
  // Player Stats
  xp: number;
  coins: number;
  level: number;

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
  resetPlayerStats: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  xp: 0,
  coins: 50,
  level: 1,

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
      // If closing overlay, clear dialogue
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

  resetPlayerStats: () =>
    set(() => ({
      xp: 0,
      coins: 50,
      level: 1,
      activeOverlay: 'none',
      currentDialogue: null,
      interactionPrompt: null,
    })),
}));

