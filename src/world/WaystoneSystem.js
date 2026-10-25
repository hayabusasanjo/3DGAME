// WaystoneSystem.js - Ancient Waystone Fast-Travel Teleportation Network (Phase 6)
// Provides 3 functional teleportation obelisks connecting Capital Plaza,
// Plains Ancient Ruins, and Mystic Caverns Entrance with runic beacon VFX.

class WaystoneSystem {
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;

    this.waystones = [
      {
        id: 'plaza',
        name: '🏰 Capital Town Plaza',
        sub: 'Paved Garden Shrine Alcove (Safe Zone)',
        pos: new THREE.Vector3(8.5, 0.05, -1.0)
      },
      {
        id: 'mire',
        name: '🐸 Slime Mire Hollow',
        sub: 'Sunken Ruins & King Slime Arena',
        pos: new THREE.Vector3(-36.0, 0.05, 48.0)
      },
      {
        id: 'ridge',
        name: '⛺ Goblin Ridge Outpost',
        sub: 'Warband Camp & Watchtower',
        pos: new THREE.Vector3(36.0, 0.05, 50.0)
      },
      {
        id: 'caverns',
        name: '🕳️ Mystic Caverns Pass',
        sub: 'Mountain Crags & Dungeon Mouth',
        pos: new THREE.Vector3(-6.5, 0.05, 82.0)
      }
    ];

    this.activeWaystone = null;
    this.initMaterials();
    this.buildWaystones();
  }

  initMaterials() {
    this.stoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85
    });

    this.glowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8
    });

    this.beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
  }

  buildWaystones() {
    this.groups = [];

    this.waystones.forEach(w => {
      const g = new THREE.Group();
      g.position.copy(w.pos);

      // 1. Hexagonal Stepped Stone Plinth
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.35, 6), this.stoneMat);
      base.position.y = 0.18;
      g.add(base);

      // 2. Tapered Carved Obelisk
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 3.2, 4), this.stoneMat);
      obelisk.position.y = 1.8;
      obelisk.rotation.y = Math.PI / 4;
      g.add(obelisk);

      // 3. Floating Rotating Runic Ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 8, 24), this.glowMat);
      ring.position.y = 2.2;
      ring.rotation.x = Math.PI / 2;
      g.add(ring);

      // 4. Upward Cyan Light Beam Beacon
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 14, 6), this.beaconMat);
      beam.position.y = 7.0;
      g.add(beam);

      // 5. Point Light
      const pLight = new THREE.PointLight(0x38bdf8, 1.5, 9);
      pLight.position.y = 2.2;
      g.add(pLight);

      this.scene.add(g);
      this.groups.push({ group: g, ring: ring, light: pLight, config: w });
    });
  }

  checkProximity(playerPos) {
    for (let w of this.waystones) {
      if (playerPos.distanceTo(w.pos) < 3.8) {
        return w;
      }
    }
    return null;
  }

  teleportTo(waystoneId) {
    const target = this.waystones.find(w => w.id === waystoneId);
    if (!target) return false;

    // Teleport Player
    this.playerController.position.copy(target.pos);
    this.playerController.position.y += 0.05;

    if (window.soundFX) window.soundFX.playWarp();
    if (window.gameHUD) {
      window.gameHUD.triggerZoneBanner('🌀 WAYSTONE WARPED', `Traveled to ${target.name}`);
    }
    return true;
  }

  update(delta) {
    // Rotate floating runic rings
    this.groups.forEach(item => {
      item.ring.rotation.z += delta * 1.8;
      item.ring.position.y = 2.2 + Math.sin(Date.now() * 0.003) * 0.15;
    });
  }
}

window.WaystoneSystem = WaystoneSystem;
