import * as Phaser from 'phaser';
import { useGameStore } from '@/store/useGameStore';
import dialogueTree from '@/data/dialogue.json';
import { soundFx } from '@/utils/audio';

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
  private stationProps: Phaser.Physics.Arcade.Image[] = [];

  // Town NPCs & Market
  private bakerNpc!: Phaser.Physics.Arcade.Sprite;
  private librarianNpc!: Phaser.Physics.Arcade.Sprite;
  private curatorNpc!: Phaser.Physics.Arcade.Sprite;
  private townNpcs: Phaser.Physics.Arcade.Sprite[] = [];
  private marketStalls: Phaser.Physics.Arcade.Image[] = [];
  private flags: Phaser.GameObjects.Sprite[] = [];
  private tunnels: Phaser.GameObjects.Image[] = [];

  // Environmental Collections & Props (Phase 1)
  private streetLamps: Phaser.Physics.Arcade.Image[] = [];
  private cherryTrees: Phaser.Physics.Arcade.Image[] = [];
  private pineTrees: Phaser.Physics.Arcade.Image[] = [];
  private natureTrees: Phaser.Physics.Arcade.Image[] = [];
  private townProps: Phaser.Physics.Arcade.Image[] = [];
  private fences: Phaser.Physics.Arcade.Image[] = [];
  private waterTiles: Phaser.GameObjects.Image[] = [];

  // Life & Animation State (Phase 2)
  private currentFacingDirection: 'down' | 'up' | 'side' = 'down';
  private lastStepTime = 0;
  private fountainRipples?: Phaser.GameObjects.Sprite;
  private chimneyTimers: Phaser.Time.TimerEvent[] = [];
  private trainSteamTimer?: Phaser.Time.TimerEvent;
  private windowLights: Phaser.GameObjects.Image[] = [];

  // Ambient NPCs and Animals (Phase 3)
  private opaNpc?: Phaser.Physics.Arcade.Sprite;
  private opaState: 'walking_to_bench' | 'sitting' | 'walking_to_plaza' = 'walking_to_bench';
  private opaTimer?: Phaser.Time.TimerEvent;

  private lenaNpc?: Phaser.Physics.Arcade.Sprite;
  private lenaState: 'patrol' | 'reading' = 'patrol';
  private lenaTimer?: Phaser.Time.TimerEvent;

  private kidMaxNpc?: Phaser.Physics.Arcade.Sprite;
  private kidBall?: Phaser.GameObjects.Sprite;
  private kidTimer?: Phaser.Time.TimerEvent;

  private dackelBello?: Phaser.Physics.Arcade.Sprite;
  private dogTimer?: Phaser.Time.TimerEvent;

  private catMimi?: Phaser.Physics.Arcade.Sprite;
  private catMeowCooldown = 0;

  private pigeons: Array<{
    sprite: Phaser.GameObjects.Sprite;
    homeX: number;
    homeY: number;
    isFlying: boolean;
  }> = [];

  private skyBirds: Phaser.GameObjects.Sprite[] = [];
  private trainDepartureBanner?: Phaser.GameObjects.Text;
  private trainScheduleTimer?: Phaser.Time.TimerEvent;
  private trainMoving = false;

  // Lighting, Shadows & Depth (Phase 4)
  private playerShadow?: Phaser.GameObjects.Image;
  private npcShadows: Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Image> = new Map();
  private lampHalos: Phaser.GameObjects.Image[] = [];
  private ambientTintRect?: Phaser.GameObjects.Rectangle;
  private vignetteImage?: Phaser.GameObjects.Image;
  private dayPhase: 'day' | 'golden_hour' | 'dusk' = 'golden_hour';

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
    | 'pretzel'
    | 'flower'
    | 'fountain'
    | 'baker'
    | 'librarian'
    | 'curator'
    | 'opa'
    | 'lena'
    | 'kid'
    | 'bello'
    | 'mimi'
    | 'signpost'
    | null = null;
  private activeNearbySignpost: {
    x: number;
    y: number;
    title: string;
    german: string;
    english: string;
  } | null = null;

  // Phase 5 Polish & Interaction State
  private townSignposts: Array<{
    x: number;
    y: number;
    title: string;
    german: string;
    english: string;
  }> = [];
  private interactiveBushes: Array<{ prop: Phaser.Physics.Arcade.Image; lastRustle: number }> = [];
  private sparkles: Phaser.GameObjects.Sprite[] = [];
  private braunBadge?: Phaser.GameObjects.Container;
  private curatorBadge?: Phaser.GameObjects.Container;

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

  private exclamationBadge?: Phaser.GameObjects.Container;
  private badgeTween!: Phaser.Tweens.Tween;
  private hasSpokenFirstTime = false;
  private hasSpokenToBraun = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Generate procedural pixel-art textures
    this.createProceduralTextures();

    // Load full-body transparent pixel Lukas world sprite
    this.load.image('lukas_sprite', '/characters/lukas_world.png');

    // Load 3/4 top-down landmark Sprachschule
    this.load.image('sprachschule', '/assets/buildings/sprachschule_topdown.png');

    // Load isometric town-institution artwork (fall back to procedural textures if absent)
    this.load.image('rathaus_art', '/assets/buildings/rathaus.png');
    this.load.image('museum_art', '/assets/buildings/museum.png');
    this.load.image('bibliothek_art', '/assets/buildings/bibliothek.png');
    this.load.image('cafe_art', '/assets/buildings/cafe.png');
    this.load.image('baeckerei_art', '/assets/buildings/baeckerei.png');
    this.load.image('bahnhof_art', '/assets/buildings/bahnhof.png');

    // Bahnhof set pieces cropped from the station artwork
    this.load.image('bahnhof_train_art', '/assets/buildings/bahnhoff_train.png');
    this.load.image('bahnhof_platform_art', '/assets/buildings/bahnhoff_platform.png');
  }

  create() {
    const mapWidth = 44; // in 32px tiles
    const mapHeight = 34; // 1408 x 1088 world
    const tileSize = 32;

    const worldWidth = mapWidth * tileSize;
    const worldHeight = mapHeight * tileSize;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 0. Register Animations (Phase 2 - 4-direction Walk Cycles, Fountain, Smoke)
    if (!this.anims.exists('wave_german_flag')) {
      this.anims.create({
        key: 'wave_german_flag',
        frames: [
          { key: 'german_flag_0' },
          { key: 'german_flag_1' },
          { key: 'german_flag_2' },
          { key: 'german_flag_1' },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }

    // 4-Direction Walk Cycles
    if (!this.anims.exists('player_walk_down')) {
      this.anims.create({
        key: 'player_walk_down',
        frames: [
          { key: 'player_walk_down_1' },
          { key: 'player_walk_down_0' },
          { key: 'player_walk_down_3' },
          { key: 'player_walk_down_0' },
        ],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: 'player_idle_down',
        frames: [{ key: 'player_idle_down' }],
        frameRate: 1,
      });
    }

    if (!this.anims.exists('player_walk_up')) {
      this.anims.create({
        key: 'player_walk_up',
        frames: [
          { key: 'player_walk_up_1' },
          { key: 'player_walk_up_0' },
          { key: 'player_walk_up_3' },
          { key: 'player_walk_up_0' },
        ],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: 'player_idle_up',
        frames: [{ key: 'player_idle_up' }],
        frameRate: 1,
      });
    }

    if (!this.anims.exists('player_walk_side')) {
      this.anims.create({
        key: 'player_walk_side',
        frames: [
          { key: 'player_walk_side_1' },
          { key: 'player_walk_side_0' },
          { key: 'player_walk_side_3' },
          { key: 'player_walk_side_0' },
        ],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: 'player_idle_side',
        frames: [{ key: 'player_idle_side' }],
        frameRate: 1,
      });
    }

    // Backward compatible animations
    if (!this.anims.exists('player_walk')) {
      this.anims.create({
        key: 'player_walk',
        frames: [
          { key: 'player_walk_down_1' },
          { key: 'player_walk_down_0' },
          { key: 'player_walk_down_3' },
          { key: 'player_walk_down_0' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists('player_idle')) {
      this.anims.create({
        key: 'player_idle',
        frames: [{ key: 'player_idle_down' }],
        frameRate: 1,
      });
    }

    // Fountain and Smoke Animations
    if (!this.anims.exists('fountain_water_anim')) {
      this.anims.create({
        key: 'fountain_water_anim',
        frames: [
          { key: 'fountain_spray_0' },
          { key: 'fountain_spray_1' },
          { key: 'fountain_spray_2' },
          { key: 'fountain_spray_1' },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!this.anims.exists('chimney_smoke_anim')) {
      this.anims.create({
        key: 'chimney_smoke_anim',
        frames: [
          { key: 'chimney_smoke_0' },
          { key: 'chimney_smoke_1' },
          { key: 'chimney_smoke_2' },
        ],
        frameRate: 3,
        repeat: -1,
      });
    }

    // Phase 3: Ambient NPC & Animal Walk & Idle Animations
    // Opa Heinrich
    if (!this.anims.exists('opa_walk_down')) {
      this.anims.create({
        key: 'opa_walk_down',
        frames: [{ key: 'opa_walk_down_1' }, { key: 'opa_walk_down_0' }, { key: 'opa_walk_down_2' }, { key: 'opa_walk_down_0' }],
        frameRate: 5,
        repeat: -1,
      });
      this.anims.create({
        key: 'opa_walk_up',
        frames: [{ key: 'opa_walk_up_1' }, { key: 'opa_walk_up_0' }, { key: 'opa_walk_up_2' }, { key: 'opa_walk_up_0' }],
        frameRate: 5,
        repeat: -1,
      });
      this.anims.create({
        key: 'opa_walk_side',
        frames: [{ key: 'opa_walk_side_1' }, { key: 'opa_walk_side_0' }, { key: 'opa_walk_side_2' }, { key: 'opa_walk_side_0' }],
        frameRate: 5,
        repeat: -1,
      });
      this.anims.create({
        key: 'opa_idle',
        frames: [{ key: 'opa_idle' }],
        frameRate: 1,
      });
      this.anims.create({
        key: 'opa_sit',
        frames: [{ key: 'opa_sit_bench' }],
        frameRate: 1,
      });
    }

    // Studentin Lena
    if (!this.anims.exists('lena_walk_down')) {
      this.anims.create({
        key: 'lena_walk_down',
        frames: [{ key: 'lena_walk_down_1' }, { key: 'lena_walk_down_0' }, { key: 'lena_walk_down_2' }, { key: 'lena_walk_down_0' }],
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: 'lena_walk_up',
        frames: [{ key: 'lena_walk_up_1' }, { key: 'lena_walk_up_0' }, { key: 'lena_walk_up_2' }, { key: 'lena_walk_up_0' }],
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: 'lena_walk_side',
        frames: [{ key: 'lena_walk_side_1' }, { key: 'lena_walk_side_0' }, { key: 'lena_walk_side_2' }, { key: 'lena_walk_side_0' }],
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: 'lena_idle',
        frames: [{ key: 'lena_idle' }],
        frameRate: 1,
      });
      this.anims.create({
        key: 'lena_read_anim',
        frames: [{ key: 'lena_read' }],
        frameRate: 1,
      });
    }

    // Kind Max
    if (!this.anims.exists('kid_walk_down')) {
      this.anims.create({
        key: 'kid_walk_down',
        frames: [{ key: 'kid_walk_down_1' }, { key: 'kid_walk_down_0' }, { key: 'kid_walk_down_2' }, { key: 'kid_walk_down_0' }],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: 'kid_walk_side',
        frames: [{ key: 'kid_walk_side_1' }, { key: 'kid_walk_side_0' }, { key: 'kid_walk_side_2' }, { key: 'kid_walk_side_0' }],
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: 'kid_idle',
        frames: [{ key: 'kid_idle' }],
        frameRate: 1,
      });
    }

    // Dackel Bello
    if (!this.anims.exists('dog_trot_side')) {
      this.anims.create({
        key: 'dog_trot_side',
        frames: [{ key: 'dog_trot_side_1' }, { key: 'dog_trot_side_0' }, { key: 'dog_trot_side_2' }, { key: 'dog_trot_side_0' }],
        frameRate: 7,
        repeat: -1,
      });
      this.anims.create({
        key: 'dog_sniff_anim',
        frames: [{ key: 'dog_sniff_0' }, { key: 'dog_sniff_1' }],
        frameRate: 3,
        repeat: -1,
      });
      this.anims.create({
        key: 'dog_idle',
        frames: [{ key: 'dog_idle' }],
        frameRate: 1,
      });
    }

    // Katze Mimi
    if (!this.anims.exists('cat_sleep_anim')) {
      this.anims.create({
        key: 'cat_sleep_anim',
        frames: [{ key: 'cat_sleep_0' }, { key: 'cat_sleep_1' }],
        frameRate: 2,
        repeat: -1,
      });
      this.anims.create({
        key: 'cat_awake_anim',
        frames: [{ key: 'cat_awake_0' }, { key: 'cat_awake_1' }],
        frameRate: 3,
        repeat: -1,
      });
    }

    // Pigeons
    if (!this.anims.exists('pigeon_peck_anim')) {
      this.anims.create({
        key: 'pigeon_peck_anim',
        frames: [{ key: 'pigeon_peck_0' }, { key: 'pigeon_peck_1' }, { key: 'pigeon_peck_2' }, { key: 'pigeon_peck_0' }],
        frameRate: 4,
        repeat: -1,
      });
      this.anims.create({
        key: 'pigeon_fly_anim',
        frames: [{ key: 'pigeon_fly_0' }, { key: 'pigeon_fly_1' }, { key: 'pigeon_fly_2' }, { key: 'pigeon_fly_1' }],
        frameRate: 10,
        repeat: -1,
      });
    }

    // 1. Draw ornate procedural world tiles, pathways, flower borders & central plaza
    this.renderWorldMap(mapWidth, mapHeight, tileSize);

    // 2. Marktplatz German Flag & Stalls
    this.createWavingFlag(704, 460);

    // Bavarian Pretzel Stand (Brezelstand)
    const pretzelCart = this.physics.add.staticImage(580, 480, 'pretzel_stand');
    pretzelCart.setOrigin(0.5, 1);
    pretzelCart.setDepth(480);
    const pBody = pretzelCart.body as Phaser.Physics.Arcade.StaticBody;
    pBody.setSize(50, 24);
    pBody.setOffset(3, 26);
    this.add
      .text(580, 480 - 56, 'BREZELSTAND', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#facc15',
        backgroundColor: '#78350f',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(481);
    this.marketStalls.push(pretzelCart);

    // Flower Stand (Blumenstand)
    const flowerCart = this.physics.add.staticImage(828, 480, 'flower_stand');
    flowerCart.setOrigin(0.5, 1);
    flowerCart.setDepth(480);
    const fBody = flowerCart.body as Phaser.Physics.Arcade.StaticBody;
    fBody.setSize(50, 24);
    fBody.setOffset(3, 26);
    this.add
      .text(828, 480 - 56, 'BLUMENSTAND', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f472b6',
        backgroundColor: '#831843',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(481);
    this.marketStalls.push(flowerCart);

    // 2b. Add NPC Lukas (Stationed beside the fountain on Marktplatz cobblestones)
    const lukasX = 636;
    const lukasY = 548;

    const lukasTextureKey = this.textures.exists('lukas_sprite') ? 'lukas_sprite' : 'lukas_npc';
    // Soft ground drop shadow for Lukas
    const lukasShadow = this.add.image(lukasX, lukasY - 2, 'shadow_medium');
    lukasShadow.setOrigin(0.5, 0.5);
    lukasShadow.setDepth(lukasY - 1);

    this.lukasNpc = this.physics.add.sprite(lukasX, lukasY, lukasTextureKey);
    this.lukasNpc.setOrigin(0.5, 1);
    this.lukasNpc.setImmovable(true);
    this.lukasNpc.setDisplaySize(44, 82);
    this.lukasNpc.setSize(24, 28);
    this.lukasNpc.setOffset(10, 54);
    this.lukasNpc.setDepth(lukasY);

    // Idle breathing animation for Lukas
    this.tweens.add({
      targets: this.lukasNpc,
      scaleY: 1.03,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Lukas Overhead Nameplate & Animated "!" badge
    this.add
      .text(lukasX, lukasY - 90, 'Lukas (Tutor)', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#facc15',
        backgroundColor: '#0f172a',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(lukasY + 1);

    const badgeIcon = this.add
      .text(0, 0, '!', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.exclamationBadge = this.add.container(lukasX, lukasY - 108, [badgeIcon]);
    this.badgeTween = this.tweens.add({
      targets: this.exclamationBadge,
      y: lukasY - 114,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Add 2D Institutions around Deutschstadt
    // A. SPRACHSCHULE (Northwest Landmark at X: 180, Y: 320 - Spaced naturally from Bäckerei)
    const schoolX = 180;
    const schoolY = 320;
    this.createBuildingCourtyard(schoolX, schoolY, 220, 220, 'school');
    if (this.textures.exists('sprachschule')) {
      this.schoolBuilding = this.physics.add.staticImage(schoolX, schoolY, 'sprachschule');
      this.schoolBuilding.setOrigin(0.5, 1);
      this.schoolBuilding.setDepth(schoolY);

      const schoolBody = this.schoolBuilding.body as Phaser.Physics.Arcade.StaticBody;
      schoolBody.setSize(this.schoolBuilding.width * 0.90, this.schoolBuilding.height * 0.28);
      schoolBody.setOffset(this.schoolBuilding.width * 0.05, this.schoolBuilding.height * 0.72);
    }
    this.schoolDoorTrigger = this.add.zone(schoolX, schoolY + 5, 48, 32);
    this.physics.world.enable(this.schoolDoorTrigger, Phaser.Physics.Arcade.STATIC_BODY);

    this.add
      .text(schoolX, schoolY - 140, 'SPRACHSCHULE', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fde047',
        backgroundColor: '#451a03',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(schoolY + 1);

    // B. GESCHICHTSMUSEUM (Northeast Landmark at X: 1120, base Y: 350)
    const museumX = 1120;
    const museumY = 350;
    this.museumBuilding = this.placeBuilding(museumX, museumY, 'museum_art', 'museum_building', 'museum');

    this.museumDoorTrigger = this.add.zone(museumX, museumY + 5, 52, 32);
    this.physics.world.enable(this.museumDoorTrigger, Phaser.Physics.Arcade.STATIC_BODY);

    this.add
      .text(museumX, museumY - this.museumBuilding.displayHeight - 12, 'GESCHICHTSMUSEUM', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#fef08a',
        backgroundColor: '#1e293b',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(museumY + 1);

    // Museum Guide NPC Frau Weber standing outside
    this.add.image(1060, 350 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(349);
    this.curatorNpc = this.physics.add.sprite(1060, 350, 'npc_curator');
    this.curatorNpc.setOrigin(0.5, 1);
    this.curatorNpc.setImmovable(true);
    this.curatorNpc.setScale(1.15);
    this.curatorNpc.setSize(22, 28);
    this.curatorNpc.setOffset(5, 16);
    this.curatorNpc.setDepth(350);
    this.add
      .text(1060, 350 - 36, 'Frau Weber', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#1e293b',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(351);

    // Phase 5: Animated Quest Exclamation Badge for Museum Curator Frau Weber
    const curatorIcon = this.add
      .text(0, 0, '!', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#38bdf8',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.curatorBadge = this.add.container(1060, 350 - 48, [curatorIcon]);
    this.curatorBadge.setDepth(352);
    this.tweens.add({
      targets: this.curatorBadge,
      y: 350 - 54,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.townNpcs.push(this.curatorNpc);

    // C. BÄCKEREI (West Avenue - X: 490, base Y: 370 - Completely uncollided & organic spacing)
    const bakeryX = 490;
    const bakeryY = 370;
    this.bakeryBuilding = this.placeBuilding(bakeryX, bakeryY, 'baeckerei_art', 'bakery_building', 'baking');
    this.add
      .text(bakeryX, bakeryY - this.bakeryBuilding.displayHeight - 12, 'BÄCKEREI', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#facc15',
        backgroundColor: '#78350f',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(bakeryY + 1);

    // Baker NPC Bäcker Schmidt standing outside
    this.add.image(430, 370 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(369);
    this.bakerNpc = this.physics.add.sprite(430, 370, 'npc_baker');
    this.bakerNpc.setOrigin(0.5, 1);
    this.bakerNpc.setImmovable(true);
    this.bakerNpc.setScale(1.15);
    this.bakerNpc.setSize(22, 28);
    this.bakerNpc.setOffset(5, 16);
    this.bakerNpc.setDepth(370);
    this.add
      .text(430, 370 - 36, 'Bäcker Schmidt', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#78350f',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(371);
    this.townNpcs.push(this.bakerNpc);

    // D. BIBLIOTHEK (East Central - X: 938, base Y: 400)
    const libraryX = 938;
    const libraryY = 400;
    this.libraryBuilding = this.placeBuilding(libraryX, libraryY, 'bibliothek_art', 'library_building', 'library');
    this.add
      .text(libraryX, libraryY - this.libraryBuilding.displayHeight - 12, 'BIBLIOTHEK', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#93c5fd',
        backgroundColor: '#1e3a8a',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(libraryY + 1);

    // Librarian NPC Frau Müller standing outside
    this.add.image(994, 400 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(399);
    this.librarianNpc = this.physics.add.sprite(994, 400, 'npc_librarian');
    this.librarianNpc.setOrigin(0.5, 1);
    this.librarianNpc.setImmovable(true);
    this.librarianNpc.setScale(1.15);
    this.librarianNpc.setSize(22, 28);
    this.librarianNpc.setOffset(5, 16);
    this.librarianNpc.setDepth(400);
    this.add
      .text(994, 400 - 36, 'Frau Müller', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#1e3a8a',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(401);
    this.townNpcs.push(this.librarianNpc);

    // E. RATHAUS (North Center - X: 704, base Y: 252)
    const rathausX = 704;
    const rathausY = 252;
    this.townHallBuilding = this.placeBuilding(rathausX, rathausY, 'rathaus_art', 'town_hall_building', 'rathaus');
    this.createWavingFlag(704, 120);
    this.add
      .text(rathausX, rathausY - this.townHallBuilding.displayHeight - 12, 'RATHAUS', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fde047',
        backgroundColor: '#0f172a',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(rathausY + 1);

    // F. CAFÉ GEMÜTLICHKEIT (Southeast - X: 920, base Y: 720)
    const cafeX = 920;
    const cafeY = 720;
    this.cafeBuilding = this.placeBuilding(cafeX, cafeY, 'cafe_art', 'cafe_building', 'cafe');
    this.add
      .text(cafeX, cafeY - this.cafeBuilding.displayHeight - 12, 'CAFÉ', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#bbf7d0',
        backgroundColor: '#14532d',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(cafeY + 1);

    // G. BAHNHOF (Main Station Concourse - Southwest - X: 300, base Y: 750)
    const bahnhofX = 300;
    const bahnhofY = 750;
    this.bahnhofBuilding = this.placeBuilding(bahnhofX, bahnhofY, 'bahnhof_art', 'bahnhof_building', 'bahnhof');
    this.add
      .text(bahnhofX, bahnhofY - this.bahnhofBuilding.displayHeight - 12, 'HAUPTBAHNHOF', {
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
      { x: 200, y: 720 }, // West Garden near Bahnhof
    ];

    this.cherryTrees = [];
    cherryTreeCoords.forEach((t) => {
      // Ambient ground shadow under sakura trunk
      const shadow = this.add.image(t.x, t.y - 4, 'shadow_large');
      shadow.setOrigin(0.5, 0.5);
      shadow.setDepth(t.y + 8);

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

    // 6. Create Player Hero (Scaled up to 1.2x for chunky Nintendo/GBA proportions)
    const startX = 704;
    const startY = 620;
    this.player = this.physics.add.sprite(startX, startY, 'player_hero_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.2);
    this.player.setSize(20, 20);
    this.player.setOffset(6, 26);

    // Soft Drop Shadow under Player
    this.playerShadow = this.add.image(startX, startY + 22, 'shadow_medium');
    this.playerShadow.setOrigin(0.5, 0.5);
    this.playerShadow.setDepth(620);

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

    // Town NPCs colliders
    this.townNpcs.forEach((npc) => {
      this.physics.add.collider(this.player, npc);
    });

    // Market Stalls colliders
    this.marketStalls.forEach((stall) => {
      this.physics.add.collider(this.player, stall);
    });

    // Station Props colliders
    this.stationProps.forEach((prop) => {
      this.physics.add.collider(this.player, prop);
    });

    // Street Lamps, Cherry Trees & Pine Trees colliders
    this.streetLamps.forEach((lamp) => {
      this.physics.add.collider(this.player, lamp);
    });
    this.cherryTrees.forEach((tree) => {
      this.physics.add.collider(this.player, tree);
    });
    this.pineTrees.forEach((tree) => {
      this.physics.add.collider(this.player, tree);
    });
    this.natureTrees.forEach((tree) => {
      this.physics.add.collider(this.player, tree);
    });
    this.townProps.forEach((prop) => {
      this.physics.add.collider(this.player, prop);
    });
    this.fences.forEach((fence) => {
      this.physics.add.collider(this.player, fence);
    });

    // 8. Camera setup - Responsive Zoom so entire town fits comfortably on screen
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setRoundPixels(true);
    
    const updateCameraZoom = () => {
      const w = this.scale.width;
      const h = this.scale.height;
      const minFitZoom = Math.max(w / worldWidth, h / worldHeight);
      let targetZoom = 1.55;
      if (w < 768) {
        targetZoom = 1.35;
      } else if (w < 1100) {
        targetZoom = 1.45;
      }
      this.cameras.main.setZoom(Math.max(targetZoom, minFitZoom * 1.02));
    };

    updateCameraZoom();
    this.scale.on('resize', updateCameraZoom);

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

    // 10. Phase 2 Living Town Dynamics
    this.initFountainAnimations();
    this.initTreeSwaying();
    this.initChimneySmoke();
    this.initFlickeringWindows();
    this.initNpcIdleRoutines();
    this.initTrainSteamCycle();

    // 11. Phase 3 Living Ambient Life & Train Schedule
    this.initAmbientTownLife(worldWidth, worldHeight);
    this.initTrainSchedule();

    // 12. Phase 4 Lighting, Shadows, Ambient Atmosphere & Vignette
    this.initLightingAndAtmosphere(worldWidth, worldHeight);

    // 13. Phase 5 Polish & Sparkle Points
    this.initSparklePoints();

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

    // Phase 4: Dynamic Foot-Anchored Y-Sorting & Drop Shadow Position
    const playerFootY = this.player.body ? this.player.body.bottom : this.player.y;
    this.player.setDepth(playerFootY);
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, playerFootY - 2);
      this.playerShadow.setDepth(playerFootY - 1);
    }
    if (this.lukasNpc && this.lukasNpc.body) {
      this.lukasNpc.setDepth(this.lukasNpc.body.bottom);
    }
    if (this.curatorNpc && this.curatorNpc.body) {
      this.curatorNpc.setDepth(this.curatorNpc.body.bottom);
    }
    if (this.bakerNpc && this.bakerNpc.body) {
      this.bakerNpc.setDepth(this.bakerNpc.body.bottom);
    }
    if (this.librarianNpc && this.librarianNpc.body) {
      this.librarianNpc.setDepth(this.librarianNpc.body.bottom);
    }
    if (this.stationMaster && this.stationMaster.body) {
      this.stationMaster.setDepth(this.stationMaster.body.bottom);
    }

    // Prompts adapt to the active control scheme (touch joystick vs. keyboard).
    const interactHint = store.virtualControlsEnabled ? '[A]' : '[SPACE]';

    // 2. Proximity & Door Overlap Detection
    const pX = this.player.x;
    const pY = this.player.y;

    const distLukas = Phaser.Math.Distance.Between(pX, pY, this.lukasNpc.x, this.lukasNpc.y);
    const distPretzel = Phaser.Math.Distance.Between(pX, pY, 580, 480);
    const distFlower = Phaser.Math.Distance.Between(pX, pY, 828, 480);
    const distFountain = Phaser.Math.Distance.Between(pX, pY, 704, 544);
    const distBakery = Phaser.Math.Distance.Between(pX, pY, 490, 370);
    const distBaker = Phaser.Math.Distance.Between(pX, pY, 430, 370);
    const distLibrary = Phaser.Math.Distance.Between(pX, pY, 938, 400);
    const distLibrarian = Phaser.Math.Distance.Between(pX, pY, 994, 400);
    const distTownHall = Phaser.Math.Distance.Between(pX, pY, 704, 252);
    const distCafe = Phaser.Math.Distance.Between(pX, pY, 920, 720);
    const distBahnhof = Phaser.Math.Distance.Between(pX, pY, 300, 750);
    const distBraun = Phaser.Math.Distance.Between(pX, pY, 475, 920);
    const distTrainDoor1 = Phaser.Math.Distance.Between(pX, pY, 612, 870);
    const distTrainDoor2 = Phaser.Math.Distance.Between(pX, pY, 828, 870);
    const distSchool = Phaser.Math.Distance.Between(pX, pY, 180, 320);
    const distMuseum = Phaser.Math.Distance.Between(pX, pY, 1120, 350);
    const distCurator = Phaser.Math.Distance.Between(pX, pY, 1060, 350);
    const distOpa = this.opaNpc ? Phaser.Math.Distance.Between(pX, pY, this.opaNpc.x, this.opaNpc.y) : 999;
    const distLena = this.lenaNpc ? Phaser.Math.Distance.Between(pX, pY, this.lenaNpc.x, this.lenaNpc.y) : 999;
    const distKid = this.kidMaxNpc ? Phaser.Math.Distance.Between(pX, pY, this.kidMaxNpc.x, this.kidMaxNpc.y) : 999;
    const distBello = this.dackelBello ? Phaser.Math.Distance.Between(pX, pY, this.dackelBello.x, this.dackelBello.y) : 999;
    const distMimi = this.catMimi ? Phaser.Math.Distance.Between(pX, pY, this.catMimi.x, this.catMimi.y) : 999;

    const isAtSchool = Boolean(
      this.schoolDoorTrigger && this.physics.overlap(this.player, this.schoolDoorTrigger)
    );
    const isAtMuseum = Boolean(
      this.museumDoorTrigger && this.physics.overlap(this.player, this.museumDoorTrigger)
    );

    // Update zone label in HUD
    let zone = 'Marktplatz';
    if (isAtSchool || distSchool <= 120) zone = 'Sprachschule';
    else if (isAtMuseum || distMuseum <= 120 || distCurator <= 100) zone = 'Geschichtsmuseum';
    else if (distBahnhof <= 250 || distBraun <= 250 || pY >= 820) zone = 'Bahnhof';
    else if (distCafe <= 210) zone = 'Café Gemütlichkeit';
    else if (distBakery <= 200 || distBaker <= 100) zone = 'Bäckerei';
    else if (distLibrary <= 200 || distLibrarian <= 100) zone = 'Bibliothek';
    else if (distTownHall <= 200) zone = 'Rathaus';
    if (store.currentZone !== zone) store.setCurrentZone(zone);

    // Phase 5: Check readable town signposts
    let nearbySignpost: (typeof this.townSignposts)[0] | null = null;
    for (const sp of this.townSignposts) {
      if (Phaser.Math.Distance.Between(pX, pY, sp.x, sp.y) <= 46) {
        nearbySignpost = sp;
        break;
      }
    }
    this.activeNearbySignpost = nearbySignpost;

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
      | 'pretzel'
      | 'flower'
      | 'fountain'
      | 'baker'
      | 'librarian'
      | 'curator'
      | 'opa'
      | 'lena'
      | 'kid'
      | 'bello'
      | 'mimi'
      | 'signpost'
      | null = null;
    let activePrompt: string | null = null;

    if (isAtSchool || distSchool <= 60) {
      currentTarget = 'school';
      activePrompt = `${interactHint} Sprachschule betreten`;
    } else if (isAtMuseum || distMuseum <= 60) {
      currentTarget = 'museum';
      activePrompt = `${interactHint} Geschichtsmuseum betreten`;
    } else if (distCurator <= 50) {
      currentTarget = 'curator';
      activePrompt = `${interactHint} Mit Frau Weber sprechen (Museum)`;
    } else if (distLukas <= 68) {
      currentTarget = 'lukas';
      activePrompt = `${interactHint} Mit Lukas sprechen (Tutor)`;
    } else if (distBaker <= 50) {
      currentTarget = 'baker';
      activePrompt = `${interactHint} Mit Bäcker Schmidt sprechen`;
    } else if (distBakery <= 55) {
      currentTarget = 'bakery';
      activePrompt = `${interactHint} Bäckerei betreten (Wort-Blitz)`;
    } else if (distLibrarian <= 50) {
      currentTarget = 'librarian';
      activePrompt = `${interactHint} Mit Frau Müller sprechen`;
    } else if (distLibrary <= 55) {
      currentTarget = 'library';
      activePrompt = `${interactHint} Bibliothek betreten (Satz-Bauer)`;
    } else if (distTownHall <= 60) {
      currentTarget = 'townhall';
      activePrompt = `${interactHint} Rathaus betreten (Bürger-Quiz)`;
    } else if (distCafe <= 55) {
      currentTarget = 'cafe';
      activePrompt = `${interactHint} Café betreten (Speisekarten-Match)`;
    } else if (distPretzel <= 50) {
      currentTarget = 'pretzel';
      activePrompt = `${interactHint} Brezelstand (Frische Laugenbrezel)`;
    } else if (distFlower <= 50) {
      currentTarget = 'flower';
      activePrompt = `${interactHint} Blumenstand (Blumen bewundern)`;
    } else if (distFountain <= 52) {
      currentTarget = 'fountain';
      activePrompt = `${interactHint} Marktbrunnen (Glücksmünze werfen)`;
    } else if (distBraun <= 55) {
      currentTarget = 'braun';
      activePrompt = `${interactHint} Mit Herrn Braun sprechen (Zugchef)`;
    } else if (distTrainDoor1 <= 48 || distTrainDoor2 <= 48) {
      currentTarget = 'bahnhof';
      activePrompt = `${interactHint} In den ICE einsteigen (Fahrkarten)`;
    } else if (distBahnhof <= 65) {
      currentTarget = 'bahnhof';
      activePrompt = `${interactHint} Fahrkarten-Schalter öffnen`;
    } else if (distOpa <= 50) {
      currentTarget = 'opa';
      activePrompt = `${interactHint} Mit Opa Heinrich sprechen`;
    } else if (distLena <= 50) {
      currentTarget = 'lena';
      activePrompt = `${interactHint} Mit Studentin Lena sprechen`;
    } else if (distKid <= 50) {
      currentTarget = 'kid';
      activePrompt = `${interactHint} Mit Max sprechen`;
    } else if (distBello <= 46) {
      currentTarget = 'bello';
      activePrompt = `${interactHint} Dackel Bello streicheln`;
    } else if (distMimi <= 46) {
      currentTarget = 'mimi';
      activePrompt = `${interactHint} Katze Mimi kraulen`;
    } else if (nearbySignpost) {
      currentTarget = 'signpost';
      activePrompt = `${interactHint} Wegweiser lesen (${nearbySignpost.title})`;
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
      } else if (currentTarget === 'museum' || currentTarget === 'curator') {
        store.setOverlay('museum_interior');
        if (this.curatorBadge) {
          this.tweens.add({
            targets: this.curatorBadge,
            alpha: 0,
            scale: 0.5,
            duration: 300,
            onComplete: () => {
              this.curatorBadge?.destroy();
              this.curatorBadge = undefined;
            },
          });
        }
      } else if (currentTarget === 'lukas') {
        store.openDialogue((dialogueTree as any).lukas_intro);
        if (this.exclamationBadge) {
          this.tweens.add({
            targets: this.exclamationBadge,
            alpha: 0,
            scale: 0.5,
            duration: 300,
            onComplete: () => {
              this.exclamationBadge?.destroy();
              this.exclamationBadge = undefined;
            },
          });
        }
        if (!this.hasSpokenFirstTime) {
          this.hasSpokenFirstTime = true;
          store.updateQuestProgress('welcome_quest', 1);
          store.addXP(25);
          store.addCoins(10);
        }
      } else if (currentTarget === 'bakery' || currentTarget === 'baker') {
        store.setOverlay('minigame');
      } else if (currentTarget === 'library' || currentTarget === 'librarian') {
        store.setOverlay('satzbauer');
      } else if (currentTarget === 'townhall') {
        store.setOverlay('buergerquiz');
      } else if (currentTarget === 'cafe') {
        store.setOverlay('kaffee');
      } else if (currentTarget === 'braun') {
        store.openDialogue((dialogueTree as any).braun_intro);
        if (this.braunBadge) {
          this.tweens.add({
            targets: this.braunBadge,
            alpha: 0,
            scale: 0.5,
            duration: 300,
            onComplete: () => {
              this.braunBadge?.destroy();
              this.braunBadge = undefined;
            },
          });
        }
        if (!this.hasSpokenToBraun) {
          this.hasSpokenToBraun = true;
          store.addXP(10);
        }
      } else if (currentTarget === 'bahnhof') {
        store.setOverlay('bahnhof');
      } else if (currentTarget === 'pretzel') {
        store.openDialogue({
          id: 'pretzel_stall',
          speaker: 'Bäcker Hans',
          german: 'Guten Tag! Eine ofenfrische Laugenbrezel mit Salz für dich! (+10 XP)',
          english: 'Good day! An oven-fresh pretzel with salt for you! (+10 XP)',
          xpReward: 10,
          options: [{ text: 'Vielen Dank! Sehr lecker!', nextId: null }],
        } as any);
        store.addXP(10);
        store.addCoins(2);
      } else if (currentTarget === 'flower') {
        store.openDialogue({
          id: 'flower_stall',
          speaker: 'Blumenstand Sophie',
          german: 'Willkommen! Schau dir die frischen Alpenveilchen und Kirschblüten an! (+5 XP)',
          english: 'Welcome! Look at the fresh alpine cyclamens and cherry blossoms! (+5 XP)',
          xpReward: 5,
          options: [{ text: 'Wunderschön! Vielen Dank!', nextId: null }],
        } as any);
        store.addXP(5);
      } else if (currentTarget === 'fountain') {
        soundFx.playSparkle();
        store.openDialogue({
          id: 'fountain_wish',
          speaker: 'Marktbrunnen',
          german: 'Du wirfst eine Münze in den Brunnen und wünschst dir viel Erfolg beim Deutschlernen! (+5 XP)',
          english: 'You toss a coin into the fountain and wish for great success learning German! (+5 XP)',
          xpReward: 5,
          options: [{ text: 'Auf geht\'s!', nextId: null }],
        } as any);
        store.addXP(5);
      } else if (currentTarget === 'opa') {
        store.openDialogue({
          id: 'opa_dialogue',
          speaker: 'Opa Heinrich',
          german: 'Guten Tag, junger Reisender! Deutschstadt ist im Frühling besonders schön. Genieße deinen Spaziergang!',
          english: 'Good day, young traveler! Deutschstadt is especially beautiful in spring. Enjoy your walk!',
          xpReward: 5,
          options: [{ text: 'Guten Tag, Opa Heinrich!', nextId: null }],
        } as any);
        store.addXP(5);
      } else if (currentTarget === 'lena') {
        store.openDialogue({
          id: 'lena_dialogue',
          speaker: 'Lena (Studentin)',
          german: 'Hallo! Ich lerne gerade fleißig Verben für die Prüfung an der Sprachschule. Deutsch lernen lohnt sich!',
          english: 'Hello! I am diligently studying verbs for the exam at the language school right now. Learning German is worth it!',
          xpReward: 5,
          options: [{ text: 'Viel Erfolg beim Lernen!', nextId: null }],
        } as any);
        store.addXP(5);
      } else if (currentTarget === 'kid') {
        store.openDialogue({
          id: 'kind_dialogue',
          speaker: 'Max',
          german: 'Schau mal, wie hoch mein Ball fliegt! Hopp! Spielst du auch gerne auf dem Marktplatz?',
          english: 'Look how high my ball flies! Hop! Do you also like playing on the marketplace?',
          xpReward: 5,
          options: [{ text: 'Toller Ball, Max!', nextId: null }],
        } as any);
        store.addXP(5);
      } else if (currentTarget === 'bello') {
        soundFx.playDogBark();
        if (this.dackelBello) {
          this.showNpcEmote(this.dackelBello, 'Wuff! 🐾');
          this.tweens.add({
            targets: this.dackelBello,
            y: this.dackelBello.y - 4,
            duration: 150,
            yoyo: true,
            repeat: 2,
          });
        }
      } else if (currentTarget === 'mimi') {
        soundFx.playCatMeow();
        if (this.catMimi) {
          this.showNpcEmote(this.catMimi, 'Miau~ 😺');
          this.catMimi.play('cat_awake_anim');
        }
      } else if (currentTarget === 'signpost' && this.activeNearbySignpost) {
        soundFx.playClick();
        store.openDialogue({
          id: 'signpost_dialogue',
          speaker: this.activeNearbySignpost.title,
          german: this.activeNearbySignpost.german,
          english: this.activeNearbySignpost.english,
          xpReward: 5,
          options: [{ text: 'Verstanden! (Understood)', nextId: null }],
        } as any);
        store.addXP(5);
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

    // Determine facing direction (down, up, side)
    let facing: 'down' | 'up' | 'side' = this.currentFacingDirection;
    if (Math.abs(vx) > Math.abs(vy)) {
      facing = 'side';
      this.player.setFlipX(vx < 0);
    } else if (vy > 0.05) {
      facing = 'down';
      this.player.setFlipX(false);
    } else if (vy < -0.05) {
      facing = 'up';
      this.player.setFlipX(false);
    }
    this.currentFacingDirection = facing;

    // 4-Direction Walk & Idle animations + footstep dust puffs
    if (magnitude > 0.05) {
      const walkKey = `player_walk_${facing}`;
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== walkKey) {
        this.player.play(walkKey);
      }
      // Spawn footstep dust puff every 220ms & play surface footstep audio
      if (this.time.now - this.lastStepTime > 220) {
        this.lastStepTime = this.time.now;
        this.spawnFootstepDust(this.player.x, this.player.y + 18);
        const tileX = Math.floor(this.player.x / 32);
        const tileY = Math.floor((this.player.body ? this.player.body.bottom : this.player.y) / 32);
        if (this.isPathTile(tileX, tileY)) {
          soundFx.playFootstepStone();
        } else {
          soundFx.playFootstepGrass();
        }
      }
    } else {
      const idleKey = `player_idle_${facing}`;
      if (this.player.anims.currentAnim?.key !== idleKey) {
        this.player.play(idleKey);
      }
    }

    // 5. Update Phase 3 Living Ambient Entities & Animals
    this.updateAmbientTownLife();

    // 6. Update Phase 5 Polish & Reactive Bush Rustling
    this.updatePolishDetails();
  }

  /**
   * Create an animated waving German Flag (Schwarz-Rot-Gold) on a silver flagpole
   */
  private createWavingFlag(x: number, y: number): Phaser.GameObjects.Sprite {
    this.add.image(x, y + 20, 'flagpole_stand').setOrigin(0.5, 1).setDepth(y + 20);

    const flag = this.add.sprite(x + 2, y - 22, 'german_flag_0');
    flag.setOrigin(0, 0.5);
    flag.setDepth(y + 22);
    if (this.anims.exists('wave_german_flag')) {
      flag.play('wave_german_flag');
    }
    this.flags.push(flag);
    return flag;
  }

  /**
   * Paved stone foundation terrace, carved curbs, and flower planters
   * under each building to completely eliminate the "uplifted" look!
   */
  private createBuildingCourtyard(
    x: number,
    baseY: number,
    width: number,
    height: number,
    decorType?: 'baking' | 'library' | 'museum' | 'cafe' | 'rathaus' | 'school' | 'bahnhof'
  ) {
    const padW = width + 48;
    const padH = Math.max(54, height * 0.42);

    // Stone Terrace Foundation Apron
    const pad = this.add.graphics();
    // Soft ambient occlusion drop shadow onto grass
    pad.fillStyle(0x000000, 0.26);
    pad.fillRoundedRect(x - padW / 2 - 2, baseY - padH * 0.5 + 4, padW + 4, padH + 8, 8);
    // Dark granite curb border
    pad.fillStyle(0x475569, 1);
    pad.fillRoundedRect(x - padW / 2, baseY - padH * 0.5, padW, padH, 6);
    // Paved stone slabs
    pad.fillStyle(0x94a3b8, 1);
    pad.fillRoundedRect(x - padW / 2 + 2, baseY - padH * 0.5 + 2, padW - 4, padH - 4, 4);

    // Grout lines
    pad.lineStyle(1, 0x64748b, 0.7);
    for (let px = x - padW / 2 + 16; px < x + padW / 2 - 8; px += 20) {
      pad.lineBetween(px, baseY - padH * 0.5 + 2, px, baseY + padH * 0.5 - 2);
    }
    pad.lineBetween(x - padW / 2 + 2, baseY - 6, x + padW / 2 - 2, baseY - 6);
    pad.setDepth(1);

    // Flanking German Geranium Planter Boxes
    this.add.image(x - padW / 2 + 14, baseY + 6, 'planter_box').setDepth(baseY + 6);
    this.add.image(x + padW / 2 - 14, baseY + 6, 'planter_box').setDepth(baseY + 6);

    // German Flags on key institutions
    if (decorType === 'rathaus') {
      this.createWavingFlag(x - padW / 2 + 16, baseY - 14);
      this.createWavingFlag(x + padW / 2 - 16, baseY - 14);
    } else if (decorType === 'bahnhof') {
      this.createWavingFlag(x - padW / 2 + 14, baseY - 10);
    }
  }

  /**
   * Helper to spawn environmental town props with low collision boxes for natural depth & soft drop shadows
   */
  private addTownProp(
    x: number,
    y: number,
    key: string,
    width: number,
    height: number,
    isCollidable = true
  ): Phaser.Physics.Arcade.Image {
    // Soft drop shadow at prop base
    const shadowKey = width >= 40 ? 'shadow_wide' : width >= 26 ? 'shadow_large' : 'shadow_medium';
    const shadow = this.add.image(x, y - 2, shadowKey);
    shadow.setOrigin(0.5, 0.5);
    shadow.setDepth(y - 1);

    const prop = this.physics.add.staticImage(x, y, key);
    prop.setOrigin(0.5, 1);
    prop.setDepth(y);
    if (isCollidable) {
      const body = prop.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(width * 0.85, Math.max(10, height * 0.35));
      body.setOffset(width * 0.075, height * 0.65);
      this.townProps.push(prop);
    }
    // Phase 5: Register hedges and bushes for reactive player rustling
    if (key === 'hedge_box' || key === 'bush_wild') {
      this.interactiveBushes.push({ prop, lastRustle: 0 });
    }
    return prop;
  }

  /**
   * Helper to spawn natural trees (oak, birch) with low trunk colliders & ambient trunk ground shadows
   */
  private addNatureTree(
    x: number,
    y: number,
    key: string,
    width: number,
    height: number
  ): Phaser.Physics.Arcade.Image {
    // Large ground occlusion shadow under trunk
    const shadow = this.add.image(x, y - 4, 'shadow_large');
    shadow.setOrigin(0.5, 0.5);
    shadow.setDepth(y + 8);

    const tree = this.physics.add.staticImage(x, y, key);
    tree.setOrigin(0.5, 0.95);
    tree.setDepth(y + 10);
    const body = tree.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(18, 14);
    body.setOffset(width / 2 - 9, height - 16);
    this.natureTrees.push(tree);
    return tree;
  }

  /**
   * Helper to spawn rustic wooden fences
   */
  private addFence(x: number, y: number, isVertical = false): Phaser.Physics.Arcade.Image {
    const key = isVertical ? 'fence_wood_v' : 'fence_wood_h';
    const fence = this.physics.add.staticImage(x, y, key);
    fence.setOrigin(0.5, 1);
    fence.setDepth(y);
    const body = fence.body as Phaser.Physics.Arcade.StaticBody;
    if (isVertical) {
      body.setSize(12, 28);
      body.setOffset(2, 4);
    } else {
      body.setSize(30, 14);
      body.setOffset(1, 10);
    }
    this.fences.push(fence);
    return fence;
  }

  /**
   * Place a building so its artwork rests on baseY, with an authentic stone
   * courtyard foundation and collision body covering only the ground-level footprint.
   */
  private placeBuilding(
    x: number,
    baseY: number,
    artworkKey: string,
    fallbackKey: string,
    decorType?: 'baking' | 'library' | 'museum' | 'cafe' | 'rathaus' | 'school' | 'bahnhof'
  ): Phaser.Physics.Arcade.Image {
    const key = this.textures.exists(artworkKey) ? artworkKey : fallbackKey;
    const source = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const width = source.width;
    const height = source.height;

    // Ground the building with its paved stone courtyard terrace first
    this.createBuildingCourtyard(x, baseY, width, height, decorType);

    const building = this.physics.add.staticImage(x, baseY - height / 2, key);
    const body = building.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(width * 0.9, height * 0.24);
    body.setOffset(width * 0.05, height * 0.74);
    building.setDepth(baseY);

    return building;
  }

  /**
   * Authentic Nintendo/Pokemon 2D High-Speed Railway Station (ICE Deutschstadt)
   * Featuring multi-track layout, modern bullet train with open passenger doors,
   * yellow tactile safety lines, post clock, waiting benches, recycling bin,
   * glowing digital departure screens, smiling balloons and commuter NPCs.
   */
  private createBahnhofArea() {
    const tileSize = 32;

    // 1. Background Upper Platform (Gleis 2): rows 23..24 (y: 736..800), tiles x: 12..36
    for (let x = 12; x <= 36; x++) {
      const posX = x * tileSize + tileSize / 2;
      this.add.image(posX, 23 * tileSize + tileSize / 2, 'platform_tile').setDepth(736);
      this.add.image(posX, 24 * tileSize + tileSize / 2, 'platform_overhang_tile').setDepth(768);
    }

    // Platform 2 overhead sign
    this.add
      .text(780, 750, 'GLEIS 2 · RE 7 NACH HAMBURG HBF', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#facc15',
        backgroundColor: '#0f172a',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(769);

    // 2. Track 1 (Gleis 1): Ballast & Steel Rails across the whole world (rows 25..26, y: 800..864)
    for (let x = 0; x < 44; x++) {
      const posX = x * tileSize + tileSize / 2;
      this.add.image(posX, 25 * tileSize + tileSize / 2, 'ballast_tile').setDepth(1);
      this.add.image(posX, 26 * tileSize + tileSize / 2, 'ballast_tile').setDepth(1);
      this.add.image(posX, 25 * tileSize + tileSize / 2, 'rail_tile').setDepth(5);
      this.add.image(posX, 26 * tileSize + tileSize / 2, 'rail_tile').setDepth(5);
    }

    // 3. Modern High-Speed Bullet Train (ICE 104) parked on Track 1
    // Anchored at bottom (0.5, 1) right at y = 858 so doors align with Platform 1
    this.train = this.physics.add.image(740, 858, 'bullet_train_modern');
    this.train.setOrigin(0.5, 1);
    this.train.setImmovable(true);
    this.train.setDepth(858);
    const trainBody = this.train.body as Phaser.Physics.Arcade.Body;
    trainBody.setSize(436, 44);
    trainBody.setOffset(2, 8);

    // Train Overhead Departure Banner
    this.trainDepartureBanner = this.add
      .text(740, 782, 'GLEIS 1 · ICE 104 NACH BERLIN HBF', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#38bdf8',
        backgroundColor: '#0f172a',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(860);

    // 4. Station Concourse & Platform 1 Connection
    // Paved Concourse Plaza connecting Hauptbahnhof exit (x: 240..340, y: 750) down to Platform 1
    for (let cx = 7; cx <= 11; cx++) {
      for (let cy = 23; cy <= 26; cy++) {
        const cPosX = cx * tileSize + tileSize / 2;
        const cPosY = cy * tileSize + tileSize / 2;
        this.add.image(cPosX, cPosY, 'platform_tile').setDepth(cPosY);
      }
    }

    // Granite steps with yellow safety alert edge leading from Hauptbahnhof down to Platform 1
    const concourseSteps = this.add.graphics();
    concourseSteps.fillStyle(0x334155, 1);
    concourseSteps.fillRect(256, 846, 120, 22);
    concourseSteps.fillStyle(0x64748b, 1);
    concourseSteps.fillRect(258, 848, 116, 18);
    concourseSteps.fillStyle(0xfacc15, 1); // Yellow safety edge
    concourseSteps.fillRect(258, 864, 116, 2);
    concourseSteps.setDepth(860);

    // Concourse direction signage
    this.add
      .text(310, 810, 'ZU DEN GLEISEN 1 & 2', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#facc15',
        backgroundColor: '#0f172a',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(812);

    // 5. Main Platform 1 (Gleis 1): rows 27..29 (y: 864..960), tiles x: 9..37
    // Flowing continuously from the station concourse (x = 9) all the way across
    for (let x = 9; x <= 37; x++) {
      const posX = x * tileSize + tileSize / 2;
      this.add.image(posX, 27 * tileSize + tileSize / 2, 'platform_yellow_tile').setDepth(865);
      this.add.image(posX, 28 * tileSize + tileSize / 2, 'platform_tile').setDepth(896);
      this.add.image(posX, 29 * tileSize + tileSize / 2, 'platform_overhang_tile').setDepth(928);
    }

    // Outside Platform 1: Continuous Railway Ballast Bed & Service Embankment (rows 27..29, x < 9 and x > 37)
    for (let x = 0; x < 44; x++) {
      if (x < 9 || x > 37) {
        for (let ry = 27; ry <= 29; ry++) {
          const posX = x * tileSize + tileSize / 2;
          const posY = ry * tileSize + tileSize / 2;
          this.add.image(posX, posY, 'ballast_tile').setDepth(1);
        }
      }
    }

    // Concrete Cable Conduits & Catenary Masts
    this.add.image(180, 864, 'catenary_pole').setOrigin(0.5, 1).setDepth(864);
    this.add.image(1240, 864, 'catenary_pole').setOrigin(0.5, 1).setDepth(864);
    this.add.image(180, 1024, 'catenary_pole').setOrigin(0.5, 1).setDepth(1024);
    this.add.image(1240, 1024, 'catenary_pole').setOrigin(0.5, 1).setDepth(1024);

    // 6. Authentic Nintendo / Pokemon Platform Furniture & NPCs
    this.stationProps = [];

    // DB Ticket Validator Machine on Platform
    const validator = this.physics.add.staticImage(340, 920, 'ticket_validator');
    validator.setOrigin(0.5, 1);
    validator.setDepth(920);
    this.stationProps.push(validator);

    // Analog station clock on tall iron pole
    const clock = this.physics.add.staticImage(420, 920, 'station_clock_post');
    clock.setOrigin(0.5, 1);
    clock.setSize(14, 16);
    clock.setOffset(5, 38);
    clock.setDepth(920);
    this.stationProps.push(clock);

    // Station Master Herr Braun (Zugchef)
    const masterX = 475;
    const masterY = 920;
    this.add.image(masterX, masterY - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(masterY - 1);
    this.stationMaster = this.physics.add.sprite(masterX, masterY, 'station_master');
    this.stationMaster.setOrigin(0.5, 1);
    this.stationMaster.setImmovable(true);
    this.stationMaster.setScale(1.15);
    this.stationMaster.setSize(22, 28);
    this.stationMaster.setDepth(masterY);

    this.add
      .text(masterX, masterY - 34, 'Herr Braun', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#0f172a',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(masterY + 1);

    // Phase 5: Animated Quest Exclamation Badge for Herr Braun
    const braunIcon = this.add
      .text(0, 0, '!', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.braunBadge = this.add.container(masterX, masterY - 48, [braunIcon]);
    this.braunBadge.setDepth(masterY + 2);
    this.tweens.add({
      targets: this.braunBadge,
      y: masterY - 54,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Commuter Girl & Commuter Boy with Smiling Yellow Balloons
    this.add.image(540, 920 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(919);
    const girl = this.physics.add.sprite(540, 920, 'commuter_girl');
    girl.setOrigin(0.5, 1);
    girl.setImmovable(true);
    girl.setScale(1.12);
    girl.setSize(18, 26);
    girl.setDepth(920);
    this.stationProps.push(girl as any);

    this.add.image(564, 920 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(919);
    const boy = this.physics.add.sprite(564, 920, 'commuter_boy');
    boy.setOrigin(0.5, 1);
    boy.setImmovable(true);
    boy.setScale(1.12);
    boy.setFlipX(true); // Facing the girl!
    boy.setSize(18, 26);
    boy.setDepth(920);
    this.stationProps.push(boy as any);

    // Floating Yellow Smiley Balloons with gentle bobbing tween
    const balloons = this.add.image(552, 878, 'smiley_balloons');
    balloons.setOrigin(0.5, 1);
    balloons.setDepth(930);
    this.tweens.add({
      targets: balloons,
      y: 868,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Two Wooden Waiting Benches
    const bench1 = this.physics.add.staticImage(690, 914, 'station_wood_bench');
    bench1.setOrigin(0.5, 1);
    bench1.setSize(44, 14);
    bench1.setOffset(2, 14);
    bench1.setDepth(914);
    this.stationProps.push(bench1);

    const bench2 = this.physics.add.staticImage(745, 914, 'station_wood_bench');
    bench2.setOrigin(0.5, 1);
    bench2.setSize(44, 14);
    bench2.setOffset(2, 14);
    bench2.setDepth(914);
    this.stationProps.push(bench2);

    // Station Recycling Trash Bin
    const bin = this.physics.add.staticImage(790, 914, 'station_trash_bin');
    bin.setOrigin(0.5, 1);
    bin.setSize(16, 16);
    bin.setOffset(1, 10);
    bin.setDepth(914);
    this.stationProps.push(bin);

    // High-Tech Digital Departure Screen
    const disp = this.physics.add.staticImage(880, 908, 'departure_screen_large');
    disp.setOrigin(0.5, 1);
    disp.setSize(62, 22);
    disp.setOffset(3, 26);
    disp.setDepth(908);
    this.stationProps.push(disp);

    // Passenger waiting near departure screen
    const traveler = this.physics.add.sprite(930, 920, 'station_traveler');
    traveler.setOrigin(0.5, 1);
    traveler.setImmovable(true);
    traveler.setSize(20, 26);
    traveler.setDepth(920);
    this.stationProps.push(traveler as any);

    // 7. Foreground Track 2: Ballast & Steel Rails across the whole world (rows 30..31, y: 960..1024)
    for (let x = 0; x < 44; x++) {
      const posX = x * tileSize + tileSize / 2;
      this.add.image(posX, 30 * tileSize + tileSize / 2, 'ballast_tile').setDepth(1);
      this.add.image(posX, 31 * tileSize + tileSize / 2, 'ballast_tile').setDepth(1);
      this.add.image(posX, 30 * tileSize + tileSize / 2, 'rail_tile').setDepth(5);
      this.add.image(posX, 31 * tileSize + tileSize / 2, 'rail_tile').setDepth(5);
    }

    // 8. Authentic Dual Mountain Railway Portals on BOTH West and East
    this.tunnels = [];

    // WEST MOUNTAIN RAILWAY CUTTING (x: 0..72, y: 740..1056)
    // Mountain Granite Rock Face
    const westCliff = this.add.image(36, 898, 'railway_cliff_wall');
    westCliff.setOrigin(0.5, 0.5);
    westCliff.setDepth(1040);

    // West Track 1 Portal (Upper - rows 25..26)
    const westTun1 = this.add.image(36, 832, 'railway_tunnel_portal');
    westTun1.setOrigin(0.5, 0.5);
    westTun1.setDepth(1045);
    this.tunnels.push(westTun1);

    // Black tunnel void interior covering rails
    this.add.rectangle(18, 832, 38, 56, 0x020617).setDepth(1042);

    // West Track 2 Portal (Lower - rows 30..31)
    const westTun2 = this.add.image(36, 992, 'railway_tunnel_portal');
    westTun2.setOrigin(0.5, 0.5);
    westTun2.setDepth(1045);
    this.tunnels.push(westTun2);

    this.add.rectangle(18, 992, 38, 56, 0x020617).setDepth(1042);

    // EAST MOUNTAIN RAILWAY CUTTING (x: 1336..1408, y: 740..1056)
    // Mountain Granite Rock Face
    const eastCliff = this.add.image(1372, 898, 'railway_cliff_wall');
    eastCliff.setOrigin(0.5, 0.5);
    eastCliff.setFlipX(true);
    eastCliff.setDepth(1040);

    // East Track 1 Portal (Upper - rows 25..26)
    const eastTun1 = this.add.image(1372, 832, 'railway_tunnel_portal');
    eastTun1.setOrigin(0.5, 0.5);
    eastTun1.setFlipX(true);
    eastTun1.setDepth(1045);
    this.tunnels.push(eastTun1);

    this.add.rectangle(1390, 832, 38, 56, 0x020617).setDepth(1042);

    // East Track 2 Portal (Lower - rows 30..31)
    const eastTun2 = this.add.image(1372, 992, 'railway_tunnel_portal');
    eastTun2.setOrigin(0.5, 0.5);
    eastTun2.setFlipX(true);
    eastTun2.setDepth(1045);
    this.tunnels.push(eastTun2);

    this.add.rectangle(1390, 992, 38, 56, 0x020617).setDepth(1042);

    // Schwarzwald Evergreen Pine Trees framing the mountain tunnels
    const tunnelPines = [
      { x: 22, y: 750 },
      { x: 58, y: 740 },
      { x: 22, y: 1050 },
      { x: 58, y: 1040 },
      { x: 1350, y: 740 },
      { x: 1386, y: 750 },
      { x: 1350, y: 1040 },
      { x: 1386, y: 1050 },
    ];
    tunnelPines.forEach((tp) => {
      const pine = this.physics.add.staticImage(tp.x, tp.y, 'pine_tree');
      pine.setOrigin(0.5, 0.95);
      pine.setDepth(tp.y + 10);
      const pineBody = pine.body as Phaser.Physics.Arcade.StaticBody;
      pineBody.setSize(18, 14);
      pineBody.setOffset(13, 50);
      this.pineTrees.push(pine);
    });
  }

  /**
   * Spawn a gentle footstep dust puff behind the walking hero
   */
  private spawnFootstepDust(x: number, y: number) {
    const dust = this.add.image(x, y, 'dust_puff_0');
    dust.setOrigin(0.5, 0.5);
    dust.setDepth(y - 1);
    dust.setScale(0.8);
    dust.setAlpha(0.65);

    this.tweens.add({
      targets: dust,
      scaleX: 1.4,
      scaleY: 1.2,
      alpha: 0,
      y: y - 6,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => {
        dust.destroy();
      },
    });
  }

  /**
   * Animated water surface ripples and leaping water droplets at Marktplatz fountain
   */
  private initFountainAnimations() {
    if (!this.fountain) return;
    const fx = this.fountain.x;
    const fy = this.fountain.y;

    this.fountainRipples = this.add.sprite(fx, fy + 4, 'fountain_spray_0');
    this.fountainRipples.setOrigin(0.5, 0.5);
    this.fountainRipples.setDepth(fy + 1);
    if (this.anims.exists('fountain_water_anim')) {
      this.fountainRipples.play('fountain_water_anim');
    }

    // Expanding concentric ripple pulse
    this.tweens.add({
      targets: this.fountainRipples,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Splashing water mist droplets
    this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const drop = this.add.graphics();
        drop.fillStyle(0xe0f2fe, 0.9);
        drop.fillCircle(0, 0, Phaser.Math.Between(1, 2));
        const dx = fx + Phaser.Math.Between(-14, 14);
        const dy = fy + Phaser.Math.Between(-10, 10);
        drop.setPosition(dx, dy);
        drop.setDepth(fy + 2);

        this.tweens.add({
          targets: drop,
          y: dy - Phaser.Math.Between(10, 20),
          alpha: 0,
          duration: Phaser.Math.Between(600, 900),
          ease: 'Sine.easeOut',
          onComplete: () => drop.destroy(),
        });
      },
    });
  }

  /**
   * Gentle wind breeze causing canopies of all trees to sway harmoniously
   */
  private initTreeSwaying() {
    const allTrees = [...this.cherryTrees, ...this.pineTrees, ...this.natureTrees];
    allTrees.forEach((tree) => {
      this.tweens.add({
        targets: tree,
        angle: { from: -1.3, to: 1.3 },
        duration: Phaser.Math.Between(2600, 3600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    });
  }

  /**
   * Puffy white-gray smoke clouds billowing from Bäckerei and Café chimneys
   */
  private initChimneySmoke() {
    const chimneys = [
      { x: 508, y: 270, depth: 330 }, // Bäckerei oven chimney
      { x: 938, y: 640, depth: 730 }, // Café Gemütlichkeit espresso roaster chimney
    ];

    chimneys.forEach((chim) => {
      const timer = this.time.addEvent({
        delay: 1100,
        loop: true,
        callback: () => {
          const smoke = this.add.sprite(chim.x, chim.y, 'chimney_smoke_0');
          smoke.setOrigin(0.5, 0.5);
          smoke.setDepth(chim.depth);
          smoke.setScale(0.5);
          smoke.setAlpha(0.85);

          if (this.anims.exists('chimney_smoke_anim')) {
            smoke.play('chimney_smoke_anim');
          }

          // Drifts upward and east with the prevailing wind
          this.tweens.add({
            targets: smoke,
            x: chim.x + Phaser.Math.Between(16, 32),
            y: chim.y - Phaser.Math.Between(32, 54),
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 2600,
            ease: 'Quad.easeOut',
            onComplete: () => smoke.destroy(),
          });
        },
      });
      this.chimneyTimers.push(timer);
    });
  }

  /**
   * Cozy flickering warm interior window lights at dusk/golden hour
   */
  private initFlickeringWindows() {
    const windowPositions = [
      { x: 476, y: 346, depth: 371 }, // Bäckerei left window
      { x: 514, y: 346, depth: 371 }, // Bäckerei right window
      { x: 902, y: 704, depth: 721 }, // Café left window
      { x: 946, y: 704, depth: 721 }, // Café right window
      { x: 680, y: 206, depth: 253 }, // Rathaus arched window left
      { x: 728, y: 206, depth: 253 }, // Rathaus arched window right
    ];

    windowPositions.forEach((wp, index) => {
      const glow = this.add.image(wp.x, wp.y, 'window_glow_warm');
      glow.setOrigin(0.5, 0.5);
      glow.setDepth(wp.depth);
      glow.setAlpha(0.7);
      this.windowLights.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.6, to: 0.95 },
        duration: 1800 + (index % 3) * 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: index * 250,
      });
    });
  }

  /**
   * Living NPC idle routines: Lukas friendly wave/nod & Herr Braun watch checks
   */
  private initNpcIdleRoutines() {
    // Lukas Friendly Hand Wave & Nod every 7.5 seconds
    this.time.addEvent({
      delay: 7500,
      loop: true,
      callback: () => {
        if (!this.lukasNpc) return;
        this.tweens.add({
          targets: this.lukasNpc,
          scaleX: 1.05,
          angle: { from: -2, to: 2 },
          duration: 250,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.lukasNpc.setScale(1, 1);
            this.lukasNpc.setAngle(0);
          },
        });
      },
    });

    // Zugchef Herr Braun adjusts peaked cap & checks watch
    this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => {
        if (!this.stationMaster) return;
        this.tweens.add({
          targets: this.stationMaster,
          y: this.stationMaster.y - 2,
          duration: 300,
          yoyo: true,
          repeat: 1,
          ease: 'Quad.easeInOut',
        });
      },
    });
  }

  /**
   * Periodic locomotive steam clouds venting from the ICE train bogies
   */
  private initTrainSteamCycle() {
    this.trainSteamTimer = this.time.addEvent({
      delay: 5500,
      loop: true,
      callback: () => {
        if (!this.train || this.trainMoving) return;
        const bogieOffsets = [-150, -50, 60, 160];
        bogieOffsets.forEach((ox) => {
          const steam = this.add.image(this.train.x + ox, 856, 'train_steam_cloud');
          steam.setOrigin(0.5, 1);
          steam.setDepth(859);
          steam.setScale(0.5);
          steam.setAlpha(0.8);

          this.tweens.add({
            targets: steam,
            x: steam.x + Phaser.Math.Between(-10, 10),
            y: steam.y - Phaser.Math.Between(15, 25),
            scaleX: 1.4,
            scaleY: 1.3,
            alpha: 0,
            duration: 1800,
            ease: 'Quad.easeOut',
            onComplete: () => steam.destroy(),
          });
        });
      },
    });
  }

  /**
   * Phase 3: Ambient Town Life, Walkers, Animals, Pigeons & Sky Birds
   */
  private initAmbientTownLife(worldWidth: number, worldHeight: number) {
    // 1. Opa Heinrich (South Promenade walker & bench sitter)
    const opaShadow = this.add.image(704, 640 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(639);
    this.opaNpc = this.physics.add.sprite(704, 640, 'opa_idle');
    this.opaNpc.setOrigin(0.5, 1);
    this.opaNpc.setScale(1.15);
    this.opaNpc.setDepth(640);
    this.opaNpc.setSize(18, 14);
    this.opaNpc.setOffset(7, 28);
    this.opaNpc.setImmovable(true);
    this.physics.add.collider(this.player, this.opaNpc);

    // Name tag
    const opaLabel = this.add
      .text(704, 640 - 46, 'Opa Heinrich', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#14532d',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(641);

    // Opa Heinrich Patrol Routine (stroll between Marktplatz and Café Patio Bench)
    const opaBenchX = 870;
    const opaBenchY = 735;
    const opaPlazaX = 704;
    const opaPlazaY = 640;

    const startOpaWalkToBench = () => {
      if (!this.opaNpc || !this.opaNpc.active) return;
      this.opaState = 'walking_to_bench';
      this.opaNpc.play('opa_walk_side');
      this.opaNpc.setFlipX(false);
      this.tweens.add({
        targets: [this.opaNpc, opaLabel, opaShadow],
        x: opaBenchX,
        y: opaBenchY,
        duration: 8000,
        ease: 'Linear',
        onComplete: () => {
          if (!this.opaNpc || !this.opaNpc.active) return;
          this.opaState = 'sitting';
          this.opaNpc.play('opa_sit');
          this.time.delayedCall(12000, startOpaWalkToPlaza);
        },
      });
    };

    const startOpaWalkToPlaza = () => {
      if (!this.opaNpc || !this.opaNpc.active) return;
      this.opaState = 'walking_to_plaza';
      this.opaNpc.play('opa_walk_side');
      this.opaNpc.setFlipX(true);
      this.tweens.add({
        targets: [this.opaNpc, opaLabel, opaShadow],
        x: opaPlazaX,
        y: opaPlazaY,
        duration: 8000,
        ease: 'Linear',
        onComplete: () => {
          if (!this.opaNpc || !this.opaNpc.active) return;
          this.opaNpc.play('opa_idle');
          this.time.delayedCall(10000, startOpaWalkToBench);
        },
      });
    };

    this.time.delayedCall(4000, startOpaWalkToBench);

    // 2. Studentin Lena (East Promenade between Bibliothek & Marktplatz)
    const lenaShadow = this.add.image(950, 460 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(459);
    this.lenaNpc = this.physics.add.sprite(950, 460, 'lena_idle');
    this.lenaNpc.setOrigin(0.5, 1);
    this.lenaNpc.setScale(1.15);
    this.lenaNpc.setDepth(460);
    this.lenaNpc.setSize(18, 14);
    this.lenaNpc.setOffset(6, 26);
    this.lenaNpc.setImmovable(true);
    this.physics.add.collider(this.player, this.lenaNpc);

    const lenaLabel = this.add
      .text(950, 460 - 44, 'Lena', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#9f1239',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(461);

    const startLenaPatrol = () => {
      if (!this.lenaNpc || !this.lenaNpc.active) return;
      const targetX = this.lenaNpc.x > 800 ? 760 : 950;
      this.lenaState = 'patrol';
      this.lenaNpc.play('lena_walk_side');
      this.lenaNpc.setFlipX(targetX < this.lenaNpc.x);

      this.tweens.add({
        targets: [this.lenaNpc, lenaLabel, lenaShadow],
        x: targetX,
        duration: 6500,
        ease: 'Linear',
        onComplete: () => {
          if (!this.lenaNpc || !this.lenaNpc.active) return;
          this.lenaState = 'reading';
          this.lenaNpc.play('lena_read_anim');
          this.time.delayedCall(8000, startLenaPatrol);
        },
      });
    };
    this.time.delayedCall(2000, startLenaPatrol);

    // 3. Kind Max (Marktplatz runner with bouncing ball)
    const kidShadow = this.add.image(640, 560 - 2, 'shadow_medium').setOrigin(0.5, 0.5).setDepth(559);
    this.kidMaxNpc = this.physics.add.sprite(640, 560, 'kid_idle');
    this.kidMaxNpc.setOrigin(0.5, 1);
    this.kidMaxNpc.setScale(1.12);
    this.kidMaxNpc.setDepth(560);
    this.kidMaxNpc.setSize(16, 12);
    this.kidMaxNpc.setOffset(4, 20);
    this.kidMaxNpc.setImmovable(true);
    this.physics.add.collider(this.player, this.kidMaxNpc);

    const kidLabel = this.add
      .text(640, 560 - 36, 'Max', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#1d4ed8',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(561);

    // Playground ball bouncing next to Max with reactive ground shadow
    const ballShadow = this.add.image(654, 558, 'shadow_small').setScale(0.6).setDepth(558);
    this.kidBall = this.add.sprite(654, 556, 'playground_ball');
    this.kidBall.setDepth(561);
    this.tweens.add({
      targets: this.kidBall,
      y: 542,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (this.kidBall) {
          const progress = (556 - this.kidBall.y) / 14;
          ballShadow.setScale(Phaser.Math.Linear(0.6, 0.35, progress));
          ballShadow.setAlpha(Phaser.Math.Linear(0.4, 0.15, progress));
        }
      },
    });

    const kidWaypoints = [
      { x: 640, y: 560 },
      { x: 740, y: 580 },
      { x: 760, y: 510 },
      { x: 660, y: 500 },
    ];
    let kidWpIdx = 0;

    const runKidRoutine = () => {
      if (!this.kidMaxNpc || !this.kidMaxNpc.active) return;
      kidWpIdx = (kidWpIdx + 1) % kidWaypoints.length;
      const wp = kidWaypoints[kidWpIdx];

      this.kidMaxNpc.play('kid_walk_side');
      this.kidMaxNpc.setFlipX(wp.x < this.kidMaxNpc.x);

      this.tweens.add({
        targets: [this.kidMaxNpc, kidLabel, kidShadow],
        x: wp.x,
        y: wp.y,
        duration: 3200,
        ease: 'Linear',
        onUpdate: () => {
          if (this.kidBall && this.kidMaxNpc) {
            const ballX = this.kidMaxNpc.x + (this.kidMaxNpc.flipX ? -14 : 14);
            this.kidBall.x = ballX;
            ballShadow.x = ballX;
            ballShadow.y = this.kidMaxNpc.y - 2;
            this.kidBall.setDepth(this.kidMaxNpc.depth + 1);
          }
        },
        onComplete: () => {
          if (!this.kidMaxNpc || !this.kidMaxNpc.active) return;
          this.kidMaxNpc.play('kid_idle');
          this.time.delayedCall(4500, runKidRoutine);
        },
      });
    };
    this.time.delayedCall(3000, runKidRoutine);

    // 4. Dackel Bello (Bavarian Dachshund trotting & sniffing around Marktplatz)
    const belloShadow = this.add.image(670, 590 - 2, 'shadow_small').setOrigin(0.5, 0.5).setDepth(589);
    this.dackelBello = this.physics.add.sprite(670, 590, 'dog_idle');
    this.dackelBello.setOrigin(0.5, 1);
    this.dackelBello.setScale(1.15);
    this.dackelBello.setDepth(590);
    this.dackelBello.setSize(22, 10);
    this.dackelBello.setOffset(3, 8);
    this.dackelBello.setImmovable(true);
    this.physics.add.collider(this.player, this.dackelBello);

    const belloLabel = this.add
      .text(670, 590 - 24, 'Bello 🐾', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#facc15',
        backgroundColor: '#451a03',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(591);

    const dogWaypoints = [
      { x: 670, y: 590 },
      { x: 730, y: 600 },
      { x: 780, y: 560 },
      { x: 710, y: 520 },
      { x: 620, y: 540 },
    ];
    let dogWpIdx = 0;

    const runDogRoutine = () => {
      if (!this.dackelBello || !this.dackelBello.active) return;
      dogWpIdx = (dogWpIdx + 1) % dogWaypoints.length;
      const wp = dogWaypoints[dogWpIdx];

      this.dackelBello.play('dog_trot_side');
      this.dackelBello.setFlipX(wp.x > this.dackelBello.x);

      this.tweens.add({
        targets: [this.dackelBello, belloLabel, belloShadow],
        x: wp.x,
        y: wp.y,
        duration: 3500,
        ease: 'Linear',
        onComplete: () => {
          if (!this.dackelBello || !this.dackelBello.active) return;
          this.dackelBello.play('dog_sniff_anim');
          if (Phaser.Math.Between(0, 2) === 0) {
            this.time.delayedCall(1200, () => soundFx.playDogBark());
          }
          this.time.delayedCall(5000, runDogRoutine);
        },
      });
    };
    this.time.delayedCall(1500, runDogRoutine);

    // 5. Katze Mimi (Ginger Tabby curled sleeping atop courtyard wall at Bäckerei)
    this.add.image(415, 342 - 1, 'shadow_small').setOrigin(0.5, 0.5).setDepth(344);
    this.catMimi = this.physics.add.sprite(415, 342, 'cat_idle');
    this.catMimi.setOrigin(0.5, 1);
    this.catMimi.setScale(1.15);
    this.catMimi.setDepth(345);
    this.catMimi.play('cat_sleep_anim');
    this.catMimi.setImmovable(true);

    this.add
      .text(415, 342 - 20, 'Mimi 😺', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#fed7aa',
        backgroundColor: '#7c2d12',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(346);

    // 6. Town Pigeons pecking crumbs at Marktplatz near Brezelstand
    const pigeonSpots = [
      { x: 620, y: 510 },
      { x: 645, y: 495 },
      { x: 660, y: 518 },
    ];

    this.pigeons = [];
    pigeonSpots.forEach((spot) => {
      const pShadow = this.add.image(spot.x, spot.y - 1, 'shadow_small').setScale(0.7).setOrigin(0.5, 0.5).setDepth(spot.y - 1);
      const pig = this.add.sprite(spot.x, spot.y, 'pigeon_peck_0');
      pig.setOrigin(0.5, 1);
      pig.setDepth(spot.y);
      pig.play('pigeon_peck_anim');
      this.pigeons.push({
        sprite: pig,
        homeX: spot.x,
        homeY: spot.y,
        isFlying: false,
      });
    });

    // 7. High-Altitude Sky Birds crossing diagonally every 26 seconds
    this.time.addEvent({
      delay: 26000,
      loop: true,
      callback: () => {
        const bird1 = this.add.sprite(-20, 260, 'pigeon_fly_0');
        bird1.setOrigin(0.5);
        bird1.setDepth(1100);
        bird1.play('pigeon_fly_anim');
        bird1.setScale(1.2);

        const bird2 = this.add.sprite(-45, 290, 'pigeon_fly_0');
        bird2.setOrigin(0.5);
        bird2.setDepth(1100);
        bird2.play('pigeon_fly_anim');
        bird2.setScale(1);

        soundFx.playBirdChirp();

        this.tweens.add({
          targets: bird1,
          x: worldWidth + 40,
          y: 60,
          duration: 9000,
          ease: 'Linear',
          onComplete: () => bird1.destroy(),
        });
        this.tweens.add({
          targets: bird2,
          x: worldWidth + 20,
          y: 90,
          duration: 9200,
          ease: 'Linear',
          onComplete: () => bird2.destroy(),
        });
      },
    });
  }

  /**
   * Authentic ICE Bullet Train Arrival & Departure Schedule
   */
  private initTrainSchedule() {
    let countdown = 40;

    this.trainScheduleTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        countdown -= 1;

        if (this.trainDepartureBanner && !this.trainMoving) {
          if (countdown > 10) {
            this.trainDepartureBanner.setText('GLEIS 1 · ICE 104 NACH BERLIN HBF');
          } else if (countdown > 4) {
            this.trainDepartureBanner.setText(`GLEIS 1 · ABFAHRT IN ${countdown}s · BITTE EINSTEIGEN`);
          } else if (countdown > 0) {
            this.trainDepartureBanner.setText('GLEIS 1 · BITTE ZURÜCKBLEIBEN! TÜREN SCHLIESSEN');
          }
        }

        // Whistle warning at 4 seconds before departure
        if (countdown === 4 && !this.trainMoving) {
          soundFx.playTrainWhistle();
        }

        // Depart at 0
        if (countdown === 0 && !this.trainMoving) {
          this.departTrain();
        }

        // Reset cycle
        if (countdown <= -30) {
          countdown = 40;
        }
      },
    });
  }

  private departTrain() {
    if (!this.train || this.trainMoving) return;
    this.trainMoving = true;

    // Steam burst
    for (let i = 0; i < 4; i++) {
      const steam = this.add.image(this.train.x - 120 + i * 80, 856, 'train_steam_cloud');
      steam.setDepth(859);
      steam.setScale(0.8);
      this.tweens.add({
        targets: steam,
        y: 830,
        scaleX: 1.6,
        scaleY: 1.6,
        alpha: 0,
        duration: 1500,
        ease: 'Quad.easeOut',
        onComplete: () => steam.destroy(),
      });
    }

    // Slide out to the right along rails
    this.tweens.add({
      targets: this.train,
      x: 2100,
      duration: 4800,
      ease: 'Power2.easeIn',
      onComplete: () => {
        if (this.trainDepartureBanner) {
          this.trainDepartureBanner.setText('GLEIS 1 · NÄCHSTER ZUG: RE 7 (IN 18s)');
        }
        // Wait 16 seconds away, then arrive
        this.time.delayedCall(16000, () => this.arriveTrain());
      },
    });
  }

  private arriveTrain() {
    if (!this.train) return;
    soundFx.playTrainWhistle();
    this.train.x = -650;

    if (this.trainDepartureBanner) {
      this.trainDepartureBanner.setText('GLEIS 1 · ZUG FÄHRT EIN · VORSICHT!');
    }

    this.tweens.add({
      targets: this.train,
      x: 740,
      duration: 5000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.trainMoving = false;
        if (this.trainDepartureBanner) {
          this.trainDepartureBanner.setText('GLEIS 1 · ICE 104 NACH BERLIN HBF');
        }
        // Braking steam puffs
        for (let i = 0; i < 4; i++) {
          const steam = this.add.image(this.train.x - 120 + i * 80, 856, 'train_steam_cloud');
          steam.setDepth(859);
          steam.setScale(0.6);
          this.tweens.add({
            targets: steam,
            y: 835,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 1200,
            ease: 'Quad.easeOut',
            onComplete: () => steam.destroy(),
          });
        }
      },
    });
  }

  /**
   * Frame update for ambient NPCs, animals & pigeon scaring
   */
  private updateAmbientTownLife() {
    const pX = this.player.x;
    const pY = this.player.y;

    // Foot-anchored depth sorting for ambient characters
    if (this.opaNpc) this.opaNpc.setDepth(this.opaNpc.body ? this.opaNpc.body.bottom : this.opaNpc.y);
    if (this.lenaNpc) this.lenaNpc.setDepth(this.lenaNpc.body ? this.lenaNpc.body.bottom : this.lenaNpc.y);
    if (this.kidMaxNpc) this.kidMaxNpc.setDepth(this.kidMaxNpc.body ? this.kidMaxNpc.body.bottom : this.kidMaxNpc.y);
    if (this.dackelBello) this.dackelBello.setDepth(this.dackelBello.body ? this.dackelBello.body.bottom : this.dackelBello.y);

    // Mimi Cat proximity reaction
    if (this.catMimi) {
      const distMimi = Phaser.Math.Distance.Between(pX, pY, this.catMimi.x, this.catMimi.y);
      if (distMimi < 55) {
        if (this.time.now > this.catMeowCooldown) {
          this.catMeowCooldown = this.time.now + 8000;
          this.catMimi.play('cat_awake_anim');
          soundFx.playCatMeow();
          this.showNpcEmote(this.catMimi, 'Miau~ 😺');
        }
      }
    }

    // Pigeon scaring reaction
    this.pigeons.forEach((p) => {
      if (!p.isFlying && p.sprite.active) {
        const dist = Phaser.Math.Distance.Between(pX, pY, p.sprite.x, p.sprite.y);
        if (dist < 55) {
          p.isFlying = true;
          p.sprite.play('pigeon_fly_anim');
          soundFx.playBirdChirp();

          // Scatter fly towards Rathaus roof or pond
          const scatterX = p.sprite.x + Phaser.Math.Between(-80, 80);
          const scatterY = p.sprite.y - Phaser.Math.Between(70, 110);

          this.tweens.add({
            targets: p.sprite,
            x: scatterX,
            y: scatterY,
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => {
              if (!p.sprite.active) return;
              p.sprite.play('pigeon_peck_anim');
              // Return home after 12s
              this.time.delayedCall(12000, () => {
                if (!p.sprite.active) return;
                p.sprite.play('pigeon_fly_anim');
                this.tweens.add({
                  targets: p.sprite,
                  x: p.homeX,
                  y: p.homeY,
                  duration: 1800,
                  ease: 'Quad.easeInOut',
                  onComplete: () => {
                    p.isFlying = false;
                    if (p.sprite.active) p.sprite.play('pigeon_peck_anim');
                  },
                });
              });
            },
          });
        }
      }
    });
  }

  /**
   * Display a floating emote / speech bubble over an NPC or animal
   */
  private showNpcEmote(target: { x: number; y: number }, text: string) {
    const bubble = this.add.container(target.x, target.y - 36);
    bubble.setDepth(1200);

    const txt = this.add
      .text(0, -6, text, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    bubble.add(txt);
    bubble.setScale(0);

    this.tweens.add({
      targets: bubble,
      scaleX: 1,
      scaleY: 1,
      y: target.y - 42,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: bubble,
            alpha: 0,
            y: target.y - 50,
            duration: 300,
            ease: 'Quad.easeIn',
            onComplete: () => bubble.destroy(),
          });
        });
      },
    });
  }

  /**
   * Phase 5 Polish: Reactive hedge/bush rustling & floating leaf particles
   */
  private updatePolishDetails() {
    const now = this.time.now;
    const pX = this.player.x;
    const pY = this.player.y;

    // 1. Rustling Bushes & Leaf Particles
    for (const bush of this.interactiveBushes) {
      const dist = Phaser.Math.Distance.Between(pX, pY, bush.prop.x, bush.prop.y - 12);
      if (dist <= 38 && now - bush.lastRustle > 1400) {
        bush.lastRustle = now;
        soundFx.playRustle();

        // Bush wobble tween
        this.tweens.add({
          targets: bush.prop,
          x: bush.prop.x + Phaser.Math.Between(-3, 3),
          scaleY: 0.92,
          duration: 90,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            bush.prop.setScale(1);
          },
        });

        // Scatter 3 fluttering leaf particles
        for (let i = 0; i < 3; i++) {
          const leaf = this.add.sprite(
            bush.prop.x + Phaser.Math.Between(-10, 10),
            bush.prop.y - Phaser.Math.Between(10, 24),
            'leaf_particle'
          );
          leaf.setDepth(bush.prop.depth + 1);
          const angle = Phaser.Math.Between(-60, 60);
          this.tweens.add({
            targets: leaf,
            x: leaf.x + Phaser.Math.Between(-25, 25),
            y: leaf.y - Phaser.Math.Between(10, 25),
            angle: angle,
            alpha: 0,
            duration: 600 + Phaser.Math.Between(0, 300),
            ease: 'Cubic.easeOut',
            onComplete: () => {
              leaf.destroy();
            },
          });
        }
      }
    }
  }

  /**
   * Phase 5 Polish: Sparkling Points of Interest on water and market highlights
   */
  private initSparklePoints() {
    const points = [
      { x: 704, y: 535 }, // Fountain water center
      { x: 694, y: 548 }, // Fountain lower basin
      { x: 714, y: 546 }, // Fountain right basin
      { x: 580, y: 472 }, // Pretzel cart
      { x: 828, y: 470 }, // Flower cart
      { x: 1120, y: 340 }, // Museum front entrance plaque
    ];

    points.forEach((pt, idx) => {
      this.time.addEvent({
        delay: 2400 + idx * 600,
        loop: true,
        callback: () => {
          const sp = this.add.sprite(
            pt.x + Phaser.Math.Between(-8, 8),
            pt.y + Phaser.Math.Between(-6, 6),
            'sparkle_star'
          );
          sp.setDepth(pt.y + 15);
          sp.setScale(0);
          sp.setAlpha(0.9);
          sp.setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: sp,
            scale: { from: 0, to: 1.2 },
            angle: { from: 0, to: 90 },
            alpha: { from: 0.9, to: 0 },
            duration: 800,
            ease: 'Sine.easeInOut',
            onComplete: () => sp.destroy(),
          });
        },
      });
    });
  }

  /**
   * Phase 4: Dynamic Golden-Hour / Day-Night Ambient Lighting & Retro Screen Vignette
   */
  private initLightingAndAtmosphere(worldWidth: number, worldHeight: number) {
    // 1. Ambient Golden-Hour / Day-Night Color Tint Overlay
    // Uses Phaser Multiply blend mode to tint the world tiles and buildings seamlessly
    this.ambientTintRect = this.add.rectangle(
      worldWidth / 2,
      worldHeight / 2,
      worldWidth,
      worldHeight,
      0xf59e0b,
      0.10
    );
    this.ambientTintRect.setOrigin(0.5);
    this.ambientTintRect.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.ambientTintRect.setDepth(1001);

    // Day -> Golden Hour -> Warm Dusk cycle (transitions every 75s)
    const phases: Array<{ name: 'day' | 'golden_hour' | 'dusk'; color: number; alpha: number }> = [
      { name: 'golden_hour', color: 0xf59e0b, alpha: 0.12 },
      { name: 'dusk', color: 0xe11d48, alpha: 0.16 },
      { name: 'day', color: 0xffffff, alpha: 0.03 },
    ];
    let phaseIdx = 0;

    this.time.addEvent({
      delay: 75000,
      loop: true,
      callback: () => {
        phaseIdx = (phaseIdx + 1) % phases.length;
        const currentPhase = phases[phaseIdx];
        this.dayPhase = currentPhase.name;

        if (this.ambientTintRect) {
          this.ambientTintRect.setFillStyle(currentPhase.color);
          this.tweens.add({
            targets: this.ambientTintRect,
            alpha: currentPhase.alpha,
            duration: 8000,
            ease: 'Sine.easeInOut',
          });
        }

        // Adjust lantern glow intensity depending on time of day
        const targetHaloAlpha = currentPhase.name === 'dusk' ? 0.92 : currentPhase.name === 'golden_hour' ? 0.72 : 0.45;
        this.lampHalos.forEach((halo) => {
          this.tweens.add({
            targets: halo,
            alpha: targetHaloAlpha,
            duration: 6000,
            ease: 'Sine.easeInOut',
          });
        });
      },
    });

    // 2. Camera-Fixed CRT / GBA Retro Screen Vignette
    const w = this.scale.width;
    const h = this.scale.height;
    this.vignetteImage = this.add.image(w / 2, h / 2, 'screen_vignette');
    this.vignetteImage.setOrigin(0.5);
    this.vignetteImage.setScrollFactor(0);
    this.vignetteImage.setDepth(1500);
    this.vignetteImage.setDisplaySize(w, h);

    // Responsive resize handler so vignette covers full viewport without stretching
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      if (this.vignetteImage) {
        this.vignetteImage.setPosition(gameSize.width / 2, gameSize.height / 2);
        this.vignetteImage.setDisplaySize(gameSize.width, gameSize.height);
      }
    });
  }

  /**
   * Drifting cherry blossom petals across the wind
   */
  private createFallingPetals(worldWidth: number, worldHeight: number) {
    const petalCount = 32;
    for (let i = 0; i < petalCount; i++) {
      const startX = Phaser.Math.Between(0, worldWidth);
      const startY = Phaser.Math.Between(0, worldHeight);
      const petal = this.add.image(startX, startY, 'cherry_petal');
      petal.setAlpha(Phaser.Math.FloatBetween(0.45, 0.95));
      petal.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
      petal.setDepth(999);

      this.tweens.add({
        targets: petal,
        x: {
          value: () => petal.x + Phaser.Math.Between(160, 320),
          duration: Phaser.Math.Between(4500, 7500),
          ease: 'Linear',
        },
        y: {
          value: () => petal.y + Phaser.Math.Between(220, 420),
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
    // 1. Grass Variants (Phase 1 varied terrain)
    const gv1 = this.make.graphics({ x: 0, y: 0 });
    gv1.fillStyle(0x429e4b, 1);
    gv1.fillRect(0, 0, 32, 32);
    gv1.fillStyle(0x51b35a, 1);
    gv1.fillRect(4, 6, 2, 5);
    gv1.fillRect(18, 14, 2, 6);
    gv1.fillRect(26, 8, 2, 4);
    gv1.fillStyle(0x388a40, 1);
    gv1.fillRect(0, 0, 32, 1);
    gv1.fillRect(0, 0, 1, 32);
    gv1.generateTexture('grass_v1', 32, 32);
    gv1.generateTexture('grass_light', 32, 32);
    gv1.destroy();

    const gv2 = this.make.graphics({ x: 0, y: 0 });
    gv2.fillStyle(0x3e9646, 1);
    gv2.fillRect(0, 0, 32, 32);
    gv2.fillStyle(0x2d7534, 1);
    gv2.fillRect(6, 12, 3, 3);
    gv2.fillRect(9, 11, 3, 3);
    gv2.fillRect(7, 14, 3, 3);
    gv2.fillStyle(0x5bc266, 1);
    gv2.fillRect(7, 12, 2, 2);
    gv2.fillRect(20, 20, 3, 3);
    gv2.fillRect(23, 19, 3, 3);
    gv2.fillRect(21, 22, 3, 3);
    gv2.generateTexture('grass_v2', 32, 32);
    gv2.destroy();

    const gv3 = this.make.graphics({ x: 0, y: 0 });
    gv3.fillStyle(0x48a852, 1);
    gv3.fillRect(0, 0, 32, 32);
    gv3.fillStyle(0x5ec969, 1);
    gv3.fillRect(8, 6, 2, 5);
    gv3.fillRect(22, 16, 2, 5);
    gv3.fillStyle(0xfacc15, 1); // Buttercup golden flecks
    gv3.fillRect(12, 10, 2, 2);
    gv3.fillRect(24, 22, 2, 2);
    gv3.generateTexture('grass_v3', 32, 32);
    gv3.destroy();

    const gv4 = this.make.graphics({ x: 0, y: 0 });
    gv4.fillStyle(0x347a3c, 1);
    gv4.fillRect(0, 0, 32, 32);
    gv4.fillStyle(0x2b6532, 1);
    gv4.fillRect(4, 10, 4, 3);
    gv4.fillRect(18, 20, 3, 4);
    gv4.fillStyle(0x40914a, 1);
    gv4.fillRect(10, 4, 2, 4);
    gv4.generateTexture('grass_v4', 32, 32);
    gv4.generateTexture('grass_dark', 32, 32);
    gv4.destroy();

    const gPeb = this.make.graphics({ x: 0, y: 0 });
    gPeb.fillStyle(0x429e4b, 1);
    gPeb.fillRect(0, 0, 32, 32);
    gPeb.fillStyle(0x64748b, 1);
    gPeb.fillCircle(10, 14, 3);
    gPeb.fillCircle(22, 22, 2);
    gPeb.fillStyle(0x94a3b8, 1);
    gPeb.fillRect(9, 13, 2, 1);
    gPeb.fillRect(21, 21, 1, 1);
    gPeb.generateTexture('grass_pebbles', 32, 32);
    gPeb.destroy();

    const gWild = this.make.graphics({ x: 0, y: 0 });
    gWild.fillStyle(0x429e4b, 1);
    gWild.fillRect(0, 0, 32, 32);
    gWild.fillStyle(0xef4444, 1); // Red Poppy
    gWild.fillRect(6, 8, 4, 4);
    gWild.fillStyle(0x1e293b, 1);
    gWild.fillRect(7, 9, 2, 2);
    gWild.fillStyle(0x3b82f6, 1); // Blue Cornflower
    gWild.fillRect(20, 10, 4, 4);
    gWild.fillStyle(0xfde047, 1); // Yellow Daisy
    gWild.fillRect(10, 22, 4, 4);
    gWild.fillStyle(0xffffff, 1);
    gWild.fillRect(11, 23, 2, 2);
    gWild.fillStyle(0x16a34a, 1); // Stems
    gWild.fillRect(7, 12, 2, 3);
    gWild.fillRect(21, 14, 2, 3);
    gWild.generateTexture('grass_wildflowers', 32, 32);
    gWild.generateTexture('flower_tile', 32, 32);
    gWild.destroy();

    // 2. Cobblestones (Organic varieties)
    const c1 = this.make.graphics({ x: 0, y: 0 });
    c1.fillStyle(0x94a3b8, 1);
    c1.fillRect(0, 0, 32, 32);
    c1.fillStyle(0x475569, 1); // Mortar grid
    c1.fillRect(0, 15, 32, 2);
    c1.fillRect(15, 0, 2, 16);
    c1.fillRect(8, 16, 2, 16);
    c1.fillRect(24, 16, 2, 16);
    c1.fillStyle(0xcbd5e1, 1); // Highlights
    c1.fillRect(2, 2, 11, 2);
    c1.fillRect(18, 2, 11, 2);
    c1.fillRect(10, 18, 12, 2);
    c1.generateTexture('cobble_v1', 32, 32);
    c1.generateTexture('cobblestone', 32, 32);
    c1.destroy();

    const cCrack = this.make.graphics({ x: 0, y: 0 });
    cCrack.fillStyle(0x94a3b8, 1);
    cCrack.fillRect(0, 0, 32, 32);
    cCrack.fillStyle(0x475569, 1);
    cCrack.fillRect(0, 15, 32, 2);
    cCrack.fillRect(15, 0, 2, 16);
    cCrack.fillRect(8, 16, 2, 16);
    cCrack.fillRect(24, 16, 2, 16);
    cCrack.fillStyle(0x334155, 1); // Cracks
    cCrack.fillRect(4, 5, 2, 3);
    cCrack.fillRect(6, 7, 3, 2);
    cCrack.fillRect(20, 20, 2, 3);
    cCrack.fillRect(22, 22, 3, 2);
    cCrack.generateTexture('cobble_cracked', 32, 32);
    cCrack.destroy();

    const cMoss = this.make.graphics({ x: 0, y: 0 });
    cMoss.fillStyle(0x94a3b8, 1);
    cMoss.fillRect(0, 0, 32, 32);
    cMoss.fillStyle(0x475569, 1);
    cMoss.fillRect(0, 15, 32, 2);
    cMoss.fillRect(15, 0, 2, 16);
    cMoss.fillRect(8, 16, 2, 16);
    cMoss.fillRect(24, 16, 2, 16);
    cMoss.fillStyle(0x4d7c0f, 1); // Moss seams
    cMoss.fillRect(12, 14, 8, 3);
    cMoss.fillRect(7, 18, 3, 5);
    cMoss.fillStyle(0x65a30d, 1);
    cMoss.fillRect(14, 15, 4, 1);
    cMoss.generateTexture('cobble_mossy', 32, 32);
    cMoss.destroy();

    const cDark = this.make.graphics({ x: 0, y: 0 });
    cDark.fillStyle(0x64748b, 1);
    cDark.fillRect(0, 0, 32, 32);
    cDark.fillStyle(0x334155, 1);
    cDark.fillRect(0, 15, 32, 2);
    cDark.fillRect(15, 0, 2, 16);
    cDark.fillRect(8, 16, 2, 16);
    cDark.fillRect(24, 16, 2, 16);
    cDark.fillStyle(0x94a3b8, 1);
    cDark.fillRect(2, 2, 11, 2);
    cDark.generateTexture('cobble_dark', 32, 32);
    cDark.destroy();

    // 3. Organic Dirt & Gravel Trails (Soft natural European sand & clay loam)
    const dTrail = this.make.graphics({ x: 0, y: 0 });
    dTrail.fillStyle(0x8c7a65, 1); // Soft loam base
    dTrail.fillRect(0, 0, 32, 32);
    dTrail.fillStyle(0x786754, 1); // Darker loam specks
    dTrail.fillRect(3, 8, 8, 5);
    dTrail.fillRect(18, 16, 10, 6);
    dTrail.fillStyle(0xa4927d, 1); // Sand pebbles
    dTrail.fillRect(12, 4, 3, 2);
    dTrail.fillRect(6, 20, 2, 2);
    dTrail.fillRect(22, 10, 3, 2);
    dTrail.fillRect(16, 26, 2, 2);
    dTrail.generateTexture('dirt_trail', 32, 32);
    dTrail.destroy();

    const dRim = this.make.graphics({ x: 0, y: 0 });
    dRim.fillStyle(0x84735e, 1); // Gentle natural trail edge
    dRim.fillRect(0, 0, 32, 32);
    dRim.fillStyle(0x6e5e4b, 1); // Soft darker border
    dRim.fillRect(0, 0, 32, 2);
    dRim.fillRect(0, 0, 2, 32);
    dRim.fillStyle(0x9a8873, 1); // Sand flecks
    dRim.fillRect(8, 8, 4, 2);
    dRim.fillRect(18, 18, 4, 2);
    dRim.fillRect(24, 6, 2, 2);
    dRim.generateTexture('plaza_dirt_rim', 32, 32);
    dRim.destroy();

    // 4. Autotiled Grass Overhang Edges (Leafy grass fringes overlapping stone)
    const geT = this.make.graphics({ x: 0, y: 0 });
    geT.fillStyle(0x429e4b, 1);
    for (let bx = 0; bx < 32; bx += 4) {
      const h = ((bx * 7) % 5) + 4;
      geT.fillRect(bx, 0, 4, h);
    }
    geT.fillStyle(0x51b35a, 1);
    for (let bx = 1; bx < 32; bx += 8) {
      geT.fillRect(bx, 0, 2, 3);
    }
    geT.generateTexture('grass_edge_top', 32, 32);
    geT.destroy();

    const geB = this.make.graphics({ x: 0, y: 0 });
    geB.fillStyle(0x429e4b, 1);
    for (let bx = 0; bx < 32; bx += 4) {
      const h = ((bx * 11) % 5) + 4;
      geB.fillRect(bx, 32 - h, 4, h);
    }
    geB.fillStyle(0x51b35a, 1);
    for (let bx = 2; bx < 32; bx += 8) {
      geB.fillRect(bx, 29, 2, 3);
    }
    geB.generateTexture('grass_edge_bottom', 32, 32);
    geB.destroy();

    const geL = this.make.graphics({ x: 0, y: 0 });
    geL.fillStyle(0x429e4b, 1);
    for (let by = 0; by < 32; by += 4) {
      const w = ((by * 7) % 5) + 4;
      geL.fillRect(0, by, w, 4);
    }
    geL.generateTexture('grass_edge_left', 32, 32);
    geL.destroy();

    const geR = this.make.graphics({ x: 0, y: 0 });
    geR.fillStyle(0x429e4b, 1);
    for (let by = 0; by < 32; by += 4) {
      const w = ((by * 11) % 5) + 4;
      geR.fillRect(32 - w, by, w, 4);
    }
    geR.generateTexture('grass_edge_right', 32, 32);
    geR.destroy();

    const gctl = this.make.graphics({ x: 0, y: 0 });
    gctl.fillStyle(0x429e4b, 1);
    gctl.fillRect(0, 0, 8, 8);
    gctl.fillRect(0, 8, 4, 4);
    gctl.fillRect(8, 0, 4, 4);
    gctl.generateTexture('grass_corner_tl', 32, 32);
    gctl.destroy();

    const gctr = this.make.graphics({ x: 0, y: 0 });
    gctr.fillStyle(0x429e4b, 1);
    gctr.fillRect(24, 0, 8, 8);
    gctr.fillRect(28, 8, 4, 4);
    gctr.fillRect(20, 0, 4, 4);
    gctr.generateTexture('grass_corner_tr', 32, 32);
    gctr.destroy();

    const gcbl = this.make.graphics({ x: 0, y: 0 });
    gcbl.fillStyle(0x429e4b, 1);
    gcbl.fillRect(0, 24, 8, 8);
    gcbl.fillRect(0, 20, 4, 4);
    gcbl.fillRect(8, 28, 4, 4);
    gcbl.generateTexture('grass_corner_bl', 32, 32);
    gcbl.destroy();

    const gcbr = this.make.graphics({ x: 0, y: 0 });
    gcbr.fillStyle(0x429e4b, 1);
    gcbr.fillRect(24, 24, 8, 8);
    gcbr.fillRect(28, 20, 4, 4);
    gcbr.fillRect(20, 28, 4, 4);
    gcbr.generateTexture('grass_corner_br', 32, 32);
    gcbr.destroy();

    // 5. Pond & Stream Water Tiles
    const wDeep = this.make.graphics({ x: 0, y: 0 });
    wDeep.fillStyle(0x0284c7, 1);
    wDeep.fillRect(0, 0, 32, 32);
    wDeep.fillStyle(0x0369a1, 1);
    wDeep.fillRect(2, 6, 12, 4);
    wDeep.fillRect(18, 18, 10, 4);
    wDeep.fillStyle(0x38bdf8, 0.7);
    wDeep.fillRect(4, 7, 6, 2);
    wDeep.fillRect(20, 19, 5, 2);
    wDeep.generateTexture('water_pond_deep', 32, 32);
    wDeep.destroy();

    const wShal = this.make.graphics({ x: 0, y: 0 });
    wShal.fillStyle(0x0ea5e9, 1);
    wShal.fillRect(0, 0, 32, 32);
    wShal.fillStyle(0x7dd3fc, 0.8);
    wShal.fillRect(4, 4, 8, 6);
    wShal.fillRect(16, 16, 10, 5);
    wShal.fillStyle(0xd97706, 0.6); // Sandy pebble bottom
    wShal.fillCircle(8, 24, 2);
    wShal.fillCircle(24, 8, 2);
    wShal.generateTexture('water_pond_shallow', 32, 32);
    wShal.destroy();

    const wLily = this.make.graphics({ x: 0, y: 0 });
    wLily.fillStyle(0x0284c7, 1);
    wLily.fillRect(0, 0, 32, 32);
    wLily.fillStyle(0x16a34a, 1);
    wLily.fillCircle(14, 14, 6);
    wLily.fillStyle(0x0284c7, 1);
    wLily.fillTriangle(14, 14, 18, 10, 18, 14);
    wLily.fillStyle(0xf472b6, 1); // Pink Lotus Flower
    wLily.fillCircle(12, 12, 3);
    wLily.fillStyle(0xffffff, 1);
    wLily.fillCircle(12, 12, 1);
    wLily.generateTexture('water_lilypad', 32, 32);
    wLily.destroy();

    // 6. Arched Wooden Footbridge (64x40)
    const brG = this.make.graphics({ x: 0, y: 0 });
    brG.fillStyle(0x000000, 0.35); // Bridge drop shadow
    brG.fillRect(2, 32, 60, 8);
    brG.fillStyle(0x78350f, 1);
    brG.fillRect(0, 4, 64, 32);
    brG.fillStyle(0x451a03, 1);
    for (let px = 8; px < 64; px += 8) {
      brG.fillRect(px, 4, 1, 32);
    }
    brG.fillStyle(0xb45309, 1);
    brG.fillRect(0, 4, 64, 4);
    brG.fillRect(0, 32, 64, 4);
    brG.fillStyle(0xd97706, 1);
    for (let px = 4; px < 64; px += 14) {
      brG.fillRect(px, 1, 4, 7);
      brG.fillRect(px, 30, 4, 7);
    }
    brG.generateTexture('bridge_wood', 64, 40);
    brG.destroy();

    // 7. River Rocks
    const rB = this.make.graphics({ x: 0, y: 0 });
    rB.fillStyle(0x475569, 1);
    rB.fillRoundedRect(0, 4, 28, 18, 6);
    rB.fillStyle(0x64748b, 1);
    rB.fillRoundedRect(2, 2, 24, 14, 5);
    rB.fillStyle(0x94a3b8, 1);
    rB.fillRect(6, 4, 12, 4);
    rB.fillStyle(0x65a30d, 0.8); // Moss
    rB.fillRect(4, 2, 8, 3);
    rB.generateTexture('rock_boulder', 28, 22);
    rB.destroy();

    const rS = this.make.graphics({ x: 0, y: 0 });
    rS.fillStyle(0x475569, 1);
    rS.fillRoundedRect(0, 2, 16, 10, 3);
    rS.fillStyle(0x94a3b8, 1);
    rS.fillRect(3, 3, 8, 3);
    rS.generateTexture('rock_small', 16, 12);
    rS.destroy();

    // 8. Natural Oak & Birch Trees
    const oakG = this.make.graphics({ x: 0, y: 0 });
    oakG.fillStyle(0x451a03, 1);
    oakG.fillRect(24, 46, 8, 22);
    oakG.fillRect(20, 64, 16, 6);
    oakG.fillStyle(0x14532d, 1);
    oakG.fillCircle(28, 32, 24);
    oakG.fillStyle(0x166534, 1);
    oakG.fillCircle(22, 26, 18);
    oakG.fillCircle(34, 28, 18);
    oakG.fillStyle(0x15803d, 1);
    oakG.fillCircle(28, 20, 16);
    oakG.fillStyle(0x22c55e, 1);
    oakG.fillCircle(24, 14, 8);
    oakG.fillCircle(36, 18, 7);
    oakG.generateTexture('tree_oak', 56, 72);
    oakG.destroy();

    const birchG = this.make.graphics({ x: 0, y: 0 });
    birchG.fillStyle(0xe2e8f0, 1);
    birchG.fillRect(17, 34, 6, 32);
    birchG.fillStyle(0x0f172a, 1);
    birchG.fillRect(17, 40, 4, 1);
    birchG.fillRect(19, 48, 4, 1);
    birchG.fillRect(17, 56, 3, 1);
    birchG.fillStyle(0x4d7c0f, 1);
    birchG.fillCircle(20, 24, 16);
    birchG.fillStyle(0x65a30d, 1);
    birchG.fillCircle(18, 18, 14);
    birchG.fillCircle(24, 22, 12);
    birchG.fillStyle(0xa3e635, 1);
    birchG.fillCircle(18, 12, 7);
    birchG.fillCircle(26, 14, 6);
    birchG.generateTexture('tree_birch', 40, 68);
    birchG.destroy();

    const bushG = this.make.graphics({ x: 0, y: 0 });
    bushG.fillStyle(0x166534, 1);
    bushG.fillRoundedRect(0, 4, 28, 20, 6);
    bushG.fillStyle(0x22c55e, 1);
    bushG.fillCircle(10, 10, 6);
    bushG.fillCircle(18, 10, 6);
    bushG.fillStyle(0xef4444, 1);
    bushG.fillCircle(7, 12, 2);
    bushG.fillCircle(14, 8, 2);
    bushG.fillCircle(21, 14, 2);
    bushG.generateTexture('bush_wild', 28, 24);
    bushG.destroy();

    // 9. Town Props & Greenery
    const fH = this.make.graphics({ x: 0, y: 0 });
    fH.fillStyle(0x78350f, 1);
    fH.fillRect(0, 8, 32, 4);
    fH.fillRect(0, 16, 32, 4);
    fH.fillStyle(0x92400e, 1);
    fH.fillRect(2, 2, 6, 22);
    fH.fillRect(24, 2, 6, 22);
    fH.fillStyle(0xb45309, 1);
    fH.fillTriangle(2, 2, 5, 0, 8, 2);
    fH.fillTriangle(24, 2, 27, 0, 30, 2);
    fH.generateTexture('fence_wood_h', 32, 24);
    fH.destroy();

    const fV = this.make.graphics({ x: 0, y: 0 });
    fV.fillStyle(0x78350f, 1);
    fV.fillRect(4, 4, 8, 28);
    fV.fillStyle(0xb45309, 1);
    fV.fillTriangle(4, 4, 8, 0, 12, 4);
    fV.generateTexture('fence_wood_v', 16, 32);
    fV.destroy();

    const hedG = this.make.graphics({ x: 0, y: 0 });
    hedG.fillStyle(0x14532d, 1);
    hedG.fillRoundedRect(0, 2, 32, 26, 4);
    hedG.fillStyle(0x15803d, 1);
    hedG.fillRoundedRect(2, 4, 28, 20, 3);
    hedG.fillStyle(0x22c55e, 1);
    hedG.fillRect(4, 6, 4, 3);
    hedG.fillRect(16, 6, 6, 3);
    hedG.fillRect(24, 8, 4, 3);
    hedG.generateTexture('hedge_box', 32, 28);
    hedG.destroy();

    const fbG = this.make.graphics({ x: 0, y: 0 });
    fbG.fillStyle(0x475569, 1);
    fbG.fillRoundedRect(0, 8, 48, 16, 4);
    fbG.fillStyle(0x64748b, 1);
    fbG.fillRoundedRect(2, 10, 44, 12, 3);
    fbG.fillStyle(0x3e2723, 1);
    fbG.fillRect(4, 11, 40, 8);
    fbG.fillStyle(0xef4444, 1);
    fbG.fillRect(6, 4, 5, 5);
    fbG.fillRect(18, 4, 5, 5);
    fbG.fillStyle(0x8b5cf6, 1);
    fbG.fillRect(30, 4, 5, 5);
    fbG.fillRect(38, 5, 4, 4);
    fbG.fillStyle(0xfde047, 1);
    fbG.fillRect(13, 6, 3, 3);
    fbG.fillRect(25, 6, 3, 3);
    fbG.generateTexture('flower_bed_stone', 48, 24);
    fbG.destroy();

    const barG = this.make.graphics({ x: 0, y: 0 });
    barG.fillStyle(0x78350f, 1);
    barG.fillRoundedRect(2, 2, 16, 24, 3);
    barG.fillStyle(0x92400e, 1);
    barG.fillRect(4, 4, 12, 20);
    barG.fillStyle(0x1e293b, 1);
    barG.fillRect(2, 6, 16, 2);
    barG.fillRect(2, 18, 16, 2);
    barG.generateTexture('barrel_oak', 20, 26);
    barG.destroy();

    const crtG = this.make.graphics({ x: 0, y: 0 });
    crtG.fillStyle(0xb45309, 1);
    crtG.fillRect(0, 0, 22, 22);
    crtG.fillStyle(0x78350f, 1);
    crtG.strokeRect(1, 1, 20, 20);
    crtG.lineBetween(1, 1, 20, 20);
    crtG.lineBetween(1, 20, 20, 1);
    crtG.generateTexture('crate_wooden', 22, 22);
    crtG.destroy();

    const bncG = this.make.graphics({ x: 0, y: 0 });
    bncG.fillStyle(0x064e3b, 1);
    bncG.fillRect(2, 8, 4, 16);
    bncG.fillRect(34, 8, 4, 16);
    bncG.fillRect(2, 14, 36, 3);
    bncG.fillStyle(0xd97706, 1);
    bncG.fillRect(4, 4, 32, 3);
    bncG.fillRect(4, 9, 32, 3);
    bncG.fillRect(4, 14, 32, 4);
    bncG.generateTexture('bench_green', 40, 26);
    bncG.destroy();

    const bkG = this.make.graphics({ x: 0, y: 0 });
    bkG.fillStyle(0x64748b, 1);
    bkG.fillRect(0, 20, 44, 3);
    for (let rx = 4; rx < 42; rx += 10) {
      bkG.strokeRoundedRect(rx, 6, 6, 16, 2);
    }
    bkG.fillStyle(0x2563eb, 1);
    bkG.fillCircle(12, 16, 5);
    bkG.fillCircle(24, 16, 5);
    bkG.fillRect(14, 12, 8, 2);
    bkG.fillStyle(0xdc2626, 1);
    bkG.fillCircle(32, 16, 5);
    bkG.fillRect(26, 10, 6, 2);
    bkG.generateTexture('bike_rack', 44, 26);
    bkG.destroy();

    const spG = this.make.graphics({ x: 0, y: 0 });
    spG.fillStyle(0x78350f, 1);
    spG.fillRect(10, 4, 4, 32);
    spG.fillStyle(0xd97706, 1);
    spG.fillRect(4, 6, 16, 6);
    spG.fillTriangle(20, 6, 24, 9, 20, 12);
    spG.fillStyle(0xb45309, 1);
    spG.fillRect(6, 14, 16, 6);
    spG.fillTriangle(6, 14, 2, 17, 6, 20);
    spG.generateTexture('signpost_town', 24, 36);
    spG.destroy();

    const mbG = this.make.graphics({ x: 0, y: 0 });
    mbG.fillStyle(0x334155, 1);
    mbG.fillRect(6, 16, 4, 12);
    mbG.fillStyle(0xfacc15, 1);
    mbG.fillRoundedRect(0, 0, 16, 18, 3);
    mbG.fillStyle(0xeab308, 1);
    mbG.fillRect(1, 1, 14, 3);
    mbG.fillStyle(0x1e293b, 1);
    mbG.fillRect(5, 7, 6, 2);
    mbG.fillRect(4, 8, 2, 4);
    mbG.fillRect(10, 8, 2, 4);
    mbG.fillRect(5, 11, 4, 2);
    mbG.generateTexture('mailbox_deutsche_post', 16, 28);
    mbG.destroy();

    const potG = this.make.graphics({ x: 0, y: 0 });
    potG.fillStyle(0xc2410c, 1);
    potG.fillRoundedRect(2, 12, 14, 12, 2);
    potG.fillStyle(0xea580c, 1);
    potG.fillRect(1, 11, 16, 3);
    potG.fillStyle(0x15803d, 1);
    potG.fillTriangle(9, 2, 3, 12, 8, 12);
    potG.fillTriangle(9, 2, 15, 12, 10, 12);
    potG.fillTriangle(9, 0, 6, 12, 12, 12);
    potG.fillStyle(0x22c55e, 1);
    potG.fillRect(8, 4, 2, 8);
    potG.generateTexture('potted_fern', 18, 24);
    potG.destroy();

    // 10. Ornate Diamond Cobble (32x32) for Central Plaza
    const ornateG = this.make.graphics({ x: 0, y: 0 });
    ornateG.fillStyle(0x94a3b8, 1);
    ornateG.fillRect(0, 0, 32, 32);
    ornateG.fillStyle(0x475569, 1);
    ornateG.fillRect(0, 0, 32, 1);
    ornateG.fillRect(0, 0, 1, 32);
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

    // 17. Realistic Ballast Gravel Tile (32x32)
    const ballastG = this.make.graphics({ x: 0, y: 0 });
    ballastG.fillStyle(0xaab6a2, 1);
    ballastG.fillRect(0, 0, 32, 32);
    ballastG.fillStyle(0xc5d1bd, 1);
    ballastG.fillRect(3, 4, 3, 2);
    ballastG.fillRect(14, 8, 4, 2);
    ballastG.fillRect(25, 3, 3, 3);
    ballastG.fillRect(8, 18, 4, 2);
    ballastG.fillRect(21, 22, 3, 3);
    ballastG.fillRect(5, 27, 3, 2);
    ballastG.fillStyle(0x8a9981, 1);
    ballastG.fillRect(7, 6, 2, 3);
    ballastG.fillRect(18, 12, 3, 2);
    ballastG.fillRect(27, 16, 2, 3);
    ballastG.fillRect(12, 23, 3, 2);
    ballastG.fillRect(17, 28, 2, 2);
    ballastG.fillStyle(0x6e7b65, 1);
    ballastG.fillRect(11, 4, 1, 2);
    ballastG.fillRect(24, 11, 2, 1);
    ballastG.fillRect(4, 15, 2, 1);
    ballastG.fillRect(15, 19, 1, 2);
    ballastG.generateTexture('ballast_tile', 32, 32);
    ballastG.destroy();

    // 18. Realistic Steel Rails Tile (32x32)
    const railG = this.make.graphics({ x: 0, y: 0 });
    railG.fillStyle(0xaab6a2, 1);
    railG.fillRect(0, 0, 32, 32);
    railG.fillStyle(0x8a9981, 1);
    railG.fillRect(4, 5, 3, 2);
    railG.fillRect(20, 16, 3, 2);
    railG.fillRect(9, 26, 3, 2);
    // Dark Wooden Sleepers / Railroad Ties
    railG.fillStyle(0x382212, 1);
    railG.fillRect(1, 0, 6, 32);
    railG.fillRect(12, 0, 6, 32);
    railG.fillRect(23, 0, 6, 32);
    railG.fillStyle(0x4a301b, 1);
    railG.fillRect(2, 1, 4, 30);
    railG.fillRect(13, 1, 4, 30);
    railG.fillRect(24, 1, 4, 30);
    // Tie Plates
    railG.fillStyle(0x1e293b, 1);
    railG.fillRect(0, 7, 8, 6);
    railG.fillRect(11, 7, 8, 6);
    railG.fillRect(22, 7, 8, 6);
    railG.fillRect(0, 19, 8, 6);
    railG.fillRect(11, 19, 8, 6);
    railG.fillRect(22, 19, 8, 6);
    // Parallel Steel Rails with Specular Shine
    railG.fillStyle(0x1e293b, 1);
    railG.fillRect(0, 11, 32, 3);
    railG.fillStyle(0x94a3b8, 1);
    railG.fillRect(0, 8, 32, 3);
    railG.fillStyle(0xffffff, 1);
    railG.fillRect(0, 8, 32, 1);
    railG.fillStyle(0x1e293b, 1);
    railG.fillRect(0, 23, 32, 3);
    railG.fillStyle(0x94a3b8, 1);
    railG.fillRect(0, 20, 32, 3);
    railG.fillStyle(0xffffff, 1);
    railG.fillRect(0, 20, 32, 1);
    railG.generateTexture('rail_tile', 32, 32);
    railG.destroy();

    // 19. Modern Station Platform Paving (32x32)
    const platG = this.make.graphics({ x: 0, y: 0 });
    platG.fillStyle(0xa1a1aa, 1);
    platG.fillRect(0, 0, 32, 32);
    platG.fillStyle(0x71717a, 1);
    platG.fillRect(0, 15, 32, 1);
    platG.fillRect(15, 0, 1, 16);
    platG.fillRect(0, 31, 32, 1);
    platG.fillRect(7, 16, 1, 16);
    platG.fillRect(23, 16, 1, 16);
    platG.fillStyle(0xd4d4d8, 1);
    platG.fillRect(1, 1, 13, 1);
    platG.fillRect(17, 1, 14, 1);
    platG.fillRect(1, 17, 5, 1);
    platG.fillRect(9, 17, 13, 1);
    platG.fillRect(25, 17, 6, 1);
    platG.generateTexture('platform_tile', 32, 32);
    platG.destroy();

    // 20. Platform Yellow Tactile Safety Line Tile (32x32)
    const platYG = this.make.graphics({ x: 0, y: 0 });
    platYG.fillStyle(0xa1a1aa, 1);
    platYG.fillRect(0, 0, 32, 32);
    platYG.fillStyle(0x71717a, 1);
    platYG.fillRect(0, 31, 32, 1);
    platYG.fillRect(15, 8, 1, 24);
    // Yellow Tactile Warning Strip (with 3D bumps)
    platYG.fillStyle(0x713f12, 1);
    platYG.fillRect(0, 1, 32, 7);
    platYG.fillStyle(0xeab308, 1);
    platYG.fillRect(0, 2, 32, 5);
    platYG.fillStyle(0xfef08a, 1);
    for (let bx = 3; bx < 32; bx += 6) {
      platYG.fillRect(bx, 3, 3, 2);
    }
    platYG.generateTexture('platform_yellow_tile', 32, 32);
    platYG.destroy();

    // 21. Platform Edge Overhang & Bottom Tactile Line (32x32)
    const platOG = this.make.graphics({ x: 0, y: 0 });
    platOG.fillStyle(0xa1a1aa, 1);
    platOG.fillRect(0, 0, 32, 32);
    platOG.fillStyle(0x713f12, 1);
    platOG.fillRect(0, 18, 32, 6);
    platOG.fillStyle(0xeab308, 1);
    platOG.fillRect(0, 19, 32, 4);
    platOG.fillStyle(0xfef08a, 1);
    for (let bx = 3; bx < 32; bx += 6) {
      platOG.fillRect(bx, 20, 3, 2);
    }
    // Concrete Curb Overhang & Dark Drop-Shadow
    platOG.fillStyle(0x52525b, 1);
    platOG.fillRect(0, 25, 32, 3);
    platOG.fillStyle(0x18181b, 0.85);
    platOG.fillRect(0, 28, 32, 4);
    platOG.generateTexture('platform_overhang_tile', 32, 32);
    platOG.destroy();

    // 22. Modern High-Speed Bullet Train (440x68 - Nintendo / Pokemon Style)
    const trainG = this.make.graphics({ x: 0, y: 0 });
    // Undercarriage dark shadow & wheels
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(16, 52, 408, 14);
    trainG.fillStyle(0x334155, 1);
    const bogieXs = [45, 75, 160, 190, 260, 290, 365, 395];
    bogieXs.forEach((bx) => {
      trainG.fillCircle(bx, 60, 6);
      trainG.fillStyle(0x94a3b8, 1);
      trainG.fillCircle(bx, 60, 2);
      trainG.fillStyle(0x334155, 1);
    });

    // Sleek Aerodynamic Bullet Train Body
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRoundedRect(0, 6, 440, 50, 16);
    trainG.fillTriangle(0, 32, 28, 6, 28, 56);
    trainG.fillTriangle(440, 32, 412, 6, 412, 56);

    // Main Platinum White Body
    trainG.fillStyle(0xe2e8f0, 1);
    trainG.fillRoundedRect(2, 8, 436, 46, 14);
    trainG.fillTriangle(3, 32, 28, 8, 28, 54);
    trainG.fillTriangle(437, 32, 412, 8, 412, 54);

    // Roof Top Specular Highlight
    trainG.fillStyle(0xffffff, 1);
    trainG.fillRect(28, 8, 384, 4);
    trainG.fillStyle(0xf1f5f9, 1);
    trainG.fillRect(28, 12, 384, 6);

    // Lower Body Shadow & German Red/Cyan Accent Stripe
    trainG.fillStyle(0xcbd5e1, 1);
    trainG.fillRect(20, 48, 400, 6);
    trainG.fillStyle(0xef4444, 1);
    trainG.fillRect(16, 46, 408, 3);
    trainG.fillStyle(0x06b6d4, 1);
    trainG.fillRect(16, 44, 408, 2);

    // Cockpit Windshields (Left & Right Noses)
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(8, 16, 24, 18);
    trainG.fillRect(408, 16, 24, 18);
    trainG.fillStyle(0x0369a1, 1);
    trainG.fillRect(10, 18, 20, 14);
    trainG.fillRect(410, 18, 20, 14);
    trainG.fillStyle(0x38bdf8, 1);
    trainG.fillRect(12, 19, 10, 6);
    trainG.fillRect(412, 19, 10, 6);
    trainG.fillStyle(0xffffff, 1);
    trainG.fillRect(14, 20, 4, 3);
    trainG.fillRect(414, 20, 4, 3);
    // Headlights
    trainG.fillStyle(0xfef08a, 1);
    trainG.fillRect(4, 34, 5, 4);
    trainG.fillRect(431, 34, 5, 4);

    // Panoramic Window Band (Dark navy frame)
    trainG.fillStyle(0x0f172a, 1);
    trainG.fillRect(36, 18, 368, 20);

    // Tinted Blue Windows with glossy reflections
    for (let wx = 42; wx < 396; wx += 28) {
      const isDoor1 = wx >= 88 && wx <= 130;
      const isDoor2 = wx >= 300 && wx <= 342;
      if (isDoor1 || isDoor2) continue;

      trainG.fillStyle(0x0284c7, 1);
      trainG.fillRect(wx, 21, 22, 14);
      trainG.fillStyle(0x38bdf8, 1);
      trainG.fillRect(wx + 2, 22, 18, 5);
      trainG.fillStyle(0xbae6fd, 1);
      trainG.fillRect(wx + 4, 23, 7, 3);
      trainG.fillStyle(0x0f172a, 1);
      trainG.fillRect(wx + 22, 18, 6, 20);
    }

    // Two Open Passenger Boarding Doors (Exact Nintendo reference match!)
    const doorXs = [92, 308];
    doorXs.forEach((dx) => {
      trainG.fillStyle(0x0f172a, 1);
      trainG.fillRect(dx - 4, 14, 34, 40);
      trainG.fillStyle(0x050811, 1);
      trainG.fillRect(dx, 16, 26, 38);
      trainG.fillStyle(0xfde047, 0.7);
      trainG.fillRect(dx + 4, 18, 18, 4);
      trainG.fillStyle(0x334155, 1);
      trainG.fillRect(dx - 3, 16, 4, 38);
      trainG.fillRect(dx + 25, 16, 4, 38);
      trainG.fillStyle(0xfacc15, 1);
      trainG.fillRect(dx - 1, 52, 28, 4);
      trainG.fillStyle(0x000000, 1);
      trainG.fillRect(dx + 2, 53, 22, 1);
    });

    trainG.generateTexture('bullet_train_modern', 440, 68);
    trainG.destroy();

    // 23. Station Clock on Post (24x56)
    const clockG = this.make.graphics({ x: 0, y: 0 });
    clockG.fillStyle(0x1e293b, 1);
    clockG.fillRect(10, 20, 4, 34);
    clockG.fillRect(7, 52, 10, 4);
    clockG.fillStyle(0x0f172a, 1);
    clockG.fillCircle(12, 12, 12);
    clockG.fillStyle(0xffffff, 1);
    clockG.fillCircle(12, 12, 10);
    clockG.fillStyle(0x000000, 1);
    clockG.fillRect(11, 4, 2, 2);
    clockG.fillRect(11, 18, 2, 2);
    clockG.fillRect(4, 11, 2, 2);
    clockG.fillRect(18, 11, 2, 2);
    clockG.fillRect(11, 7, 2, 6);
    clockG.fillRect(11, 11, 6, 2);
    clockG.fillStyle(0xef4444, 1);
    clockG.fillCircle(12, 12, 1.5);
    clockG.generateTexture('station_clock_post', 24, 56);
    clockG.destroy();

    // 24. Station Wood Waiting Bench (48x28)
    const benchG = this.make.graphics({ x: 0, y: 0 });
    benchG.fillStyle(0x0f172a, 1);
    benchG.fillRect(4, 14, 4, 14);
    benchG.fillRect(40, 14, 4, 14);
    benchG.fillRect(2, 6, 44, 2);
    benchG.fillStyle(0xb45309, 1);
    benchG.fillRect(4, 2, 40, 5);
    benchG.fillRect(4, 9, 40, 5);
    benchG.fillStyle(0xd97706, 1);
    benchG.fillRect(6, 3, 36, 2);
    benchG.fillRect(6, 10, 36, 2);
    benchG.fillStyle(0x78350f, 1);
    benchG.fillRect(2, 16, 44, 6);
    benchG.fillStyle(0xb45309, 1);
    benchG.fillRect(4, 17, 40, 3);
    benchG.generateTexture('station_wood_bench', 48, 28);
    benchG.destroy();

    // 25. Station Recycling Trash Bin (18x26)
    const binG = this.make.graphics({ x: 0, y: 0 });
    binG.fillStyle(0x0f172a, 1);
    binG.fillRect(1, 2, 16, 24);
    binG.fillStyle(0x334155, 1);
    binG.fillRect(2, 3, 14, 22);
    binG.fillStyle(0x0f172a, 1);
    binG.fillRect(4, 6, 10, 4);
    binG.fillStyle(0x0284c7, 1);
    binG.fillRect(5, 14, 8, 8);
    binG.fillStyle(0xffffff, 1);
    binG.fillRect(7, 16, 4, 4);
    binG.generateTexture('station_trash_bin', 18, 26);
    binG.destroy();

    // 26. Large High-Tech Digital Departure Screen (68x48)
    const dispG = this.make.graphics({ x: 0, y: 0 });
    dispG.fillStyle(0x1e293b, 1);
    dispG.fillRect(12, 32, 6, 16);
    dispG.fillRect(50, 32, 6, 16);
    dispG.fillRect(8, 44, 52, 4);
    dispG.fillStyle(0x0f172a, 1);
    dispG.fillRect(0, 0, 68, 34);
    dispG.fillStyle(0x334155, 1);
    dispG.fillRect(2, 2, 64, 30);
    dispG.fillStyle(0x0369a1, 1);
    dispG.fillRect(4, 4, 60, 26);
    dispG.fillStyle(0x0284c7, 1);
    dispG.fillRect(6, 6, 56, 22);
    dispG.fillStyle(0x0f172a, 1);
    dispG.fillRect(6, 6, 56, 6);
    dispG.fillStyle(0xfde047, 1);
    dispG.fillRect(8, 7, 24, 4);
    dispG.fillStyle(0xffffff, 1);
    dispG.fillRect(8, 14, 32, 3);
    dispG.fillStyle(0xfacc15, 1);
    dispG.fillRect(46, 14, 14, 3);
    dispG.fillStyle(0x93c5fd, 1);
    dispG.fillRect(8, 20, 28, 3);
    dispG.fillStyle(0xfacc15, 1);
    dispG.fillRect(46, 20, 14, 3);
    dispG.generateTexture('departure_screen_large', 68, 48);
    dispG.destroy();

    // 27. Yellow Smiley Balloons (32x44 - Nintendo Charm!)
    const balG = this.make.graphics({ x: 0, y: 0 });
    balG.fillStyle(0x1e293b, 1);
    balG.fillRect(10, 22, 1, 20);
    balG.fillRect(22, 22, 1, 20);
    // Left Balloon
    balG.fillStyle(0x000000, 1);
    balG.fillCircle(10, 11, 9);
    balG.fillStyle(0xfacc15, 1);
    balG.fillCircle(10, 11, 8);
    balG.fillStyle(0xfef08a, 1);
    balG.fillCircle(8, 8, 3);
    balG.fillStyle(0x000000, 1);
    balG.fillRect(6, 10, 2, 2);
    balG.fillRect(12, 10, 2, 2);
    balG.fillRect(8, 13, 4, 1);
    balG.fillStyle(0xf43f5e, 1);
    balG.fillRect(5, 12, 2, 1);
    balG.fillRect(13, 12, 2, 1);
    // Right Balloon
    balG.fillStyle(0x000000, 1);
    balG.fillCircle(22, 11, 9);
    balG.fillStyle(0xfacc15, 1);
    balG.fillCircle(22, 11, 8);
    balG.fillStyle(0xfef08a, 1);
    balG.fillCircle(20, 8, 3);
    balG.fillStyle(0x000000, 1);
    balG.fillRect(18, 10, 2, 2);
    balG.fillRect(24, 10, 2, 2);
    balG.fillRect(20, 13, 4, 1);
    balG.fillStyle(0xf43f5e, 1);
    balG.fillRect(17, 12, 2, 1);
    balG.fillRect(25, 12, 2, 1);
    balG.generateTexture('smiley_balloons', 32, 44);
    balG.destroy();

    // 28. Commuter Girl with Scarf (24x34)
    const comG = this.make.graphics({ x: 0, y: 0 });
    comG.fillStyle(0x451a03, 1);
    comG.fillRect(6, 4, 12, 10);
    comG.fillRect(16, 6, 6, 6);
    comG.fillStyle(0xf3c28a, 1);
    comG.fillRect(7, 8, 10, 8);
    comG.fillStyle(0x0f172a, 1);
    comG.fillRect(9, 10, 2, 2);
    comG.fillRect(13, 10, 2, 2);
    comG.fillStyle(0x0284c7, 1);
    comG.fillRect(6, 16, 12, 10);
    comG.fillStyle(0xec4899, 1);
    comG.fillRect(7, 15, 10, 3);
    comG.fillStyle(0x1e293b, 1);
    comG.fillRect(7, 26, 4, 6);
    comG.fillRect(13, 26, 4, 6);
    comG.generateTexture('commuter_girl', 24, 34);
    comG.destroy();

    // 29. Commuter Boy with Frog Cap (24x34 - from Nintendo reference!)
    const boyG = this.make.graphics({ x: 0, y: 0 });
    boyG.fillStyle(0x22c55e, 1);
    boyG.fillRect(5, 2, 14, 8);
    boyG.fillRect(6, 0, 4, 3);
    boyG.fillRect(14, 0, 4, 3);
    boyG.fillStyle(0xffffff, 1);
    boyG.fillRect(7, 1, 2, 2);
    boyG.fillRect(15, 1, 2, 2);
    boyG.fillStyle(0x0f172a, 1);
    boyG.fillRect(7, 1, 1, 1);
    boyG.fillRect(15, 1, 1, 1);
    boyG.fillStyle(0xf3c28a, 1);
    boyG.fillRect(7, 9, 10, 7);
    boyG.fillStyle(0x0f172a, 1);
    boyG.fillRect(9, 11, 2, 2);
    boyG.fillRect(13, 11, 2, 2);
    boyG.fillStyle(0x2563eb, 1);
    boyG.fillRect(6, 16, 12, 10);
    boyG.fillStyle(0x0284c7, 1);
    boyG.fillRect(8, 16, 8, 8);
    boyG.fillStyle(0x1e293b, 1);
    boyG.fillRect(7, 26, 4, 6);
    boyG.fillRect(13, 26, 4, 6);
    boyG.generateTexture('commuter_boy', 24, 34);
    boyG.destroy();

    // 30. Station Traveler with Cap & Suitcase (24x34)
    const travG = this.make.graphics({ x: 0, y: 0 });
    travG.fillStyle(0x1e293b, 1);
    travG.fillRect(6, 4, 14, 6);
    travG.fillRect(4, 8, 6, 2);
    travG.fillStyle(0xf3c28a, 1);
    travG.fillRect(7, 9, 10, 7);
    travG.fillStyle(0x0f172a, 1);
    travG.fillRect(8, 11, 2, 2);
    travG.fillRect(12, 11, 2, 2);
    travG.fillStyle(0x991b1b, 1);
    travG.fillRect(6, 16, 12, 10);
    travG.fillStyle(0xb91c1c, 1);
    travG.fillRect(8, 16, 8, 8);
    travG.fillStyle(0x475569, 1);
    travG.fillRect(7, 26, 4, 6);
    travG.fillRect(13, 26, 4, 6);
    travG.fillStyle(0xb45309, 1);
    travG.fillRect(18, 20, 6, 12);
    travG.fillStyle(0x78350f, 1);
    travG.fillRect(19, 17, 4, 3);
    travG.generateTexture('station_traveler', 24, 34);
    travG.destroy();

    // 31. Station Master (Herr Braun - 32x44 Peak Visor & DB Double-breasted Suit)
    const masterG = this.make.graphics({ x: 0, y: 0 });
    // Peaked Conductor Visor Cap
    masterG.fillStyle(0x0f172a, 1);
    masterG.fillRect(7, 3, 18, 5);
    masterG.fillRect(5, 7, 22, 3);
    masterG.fillStyle(0xfacc15, 1); // Gold Cap Cord & Cockade
    masterG.fillRect(9, 6, 14, 1);
    masterG.fillRect(14, 3, 4, 3);
    // Face & Eyes
    masterG.fillStyle(0xf3c28a, 1);
    masterG.fillRect(9, 10, 14, 8);
    masterG.fillStyle(0x0f172a, 1);
    masterG.fillRect(11, 13, 2, 2);
    masterG.fillRect(19, 13, 2, 2);
    masterG.fillStyle(0x5b3a1e, 1); // Moustache
    masterG.fillRect(12, 16, 8, 2);
    // Navy DB Double-Breasted Uniform
    masterG.fillStyle(0x1e3a8a, 1);
    masterG.fillRect(7, 18, 18, 14);
    masterG.fillStyle(0x1d4ed8, 1);
    masterG.fillRect(9, 18, 14, 12);
    masterG.fillStyle(0xdc2626, 1); // Red necktie
    masterG.fillRect(15, 18, 2, 6);
    masterG.fillStyle(0xfacc15, 1); // Shiny Gold Buttons & Pocket Watch Chain
    masterG.fillRect(12, 21, 2, 2);
    masterG.fillRect(18, 21, 2, 2);
    masterG.fillRect(12, 25, 2, 2);
    masterG.fillRect(18, 25, 2, 2);
    masterG.fillRect(13, 28, 6, 1);
    // Trousers & Polished Shoes
    masterG.fillStyle(0x0f172a, 1);
    masterG.fillRect(9, 32, 6, 8);
    masterG.fillRect(17, 32, 6, 8);
    masterG.fillStyle(0x020617, 1);
    masterG.fillRect(7, 39, 8, 4);
    masterG.fillRect(17, 39, 8, 4);
    masterG.generateTexture('station_master', 32, 44);
    masterG.destroy();

    // 32. Nintendo RPG Player Hero - Idle (32x48)
    const heroIdleG = this.make.graphics({ x: 0, y: 0 });
    // Hair (Chestnut brown layered anime cut with caramel highlights)
    heroIdleG.fillStyle(0x382212, 1);
    heroIdleG.fillRect(8, 2, 16, 7);
    heroIdleG.fillRect(5, 5, 22, 6);
    heroIdleG.fillStyle(0x5b3a1e, 1);
    heroIdleG.fillRect(7, 3, 18, 6);
    heroIdleG.fillStyle(0xb45309, 1); // Highlight bangs
    heroIdleG.fillRect(10, 3, 10, 2);
    heroIdleG.fillRect(12, 5, 4, 2);
    // 32. Nintendo RPG Player Hero - 4-Direction Walk Cycles & Idles (32x48)
    // A. Down Direction (Facing Front/South)
    for (let f = 0; f < 4; f++) {
      const hD = this.make.graphics({ x: 0, y: 0 });
      // Hair
      hD.fillStyle(0x382212, 1);
      hD.fillRect(8, 1, 16, 7);
      hD.fillRect(5, 4, 22, 6);
      hD.fillStyle(0x5b3a1e, 1);
      hD.fillRect(7, 2, 18, 6);
      hD.fillStyle(0xb45309, 1);
      hD.fillRect(10, 2, 10, 2);
      // Face & Eyes
      hD.fillStyle(0xf3c28a, 1);
      hD.fillRect(8, 9, 16, 9);
      hD.fillStyle(0x0f172a, 1);
      hD.fillRect(10, 12, 3, 3);
      hD.fillRect(19, 12, 3, 3);
      hD.fillStyle(0xffffff, 1);
      hD.fillRect(10, 12, 1, 1);
      hD.fillRect(19, 12, 1, 1);
      hD.fillStyle(0xfb7185, 1); // Cheerful blush
      hD.fillRect(8, 15, 3, 1);
      hD.fillRect(21, 15, 3, 1);
      // Scarf (Schwarz-Rot-Gold)
      hD.fillStyle(0x000000, 1);
      hD.fillRect(7, 17, 18, 2);
      hD.fillStyle(0xdc2626, 1);
      hD.fillRect(7, 19, 18, 2);
      hD.fillStyle(0xfacc15, 1);
      hD.fillRect(7, 21, 18, 2);
      hD.fillRect(f % 2 === 1 ? 8 : 9, 23, 4, 4);
      // Denim Explorer Jacket & Satchel
      hD.fillStyle(0x1d4ed8, 1);
      hD.fillRect(8, 23, 16, 10);
      hD.fillStyle(0x3b82f6, 1);
      hD.fillRect(10, 23, 12, 8);
      hD.fillStyle(0x78350f, 1);
      hD.fillRect(11, 23, 2, 10);
      hD.fillStyle(0xf59e0b, 1);
      hD.fillRect(11, 27, 2, 2);
      // Arms & Hands
      hD.fillStyle(0xf3c28a, 1);
      if (f === 1) {
        hD.fillRect(5, 29, 3, 3);
        hD.fillRect(24, 32, 3, 3);
      } else if (f === 3) {
        hD.fillRect(5, 32, 3, 3);
        hD.fillRect(24, 29, 3, 3);
      } else {
        hD.fillRect(6, 30, 3, 3);
        hD.fillRect(23, 30, 3, 3);
      }
      // Trousers & Boots
      hD.fillStyle(0x1e293b, 1);
      hD.fillRect(9, 33, 6, 8);
      hD.fillRect(17, 33, 6, 8);
      hD.fillStyle(0x451a03, 1);
      if (f === 1) {
        hD.fillRect(6, 40, 8, 6);
        hD.fillRect(18, 39, 7, 5);
      } else if (f === 3) {
        hD.fillRect(8, 39, 7, 5);
        hD.fillRect(18, 40, 8, 6);
      } else {
        hD.fillRect(8, 41, 7, 5);
        hD.fillRect(17, 41, 7, 5);
      }
      hD.generateTexture(`player_walk_down_${f}`, 32, 48);
      if (f === 0) {
        hD.generateTexture('player_idle_down', 32, 48);
        hD.generateTexture('player_hero_idle', 32, 48);
        hD.generateTexture('player_hero', 32, 48);
      } else if (f === 1) {
        hD.generateTexture('player_hero_walk_1', 32, 48);
      } else if (f === 3) {
        hD.generateTexture('player_hero_walk_2', 32, 48);
      }
      hD.destroy();
    }

    // B. Up Direction (Facing Back/North)
    for (let f = 0; f < 4; f++) {
      const hU = this.make.graphics({ x: 0, y: 0 });
      // Hair Back
      hU.fillStyle(0x382212, 1);
      hU.fillRect(7, 1, 18, 14);
      hU.fillRect(5, 4, 22, 10);
      hU.fillStyle(0x5b3a1e, 1);
      hU.fillRect(8, 3, 16, 10);
      // Scarf Collar back
      hU.fillStyle(0x000000, 1);
      hU.fillRect(7, 15, 18, 2);
      hU.fillStyle(0xdc2626, 1);
      hU.fillRect(7, 17, 18, 2);
      hU.fillStyle(0xfacc15, 1);
      hU.fillRect(7, 19, 18, 2);
      // Denim Explorer Jacket Back with Satchel
      hU.fillStyle(0x1d4ed8, 1);
      hU.fillRect(8, 21, 16, 12);
      hU.fillStyle(0x3b82f6, 1);
      hU.fillRect(10, 22, 12, 10);
      // Leather Satchel on back
      hU.fillStyle(0x78350f, 1);
      hU.fillRect(11, 23, 10, 8);
      hU.fillStyle(0xb45309, 1);
      hU.fillRect(12, 24, 8, 6);
      hU.fillStyle(0xf59e0b, 1);
      hU.fillRect(15, 27, 2, 2);
      // Trousers & Boots
      hU.fillStyle(0x1e293b, 1);
      hU.fillRect(9, 33, 6, 8);
      hU.fillRect(17, 33, 6, 8);
      hU.fillStyle(0x451a03, 1);
      if (f === 1) {
        hU.fillRect(7, 39, 7, 6);
        hU.fillRect(17, 41, 7, 5);
      } else if (f === 3) {
        hU.fillRect(8, 41, 7, 5);
        hU.fillRect(18, 39, 7, 6);
      } else {
        hU.fillRect(8, 41, 7, 5);
        hU.fillRect(17, 41, 7, 5);
      }
      hU.generateTexture(`player_walk_up_${f}`, 32, 48);
      if (f === 0) hU.generateTexture('player_idle_up', 32, 48);
      hU.destroy();
    }

    // C. Side Direction (Profile Facing East / West)
    for (let f = 0; f < 4; f++) {
      const hS = this.make.graphics({ x: 0, y: 0 });
      // Hair Profile
      hS.fillStyle(0x382212, 1);
      hS.fillRect(8, 1, 14, 8);
      hS.fillRect(6, 4, 18, 8);
      hS.fillStyle(0x5b3a1e, 1);
      hS.fillRect(9, 2, 13, 6);
      // Face Profile
      hS.fillStyle(0xf3c28a, 1);
      hS.fillRect(14, 8, 8, 9);
      hS.fillStyle(0x0f172a, 1); // Eye
      hS.fillRect(18, 11, 2, 3);
      hS.fillStyle(0xffffff, 1);
      hS.fillRect(19, 11, 1, 1);
      // Scarf fluttering behind
      hS.fillStyle(0x000000, 1);
      hS.fillRect(10, 17, 12, 2);
      hS.fillRect(6, 18, 5, 2);
      hS.fillStyle(0xdc2626, 1);
      hS.fillRect(10, 19, 12, 2);
      hS.fillRect(5, 20, 6, 2);
      hS.fillStyle(0xfacc15, 1);
      hS.fillRect(10, 21, 12, 2);
      hS.fillRect(4, 22, 6, 2);
      // Jacket & Satchel Profile
      hS.fillStyle(0x1d4ed8, 1);
      hS.fillRect(10, 23, 12, 10);
      hS.fillStyle(0x3b82f6, 1);
      hS.fillRect(12, 23, 9, 8);
      hS.fillStyle(0x78350f, 1); // Satchel hip bag
      hS.fillRect(9, 27, 4, 6);
      // Arm & Hand swing
      hS.fillStyle(0xf3c28a, 1);
      if (f === 1) {
        hS.fillRect(18, 28, 3, 3);
      } else if (f === 3) {
        hS.fillRect(8, 29, 3, 3);
      } else {
        hS.fillRect(13, 29, 3, 3);
      }
      // Trousers & Boots
      hS.fillStyle(0x1e293b, 1);
      hS.fillRect(11, 33, 8, 8);
      hS.fillStyle(0x451a03, 1);
      if (f === 1) {
        hS.fillRect(14, 40, 8, 5);
        hS.fillRect(8, 38, 6, 5);
      } else if (f === 3) {
        hS.fillRect(7, 40, 8, 5);
        hS.fillRect(15, 38, 6, 5);
      } else {
        hS.fillRect(10, 41, 9, 5);
      }
      hS.generateTexture(`player_walk_side_${f}`, 32, 48);
      if (f === 0) hS.generateTexture('player_idle_side', 32, 48);
      hS.destroy();
    }

    // D. Footstep Dust Puffs (12x10)
    for (let f = 0; f < 3; f++) {
      const dstG = this.make.graphics({ x: 0, y: 0 });
      dstG.fillStyle(0xf8fafc, 0.7 - f * 0.2);
      const r = 2 + f * 2;
      dstG.fillCircle(4, 6, r);
      dstG.fillCircle(8, 5, r - 1);
      dstG.generateTexture(`dust_puff_${f}`, 12, 10);
      dstG.destroy();
    }

    // E. Chimney Smoke Clouds (24x24)
    for (let f = 0; f < 3; f++) {
      const smkG = this.make.graphics({ x: 0, y: 0 });
      smkG.fillStyle(0xffffff, 0.85 - f * 0.25);
      const r = 4 + f * 3;
      smkG.fillCircle(10, 12, r);
      smkG.fillCircle(14, 10, r - 1);
      smkG.fillCircle(8, 14, r - 2);
      smkG.fillStyle(0xe2e8f0, 0.5);
      smkG.fillCircle(12, 12, r / 2);
      smkG.generateTexture(`chimney_smoke_${f}`, 24, 24);
      smkG.destroy();
    }

    // F. Animated Fountain Spray & Ripples (36x24)
    for (let f = 0; f < 3; f++) {
      const ripG = this.make.graphics({ x: 0, y: 0 });
      // Water Ripple Ring
      ripG.fillStyle(0x38bdf8, 0.5 - f * 0.1);
      ripG.strokeEllipse(18, 12, 12 + f * 6, 6 + f * 3);
      // Leaping Water Droplets in center
      ripG.fillStyle(0xffffff, 0.9);
      ripG.fillCircle(18, 8 - f * 2, 2);
      ripG.fillCircle(15 + f * 2, 10 - f, 1.5);
      ripG.fillCircle(21 - f * 2, 10 - f, 1.5);
      ripG.generateTexture(`fountain_spray_${f}`, 36, 24);
      ripG.destroy();
    }

    // G. Train Steam Cloud (36x20)
    const stmG = this.make.graphics({ x: 0, y: 0 });
    stmG.fillStyle(0xffffff, 0.75);
    stmG.fillCircle(12, 10, 8);
    stmG.fillCircle(22, 9, 9);
    stmG.fillCircle(28, 11, 7);
    stmG.fillStyle(0xe2e8f0, 0.4);
    stmG.fillCircle(18, 12, 6);
    stmG.generateTexture('train_steam_cloud', 36, 20);
    stmG.destroy();

    // H. Warm Window Glow (18x14)
    const winG = this.make.graphics({ x: 0, y: 0 });
    winG.fillStyle(0xfef08a, 0.85);
    winG.fillRoundedRect(0, 0, 18, 14, 2);
    winG.fillStyle(0xfde047, 0.6);
    winG.fillRect(2, 2, 14, 10);
    winG.generateTexture('window_glow_warm', 18, 14);
    winG.destroy();

    // 35. Animated Waving German Flags (Schwarz-Rot-Gold: 34x22, 3 Frames)
    for (let f = 0; f < 3; f++) {
      const flagG = this.make.graphics({ x: 0, y: 0 });
      const waveShift = f === 1 ? -2 : f === 2 ? 2 : 0;
      // Black stripe (top)
      flagG.fillStyle(0x000000, 1);
      flagG.fillRect(0, 0 + waveShift, 34, 7);
      // Red stripe (middle)
      flagG.fillStyle(0xdc2626, 1);
      flagG.fillRect(0, 7 + waveShift, 34, 7);
      // Gold stripe (bottom)
      flagG.fillStyle(0xfacc15, 1);
      flagG.fillRect(0, 14 + waveShift, 34, 7);
      // Wave shade ripples
      flagG.fillStyle(0xffffff, 0.2);
      flagG.fillRect(8 + f * 5, 0 + waveShift, 4, 21);
      flagG.fillStyle(0x000000, 0.25);
      flagG.fillRect(14 + f * 5, 0 + waveShift, 4, 21);
      flagG.generateTexture(`german_flag_${f}`, 34, 22);
      flagG.destroy();
    }

    // 36. Tall Silver Flagpole with Brass Finial (12x48)
    const poleG = this.make.graphics({ x: 0, y: 0 });
    poleG.fillStyle(0x475569, 1);
    poleG.fillRect(2, 44, 8, 4); // Weighted base
    poleG.fillStyle(0x94a3b8, 1);
    poleG.fillRect(5, 4, 2, 42);
    poleG.fillStyle(0xf1f5f9, 1);
    poleG.fillRect(5, 4, 1, 42); // Specular shine
    poleG.fillStyle(0xfacc15, 1); // Gold ball top
    poleG.fillCircle(6, 4, 3);
    poleG.generateTexture('flagpole_stand', 12, 48);
    poleG.destroy();

    // 37. German Pretzel Stand - Brezelstand (56x52)
    const brezG = this.make.graphics({ x: 0, y: 0 });
    // Wooden counter & cart wheels
    brezG.fillStyle(0x78350f, 1);
    brezG.fillRect(4, 24, 48, 24);
    brezG.fillStyle(0xb45309, 1);
    brezG.fillRect(6, 26, 44, 20);
    brezG.fillStyle(0x451a03, 1);
    brezG.fillCircle(12, 46, 6);
    brezG.fillCircle(44, 46, 6);
    // Striped Awning (Red & White)
    for (let ax = 2; ax < 54; ax += 8) {
      brezG.fillStyle(ax % 16 === 2 ? 0xef4444 : 0xffffff, 1);
      brezG.fillRect(ax, 6, 8, 16);
    }
    // Overhead Pretzel Sign
    brezG.fillStyle(0x78350f, 1);
    brezG.fillRect(16, 0, 24, 8);
    brezG.fillStyle(0xfacc15, 1); // Golden Pretzel icon
    brezG.fillRect(22, 1, 12, 6);
    brezG.fillStyle(0x78350f, 1);
    brezG.fillRect(25, 3, 2, 3);
    brezG.fillRect(29, 3, 2, 3);
    // Display of Fresh Golden Pretzels on counter
    brezG.fillStyle(0xd97706, 1);
    brezG.fillRect(10, 28, 10, 8);
    brezG.fillRect(24, 28, 10, 8);
    brezG.fillRect(38, 28, 10, 8);
    brezG.generateTexture('pretzel_stand', 56, 52);
    brezG.destroy();

    // 38. German Flower Stand - Blumenstand (56x52)
    const flowG = this.make.graphics({ x: 0, y: 0 });
    flowG.fillStyle(0x15803d, 1);
    flowG.fillRect(4, 24, 48, 24);
    flowG.fillStyle(0x16a34a, 1);
    flowG.fillRect(6, 26, 44, 20);
    // Green & White striped awning
    for (let ax = 2; ax < 54; ax += 8) {
      flowG.fillStyle(ax % 16 === 2 ? 0x16a34a : 0xffffff, 1);
      flowG.fillRect(ax, 6, 8, 16);
    }
    // Colorful Tulip and Rose crates
    flowG.fillStyle(0xef4444, 1); // Red roses
    flowG.fillRect(8, 28, 10, 6);
    flowG.fillStyle(0xfacc15, 1); // Yellow daffodils
    flowG.fillRect(22, 28, 10, 6);
    flowG.fillStyle(0xa855f7, 1); // Purple violets
    flowG.fillRect(36, 28, 10, 6);
    flowG.generateTexture('flower_stand', 56, 52);
    flowG.destroy();

    // 39. Railway Mountain Tunnel Portal (Eisenbahntunnel - 80x88)
    const tunG = this.make.graphics({ x: 0, y: 0 });
    // Heavy Masonry Arch
    tunG.fillStyle(0x334155, 1);
    tunG.fillRect(0, 0, 80, 88);
    tunG.fillStyle(0x475569, 1);
    tunG.fillRect(4, 4, 72, 16);
    tunG.fillStyle(0x1e293b, 1);
    tunG.fillRoundedRect(6, 16, 68, 72, 16);
    // Deep black tunnel interior
    tunG.fillStyle(0x020617, 1);
    tunG.fillRoundedRect(12, 22, 56, 66, 12);
    // Keystone at arch top
    tunG.fillStyle(0x94a3b8, 1);
    tunG.fillRect(36, 12, 8, 10);
    // Signal Lamps (Green & Red LEDs)
    tunG.fillStyle(0x22c55e, 1);
    tunG.fillCircle(18, 14, 3);
    tunG.fillStyle(0xef4444, 1);
    tunG.fillCircle(62, 14, 3);
    tunG.generateTexture('railway_tunnel_portal', 80, 88);
    tunG.generateTexture('railway_tunnel', 80, 88);
    tunG.destroy();

    // 39b. Mountain Cliff Rock Face (80x320)
    const cliffG = this.make.graphics({ x: 0, y: 0 });
    cliffG.fillStyle(0x1e293b, 1); // Dark granite
    cliffG.fillRect(0, 0, 80, 320);
    cliffG.fillStyle(0x334155, 1);
    cliffG.fillRect(4, 4, 72, 312);
    // Stepped rock ledges
    cliffG.fillStyle(0x475569, 1);
    for (let ly = 16; ly < 310; ly += 28) {
      cliffG.fillRect(6, ly, 68, 6);
    }
    // Pine trees on mountain crest
    cliffG.fillStyle(0x14532d, 1);
    cliffG.fillTriangle(20, 0, 8, 20, 32, 20);
    cliffG.fillTriangle(50, 0, 38, 24, 62, 24);
    cliffG.fillTriangle(70, 0, 58, 20, 80, 20);
    cliffG.generateTexture('railway_cliff_wall', 80, 320);
    cliffG.destroy();

    // 39c. Railway Catenary Wire Mast (24x96)
    const catG = this.make.graphics({ x: 0, y: 0 });
    catG.fillStyle(0x475569, 1);
    catG.fillRect(10, 16, 4, 80); // Lattice steel mast
    catG.fillStyle(0x64748b, 1);
    catG.fillRect(2, 16, 20, 4); // Horizontal cantilever arm
    catG.fillRect(6, 10, 14, 3);
    catG.fillStyle(0xe2e8f0, 1); // White ceramic insulators
    catG.fillCircle(4, 22, 2);
    catG.fillCircle(18, 22, 2);
    catG.generateTexture('catenary_pole', 24, 96);
    catG.destroy();

    // 39d. DB Yellow Ticket Validator (Fahrschein-Entwerter - 16x32)
    const valG = this.make.graphics({ x: 0, y: 0 });
    valG.fillStyle(0x475569, 1);
    valG.fillRect(6, 16, 4, 16); // Steel post
    valG.fillStyle(0xeab308, 1); // Yellow DB box
    valG.fillRoundedRect(2, 2, 12, 16, 2);
    valG.fillStyle(0x020617, 1); // Stamping slot
    valG.fillRect(4, 8, 8, 2);
    valG.generateTexture('ticket_validator', 16, 32);
    valG.destroy();

    // 40. Schwarzwald Pine Tree (44x64)
    const pineG = this.make.graphics({ x: 0, y: 0 });
    // Dark brown trunk
    pineG.fillStyle(0x3b2314, 1);
    pineG.fillRect(19, 48, 6, 16);
    // Layered needle tiers (deep forest greens)
    pineG.fillStyle(0x14532d, 1);
    pineG.fillTriangle(22, 30, 2, 52, 42, 52);
    pineG.fillStyle(0x166534, 1);
    pineG.fillTriangle(22, 18, 6, 38, 38, 38);
    pineG.fillStyle(0x15803d, 1);
    pineG.fillTriangle(22, 4, 10, 26, 34, 26);
    pineG.generateTexture('pine_tree', 44, 64);
    pineG.destroy();

    // 41. Geranium Planter Box (28x14)
    const planG = this.make.graphics({ x: 0, y: 0 });
    planG.fillStyle(0x475569, 1);
    planG.fillRect(2, 6, 24, 8);
    planG.fillStyle(0x64748b, 1);
    planG.fillRect(3, 7, 22, 6);
    planG.fillStyle(0x15803d, 1); // Leaves
    planG.fillRect(4, 2, 20, 5);
    planG.fillStyle(0xef4444, 1); // Red Geraniums
    planG.fillRect(6, 1, 4, 4);
    planG.fillRect(18, 1, 4, 4);
    planG.fillStyle(0xfacc15, 1); // Yellow accent
    planG.fillRect(12, 2, 4, 3);
    planG.generateTexture('planter_box', 28, 14);
    planG.destroy();

    // 42. Ornate Carved Stone Town Fountain (72x72)
    const founG = this.make.graphics({ x: 0, y: 0 });
    founG.fillStyle(0x334155, 1);
    founG.fillRoundedRect(0, 0, 72, 72, 14);
    founG.fillStyle(0x64748b, 1);
    founG.fillRoundedRect(4, 4, 64, 64, 10);
    founG.fillStyle(0x94a3b8, 1);
    founG.fillRoundedRect(6, 6, 60, 60, 8);
    founG.fillStyle(0x0284c7, 1); // Deep water
    founG.fillRect(10, 10, 52, 52);
    founG.fillStyle(0x38bdf8, 1); // Sparkling water
    founG.fillRect(14, 14, 44, 44);
    founG.fillStyle(0xbae6fd, 1);
    founG.fillRect(18, 18, 12, 12);
    founG.fillRect(42, 42, 12, 12);
    // Center carved stone spout
    founG.fillStyle(0x475569, 1);
    founG.fillRect(30, 30, 12, 12);
    founG.fillStyle(0xffffff, 1); // Fountain spray
    founG.fillRect(34, 34, 4, 4);
    founG.generateTexture('fountain_ornate', 72, 72);
    founG.destroy();

    // 43. Bäcker Schmidt (32x44 - White Toque & Golden Pretzel)
    const bkrG = this.make.graphics({ x: 0, y: 0 });
    bkrG.fillStyle(0xffffff, 1); // Tall baker's toque
    bkrG.fillRect(10, 2, 12, 10);
    bkrG.fillRect(8, 8, 16, 4);
    bkrG.fillStyle(0xf3c28a, 1);
    bkrG.fillRect(10, 12, 12, 8);
    bkrG.fillStyle(0x0f172a, 1);
    bkrG.fillRect(12, 14, 2, 2);
    bkrG.fillRect(18, 14, 2, 2);
    bkrG.fillStyle(0xfb7185, 1);
    bkrG.fillRect(10, 17, 3, 1);
    bkrG.fillRect(19, 17, 3, 1);
    // White Chef Coat & Apron
    bkrG.fillStyle(0xffffff, 1);
    bkrG.fillRect(8, 20, 16, 14);
    bkrG.fillStyle(0x3b82f6, 1); // Striped apron strings
    bkrG.fillRect(10, 28, 12, 1);
    // Golden Pretzel held in hand
    bkrG.fillStyle(0xd97706, 1);
    bkrG.fillRect(20, 24, 8, 6);
    bkrG.fillStyle(0xffffff, 1);
    bkrG.fillRect(22, 26, 2, 2);
    bkrG.fillRect(25, 26, 2, 2);
    // Brown Trousers & Shoes
    bkrG.fillStyle(0x78350f, 1);
    bkrG.fillRect(10, 34, 5, 6);
    bkrG.fillRect(17, 34, 5, 6);
    bkrG.fillStyle(0x451a03, 1);
    bkrG.fillRect(9, 40, 6, 4);
    bkrG.fillRect(17, 40, 6, 4);
    bkrG.generateTexture('npc_baker', 32, 44);
    bkrG.destroy();

    // 44. Bibliothekarin Frau Müller (32x44 - Cardigan & German Dictionary)
    const libG2 = this.make.graphics({ x: 0, y: 0 });
    libG2.fillStyle(0x382212, 1); // Hair in bun
    libG2.fillCircle(16, 6, 6);
    libG2.fillRect(9, 6, 14, 6);
    libG2.fillStyle(0xf3c28a, 1);
    libG2.fillRect(10, 10, 12, 8);
    libG2.fillStyle(0x78350f, 1); // Round Glasses
    libG2.fillRect(11, 12, 4, 3);
    libG2.fillRect(17, 12, 4, 3);
    libG2.fillRect(15, 13, 2, 1);
    // Green Cardigan
    libG2.fillStyle(0x15803d, 1);
    libG2.fillRect(8, 18, 16, 12);
    libG2.fillStyle(0xffffff, 1);
    libG2.fillRect(14, 18, 4, 6);
    // German Dictionary in hands (Red book with gold lettering)
    libG2.fillStyle(0xb91c1c, 1);
    libG2.fillRect(18, 22, 8, 10);
    libG2.fillStyle(0xfacc15, 1);
    libG2.fillRect(20, 24, 4, 4);
    // Skirt & Shoes
    libG2.fillStyle(0x475569, 1);
    libG2.fillRect(10, 30, 12, 8);
    libG2.fillStyle(0x1e293b, 1);
    libG2.fillRect(10, 38, 5, 4);
    libG2.fillRect(17, 38, 5, 4);
    libG2.generateTexture('npc_librarian', 32, 44);
    libG2.destroy();

    // 45. Frau Weber (32x44 - Museum Curator with Burgundy Coat & Clipboard)
    const curG = this.make.graphics({ x: 0, y: 0 });
    curG.fillStyle(0x581c87, 1); // Dark hair
    curG.fillRect(9, 4, 14, 8);
    curG.fillStyle(0xf3c28a, 1);
    curG.fillRect(10, 10, 12, 8);
    curG.fillStyle(0x0f172a, 1);
    curG.fillRect(12, 13, 2, 2);
    curG.fillRect(18, 13, 2, 2);
    // Burgundy Trench Coat
    curG.fillStyle(0x831843, 1);
    curG.fillRect(8, 18, 16, 14);
    curG.fillStyle(0x9d174d, 1);
    curG.fillRect(10, 18, 12, 12);
    // Clipboard with artifact list
    curG.fillStyle(0x78350f, 1);
    curG.fillRect(18, 22, 8, 10);
    curG.fillStyle(0xffffff, 1);
    curG.fillRect(19, 23, 6, 8);
    // Shoes
    curG.fillStyle(0x1e293b, 1);
    curG.fillRect(10, 36, 5, 6);
    curG.fillRect(17, 36, 5, 6);
    curG.generateTexture('npc_curator', 32, 44);
    curG.destroy();

    // 46. Opa Heinrich - Elder Bavarian Townsperson with Alpine Hat & Cane
    // Down walk frames (32x44)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Loden Alpine Hat with red Gamsbart feather
      g.fillStyle(0x14532d, 1);
      g.fillRect(8, 2, 16, 6);
      g.fillRect(6, 7, 20, 3);
      g.fillStyle(0x0f172a, 1); // Hat band
      g.fillRect(8, 6, 16, 2);
      g.fillStyle(0xef4444, 1); // Red feather
      g.fillRect(19, 0, 2, 5);
      // Face with rosy cheeks & bushy white mustache
      g.fillStyle(0xfbcfe8, 1);
      g.fillRect(10, 10, 12, 8);
      g.fillStyle(0x0f172a, 1); // Eyes
      g.fillRect(12, 12, 2, 2);
      g.fillRect(18, 12, 2, 2);
      g.fillStyle(0xf8fafc, 1); // Bushy white mustache & beard
      g.fillRect(11, 14, 10, 4);
      g.fillRect(12, 17, 8, 3);
      // Forest green loden cardigan over cream shirt
      g.fillStyle(0x166534, 1);
      g.fillRect(8, 20, 16, 12);
      g.fillStyle(0xfef08a, 1);
      g.fillRect(14, 20, 4, 6);
      // Wooden walking cane
      g.fillStyle(0x78350f, 1);
      const caneY = f === 1 ? 24 : 26;
      g.fillRect(25, caneY, 2, 16);
      g.fillStyle(0xfacc15, 1); // Brass crook handle
      g.fillRect(23, caneY - 2, 4, 3);
      // Trousers & boots with walking cadence
      g.fillStyle(0x451a03, 1);
      if (f === 1) {
        g.fillRect(9, 32, 5, 8);
        g.fillRect(18, 30, 5, 10);
      } else if (f === 2) {
        g.fillRect(9, 30, 5, 10);
        g.fillRect(18, 32, 5, 8);
      } else {
        g.fillRect(10, 32, 5, 9);
        g.fillRect(17, 32, 5, 9);
      }
      g.fillStyle(0x1c1917, 1); // Shoes
      g.fillRect(f === 1 ? 8 : 9, 40, 6, 4);
      g.fillRect(f === 2 ? 18 : 17, 40, 6, 4);
      g.generateTexture(`opa_walk_down_${f}`, 32, 44);
      if (f === 0) g.generateTexture('opa_idle', 32, 44);
      g.destroy();
    }

    // Opa Up walk frames (32x44)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Back of Alpine hat with feather
      g.fillStyle(0x14532d, 1);
      g.fillRect(8, 2, 16, 8);
      g.fillRect(6, 8, 20, 3);
      g.fillStyle(0xef4444, 1);
      g.fillRect(19, 0, 2, 5);
      // White hair nape
      g.fillStyle(0xf8fafc, 1);
      g.fillRect(10, 11, 12, 8);
      // Back of green cardigan
      g.fillStyle(0x166534, 1);
      g.fillRect(8, 19, 16, 13);
      // Cane held at side
      g.fillStyle(0x78350f, 1);
      g.fillRect(6, f === 1 ? 24 : 26, 2, 16);
      // Trousers & boots
      g.fillStyle(0x451a03, 1);
      g.fillRect(10, 32, 5, 8);
      g.fillRect(17, 32, 5, 8);
      g.fillStyle(0x1c1917, 1);
      g.fillRect(9, 40, 6, 4);
      g.fillRect(17, 40, 6, 4);
      g.generateTexture(`opa_walk_up_${f}`, 32, 44);
      g.destroy();
    }

    // Opa Side walk frames (32x44)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Hat profile
      g.fillStyle(0x14532d, 1);
      g.fillRect(10, 2, 14, 8);
      g.fillRect(8, 7, 18, 3);
      g.fillStyle(0xef4444, 1);
      g.fillRect(14, 0, 2, 5);
      // Face profile with mustache
      g.fillStyle(0xfbcfe8, 1);
      g.fillRect(12, 10, 10, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(18, 12, 2, 2);
      g.fillStyle(0xf8fafc, 1);
      g.fillRect(17, 15, 6, 4);
      // Cardigan
      g.fillStyle(0x166534, 1);
      g.fillRect(10, 19, 12, 13);
      // Walking cane in front tapping ground
      g.fillStyle(0x78350f, 1);
      const caneOffset = f === 1 ? 22 : f === 2 ? 18 : 20;
      g.fillRect(caneOffset, 24, 2, 17);
      g.fillStyle(0xfacc15, 1);
      g.fillRect(caneOffset - 1, 22, 4, 3);
      // Walking legs
      g.fillStyle(0x451a03, 1);
      if (f === 1) {
        g.fillRect(16, 32, 5, 8);
        g.fillRect(10, 31, 5, 9);
      } else if (f === 2) {
        g.fillRect(18, 31, 5, 9);
        g.fillRect(8, 32, 5, 8);
      } else {
        g.fillRect(13, 32, 6, 9);
      }
      g.fillStyle(0x1c1917, 1);
      g.fillRect(12, 40, 7, 4);
      g.generateTexture(`opa_walk_side_${f}`, 32, 44);
      g.destroy();
    }

    // Opa sitting relaxed on bench (32x44)
    const opaSitG = this.make.graphics({ x: 0, y: 0 });
    opaSitG.fillStyle(0x14532d, 1);
    opaSitG.fillRect(8, 6, 16, 7);
    opaSitG.fillRect(6, 11, 20, 3);
    opaSitG.fillStyle(0xef4444, 1);
    opaSitG.fillRect(19, 4, 2, 5);
    opaSitG.fillStyle(0xfbcfe8, 1);
    opaSitG.fillRect(10, 14, 12, 8);
    opaSitG.fillStyle(0x0f172a, 1);
    opaSitG.fillRect(12, 16, 2, 2);
    opaSitG.fillRect(18, 16, 2, 2);
    opaSitG.fillStyle(0xf8fafc, 1);
    opaSitG.fillRect(11, 18, 10, 4);
    opaSitG.fillStyle(0x166534, 1);
    opaSitG.fillRect(8, 23, 16, 11);
    // Resting hands and cane against bench
    opaSitG.fillStyle(0x78350f, 1);
    opaSitG.fillRect(25, 24, 2, 18);
    opaSitG.fillStyle(0xfacc15, 1);
    opaSitG.fillRect(24, 23, 4, 2);
    // Seated knees
    opaSitG.fillStyle(0x451a03, 1);
    opaSitG.fillRect(9, 34, 14, 6);
    opaSitG.fillStyle(0x1c1917, 1);
    opaSitG.fillRect(10, 40, 5, 4);
    opaSitG.fillRect(17, 40, 5, 4);
    opaSitG.generateTexture('opa_sit_bench', 32, 44);
    opaSitG.destroy();

    // 47. Studentin Lena (30x42 - University Student with Auburn Ponytail & Satchel)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Auburn hair in high ponytail
      g.fillStyle(0x7c2d12, 1);
      g.fillRect(8, 2, 14, 10);
      g.fillCircle(20, 6, 4); // Ponytail
      g.fillStyle(0x38bdf8, 1); // Blue scrunchie
      g.fillRect(18, 5, 3, 3);
      // Face & bright eyes
      g.fillStyle(0xfbcfe8, 1);
      g.fillRect(9, 10, 12, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(11, 12, 2, 2);
      g.fillRect(17, 12, 2, 2);
      // Yellow knitted scarf
      g.fillStyle(0xfacc15, 1);
      g.fillRect(8, 18, 14, 4);
      g.fillRect(15, 21, 4, 4); // Scarf tail
      // Burgundy cable-knit sweater
      g.fillStyle(0x9f1239, 1);
      g.fillRect(8, 22, 14, 10);
      // Crossbody satchel
      g.fillStyle(0x854d0e, 1);
      g.fillRect(10, 24, 5, 6);
      // Blue jeans with stepping animation
      g.fillStyle(0x1d4ed8, 1);
      if (f === 1) {
        g.fillRect(9, 32, 5, 7);
        g.fillRect(16, 31, 5, 8);
      } else if (f === 2) {
        g.fillRect(9, 31, 5, 8);
        g.fillRect(16, 32, 5, 7);
      } else {
        g.fillRect(9, 32, 5, 7);
        g.fillRect(16, 32, 5, 7);
      }
      g.fillStyle(0xffffff, 1); // White sneakers
      g.fillRect(8, 39, 6, 3);
      g.fillRect(16, 39, 6, 3);
      g.generateTexture(`lena_walk_down_${f}`, 30, 42);
      if (f === 0) g.generateTexture('lena_idle', 30, 42);
      g.destroy();
    }

    // Lena Up walk frames (30x42)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Back of head & bouncy ponytail
      g.fillStyle(0x7c2d12, 1);
      g.fillRect(8, 2, 14, 12);
      g.fillCircle(15, 2, 5); // Ponytail top
      g.fillStyle(0x38bdf8, 1);
      g.fillRect(14, 4, 3, 2);
      // Scarf & sweater back
      g.fillStyle(0xfacc15, 1);
      g.fillRect(8, 15, 14, 4);
      g.fillStyle(0x9f1239, 1);
      g.fillRect(8, 19, 14, 13);
      g.fillStyle(0x854d0e, 1);
      g.fillRect(11, 22, 8, 7);
      // Blue jeans
      g.fillStyle(0x1d4ed8, 1);
      g.fillRect(9, 32, 5, 7);
      g.fillRect(16, 32, 5, 7);
      g.fillStyle(0xffffff, 1);
      g.fillRect(8, 39, 6, 3);
      g.fillRect(16, 39, 6, 3);
      g.generateTexture(`lena_walk_up_${f}`, 30, 42);
      g.destroy();
    }

    // Lena Side walk frames (30x42)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x7c2d12, 1);
      g.fillRect(10, 2, 12, 10);
      g.fillCircle(6, 6, 4); // Ponytail swinging back
      g.fillStyle(0xfbcfe8, 1);
      g.fillRect(12, 10, 10, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(18, 12, 2, 2);
      g.fillStyle(0xfacc15, 1);
      g.fillRect(10, 18, 12, 4);
      g.fillStyle(0x9f1239, 1);
      g.fillRect(10, 22, 11, 10);
      g.fillStyle(0x854d0e, 1);
      g.fillRect(13, 24, 7, 7);
      g.fillStyle(0x1d4ed8, 1);
      if (f === 1) {
        g.fillRect(15, 32, 5, 7);
        g.fillRect(10, 31, 5, 8);
      } else if (f === 2) {
        g.fillRect(17, 31, 5, 8);
        g.fillRect(8, 32, 5, 7);
      } else {
        g.fillRect(12, 32, 6, 7);
      }
      g.fillStyle(0xffffff, 1);
      g.fillRect(11, 39, 7, 3);
      g.generateTexture(`lena_walk_side_${f}`, 30, 42);
      g.destroy();
    }

    // Lena Reading Pose (studying German textbook)
    const lenaReadG = this.make.graphics({ x: 0, y: 0 });
    lenaReadG.fillStyle(0x7c2d12, 1);
    lenaReadG.fillRect(8, 2, 14, 10);
    lenaReadG.fillCircle(20, 6, 4);
    lenaReadG.fillStyle(0xfbcfe8, 1);
    lenaReadG.fillRect(9, 10, 12, 8);
    lenaReadG.fillStyle(0x0f172a, 1);
    lenaReadG.fillRect(11, 14, 2, 2); // Looking down at book
    lenaReadG.fillRect(17, 14, 2, 2);
    lenaReadG.fillStyle(0xfacc15, 1);
    lenaReadG.fillRect(8, 18, 14, 4);
    lenaReadG.fillStyle(0x9f1239, 1);
    lenaReadG.fillRect(8, 22, 14, 10);
    // Yellow German vocabulary textbook held open
    lenaReadG.fillStyle(0xfacc15, 1);
    lenaReadG.fillRect(10, 24, 10, 8);
    lenaReadG.fillStyle(0xffffff, 1);
    lenaReadG.fillRect(11, 25, 8, 6);
    lenaReadG.fillStyle(0x1d4ed8, 1);
    lenaReadG.fillRect(9, 32, 5, 7);
    lenaReadG.fillRect(16, 32, 5, 7);
    lenaReadG.fillStyle(0xffffff, 1);
    lenaReadG.fillRect(8, 39, 6, 3);
    lenaReadG.fillRect(16, 39, 6, 3);
    lenaReadG.generateTexture('lena_read', 30, 42);
    lenaReadG.destroy();

    // 48. Kind Max (24x34 - Energetic Boy with Red Cap & Bouncing Ball)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Red backward cap
      g.fillStyle(0xdc2626, 1);
      g.fillRect(6, 2, 12, 6);
      g.fillRect(3, 5, 4, 3); // Backward visor peak
      // Messy brown hair fringe
      g.fillStyle(0x5c3a21, 1);
      g.fillRect(6, 7, 12, 3);
      // Cheerful face
      g.fillStyle(0xfbcfe8, 1);
      g.fillRect(6, 9, 12, 7);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(8, 11, 2, 2);
      g.fillRect(14, 11, 2, 2);
      // Striped yellow & blue shirt
      g.fillStyle(0xfacc15, 1);
      g.fillRect(6, 16, 12, 8);
      g.fillStyle(0x1e3a8a, 1);
      g.fillRect(6, 18, 12, 2);
      g.fillRect(6, 22, 12, 2);
      // Denim shorts & running sneakers
      g.fillStyle(0x2563eb, 1);
      g.fillRect(7, 24, 10, 5);
      g.fillStyle(0xffffff, 1);
      if (f === 1) {
        g.fillRect(6, 29, 4, 4);
        g.fillRect(13, 28, 4, 4);
      } else if (f === 2) {
        g.fillRect(6, 28, 4, 4);
        g.fillRect(13, 29, 4, 4);
      } else {
        g.fillRect(7, 29, 4, 4);
        g.fillRect(13, 29, 4, 4);
      }
      g.generateTexture(`kid_walk_down_${f}`, 24, 34);
      if (f === 0) g.generateTexture('kid_idle', 24, 34);
      g.destroy();
    }

    // Kid side walk (24x34)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xdc2626, 1);
      g.fillRect(6, 2, 12, 6);
      g.fillRect(3, 4, 4, 3);
      g.fillStyle(0xfbcfe8, 1);
      g.fillRect(8, 8, 10, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(14, 10, 2, 2);
      g.fillStyle(0xfacc15, 1);
      g.fillRect(7, 16, 10, 8);
      g.fillStyle(0x1e3a8a, 1);
      g.fillRect(7, 18, 10, 2);
      g.fillRect(7, 22, 10, 2);
      g.fillStyle(0x2563eb, 1);
      g.fillRect(8, 24, 8, 5);
      g.fillStyle(0xffffff, 1);
      if (f === 1) {
        g.fillRect(13, 29, 5, 4);
        g.fillRect(6, 28, 5, 4);
      } else if (f === 2) {
        g.fillRect(14, 28, 5, 4);
        g.fillRect(5, 29, 5, 4);
      } else {
        g.fillRect(9, 29, 6, 4);
      }
      g.generateTexture(`kid_walk_side_${f}`, 24, 34);
      g.destroy();
    }

    // Red playground ball (14x14)
    const ballG = this.make.graphics({ x: 0, y: 0 });
    ballG.fillStyle(0xef4444, 1);
    ballG.fillCircle(7, 7, 6);
    ballG.fillStyle(0xffffff, 0.85);
    ballG.fillRect(2, 6, 10, 2);
    ballG.fillCircle(5, 5, 2); // Highlight
    ballG.generateTexture('playground_ball', 14, 14);
    ballG.destroy();

    // 49. Dackel Bello (28x18 - Sausage Dog with wagging tail)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Reddish brown sausage body
      g.fillStyle(0x9a3412, 1);
      g.fillRoundedRect(4, 6, 18, 8, 3);
      // Floppy dark ear & head
      g.fillCircle(21, 6, 4);
      g.fillStyle(0x78350f, 1); // Ear
      g.fillRect(18, 5, 3, 6);
      // Black button nose & eyes
      g.fillStyle(0x000000, 1);
      g.fillRect(24, 6, 2, 2);
      g.fillRect(20, 5, 1, 1);
      // Green collar with brass bell
      g.fillStyle(0x16a34a, 1);
      g.fillRect(18, 8, 2, 5);
      g.fillStyle(0xfacc15, 1);
      g.fillRect(18, 13, 2, 2);
      // Tail (wagging up/down)
      g.fillStyle(0x9a3412, 1);
      const tailY = f === 1 ? 3 : f === 2 ? 1 : 2;
      g.fillRect(2, tailY, 3, 5);
      // Little trotting paws
      g.fillStyle(0x78350f, 1);
      if (f === 1) {
        g.fillRect(6, 13, 3, 4);
        g.fillRect(17, 14, 3, 3);
      } else if (f === 2) {
        g.fillRect(7, 14, 3, 3);
        g.fillRect(16, 13, 3, 4);
      } else {
        g.fillRect(6, 14, 3, 3);
        g.fillRect(16, 14, 3, 3);
      }
      g.generateTexture(`dog_trot_side_${f}`, 28, 18);
      if (f === 0) g.generateTexture('dog_idle', 28, 18);
      g.destroy();
    }

    // Dog sniffing ground (28x18)
    for (let f = 0; f < 2; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x9a3412, 1);
      g.fillRoundedRect(4, 5, 18, 8, 3);
      // Head lowered to ground
      g.fillCircle(22, 11, 4);
      g.fillStyle(0x78350f, 1);
      g.fillRect(19, 8, 3, 6);
      g.fillStyle(0x000000, 1);
      g.fillRect(25, 12, 2, 2);
      // Tail pointed straight up & wagging
      g.fillStyle(0x9a3412, 1);
      g.fillRect(2, f === 0 ? 0 : 2, 2, 6);
      // Paws
      g.fillStyle(0x78350f, 1);
      g.fillRect(6, 13, 3, 4);
      g.fillRect(16, 13, 3, 4);
      g.generateTexture(`dog_sniff_${f}`, 28, 18);
      g.destroy();
    }

    // 50. Katze Mimi (22x16 - Ginger Tabby sleeping on wall & stretching)
    for (let f = 0; f < 2; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Sleeping loaf pose with subtle breathing
      const breathH = f === 0 ? 0 : 1;
      g.fillStyle(0xea580c, 1);
      g.fillRoundedRect(3, 5 - breathH, 15, 9 + breathH, 4);
      // Ginger stripes
      g.fillStyle(0x9a3412, 1);
      g.fillRect(7, 4 - breathH, 2, 7);
      g.fillRect(11, 4 - breathH, 2, 7);
      // Pointed ears
      g.fillStyle(0xea580c, 1);
      g.fillTriangle(14, 4 - breathH, 16, 0 - breathH, 18, 4 - breathH);
      g.fillTriangle(10, 4 - breathH, 12, 0 - breathH, 14, 4 - breathH);
      // White paws tucked
      g.fillStyle(0xffffff, 1);
      g.fillRect(5, 13, 4, 2);
      g.fillRect(11, 13, 4, 2);
      // Tail curled around
      g.fillStyle(0xea580c, 1);
      g.fillRect(1, 8 - breathH, 3, 5);
      g.generateTexture(`cat_sleep_${f}`, 22, 16);
      g.destroy();
    }

    // Awake sitting cat (22x16)
    for (let f = 0; f < 2; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xea580c, 1);
      g.fillRoundedRect(4, 5, 13, 10, 3);
      // Head upright
      g.fillCircle(14, 5, 4);
      g.fillTriangle(12, 3, 13, 0, 15, 3);
      g.fillTriangle(15, 3, 16, 0, 18, 3);
      // Green eyes
      g.fillStyle(0x22c55e, 1);
      g.fillRect(13, 4, 2, 2);
      g.fillRect(16, 4, 2, 2);
      // White muzzle & pink nose
      g.fillStyle(0xffffff, 1);
      g.fillRect(14, 6, 3, 2);
      g.fillStyle(0xf43f5e, 1);
      g.fillRect(15, 6, 1, 1);
      // Tail swish
      g.fillStyle(0xea580c, 1);
      const tailX = f === 0 ? 1 : 2;
      g.fillRect(tailX, 4, 2, 8);
      // Paws
      g.fillStyle(0xffffff, 1);
      g.fillRect(7, 14, 3, 2);
      g.fillRect(11, 14, 3, 2);
      g.generateTexture(`cat_awake_${f}`, 22, 16);
      if (f === 0) g.generateTexture('cat_idle', 22, 16);
      g.destroy();
    }

    // 51. Pigeons / Sparrows (16x14)
    // Pecking ground frames
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Slate grey body
      g.fillStyle(0x64748b, 1);
      g.fillRoundedRect(2, 4, 10, 7, 3);
      // Iridescent teal neck sheen
      g.fillStyle(0x0d9488, 1);
      g.fillRect(8, 4, 3, 3);
      // Dark wing feathers
      g.fillStyle(0x334155, 1);
      g.fillRect(3, 5, 6, 4);
      // Head & yellow/white beak (pecking downwards in f=1)
      g.fillStyle(0x64748b, 1);
      const headY = f === 1 ? 8 : 4;
      g.fillCircle(11, headY, 2.5);
      g.fillStyle(0xfacc15, 1);
      g.fillRect(13, headY, 2, 1.5);
      // Pink legs
      g.fillStyle(0xf43f5e, 1);
      g.fillRect(5, 11, 1, 3);
      g.fillRect(8, 11, 1, 3);
      g.generateTexture(`pigeon_peck_${f}`, 16, 14);
      g.destroy();
    }

    // Flying bird frames (18x16)
    for (let f = 0; f < 3; f++) {
      const g = this.make.graphics({ x: 0, y: 0 });
      // Body
      g.fillStyle(0x64748b, 1);
      g.fillRoundedRect(6, 6, 6, 5, 2);
      g.fillStyle(0x0d9488, 1);
      g.fillRect(9, 6, 2, 2);
      // Wings flapping up (f=0), horizontal (f=1), down (f=2)
      g.fillStyle(0x475569, 1);
      if (f === 0) {
        // Wings pointing high up
        g.fillTriangle(6, 6, 2, 0, 10, 6);
        g.fillTriangle(9, 6, 14, 0, 12, 6);
      } else if (f === 1) {
        // Wings horizontal
        g.fillRect(0, 7, 18, 3);
      } else {
        // Wings flapping down
        g.fillTriangle(6, 8, 2, 14, 10, 8);
        g.fillTriangle(9, 8, 14, 14, 12, 8);
      }
      g.generateTexture(`pigeon_fly_${f}`, 18, 16);
      g.destroy();
    }

    // 52. Soft Drop Shadows (Semi-transparent black ellipses with radial fade)
    // Small Shadow (20x10) - for animals, birds & small props
    const shSmall = this.make.graphics({ x: 0, y: 0 });
    shSmall.fillStyle(0x000000, 0.4);
    shSmall.fillEllipse(10, 5, 18, 8);
    shSmall.fillStyle(0x000000, 0.2);
    shSmall.fillEllipse(10, 5, 20, 10);
    shSmall.generateTexture('shadow_small', 20, 10);
    shSmall.destroy();

    // Medium Shadow (28x12) - for Player, Lukas, Herr Braun, Townsfolk
    const shMed = this.make.graphics({ x: 0, y: 0 });
    shMed.fillStyle(0x000000, 0.42);
    shMed.fillEllipse(14, 6, 24, 9);
    shMed.fillStyle(0x000000, 0.2);
    shMed.fillEllipse(14, 6, 28, 12);
    shMed.generateTexture('shadow_medium', 28, 12);
    shMed.destroy();

    // Large Shadow (46x16) - for Trees, Stalls, large rocks
    const shLrg = this.make.graphics({ x: 0, y: 0 });
    shLrg.fillStyle(0x000000, 0.42);
    shLrg.fillEllipse(23, 8, 40, 12);
    shLrg.fillStyle(0x000000, 0.2);
    shLrg.fillEllipse(23, 8, 46, 16);
    shLrg.generateTexture('shadow_large', 46, 16);
    shLrg.destroy();

    // Wide Shadow (56x14) - for Benches, Flowerbeds, Bike Racks
    const shWide = this.make.graphics({ x: 0, y: 0 });
    shWide.fillStyle(0x000000, 0.4);
    shWide.fillRoundedRect(3, 2, 50, 10, 5);
    shWide.fillStyle(0x000000, 0.2);
    shWide.fillRoundedRect(0, 0, 56, 14, 7);
    shWide.generateTexture('shadow_wide', 56, 14);
    shWide.destroy();

    // 53. Street Lantern Warm Light Glow Halo (80x80 Radial Gradient)
    const haloG = this.make.graphics({ x: 0, y: 0 });
    const haloSteps = 8;
    for (let r = haloSteps; r >= 1; r--) {
      const radius = r * 5;
      const alpha = (1 - r / haloSteps) * 0.4;
      haloG.fillStyle(r <= 3 ? 0xfef08a : 0xf59e0b, alpha);
      haloG.fillCircle(40, 40, radius);
    }
    // Bright center incandescent core
    haloG.fillStyle(0xffffff, 0.85);
    haloG.fillCircle(40, 40, 4);
    haloG.generateTexture('lantern_glow_halo', 80, 80);
    haloG.destroy();

    // 54. Retro Screen Vignette (512x512 scalable texture)
    const vigG = this.make.graphics({ x: 0, y: 0 });
    const vSteps = 16;
    for (let i = 0; i < vSteps; i++) {
      const alpha = Math.pow(i / (vSteps - 1), 2.2) * 0.48;
      vigG.fillStyle(0x0f172a, alpha);
      const inset = (vSteps - 1 - i) * 16;
      vigG.fillRect(0, 0, 512, inset);
      vigG.fillRect(0, 512 - inset, 512, inset);
      vigG.fillRect(0, 0, inset, 512);
      vigG.fillRect(512 - inset, 0, inset, 512);
    }
    vigG.generateTexture('screen_vignette', 512, 512);
    vigG.destroy();

    // 55. Golden Sparkle Star (12x12)
    const spkG = this.make.graphics({ x: 0, y: 0 });
    spkG.fillStyle(0xfacc15, 1);
    spkG.fillTriangle(6, 0, 4, 6, 8, 6);
    spkG.fillTriangle(6, 12, 4, 6, 8, 6);
    spkG.fillTriangle(0, 6, 6, 4, 6, 8);
    spkG.fillTriangle(12, 6, 6, 4, 6, 8);
    spkG.fillStyle(0xffffff, 1);
    spkG.fillCircle(6, 6, 2);
    spkG.generateTexture('sparkle_star', 12, 12);
    spkG.destroy();

    // 56. Bush Rustle Leaf Particle (8x8)
    const lfG = this.make.graphics({ x: 0, y: 0 });
    lfG.fillStyle(0x16a34a, 1);
    lfG.fillRoundedRect(1, 1, 6, 6, 2);
    lfG.fillStyle(0x4ade80, 0.8);
    lfG.fillRect(2, 2, 2, 2);
    lfG.generateTexture('leaf_particle', 8, 8);
    lfG.destroy();
  }

  /**
   * Determine if a tile coordinate is on cobblestone or paved pathway
   */
  private isPathTile(x: number, y: number): boolean {
    const centerTileX = 22;
    const centerTileY = 17;

    // Railway corridor is never a town cobblestone path
    if (y >= 25 && y <= 31) return false;

    // 1. Central Marktplatz Plaza
    const inPlaza = Math.abs(x - centerTileX) <= 5 && Math.abs(y - centerTileY) <= 4;
    if (inPlaza) return true;

    // 2. North Avenue (towards Rathaus)
    const inNorthAvenue = Math.abs(x - centerTileX) <= 1 && y >= 4 && y <= centerTileY;
    if (inNorthAvenue) return true;

    // 3. South Avenue (towards Bahnhof & Café)
    const inSouthAvenue = Math.abs(x - centerTileX) <= 1 && y >= centerTileY && y <= 24;
    if (inSouthAvenue) return true;

    // 4. West Avenue (towards Bäckerei & Sprachschule)
    const inWestAvenue = y >= 15 && y <= 17 && x >= 4 && x <= centerTileX;
    if (inWestAvenue) return true;

    // 5. East Avenue (towards Bibliothek, Bridge & Geschichtsmuseum)
    const inEastAvenue = y >= 15 && y <= 17 && x >= centerTileX && x <= 39;
    if (inEastAvenue) return true;

    // 6. Northwest Promenade to Sprachschule (shifted west to avoid Bäckerei)
    const inSchoolPath = (x >= 4 && x <= 7 && y >= 9 && y <= 16) || (x >= 6 && x <= 11 && y >= 13 && y <= 16);
    if (inSchoolPath) return true;

    // 7. Bäckerei Terrace Approach
    const inBakeryPath = x >= 14 && x <= 17 && y >= 11 && y <= 15;
    if (inBakeryPath) return true;

    // 8. Northeast Promenade to Geschichtsmuseum
    const inMuseumPath = x >= 34 && x <= 38 && y >= 10 && y <= 16;
    if (inMuseumPath) return true;

    // 9. Southwest Promenade to Bahnhof Concourse & Platform 1 Approach
    const inBahnhofPath = x >= 8 && x <= 14 && y >= 21 && y <= 24;
    if (inBahnhofPath) return true;

    return false;
  }

  /**
   * Render organic Nintendo/GBA-style town terrain, path edges, stream & rich props (Phase 1)
   */
  private renderWorldMap(mapWidth: number, mapHeight: number, tileSize: number) {
    const centerTileX = Math.floor(mapWidth / 2); // 22
    const centerTileY = Math.floor(mapHeight / 2); // 17

    // Stream & Pond Water Zone (Northeast Garden)
    const isWaterTile = (x: number, y: number): boolean => {
      // Exclude row 16 columns 32..33 because that's where the wooden bridge crosses!
      if (y === 16 && (x === 32 || x === 33)) return false;
      // Stream channel (x: 32..33, y: 11..21)
      const isStream = (x === 32 || x === 33) && y >= 11 && y <= 21;
      // Pond basin (x: 31..35, y: 18..21)
      const isPond = x >= 31 && x <= 35 && y >= 18 && y <= 21;
      return isStream || isPond;
    };

    // Main Cobblestone Roads
    const isPathTile = (x: number, y: number): boolean => this.isPathTile(x, y);

    // Soft Dirt Trail (Plaza rim and side paths to gardens)
    const isDirtTile = (x: number, y: number): boolean => {
      if (isPathTile(x, y) || isWaterTile(x, y)) return false;
      // Railway zone is handled separately with railway ballast
      if (y >= 25 && y <= 31) return false;

      // 1. Soft organic dirt rim surrounding the central plaza
      const dx = Math.abs(x - centerTileX);
      const dy = Math.abs(y - centerTileY);
      const isPlazaRim = (dx === 6 && dy >= 2 && dy <= 4) || (dy === 5 && dx >= 2 && dx <= 5);
      if (isPlazaRim) return true;

      // 2. Side dirt trail between Bäckerei and Sprachschule gardens
      if (x >= 9 && x <= 12 && y >= 10 && y <= 13) return true;

      // 3. Side dirt trail to Bibliothek reading garden
      if (x >= 28 && x <= 31 && y >= 12 && y <= 14) return true;

      // 4. Side dirt trail to Café garden patio
      if (x >= 23 && x <= 28 && y >= 22 && y <= 24) return true;

      // 5. Meandering path around pond shore
      if (x >= 35 && x <= 37 && y >= 16 && y <= 20) return true;

      // 6. Dirt trail behind Rathaus
      if (y === 4 && x >= 18 && x <= 26) return true;

      return false;
    };

    // Central Ornate Inlay Diamond on Plaza
    const isOrnatePlaza = (x: number, y: number): boolean => {
      const dx = Math.abs(x - centerTileX);
      const dy = Math.abs(y - centerTileY);
      return dx <= 3 && dy <= 3 && !(dx === 0 && dy === 0);
    };

    // 1. Draw Multi-Layer Ground Grid
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const posX = x * tileSize + tileSize / 2;
        const posY = y * tileSize + tileSize / 2;

        // Dedicated Railway Corridor (rows 25..31) - Clean crushed stone ballast with zero grass bleed
        if (y >= 25 && y <= 31) {
          this.add.image(posX, posY, 'ballast_tile').setDepth(0);
          continue;
        }

        if (isWaterTile(x, y)) {
          // Water tile
          const isLily = (x * 7 + y * 13) % 11 === 0;
          const isShallow = x === 31 || x === 35 || y === 11 || y === 21;
          const wKey = isLily ? 'water_lilypad' : isShallow ? 'water_pond_shallow' : 'water_pond_deep';
          const wTile = this.add.image(posX, posY, wKey);
          wTile.setDepth(0);
          this.waterTiles.push(wTile);
        } else if (isPathTile(x, y)) {
          // Cobblestone with organic variety
          if (isOrnatePlaza(x, y)) {
            this.add.image(posX, posY, 'cobble_ornate').setDepth(0);
          } else {
            const h = (x * 7 + y * 19) % 20;
            let cKey = 'cobble_v1';
            if (h === 0 || h === 1) cKey = 'cobble_mossy';
            else if (h === 2 || h === 3) cKey = 'cobble_cracked';
            else if (h === 4) cKey = 'cobble_dark';
            this.add.image(posX, posY, cKey).setDepth(0);
          }

          // Autotiled grass blade fringe overlays extending over cobblestone borders
          const topIsGrass = y > 0 && !isPathTile(x, y - 1);
          const bottomIsGrass = y < mapHeight - 1 && !isPathTile(x, y + 1);
          const leftIsGrass = x > 0 && !isPathTile(x - 1, y);
          const rightIsGrass = x < mapWidth - 1 && !isPathTile(x + 1, y);

          if (topIsGrass) this.add.image(posX, posY, 'grass_edge_top').setDepth(1);
          if (bottomIsGrass) this.add.image(posX, posY, 'grass_edge_bottom').setDepth(1);
          if (leftIsGrass) this.add.image(posX, posY, 'grass_edge_left').setDepth(1);
          if (rightIsGrass) this.add.image(posX, posY, 'grass_edge_right').setDepth(1);

          // Rounded corners
          if (topIsGrass && leftIsGrass) this.add.image(posX, posY, 'grass_corner_tl').setDepth(2);
          if (topIsGrass && rightIsGrass) this.add.image(posX, posY, 'grass_corner_tr').setDepth(2);
          if (bottomIsGrass && leftIsGrass) this.add.image(posX, posY, 'grass_corner_bl').setDepth(2);
          if (bottomIsGrass && rightIsGrass) this.add.image(posX, posY, 'grass_corner_br').setDepth(2);
        } else if (isDirtTile(x, y)) {
          // Dirt / gravel trail
          const isPlazaBorder = Math.abs(x - centerTileX) === 6 || Math.abs(y - centerTileY) === 5;
          const dKey = isPlazaBorder ? 'plaza_dirt_rim' : 'dirt_trail';
          this.add.image(posX, posY, dKey).setDepth(0);
        } else {
          // Varied meadow grass tilemap (3-4 variants + pebbles + wildflowers)
          const hash = Math.abs((x * 23 + y * 47) ^ (x * 11 + y * 7));
          let gKey = 'grass_v1';
          if (hash % 13 === 0) gKey = 'grass_wildflowers';
          else if (hash % 17 === 0) gKey = 'grass_pebbles';
          else if (hash % 4 === 1) gKey = 'grass_v2';
          else if (hash % 4 === 2) gKey = 'grass_v3';
          else if (hash % 4 === 3) gKey = 'grass_v4';

          this.add.image(posX, posY, gKey).setDepth(0);
        }
      }
    }

    // 2. Wooden Footbridge across Stream at East Avenue (x: 33, y: 16)
    const bridgeX = 33 * tileSize;
    const bridgeY = 16 * tileSize + 16;
    const bridge = this.add.image(bridgeX, bridgeY, 'bridge_wood');
    bridge.setOrigin(0.5, 0.5);
    bridge.setDepth(bridgeY);

    // River rocks along the pond and stream banks
    const pondRocks = [
      { x: 31 * tileSize + 6, y: 19 * tileSize + 4, large: true },
      { x: 35 * tileSize + 22, y: 20 * tileSize + 14, large: true },
      { x: 31 * tileSize + 10, y: 21 * tileSize + 20, large: false },
      { x: 34 * tileSize + 18, y: 14 * tileSize + 10, large: false },
      { x: 32 * tileSize + 4, y: 12 * tileSize + 8, large: false },
    ];
    pondRocks.forEach((rk) => {
      this.addTownProp(
        rk.x,
        rk.y,
        rk.large ? 'rock_boulder' : 'rock_small',
        rk.large ? 28 : 16,
        rk.large ? 22 : 12,
        false
      );
    });

    // 3. Central Town Fountain
    this.fountain = this.physics.add.staticImage(
      centerTileX * tileSize,
      centerTileY * tileSize,
      'fountain_ornate'
    );
    this.fountain.setSize(64, 48);
    this.fountain.setOffset(4, 18);
    this.fountain.setDepth(centerTileY * tileSize);

    // 4. Decorative Street Lanterns
    const lanternCoords = [
      { x: (centerTileX - 5) * tileSize + 16, y: (centerTileY - 4) * tileSize },
      { x: (centerTileX + 5) * tileSize + 16, y: (centerTileY - 4) * tileSize },
      { x: (centerTileX - 5) * tileSize + 16, y: (centerTileY + 4) * tileSize },
      { x: (centerTileX + 5) * tileSize + 16, y: (centerTileY + 4) * tileSize },
      { x: 240, y: 350 }, // Near Sprachschule
      { x: 36 * tileSize + 16, y: 11 * tileSize }, // Near Museum
      { x: 28 * tileSize + 16, y: 15 * tileSize }, // Near Bridge approach
      { x: 420, y: 390 }, // Near Bäckerei
    ];

    this.streetLamps = [];
    lanternCoords.forEach((l) => {
      // Soft base drop shadow
      const lampShadow = this.add.image(l.x, l.y + 12, 'shadow_medium');
      lampShadow.setOrigin(0.5, 0.5);
      lampShadow.setDepth(l.y - 1);

      const lamp = this.physics.add.staticImage(l.x, l.y, 'street_lantern');
      lamp.setSize(18, 20);
      lamp.setOffset(7, 26);
      lamp.setDepth(l.y);
      this.streetLamps.push(lamp);

      // Warm radial incandescent light glow halo
      const glow = this.add.image(l.x, l.y - 18, 'lantern_glow_halo');
      glow.setOrigin(0.5, 0.5);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(1005);
      glow.setAlpha(0.72);
      this.lampHalos.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.58, to: 0.88 },
        scale: { from: 0.95, to: 1.06 },
        duration: Phaser.Math.Between(1600, 2400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // 5. Wooden Fences Enclosing Gardens & Backyards
    // Backyard of Bäckerei
    for (let fx = 430; fx <= 530; fx += 32) {
      this.addFence(fx, 280, false);
    }
    this.addFence(414, 280, true);

    // Backyard of Sprachschule
    for (let fx = 100; fx <= 220; fx += 32) {
      this.addFence(fx, 210, false);
    }
    this.addFence(84, 210, true);

    // Backyard of Bibliothek
    for (let fx = 930; fx <= 1010; fx += 32) {
      this.addFence(fx, 345, false);
    }
    this.addFence(1026, 345, true);

    // 6. Park Benches
    const benches = [
      { x: 600, y: 465 }, // Marktplatz North-West
      { x: 808, y: 465 }, // Marktplatz North-East
      { x: 600, y: 615 }, // Marktplatz South-West
      { x: 808, y: 615 }, // Marktplatz South-East
      { x: 610, y: 260 }, // Rathaus Garden West
      { x: 798, y: 260 }, // Rathaus Garden East
      { x: 1024, y: 400 }, // Bibliothek Reading Nook
      { x: 1150, y: 560 }, // Pond Shore Viewing Bench
      { x: 340, y: 340 }, // West Garden Alleyway Bench between School & Bakery
      { x: 130, y: 350 }, // Sprachschule Front Garden Bench
      { x: 870, y: 735 }, // Café Patio West
      { x: 970, y: 735 }, // Café Patio East
    ];
    benches.forEach((b) => {
      this.addTownProp(b.x, b.y, 'bench_green', 40, 26, true);
    });

    // 7. Bicycle Rack outside Sprachschule
    this.addTownProp(130, 360, 'bike_rack', 44, 26, true);

    // 8. German Deutsche Post Mailboxes
    this.addTownProp(880, 410, 'mailbox_deutsche_post', 16, 28, true);
    this.addTownProp(330, 765, 'mailbox_deutsche_post', 16, 28, true);

    // 9. Carved Stone Flower Troughs
    const flowerTroughs = [
      { x: 640, y: 256 }, // Rathaus West
      { x: 768, y: 256 }, // Rathaus East
      { x: 640, y: 465 }, // Marktplatz West
      { x: 768, y: 465 }, // Marktplatz East
      { x: 440, y: 385 }, // Bäckerei Patio
      { x: 890, y: 750 }, // Café Patio
      { x: 940, y: 415 }, // Bibliothek
    ];
    flowerTroughs.forEach((ft) => {
      this.addTownProp(ft.x, ft.y, 'flower_bed_stone', 48, 24, true);
    });

    // 10. Supply Crates & Oak Barrels
    this.addTownProp(540, 385, 'crate_wooden', 22, 22, true);
    this.addTownProp(555, 387, 'crate_wooden', 22, 22, true);
    this.addTownProp(570, 389, 'barrel_oak', 20, 26, true);
    this.addTownProp(865, 725, 'barrel_oak', 20, 26, true);
    this.addTownProp(975, 725, 'barrel_oak', 20, 26, true);
    this.addTownProp(230, 760, 'crate_wooden', 22, 22, true);
    this.addTownProp(245, 762, 'crate_wooden', 22, 22, true);

    // 11. Terracotta Potted Ferns
    const pottedFerns = [
      { x: 140, y: 325 }, // Sprachschule Entrance
      { x: 450, y: 375 }, // Bäckerei
      { x: 910, y: 410 }, // Bibliothek
      { x: 880, y: 715 }, // Café West
      { x: 960, y: 715 }, // Café East
      { x: 1085, y: 350 }, // Museum Portico West
      { x: 1155, y: 350 }, // Museum Portico East
    ];
    pottedFerns.forEach((pf) => {
      this.addTownProp(pf.x, pf.y, 'potted_fern', 18, 24, false);
    });

    // 12. Direction Signposts
    this.addTownProp(704, 620, 'signpost_town', 24, 36, true);
    this.addTownProp(320, 360, 'signpost_town', 24, 36, true);
    this.addTownProp(890, 430, 'signpost_town', 24, 36, true);
    this.addTownProp(360, 880, 'signpost_town', 24, 36, true);

    this.townSignposts = [
      {
        x: 704,
        y: 620,
        title: 'Marktplatz Wegweiser',
        german: '⬆ Rathaus & Park  |  ⬅ Bäckerei & Schule  |  ➡ Bibliothek & Museum  |  ⬇ Hauptbahnhof & Züge',
        english: '⬆ Town Hall & Park  |  ⬅ Bakery & School  |  ➡ Library & Museum  |  ⬇ Central Station & Trains',
      },
      {
        x: 320,
        y: 360,
        title: 'Westviertel Wegweiser',
        german: '⬅ Sprachschule Deutsch  |  ➡ Marktplatz & Bäckerei Schmidt',
        english: '⬅ German Language School  |  ➡ Town Square & Bakery Schmidt',
      },
      {
        x: 890,
        y: 430,
        title: 'Ostviertel Wegweiser',
        german: '⬅ Marktplatz  |  ⬆ Geschichtsmuseum  |  ➡ Stadtbibliothek & Schlossteich',
        english: '⬅ Town Square  |  ⬆ History Museum  |  ➡ City Library & Castle Pond',
      },
      {
        x: 360,
        y: 880,
        title: 'Bahnhofsvorplatz Wegweiser',
        german: '⬆ Marktplatz & Stadtzentrum  |  ➡ Gleis 1 (ICE 104 nach Berlin Hbf)',
        english: '⬆ Town Square & City Center  |  ➡ Platform 1 (ICE 104 to Berlin Hbf)',
      },
    ];

    // 13. Boxwood Hedges & Wild Berry Bushes
    const bushes = [
      { x: 350, y: 320, hedge: true },
      { x: 382, y: 320, hedge: true },
      { x: 576, y: 260, hedge: true },
      { x: 832, y: 260, hedge: true },
      { x: 1000, y: 735, hedge: true },
      { x: 1032, y: 735, hedge: true },
      { x: 310, y: 440, hedge: false }, // Wild berry bush
      { x: 1010, y: 440, hedge: false },
      { x: 1130, y: 640, hedge: false },
    ];
    bushes.forEach((b) => {
      this.addTownProp(b.x, b.y, b.hedge ? 'hedge_box' : 'bush_wild', b.hedge ? 32 : 28, b.hedge ? 28 : 24, true);
    });

    // 14. Natural Tree Clusters (Oak & Birch)
    const natureTreesList = [
      { x: 80, y: 280, oak: true }, // Sprachschule West Woods Oak
      { x: 110, y: 220, oak: false }, // Sprachschule Northwest Birch
      { x: 340, y: 250, oak: false }, // Alleyway Birch
      { x: 570, y: 210, oak: true }, // Rathaus Woods Oak
      { x: 838, y: 210, oak: false }, // Rathaus Woods Birch
      { x: 1030, y: 360, oak: true }, // Bibliothek Oak
      { x: 1030, y: 460, oak: false }, // Pond Birch
      { x: 1180, y: 460, oak: true }, // Pond Oak
      { x: 1190, y: 560, oak: false }, // Pond Birch
      { x: 830, y: 740, oak: false }, // Café Birch
      { x: 1010, y: 740, oak: true }, // Café Oak
      { x: 170, y: 720, oak: false }, // Bahnhof Birch
      { x: 130, y: 770, oak: true }, // Bahnhof Oak
    ];
    natureTreesList.forEach((nt) => {
      this.addNatureTree(nt.x, nt.y, nt.oak ? 'tree_oak' : 'tree_birch', nt.oak ? 56 : 40, nt.oak ? 72 : 68);
    });

    // 15. Schwarzwald Evergreen Pine Trees framing the north town perimeter
    for (let tx = 2; tx < mapWidth - 2; tx += 3) {
      if (Math.abs(tx - centerTileX) <= 2) continue;
      const px = tx * tileSize + 16;
      const py = 64;
      // Ambient shadow under pine tree base
      const shadow = this.add.image(px, py - 4, 'shadow_large');
      shadow.setOrigin(0.5, 0.5);
      shadow.setDepth(py + 8);

      const pine = this.physics.add.staticImage(px, py, 'pine_tree');
      pine.setOrigin(0.5, 0.95);
      pine.setDepth(py + 10);
      const pineBody = pine.body as Phaser.Physics.Arcade.StaticBody;
      pineBody.setSize(18, 14);
      pineBody.setOffset(13, 50);
      this.pineTrees.push(pine);
    }
  }
}
