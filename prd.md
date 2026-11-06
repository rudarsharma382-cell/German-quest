ANTIGRAVITY IDE PRD: GERMAN QUEST (DEUTSCHSTADT)
Target Environment: Antigravity IDE (Prompt-Driven AI Generation)
Project Name: german-quest-rpg
Stack: Next.js (App Router), React, TypeScript, Tailwind CSS, Phaser 3, Zustand

1. Architecture Setup
   Antigravity needs to build a hybrid application where a Phaser 3 canvas runs underneath a React DOM overlay.

Game Layer (Phaser 3): Handles tilemaps, player sprites, 2D physics (Arcade Physics), collision boundaries, and camera movement.

UI Layer (React/Tailwind): Handles retro dialogue boxes, the HUD (XP, Coins), menus, and minigame overlays.

Bridge (Zustand): Acts as the event bus between Phaser and React. Phaser dispatches events (e.g., triggerDialogue, startMinigame) to Zustand, and React listens and renders the UI.

2. State Management (Zustand)
   Define a global store useGameStore.ts with:

playerState: XP, Coins, Current Level.

uiState: activeOverlay (none | dialogue | minigame | inventory), currentDialogueText.

actions: setOverlay, addXP, addCoin.

3. File Structure Directives
   Plaintext
   src/
   ├── app/ # Next.js pages and routing
   ├── components/
   │ ├── game/ # Phaser wrapper component (Game.tsx)
   │ ├── ui/ # React UI overlays (HUD.tsx, DialogueBox.tsx, PixelButton.tsx)
   │ └── minigames/ # React-based learning challenges
   ├── game/
   │ ├── scenes/ # Phaser Scenes (Preloader, MainMap, BuildingInterior)
   │ ├── entities/ # Player.ts, NPC.ts
   │ └── utils/ # Event emitters connecting to Zustand
   ├── store/ # useGameStore.ts (Zustand)
   └── data/ # vocabulary.json, dialogue.json, quests.json
4. Component Specs
   Game Wrapper: A useEffect hook must initialize the Phaser game instance only on the client side (typeof window !== 'undefined') to prevent Next.js SSR hydration errors.

Pixel UI: Tailwind classes must use sharp corners (rounded-none), heavy borders (border-4 border-gray-900), and a pixel-art font (e.g., 'Press Start 2P', loaded via next/font/google).

NPC Interactions: When the player overlaps an NPC zone and presses 'E' or clicks, Phaser updates Zustand (setOverlay('dialogue')), pausing the game scene and triggering the React dialogue box.

5. Phased Generation Steps (For Antigravity)
   Init & Bridge: Initialize Next.js, set up Zustand, and build the client-side Phaser wrapper.

World Rendering: Load a basic tilemap, render a controllable player sprite, and set up collision.

UI Overlay: Build the React HUD and a typewriter-effect dialogue box over the canvas.

NPC Logic: Add one NPC (Lukas) that triggers the dialogue box when approached.

JSON Content: Wire up the first mini-game (Wort Blitz) as a React overlay triggered by interacting with a specific building.
