// Plains.js - Beautiful Isekai Open Field: Whispering Plains (Level 1-5 Hunting Field)
// Seamlessly connects outside the South Town Gate with rolling green hills,
// ancient stone ruins, wildflowers, anime trees, wooden fences, and wind particles.

class WhisperingPlains {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'WhisperingPlains';

    this.initMaterials();
    this.buildTerrain();
    this.buildPathsAndFences();
    this.buildRuins();
    this.buildSlimeMire();
    this.buildGoblinCamp();
    this.buildVegetation();
    this.buildWindParticles();

    this.scene.add(this.group);
  }

  initMaterials() {
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x38b259, // Vibrant lush anime green
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true
    });

    this.hillGrassMat = new THREE.MeshStandardMaterial({
      color: 0x2e9b4c, // Slightly deeper green for rolling hills
      roughness: 0.9,
      flatShading: true
    });

    this.dirtPathMat = new THREE.MeshStandardMaterial({
      color: 0x8b6b47, // Warm medieval earth path
      roughness: 0.95
    });

    this.fenceMat = new THREE.MeshStandardMaterial({
      color: 0x543828, // Aged rustic timber
      roughness: 0.8
    });

    this.ancientStoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Weathered mossy stone
      roughness: 0.7,
      metalness: 0.1
    });

    this.runeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });

    // Marsh & Slime Mire Materials
    this.marshGrassMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a1e, // Deep bog wetland moss
      roughness: 0.95,
      flatShading: true
    });

    this.marshWaterMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Murky teal swamp water
      emissive: 0x042f2e,
      emissiveIntensity: 0.2,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85
    });

    this.shroomStemMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.7
    });

    this.shroomCapCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    this.shroomCapEmerald = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    // Goblin Warband Ridge Materials
    this.ridgeRockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.9,
      flatShading: true
    });

    this.spikesMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85
    });

    this.campfireFireMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 2.8
    });
  }

  buildTerrain() {
    // 1. Expanded Open-World Plains Ground Base (z: 14 to 92, x: -70 to 70)
    const plainsGeo = new THREE.PlaneGeometry(140, 78, 28, 20);
    plainsGeo.rotateX(-Math.PI / 2);

    // Apply elevation: keep center path level, lower marsh on West, raise ridge on East
    const pos = plainsGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);

      const distFromPath = Math.abs(px);
      if (distFromPath > 6) {
        // Rolling gentle mounds on flanks
        let height = Math.sin(px * 0.1) * Math.cos(pz * 0.08) * 1.2;
        // West: Slime Mire basin stays lower
        if (px < -28 && pz > 35 && pz < 75) {
          height = Math.max(0.04, 0.08 + Math.sin(px * 0.2) * 0.1);
        }
        // East: Goblin Ridge plateau is slightly elevated (up to 2.2m)
        else if (px > 30 && pz > 38 && pz < 75) {
          height = Math.min(2.4, 0.6 + Math.sin(px * 0.15) * 1.2);
        }
        pos.setY(i, Math.max(0.05, height));
      } else {
        pos.setY(i, 0.05);
      }
    }
    plainsGeo.computeVertexNormals();

    const plainsMesh = new THREE.Mesh(plainsGeo, this.grassMat);
    plainsMesh.position.set(0, 0, 53.5); // Center of z: 14.5 to 92.5
    plainsMesh.receiveShadow = true;
    plainsMesh.updateMatrixWorld(true);
    this.group.add(plainsMesh);
    this.plainsMesh = plainsMesh;

    // 2. Rolling Distant Hill Horizons (Surrounding the hunting field)
    this.hills = [];
    const hillCoords = [
      { x: -55, z: 38, s: 1.4 },
      { x: -62, z: 68, s: 1.8 },
      { x: 55, z: 35, s: 1.4 },
      { x: 60, z: 70, s: 1.8 },
      { x: -28, z: 92, s: 1.6 },
      { x: 28, z: 94, s: 1.5 }
    ];

    hillCoords.forEach(c => {
      const hill = new THREE.Mesh(new THREE.DodecahedronGeometry(14 * c.s, 1), this.hillGrassMat);
      hill.position.set(c.x, -2, c.z);
      hill.scale.set(1.4, 0.5, 1.4);
      hill.receiveShadow = true;
      hill.updateMatrixWorld(true);
      this.group.add(hill);
      this.hills.push(hill);
    });
  }

  buildPathsAndFences() {
    // 1. Dirt Adventurer Trail extending south from Town Gate
    const pathGeo = new THREE.PlaneGeometry(3.6, 75);
    pathGeo.rotateX(-Math.PI / 2);
    const path = new THREE.Mesh(pathGeo, this.dirtPathMat);
    path.position.set(0, 0.065, 52); // Slightly above ground
    path.receiveShadow = true;
    this.group.add(path);

    // 2. Wooden Split-Rail Guide Fences along trail exit
    for (let side of [-1, 1]) {
      const fx = side * 2.8;
      for (let z = 16; z <= 42; z += 4.5) {
        // Vertical Post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6), this.fenceMat);
        post.position.set(fx, 0.6, z);
        post.castShadow = true;
        this.group.add(post);

        // Horizontal Rails
        if (z < 42) {
          const rail1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 6), this.fenceMat);
          rail1.rotation.x = Math.PI / 2;
          rail1.position.set(fx, 0.45, z + 2.25);
          this.group.add(rail1);

          const rail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.6, 6), this.fenceMat);
          rail2.rotation.x = Math.PI / 2;
          rail2.position.set(fx, 0.85, z + 2.25);
          this.group.add(rail2);
        }
      }
    }

    // 3. Wooden Directional Signpost at Gate Exit (z = 16.5)
    this.buildSignpost(2.2, 0, 16.5);
  }

  buildSignpost(x, y, z) {
    const postGroup = new THREE.Group();
    postGroup.position.set(x, y, z);

    // Post
    const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8), this.fenceMat);
    wood.position.y = 1.1;
    wood.castShadow = true;
    postGroup.add(wood);

    // Arrow Pointing South: Whispering Plains
    const signSouth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.08), this.fenceMat);
    signSouth.position.set(0.3, 1.8, 0);
    signSouth.rotation.y = 0.15;
    postGroup.add(signSouth);

    // Arrow Pointing North: Capital Aetheria
    const signNorth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.08), this.fenceMat);
    signNorth.position.set(-0.3, 1.35, 0);
    signNorth.rotation.y = -0.15;
    postGroup.add(signNorth);

    this.group.add(postGroup);
  }

  buildRuins() {
    // Ancient Mossy Archway Ruins in the center of the field (z = 48, x = 0)
    const ruins = new THREE.Group();
    ruins.position.set(0, 0, 48);

    // Left & Right weathered pillars
    for (let px of [-4.5, 4.5]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.0, 1.4), this.ancientStoneMat);
      p.position.set(px, 2.5, 0);
      p.castShadow = true;
      p.receiveShadow = true;
      ruins.add(p);

      // Glowing Ancient Rune Inlay
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.6), this.runeMat);
      rune.position.set(px > 0 ? px - 0.71 : px + 0.71, 2.5, 0);
      rune.rotation.y = px > 0 ? -Math.PI / 2 : Math.PI / 2;
      ruins.add(rune);
    }

    // Broken Arch Lintels
    const lintelLeft = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 1.4), this.ancientStoneMat);
    lintelLeft.position.set(-2.6, 5.2, 0);
    lintelLeft.rotation.z = -0.08;
    lintelLeft.castShadow = true;
    ruins.add(lintelLeft);

    const lintelRight = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.4), this.ancientStoneMat);
    lintelRight.position.set(2.8, 5.1, 0);
    lintelRight.rotation.z = 0.06;
    lintelRight.castShadow = true;
    ruins.add(lintelRight);

    // Fallen Stone Monolith chunk on the ground
    const fallen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.3), this.ancientStoneMat);
    fallen.position.set(3.2, 0.55, 2.4);
    fallen.rotation.set(0.2, 0.4, 0.1);
    fallen.castShadow = true;
    ruins.add(fallen);

    // Adventurer Crossroads Directional Signpost
    const crossroadSign = new THREE.Group();
    crossroadSign.position.set(-2.5, 0, 2.8);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), this.fenceMat);
    post.position.y = 1.2;
    post.castShadow = true;
    crossroadSign.add(post);

    // Arrow West: Slime Mire & King Slime
    const signWest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.08), this.fenceMat);
    signWest.position.set(-0.7, 2.0, 0);
    crossroadSign.add(signWest);

    // Arrow East: Goblin Ridge & Warband Camp
    const signEast = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.08), this.fenceMat);
    signEast.position.set(0.7, 1.6, 0);
    crossroadSign.add(signEast);

    // Arrow North: Mystic Caverns Dungeon
    const signNorth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.08), this.fenceMat);
    signNorth.position.set(0, 1.2, 0.4);
    signNorth.rotation.y = Math.PI / 2;
    crossroadSign.add(signNorth);

    ruins.add(crossroadSign);
    this.group.add(ruins);
  }

  buildSlimeMire() {
    // South-West Open World Zone: Slime Mire & King Slime Hollow (x: -45, z: 55)
    const mire = new THREE.Group();
    mire.position.set(-45, 0, 55);

    // 1. Murky Marsh Water Pool
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12.0, 0.08, 24), this.marshWaterMat);
    pool.position.y = 0.055;
    mire.add(pool);

    // Floating Marsh Lily Pads
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8 + Math.random() * 0.4;
      const rad = 3.0 + Math.random() * 6.5;
      const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.02, 8), this.marshGrassMat);
      lily.position.set(Math.sin(ang) * rad, 0.065, Math.cos(ang) * rad);
      mire.add(lily);
    }

    // 2. Weathered Sunken Ancient Monoliths forming Boss Arena Ring
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.8, 1.2), this.ancientStoneMat);
      col.position.set(Math.sin(ang) * 9.5, 1.4, Math.cos(ang) * 9.5);
      col.rotation.set((Math.random() - 0.5) * 0.25, ang, (Math.random() - 0.5) * 0.25);
      col.castShadow = true;
      col.receiveShadow = true;
      mire.add(col);

      // Glowing Cyan/Emerald Rune Inlay
      const rMat = i % 2 === 0 ? this.runeMat : this.shroomCapEmerald;
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.4), rMat);
      rune.position.set(Math.sin(ang) * 8.8, 1.6, Math.cos(ang) * 8.8);
      rune.rotation.y = -ang;
      mire.add(rune);
    }

    // 3. Giant Bioluminescent Fantasy Toadstools (Emerald & Azure)
    const shroomCoords = [
      { x: -9.5, z: -5.0, col: 'cyan', h: 3.8, r: 1.8 },
      { x: 9.0, z: -6.5, col: 'emerald', h: 4.2, r: 2.1 },
      { x: -7.5, z: 8.0, col: 'emerald', h: 3.2, r: 1.6 },
      { x: 8.5, z: 7.5, col: 'cyan', h: 4.6, r: 2.3 }
    ];

    shroomCoords.forEach(sc => {
      const shroom = new THREE.Group();
      shroom.position.set(sc.x, 0, sc.z);

      // Curved Stalk
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, sc.h, 8), this.shroomStemMat);
      stalk.position.y = sc.h * 0.5;
      stalk.rotation.z = (sc.x < 0 ? 0.08 : -0.08);
      stalk.castShadow = true;
      shroom.add(stalk);

      // Glowing Bioluminescent Dome Cap
      const cMat = sc.col === 'cyan' ? this.shroomCapCyan : this.shroomCapEmerald;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(sc.r, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), cMat);
      cap.position.y = sc.h;
      cap.scale.set(1.0, 0.65, 1.0);
      shroom.add(cap);

      mire.add(shroom);
    });

    this.group.add(mire);
  }

  buildGoblinCamp() {
    // North-East Open World Zone: Goblin Ridge & Warband Encampment (x: 45, z: 58)
    const camp = new THREE.Group();
    camp.position.set(45, 0, 58);

    // 1. Spiked Wooden Palisades (Sharpened timber logs forming defensive perimeter)
    for (let i = 0; i < 9; i++) {
      const ang = -Math.PI * 0.65 + (i * Math.PI * 1.3) / 8;
      const px = Math.sin(ang) * 12.0;
      const pz = Math.cos(ang) * 12.0;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 6), this.spikesMat);
      post.position.set(px, 1.3, pz);
      post.rotation.set((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15);
      post.castShadow = true;
      camp.add(post);

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 6), this.spikesMat);
      spike.position.set(px, 2.8, pz);
      camp.add(spike);
    }

    // 2. Goblin Hide Watchtower
    const tower = new THREE.Group();
    tower.position.set(6.5, 0, -4.5);

    // 4 Sturdy Timber Stilts
    for (let tx of [-1.2, 1.2]) {
      for (let tz of [-1.2, 1.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.2, 6), this.spikesMat);
        leg.position.set(tx, 2.1, tz);
        leg.castShadow = true;
        tower.add(leg);
      }
    }

    // Elevated Wooden Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 3.0), this.spikesMat);
    platform.position.y = 3.6;
    platform.castShadow = true;
    tower.add(platform);

    // Platform Railing
    for (let rz of [-1.4, 1.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.08), this.fenceMat);
      rail.position.set(0, 4.2, rz);
      tower.add(rail);
    }

    // Thatched Hide Canopy
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.1, 4), this.spikesMat);
    canopy.position.y = 5.2;
    canopy.rotation.y = Math.PI / 4;
    canopy.castShadow = true;
    tower.add(canopy);

    camp.add(tower);

    // 3. Central Roaring Warband Campfire
    const fireGroup = new THREE.Group();
    fireGroup.position.set(0, 0, 0);

    // Stone Fire Pit Ring
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), this.ridgeRockMat);
      rock.position.set(Math.sin(ang) * 0.9, 0.12, Math.cos(ang) * 0.9);
      fireGroup.add(rock);
    }

    // Burning Charred Logs
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 5), this.spikesMat);
      log.rotation.set(0.4, (i * Math.PI) / 3, 0);
      log.position.y = 0.25;
      fireGroup.add(log);
    }

    // Emissive Flame Core
    const flame = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), this.campfireFireMat);
    flame.position.y = 0.55;
    fireGroup.add(flame);

    // Flickering Orange Campfire Light
    const campLight = new THREE.PointLight(0xf97316, 1.8, 14);
    campLight.position.y = 1.1;
    fireGroup.add(campLight);

    camp.add(fireGroup);

    // 4. Tribal Skull Totem Posts
    for (let sx of [-4.5, 4.5]) {
      const totem = new THREE.Group();
      totem.position.set(sx, 0, 2.5);

      const tPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 6), this.spikesMat);
      tPost.position.y = 1.25;
      totem.add(tPost);

      // Carved Skull on Totem
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), this.ridgeRockMat);
      skull.position.y = 2.6;
      skull.scale.set(1.0, 1.15, 0.85);
      totem.add(skull);

      camp.add(totem);
    }

    this.group.add(camp);
  }

  buildVegetation() {
    // 1. Birch and Oak anime trees scattered across plains
    const treeLocs = [
      { x: -14, z: 26, color: 0x15803d, scale: 1.1 },
      { x: 15, z: 28, color: 0x16a34a, scale: 1.05 },
      { x: -22, z: 38, color: 0x22c55e, scale: 1.2 },
      { x: 24, z: 42, color: 0x15803d, scale: 1.15 },
      { x: -18, z: 62, color: 0x16a34a, scale: 1.25 },
      { x: 22, z: 66, color: 0x22c55e, scale: 1.1 },
      { x: -8, z: 76, color: 0x15803d, scale: 1.3 },
      { x: 12, z: 80, color: 0x16a34a, scale: 1.2 }
    ];

    treeLocs.forEach(t => {
      this.buildPlainsTree(t.x, 0, t.z, t.color, t.scale);
    });

    // 2. Wildflower Patches (Buttercups, Lavender, Azure Mana flowers)
    const flowerColors = [0xfbbf24, 0xa855f7, 0x38bdf8, 0xf43f5e];
    for (let i = 0; i < 48; i++) {
      const fx = (Math.random() - 0.5) * 55;
      if (Math.abs(fx) < 2.5) continue; // Don't block center path
      const fz = 18 + Math.random() * 65;
      const fMat = new THREE.MeshStandardMaterial({
        color: flowerColors[i % flowerColors.length],
        roughness: 0.6
      });

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), this.grassMat);
      stem.position.set(fx, 0.12, fz);
      this.group.add(stem);

      const blossom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), fMat);
      blossom.position.set(fx, 0.26, fz);
      this.group.add(blossom);
    }
  }

  buildPlainsTree(x, y, z, leafColor, scale = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    tree.scale.set(scale, scale, scale);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 3.2, 8), this.fenceMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);

    // Fluffy anime leaf canopy clusters
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.75,
      flatShading: true
    });

    const clusters = [
      { r: 1.6, x: 0, y: 3.6, z: 0 },
      { r: 1.25, x: -0.6, y: 4.2, z: 0.4 },
      { r: 1.2, x: 0.6, y: 4.4, z: -0.4 },
      { r: 0.95, x: 0, y: 5.0, z: 0 }
    ];

    clusters.forEach(c => {
      const fol = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), leafMat);
      fol.position.set(c.x, c.y, c.z);
      fol.castShadow = true;
      fol.receiveShadow = true;
      tree.add(fol);
    });

    this.group.add(tree);
  }

  buildWindParticles() {
    // Ambient floating dandelion pollen & leaf spores
    const count = 90;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = 0.5 + Math.random() * 8;
      pos[i * 3 + 2] = 16 + Math.random() * 70;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.35,
      transparent: true,
      opacity: 0.75
    });

    this.windParticles = new THREE.Points(geo, mat);
    this.group.add(this.windParticles);
  }

  update(delta) {
    // Drift wind particles southwards
    if (this.windParticles) {
      const pos = this.windParticles.geometry.attributes.position.array;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += Math.sin(Date.now() * 0.001 + i) * delta * 0.4;
        pos[i * 3 + 1] += Math.sin(Date.now() * 0.002 + i) * delta * 0.2;
        pos[i * 3 + 2] += delta * 1.5; // Wind blow

        // Wrap around
        if (pos[i * 3 + 2] > 88) {
          pos[i * 3 + 2] = 16;
        }
      }
      this.windParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  getGroundMeshes() {
    return [this.plainsMesh, ...(this.hills || [])].filter(Boolean);
  }
}

window.WhisperingPlains = WhisperingPlains;
