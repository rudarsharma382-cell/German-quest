import * as Phaser from 'phaser';
import { useGameStore } from '@/store/useGameStore';

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private lukasNpc!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private fountain!: Phaser.Physics.Arcade.Image;
  private bakeryBuilding!: Phaser.Physics.Arcade.Image;
  private isPlayerNearBakery = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;

  private proximityZone!: Phaser.GameObjects.Zone;
  private isPlayerInZone = false;
  private exclamationBadge!: Phaser.GameObjects.Container;
  private badgeTween!: Phaser.Tweens.Tween;
  private hasSpokenFirstTime = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Generate procedural pixel-art textures
    this.createProceduralTextures();
  }

  create() {
    const mapWidth = 40; // in 32px tiles
    const mapHeight = 30; // 1280 x 960 world
    const tileSize = 32;

    // Set world and physics bounds
    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 1. Draw procedural world tiles (Grass checkerboard + Cobblestone path)
    this.renderWorldMap(mapWidth, mapHeight, tileSize);

    // 2. Add NPC Lukas
    const lukasX = 640;
    const lukasY = 460;
    this.lukasNpc = this.physics.add.sprite(lukasX, lukasY, 'lukas_npc');
    this.lukasNpc.setImmovable(true);
    this.lukasNpc.setSize(24, 28);
    this.lukasNpc.setOffset(4, 4);

    // NPC Overhead Nameplate & "!" badge
    const nameText = this.add.text(lukasX, lukasY - 26, 'Lukas', {
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

    this.exclamationBadge = this.add.container(lukasX, lukasY - 42, [badgeIcon]);

    // Bobbing animation for the exclamation badge
    this.badgeTween = this.tweens.add({
      targets: this.exclamationBadge,
      y: lukasY - 48,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. NPC Proximity Zone
    const zoneRadius = 70;
    this.proximityZone = this.add.zone(lukasX, lukasY, zoneRadius * 2, zoneRadius * 2);
    this.physics.world.enable(this.proximityZone, Phaser.Physics.Arcade.STATIC_BODY);

    // 3b. Add Bäckerei (Bakery) Building
    const bakeryX = 460;
    const bakeryY = 320;
    this.bakeryBuilding = this.physics.add.staticImage(bakeryX, bakeryY, 'bakery_building');
    this.bakeryBuilding.setSize(76, 68);

    // Bakery sign text
    this.add.text(bakeryX, bakeryY - 44, 'BÄCKEREI', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#facc15',
      backgroundColor: '#78350f',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    // 4. Create Player
    const startX = 640;
    const startY = 560;
    this.player = this.physics.add.sprite(startX, startY, 'player_hero');
    this.player.setCollideWorldBounds(true);
    this.player.setSize(22, 26);
    this.player.setOffset(5, 6);

    // 5. Colliders (Player must exist before adding colliders)
    this.physics.add.collider(this.player, this.lukasNpc);
    if (this.fountain) {
      this.physics.add.collider(this.player, this.fountain);
    }
    if (this.bakeryBuilding) {
      this.physics.add.collider(this.player, this.bakeryBuilding);
    }

    // 5. Camera setup
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.25); // Slight retro zoom

    // 6. Setup Inputs
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
    }
  }

  update() {
    const store = useGameStore.getState();

    // 1. If an overlay (dialogue, minigame) is open, freeze player movement
    if (store.activeOverlay !== 'none') {
      this.player.setVelocity(0, 0);
      return;
    }

    // 2. Proximity Detection with Lukas
    const distanceToLukas = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.lukasNpc.x,
      this.lukasNpc.y
    );

    const isInRange = distanceToLukas <= 68;

    // 2b. Proximity Detection with Bäckerei (Door at x: 460, y: 360)
    const distanceToBakery = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      460,
      360
    );
    const isNearBakery = distanceToBakery <= 54;

    if (isInRange && !this.isPlayerInZone) {
      this.isPlayerInZone = true;
      store.setInteractionPrompt('[SPACE] Mit Lukas sprechen');
    } else if (!isInRange && this.isPlayerInZone) {
      this.isPlayerInZone = false;
      if (!isNearBakery) store.setInteractionPrompt(null);
    }

    if (isNearBakery && !this.isPlayerNearBakery) {
      this.isPlayerNearBakery = true;
      store.setInteractionPrompt('[SPACE] Bäckerei betreten (Wort-Blitz)');
    } else if (!isNearBakery && this.isPlayerNearBakery) {
      this.isPlayerNearBakery = false;
      if (!isInRange) store.setInteractionPrompt(null);
    }

    // 3. Handle Interaction Key Press (SPACE or E)
    const spaceJustDown = Phaser.Input.Keyboard.JustDown(this.spaceKey);
    const eJustDown = Phaser.Input.Keyboard.JustDown(this.eKey);

    if (this.isPlayerNearBakery && (spaceJustDown || eJustDown)) {
      this.player.setVelocity(0, 0);
      store.setInteractionPrompt(null);
      store.setOverlay('minigame');
      return;
    }

    if (this.isPlayerInZone && (spaceJustDown || eJustDown)) {
      this.player.setVelocity(0, 0);
      store.setInteractionPrompt(null);

      // Trigger German dialogue
      store.openDialogue({
        speaker: 'Lukas (Stadtwache)',
        text: 'Hallo! Willkommen in Deutschstadt! Ich bin Lukas, dein Begleiter. Hier lernst du die deutsche Sprache spielerisch. Bist du bereit für deine erste Aufgabe?',
        translation: 'Hello! Welcome to German City! I am Lukas, your guide. Here you will learn the German language playfully. Are you ready for your first quest?',
      });

      // Grant first quest discovery XP
      if (!this.hasSpokenFirstTime) {
        this.hasSpokenFirstTime = true;
        store.addXP(25);
        store.addCoins(10);
      }
      return;
    }

    // 4. Player Movement Controls (WASD & Arrows)
    const speed = 175;
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

    if (vx !== 0 && vy !== 0) {
      // Normalize diagonal speed
      const factor = Math.SQRT1_2;
      vx *= factor;
      vy *= factor;
    }

    this.player.setVelocity(vx * speed, vy * speed);

    // Flip sprite when facing left
    if (vx < 0) {
      this.player.setFlipX(true);
    } else if (vx > 0) {
      this.player.setFlipX(false);
    }
  }

  /**
   * Procedural textures generated dynamically without requiring external image files.
   */
  private createProceduralTextures() {
    // 1. Grass Light (32x32)
    const gLight = this.make.graphics({ x: 0, y: 0 });
    gLight.fillStyle(0x3ea856, 1); // Vibrant grass
    gLight.fillRect(0, 0, 32, 32);
    gLight.fillStyle(0x4ec268, 1); // Blade highlight
    gLight.fillRect(4, 6, 2, 6);
    gLight.fillRect(18, 16, 2, 6);
    gLight.fillRect(24, 8, 2, 5);
    gLight.fillStyle(0x328945, 1); // Shadow
    gLight.fillRect(0, 0, 32, 1);
    gLight.fillRect(0, 0, 1, 32);
    gLight.generateTexture('grass_light', 32, 32);
    gLight.destroy();

    // 2. Grass Dark (32x32) for checkerboard contrast
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
    cobble.fillStyle(0x8a929e, 1); // Base stone
    cobble.fillRect(0, 0, 32, 32);
    cobble.fillStyle(0x565c69, 1); // Stone grout
    cobble.fillRect(0, 15, 32, 2);
    cobble.fillRect(15, 0, 2, 16);
    cobble.fillRect(8, 16, 2, 16);
    cobble.fillRect(24, 16, 2, 16);
    // Highlights
    cobble.fillStyle(0xbac1ce, 1);
    cobble.fillRect(2, 2, 11, 2);
    cobble.fillRect(18, 2, 11, 2);
    cobble.fillRect(10, 18, 12, 2);
    cobble.generateTexture('cobblestone', 32, 32);
    cobble.destroy();

    // 4. Player Hero (32x32) - Cute Retro Adventurer
    const heroG = this.make.graphics({ x: 0, y: 0 });
    // Hat (Ruby Red)
    heroG.fillStyle(0xef4444, 1);
    heroG.fillRect(8, 2, 16, 6);
    heroG.fillRect(6, 6, 20, 3);
    // Face (Peachy)
    heroG.fillStyle(0xfde047, 1);
    heroG.fillRect(8, 9, 16, 9);
    // Eyes (Dark)
    heroG.fillStyle(0x1e293b, 1);
    heroG.fillRect(10, 12, 3, 3);
    heroG.fillRect(19, 12, 3, 3);
    // Tunic (Cobalt Blue)
    heroG.fillStyle(0x3b82f6, 1);
    heroG.fillRect(8, 18, 16, 8);
    // Belt (Gold buckle)
    heroG.fillStyle(0xd97706, 1);
    heroG.fillRect(8, 23, 16, 2);
    heroG.fillStyle(0xfef08a, 1);
    heroG.fillRect(14, 23, 4, 2);
    // Pants / Boots (Dark slate)
    heroG.fillStyle(0x334155, 1);
    heroG.fillRect(9, 26, 5, 5);
    heroG.fillRect(18, 26, 5, 5);
    heroG.generateTexture('player_hero', 32, 32);
    heroG.destroy();

    // 5. Lukas NPC (32x32) - Guide with Green Bavarian Alpine Hat & Vest
    const lukasG = this.make.graphics({ x: 0, y: 0 });
    // Bavarian Hat (Forest Green)
    lukasG.fillStyle(0x15803d, 1);
    lukasG.fillRect(7, 3, 18, 5);
    lukasG.fillRect(5, 7, 22, 3);
    // Red Feather in hat
    lukasG.fillStyle(0xdc2626, 1);
    lukasG.fillRect(20, 1, 3, 6);
    // Face
    lukasG.fillStyle(0xfed7aa, 1);
    lukasG.fillRect(8, 10, 16, 8);
    // Eyes & Smile
    lukasG.fillStyle(0x1f2937, 1);
    lukasG.fillRect(10, 12, 3, 3);
    lukasG.fillRect(19, 12, 3, 3);
    lukasG.fillRect(12, 16, 8, 2); // Warm smile
    // Vest (Leather Brown)
    lukasG.fillStyle(0x92400e, 1);
    lukasG.fillRect(7, 18, 18, 8);
    // White shirt underneath
    lukasG.fillStyle(0xffffff, 1);
    lukasG.fillRect(13, 18, 6, 6);
    // Pants & Boots
    lukasG.fillStyle(0x451a03, 1);
    lukasG.fillRect(9, 26, 5, 5);
    lukasG.fillRect(18, 26, 5, 5);
    lukasG.generateTexture('lukas_npc', 32, 32);
    lukasG.destroy();

    // 6. Town Fountain / Landmark (64x64)
    const fountainG = this.make.graphics({ x: 0, y: 0 });
    fountainG.fillStyle(0x64748b, 1); // Stone base
    fountainG.fillRect(4, 4, 56, 56);
    fountainG.fillStyle(0x38bdf8, 1); // Sparkling water
    fountainG.fillRect(10, 10, 44, 44);
    fountainG.fillStyle(0x0284c7, 1);
    fountainG.fillRect(14, 14, 36, 36);
    fountainG.fillStyle(0xe0f2fe, 1); // Water splash center
    fountainG.fillRect(28, 28, 8, 8);
    fountainG.generateTexture('town_fountain', 64, 64);
    fountainG.destroy();

    // 7. Bakery Building (80x80)
    const bakeryG = this.make.graphics({ x: 0, y: 0 });
    // Tiled red roof
    bakeryG.fillStyle(0xb91c1c, 1);
    bakeryG.fillRect(0, 0, 80, 24);
    bakeryG.fillStyle(0x991b1b, 1);
    bakeryG.fillRect(4, 20, 72, 4);
    // Timber walls
    bakeryG.fillStyle(0xfde68a, 1);
    bakeryG.fillRect(4, 24, 72, 54);
    // Wood framing beams
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
    // Wooden Door
    bakeryG.fillStyle(0x92400e, 1);
    bakeryG.fillRect(30, 48, 20, 30);
    bakeryG.fillStyle(0xfacc15, 1); // Brass doorknob
    bakeryG.fillRect(34, 64, 3, 3);
    // Bakery window with loaf of bread
    bakeryG.fillStyle(0x38bdf8, 1);
    bakeryG.fillRect(12, 46, 16, 16);
    bakeryG.fillStyle(0xd97706, 1); // Bread icon
    bakeryG.fillRect(14, 52, 12, 6);
    bakeryG.generateTexture('bakery_building', 80, 80);
    bakeryG.destroy();
  }

  /**
   * Render procedural world map
   */
  private renderWorldMap(mapWidth: number, mapHeight: number, tileSize: number) {
    // Road coordinates (Central north-south and east-west cobblestone paths)
    const centerTileX = Math.floor(mapWidth / 2);
    const centerTileY = Math.floor(mapHeight / 2);

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const posX = x * tileSize + tileSize / 2;
        const posY = y * tileSize + tileSize / 2;

        const isCentralPathX = Math.abs(x - centerTileX) <= 1;
        const isCentralPathY = Math.abs(y - centerTileY) <= 1;
        const isPlaza = Math.abs(x - centerTileX) <= 4 && Math.abs(y - centerTileY) <= 4;

        if (isPlaza || isCentralPathX || isCentralPathY) {
          // Cobblestone path
          this.add.image(posX, posY, 'cobblestone');
        } else {
          // Checkerboard grass
          const isDarkTile = (x + y) % 2 === 0;
          const textureKey = isDarkTile ? 'grass_dark' : 'grass_light';
          this.add.image(posX, posY, textureKey);
        }
      }
    }

    // Add decorative fountain in the center of town plaza
    this.fountain = this.physics.add.staticImage(
      centerTileX * tileSize,
      (centerTileY - 6) * tileSize,
      'town_fountain'
    );
    this.fountain.setSize(56, 56);
  }
}

