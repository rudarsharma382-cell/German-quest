import * as Phaser from 'phaser';
import { useGameStore } from '@/store/useGameStore';
import dialogueTree from '@/data/dialogue.json';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private lukasNpc!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private fountain!: Phaser.Physics.Arcade.Image;

  // Institutions
  private bakeryBuilding!: Phaser.Physics.Arcade.Image;
  private libraryBuilding!: Phaser.Physics.Arcade.Image;
  private townHallBuilding!: Phaser.Physics.Arcade.Image;
  private cafeBuilding!: Phaser.Physics.Arcade.Image;
  private bahnhofBuilding!: Phaser.Physics.Arcade.Image;

  // Bahnhof dressing & NPC
  private train!: Phaser.Physics.Arcade.Image;
  private stationMaster!: Phaser.Physics.Arcade.Sprite;

  // Interaction Proximities
  private activeNearbyTarget:
    | 'lukas'
    | 'bakery'
    | 'library'
    | 'townhall'
    | 'cafe'
    | 'bahnhof'
    | 'braun'
    | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private lastInteractionRequest = 0;

  private exclamationBadge!: Phaser.GameObjects.Container;
  private badgeTween!: Phaser.Tweens.Tween;
  private hasSpokenFirstTime = false;
  private hasSpokenToBraun = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Generate procedural pixel-art textures
    this.createProceduralTextures();

    // Load Lukas character sprite from public assets
    this.load.image('lukas_sprite', '/characters/Lukas.png');
  }

  create() {
    const mapWidth = 44; // in 32px tiles
    const mapHeight = 34; // 1408 x 1088 world
    const tileSize = 32;

    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. Draw procedural world tiles & central plaza
    this.renderWorldMap(mapWidth, mapHeight, tileSize);

    // 2. Add NPC Lukas (Stationed in the central plaza)
    const lukasX = 704;
    const lukasY = 530;

    // Use loaded Lukas asset if available, fallback to procedural sprite
    const lukasTextureKey = this.textures.exists('lukas_sprite') ? 'lukas_sprite' : 'lukas_npc';
    this.lukasNpc = this.physics.add.sprite(lukasX, lukasY, lukasTextureKey);
    this.lukasNpc.setImmovable(true);
    this.lukasNpc.setDisplaySize(44, 48);
    this.lukasNpc.setSize(26, 32);

    // Lukas Overhead Nameplate & Animated "!" badge
    this.add.text(lukasX, lukasY - 30, 'Lukas', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    const badgeIcon = this.add.text(0, 0, '!', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#facc15',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.exclamationBadge = this.add.container(lukasX, lukasY - 46, [badgeIcon]);
    this.badgeTween = this.tweens.add({
      targets: this.exclamationBadge,
      y: lukasY - 52,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Add 2D Institutions around the Town Square
    // A. BÄCKEREI (Bakery - Northwest)
    const bakeryX = 500;
    const bakeryY = 360;
    this.bakeryBuilding = this.physics.add.staticImage(bakeryX, bakeryY, 'bakery_building');
    this.bakeryBuilding.setSize(76, 70);
    this.add.text(bakeryX, bakeryY - 44, 'BÄCKEREI', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#facc15',
      backgroundColor: '#78350f',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    // B. BIBLIOTHEK (Library - Northeast)
    const libraryX = 908;
    const libraryY = 360;
    this.libraryBuilding = this.physics.add.staticImage(libraryX, libraryY, 'library_building');
    this.libraryBuilding.setSize(80, 70);
    this.add.text(libraryX, libraryY - 44, 'BIBLIOTHEK', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#93c5fd',
      backgroundColor: '#1e3a8a',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    // C. RATHAUS (Town Hall - North Center)
    const rathausX = 704;
    const rathausY = 210;
    this.townHallBuilding = this.physics.add.staticImage(rathausX, rathausY, 'town_hall_building');
    this.townHallBuilding.setSize(108, 80);
    this.add.text(rathausX, rathausY - 52, 'RATHAUS', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#fde047',
      backgroundColor: '#0f172a',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5);

    // D. CAFÉ GEMÜTLICHKEIT (Southeast)
    const cafeX = 908;
    const cafeY = 700;
    this.cafeBuilding = this.physics.add.staticImage(cafeX, cafeY, 'cafe_building');
    this.cafeBuilding.setSize(76, 68);
    this.add.text(cafeX, cafeY - 40, 'CAFÉ', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#bbf7d0',
      backgroundColor: '#14532d',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    // E. BAHNHOF (Main Station - Southwest)
    const bahnhofX = 470;
    const bahnhofY = 750;
    this.bahnhofBuilding = this.physics.add.staticImage(bahnhofX, bahnhofY, 'bahnhof_building');
    this.bahnhofBuilding.setSize(150, 96);
    this.add.text(bahnhofX, bahnhofY - 24, 'BAHNHOF', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#fde047',
      backgroundColor: '#0f172a',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5);

    // Platform, rails, train and station master
    this.createBahnhofArea();

    // 4. Create Player
    const startX = 704;
    const startY = 620;
    this.player = this.physics.add.sprite(startX, startY, 'player_hero');
    this.player.setCollideWorldBounds(true);
    this.player.setSize(22, 26);
    this.player.setOffset(5, 6);

    // 5. Colliders (Player must exist before registering colliders)
    this.physics.add.collider(this.player, this.lukasNpc);
    if (this.fountain) this.physics.add.collider(this.player, this.fountain);
    if (this.bakeryBuilding) this.physics.add.collider(this.player, this.bakeryBuilding);
    if (this.libraryBuilding) this.physics.add.collider(this.player, this.libraryBuilding);
    if (this.townHallBuilding) this.physics.add.collider(this.player, this.townHallBuilding);
    if (this.cafeBuilding) this.physics.add.collider(this.player, this.cafeBuilding);
    if (this.bahnhofBuilding) this.physics.add.collider(this.player, this.bahnhofBuilding);
    if (this.train) this.physics.add.collider(this.player, this.train);
    if (this.stationMaster) this.physics.add.collider(this.player, this.stationMaster);

    // 6. Camera setup
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);

    // 7. Inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as any;
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      // TV remotes send OK/Enter; treat it as the interact key too.
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    }

    // Ignore any interaction request queued before the scene came up.
    this.lastInteractionRequest = useGameStore.getState().interactionRequest;
  }

  update() {
    const store = useGameStore.getState();

    // Consume on-screen action-button requests every frame, even during an
    // overlay, so a double tap cannot reopen a minigame after closing it.
    const interactionRequested = store.interactionRequest !== this.lastInteractionRequest;
    this.lastInteractionRequest = store.interactionRequest;

    // 1. If an overlay is active, freeze player
    if (store.activeOverlay !== 'none') {
      this.player.setVelocity(0, 0);
      // Swallow keys pressed while typing/answering so they do not fire again
      // the instant the overlay closes.
      Phaser.Input.Keyboard.JustDown(this.spaceKey);
      Phaser.Input.Keyboard.JustDown(this.eKey);
      Phaser.Input.Keyboard.JustDown(this.enterKey);
      return;
    }

    // Prompts adapt to the active control scheme (touch joystick vs. keyboard).
    const interactHint = store.virtualControlsEnabled ? '[A]' : '[SPACE]';

    // 2. Proximity Detection to Lukas & 2D Institutions
    const pX = this.player.x;
    const pY = this.player.y;

    const distLukas = Phaser.Math.Distance.Between(pX, pY, this.lukasNpc.x, this.lukasNpc.y);
    const distBakery = Phaser.Math.Distance.Between(pX, pY, 500, 395); // bakery door
    const distLibrary = Phaser.Math.Distance.Between(pX, pY, 908, 395); // library door
    const distTownHall = Phaser.Math.Distance.Between(pX, pY, 704, 250); // town hall door
    const distCafe = Phaser.Math.Distance.Between(pX, pY, 908, 735); // cafe door
    const distBahnhof = Phaser.Math.Distance.Between(pX, pY, 470, 852); // station door
    const distBraun = Phaser.Math.Distance.Between(pX, pY, 600, 850); // station master

    // Zone label for the HUD
    let zone = 'Marktplatz';
    if (distBahnhof <= 250 || distBraun <= 250) zone = 'Bahnhof';
    else if (distCafe <= 210) zone = 'Café Gemütlichkeit';
    else if (distBakery <= 200) zone = 'Bäckerei';
    else if (distLibrary <= 200) zone = 'Bibliothek';
    else if (distTownHall <= 200) zone = 'Rathaus';
    if (store.currentZone !== zone) store.setCurrentZone(zone);

    let currentTarget:
      | 'lukas'
      | 'bakery'
      | 'library'
      | 'townhall'
      | 'cafe'
      | 'bahnhof'
      | 'braun'
      | null = null;

    if (distLukas <= 68) {
      currentTarget = 'lukas';
      store.setInteractionPrompt(`${interactHint} Mit Lukas sprechen`);
    } else if (distBakery <= 55) {
      currentTarget = 'bakery';
      store.setInteractionPrompt(`${interactHint} Bäckerei betreten (Wort-Blitz)`);
    } else if (distLibrary <= 55) {
      currentTarget = 'library';
      store.setInteractionPrompt(`${interactHint} Bibliothek betreten (Satz-Bauer)`);
    } else if (distTownHall <= 60) {
      currentTarget = 'townhall';
      store.setInteractionPrompt(`${interactHint} Rathaus betreten (Bürger-Quiz)`);
    } else if (distCafe <= 55) {
      currentTarget = 'cafe';
      store.setInteractionPrompt(`${interactHint} Café betreten (Speisekarten-Match)`);
    } else if (distBraun <= 60) {
      currentTarget = 'braun';
      store.setInteractionPrompt(`${interactHint} Mit Herrn Braun sprechen`);
    } else if (distBahnhof <= 62) {
      currentTarget = 'bahnhof';
      store.setInteractionPrompt(`${interactHint} Fahrkarten-Schalter öffnen`);
    } else {
      if (this.activeNearbyTarget !== null) {
        store.setInteractionPrompt(null);
      }
    }

    this.activeNearbyTarget = currentTarget;

    // 3. Handle Interaction (keyboard SPACE/E/ENTER or the on-screen A button)
    const spaceJustDown = Phaser.Input.Keyboard.JustDown(this.spaceKey);
    const eJustDown = Phaser.Input.Keyboard.JustDown(this.eKey);
    const enterJustDown = Phaser.Input.Keyboard.JustDown(this.enterKey);

    if (currentTarget && (spaceJustDown || eJustDown || enterJustDown || interactionRequested)) {
      this.player.setVelocity(0, 0);
      store.setInteractionPrompt(null);

      if (currentTarget === 'lukas') {
        // Trigger Lukas branching dialogue with portrait
        store.openDialogue((dialogueTree as any).lukas_intro);

        if (!this.hasSpokenFirstTime) {
          this.hasSpokenFirstTime = true;
          store.updateQuestProgress('welcome_quest', 1);
          store.addXP(25);
          store.addCoins(10);
        }
      } else if (currentTarget === 'bakery') {
        // Trigger Wort-Blitz minigame overlay
        store.setOverlay('minigame');
      } else if (currentTarget === 'library') {
        // Sentence-building minigame with Frau Weber
        store.setOverlay('satzbauer');
      } else if (currentTarget === 'townhall') {
        // German facts, geography & history quiz with the mayor
        store.setOverlay('buergerquiz');
      } else if (currentTarget === 'cafe') {
        // Café menu memory-match with Herr Müller
        store.setOverlay('kaffee');
      } else if (currentTarget === 'braun') {
        // Station master dialogue (can hand off to the ticket-counter minigame)
        store.openDialogue((dialogueTree as any).braun_intro);

        if (!this.hasSpokenToBraun) {
          this.hasSpokenToBraun = true;
          store.addXP(10);
        }
      } else if (currentTarget === 'bahnhof') {
        // Open the Fahrkarten-Schalter minigame overlay
        store.setOverlay('bahnhof');
      }
      return;
    }

    // 4. Player Movement Controls (WASD, Arrows & virtual joystick)
    const speed = 180;
    let vx = 0;
    let vy = 0;

    const left = this.cursors?.left?.isDown || this.wasdKeys?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.wasdKeys?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.wasdKeys?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.wasdKeys?.S?.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    // Analog input from the touch joystick (already normalized to a unit circle).
    vx += store.virtualInput.x;
    vy += store.virtualInput.y;

    // Never let combined input exceed walking speed (keeps diagonals even).
    const magnitude = Math.hypot(vx, vy);
    if (magnitude > 1) {
      vx /= magnitude;
      vy /= magnitude;
    }

    this.player.setVelocity(vx * speed, vy * speed);

    if (vx < 0) {
      this.player.setFlipX(true);
    } else if (vx > 0) {
      this.player.setFlipX(false);
    }
  }

  /**
   * Bahnhof platform, rails, train and station master
   */
  private createBahnhofArea() {
    const tileSize = 32;

    // Platform tiles (tiles x 11..19, rows 28..29)
    for (let x = 11; x <= 19; x++) {
      for (let y = 28; y <= 29; y++) {
        this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'platform_tile');
      }
    }

    // Yellow safety line along the track edge
    this.add.rectangle(496, 957, 9 * tileSize, 5, 0xfacc15);

    // Rails (tiles x 4..27, rows 30..31)
    for (let x = 4; x <= 27; x++) {
      for (let y = 30; y <= 31; y++) {
        this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'rail_tile');
      }
    }

    // The train
    this.train = this.physics.add.staticImage(600, 998, 'train_complete');
    this.train.setSize(320, 44);

    // Steam puffs rising from the chimney
    for (let i = 0; i < 3; i++) {
      const puff = this.add.circle(456, 966, 5, 0xf1f5f9, 0.75);
      this.tweens.add({
        targets: puff,
        y: 905,
        x: 438 + i * 16,
        alpha: 0,
        scale: 2.4,
        duration: 2300,
        delay: i * 750,
        repeat: -1,
      });
    }

    // Platform sign
    this.add.text(496, 908, 'GLEIS 1', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#facc15',
      backgroundColor: '#0f172a',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    // Static departure board near the platform
    this.add.text(590, 908, 'ABFAHRT 14:30\nHAMBURG · GLEIS 3', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#fbbf24',
      backgroundColor: '#000000',
      padding: { x: 4, y: 3 },
      lineSpacing: 2,
    }).setOrigin(0.5);

    // Station master NPC
    const masterX = 600;
    const masterY = 848;
    this.stationMaster = this.physics.add.sprite(masterX, masterY, 'station_master');
    this.stationMaster.setImmovable(true);
    this.stationMaster.setSize(22, 28);

    this.add.text(masterX, masterY - 30, 'Herr Braun', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
  }

  /**
   * Procedural textures
   */
  private createProceduralTextures() {
    // 1. Grass Light (32x32)
    const gLight = this.make.graphics({ x: 0, y: 0 });
    gLight.fillStyle(0x3ea856, 1);
    gLight.fillRect(0, 0, 32, 32);
    gLight.fillStyle(0x4ec268, 1);
    gLight.fillRect(4, 6, 2, 6);
    gLight.fillRect(18, 16, 2, 6);
    gLight.fillRect(24, 8, 2, 5);
    gLight.fillStyle(0x328945, 1);
    gLight.fillRect(0, 0, 32, 1);
    gLight.fillRect(0, 0, 1, 32);
    gLight.generateTexture('grass_light', 32, 32);
    gLight.destroy();

    // 2. Grass Dark (32x32)
    const gDark = this.make.graphics({ x: 0, y: 0 });
    gDark.fillStyle(0x35934a, 1);
    gDark.fillRect(0, 0, 32, 32);
    gDark.fillStyle(0x2d7c3f, 1);
    gDark.fillRect(8, 12, 3, 4);
    gDark.fillRect(20, 22, 3, 4);
    gDark.fillStyle(0x43b25e, 1);
    gDark.fillRect(12, 4, 2, 4);
    gDark.generateTexture('grass_dark', 32, 32);
    gDark.destroy();

    // 3. Cobblestone Path (32x32)
    const cobble = this.make.graphics({ x: 0, y: 0 });
    cobble.fillStyle(0x8a929e, 1);
    cobble.fillRect(0, 0, 32, 32);
    cobble.fillStyle(0x565c69, 1);
    cobble.fillRect(0, 15, 32, 2);
    cobble.fillRect(15, 0, 2, 16);
    cobble.fillRect(8, 16, 2, 16);
    cobble.fillRect(24, 16, 2, 16);
    cobble.fillStyle(0xbac1ce, 1);
    cobble.fillRect(2, 2, 11, 2);
    cobble.fillRect(18, 2, 11, 2);
    cobble.fillRect(10, 18, 12, 2);
    cobble.generateTexture('cobblestone', 32, 32);
    cobble.destroy();

    // 4. Player Hero (32x32)
    const heroG = this.make.graphics({ x: 0, y: 0 });
    heroG.fillStyle(0xef4444, 1); // Hat
    heroG.fillRect(8, 2, 16, 6);
    heroG.fillRect(6, 6, 20, 3);
    heroG.fillStyle(0xfde047, 1); // Face
    heroG.fillRect(8, 9, 16, 9);
    heroG.fillStyle(0x1e293b, 1); // Eyes
    heroG.fillRect(10, 12, 3, 3);
    heroG.fillRect(19, 12, 3, 3);
    heroG.fillStyle(0x3b82f6, 1); // Tunic
    heroG.fillRect(8, 18, 16, 8);
    heroG.fillStyle(0xd97706, 1); // Belt
    heroG.fillRect(8, 23, 16, 2);
    heroG.fillStyle(0xfef08a, 1);
    heroG.fillRect(14, 23, 4, 2);
    heroG.fillStyle(0x334155, 1); // Boots
    heroG.fillRect(9, 26, 5, 5);
    heroG.fillRect(18, 26, 5, 5);
    heroG.generateTexture('player_hero', 32, 32);
    heroG.destroy();

    // 5. Town Fountain (64x64)
    const fountainG = this.make.graphics({ x: 0, y: 0 });
    fountainG.fillStyle(0x64748b, 1);
    fountainG.fillRect(4, 4, 56, 56);
    fountainG.fillStyle(0x38bdf8, 1);
    fountainG.fillRect(10, 10, 44, 44);
    fountainG.fillStyle(0x0284c7, 1);
    fountainG.fillRect(14, 14, 36, 36);
    fountainG.fillStyle(0xe0f2fe, 1);
    fountainG.fillRect(28, 28, 8, 8);
    fountainG.generateTexture('town_fountain', 64, 64);
    fountainG.destroy();

    // 6. Die Bäckerei (80x80)
    const bakeryG = this.make.graphics({ x: 0, y: 0 });
    bakeryG.fillStyle(0xb91c1c, 1); // Red roof
    bakeryG.fillRect(0, 0, 80, 24);
    bakeryG.fillStyle(0x991b1b, 1);
    bakeryG.fillRect(4, 20, 72, 4);
    bakeryG.fillStyle(0xfde68a, 1); // Walls
    bakeryG.fillRect(4, 24, 72, 54);
    bakeryG.fillStyle(0x78350f, 1); // Wood framing
    bakeryG.fillRect(4, 24, 6, 54);
    bakeryG.fillRect(70, 24, 6, 54);
    bakeryG.fillRect(4, 74, 72, 4);
    bakeryG.fillRect(36, 24, 8, 54);
    // Striped Awning
    bakeryG.fillStyle(0xef4444, 1);
    bakeryG.fillRect(10, 32, 60, 10);
    bakeryG.fillStyle(0xffffff, 1);
    bakeryG.fillRect(16, 32, 10, 10);
    bakeryG.fillRect(36, 32, 10, 10);
    bakeryG.fillRect(56, 32, 10, 10);
    // Wooden Door
    bakeryG.fillStyle(0x92400e, 1);
    bakeryG.fillRect(30, 48, 20, 30);
    bakeryG.fillStyle(0xfacc15, 1);
    bakeryG.fillRect(34, 64, 3, 3);
    // Bread window
    bakeryG.fillStyle(0x38bdf8, 1);
    bakeryG.fillRect(12, 46, 16, 16);
    bakeryG.fillStyle(0xd97706, 1);
    bakeryG.fillRect(14, 52, 12, 6);
    bakeryG.generateTexture('bakery_building', 80, 80);
    bakeryG.destroy();

    // 7. Die Bibliothek (80x80)
    const libG = this.make.graphics({ x: 0, y: 0 });
    libG.fillStyle(0x1e3a8a, 1); // Dark blue scholarly roof
    libG.fillRect(0, 0, 80, 24);
    libG.fillStyle(0x1d4ed8, 1);
    libG.fillRect(4, 20, 72, 4);
    libG.fillStyle(0xe2e8f0, 1); // Marble stone walls
    libG.fillRect(4, 24, 72, 54);
    libG.fillStyle(0x94a3b8, 1); // Pillars
    libG.fillRect(8, 24, 8, 54);
    libG.fillRect(24, 24, 8, 54);
    libG.fillRect(48, 24, 8, 54);
    libG.fillRect(64, 24, 8, 54);
    // Gold Book Emblem above door
    libG.fillStyle(0xfacc15, 1);
    libG.fillRect(36, 30, 8, 8);
    // Dark Wooden Double Door
    libG.fillStyle(0x3b2314, 1);
    libG.fillRect(34, 46, 12, 32);
    libG.generateTexture('library_building', 80, 80);
    libG.destroy();

    // 8. Das Rathaus (112x84)
    const rathausG = this.make.graphics({ x: 0, y: 0 });
    // Clock Tower (Center Top)
    rathausG.fillStyle(0x334155, 1);
    rathausG.fillRect(44, 0, 24, 24);
    rathausG.fillStyle(0xfef08a, 1); // Clock Face
    rathausG.fillRect(50, 4, 12, 12);
    rathausG.fillStyle(0x0f172a, 1); // Clock Hands
    rathausG.fillRect(55, 6, 2, 6);
    rathausG.fillRect(55, 10, 4, 2);
    // Main Roof
    rathausG.fillStyle(0x475569, 1);
    rathausG.fillRect(4, 24, 104, 16);
    // Stone Facade
    rathausG.fillStyle(0xcfd8dc, 1);
    rathausG.fillRect(6, 40, 100, 44);
    // German Flag Ribbon Accent
    rathausG.fillStyle(0x000000, 1);
    rathausG.fillRect(6, 40, 100, 3);
    rathausG.fillStyle(0xdc2626, 1);
    rathausG.fillRect(6, 43, 100, 3);
    rathausG.fillStyle(0xfacc15, 1);
    rathausG.fillRect(6, 46, 100, 3);
    // Grand Double Archway Door
    rathausG.fillStyle(0x1e293b, 1);
    rathausG.fillRect(46, 52, 20, 32);
    rathausG.fillStyle(0xfacc15, 1); // Gold handles
    rathausG.fillRect(52, 68, 2, 4);
    rathausG.fillRect(58, 68, 2, 4);
    rathausG.generateTexture('town_hall_building', 112, 84);
    rathausG.destroy();

    // 9. Das Café (80x72)
    const cafeG = this.make.graphics({ x: 0, y: 0 });
    cafeG.fillStyle(0x78350f, 1); // Roof
    cafeG.fillRect(4, 0, 72, 18);
    cafeG.fillStyle(0xfef3c7, 1); // Walls
    cafeG.fillRect(4, 18, 72, 54);
    // Green striped awning
    cafeG.fillStyle(0x16a34a, 1);
    cafeG.fillRect(8, 24, 64, 10);
    cafeG.fillStyle(0xffffff, 1);
    cafeG.fillRect(16, 24, 10, 10);
    cafeG.fillRect(36, 24, 10, 10);
    cafeG.fillRect(56, 24, 10, 10);
    // Glass window with coffee cup
    cafeG.fillStyle(0x38bdf8, 1);
    cafeG.fillRect(12, 40, 18, 18);
    cafeG.fillStyle(0x78350f, 1); // Coffee cup silhouette
    cafeG.fillRect(16, 46, 10, 8);
    // Door
    cafeG.fillStyle(0x451a03, 1);
    cafeG.fillRect(46, 38, 18, 34);
    cafeG.generateTexture('cafe_building', 80, 72);
    cafeG.destroy();

    // 10. Der Bahnhof (160x128)
    const bahnhofG = this.make.graphics({ x: 0, y: 0 });
    // Slate roof
    bahnhofG.fillStyle(0x334155, 1);
    bahnhofG.fillRect(0, 0, 160, 26);
    bahnhofG.fillStyle(0x1e293b, 1);
    bahnhofG.fillRect(0, 22, 160, 6);
    // Clock tower
    bahnhofG.fillStyle(0x475569, 1);
    bahnhofG.fillRect(64, 0, 32, 30);
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(70, 2, 20, 18);
    bahnhofG.fillStyle(0xfef08a, 1);
    bahnhofG.fillRect(74, 5, 12, 12);
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(79, 7, 2, 5);
    bahnhofG.fillRect(79, 11, 4, 2);
    // Sandstone facade
    bahnhofG.fillStyle(0xd7c6a3, 1);
    bahnhofG.fillRect(6, 26, 148, 96);
    bahnhofG.fillStyle(0xc4b08c, 1);
    for (let row = 40; row < 120; row += 12) {
      bahnhofG.fillRect(6, row, 148, 2);
    }
    // Sign band
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(24, 32, 112, 18);
    // Arched windows
    bahnhofG.fillStyle(0x1e293b, 1);
    bahnhofG.fillRect(18, 60, 26, 34);
    bahnhofG.fillRect(116, 60, 26, 34);
    bahnhofG.fillStyle(0x38bdf8, 1);
    bahnhofG.fillRect(22, 64, 18, 26);
    bahnhofG.fillRect(120, 64, 18, 26);
    bahnhofG.fillStyle(0x0ea5e9, 1);
    bahnhofG.fillRect(30, 64, 2, 26);
    bahnhofG.fillRect(128, 64, 2, 26);
    // Grand arched entrance
    bahnhofG.fillStyle(0x1e293b, 1);
    bahnhofG.fillRect(62, 66, 36, 56);
    bahnhofG.fillRect(66, 60, 28, 8);
    bahnhofG.fillStyle(0x3b2314, 1);
    bahnhofG.fillRect(66, 70, 28, 52);
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(79, 70, 2, 52);
    bahnhofG.fillStyle(0xfacc15, 1);
    bahnhofG.fillRect(72, 96, 3, 6);
    bahnhofG.fillRect(85, 96, 3, 6);
    // Entrance steps
    bahnhofG.fillStyle(0x94a3b8, 1);
    bahnhofG.fillRect(56, 118, 48, 10);
    bahnhofG.fillStyle(0x64748b, 1);
    bahnhofG.fillRect(50, 124, 60, 4);
    bahnhofG.generateTexture('bahnhof_building', 160, 128);
    bahnhofG.destroy();

    // 11. Platform Tile (32x32)
    const platformG = this.make.graphics({ x: 0, y: 0 });
    platformG.fillStyle(0x9ca3af, 1);
    platformG.fillRect(0, 0, 32, 32);
    platformG.fillStyle(0xb6bcc6, 1);
    platformG.fillRect(2, 4, 9, 2);
    platformG.fillRect(18, 11, 9, 2);
    platformG.fillRect(6, 21, 8, 2);
    platformG.fillStyle(0x7c8391, 1);
    platformG.fillRect(0, 31, 32, 1);
    platformG.fillRect(15, 2, 1, 28);
    platformG.generateTexture('platform_tile', 32, 32);
    platformG.destroy();

    // 12. Rail Tile (32x32)
    const railG = this.make.graphics({ x: 0, y: 0 });
    railG.fillStyle(0x4b5563, 1);
    railG.fillRect(0, 0, 32, 32);
    railG.fillStyle(0x374151, 1);
    railG.fillRect(3, 4, 6, 4);
    railG.fillRect(19, 15, 7, 4);
    railG.fillRect(8, 26, 5, 3);
    // Wooden sleepers
    railG.fillStyle(0x5b3a1e, 1);
    railG.fillRect(2, 0, 5, 32);
    railG.fillRect(13, 0, 5, 32);
    railG.fillRect(24, 0, 5, 32);
    // Steel rails
    railG.fillStyle(0x9ca3af, 1);
    railG.fillRect(0, 8, 32, 4);
    railG.fillRect(0, 20, 32, 4);
    railG.fillStyle(0xe5e7eb, 1);
    railG.fillRect(0, 8, 32, 1);
    railG.fillRect(0, 20, 32, 1);
    railG.fillStyle(0x4b5563, 1);
    railG.fillRect(0, 11, 32, 1);
    railG.fillRect(0, 23, 32, 1);
    railG.generateTexture('rail_tile', 32, 32);
    railG.destroy();

    // 13. Steam Train (336x60)
    const trainG = this.make.graphics({ x: 0, y: 0 });
    // Chassis
    trainG.fillStyle(0x111827, 1);
    trainG.fillRect(0, 40, 336, 10);
    // Engine boiler
    trainG.fillStyle(0x1f2937, 1);
    trainG.fillRect(0, 16, 70, 26);
    trainG.fillStyle(0xb91c1c, 1);
    trainG.fillRect(0, 10, 70, 10);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(12, 0, 14, 14);
    // Front lamp
    trainG.fillStyle(0xfacc15, 1);
    trainG.fillRect(4, 22, 6, 6);
    trainG.fillStyle(0xfef08a, 1);
    trainG.fillRect(5, 23, 4, 4);
    // Cab
    trainG.fillStyle(0x991b1b, 1);
    trainG.fillRect(68, 0, 52, 42);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(76, 6, 16, 14);
    trainG.fillRect(96, 6, 16, 14);
    trainG.fillStyle(0xa5f3fc, 1);
    trainG.fillRect(79, 9, 10, 8);
    trainG.fillRect(99, 9, 10, 8);
    // Car 1
    trainG.fillStyle(0x1d4ed8, 1);
    trainG.fillRect(128, 12, 104, 30);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(128, 38, 104, 6);
    trainG.fillStyle(0x93c5fd, 1);
    trainG.fillRect(136, 18, 16, 10);
    trainG.fillRect(160, 18, 16, 10);
    trainG.fillRect(208, 18, 16, 10);
    trainG.fillStyle(0x1e3a8a, 1);
    trainG.fillRect(184, 12, 8, 26);
    // Car 2
    trainG.fillStyle(0x15803d, 1);
    trainG.fillRect(240, 12, 96, 30);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(240, 38, 96, 6);
    trainG.fillStyle(0x86efac, 1);
    trainG.fillRect(248, 18, 16, 10);
    trainG.fillRect(272, 18, 16, 10);
    trainG.fillRect(304, 18, 16, 10);
    // Wheels
    const wheelXs = [20, 50, 80, 110, 150, 185, 220, 260, 295, 325];
    wheelXs.forEach((wx) => {
      trainG.fillStyle(0x0f172a, 1);
      trainG.fillCircle(wx, 50, 7);
      trainG.fillStyle(0x94a3b8, 1);
      trainG.fillCircle(wx, 50, 2);
    });
    trainG.generateTexture('train_complete', 336, 60);
    trainG.destroy();

    // 14. Station Master (32x32)
    const masterG = this.make.graphics({ x: 0, y: 0 });
    masterG.fillStyle(0x0f172a, 1);
    masterG.fillRect(7, 2, 18, 6);
    masterG.fillRect(5, 7, 22, 3);
    masterG.fillStyle(0xfacc15, 1);
    masterG.fillRect(9, 6, 14, 1);
    masterG.fillRect(19, 3, 3, 3);
    masterG.fillStyle(0xf3c28a, 1);
    masterG.fillRect(9, 10, 14, 8);
    masterG.fillStyle(0x1e293b, 1);
    masterG.fillRect(12, 13, 2, 2);
    masterG.fillRect(19, 13, 2, 2);
    masterG.fillStyle(0x5b3a1e, 1);
    masterG.fillRect(11, 16, 10, 2);
    masterG.fillStyle(0x1d4ed8, 1);
    masterG.fillRect(8, 18, 16, 9);
    masterG.fillStyle(0x0f172a, 1);
    masterG.fillRect(8, 24, 16, 2);
    masterG.fillStyle(0xfacc15, 1);
    masterG.fillRect(15, 20, 2, 2);
    masterG.fillStyle(0x334155, 1);
    masterG.fillRect(9, 27, 5, 5);
    masterG.fillRect(18, 27, 5, 5);
    masterG.generateTexture('station_master', 32, 32);
    masterG.destroy();
  }

  /**
   * Render procedural world map
   */
  private renderWorldMap(mapWidth: number, mapHeight: number, tileSize: number) {
    const centerTileX = Math.floor(mapWidth / 2);
    const centerTileY = Math.floor(mapHeight / 2);

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const posX = x * tileSize + tileSize / 2;
        const posY = y * tileSize + tileSize / 2;

        const isCentralPathX = Math.abs(x - centerTileX) <= 1;
        const isCentralPathY = Math.abs(y - centerTileY) <= 1;
        const isPlaza = Math.abs(x - centerTileX) <= 5 && Math.abs(y - centerTileY) <= 5;
        // Cobblestone forecourt leading to the Bahnhof in the southwest
        const isStationForecourt = x >= 10 && x <= 22 && y >= 26 && y <= 27;

        if (isPlaza || isCentralPathX || isCentralPathY || isStationForecourt) {
          this.add.image(posX, posY, 'cobblestone');
        } else {
          const isDarkTile = (x + y) % 2 === 0;
          const textureKey = isDarkTile ? 'grass_dark' : 'grass_light';
          this.add.image(posX, posY, textureKey);
        }
      }
    }

    // Add Central Town Fountain
    this.fountain = this.physics.add.staticImage(
      centerTileX * tileSize,
      centerTileY * tileSize,
      'town_fountain'
    );
    this.fountain.setSize(56, 56);
  }
}
