import * as Phaser from 'phaser';
import { useGameStore } from '@/store/useGameStore';
import dialogueTree from '@/data/dialogue.json';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private lukasNpc!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private fountain!: Phaser.Physics.Arcade.Image;

  // Landmark & Town Institutions
  private schoolBuilding!: Phaser.Physics.Arcade.Image;
  private museumBuilding!: Phaser.Physics.Arcade.Image;
  private bakeryBuilding!: Phaser.Physics.Arcade.Image;
  private libraryBuilding!: Phaser.Physics.Arcade.Image;
  private townHallBuilding!: Phaser.Physics.Arcade.Image;
  private cafeBuilding!: Phaser.Physics.Arcade.Image;
  private bahnhofBuilding!: Phaser.Physics.Arcade.Image;

  // Door Sensors
  private schoolDoorTrigger!: Phaser.GameObjects.Zone;
  private museumDoorTrigger!: Phaser.GameObjects.Zone;

  // Bahnhof Dressing & NPC
  private train!: Phaser.Physics.Arcade.Image;
  private stationMaster!: Phaser.Physics.Arcade.Sprite;

  // Environmental Collections
  private streetLamps: Phaser.Physics.Arcade.Image[] = [];
  private cherryTrees: Phaser.Physics.Arcade.Image[] = [];

  // Interaction State
  private activeNearbyTarget:
    | 'lukas'
    | 'school'
    | 'museum'
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

    // Load character portrait / sprite
    this.load.image('lukas_sprite', '/characters/Lukas.png');

    // Load 3/4 top-down landmark Sprachschule
    this.load.image('sprachschule', '/assets/buildings/sprachschule_topdown.png');
  }

  create() {
    const mapWidth = 44; // in 32px tiles
    const mapHeight = 34; // 1408 x 1088 world
    const tileSize = 32;

    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. Draw ornate procedural world tiles, pathways, flower borders & central plaza
    this.renderWorldMap(mapWidth, mapHeight, tileSize);

    // 2. Add NPC Lukas (Stationed in the central plaza)
    const lukasX = 704;
    const lukasY = 530;

    const lukasTextureKey = this.textures.exists('lukas_sprite') ? 'lukas_sprite' : 'lukas_npc';
    this.lukasNpc = this.physics.add.sprite(lukasX, lukasY, lukasTextureKey);
    this.lukasNpc.setImmovable(true);
    this.lukasNpc.setDisplaySize(44, 48);
    this.lukasNpc.setSize(26, 32);

    // Lukas Overhead Nameplate & Animated "!" badge
    this.add
      .text(lukasX, lukasY - 30, 'Lukas', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);

    const badgeIcon = this.add
      .text(0, 0, '!', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.exclamationBadge = this.add.container(lukasX, lukasY - 46, [badgeIcon]);
    this.badgeTween = this.tweens.add({
      targets: this.exclamationBadge,
      y: lukasY - 52,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Add 2D Institutions around Deutschstadt
    // A. SPRACHSCHULE (Northwest Landmark at X: 260, Y: 340)
    const schoolX = 260;
    const schoolY = 340;
    if (this.textures.exists('sprachschule')) {
      this.schoolBuilding = this.physics.add.staticImage(schoolX, schoolY, 'sprachschule');
      this.schoolBuilding.setOrigin(0.5, 1);
      this.schoolBuilding.setDepth(schoolY);

      const schoolBody = this.schoolBuilding.body as Phaser.Physics.Arcade.StaticBody;
      schoolBody.setSize(this.schoolBuilding.width * 0.92, this.schoolBuilding.height * 0.30);
      schoolBody.setOffset(this.schoolBuilding.width * 0.04, this.schoolBuilding.height * 0.70);
    }
    this.schoolDoorTrigger = this.add.zone(schoolX, schoolY + 5, 48, 32);
    this.physics.world.enable(this.schoolDoorTrigger, Phaser.Physics.Arcade.STATIC_BODY);

    this.add
      .text(schoolX, schoolY - 210, 'SPRACHSCHULE', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fde047',
        backgroundColor: '#451a03',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(schoolY + 1);

    // B. GESCHICHTSMUSEUM (Northeast Landmark - Procedural Pixel-Art Neoclassical at X: 1150, Y: 340)
    const museumX = 1150;
    const museumY = 340;
    this.museumBuilding = this.physics.add.staticImage(museumX, museumY, 'museum_building');
    this.museumBuilding.setOrigin(0.5, 1);
    this.museumBuilding.setDepth(museumY);

    const museumBody = this.museumBuilding.body as Phaser.Physics.Arcade.StaticBody;
    museumBody.setSize(96, 32);
    museumBody.setOffset(4, 52);

    this.museumDoorTrigger = this.add.zone(museumX, museumY + 5, 52, 32);
    this.physics.world.enable(this.museumDoorTrigger, Phaser.Physics.Arcade.STATIC_BODY);

    this.add
      .text(museumX, museumY - 95, 'GESCHICHTSMUSEUM', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fef08a',
        backgroundColor: '#1e293b',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(museumY + 1);

    // C. BÄCKEREI (West Avenue - X: 500, Y: 360)
    const bakeryX = 500;
    const bakeryY = 360;
    this.bakeryBuilding = this.physics.add.staticImage(bakeryX, bakeryY, 'bakery_building');
    this.bakeryBuilding.setSize(76, 70);
    this.bakeryBuilding.setDepth(bakeryY);
    this.add
      .text(bakeryX, bakeryY - 44, 'BÄCKEREI', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#facc15',
        backgroundColor: '#78350f',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(bakeryY + 1);

    // D. BIBLIOTHEK (East Central - X: 908, Y: 360)
    const libraryX = 908;
    const libraryY = 360;
    this.libraryBuilding = this.physics.add.staticImage(libraryX, libraryY, 'library_building');
    this.libraryBuilding.setSize(80, 70);
    this.libraryBuilding.setDepth(libraryY);
    this.add
      .text(libraryX, libraryY - 44, 'BIBLIOTHEK', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#93c5fd',
        backgroundColor: '#1e3a8a',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(libraryY + 1);

    // E. RATHAUS (North Center - X: 704, Y: 210)
    const rathausX = 704;
    const rathausY = 210;
    this.townHallBuilding = this.physics.add.staticImage(rathausX, rathausY, 'town_hall_building');
    this.townHallBuilding.setSize(108, 80);
    this.townHallBuilding.setDepth(rathausY);
    this.add
      .text(rathausX, rathausY - 52, 'RATHAUS', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fde047',
        backgroundColor: '#0f172a',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(rathausY + 1);

    // F. CAFÉ GEMÜTLICHKEIT (Southeast - X: 908, Y: 700)
    const cafeX = 908;
    const cafeY = 700;
    this.cafeBuilding = this.physics.add.staticImage(cafeX, cafeY, 'cafe_building');
    this.cafeBuilding.setSize(76, 68);
    this.cafeBuilding.setDepth(cafeY);
    this.add
      .text(cafeX, cafeY - 40, 'CAFÉ', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#bbf7d0',
        backgroundColor: '#14532d',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(cafeY + 1);

    // G. BAHNHOF (Main Station - Southwest - X: 470, Y: 750)
    const bahnhofX = 470;
    const bahnhofY = 750;
    this.bahnhofBuilding = this.physics.add.staticImage(bahnhofX, bahnhofY, 'bahnhof_building');
    this.bahnhofBuilding.setSize(150, 96);
    this.bahnhofBuilding.setDepth(bahnhofY);
    this.add
      .text(bahnhofX, bahnhofY - 24, 'BAHNHOF', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fde047',
        backgroundColor: '#0f172a',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(bahnhofY + 1);

    // Platform, rails, train and station master
    this.createBahnhofArea();

    // 4. CHERRY BLOSSOM TREES (Kirschblüten-Bäume flanking pathways and plaza)
    const cherryTreeCoords = [
      { x: 604, y: 240 }, // Flanking Rathaus west
      { x: 804, y: 240 }, // Flanking Rathaus east
      { x: 560, y: 490 }, // Plaza northwest corner
      { x: 848, y: 490 }, // Plaza northeast corner
      { x: 560, y: 640 }, // Plaza southwest corner
      { x: 848, y: 640 }, // Plaza southeast corner
      { x: 180, y: 420 }, // Near Sprachschule flower garden
      { x: 340, y: 420 }, // Near Sprachschule walkway
      { x: 1060, y: 420 }, // Near Museum entrance avenue
      { x: 1240, y: 420 }, // Near Museum east garden
      { x: 704, y: 780 }, // South Avenue towards Café
      { x: 330, y: 720 }, // West Avenue towards Bahnhof
    ];

    this.cherryTrees = [];
    cherryTreeCoords.forEach((t) => {
      const tree = this.physics.add.staticImage(t.x, t.y, 'cherry_blossom_tree');
      tree.setOrigin(0.5, 0.95);
      tree.setDepth(t.y + 10);
      // Collider covers strictly the trunk base (14x12) so player can walk freely underneath the pink canopy!
      const treeBody = tree.body as Phaser.Physics.Arcade.StaticBody;
      treeBody.setSize(18, 14);
      treeBody.setOffset(23, 64);
      this.cherryTrees.push(tree);
    });

    // 5. FLOATING CHERRY BLOSSOM PETALS (Ambient falling sakura petals effect)
    this.createFallingPetals(worldWidth, worldHeight);

    // 6. Create Player Hero
    const startX = 704;
    const startY = 620;
    this.player = this.physics.add.sprite(startX, startY, 'player_hero');
    this.player.setCollideWorldBounds(true);
    this.player.setSize(22, 26);
    this.player.setOffset(5, 6);

    // 7. Colliders (Player must exist before registering colliders)
    this.physics.add.collider(this.player, this.lukasNpc);
    if (this.fountain) this.physics.add.collider(this.player, this.fountain);
    if (this.bakeryBuilding) this.physics.add.collider(this.player, this.bakeryBuilding);
    if (this.libraryBuilding) this.physics.add.collider(this.player, this.libraryBuilding);
    if (this.townHallBuilding) this.physics.add.collider(this.player, this.townHallBuilding);
    if (this.cafeBuilding) this.physics.add.collider(this.player, this.cafeBuilding);
    if (this.bahnhofBuilding) this.physics.add.collider(this.player, this.bahnhofBuilding);
    if (this.train) this.physics.add.collider(this.player, this.train);
    if (this.stationMaster) this.physics.add.collider(this.player, this.stationMaster);
    if (this.schoolBuilding) this.physics.add.collider(this.player, this.schoolBuilding);
    if (this.museumBuilding) this.physics.add.collider(this.player, this.museumBuilding);

    // Street Lamps & Cherry Trees colliders
    this.streetLamps.forEach((lamp) => {
      this.physics.add.collider(this.player, lamp);
    });
    this.cherryTrees.forEach((tree) => {
      this.physics.add.collider(this.player, tree);
    });

    // 8. Camera setup
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.2);

    // 9. Inputs
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

    // Dynamic depth sorting so player walks naturally behind roofs, trees, and NPCs
    this.player.setDepth(this.player.y);
    this.lukasNpc.setDepth(this.lukasNpc.y);

    // Prompts adapt to the active control scheme (touch joystick vs. keyboard).
    const interactHint = store.virtualControlsEnabled ? '[A]' : '[SPACE]';

    // 2. Proximity & Door Overlap Detection
    const pX = this.player.x;
    const pY = this.player.y;

    const distLukas = Phaser.Math.Distance.Between(pX, pY, this.lukasNpc.x, this.lukasNpc.y);
    const distBakery = Phaser.Math.Distance.Between(pX, pY, 500, 395);
    const distLibrary = Phaser.Math.Distance.Between(pX, pY, 908, 395);
    const distTownHall = Phaser.Math.Distance.Between(pX, pY, 704, 250);
    const distCafe = Phaser.Math.Distance.Between(pX, pY, 908, 735);
    const distBahnhof = Phaser.Math.Distance.Between(pX, pY, 470, 852);
    const distBraun = Phaser.Math.Distance.Between(pX, pY, 600, 850);
    const distSchool = Phaser.Math.Distance.Between(pX, pY, 260, 345);
    const distMuseum = Phaser.Math.Distance.Between(pX, pY, 1150, 345);

    const isAtSchool = Boolean(
      this.schoolDoorTrigger && this.physics.overlap(this.player, this.schoolDoorTrigger)
    );
    const isAtMuseum = Boolean(
      this.museumDoorTrigger && this.physics.overlap(this.player, this.museumDoorTrigger)
    );

    // Update zone label in HUD
    let zone = 'Marktplatz';
    if (isAtSchool || distSchool <= 120) zone = 'Sprachschule';
    else if (isAtMuseum || distMuseum <= 120) zone = 'Geschichtsmuseum';
    else if (distBahnhof <= 250 || distBraun <= 250) zone = 'Bahnhof';
    else if (distCafe <= 210) zone = 'Café Gemütlichkeit';
    else if (distBakery <= 200) zone = 'Bäckerei';
    else if (distLibrary <= 200) zone = 'Bibliothek';
    else if (distTownHall <= 200) zone = 'Rathaus';
    if (store.currentZone !== zone) store.setCurrentZone(zone);

    // Determine current target and prompt
    let currentTarget:
      | 'lukas'
      | 'school'
      | 'museum'
      | 'bakery'
      | 'library'
      | 'townhall'
      | 'cafe'
      | 'bahnhof'
      | 'braun'
      | null = null;
    let activePrompt: string | null = null;

    if (isAtSchool || distSchool <= 60) {
      currentTarget = 'school';
      activePrompt = `${interactHint} Sprachschule betreten (Lukas)`;
    } else if (isAtMuseum || distMuseum <= 60) {
      currentTarget = 'museum';
      activePrompt = `${interactHint} Geschichtsmuseum betreten (Frau Weber)`;
    } else if (distLukas <= 68) {
      currentTarget = 'lukas';
      activePrompt = `${interactHint} Mit Lukas sprechen`;
    } else if (distBakery <= 55) {
      currentTarget = 'bakery';
      activePrompt = `${interactHint} Bäckerei betreten (Wort-Blitz)`;
    } else if (distLibrary <= 55) {
      currentTarget = 'library';
      activePrompt = `${interactHint} Bibliothek betreten (Satz-Bauer)`;
    } else if (distTownHall <= 60) {
      currentTarget = 'townhall';
      activePrompt = `${interactHint} Rathaus betreten (Bürger-Quiz)`;
    } else if (distCafe <= 55) {
      currentTarget = 'cafe';
      activePrompt = `${interactHint} Café betreten (Speisekarten-Match)`;
    } else if (distBraun <= 60) {
      currentTarget = 'braun';
      activePrompt = `${interactHint} Mit Herrn Braun sprechen`;
    } else if (distBahnhof <= 62) {
      currentTarget = 'bahnhof';
      activePrompt = `${interactHint} Fahrkarten-Schalter öffnen`;
    }

    if (store.interactionPrompt !== activePrompt) {
      store.setInteractionPrompt(activePrompt);
    }
    this.activeNearbyTarget = currentTarget;

    // 3. Handle Interaction (keyboard SPACE/E/ENTER or the on-screen A button)
    const spaceJustDown = Phaser.Input.Keyboard.JustDown(this.spaceKey);
    const eJustDown = Phaser.Input.Keyboard.JustDown(this.eKey);
    const enterJustDown = Phaser.Input.Keyboard.JustDown(this.enterKey);

    if (currentTarget && (spaceJustDown || eJustDown || enterJustDown || interactionRequested)) {
      this.player.setVelocity(0, 0);
      store.setInteractionPrompt(null);

      if (currentTarget === 'school') {
        store.openSprachschuleInterior();
      } else if (currentTarget === 'museum') {
        store.setOverlay('museum_interior');
      } else if (currentTarget === 'lukas') {
        store.openDialogue((dialogueTree as any).lukas_intro);
        if (!this.hasSpokenFirstTime) {
          this.hasSpokenFirstTime = true;
          store.updateQuestProgress('welcome_quest', 1);
          store.addXP(25);
          store.addCoins(10);
        }
      } else if (currentTarget === 'bakery') {
        store.setOverlay('minigame');
      } else if (currentTarget === 'library') {
        store.setOverlay('satzbauer');
      } else if (currentTarget === 'townhall') {
        store.setOverlay('buergerquiz');
      } else if (currentTarget === 'cafe') {
        store.setOverlay('kaffee');
      } else if (currentTarget === 'braun') {
        store.openDialogue((dialogueTree as any).braun_intro);
        if (!this.hasSpokenToBraun) {
          this.hasSpokenToBraun = true;
          store.addXP(10);
        }
      } else if (currentTarget === 'bahnhof') {
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
    this.add
      .text(496, 908, 'GLEIS 1', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#facc15',
        backgroundColor: '#0f172a',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);

    // Static departure board near the platform
    this.add
      .text(590, 908, 'ABFAHRT 14:30\nHAMBURG · GLEIS 3', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#fbbf24',
        backgroundColor: '#000000',
        padding: { x: 4, y: 3 },
        lineSpacing: 2,
      })
      .setOrigin(0.5);

    // Station master NPC
    const masterX = 600;
    const masterY = 848;
    this.stationMaster = this.physics.add.sprite(masterX, masterY, 'station_master');
    this.stationMaster.setImmovable(true);
    this.stationMaster.setSize(22, 28);

    this.add
      .text(masterX, masterY - 30, 'Herr Braun', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
  }

  /**
   * Drifting cherry blossom petals across the wind
   */
  private createFallingPetals(worldWidth: number, worldHeight: number) {
    const petalCount = 20;
    for (let i = 0; i < petalCount; i++) {
      const startX = Phaser.Math.Between(0, worldWidth);
      const startY = Phaser.Math.Between(0, worldHeight);
      const petal = this.add.image(startX, startY, 'cherry_petal');
      petal.setAlpha(Phaser.Math.FloatBetween(0.4, 0.9));
      petal.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      petal.setDepth(999);

      this.tweens.add({
        targets: petal,
        x: {
          value: () => petal.x + Phaser.Math.Between(150, 300),
          duration: Phaser.Math.Between(4500, 7500),
          ease: 'Linear',
        },
        y: {
          value: () => petal.y + Phaser.Math.Between(200, 400),
          duration: Phaser.Math.Between(4500, 7500),
          ease: 'Sine.easeInOut',
        },
        angle: {
          value: 360,
          duration: Phaser.Math.Between(3000, 6000),
          repeat: -1,
        },
        loop: -1,
        onLoop: () => {
          petal.x = Phaser.Math.Between(-100, worldWidth - 200);
          petal.y = Phaser.Math.Between(-50, worldHeight / 2);
        },
      });
    }
  }

  /**
   * Procedural textures & aesthetic paving
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

    // 3. Flower Patch Grass (32x32) - wildflowers (tulips, daisies, lavender)
    const fPatch = this.make.graphics({ x: 0, y: 0 });
    fPatch.fillStyle(0x3ea856, 1);
    fPatch.fillRect(0, 0, 32, 32);
    // Flowers
    fPatch.fillStyle(0xf43f5e, 1); // Rose Tulip
    fPatch.fillRect(6, 8, 4, 4);
    fPatch.fillRect(7, 6, 2, 2);
    fPatch.fillStyle(0xfde047, 1); // Yellow Daisy
    fPatch.fillRect(20, 10, 4, 4);
    fPatch.fillStyle(0xffffff, 1);
    fPatch.fillRect(21, 11, 2, 2);
    fPatch.fillStyle(0xa855f7, 1); // Lavender
    fPatch.fillRect(10, 20, 3, 5);
    fPatch.fillStyle(0xec4899, 1); // Pink bloom
    fPatch.fillRect(22, 22, 4, 4);
    fPatch.fillStyle(0x22c55e, 1); // Stems
    fPatch.fillRect(7, 12, 2, 4);
    fPatch.fillRect(21, 14, 2, 4);
    fPatch.generateTexture('flower_tile', 32, 32);
    fPatch.destroy();

    // 4. Cobblestone Path (32x32)
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

    // 5. Cobblestone with Floral Edge (32x32) - Flowers lining pathway borders!
    const cobbleFlora = this.make.graphics({ x: 0, y: 0 });
    cobbleFlora.fillStyle(0x8a929e, 1);
    cobbleFlora.fillRect(0, 0, 32, 32);
    cobbleFlora.fillStyle(0x565c69, 1);
    cobbleFlora.fillRect(0, 15, 32, 2);
    cobbleFlora.fillRect(15, 0, 2, 16);
    cobbleFlora.fillRect(8, 16, 2, 16);
    // Stone kerb line
    cobbleFlora.fillStyle(0x334155, 1);
    cobbleFlora.fillRect(0, 0, 32, 3);
    // Flowers along top border of pathway
    cobbleFlora.fillStyle(0xf472b6, 1); // Cherry blossom pink
    cobbleFlora.fillRect(3, 1, 4, 3);
    cobbleFlora.fillRect(17, 1, 4, 3);
    cobbleFlora.fillStyle(0xfde047, 1); // Yellow blossom
    cobbleFlora.fillRect(10, 1, 3, 3);
    cobbleFlora.fillRect(25, 1, 3, 3);
    cobbleFlora.fillStyle(0xffffff, 1); // White daisy petal
    cobbleFlora.fillRect(4, 2, 2, 1);
    cobbleFlora.fillRect(18, 2, 2, 1);
    cobbleFlora.generateTexture('cobble_flower_border', 32, 32);
    cobbleFlora.destroy();

    // 6. Ornate Diamond Cobble (32x32) for Central Plaza
    const ornateG = this.make.graphics({ x: 0, y: 0 });
    ornateG.fillStyle(0x94a3b8, 1);
    ornateG.fillRect(0, 0, 32, 32);
    ornateG.fillStyle(0x475569, 1);
    ornateG.fillRect(0, 0, 32, 1);
    ornateG.fillRect(0, 0, 1, 32);
    // Inlay Diamond
    ornateG.fillStyle(0xcbd5e1, 1);
    ornateG.fillRect(14, 4, 4, 4);
    ornateG.fillRect(10, 8, 12, 4);
    ornateG.fillRect(6, 12, 20, 8);
    ornateG.fillRect(10, 20, 12, 4);
    ornateG.fillRect(14, 24, 4, 4);
    ornateG.fillStyle(0x0284c7, 1);
    ornateG.fillRect(15, 15, 2, 2);
    ornateG.generateTexture('cobble_ornate', 32, 32);
    ornateG.destroy();

    // 7. Cherry Blossom Falling Petal (8x8)
    const petalG = this.make.graphics({ x: 0, y: 0 });
    petalG.fillStyle(0xf472b6, 0.95);
    petalG.fillRect(1, 2, 5, 4);
    petalG.fillRect(2, 1, 3, 6);
    petalG.fillStyle(0xfff1f2, 1);
    petalG.fillRect(2, 2, 2, 2);
    petalG.generateTexture('cherry_petal', 8, 8);
    petalG.destroy();

    // 8. Cherry Blossom Tree (64x80)
    const treeG = this.make.graphics({ x: 0, y: 0 });
    // Trunk & Roots
    treeG.fillStyle(0x5c2e17, 1);
    treeG.fillRect(26, 46, 12, 28);
    treeG.fillStyle(0x3f1d0b, 1); // Shadow on trunk
    treeG.fillRect(34, 46, 4, 28);
    treeG.fillRect(22, 68, 6, 6); // Left root
    treeG.fillRect(36, 68, 8, 6); // Right root
    // Canopy Base Shadows (Deep Sakura Rose)
    treeG.fillStyle(0xbe185d, 1);
    treeG.fillCircle(32, 30, 28);
    treeG.fillCircle(18, 34, 18);
    treeG.fillCircle(46, 34, 18);
    // Canopy Mid Layer (Vibrant Sakura Pink)
    treeG.fillStyle(0xf472b6, 1);
    treeG.fillCircle(32, 26, 25);
    treeG.fillCircle(18, 28, 16);
    treeG.fillCircle(46, 28, 16);
    treeG.fillCircle(32, 16, 18);
    // Fluffy Top Highlights (Soft Pastel Blossom & White)
    treeG.fillStyle(0xfbcfe8, 1);
    treeG.fillCircle(28, 20, 14);
    treeG.fillCircle(42, 22, 13);
    treeG.fillCircle(18, 24, 11);
    treeG.fillStyle(0xfff1f2, 1); // Petal highlights
    treeG.fillRect(24, 14, 4, 4);
    treeG.fillRect(38, 16, 5, 4);
    treeG.fillRect(16, 20, 4, 3);
    treeG.fillRect(44, 26, 4, 3);
    treeG.generateTexture('cherry_blossom_tree', 64, 80);
    treeG.destroy();

    // 9. Street Lantern (32x48)
    const lampG = this.make.graphics({ x: 0, y: 0 });
    lampG.fillStyle(0x1e293b, 1);
    lampG.fillRect(14, 14, 4, 30); // Iron post
    lampG.fillRect(10, 42, 12, 4); // Base
    // Lantern head
    lampG.fillRect(9, 6, 14, 3);
    lampG.fillRect(8, 9, 16, 2);
    lampG.fillRect(7, 3, 18, 3);
    // Glowing lamp glass
    lampG.fillStyle(0xfef08a, 1);
    lampG.fillRect(11, 11, 10, 10);
    lampG.fillStyle(0xfacc15, 1);
    lampG.fillRect(13, 13, 6, 6);
    lampG.fillStyle(0xffffff, 1);
    lampG.fillRect(14, 14, 3, 3);
    lampG.generateTexture('street_lantern', 32, 48);
    lampG.destroy();

    // 10. GESCHICHTSMUSEUM (Clean Procedural Pixel-Art Neoclassical - 104x86)
    const museumG = this.make.graphics({ x: 0, y: 0 });
    // Classical Triangular Pediment Roof
    museumG.fillStyle(0x475569, 1); // Roof border
    for (let i = 0; i < 20; i++) {
      museumG.fillRect(52 - i * 2.5, i, i * 5, 2);
    }
    museumG.fillStyle(0x64748b, 1); // Inner triangle
    for (let i = 4; i < 18; i++) {
      museumG.fillRect(52 - (i - 3) * 2.5, i, (i - 3) * 5, 1);
    }
    // Gold Emblem in pediment center
    museumG.fillStyle(0xfacc15, 1);
    museumG.fillCircle(52, 12, 4);
    museumG.fillStyle(0xffffff, 1);
    museumG.fillCircle(52, 12, 1);

    // Marble Architrave / Frieze
    museumG.fillStyle(0xcfd8dc, 1);
    museumG.fillRect(4, 20, 96, 14);
    // German Flag Ribbon Accent
    museumG.fillStyle(0x000000, 1);
    museumG.fillRect(4, 20, 96, 2);
    museumG.fillStyle(0xdc2626, 1);
    museumG.fillRect(4, 22, 96, 2);
    museumG.fillStyle(0xfacc15, 1);
    museumG.fillRect(4, 24, 96, 2);

    // Gold "MUSEUM" Plaque Banner
    museumG.fillStyle(0x0f172a, 1);
    museumG.fillRect(28, 27, 48, 8);
    museumG.fillStyle(0xfde047, 1);
    // Simple pixel lettering for "MUSEUM"
    museumG.fillRect(32, 29, 40, 4);

    // Sandstone Marble Wall Facade
    museumG.fillStyle(0xe2e8f0, 1);
    museumG.fillRect(6, 34, 92, 48);

    // 4 Classical Columns
    const colXs = [10, 30, 66, 86];
    colXs.forEach((cx) => {
      // Capital (top gold trim)
      museumG.fillStyle(0xfde047, 1);
      museumG.fillRect(cx - 2, 34, 12, 3);
      // Pillar shaft
      museumG.fillStyle(0xf8fafc, 1);
      museumG.fillRect(cx, 37, 8, 42);
      museumG.fillStyle(0x94a3b8, 1);
      museumG.fillRect(cx + 6, 37, 2, 42);
      // Base
      museumG.fillStyle(0xfde047, 1);
      museumG.fillRect(cx - 2, 79, 12, 3);
    });

    // Display Windows with warm exhibition light
    museumG.fillStyle(0xfef08a, 1);
    museumG.fillRect(19, 44, 9, 14);
    museumG.fillRect(76, 44, 9, 14);
    museumG.fillStyle(0x0f172a, 1);
    // Silhouette of historical vase/bust inside windows
    museumG.fillRect(22, 49, 4, 6);
    museumG.fillRect(79, 49, 4, 6);

    // Grand Arched Double Entrance
    museumG.fillStyle(0x1e293b, 1);
    museumG.fillRect(42, 42, 20, 38);
    museumG.fillStyle(0x451a03, 1);
    museumG.fillRect(44, 44, 16, 36);
    museumG.fillStyle(0x0f172a, 1);
    museumG.fillRect(51, 44, 2, 36);
    // Brass door handles
    museumG.fillStyle(0xfacc15, 1);
    museumG.fillRect(48, 62, 2, 4);
    museumG.fillRect(54, 62, 2, 4);

    // Stone Steps at Entrance
    museumG.fillStyle(0x94a3b8, 1);
    museumG.fillRect(36, 80, 32, 3);
    museumG.fillStyle(0x64748b, 1);
    museumG.fillRect(32, 83, 40, 3);

    museumG.generateTexture('museum_building', 104, 86);
    museumG.destroy();

    // 11. Town Fountain (64x64)
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

    // 12. Die Bäckerei (80x80)
    const bakeryG = this.make.graphics({ x: 0, y: 0 });
    bakeryG.fillStyle(0xb91c1c, 1);
    bakeryG.fillRect(0, 0, 80, 24);
    bakeryG.fillStyle(0x991b1b, 1);
    bakeryG.fillRect(4, 20, 72, 4);
    bakeryG.fillStyle(0xfde68a, 1);
    bakeryG.fillRect(4, 24, 72, 54);
    bakeryG.fillStyle(0x78350f, 1);
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
    // Door & window
    bakeryG.fillStyle(0x92400e, 1);
    bakeryG.fillRect(30, 48, 20, 30);
    bakeryG.fillStyle(0xfacc15, 1);
    bakeryG.fillRect(34, 64, 3, 3);
    bakeryG.fillStyle(0x38bdf8, 1);
    bakeryG.fillRect(12, 46, 16, 16);
    bakeryG.fillStyle(0xd97706, 1);
    bakeryG.fillRect(14, 52, 12, 6);
    bakeryG.generateTexture('bakery_building', 80, 80);
    bakeryG.destroy();

    // 13. Die Bibliothek (80x80)
    const libG = this.make.graphics({ x: 0, y: 0 });
    libG.fillStyle(0x1e3a8a, 1);
    libG.fillRect(0, 0, 80, 24);
    libG.fillStyle(0x1d4ed8, 1);
    libG.fillRect(4, 20, 72, 4);
    libG.fillStyle(0xe2e8f0, 1);
    libG.fillRect(4, 24, 72, 54);
    libG.fillStyle(0x94a3b8, 1);
    libG.fillRect(8, 24, 8, 54);
    libG.fillRect(24, 24, 8, 54);
    libG.fillRect(48, 24, 8, 54);
    libG.fillRect(64, 24, 8, 54);
    libG.fillStyle(0xfacc15, 1);
    libG.fillRect(36, 30, 8, 8);
    libG.fillStyle(0x3b2314, 1);
    libG.fillRect(34, 46, 12, 32);
    libG.generateTexture('library_building', 80, 80);
    libG.destroy();

    // 14. Das Rathaus (112x84)
    const rathausG = this.make.graphics({ x: 0, y: 0 });
    rathausG.fillStyle(0x334155, 1);
    rathausG.fillRect(44, 0, 24, 24);
    rathausG.fillStyle(0xfef08a, 1);
    rathausG.fillRect(50, 4, 12, 12);
    rathausG.fillStyle(0x0f172a, 1);
    rathausG.fillRect(55, 6, 2, 6);
    rathausG.fillRect(55, 10, 4, 2);
    rathausG.fillStyle(0x475569, 1);
    rathausG.fillRect(4, 24, 104, 16);
    rathausG.fillStyle(0xcfd8dc, 1);
    rathausG.fillRect(6, 40, 100, 44);
    rathausG.fillStyle(0x000000, 1);
    rathausG.fillRect(6, 40, 100, 3);
    rathausG.fillStyle(0xdc2626, 1);
    rathausG.fillRect(6, 43, 100, 3);
    rathausG.fillStyle(0xfacc15, 1);
    rathausG.fillRect(6, 46, 100, 3);
    rathausG.fillStyle(0x1e293b, 1);
    rathausG.fillRect(46, 52, 20, 32);
    rathausG.fillStyle(0xfacc15, 1);
    rathausG.fillRect(52, 68, 2, 4);
    rathausG.fillRect(58, 68, 2, 4);
    rathausG.generateTexture('town_hall_building', 112, 84);
    rathausG.destroy();

    // 15. Das Café (80x72)
    const cafeG = this.make.graphics({ x: 0, y: 0 });
    cafeG.fillStyle(0x78350f, 1);
    cafeG.fillRect(4, 0, 72, 18);
    cafeG.fillStyle(0xfef3c7, 1);
    cafeG.fillRect(4, 18, 72, 54);
    cafeG.fillStyle(0x16a34a, 1);
    cafeG.fillRect(8, 24, 64, 10);
    cafeG.fillStyle(0xffffff, 1);
    cafeG.fillRect(16, 24, 10, 10);
    cafeG.fillRect(36, 24, 10, 10);
    cafeG.fillRect(56, 24, 10, 10);
    cafeG.fillStyle(0x38bdf8, 1);
    cafeG.fillRect(12, 40, 18, 18);
    cafeG.fillStyle(0x78350f, 1);
    cafeG.fillRect(16, 46, 10, 8);
    cafeG.fillStyle(0x451a03, 1);
    cafeG.fillRect(46, 38, 18, 34);
    cafeG.generateTexture('cafe_building', 80, 72);
    cafeG.destroy();

    // 16. Der Bahnhof (160x128)
    const bahnhofG = this.make.graphics({ x: 0, y: 0 });
    bahnhofG.fillStyle(0x334155, 1);
    bahnhofG.fillRect(0, 0, 160, 26);
    bahnhofG.fillStyle(0x1e293b, 1);
    bahnhofG.fillRect(0, 22, 160, 6);
    bahnhofG.fillStyle(0x475569, 1);
    bahnhofG.fillRect(64, 0, 32, 30);
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(70, 2, 20, 18);
    bahnhofG.fillStyle(0xfef08a, 1);
    bahnhofG.fillRect(74, 5, 12, 12);
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(79, 7, 2, 5);
    bahnhofG.fillRect(79, 11, 4, 2);
    bahnhofG.fillStyle(0xd7c6a3, 1);
    bahnhofG.fillRect(6, 26, 148, 96);
    bahnhofG.fillStyle(0xc4b08c, 1);
    for (let row = 40; row < 120; row += 12) {
      bahnhofG.fillRect(10, row, 140, 2);
    }
    bahnhofG.fillStyle(0x3b2314, 1);
    bahnhofG.fillRect(66, 70, 28, 52);
    bahnhofG.fillStyle(0x0f172a, 1);
    bahnhofG.fillRect(79, 70, 2, 52);
    bahnhofG.fillStyle(0xfacc15, 1);
    bahnhofG.fillRect(72, 96, 3, 6);
    bahnhofG.fillRect(85, 96, 3, 6);
    bahnhofG.fillStyle(0x94a3b8, 1);
    bahnhofG.fillRect(56, 118, 48, 10);
    bahnhofG.fillStyle(0x64748b, 1);
    bahnhofG.fillRect(50, 124, 60, 4);
    bahnhofG.generateTexture('bahnhof_building', 160, 128);
    bahnhofG.destroy();

    // 17. Platform & Rail Tiles
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

    const railG = this.make.graphics({ x: 0, y: 0 });
    railG.fillStyle(0x4b5563, 1);
    railG.fillRect(0, 0, 32, 32);
    railG.fillStyle(0x374151, 1);
    railG.fillRect(3, 4, 6, 4);
    railG.fillRect(19, 15, 7, 4);
    railG.fillRect(8, 26, 5, 3);
    railG.fillStyle(0x5b3a1e, 1);
    railG.fillRect(2, 0, 5, 32);
    railG.fillRect(13, 0, 5, 32);
    railG.fillRect(24, 0, 5, 32);
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

    // 18. Steam Train (336x60)
    const trainG = this.make.graphics({ x: 0, y: 0 });
    trainG.fillStyle(0x111827, 1);
    trainG.fillRect(0, 40, 336, 10);
    trainG.fillStyle(0x1f2937, 1);
    trainG.fillRect(0, 16, 70, 26);
    trainG.fillStyle(0xb91c1c, 1);
    trainG.fillRect(0, 10, 70, 10);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(12, 0, 14, 14);
    trainG.fillStyle(0xfacc15, 1);
    trainG.fillRect(4, 22, 6, 6);
    trainG.fillStyle(0xfef08a, 1);
    trainG.fillRect(5, 23, 4, 4);
    trainG.fillStyle(0x991b1b, 1);
    trainG.fillRect(68, 0, 52, 42);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(76, 6, 16, 14);
    trainG.fillRect(96, 6, 16, 14);
    trainG.fillStyle(0xa5f3fc, 1);
    trainG.fillRect(79, 9, 10, 8);
    trainG.fillRect(99, 9, 10, 8);
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
    trainG.fillStyle(0x15803d, 1);
    trainG.fillRect(240, 12, 96, 30);
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(240, 38, 96, 6);
    trainG.fillStyle(0x86efac, 1);
    trainG.fillRect(248, 18, 16, 10);
    trainG.fillRect(272, 18, 16, 10);
    trainG.fillRect(304, 18, 16, 10);
    const wheelXs = [20, 50, 80, 110, 150, 185, 220, 260, 295, 325];
    wheelXs.forEach((wx) => {
      trainG.fillStyle(0x0f172a, 1);
      trainG.fillCircle(wx, 50, 7);
      trainG.fillStyle(0x94a3b8, 1);
      trainG.fillCircle(wx, 50, 2);
    });
    trainG.generateTexture('train_complete', 336, 60);
    trainG.destroy();

    // 19. Station Master & Hero
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

    const heroG = this.make.graphics({ x: 0, y: 0 });
    heroG.fillStyle(0xef4444, 1);
    heroG.fillRect(8, 2, 16, 6);
    heroG.fillRect(6, 6, 20, 3);
    heroG.fillStyle(0xfde047, 1);
    heroG.fillRect(8, 9, 16, 9);
    heroG.fillStyle(0x1e293b, 1);
    heroG.fillRect(10, 12, 3, 3);
    heroG.fillRect(19, 12, 3, 3);
    heroG.fillStyle(0x3b82f6, 1);
    heroG.fillRect(8, 18, 16, 8);
    heroG.fillStyle(0xd97706, 1);
    heroG.fillRect(8, 23, 16, 2);
    heroG.fillStyle(0xfef08a, 1);
    heroG.fillRect(14, 23, 4, 2);
    heroG.fillStyle(0x334155, 1);
    heroG.fillRect(9, 26, 5, 5);
    heroG.fillRect(18, 26, 5, 5);
    heroG.generateTexture('player_hero', 32, 32);
    heroG.destroy();
  }

  /**
   * Render ornate, designful town pathways connecting every building with flower edges & trees
   */
  private renderWorldMap(mapWidth: number, mapHeight: number, tileSize: number) {
    const centerTileX = Math.floor(mapWidth / 2); // 22
    const centerTileY = Math.floor(mapHeight / 2); // 17

    const isPathTile = (x: number, y: number): boolean => {
      // 1. Central Plaza (Spacious paved square)
      const inPlaza = Math.abs(x - centerTileX) <= 5 && Math.abs(y - centerTileY) <= 4;
      if (inPlaza) return true;

      // 2. North Avenue (towards Rathaus)
      const inNorthAvenue = Math.abs(x - centerTileX) <= 1 && y >= 4 && y <= centerTileY;
      if (inNorthAvenue) return true;

      // 3. South Avenue (towards Café)
      const inSouthAvenue = Math.abs(x - centerTileX) <= 1 && y >= centerTileY && y <= 25;
      if (inSouthAvenue) return true;

      // 4. West Avenue (towards Bäckerei & Sprachschule)
      const inWestAvenue = y >= 15 && y <= 17 && x >= 5 && x <= centerTileX;
      if (inWestAvenue) return true;

      // 5. East Avenue (towards Bibliothek & Geschichtsmuseum)
      const inEastAvenue = y >= 15 && y <= 17 && x >= centerTileX && x <= 39;
      if (inEastAvenue) return true;

      // 6. Northwest Promenade to Sprachschule (x: 6..10, y: 10..15)
      const inSchoolPath = x >= 6 && x <= 10 && y >= 10 && y <= 16;
      if (inSchoolPath) return true;

      // 7. Northeast Promenade to Geschichtsmuseum (x: 34..38, y: 10..15)
      const inMuseumPath = x >= 34 && x <= 38 && y >= 10 && y <= 16;
      if (inMuseumPath) return true;

      // 8. Southwest Promenade to Bahnhof (x: 10..22, y: 24..27)
      const inBahnhofPath = x >= 10 && x <= 22 && y >= 24 && y <= 27;
      if (inBahnhofPath) return true;

      return false;
    };

    const isOrnatePlaza = (x: number, y: number): boolean => {
      const dx = Math.abs(x - centerTileX);
      const dy = Math.abs(y - centerTileY);
      return dx <= 3 && dy <= 3 && !(dx === 0 && dy === 0);
    };

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const posX = x * tileSize + tileSize / 2;
        const posY = y * tileSize + tileSize / 2;

        const isRoad = isPathTile(x, y);

        if (isRoad) {
          if (isOrnatePlaza(x, y)) {
            this.add.image(posX, posY, 'cobble_ornate');
          } else {
            // Check if on the top border of the road to line it with flowers!
            const topIsGrass = y > 0 && !isPathTile(x, y - 1);
            if (topIsGrass) {
              this.add.image(posX, posY, 'cobble_flower_border');
            } else {
              this.add.image(posX, posY, 'cobblestone');
            }
          }
        } else {
          // Lush grass with flower patches
          const isFlower = (x * 7 + y * 13) % 17 === 0;
          if (isFlower) {
            this.add.image(posX, posY, 'flower_tile');
          } else {
            const isDarkTile = (x + y) % 2 === 0;
            const textureKey = isDarkTile ? 'grass_dark' : 'grass_light';
            this.add.image(posX, posY, textureKey);
          }
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
    this.fountain.setDepth(centerTileY * tileSize);

    // Decorative Street Lanterns along Promenade & Plaza Corners
    const lanternCoords = [
      { x: (centerTileX - 5) * tileSize + 16, y: (centerTileY - 4) * tileSize },
      { x: (centerTileX + 5) * tileSize + 16, y: (centerTileY - 4) * tileSize },
      { x: (centerTileX - 5) * tileSize + 16, y: (centerTileY + 4) * tileSize },
      { x: (centerTileX + 5) * tileSize + 16, y: (centerTileY + 4) * tileSize },
      { x: 8 * tileSize + 16, y: 11 * tileSize }, // Near Sprachschule
      { x: 36 * tileSize + 16, y: 11 * tileSize }, // Near Museum
    ];

    this.streetLamps = [];
    lanternCoords.forEach((l) => {
      const lamp = this.physics.add.staticImage(l.x, l.y, 'street_lantern');
      lamp.setSize(18, 20);
      lamp.setOffset(7, 26);
      lamp.setDepth(l.y);
      this.streetLamps.push(lamp);
    });
  }
}
