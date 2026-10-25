// Town.js - Beautiful Isekai Anime Fantasy Starter Town & Adventurer's Guild Plaza
// Designed with true human architectural scale (~5m buildings, ~5m trees for 2m heroes),
// vibrant anime fantasy colors, interactive Guide Luna receptionist, and town amenities.

class StarterTown {
  constructor(scene) {
    this.scene = scene;
    this.townGroup = new THREE.Group();
    this.townGroup.name = 'StarterTown';
    this.waterMeshes = [];
    this.lampLights = [];
    this.indoorFloors = [];
    this.chairs = [];
    this.beds = [];
    this.proceduralNPCs = {};
    this.npcMixers = [];
    this.animatedNPCs = {};

    this.initMaterials();
    this.buildTownPlaza();
    this.loadAnimatedNPCs();
  }

  initMaterials() {
    // Stylized PBR Anime Palette
    this.cobbleMat = new THREE.MeshStandardMaterial({
      color: 0x5a6578,
      roughness: 0.8,
      metalness: 0.05
    });

    this.cobbleAccentMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.05
    });

    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.9,
      flatShading: true
    });

    this.stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.75,
      metalness: 0.1
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x543828,
      roughness: 0.75
    });

    this.beamWoodMat = new THREE.MeshStandardMaterial({
      color: 0x2e1d13,
      roughness: 0.85
    });

    this.plasterMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.95
    });

    this.guildPlasterMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9
    });

    this.redRoofMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.65,
      flatShading: true
    });

    this.blueRoofMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.55,
      flatShading: true
    });

    this.greenRoofMat = new THREE.MeshStandardMaterial({
      color: 0x047857,
      roughness: 0.6,
      flatShading: true
    });

    this.windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.4,
      roughness: 0.25
    });

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.1,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85
    });

    this.manaGemMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.2,
      metalness: 0.85,
      roughness: 0.25
    });

    this.indoorFloorMat = new THREE.MeshStandardMaterial({
      color: 0x3d271d,
      roughness: 0.65
    });

    this.fireMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 2.2
    });

    this.hearthStoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85
    });

    this.bannerMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.6
    });
  }

  buildTownPlaza() {
    // 1. Lush Valley Base
    const valleyGeo = new THREE.CylinderGeometry(40, 44, 3, 32);
    const valley = new THREE.Mesh(valleyGeo, this.grassMat);
    valley.position.y = -1.5;
    valley.receiveShadow = true;
    this.townGroup.add(valley);
    this.valley = valley;

    // 2. Central Cobblestone Plaza (Cozy 14.5m Radius - Human Scale)
    const plazaGeo = new THREE.CylinderGeometry(14.5, 14.5, 0.15, 36);
    const plaza = new THREE.Mesh(plazaGeo, this.cobbleMat);
    plaza.position.y = 0.05;
    plaza.receiveShadow = true;
    this.townGroup.add(plaza);
    this.plaza = plaza;

    // Decorative Outer Stone Ring
    const ringGeo = new THREE.RingGeometry(13.8, 14.5, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const outerRing = new THREE.Mesh(ringGeo, this.stoneBaseMat);
    outerRing.position.y = 0.13;
    this.townGroup.add(outerRing);

    // Radiating Radial Paving Inlays
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const pathGeo = new THREE.PlaneGeometry(1.6, 12);
      pathGeo.rotateX(-Math.PI / 2);
      pathGeo.rotateY(angle);
      const path = new THREE.Mesh(pathGeo, this.cobbleAccentMat);
      path.position.set(Math.sin(angle) * 7, 0.132, Math.cos(angle) * 7);
      this.townGroup.add(path);
    }

    // 3. Central Marble Fountain (Scaled to Human: Basin r=2.4m, wall height 0.65m)
    this.buildFountain(0, 0, 0);

    // 4. Grand Adventurer's Guild Hall (North - Walk-in 3D Interior with Luna & Tables)
    this.buildGuildHall(0, 0, -17.5);

    // 5. Spacious Town Districts (Walk-in 3D Interiors & Living Districts)
    // West: Crafting & Armory Quarter (Master Blacksmith Borin)
    this.buildTownhouse(-14.5, 0, -5.0, -Math.PI / 2, 'blacksmith', this.redRoofMat);

    // East: Magic & Herbarium Quarter (Alchemist Elina)
    this.buildTownhouse(14.5, 0, -5.0, Math.PI / 2, 'alchemist', this.greenRoofMat);

    // South-West: Tavern & Rest Quarter (Glenn the Barkeep & Inn Beds)
    this.buildTownhouse(-13.5, 0, 8.5, 0, 'tavern', this.blueRoofMat);

    // South-East: General Merchant Store
    this.buildTownhouse(13.5, 0, 8.5, 0, 'store', this.redRoofMat);

    // 6. Dedicated Waystone Garden Shrine Alcove (East Garden, completely clears the main road!)
    this.buildWaystoneShrine(8.5, 0, -1.0);

    // 7. Vibrant Market Stalls (Paved walkways)
    this.buildMarketStall(-7.8, 0, 2.8, 0.25, 0xef4444, 'Fruits & Rations');
    this.buildMarketStall(7.8, 0, 2.8, -0.25, 0x3b82f6, 'Potions & Trinkets');

    // 8. South Town Gate (Portcullis leading to Whispering Plains)
    this.buildSouthGate(0, 0, 14.0);

    // 9. Stylized Low-Poly Anime Trees
    this.buildStylizedTree(-11, 0, -12, 0x16a34a, 1.0); // Emerald Oak
    this.buildStylizedTree(11, 0, -12, 0x16a34a, 1.0);  // Emerald Oak
    this.buildStylizedTree(-15, 0, 1.5, 0xf472b6, 0.95); // Sakura Pink
    this.buildStylizedTree(15, 0, 1.5, 0xf472b6, 0.95);  // Sakura Pink

    // 10. Warm Glowing Streetlamps & Benches
    this.buildStreetLamp(-5.5, 0, -5.5);
    this.buildStreetLamp(5.5, 0, -5.5);
    this.buildStreetLamp(-5.5, 0, 5.5);
    this.buildStreetLamp(5.5, 0, 5.5);

    // Wooden Plaza Benches
    this.buildBench(-3.8, 0, 0, Math.PI / 2);
    this.buildBench(3.8, 0, 0, -Math.PI / 2);

    // Flowerbeds
    this.buildFlowerbed(-8.5, 0, 11);
    this.buildFlowerbed(8.5, 0, 11);

    // 11. Kingdom of Aetheria Royal Crest Banners
    for (let bx of [-2.4, 2.4]) {
      const bannerGeo = new THREE.PlaneGeometry(0.75, 2.2);
      const bannerMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8, // Royal Blue
        roughness: 0.7,
        side: THREE.DoubleSide
      });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(bx, 3.4, -10.35); // Guild Hall Front
      this.townGroup.add(banner);

      const goldFringe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.05), this.goldMat);
      goldFringe.position.set(bx, 2.3, -10.34);
      this.townGroup.add(goldFringe);
    }

    // Villager Interaction Positions (3D Animated Models loaded in loadAnimatedNPCs)
    this.villagerArthurPos = new THREE.Vector3(-3.2, 0.05, -2.5);
    this.villagerAriaPos = this.villagerArthurPos; // alias for backwards compatibility
    this.villagerTomPos = new THREE.Vector3(3.2, 0.05, 1.5);

    this.scene.add(this.townGroup);
  }

  buildWaystoneShrine(x, y, z) {
    // Dedicated Elevated Garden Shrine Alcove for the Plaza Waystone
    const shrine = new THREE.Group();
    shrine.position.set(x, y, z);

    // 1. Raised Octagonal Stone Dais (r = 2.4m, h = 0.22m)
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.22, 8), this.stoneBaseMat);
    dais.position.y = 0.11;
    dais.receiveShadow = true;
    shrine.add(dais);

    // Runic Tile Circle
    const runeRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.3, 8), this.cobbleAccentMat);
    runeRing.position.y = 0.23;
    runeRing.rotation.x = -Math.PI / 2;
    shrine.add(runeRing);

    // 2. Four Corner Stone Lantern Posts with Golden Warm Glow
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const lx = Math.sin(ang) * 2.2;
      const lz = Math.cos(ang) * 2.2;

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), this.stoneBaseMat);
      post.position.set(lx, 0.6, lz);
      shrine.add(post);

      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), this.goldMat);
      lamp.position.set(lx, 1.3, lz);
      shrine.add(lamp);

      const light = new THREE.PointLight(0xfef08a, 0.5, 5);
      light.position.set(lx, 1.3, lz);
      shrine.add(light);
    }

    // 3. Surrounding Lavender & Rose Flowerbeds
    for (let fz of [-1.8, 1.8]) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.6), this.stoneBaseMat);
      bed.position.set(0, 0.1, fz);
      shrine.add(bed);

      const fMat = new THREE.MeshStandardMaterial({ color: fz < 0 ? 0xa855f7 : 0x38bdf8 });
      for (let fi = -0.5; fi <= 0.5; fi += 0.35) {
        const bl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), fMat);
        bl.position.set(fi, 0.26, fz);
        shrine.add(bl);
      }
    }

    this.townGroup.add(shrine);
  }

  buildFountain(x, y, z) {
    const fGroup = new THREE.Group();
    fGroup.position.set(x, y, z);

    // Outer Octagonal Basin (Wall height 0.65m - perfect for sitting)
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 0.65, 16), this.stoneBaseMat);
    basin.position.y = 0.325;
    basin.castShadow = true;
    basin.receiveShadow = true;
    fGroup.add(basin);

    // Crystal Clear Mana Water
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.1, 16), this.waterMat);
    water.position.y = 0.58;
    fGroup.add(water);
    this.waterMeshes.push(water);

    // Central Pillar
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.8, 12), this.stoneBaseMat);
    pillar.position.y = 1.1;
    pillar.castShadow = true;
    fGroup.add(pillar);

    // Upper Tier Basin
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.3, 12), this.stoneBaseMat);
    upper.position.y = 1.9;
    fGroup.add(upper);

    // Floating Levitating Mana Gem (Azure Glow)
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), this.manaGemMat);
    gem.position.y = 2.6;
    fGroup.add(gem);
    this.manaGemMesh = gem;

    // Small Orbiting Mana Orbs
    this.manaOrbs = [];
    for (let i = 0; i < 3; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), this.manaGemMat);
      fGroup.add(orb);
      this.manaOrbs.push(orb);
    }

    const gemLight = new THREE.PointLight(0x38bdf8, 0.8, 8);
    gemLight.position.y = 2.6;
    fGroup.add(gemLight);

    this.townGroup.add(fGroup);
  }

  buildGuildHall(x, y, z) {
    const guild = new THREE.Group();
    guild.position.set(x, y, z);

    // 1. Polished Dark Oak Interior Floor (14m wide x 14m deep)
    const floorGeo = new THREE.PlaneGeometry(13.6, 13.6);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, this.indoorFloorMat);
    floor.position.set(0, 0.051, 0);
    floor.receiveShadow = true;
    floor.updateMatrixWorld(true);
    guild.add(floor);
    this.guildFloor = floor;

    // 2. Stone Foundation Outer Base (0.6m high)
    const base = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.6, 14.4), this.stoneBaseMat);
    base.position.y = -0.25;
    base.receiveShadow = true;
    guild.add(base);

    // 3. Walls with Grand Open Double-Door Archway Entrance
    // North Wall (Back)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(14.0, 4.8, 0.4), this.guildPlasterMat);
    northWall.position.set(0, 2.4, -6.8);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    guild.add(northWall);

    // West Wall (Left - contains Stone Fireplace)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.8, 14.0), this.guildPlasterMat);
    westWall.position.set(-6.8, 2.4, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    guild.add(westWall);

    // East Wall (Right - Stained Glass Windows)
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.8, 14.0), this.guildPlasterMat);
    eastWall.position.set(6.8, 2.4, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    guild.add(eastWall);

    // Glowing Warm Windows on East Wall
    for (let wz of [-3.5, 0, 3.5]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 1.4), this.windowGlowMat);
      win.position.set(6.8, 2.6, wz);
      guild.add(win);
    }

    // South Wall (Front facing Plaza): Left & Right panels with wide center doorway
    const southWallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.8, 0.4), this.guildPlasterMat);
    southWallLeft.position.set(-4.3, 2.4, 6.8);
    southWallLeft.castShadow = true;
    southWallLeft.receiveShadow = true;
    guild.add(southWallLeft);

    const southWallRight = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.8, 0.4), this.guildPlasterMat);
    southWallRight.position.set(4.3, 2.4, 6.8);
    southWallRight.castShadow = true;
    southWallRight.receiveShadow = true;
    guild.add(southWallRight);

    // Archway Transom above Entrance (Clear opening from y=0 to y=3.2m, width 3.4m)
    const transom = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 0.4), this.guildPlasterMat);
    transom.position.set(0, 4.0, 6.8);
    transom.castShadow = true;
    guild.add(transom);

    // Entrance Timber Frame & Grand Overhang Portico
    for (let px of [-1.8, 1.8]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 0.4), this.beamWoodMat);
      col.position.set(px, 1.7, 7.0);
      col.castShadow = true;
      guild.add(col);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 0.8), this.beamWoodMat);
    lintel.position.set(0, 3.4, 7.0);
    guild.add(lintel);

    // Carved Guild Signboard above entrance
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.18), this.woodMat);
    signBoard.position.set(0, 4.0, 7.1);
    guild.add(signBoard);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.22), this.goldMat);
    crest.position.set(0, 4.0, 7.15);
    guild.add(crest);

    // 4. Exposed Wooden Timber Ceiling Beams & Grand Blue Roof
    for (let bz = -5.0; bz <= 5.0; bz += 2.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.3, 0.3), this.beamWoodMat);
      beam.position.set(0, 4.7, bz);
      guild.add(beam);
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(10.2, 3.2, 4), this.blueRoofMat);
    roof.position.y = 6.4;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    guild.add(roof);

    // 5. Warm Hanging Medieval Iron Chandeliers (Indoor tavern illumination)
    this.chandeliers = [];
    for (let cz of [-2.0, 2.5]) {
      const chandGroup = new THREE.Group();
      chandGroup.position.set(0, 3.6, cz);

      // Iron Ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 16), this.stoneBaseMat);
      ring.rotation.x = Math.PI / 2;
      chandGroup.add(ring);

      // 4 Candles & Point Light
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), this.windowGlowMat);
        candle.position.set(Math.cos(ang) * 0.95, 0.1, Math.sin(ang) * 0.95);
        chandGroup.add(candle);
      }

      const cLight = new THREE.PointLight(0xfef08a, 0.85, 9);
      chandGroup.add(cLight);
      guild.add(chandGroup);
      this.chandeliers.push(cLight);
    }

    // 6. Cozy Stone Fireplace & Hearth (Pugon on West wall)
    this.buildFireplace(guild, -6.2, 0, 0.5);

    // 7. Adventurer Dining Tables & Wooden Benches
    // Left Wing Table 1
    this.buildTavernTable(guild, -3.8, 0, 3.0, 'dining');
    // Left Wing Table 2 (Back)
    this.buildTavernTable(guild, -3.8, 0, -2.0, 'dining');
    // Right Wing Table (Front - with adventure map)
    this.buildTavernTable(guild, 3.8, 0, 3.0, 'map');

    // 8. Official Guild Quest Notice Board (Right of reception counter)
    this.buildInteriorQuestBoard(guild, 3.6, 0, -1.8);

    // 9. Guide Luna's Grand Mahogany Reception Counter (Center inside)
    this.buildInteriorReception(guild, 0, 0, -1.8);

    // 10. Wall Banners & Crests
    this.buildGuildBanners(guild);

    this.townGroup.add(guild);
  }

  buildFireplace(parent, x, y, z) {
    const fp = new THREE.Group();
    fp.position.set(x, y, z);

    // Hearth Stone Chimney Breast
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.8, 2.8), this.hearthStoneMat);
    chimney.position.set(0, 2.4, 0);
    chimney.castShadow = true;
    fp.add(chimney);

    // Fireplace Cavity Opening
    const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    cavity.position.set(0.25, 0.7, 0);
    fp.add(cavity);

    // Burning Logs & Emissive Fire
    const fireMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 1), this.fireMat);
    fireMesh.position.set(0.25, 0.45, 0);
    fp.add(fireMesh);
    this.hearthFireMesh = fireMesh;

    // Flickering Warm Firelight
    const fireLight = new THREE.PointLight(0xf97316, 1.3, 8);
    fireLight.position.set(0.4, 0.7, 0);
    fp.add(fireLight);
    this.hearthFireLight = fireLight;

    // Wooden Mantlepiece Shelf
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 3.0), this.woodMat);
    mantle.position.set(0.65, 1.6, 0);
    fp.add(mantle);

    // Crossed Swords Decor on Chimney
    const sword1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.04), this.goldMat);
    sword1.position.set(0.62, 2.6, 0);
    sword1.rotation.z = 0.55;
    fp.add(sword1);

    const sword2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.04), this.goldMat);
    sword2.position.set(0.62, 2.6, 0);
    sword2.rotation.z = -0.55;
    fp.add(sword2);

    parent.add(fp);
  }

  buildTavernTable(parent, x, y, z, tableType = 'dining') {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Table Top (3.2m long x 1.2m wide)
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.2), this.woodMat);
    tableTop.position.y = 0.8;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // Table Legs
    for (let lx of [-1.3, 1.3]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 1.0), this.woodMat);
      leg.position.set(lx, 0.375, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    // Wooden Benches (North and South of table)
    for (let bz of [-0.95, 0.95]) {
      const benchTop = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.38), this.woodMat);
      benchTop.position.set(0, 0.45, bz);
      benchTop.castShadow = true;
      group.add(benchTop);

      for (let bx of [-1.2, 1.2]) {
        const bleg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.34), this.stoneBaseMat);
        bleg.position.set(bx, 0.225, bz);
        group.add(bleg);
      }

      // Register seat for sitting mechanics
      this.chairs.push({
        pos: new THREE.Vector3(x, 0.45, -17.5 + z + bz),
        rot: bz < 0 ? 0 : Math.PI,
        name: 'Guild Dining Bench'
      });
    }

    // Table Accessories
    if (tableType === 'dining') {
      // Pewter Beer Tankards & Bread
      const mugMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
      for (let mx of [-0.8, 0.6]) {
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 8), mugMat);
        mug.position.set(mx, 0.96, 0.15);
        group.add(mug);
      }
      const bread = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      bread.scale.set(1.4, 0.7, 1.0);
      bread.position.set(0, 0.92, -0.1);
      group.add(bread);
    } else if (tableType === 'map') {
      // Rolled World Map Parchment & Brass Candlestick
      const map = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: 0xfef3c7 }));
      map.position.set(-0.2, 0.86, 0);
      group.add(map);

      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.25, 8), this.goldMat);
      candle.position.set(0.9, 0.98, 0.1);
      group.add(candle);
    }

    parent.add(group);
  }

  buildInteriorReception(parent, x, y, z) {
    const recep = new THREE.Group();
    recep.position.set(x, y, z);

    // Mahogany Reception Counter (Curved/L-Shape, length 3.6m)
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 1.1), this.woodMat);
    desk.position.y = 0.525;
    desk.castShadow = true;
    recep.add(desk);

    // Accessories: Guild Ledger & Brass Bell
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.09, 0.45), new THREE.MeshStandardMaterial({ color: 0x7c2d12 }));
    book.position.set(-0.6, 1.1, 0.1);
    recep.add(book);

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.16, 8), this.goldMat);
    bell.position.set(0.8, 1.14, 0.1);
    recep.add(bell);

    // Guide Luna receptionist position (3D Animated Female Model loaded in loadAnimatedNPCs)
    this.npcPosition = new THREE.Vector3(0, 0.05, -18.5);

    // Floating Golden Quest Marker `!` above Luna's desk
    const markerGroup = new THREE.Group();
    markerGroup.position.set(0, 2.5, -1.0);

    const markTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.4, 8), this.goldMat);
    markTop.position.y = 0.2;
    markerGroup.add(markTop);

    const markDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), this.goldMat);
    markDot.position.y = -0.1;
    markerGroup.add(markDot);

    const markLight = new THREE.PointLight(0xfbbf24, 0.6, 5);
    markLight.position.y = 0.1;
    markerGroup.add(markLight);

    recep.add(markerGroup);
    this.markerGroup = markerGroup;

    // World position of Luna (world z = -18.8)
    this.npcPosition = new THREE.Vector3(0, 0.05, -18.8);

    parent.add(recep);
  }

  buildInteriorQuestBoard(parent, x, y, z) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(x, y, z);
    boardGroup.rotation.y = -0.3; // Angled invitingly toward entrance

    // Wooden Notice Board Planks
    for (let px of [-0.9, 0.9]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), this.beamWoodMat);
      post.position.set(px, 1.15, 0);
      post.castShadow = true;
      boardGroup.add(post);
    }

    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 0.1), this.woodMat);
    plank.position.set(0, 1.45, 0);
    boardGroup.add(plank);

    // 3 Official Wax-Sealed Parchment Quest Notices
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const waxMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });

    const notices = [
      { x: -0.55, y: 1.65, label: 'Slime Hazard' },
      { x: 0.55, y: 1.65, label: 'Beast Horns' },
      { x: 0, y: 1.15, label: 'King Slime' }
    ];

    notices.forEach(n => {
      const note = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.48), paperMat);
      note.position.set(n.x, n.y, 0.06);
      boardGroup.add(note);

      const seal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), waxMat);
      seal.position.set(n.x, n.y + 0.18, 0.07);
      boardGroup.add(seal);
    });

    // Overhead Shingle Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.5), this.blueRoofMat);
    roof.position.set(0, 2.25, 0.1);
    roof.rotation.x = 0.2;
    boardGroup.add(roof);

    // Floating Golden Quest Scroll Indicator above board
    const boardMarker = new THREE.Group();
    boardMarker.position.set(0, 2.7, 0);
    const scrollMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8), this.goldMat);
    scrollMesh.rotation.z = Math.PI / 4;
    boardMarker.add(scrollMesh);
    const bLight = new THREE.PointLight(0xfbbf24, 0.6, 4);
    boardMarker.add(bLight);
    boardGroup.add(boardMarker);
    this.boardMarker = boardMarker;

    // World position of Quest Board (world z = -18.8)
    this.questBoardPosition = new THREE.Vector3(3.6, 0.05, -18.8);

    parent.add(boardGroup);
  }

  buildGuildBanners(parent) {
    // Sapphire Blue Wall Banners with Golden Emblems
    for (let bx of [-3.2, 3.2]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), this.bannerMat);
      banner.position.set(bx, 3.0, -6.55);
      parent.add(banner);

      const emblem = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), this.goldMat);
      emblem.position.set(bx, 3.3, -6.54);
      parent.add(emblem);
    }
  }

  buildTownhouse(x, y, z, rotY, shopType, roofMat) {
    const house = new THREE.Group();
    house.position.set(x, y, z);
    house.rotation.y = rotY;

    // Helper to register chair in world coordinates
    const registerChair = (localPos, localRot = 0, name = 'Chair') => {
      house.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
      worldPos.applyMatrix4(house.matrixWorld);
      this.chairs.push({ pos: worldPos, rot: house.rotation.y + localRot, name });
    };

    // Helper to register bed in world coordinates
    const registerBed = (localPos, localRot = 0, name = 'Bed') => {
      house.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3(localPos.x, localPos.y, localPos.z);
      worldPos.applyMatrix4(house.matrixWorld);
      this.beds.push({ pos: worldPos, rot: house.rotation.y + localRot, name });
    };

    // 1. Stone Foundation Outer Base (Width 6.8m, Depth 5.8m, Height 0.45m)
    const base = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.45, 5.8), this.stoneBaseMat);
    base.position.y = -0.15;
    base.receiveShadow = true;
    house.add(base);

    // 2. Indoor Walk-in Floor
    const floorGeo = new THREE.PlaneGeometry(6.4, 5.4);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = (shopType === 'blacksmith') ? this.stoneBaseMat : this.indoorFloorMat;
    const indoorFloor = new THREE.Mesh(floorGeo, floorMat);
    indoorFloor.position.set(0, 0.052, 0);
    indoorFloor.receiveShadow = true;
    house.add(indoorFloor);
    this.indoorFloors.push(indoorFloor);

    // 3. Perimeter Half-Timbered Tudor Walls with open Front Doorway
    // Back Wall (North in local space, at z = +2.7m)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.6, 3.8, 0.3), this.plasterMat);
    backWall.position.set(0, 1.9, 2.7);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    house.add(backWall);

    // Left Wall (at x = -3.2m)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 5.6), this.plasterMat);
    leftWall.position.set(-3.2, 1.9, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    house.add(leftWall);

    // Right Wall (at x = +3.2m)
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 5.6), this.plasterMat);
    rightWall.position.set(3.2, 1.9, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    house.add(rightWall);

    // Front Wall (at z = -2.7m): Left and Right panels with 2m open doorway
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.3), this.plasterMat);
    frontWallLeft.position.set(-2.2, 1.9, -2.7);
    frontWallLeft.castShadow = true;
    frontWallLeft.receiveShadow = true;
    house.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.3), this.plasterMat);
    frontWallRight.position.set(2.2, 1.9, -2.7);
    frontWallRight.castShadow = true;
    frontWallRight.receiveShadow = true;
    house.add(frontWallRight);

    // Doorway Header / Transom above opening
    const frontTransom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.3), this.plasterMat);
    frontTransom.position.set(0, 3.2, -2.7);
    frontTransom.castShadow = true;
    house.add(frontTransom);

    // Dark Oak Timber Posts around doorway & corners
    for (let px of [-1.1, 1.1]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.7, 0.36), this.beamWoodMat);
      col.position.set(px, 1.35, -2.7);
      house.add(col);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.4), this.beamWoodMat);
    lintel.position.set(0, 2.65, -2.7);
    house.add(lintel);

    // Corner Timber Beams
    for (let cx of [-3.25, 3.25]) {
      for (let cz of [-2.75, 2.75]) {
        const cBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.8, 0.24), this.beamWoodMat);
        cBeam.position.set(cx, 1.9, cz);
        house.add(cBeam);
      }
    }

    // Glowing Warm Windows on side walls
    for (let side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 1.2), this.windowGlowMat);
      win.position.set(side * 3.2, 2.1, 0);
      house.add(win);
    }

    // 4. Exposed Ceiling Timber Beams & High Gable Roof
    for (let bz of [-1.8, 0, 1.8]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 0.2), this.beamWoodMat);
      beam.position.set(0, 3.75, bz);
      house.add(beam);
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.4, 4), roofMat);
    roof.position.y = 5.0;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // Stone Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.6, 0.7), this.stoneBaseMat);
    chimney.position.set(2.2, 4.8, 1.6);
    house.add(chimney);

    // Hanging Carved Shop Signboard above Entrance
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 3.0, -2.95);
    const signBracket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.35), this.stoneBaseMat);
    signGroup.add(signBracket);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), this.woodMat);
    signBoard.position.set(0, -0.35, 0.1);
    signGroup.add(signBoard);
    house.add(signGroup);

    // 5. Unique Thematic 3D Interiors for Each Building
    if (shopType === 'blacksmith') {
      // Blacksmith Quarter: Blazing Forge, Anvil, Weapon Racks, Workbench, Smith Stool
      const forge = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.2), this.stoneBaseMat);
      forge.position.set(-1.8, 0.55, 2.0);
      house.add(forge);

      const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), this.fireMat);
      coals.position.set(-1.8, 1.15, 2.0);
      house.add(coals);

      const fLight = new THREE.PointLight(0xf97316, 1.6, 8);
      fLight.position.set(-1.8, 1.4, 2.0);
      house.add(fLight);

      // Heavy Cast-Iron Anvil on tree stump
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.55, 8), this.woodMat);
      stump.position.set(0.2, 0.275, 0.5);
      house.add(stump);

      const anvilMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.4), anvilMat);
      anvil.position.set(0.2, 0.72, 0.5);
      house.add(anvil);

      // Blacksmith Workbench
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.8), this.woodMat);
      bench.position.set(1.8, 0.4, 1.8);
      house.add(bench);

      // Smith Wooden Stool (Chair)
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.48, 8), this.woodMat);
      stool.position.set(1.8, 0.24, 0.6);
      house.add(stool);
      registerChair(new THREE.Vector3(1.8, 0.48, 0.6), 0, 'Smith Workbench Stool');

      // Weapon Wall Racks with Display Blades
      const weaponRack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 2.2), this.woodMat);
      weaponRack.position.set(-3.1, 1.8, 0);
      house.add(weaponRack);

      // Master Blacksmith Borin position (3D Animated Dwarf model loaded in loadAnimatedNPCs)
      this.blacksmithPosition = new THREE.Vector3(-14.5, 0.05, -5.0);
    } else if (shopType === 'alchemist') {
      // Magic Quarter: Bubbling Cauldron, Potion Shelves, Grimoire Lectern, Velvet Armchair
      const cauldronBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.5, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 }));
      cauldronBase.position.set(0, 0.3, 0.5);
      house.add(cauldronBase);

      const potionLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.5 }));
      potionLiquid.position.set(0, 0.58, 0.5);
      house.add(potionLiquid);

      const cLight = new THREE.PointLight(0xa855f7, 1.4, 7);
      cLight.position.set(0, 0.9, 0.5);
      house.add(cLight);

      // Tall Apothecary Shelves along back wall
      const shelves = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 0.4), this.woodMat);
      shelves.position.set(0, 1.3, 2.4);
      house.add(shelves);

      // Glowing Potion Flasks
      const flaskColors = [0xef4444, 0x38bdf8, 0x10b981, 0xfbbf24, 0xa855f7];
      for (let i = 0; i < 5; i++) {
        const flaskMat = new THREE.MeshStandardMaterial({ color: flaskColors[i], emissive: flaskColors[i], emissiveIntensity: 1.2 });
        const flask = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), flaskMat);
        flask.position.set(-1.4 + i * 0.7, 1.4, 2.3);
        house.add(flask);
      }

      // Velvet Reading Armchair (Chair)
      const armchair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.7 }));
      armchair.position.set(-1.8, 0.25, -1.0);
      house.add(armchair);
      registerChair(new THREE.Vector3(-1.8, 0.5, -1.0), 0, 'Alchemist Velvet Armchair');

      // Lectern with Open Illuminated Spellbook
      const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.4), this.woodMat);
      lectern.position.set(-1.8, 0.55, 0.5);
      house.add(lectern);
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.5 }));
      book.position.set(-1.8, 1.15, 0.5);
      book.rotation.x = 0.3;
      house.add(book);

      // Royal Herbalist Elina position (3D Animated Elf model loaded in loadAnimatedNPCs)
      this.alchemistPosition = new THREE.Vector3(14.5, 0.05, -5.0);
    } else if (shopType === 'tavern') {
      // Tavern & Inn Quarter: Bar Counter, Glenn, Ale Casks, Dining Table with Chairs, Inn Bedroom Bed
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), this.goldMat);
      lantern.position.set(-1.0, 3.0, 0);
      house.add(lantern);
      const tLight = new THREE.PointLight(0xfef08a, 0.85, 8);
      tLight.position.set(-1.0, 2.9, 0);
      house.add(tLight);

      // Taproom Bar Counter
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.6), this.woodMat);
      bar.position.set(-1.8, 0.5, 0.6);
      bar.castShadow = true;
      house.add(bar);

      // Bar Stools in front of counter
      for (let sx of [-2.4, -1.4]) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 8), this.woodMat);
        stool.position.set(sx, 0.275, -0.2);
        house.add(stool);
        registerChair(new THREE.Vector3(sx, 0.55, -0.2), 0, 'Tavern Bar Stool');
      }

      // Dining Table with 2 Chairs
      const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.9), this.woodMat);
      diningTable.position.set(-1.5, 0.375, -1.5);
      house.add(diningTable);

      const chair1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), this.woodMat);
      chair1.position.set(-1.5, 0.225, -2.1);
      house.add(chair1);
      registerChair(new THREE.Vector3(-1.5, 0.45, -2.1), 0, 'Tavern Dining Chair');

      const chair2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), this.woodMat);
      chair2.position.set(-1.5, 0.225, -0.9);
      house.add(chair2);
      registerChair(new THREE.Vector3(-1.5, 0.45, -0.9), Math.PI, 'Tavern Dining Chair');

      // Decorative Bedroom Screen
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 3.4), this.beamWoodMat);
      screen.position.set(0.6, 1.4, 0.8);
      house.add(screen);

      // Four-Poster Medieval Inn Bed
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.2), this.woodMat);
      bedFrame.position.set(1.9, 0.225, 1.2);
      house.add(bedFrame);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.15, 2.08), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 }));
      mattress.position.set(1.9, 0.5, 1.2);
      house.add(mattress);

      const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
      pillow.position.set(1.9, 0.6, 2.0);
      house.add(pillow);

      for (let px of [1.15, 2.65]) {
        for (let pz of [0.15, 2.25]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2, 6), this.beamWoodMat);
          post.position.set(px, 1.1, pz);
          house.add(post);
        }
      }
      const canopyRail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 2.2), this.beamWoodMat);
      canopyRail.position.set(1.9, 2.2, 1.2);
      house.add(canopyRail);

      // Register Inn Bed for Sleeping Mechanic
      registerBed(new THREE.Vector3(1.9, 0.55, 1.2), 0, 'Wandering Wolf Inn Bed');

      // Bedside Table with Candle
      const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), this.woodMat);
      nightstand.position.set(0.95, 0.3, 2.1);
      house.add(nightstand);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), this.windowGlowMat);
      candle.position.set(0.95, 0.7, 2.1);
      house.add(candle);
      const bLight = new THREE.PointLight(0xfef08a, 0.5, 4);
      bLight.position.set(0.95, 0.8, 2.1);
      house.add(bLight);

      // Glenn the Barkeep position (3D Animated Beastman model loaded in loadAnimatedNPCs)
      this.barkeepPosition = new THREE.Vector3(-14.2, 0.05, 9.8);
    } else if (shopType === 'store') {
      // General Merchant Store: Food Counter, Produce Baskets, Store Bench
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.95, 0.8), this.woodMat);
      counter.position.set(0, 0.475, 0.8);
      house.add(counter);

      for (let bx of [-0.9, 0, 0.9]) {
        const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.22, 8), this.woodMat);
        basket.position.set(bx, 1.05, 0.8);
        house.add(basket);
      }

      // Store Wooden Bench (Chair)
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.45), this.woodMat);
      bench.position.set(-1.8, 0.225, -1.0);
      house.add(bench);
      registerChair(new THREE.Vector3(-1.8, 0.45, -1.0), 0, 'Merchant Store Bench');

      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), this.woodMat);
      crate.position.set(2.0, 0.4, 2.0);
      house.add(crate);
    }

    this.townGroup.add(house);
  }

  buildMarketStall(x, y, z, rotY, awningColor, label) {
    const stall = new THREE.Group();
    stall.position.set(x, y, z);
    stall.rotation.y = rotY;

    // Wooden Counter
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.9, 1.3), this.woodMat);
    table.position.y = 0.45;
    table.castShadow = true;
    stall.add(table);

    // 4 Corner Posts (Height 2.3m)
    for (let px of [-1.3, 1.3]) {
      for (let pz of [-0.55, 0.55]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), this.beamWoodMat);
        post.position.set(px, 1.1, pz);
        stall.add(post);
      }
    }

    // Striped Canvas Awning
    const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.65 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.15, 1.8), awningMat);
    awning.position.set(0, 2.15, 0);
    awning.rotation.x = 0.14;
    awning.castShadow = true;
    stall.add(awning);

    // Goods on table (crates, baskets)
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.45), this.woodMat);
    crate.position.set(-0.6, 1.05, 0);
    stall.add(crate);

    this.townGroup.add(stall);
  }

  buildSouthGate(x, y, z) {
    const gate = new THREE.Group();
    gate.position.set(x, y, z);

    // Twin Stone Pillars (Height 4.5m)
    for (let px of [-2.4, 2.4]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.5, 1.2), this.stoneBaseMat);
      p.position.set(px, 2.25, 0);
      p.castShadow = true;
      gate.add(p);

      // Torch Sconce
      const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), this.goldMat);
      sconce.position.set(px > 0 ? px - 0.7 : px + 0.7, 3.2, 0);
      gate.add(sconce);
    }

    // Archway Stone Beam
    const arch = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.8, 1.2), this.stoneBaseMat);
    arch.position.set(0, 4.5, 0);
    arch.castShadow = true;
    gate.add(arch);

    // Raised Iron Portcullis Grill
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const grill = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 0.1), ironMat);
    grill.position.set(0, 3.6, 0);
    gate.add(grill);

    // Wooden Signpost pointing out
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.1), this.woodMat);
    sign.position.set(0, 2.6, 0.7);
    gate.add(sign);

    // City Gate Guards: Captain Alden & Guard Vance (3D Animated Knight models loaded in loadAnimatedNPCs)
    this.guardPosition = new THREE.Vector3(0, 0.05, 14.8);

    this.townGroup.add(gate);
  }

  getLamps() {
    return this.lampLights || [];
  }

  buildGuildReceptionist(x, y, z) {
    // Guide Luna is stationed inside the Grand Guild Hall
  }

  buildStylizedTree(x, y, z, leafColor, scale = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    tree.scale.set(scale, scale, scale);

    // Trunk (Height 2.8m, proportional!)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 2.8, 8), this.woodMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    tree.add(trunk);

    // Multi-Cluster Anime Foliage Spheres (Total height ~4.8m)
    const folMat = new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.7,
      flatShading: true
    });

    const clusters = [
      { r: 1.4, x: 0, y: 3.2, z: 0 },
      { r: 1.1, x: -0.5, y: 3.7, z: 0.3 },
      { r: 1.0, x: 0.5, y: 3.9, z: -0.3 },
      { r: 0.85, x: 0, y: 4.4, z: 0 }
    ];

    clusters.forEach(c => {
      const fol = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), folMat);
      fol.position.set(c.x, c.y, c.z);
      fol.castShadow = true;
      fol.receiveShadow = true;
      tree.add(fol);
    });

    this.townGroup.add(tree);
  }

  buildStreetLamp(x, y, z) {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.8, 8), this.beamWoodMat);
    post.position.y = 1.4;
    lamp.add(post);

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), this.goldMat);
    lantern.position.y = 2.8;
    lamp.add(lantern);

    const light = new THREE.PointLight(0xfef08a, 0.6, 7);
    light.position.y = 2.8;
    lamp.add(light);
    this.lampLights.push(light);

    this.townGroup.add(lamp);
  }

  buildBench(x, y, z, rotY) {
    const bench = new THREE.Group();
    bench.position.set(x, y, z);
    bench.rotation.y = rotY;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.45), this.woodMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    bench.add(seat);

    for (let legX of [-0.65, 0.65]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), this.stoneBaseMat);
      leg.position.set(legX, 0.225, 0);
      bench.add(leg);
    }

    this.chairs.push({
      pos: new THREE.Vector3(x, y + 0.45, z),
      rot: rotY,
      name: 'Plaza Bench'
    });

    this.townGroup.add(bench);
  }

  buildFlowerbed(x, y, z) {
    const bed = new THREE.Group();
    bed.position.set(x, y, z);

    const soil = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.2), this.stoneBaseMat);
    soil.position.y = 0.1;
    bed.add(soil);

    // Anime Flowers (Red & Blue Dots)
    const flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 })
    ];

    for (let i = 0; i < 8; i++) {
      const fMat = flowerMats[i % 2];
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), fMat);
      flower.position.set(-0.9 + (i % 4) * 0.55, 0.25, -0.3 + Math.floor(i / 4) * 0.5);
      bed.add(flower);
    }

    this.townGroup.add(bed);
  }

  update(delta) {
    // Animate Mana Gem
    if (this.manaGemMesh) {
      this.manaGemMesh.rotation.y += delta * 1.6;
      this.manaGemMesh.position.y = 2.6 + Math.sin(Date.now() * 0.003) * 0.12;
    }

    // Orbit Mana Orbs
    if (this.manaOrbs) {
      const time = Date.now() * 0.0025;
      this.manaOrbs.forEach((orb, i) => {
        const angle = time + (i * Math.PI * 2) / 3;
        orb.position.x = Math.cos(angle) * 0.75;
        orb.position.z = Math.sin(angle) * 0.75;
        orb.position.y = 2.6 + Math.sin(time * 1.5 + i) * 0.15;
      });
    }

    // Animate James the Guild Master Quest Marker
    if (this.markerGroup) {
      this.markerGroup.rotation.y += delta * 2.2;
      this.markerGroup.position.y = 2.5 + Math.sin(Date.now() * 0.004) * 0.08;
      if (this.npcPosition) {
        this.markerGroup.position.x = this.npcPosition.x;
        this.markerGroup.position.z = this.npcPosition.z;
      }
    }

    // Animate Hearth Fireplace flicker & Quest Board marker
    if (this.hearthFireLight) {
      this.hearthFireLight.intensity = 1.2 + Math.sin(Date.now() * 0.015) * 0.35;
    }
    if (this.boardMarker) {
      this.boardMarker.rotation.y += delta * 2.0;
      this.boardMarker.position.y = 2.7 + Math.sin(Date.now() * 0.003) * 0.08;
    }
    if (this.smithMarker) {
      this.smithMarker.rotation.y += delta * 2.2;
      this.smithMarker.position.y = 1.85 + Math.sin(Date.now() * 0.004) * 0.08;
    }

    // Subtle water surface shimmer
    if (this.waterMeshes) {
      this.waterMeshes.forEach(w => {
        w.rotation.y += delta * 0.08;
      });
    }

    // Update 3D animated living NPCs
    if (this.npcMixers && this.npcMixers.length > 0) {
      for (let i = 0; i < this.npcMixers.length; i++) {
        this.npcMixers[i].update(delta);
      }
    }

    // Wandering Town NPCs & South Gate Guard Defense AI
    const playerPos = (window.gameHUD && window.gameHUD.playerController)
      ? window.gameHUD.playerController.position : null;


    Object.values(this.animatedNPCs || {}).forEach(container => {
      const ud = container.userData;
      if (!ud) return;

      // --- WANDERING VILLAGER AI (Arthur & Tom stroll around the plaza with full collision avoidance) ---
      if (ud.isWanderer) {
        const distToPlayer = playerPos ? container.position.distanceTo(playerPos) : 999;

        // When player gets close, pause walking and turn to greet player
        if (distToPlayer < 2.8) {
          if (ud.currentAction !== 'Idle' && ud.actions['Idle']) {
            if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.2);
            ud.actions['Idle'].reset().fadeIn(0.2).play();
            ud.currentAction = 'Idle';
          }
          const lookDir = playerPos.clone().sub(container.position);
          container.rotation.y = Math.atan2(lookDir.x, lookDir.z);
          return;
        }

        if (ud.state === 'IDLE') {
          ud.timer -= delta;
          if (ud.timer <= 0) {
            ud.state = 'WALK';
            ud.wanderTarget = this.getValidPlazaWanderTarget(ud.homePos);

            const walkClip = ud.actions['Walking_A'] ? 'Walking_A' : (ud.actions['Walking_B'] ? 'Walking_B' : 'Idle');
            if (ud.actions[walkClip] && ud.currentAction !== walkClip) {
              if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.25);
              ud.actions[walkClip].reset().fadeIn(0.25).play();
              ud.currentAction = walkClip;
            }
          }
        } else if (ud.state === 'WALK') {
          const prevPos = container.position.clone();
          const moveVec = ud.wanderTarget.clone().sub(container.position);
          moveVec.y = 0;
          const dist = moveVec.length();

          if (dist > 0.4) {
            moveVec.normalize();
            container.position.addScaledVector(moveVec, 1.4 * delta);
            const targetRot = Math.atan2(moveVec.x, moveVec.z);
            let diff = (targetRot - container.rotation.y) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            container.rotation.y += diff * Math.min(1, 10 * delta);

            // Obstacle & Building Collision Lockdown: prevent phasing through objects/walls
            const hitObstacle = this.resolveNPCCollision(container, prevPos);
            if (hitObstacle) {
              ud.state = 'IDLE';
              ud.timer = 1.5 + Math.random() * 2.0;
            }

            if (ud.id === 'arthur') this.villagerArthurPos.copy(container.position);
            if (ud.id === 'tom') this.villagerTomPos.copy(container.position);
          } else {
            ud.state = 'IDLE';
            ud.timer = 2.5 + Math.random() * 4.0;
            if (ud.actions['Idle'] && ud.currentAction !== 'Idle') {
              if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.25);
              ud.actions['Idle'].reset().fadeIn(0.25).play();
              ud.currentAction = 'Idle';
            }
          }
        }
      }

      // --- SOUTH GATE GUARD PATROL & COMBAT DEFENSE AI (Alden & Vance actively pace, patrol & kill approaching monsters) ---
      if (ud.isGuard) {
        ud.attackCooldown = Math.max(0, ud.attackCooldown - delta);

        const distToPlayer = playerPos ? container.position.distanceTo(playerPos) : 999;

        // When player gets close to chat with guard, pause and stand at attention
        if (distToPlayer < 2.5) {
          if (ud.currentAction !== 'Idle' && ud.actions['Idle']) {
            if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.2);
            ud.actions['Idle'].reset().fadeIn(0.2).play();
            ud.currentAction = 'Idle';
          }
          const lookDir = playerPos.clone().sub(container.position);
          container.rotation.y = Math.atan2(lookDir.x, lookDir.z);
          return;
        }

        // 1. Scan for threat monsters across the gate perimeter (z: 13.0 to 48.0, |x| <= 22.0)
        let threatMonster = null;
        let minThreatDist = 28.0;

        if (window.gameCombat && window.gameCombat.monsters) {
          for (let m of window.gameCombat.monsters) {
            if (!m.isDead && m.position.z >= 13.0 && m.position.z <= 48.0 && Math.abs(m.position.x) <= 22.0) {
              const d = container.position.distanceTo(m.position);
              if (d < minThreatDist) {
                minThreatDist = d;
                threatMonster = m;
              }
            }
          }
        }

        if (threatMonster) {
          // MONSTER DETECTED: SPRINT TO INTERCEPT & DESTROY!
          const toMon = threatMonster.position.clone().sub(container.position);
          toMon.y = 0;
          const distToMon = toMon.length();
          container.rotation.y = Math.atan2(toMon.x, toMon.z);

          if (distToMon > 2.2) {
            toMon.normalize();
            container.position.addScaledVector(toMon, 4.2 * delta);

            const runClip = ud.actions['Running_A'] ? 'Running_A' : (ud.actions['Walking_A'] ? 'Walking_A' : 'Idle');
            if (ud.actions[runClip] && ud.currentAction !== runClip) {
              if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.18);
              ud.actions[runClip].reset().fadeIn(0.18).play();
              ud.currentAction = runClip;
            }
          } else {
            // Melee sword slash attack!
            if (ud.attackCooldown <= 0) {
              ud.attackCooldown = 0.95;
              const atkClip = ud.actions['1H_Melee_Attack_Slice_Horizontal'] ? '1H_Melee_Attack_Slice_Horizontal' :
                              (ud.actions['1H_Melee_Attack_Chop'] ? '1H_Melee_Attack_Chop' : 'Idle');
              if (ud.actions[atkClip]) {
                if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.12);
                ud.actions[atkClip].reset().fadeIn(0.12).play();
                ud.currentAction = atkClip;
                setTimeout(() => {
                  if (ud.actions[atkClip]) ud.actions[atkClip].fadeOut(0.2);
                  if (ud.actions['Idle']) ud.actions['Idle'].reset().fadeIn(0.2).play();
                  ud.currentAction = 'Idle';
                }, 550);
              }

              threatMonster.takeDamage(60, false, container.position);
              if (window.soundFX) window.soundFX.playSwordSlash();
              if (window.gameHUD && (!ud.lastShoutTime || performance.now() - ud.lastShoutTime > 6000)) {
                ud.lastShoutTime = performance.now();
                const guardName = ud.id === 'guard_alden' ? 'Captain Alden' : 'Guard Vance';
                window.gameHUD.showSimpleToast(`⚔️ ${guardName}: "Halt, monster! The Capital is under our watch!"`);
              }
            }
          }
        } else {
          // 2. NO THREAT: ACTIVE GATE PATROL (March back and forth along the South Gate perimeter!)
          if (ud.state === 'PATROL_IDLE') {
            ud.timer -= delta;
            container.rotation.y = 0; // Face South while vigilant
            if (ud.actions['Idle'] && ud.currentAction !== 'Idle') {
              if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.25);
              ud.actions['Idle'].reset().fadeIn(0.25).play();
              ud.currentAction = 'Idle';
            }
            if (ud.timer <= 0) {
              ud.state = 'PATROL_MARCH';
              ud.patrolIndex = (ud.patrolIndex + 1) % (ud.patrolPoints ? ud.patrolPoints.length : 1);
            }
          } else {
            // PATROL_MARCH towards the next guard waypoint
            const points = ud.patrolPoints || [ud.homePos];
            const targetPoint = points[ud.patrolIndex || 0] || ud.homePos;
            const toTarget = targetPoint.clone().sub(container.position);
            toTarget.y = 0;
            const dist = toTarget.length();

            if (dist > 0.35) {
              toTarget.normalize();
              container.position.addScaledVector(toTarget, 2.2 * delta);
              container.rotation.y = Math.atan2(toTarget.x, toTarget.z);

              const walkClip = ud.actions['Walking_A'] ? 'Walking_A' : 'Idle';
              if (ud.actions[walkClip] && ud.currentAction !== walkClip) {
                if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.2);
                ud.actions[walkClip].reset().fadeIn(0.2).play();
                ud.currentAction = walkClip;
              }
            } else {
              ud.state = 'PATROL_IDLE';
              ud.timer = 2.0 + Math.random() * 2.5; // Stand vigilant for 2-4 seconds, then march again!
            }
          }
        }
      }

      // --- BUILDING INTERIOR SHOPKEEPER ROUTINE AI (Walk in & out of buildings, tend stations, greet player) ---
      if (ud.isShopkeeper && ud.routinePoints) {
        const distToPlayer = playerPos ? container.position.distanceTo(playerPos) : 999;

        // When player gets close (within 2.8m), pause routine and turn to face the player for trade/dialogue!
        if (distToPlayer < 2.8) {
          const idleClip = ud.idleClip || 'Idle';
          if (ud.currentAction !== idleClip && ud.actions[idleClip]) {
            if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.2);
            ud.actions[idleClip].reset().fadeIn(0.2).play();
            ud.currentAction = idleClip;
          }
          const lookDir = playerPos.clone().sub(container.position);
          container.rotation.y = Math.atan2(lookDir.x, lookDir.z);
          return;
        }

        if (ud.state === 'ROUTINE_WORK') {
          ud.timer -= delta;
          if (ud.timer <= 0) {
            ud.state = 'ROUTINE_WALK';
            ud.routineIndex = (ud.routineIndex + 1) % ud.routinePoints.length;
            const target = ud.routinePoints[ud.routineIndex];
            ud.wanderTarget.copy(target.pos);

            const walkClip = ud.actions['Walking_A'] ? 'Walking_A' : (ud.actions['Walking_B'] ? 'Walking_B' : 'Idle');
            if (ud.actions[walkClip] && ud.currentAction !== walkClip) {
              if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.2);
              ud.actions[walkClip].reset().fadeIn(0.2).play();
              ud.currentAction = walkClip;
            }
          }
        } else if (ud.state === 'ROUTINE_WALK') {
          const target = ud.routinePoints[ud.routineIndex];
          const moveVec = target.pos.clone().sub(container.position);
          moveVec.y = 0;
          const dist = moveVec.length();

          if (dist > 0.35) {
            moveVec.normalize();
            container.position.addScaledVector(moveVec, 1.4 * delta);
            const targetRot = Math.atan2(moveVec.x, moveVec.z);
            let diff = (targetRot - container.rotation.y) % (Math.PI * 2);
            if (diff < -Math.PI) diff += Math.PI * 2;
            if (diff > Math.PI) diff -= Math.PI * 2;
            container.rotation.y += diff * Math.min(1, 10 * delta);

            // Sync interaction position with current NPC world location
            if (ud.id === 'borin') this.blacksmithPosition.copy(container.position);
            if (ud.id === 'elina') this.alchemistPosition.copy(container.position);
            if (ud.id === 'glenn') this.barkeepPosition.copy(container.position);
            if (ud.id === 'james') this.npcPosition.copy(container.position);
          } else {
            ud.state = 'ROUTINE_WORK';
            ud.timer = target.wait || 4.5;
            container.position.copy(target.pos);
            if (target.rotY !== undefined) container.rotation.y = target.rotY;

            const workAnim = target.anim || ud.idleClip || 'Idle';
            const actionToPlay = ud.actions[workAnim] ? workAnim : (ud.actions['Idle'] ? 'Idle' : ud.currentAction);
            if (ud.actions[actionToPlay] && ud.currentAction !== actionToPlay) {
              if (ud.actions[ud.currentAction]) ud.actions[ud.currentAction].fadeOut(0.25);
              ud.actions[actionToPlay].reset().fadeIn(0.25).play();
              ud.currentAction = actionToPlay;
            }

            if (ud.id === 'borin') this.blacksmithPosition.copy(container.position);
            if (ud.id === 'elina') this.alchemistPosition.copy(container.position);
            if (ud.id === 'glenn') this.barkeepPosition.copy(container.position);
            if (ud.id === 'james') this.npcPosition.copy(container.position);
          }
        }
      }
    });
  }

  loadAnimatedNPCs() {
    if (typeof THREE.GLTFLoader === 'undefined') return;
    const gltfLoader = new THREE.GLTFLoader();

    const npcConfigs = [
      {
        id: 'arthur',
        model: 'assets/models/human/male.glb',
        pos: new THREE.Vector3(-3.2, 0.05, -2.5),
        rotY: 0.45,
        height: 1.85,
        keep: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight'],
        idleClip: 'Idle'
      },
      {
        id: 'tom',
        model: 'assets/models/human/male.glb',
        pos: new THREE.Vector3(3.2, 0.05, 1.5),
        rotY: -0.6,
        height: 1.85,
        keep: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', '1H_Sword'],
        idleClip: 'Idle'
      },
      {
        id: 'james',
        model: 'assets/models/human/male.glb',
        pos: new THREE.Vector3(0, 0.05, -18.5),
        rotY: 0, // Faces SOUTH towards the guild entrance
        height: 1.85,
        keep: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', 'Knight_Cape'],
        idleClip: 'Idle'
      },
      {
        id: 'borin',
        model: 'assets/models/dwarf/male.glb',
        pos: new THREE.Vector3(-14.5, 0.05, -5.0),
        rotY: -Math.PI / 2,
        height: 1.45,
        keep: ['Barbarian_Body', 'Barbarian_Head', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_LegLeft', 'Barbarian_LegRight', 'Barbarian_Cape', '2H_Axe'],
        idleClip: '2H_Melee_Idle'
      },
      {
        id: 'elina',
        model: 'assets/models/elf/female.glb',
        pos: new THREE.Vector3(14.5, 0.05, -5.0),
        rotY: Math.PI / 2,
        height: 2.0,
        keep: ['Mage_Body', 'Mage_Head', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_LegLeft', 'Mage_LegRight', 'Mage_Cape', 'Mage_Hat', '2H_Staff'],
        idleClip: '2H_Melee_Idle'
      },
      {
        id: 'glenn',
        model: 'assets/models/beastman/male.glb',
        pos: new THREE.Vector3(-14.2, 0.05, 9.8),
        rotY: 0,
        height: 2.1,
        keep: ['Rogue_Body', 'Rogue_Head', 'Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_LegLeft', 'Rogue_LegRight', 'Rogue_Cape'],
        idleClip: 'Idle'
      },
      {
        id: 'guard_alden',
        model: 'assets/models/human/kaykit_knight.glb',
        pos: new THREE.Vector3(-1.8, 0.05, 14.8),
        rotY: 0, // Face SOUTH towards plains
        height: 1.95,
        keep: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', 'Knight_Cape', 'Knight_Helmet', '1H_Sword', 'Round_Shield'],
        idleClip: 'Idle'
      },
      {
        id: 'guard_vance',
        model: 'assets/models/human/kaykit_knight.glb',
        pos: new THREE.Vector3(1.8, 0.05, 14.8),
        rotY: 0, // Face SOUTH towards plains
        height: 1.95,
        keep: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', 'Knight_Cape', 'Knight_Helmet', '1H_Sword', 'Round_Shield'],
        idleClip: 'Idle'
      }
    ];

    npcConfigs.forEach(cfg => {
      gltfLoader.load(
        cfg.model,
        (gltf) => {
          this.setupNPCModel(gltf, cfg);
        },
        undefined,
        (err) => {
          console.warn(`Could not load animated NPC ${cfg.id}:`, err);
        }
      );
    });
  }

  setupNPCModel(gltf, cfg) {
    const model = gltf.scene;

    // Filter visible meshes for each NPC
    model.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        if (!cfg.keep || cfg.keep.includes(child.name)) {
          child.visible = true;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.DoubleSide;
          }
        } else {
          child.visible = false;
        }
      }
    });

    // Compute bounding box of visible meshes
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let meshCount = 0;
    model.traverse((child) => {
      if ((child.isMesh || child.isSkinnedMesh) && child.visible) {
        if (child.geometry) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          box.expandByObject(child);
          meshCount++;
        }
      }
    });
    if (meshCount === 0 || box.isEmpty()) box.setFromObject(model);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = (cfg.height || 1.9) / (size.y || 1);

    model.scale.set(scale, scale, scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    const container = new THREE.Group();
    container.name = `NPC_${cfg.id}`;
    container.position.copy(cfg.pos);
    container.rotation.y = cfg.rotY || 0;
    container.add(model);

    // Setup animations dictionary
    const actions = {};
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => {
        actions[clip.name] = mixer.clipAction(clip);
      });
      const defaultClip = cfg.idleClip || 'Idle';
      if (actions[defaultClip]) {
        actions[defaultClip].play();
      } else if (gltf.animations[0]) {
        mixer.clipAction(gltf.animations[0]).play();
      }
      this.npcMixers.push(mixer);
    }

    const routineConfigs = {
      borin: [
        { pos: new THREE.Vector3(-14.5, 0.05, -5.0), rotY: -Math.PI / 2, anim: '2H_Melee_Idle', wait: 5.5 },
        { pos: new THREE.Vector3(-15.8, 0.05, -3.5), rotY: 0, anim: 'Idle', wait: 4.0 },
        { pos: new THREE.Vector3(-10.2, 0.05, -5.0), rotY: Math.PI / 2, anim: 'Idle', wait: 5.0 }
      ],
      elina: [
        { pos: new THREE.Vector3(14.5, 0.05, -5.0), rotY: Math.PI / 2, anim: '2H_Melee_Idle', wait: 5.5 },
        { pos: new THREE.Vector3(15.8, 0.05, -3.5), rotY: 0, anim: 'Idle', wait: 4.0 },
        { pos: new THREE.Vector3(10.2, 0.05, -5.0), rotY: -Math.PI / 2, anim: 'Idle', wait: 5.0 }
      ],
      glenn: [
        { pos: new THREE.Vector3(-14.2, 0.05, 9.8), rotY: 0, anim: 'Idle', wait: 5.5 },
        { pos: new THREE.Vector3(-12.0, 0.05, 7.8), rotY: Math.PI / 2, anim: 'Idle', wait: 4.0 },
        { pos: new THREE.Vector3(-13.5, 0.05, 4.2), rotY: Math.PI, anim: 'Idle', wait: 5.0 }
      ],
      james: [
        { pos: new THREE.Vector3(0, 0.05, -18.5), rotY: 0, anim: 'Idle', wait: 6.0 },
        { pos: new THREE.Vector3(2.2, 0.05, -18.2), rotY: 0, anim: 'Idle', wait: 4.5 },
        { pos: new THREE.Vector3(-2.2, 0.05, -18.2), rotY: 0, anim: 'Idle', wait: 4.5 }
      ]
    };

    const guardPatrols = {
      guard_alden: [
        new THREE.Vector3(-1.8, 0.05, 14.8),  // Gate Archway
        new THREE.Vector3(-8.5, 0.05, 14.8),  // West Wall Battlement
        new THREE.Vector3(-7.5, 0.05, 22.0),  // Outer Plains Lookout
        new THREE.Vector3(-3.5, 0.05, 18.5)   // Trail Perimeter
      ],
      guard_vance: [
        new THREE.Vector3(1.8, 0.05, 14.8),   // Gate Archway
        new THREE.Vector3(8.5, 0.05, 14.8),   // East Wall Battlement
        new THREE.Vector3(7.5, 0.05, 22.0),   // Outer Plains Lookout
        new THREE.Vector3(3.5, 0.05, 18.5)    // Trail Perimeter
      ]
    };

    const isShopkeeper = ['borin', 'elina', 'glenn', 'james', 'luna'].includes(cfg.id);

    container.userData = {
      id: cfg.id,
      mixer,
      actions,
      currentAction: cfg.idleClip || 'Idle',
      idleClip: cfg.idleClip || 'Idle',
      homePos: cfg.pos.clone(),
      wanderTarget: cfg.pos.clone(),
      state: isShopkeeper ? 'ROUTINE_WORK' : (cfg.id.startsWith('guard') ? 'PATROL_MARCH' : 'IDLE'),
      timer: 1.5 + Math.random() * 2.0,
      isWanderer: cfg.id === 'arthur' || cfg.id === 'aria' || cfg.id === 'tom',
      isGuard: cfg.id === 'guard_alden' || cfg.id === 'guard_vance',
      isShopkeeper: isShopkeeper,
      routinePoints: routineConfigs[cfg.id] || null,
      routineIndex: 0,
      attackCooldown: 0,
      patrolIndex: 0,
      patrolPoints: guardPatrols[cfg.id] || [cfg.pos]
    };

    this.scene.add(container);
    this.animatedNPCs[cfg.id] = container;
    if (cfg.id === 'james') {
      this.animatedNPCs['luna'] = container;
    }

    // Hide procedural placeholder when 3D animated model is ready
    if (this.proceduralNPCs[cfg.id]) {
      const p = this.proceduralNPCs[cfg.id];
      if (Array.isArray(p)) {
        p.forEach(m => { m.visible = false; });
      } else {
        p.visible = false;
      }
    }
  }

  getValidPlazaWanderTarget(homePos, maxDist = 5.5) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 1.8 + Math.random() * maxDist;
      const tx = Math.max(-8.5, Math.min(8.5, homePos.x + Math.sin(ang) * r));
      const tz = Math.max(-7.5, Math.min(12.0, homePos.z + Math.cos(ang) * r));

      // 1. Avoid Central Fountain (radius 3.1)
      if (tx * tx + tz * tz < 3.1 * 3.1) continue;

      // 2. Avoid Plaza Benches
      const nearBench = (
        (tx > -4.0 && tx < -1.6 && Math.abs(tz - -2.4) < 1.0) ||
        (tx > 1.6 && tx < 4.0 && Math.abs(tz - -2.4) < 1.0) ||
        (tx > -4.0 && tx < -1.6 && Math.abs(tz - 2.4) < 1.0) ||
        (tx > 1.6 && tx < 4.0 && Math.abs(tz - 2.4) < 1.0)
      );
      if (nearBench) continue;

      // 3. Avoid Town Buildings
      if (tx < -10.0 || tx > 10.0) continue;
      if (tz < -8.8 || tz > 13.5) continue;

      return new THREE.Vector3(tx, homePos.y, tz);
    }
    return homePos.clone();
  }

  resolveNPCCollision(container, prevPos) {
    const radius = 0.45;

    // 1. Central Plaza Fountain (Center: 0, 0, Radius: 2.85)
    const distFountainSq = container.position.x * container.position.x + container.position.z * container.position.z;
    const minFountainDist = 2.85 + radius;
    if (distFountainSq < minFountainDist * minFountainDist) {
      const d = Math.sqrt(distFountainSq) || 0.001;
      const overlap = minFountainDist - d;
      container.position.x += (container.position.x / d) * overlap;
      container.position.z += (container.position.z / d) * overlap;
      return true;
    }

    // 2. Plaza Benches (4 benches surrounding fountain)
    const benches = [
      { minX: -3.8, maxX: -1.8, minZ: -2.8, maxZ: -2.0 },
      { minX: 1.8,  maxX: 3.8,  minZ: -2.8, maxZ: -2.0 },
      { minX: -3.8, maxX: -1.8, minZ: 2.0,  maxZ: 2.8 },
      { minX: 1.8,  maxX: 3.8,  minZ: 2.0,  maxZ: 2.8 }
    ];
    for (let b of benches) {
      if (container.position.x > b.minX - radius && container.position.x < b.maxX + radius &&
          container.position.z > b.minZ - radius && container.position.z < b.maxZ + radius) {
        container.position.x = prevPos.x;
        container.position.z = prevPos.z;
        return true;
      }
    }

    // 3. Town Buildings & Wall Envelopes (No phasing through structures)
    const obstacles = [
      { minX: -17.8, maxX: -11.0, minZ: -8.5, maxZ: -1.5 }, // Blacksmith Forge
      { minX: 11.0,  maxX: 17.8,  minZ: -8.5, maxZ: -1.5 }, // Alchemist Shop
      { minX: -17.2, maxX: -9.8,  minZ: 5.2,  maxZ: 11.8 }, // Tavern
      { minX: 9.8,   maxX: 17.2,  minZ: 5.2,  maxZ: 11.8 }, // General Store
      { minX: -12.0, maxX: 12.0,  minZ: -25.0, maxZ: -9.6 }, // Guild Hall Facade
      { minX: -20.0, maxX: -1.8,  minZ: 14.2, maxZ: 17.0 }, // South Gate Left Wall
      { minX: 1.8,   maxX: 20.0,  minZ: 14.2, maxZ: 17.0 }  // South Gate Right Wall
    ];

    for (let obs of obstacles) {
      if (container.position.x > obs.minX - radius && container.position.x < obs.maxX + radius &&
          container.position.z > obs.minZ - radius && container.position.z < obs.maxZ + radius) {
        container.position.x = prevPos.x;
        container.position.z = prevPos.z;
        return true;
      }
    }

    // 4. Clamped strictly inside the walkable Plaza floor bounds
    const clampedX = Math.max(-9.5, Math.min(9.5, container.position.x));
    const clampedZ = Math.max(-8.5, Math.min(13.5, container.position.z));
    if (clampedX !== container.position.x || clampedZ !== container.position.z) {
      container.position.x = clampedX;
      container.position.z = clampedZ;
      return true;
    }

    return false;
  }

  getGroundMeshes() {
    return [this.plaza, this.valley, this.guildFloor, ...(this.indoorFloors || [])].filter(Boolean);
  }
}

window.StarterTown = StarterTown;
