// MountSystem.js - Heroic Anime RPG Mount Engine (Phase 6)
// Provides instant summonable mount ([T] key), galloping run cycle,
// 2.2x speed boost, hoofbeat audio, and glowing runic trail VFX.

class MountSystem {
  constructor(scene, playerController) {
    this.scene = scene;
    this.playerController = playerController;

    this.isMounted = false;
    this.mountType = 'wolf'; // 'wolf'
    this.mountGroup = null;
    this.legMeshes = [];
    this.tailMesh = null;
    this.animTime = 0;
    this.gallopSfxCooldown = 0;

    this.baseSpeed = this.playerController.speed;
    this.mountedSpeed = this.baseSpeed * 2.2;

    this.initMaterials();
    this.createMountModel();
    this.bindInputs();

    window.gameMount = this;
  }

  initMaterials() {
    this.wolfFurMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Silver Slate Wolf Pelt
      roughness: 0.65,
      metalness: 0.1,
      flatShading: true
    });

    this.wolfUnderMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Pure White Chest Ruff & Underbelly
      roughness: 0.85,
      flatShading: true
    });

    this.wolfDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark Muzzle & Claws
      roughness: 0.7
    });

    this.saddleMat = new THREE.MeshStandardMaterial({
      color: 0x451a03, // Royal Chestnut Leather Saddle
      roughness: 0.55
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Gold Stirrups & Buckles
      metalness: 0.85,
      roughness: 0.25
    });

    this.runeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.1
    });
  }

  createMountModel() {
    this.mountGroup = new THREE.Group();
    this.mountGroup.name = 'HeroMount';
    this.mountGroup.visible = false;

    // 1. Sculpted Muscular Wolf Torso (Barrel Ribcage & Tapered Flank)
    const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.40, 1.35, 12), this.wolfFurMat);
    ribcage.rotation.x = Math.PI / 2;
    ribcage.position.set(0, 0.82, 0);
    ribcage.castShadow = true;
    this.mountGroup.add(ribcage);

    // White Chest Fur Ruff
    const chestRuff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), this.wolfUnderMat);
    chestRuff.position.set(0, 0.84, -0.42);
    chestRuff.scale.set(0.9, 0.95, 1.1);
    this.mountGroup.add(chestRuff);

    // White Underbelly
    const underbelly = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.9), this.wolfUnderMat);
    underbelly.position.set(0, 0.65, 0.05);
    this.mountGroup.add(underbelly);

    // 2. Crafted Leather Riding Saddle & Gold Stirrups
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.65), this.saddleMat);
    saddle.position.set(0, 1.05, 0.05);
    saddle.castShadow = true;
    this.mountGroup.add(saddle);

    // Saddle Pommel & Cantle
    const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.1), this.saddleMat);
    pommel.position.set(0, 1.15, -0.25);
    this.mountGroup.add(pommel);

    const cantle = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), this.saddleMat);
    cantle.position.set(0, 1.16, 0.35);
    this.mountGroup.add(cantle);

    // Gold Stirrup Straps
    for (let side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.06), this.saddleMat);
      strap.position.set(side * 0.4, 0.85, 0.05);
      this.mountGroup.add(strap);

      const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 8), this.goldMat);
      stirrup.position.set(side * 0.4, 0.62, 0.05);
      stirrup.rotation.y = Math.PI / 2;
      this.mountGroup.add(stirrup);
    }

    // 3. Arched Wolf Neck with Thick Mane
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.65, 8), this.wolfFurMat);
    neck.position.set(0, 1.12, -0.72);
    neck.rotation.x = -0.55;
    this.mountGroup.add(neck);

    // Runic Sigil Harness Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 16), this.runeGlowMat);
    collar.position.set(0, 1.06, -0.76);
    collar.rotation.x = Math.PI / 2.8;
    this.mountGroup.add(collar);

    // 4. Detailed Wolf Head & Muzzle
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.34, -1.02);

    // Head Skull
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), this.wolfFurMat);
    head.scale.set(0.9, 0.95, 1.1);
    headGroup.add(head);

    // Tapered Muzzle Snout
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.36), this.wolfUnderMat);
    muzzle.position.set(0, -0.06, -0.3);
    headGroup.add(muzzle);

    // Black Leather Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), this.wolfDarkMat);
    nose.position.set(0, -0.02, -0.48);
    headGroup.add(nose);

    // Glowing Cyan Eyes
    for (let ex of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this.runeGlowMat);
      eye.position.set(ex, 0.08, -0.22);
      headGroup.add(eye);
    }

    // Pointed Wolf Ears with White Inner Fur
    for (let side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 4), this.wolfFurMat);
      ear.position.set(side * 0.18, 0.32, 0.05);
      ear.rotation.set(-0.25, 0, -side * 0.15);
      headGroup.add(ear);

      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), this.wolfUnderMat);
      innerEar.position.set(side * 0.18, 0.32, 0.07);
      innerEar.rotation.set(-0.25, 0, -side * 0.15);
      headGroup.add(innerEar);
    }
    this.mountGroup.add(headGroup);

    // 5. Bushy Curved Wolf Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.95, 0.75);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.85, 6), this.wolfFurMat);
    tail.position.set(0, -0.28, 0.28);
    tail.rotation.x = -0.7;
    tailGroup.add(tail);

    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), this.wolfUnderMat);
    tailTip.position.set(0, -0.65, 0.58);
    tailTip.rotation.x = -0.7;
    tailGroup.add(tailTip);

    this.tailMesh = tailGroup;
    this.mountGroup.add(tailGroup);

    // 6. Four Articulated Running Legs (Thighs, Hocks & Paws)
    const legOffsets = [
      { name: 'frontLeft', x: -0.32, z: -0.52, isFront: true, isLeft: true },
      { name: 'frontRight', x: 0.32, z: -0.52, isFront: true, isLeft: false },
      { name: 'backLeft', x: -0.32, z: 0.52, isFront: false, isLeft: true },
      { name: 'backRight', x: 0.32, z: 0.52, isFront: false, isLeft: false }
    ];

    this.legMeshes = legOffsets.map(cfg => {
      const legPivot = new THREE.Group();
      legPivot.position.set(cfg.x, 0.82, cfg.z);

      // Thigh
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.24), this.wolfFurMat);
      thigh.position.y = -0.18;
      legPivot.add(thigh);

      // Shin
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.45, 6), this.wolfFurMat);
      shin.position.set(0, -0.48, cfg.isFront ? 0.02 : -0.05);
      legPivot.add(shin);

      // White Paws with Dark Claws
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.18), this.wolfUnderMat);
      paw.position.set(0, -0.74, -0.04);
      legPivot.add(paw);

      this.mountGroup.add(legPivot);
      return { pivot: legPivot, baseZ: cfg.z, isFront: cfg.isFront, isLeft: cfg.isLeft };
    });

    this.scene.add(this.mountGroup);
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyT') {
        this.toggleMount();
      }
    });
  }

  toggleMount() {
    this.isMounted = !this.isMounted;
    if (this.isMounted) {
      this.mount();
    } else {
      this.dismount();
    }
  }

  mount() {
    this.isMounted = true;
    this.mountGroup.visible = true;
    this.playerController.isRidingMount = true;
    this.playerController.speed = this.mountedSpeed;

    if (this.playerController.characterLoader) {
      this.playerController.characterLoader.setAction('sit');
    }

    if (window.soundFX) {
      window.soundFX.playWarp();
    }

    if (window.gameHUD) {
      window.gameHUD.triggerZoneBanner('🐺 MOUNT SUMMONED', 'Celestial Silver Wolf (+120% Movement Speed)');
    }

    if (window.multiplayerSystem) {
      window.multiplayerSystem.transmitPlayerState();
    }
  }

  dismount() {
    this.isMounted = false;
    this.mountGroup.visible = false;
    this.playerController.isRidingMount = false;
    this.playerController.speed = this.baseSpeed;

    if (this.playerController.characterLoader) {
      this.playerController.characterLoader.setAction('idle');
    }

    // Reset player position offset if any
    const root = this.playerController.characterLoader.characterGroup;
    if (root) {
      root.position.y = this.playerController.position.y;
    }

    if (window.soundFX) {
      window.soundFX.playAttack('spell');
    }

    if (window.multiplayerSystem) {
      window.multiplayerSystem.transmitPlayerState();
    }
  }

  update(delta) {
    if (!this.isMounted || !this.mountGroup) return;

    const pPos = this.playerController.position;
    const pRotY = this.playerController.rotationY;

    // Anchor Mount to Player with Head Facing Forward in Rider Direction!
    this.mountGroup.position.set(pPos.x, pPos.y, pPos.z);
    this.mountGroup.rotation.y = pRotY + Math.PI;

    // Check if moving (Keyboard WASD or Mobile Touchscreen Joystick)
    const isMoving = this.playerController.keys.w ||
                     this.playerController.keys.s ||
                     this.playerController.keys.a ||
                     this.playerController.keys.d ||
                     (this.playerController.joystickInput &&
                      (Math.abs(this.playerController.joystickInput.x) > 0.05 ||
                       Math.abs(this.playerController.joystickInput.y) > 0.05));

    // Keep hero in sitting/riding posture on saddle
    if (this.playerController.characterLoader && this.playerController.characterLoader.currentActionName !== 'sit') {
      this.playerController.characterLoader.setAction('sit');
    }

    // Elevate character to sit gracefully on the saddle with natural gallop bobbing
    // The sitting animation displaces pelvis backward by ~0.45m, so we offset the root forward along rider's facing vector
    const root = this.playerController.characterLoader.characterGroup;
    if (root) {
      const gallopBob = isMoving ? Math.sin(this.animTime * 2) * 0.04 : 0;
      const fwdX = Math.sin(pRotY) * 0.45;
      const fwdZ = Math.cos(pRotY) * 0.45;
      root.position.set(pPos.x + fwdX, pPos.y + 0.58 + gallopBob, pPos.z + fwdZ);
      root.rotation.y = pRotY;
    }

    if (isMoving) {
      this.animTime += delta * 14;
      const swing = Math.sin(this.animTime) * 0.65;

      // Gallop leg swing cycle
      this.legMeshes.forEach(leg => {
        if (leg.isFront) {
          leg.pivot.rotation.x = leg.isLeft ? swing : -swing;
        } else {
          leg.pivot.rotation.x = leg.isLeft ? -swing : swing;
        }
      });

      // Tail waggle
      if (this.tailMesh) {
        this.tailMesh.rotation.y = Math.sin(this.animTime * 1.5) * 0.35;
      }

      // Gallop sound trigger
      this.gallopSfxCooldown -= delta;
      if (this.gallopSfxCooldown <= 0) {
        if (window.soundFX) window.soundFX.playMountGallop();
        this.gallopSfxCooldown = 0.28;
      }
    } else {
      // Idle breathing
      const breath = Math.sin(Date.now() * 0.003) * 0.04;
      this.legMeshes.forEach(l => l.pivot.rotation.x = 0);
      if (this.tailMesh) {
        this.tailMesh.rotation.y = Math.sin(Date.now() * 0.002) * 0.15;
      }
    }
  }
}

window.MountSystem = MountSystem;
