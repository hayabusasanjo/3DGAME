// Dungeon.js - The Mystic Crystal Caverns (Fully Enclosed Subterranean Dungeon Zone Level 5+)
// Features a rugged mountain cave mouth portal, double-sided rock-vaulted ceiling (zero sky bleed),
// Gothic stone archway ribs, hanging stalactites, floor stalagmites, torch sconces,
// hanging iron cages, mining rails, and an imposing Crystal Boss Sanctum Arena.

class MysticCaverns {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'MysticCaverns';
    this.crystals = [];
    this.torches = [];
    this.props = [];

    this.initMaterials();
    this.buildMountainFacade();
    this.buildCavernInterior();
    this.buildGothicArchRibs();
    this.buildStalactitesAndMites();
    this.buildCrystals();
    this.buildDungeonProps();
    this.buildBossSanctum();

    this.scene.add(this.group);
  }

  initMaterials() {
    // Weathered Dark Slate Cavern Stone (Double-sided for complete internal coverage)
    this.caveRockMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide
    });

    this.caveCeilingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Obsidian midnight cavern vault (100% blocks external sky/light)
      roughness: 0.98,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide
    });

    this.caveFloorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9
    });

    this.dungeonStoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true
    });

    this.cyanCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.9
    });

    this.purpleCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.9
    });

    this.timberMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.85
    });

    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.3
    });

    this.rustedIronMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      metalness: 0.6,
      roughness: 0.6
    });

    this.goldRuneMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
      roughness: 0.3
    });
  }

  buildMountainFacade() {
    // 1. Rugged Mountain Face & Cave Mouth Portal at z = 86.0
    const facadeGroup = new THREE.Group();
    facadeGroup.position.set(0, 0, 86.0);

    // Mountain Rock Crags Left and Right
    const mountainPeaks = [
      { x: -36, y: 8, z: -1, rx: 14, ry: 18, rz: 12 },
      { x: -22, y: 7, z: 0, rx: 11, ry: 15, rz: 10 },
      { x: -11, y: 6.5, z: -1, rx: 8, ry: 13, rz: 9 },
      { x: 11,  y: 6.5, z: -1, rx: 8, ry: 13, rz: 9 },
      { x: 22,  y: 7, z: 0, rx: 11, ry: 15, rz: 10 },
      { x: 36,  y: 8, z: -1, rx: 14, ry: 18, rz: 12 }
    ];

    mountainPeaks.forEach((p, idx) => {
      const peakMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), this.caveRockMat);
      peakMesh.position.set(p.x, p.y, p.z);
      peakMesh.scale.set(p.rx, p.ry, p.rz);
      peakMesh.rotation.set((idx % 3) * 0.2, idx * 0.6, 0);
      peakMesh.receiveShadow = true;
      facadeGroup.add(peakMesh);
    });

    // Massive Mountain Cave Mouth Archway (Width ~8m, Height ~6m)
    const leftPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8, 1), this.caveRockMat);
    leftPillar.position.set(-5.5, 3.6, -1.2);
    leftPillar.scale.set(1.1, 1.8, 1.2);
    facadeGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8, 1), this.caveRockMat);
    rightPillar.position.set(5.5, 3.6, -1.2);
    rightPillar.scale.set(1.1, 1.8, 1.2);
    facadeGroup.add(rightPillar);

    const archOverhang = new THREE.Mesh(new THREE.DodecahedronGeometry(5.2, 1), this.caveRockMat);
    archOverhang.position.set(0, 7.8, -1.0);
    archOverhang.scale.set(2.2, 1.2, 1.5);
    facadeGroup.add(archOverhang);

    // Front Entrance Wall blocking any gaps above doorway
    const entranceHeadwall = new THREE.Mesh(new THREE.BoxGeometry(44, 14, 3.0), this.caveRockMat);
    entranceHeadwall.position.set(0, 10.0, 1.0);
    facadeGroup.add(entranceHeadwall);

    // Runic Obelisks flanking the cave entrance (Emissive crystals)
    for (let ox of [-4.5, 4.5]) {
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 4.5, 6), this.dungeonStoneMat);
      obelisk.position.set(ox, 2.25, -2.4);
      facadeGroup.add(obelisk);

      const runeGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), ox < 0 ? this.cyanCrystalMat : this.purpleCrystalMat);
      runeGem.position.set(ox, 4.75, -2.4);
      facadeGroup.add(runeGem);
    }

    // Heavy Iron Dungeon Hanging Chains at Portal
    for (let cx of [-2.4, -0.8, 0.8, 2.4]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), this.rustedIronMat);
      chain.position.set(cx, 4.8, -1.4);
      facadeGroup.add(chain);
    }

    // Weathered Skull Warning Sign
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), this.timberMat);
    signPost.position.set(4.8, 1.1, -3.8);
    facadeGroup.add(signPost);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.12), this.timberMat);
    signBoard.position.set(4.8, 1.8, -3.8);
    signBoard.rotation.z = -0.06;
    facadeGroup.add(signBoard);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), this.dungeonStoneMat);
    skull.position.set(4.8, 1.8, -3.7);
    facadeGroup.add(skull);

    // Entrance Torch Braziers with 1 efficient shared Entrance Flame Light
    for (let bx of [-3.8, 3.8]) {
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 1.4, 8), this.ironMat);
      brazier.position.set(bx, 0.7, -2.8);
      facadeGroup.add(brazier);

      const fireMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 2.5 }));
      fireMesh.position.set(bx, 1.45, -2.8);
      facadeGroup.add(fireMesh);
    }

    // Single warm portal light for cavern mouth
    const portalLight = new THREE.PointLight(0xf97316, 1.4, 15);
    portalLight.position.set(0, 2.5, -2.4);
    facadeGroup.add(portalLight);
    this.torches.push(portalLight);

    this.group.add(facadeGroup);
  }

  buildCavernInterior() {
    // 2. Continuous Subterranean Floor (z = 86 to 150, width 44m)
    const floorGeo = new THREE.PlaneGeometry(44, 64, 16, 20);
    floorGeo.rotateX(-Math.PI / 2);

    const pos = floorGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      if (Math.abs(px) > 3.8) {
        pos.setY(i, 0.05 + Math.sin(px * 0.22) * Math.cos(pz * 0.18) * 0.28);
      } else {
        pos.setY(i, 0.05); // Smooth center path
      }
    }
    floorGeo.computeVertexNormals();

    const floorMesh = new THREE.Mesh(floorGeo, this.caveFloorMat);
    floorMesh.position.set(0, 0, 118);
    floorMesh.receiveShadow = true;
    floorMesh.updateMatrixWorld(true);
    this.group.add(floorMesh);
    this.dungeonFloor = floorMesh;

    // 3. FULLY ENCLOSED SOLID ROOF / VAULTED CAVERN CEILING (Zero Sky Bleed!)
    // Using Double-Sided Tunnel Vault Geometry spanning z: 86 to 150
    const vaultLength = 64;
    const vaultRadius = 22;

    const vaultGeo = new THREE.CylinderGeometry(
      vaultRadius, vaultRadius, vaultLength, 24, 1, true, 0, Math.PI
    );
    vaultGeo.rotateZ(Math.PI / 2);
    vaultGeo.rotateY(Math.PI / 2);

    const cavernVault = new THREE.Mesh(vaultGeo, this.caveCeilingMat);
    cavernVault.position.set(0, 5.5, 118);
    cavernVault.castShadow = true;
    cavernVault.receiveShadow = true;
    this.group.add(cavernVault);

    // Thick Enclosing Side Walls (x = -22 and x = +22)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 12, vaultLength), this.caveRockMat);
    leftWall.position.set(-22, 6, 118);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 12, vaultLength), this.caveRockMat);
    rightWall.position.set(22, 6, 118);
    this.group.add(rightWall);

    // Cavern Back End Wall at z = 150
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(44, 14, 4.0), this.caveRockMat);
    backWall.position.set(0, 7, 150);
    this.group.add(backWall);

    // Efficient atmospheric ambient fill light for the mid-cavern tunnel
    const midCaveLight = new THREE.PointLight(0x38bdf8, 1.2, 26);
    midCaveLight.position.set(0, 5.5, 116);
    this.group.add(midCaveLight);
  }

  buildGothicArchRibs() {
    // 4. Massive Carved Stone Dungeon Arch Ribs spaced every 10 meters
    for (let rz = 94; rz <= 142; rz += 10) {
      const ribGroup = new THREE.Group();
      ribGroup.position.set(0, 0, rz);

      // Left Pillar
      const leftCol = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 1.4), this.dungeonStoneMat);
      leftCol.position.set(-16, 3.75, 0);
      leftCol.castShadow = true;
      ribGroup.add(leftCol);

      // Right Pillar
      const rightCol = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 1.4), this.dungeonStoneMat);
      rightCol.position.set(16, 3.75, 0);
      rightCol.castShadow = true;
      ribGroup.add(rightCol);

      // Overhead Vaulting Arch Beam
      const archBeam = new THREE.Mesh(new THREE.BoxGeometry(32.5, 1.2, 1.4), this.dungeonStoneMat);
      archBeam.position.set(0, 7.5, 0);
      archBeam.castShadow = true;
      ribGroup.add(archBeam);

      // Hanging Iron Dungeon Sconces with Glowing Flickering Torches
      for (let tx of [-14.5, 14.5]) {
        const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), this.ironMat);
        sconce.position.set(tx, 4.8, 0.8);
        ribGroup.add(sconce);

        const flame = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 2.5 }));
        flame.position.set(tx, 5.1, 0.8);
        ribGroup.add(flame);
      }

      this.group.add(ribGroup);
    }
  }

  buildStalactitesAndMites() {
    // 5. Ceiling Stalactites hanging into the corridor
    const stalactiteCoords = [
      { x: -8, y: 7.2, z: 98, h: 2.4, r: 0.45 },
      { x: 7,  y: 7.4, z: 104, h: 2.8, r: 0.5 },
      { x: -12, y: 6.8, z: 112, h: 3.0, r: 0.55 },
      { x: 10, y: 7.0, z: 120, h: 2.6, r: 0.48 },
      { x: -6, y: 7.5, z: 128, h: 2.2, r: 0.42 },
      { x: 8,  y: 7.3, z: 134, h: 3.2, r: 0.58 },
      { x: -4, y: 7.4, z: 142, h: 2.5, r: 0.45 }
    ];

    stalactiteCoords.forEach(st => {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(st.r, st.h, 6), this.caveRockMat);
      mesh.position.set(st.x, st.y - st.h * 0.5, st.z);
      mesh.rotation.x = Math.PI; // Inverted pointing down
      this.group.add(mesh);
    });

    // Floor Stalagmites rising along cavern margins
    const stalagmiteCoords = [
      { x: -12, z: 96, h: 2.0, r: 0.4 },
      { x: 13, z: 100, h: 2.4, r: 0.45 },
      { x: -15, z: 110, h: 2.8, r: 0.5 },
      { x: 14, z: 118, h: 2.2, r: 0.42 },
      { x: -14, z: 130, h: 3.2, r: 0.6 },
      { x: 13, z: 138, h: 2.5, r: 0.48 }
    ];

    stalagmiteCoords.forEach(sm => {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(sm.r, sm.h, 6), this.caveRockMat);
      mesh.position.set(sm.x, sm.h * 0.5, sm.z);
      this.group.add(mesh);
    });
  }

  buildCrystals() {
    // 6. Bioluminescent Amethyst & Azure Crystal Sanctums
    const crystalCoords = [
      { x: -14, z: 98, color: 'purple', scale: 1.6 },
      { x: 15, z: 102, color: 'cyan', scale: 1.7 },
      { x: -17, z: 114, color: 'cyan', scale: 2.0 },
      { x: 16, z: 122, color: 'purple', scale: 1.8 },
      { x: -13, z: 134, color: 'purple', scale: 2.2 },
      { x: 14, z: 140, color: 'cyan', scale: 2.4 },
      { x: 0, z: 146, color: 'purple', scale: 2.8 } // Grand Boss Sanctum Crystal Spire
    ];

    crystalCoords.forEach(c => {
      this.buildCrystalCluster(c.x, 0, c.z, c.color, c.scale);
    });
  }

  buildCrystalCluster(x, y, z, colorType, scale = 1.0) {
    const cluster = new THREE.Group();
    cluster.position.set(x, y, z);
    cluster.scale.set(scale, scale, scale);

    const mat = colorType === 'purple' ? this.purpleCrystalMat : this.cyanCrystalMat;
    const lightColor = colorType === 'purple' ? 0xa855f7 : 0x38bdf8;

    // Main Crystal Spire
    const mainSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), mat);
    mainSpire.scale.set(0.65, 2.5, 0.65);
    mainSpire.position.y = 1.5;
    mainSpire.rotation.y = Math.random() * Math.PI;
    cluster.add(mainSpire);

    // 4 Surrounding Angled Shards
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), mat);
      shard.scale.set(0.5, 1.8, 0.5);
      shard.position.set(Math.sin(ang) * 0.85, 0.9, Math.cos(ang) * 0.85);
      shard.rotation.set((Math.random() - 0.5) * 0.45, 0, (Math.random() - 0.5) * 0.45);
      cluster.add(shard);
    }

    this.crystals.push({ cluster });

    this.group.add(cluster);
  }

  buildDungeonProps() {
    // 7. Abandoned Minecart Tracks running down the center corridor (z = 90 to 134)
    const trackGeo = new THREE.BoxGeometry(0.12, 0.08, 44);
    const tieGeo = new THREE.BoxGeometry(2.4, 0.1, 0.28);

    for (let rx of [-0.9, 0.9]) {
      const rail = new THREE.Mesh(trackGeo, this.ironMat);
      rail.position.set(rx, 0.12, 112);
      this.group.add(rail);
    }

    for (let tz = 92; tz <= 134; tz += 2.2) {
      const tie = new THREE.Mesh(tieGeo, this.timberMat);
      tie.position.set(0, 0.06, tz);
      this.group.add(tie);
    }

    // Broken Wooden Minecart with scattered gold and raw mana crystals
    const cart = new THREE.Group();
    cart.position.set(-1.8, 0.5, 118);
    cart.rotation.y = 0.4;
    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 1.4), this.timberMat);
    cart.add(cartBody);
    const rawOre = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), this.purpleCrystalMat);
    rawOre.position.set(0, 0.5, 0);
    cart.add(rawOre);
    this.group.add(cart);

    // Hanging Medieval Gibbet Iron Cage at z = 120
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.6, 8, 1, true), this.ironMat);
    cage.position.set(3.5, 4.8, 120);
    this.group.add(cage);
    const cageChain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), this.ironMat);
    cageChain.position.set(3.5, 6.4, 120);
    this.group.add(cageChain);
  }

  buildBossSanctum() {
    // 8. The Ancient Crystal Sanctum Arena (z = 136 to 148)
    const sanctumGroup = new THREE.Group();
    sanctumGroup.position.set(0, 0, 142);

    // Circular Raised Stone Dais
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 0.35, 32), this.dungeonStoneMat);
    dais.position.y = 0.175;
    dais.receiveShadow = true;
    sanctumGroup.add(dais);

    // Outer Runic Circle
    const runeRing = new THREE.Mesh(new THREE.RingGeometry(12.5, 13.8, 32), this.goldRuneMat);
    runeRing.position.y = 0.36;
    runeRing.rotation.x = -Math.PI / 2;
    sanctumGroup.add(runeRing);

    // 4 Cardinal Monoliths
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const mx = Math.sin(ang) * 12.0;
      const mz = Math.cos(ang) * 12.0;

      const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.5, 1.4), this.dungeonStoneMat);
      monolith.position.set(mx, 3.25, mz);
      sanctumGroup.add(monolith);

      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), this.purpleCrystalMat);
      gem.position.set(mx, 7.0, mz);
      sanctumGroup.add(gem);
    }

    // Ancient Stone Altar in the Center
    const altar = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.1, 1.8), this.dungeonStoneMat);
    altar.position.set(0, 0.725, 0);
    sanctumGroup.add(altar);

    const altarRelic = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), this.cyanCrystalMat);
    altarRelic.position.set(0, 1.6, 0);
    sanctumGroup.add(altarRelic);

    // Single grand glowing boss sanctum arena light
    const sanctumLight = new THREE.PointLight(0xa855f7, 1.8, 26);
    sanctumLight.position.set(0, 5.0, 0);
    sanctumGroup.add(sanctumLight);
    this.crystals.push({ pLight: sanctumLight });

    this.group.add(sanctumGroup);
  }

  getGroundMeshes() {
    return [this.dungeonFloor].filter(Boolean);
  }

  update(delta) {
    // Bioluminescent crystal pulsing & torch flickering
    const time = Date.now() * 0.003;
    if (this.crystals) {
      this.crystals.forEach((c, idx) => {
        if (c.pLight) {
          c.pLight.intensity = 1.2 + Math.sin(time + idx) * 0.35;
        }
      });
    }

    if (this.torches) {
      this.torches.forEach(t => {
        t.intensity = 1.3 + Math.sin(Date.now() * 0.015) * 0.35;
      });
    }
  }
}

window.MysticCaverns = MysticCaverns;
