# German Quest: Deutschstadt (Context & Architecture Guide)

## 1. Project Overview
* **Name:** German Quest: Deutschstadt
* **Genre:** 2D Pixel-Art Educational RPG
* **Goal:** Teach German language and grammar (Articles: der/die/das, vocabulary, everyday conversation, and German culture) through gamified exploration and questing.
* **Stack:**
  * **Framework:** Next.js 15 (App Router, TypeScript)
  * **Styling:** Tailwind CSS (Retro pixel theme, sharp borders, chunky drop shadows, `Press Start 2P` pixel font)
  * **World Engine:** Phaser 3 (Arcade Physics, 2D procedural rendering, collision bounds)
  * **State Bridge:** Zustand (`useGameStore.ts`)
  * **Audio:** Web Audio API 8-bit procedural sound synthesizer (Zero external MP3 dependencies)

---

## 2. Hybrid Architecture (Phaser + React)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js / React DOM Overlay Layer                    │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ HUD (XP, Coins, Quests) │  │ DialogueBox (Lukas Portrait & Tree) │  │
│  ├─────────────────────────┤  ├─────────────────────────────────────┤  │
│  │ Inventory (Rucksack [I])│  │ Wort-Blitz Minigame (Der/Die/Das)   │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
                    ZUSTAND EVENT BRIDGE (`useGameStore.ts`)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Phaser 3 Game Canvas                             │
│  - Player Entity: 8-way movement, Arcade Physics, WASD/Arrows          │
│  - NPC Lukas: Stationed in Plaza, animated badge, Proximity zone       │
│  - 2D Institutions: Bäckerei, Bibliothek, Rathaus, Café                │
│  - World Map: Procedural Cobblestone Plaza, Fountain, Grass Grid       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 4 Town Institutions (Deutschstadt)

1. **Die Bäckerei (Bakery - Northwest):**
   * **Visuals:** Red tiled roof, red-and-white striped awning, wooden door, bread display.
   * **Interaction:** Triggers the **"Wort-Blitz"** minigame where players race to choose the correct German article (`der`, `die`, `das`) for nouns.
   * **Items:** Offers `Die Brezel` (+15 XP) and `Der Apfel` (+10 XP).

2. **Die Bibliothek (Library - Northeast):**
   * **Visuals:** Scholarly dark navy roof, marble columns, gold book emblem, sign `BIBLIOTHEK`.
   * **Interaction:** Managed by **Frau Weber**. Teaches fundamental German grammar rules (e.g., nouns ending in *-ung, -heit, -keit, -schaft* always take `DIE`).

3. **Das Rathaus (Town Hall - North Center):**
   * **Visuals:** Imposing clock tower, stone facade, German flag ribbon (Schwarz-Rot-Gold), grand double archway door.
   * **Interaction:** Residence of **Bürgermeister Schmidt**. Handles town quests, player registration, and citizenship rank.

4. **Das Café "Gemütlichkeit" (Town Café - Southeast):**
   * **Visuals:** Green-striped awning, patio windows with coffee cup silhouette, wooden door.
   * **Interaction:** Hosted by **Herr Müller**. Teaches conversational restaurant and food vocabulary (`Der Kaffee`, `Das Wasser`).

---

## 4. NPC Lukas (Your Companion)
* **Portrait & Artwork:** Rendered from `assets/characters/Lukas.png` (2048x2048 illustration) and served from `public/characters/Lukas.png`.
* **In-Game Role:** Stationed at the town square next to the central fountain.
* **Dialogue Tree:** Branching dialogue system (`src/data/dialogue.json`) allowing players to choose responses in German with instant English translation toggles.

---

## 5. Controls & Shortcuts
* **`WASD` / `Arrow Keys`:** Move character (8-directional with normalized diagonals).
* **`SPACE` / `E`:** Interact with Lukas or enter town buildings.
* **`I`:** Toggle Rucksack / Inventory overlay.
* **`1`, `2`, `3`:** Quick-select dialogue response options.
* **Audio Button (HUD):** Toggle retro sound effects.
