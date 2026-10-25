// MultiplayerSystem.js - Real-Time Free Multiplayer Engine & In-Game Chat System
// Powered by WebSockets (Zero Paid Services, Zero Cloud Subscriptions)
// Features: Screen-Space High-DPI Nameplates, True Class 3D Models, Sculpted Wolf Mounts,
// Smooth Movement Interpolation, Instant Tab Focus Sync & Town Chat.

class RemotePlayer {
  constructor(scene, data, camera) {
    this.scene = scene;
    this.camera = camera;
    this.id = data.id;
    this.name = data.name || 'Hero';
    this.classId = data.classId || 'human';
    this.level = data.level || 1;

    this.container = new THREE.Group();
    this.container.name = `RemotePlayer_${this.id}`;
    this.container.position.set(data.x || 0, data.y || 0.05, data.z || 7.5);
    this.container.rotation.y = data.rotY !== undefined ? data.rotY : Math.PI;

    this.targetPosition = this.container.position.clone();
    this.targetRotationY = this.container.rotation.y;
    this.currentAnim = data.anim || 'idle';
    this.isRiding = !!data.isRiding;

    this.actions = {};
    this.mixer = null;
    this.modelRoot = null;
    this.wolfMesh = null;
    this.wolfLegs = [];
    this.wolfTail = null;
    this.animTime = 0;

    this.baseModelOffsetX = 0;
    this.baseModelOffsetY = 0;
    this.baseModelOffsetZ = 0;

    this.scene.add(this.container);

    this.createHtmlNameplate();
    this.loadModel();
    this.buildSculptedWolfMount();
  }

  createHtmlNameplate() {
    let layer = document.getElementById('multiplayer-tags-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'multiplayer-tags-layer';
      layer.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 45;
      `;
      document.body.appendChild(layer);
    }
    this.tagLayer = layer;

    const classIcons = { human: '⚔️', elf: '🌿', dwarf: '🛡️', beastman: '🐺' };
    const icon = classIcons[this.classId] || '⚔️';

    // 1. Sleek, constant-size Screen-Space Nameplate Badge (No blurry giant 3D billboard!)
    const tag = document.createElement('div');
    tag.id = `remote-tag-${this.id}`;
    tag.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(8px);
      border: 1.5px solid #38bdf8;
      border-radius: 12px;
      padding: 3px 10px;
      color: #f8fafc;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      transition: opacity 0.15s ease;
      pointer-events: none;
      display: none;
    `;
    tag.innerHTML = `
      <span>${icon}</span>
      <span style="letter-spacing: 0.5px;">${this.name}</span>
      <span style="background: rgba(56, 189, 248, 0.25); color: #38bdf8; border-radius: 6px; padding: 1px 5px; font-size: 9px;">Lv.${this.level}</span>
    `;
    this.tagLayer.appendChild(tag);
    this.tagElement = tag;

    // 2. Floating Speech Bubble
    const bubble = document.createElement('div');
    bubble.id = `remote-bubble-${this.id}`;
    bubble.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      background: rgba(255, 255, 255, 0.95);
      color: #0f172a;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      padding: 6px 12px;
      font-family: 'Segoe UI', -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      white-space: nowrap;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: none;
      pointer-events: none;
      transition: opacity 0.2s ease;
    `;
    this.tagLayer.appendChild(bubble);
    this.bubbleElement = bubble;
    this.speechTimer = 0;
  }

  updateNameplate(level) {
    if (level && level !== this.level) {
      this.level = level;
      const classIcons = { human: '⚔️', elf: '🌿', dwarf: '🛡️', beastman: '🐺' };
      const icon = classIcons[this.classId] || '⚔️';
      if (this.tagElement) {
        this.tagElement.innerHTML = `
          <span>${icon}</span>
          <span style="letter-spacing: 0.5px;">${this.name}</span>
          <span style="background: rgba(56, 189, 248, 0.25); color: #38bdf8; border-radius: 6px; padding: 1px 5px; font-size: 9px;">Lv.${this.level}</span>
        `;
      }
    }
  }

  showSpeech(text) {
    if (!this.bubbleElement) return;
    this.bubbleElement.innerText = text;
    this.bubbleElement.style.display = 'block';
    this.bubbleElement.style.opacity = '1';
    this.speechTimer = 4.5;
  }

  loadModel() {
    if (typeof THREE.GLTFLoader === 'undefined') return;
    const loader = new THREE.GLTFLoader();
    const modelPath = `assets/models/${this.classId}/male.glb`;

    loader.load(modelPath, (gltf) => {
      const model = gltf.scene;
      this.modelRoot = model;

      // Filter exact signature class weapons & armor (identical to CharacterLoader.js)
      const meshFilters = {
        human: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', 'Knight_Cape', 'Knight_Helmet', '1H_Sword', 'Round_Shield'],
        elf: ['Mage_Body', 'Mage_Head', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_LegLeft', 'Mage_LegRight', 'Mage_Cape', 'Mage_Hat', '2H_Staff'],
        dwarf: ['Barbarian_Body', 'Barbarian_Head', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_LegLeft', 'Barbarian_LegRight', 'Barbarian_Cape', 'Barbarian_Hat', '2H_Axe'],
        beastman: ['Rogue_Body', 'Rogue_Head', 'Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_LegLeft', 'Rogue_LegRight', 'Rogue_Cape', 'Knife', 'Knife_Offhand']
      };

      const keep = meshFilters[this.classId] || meshFilters.human;
      model.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          if (keep.includes(child.name)) {
            child.visible = true;
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.55;
              child.material.metalness = 0.2;
            }
          } else {
            child.visible = false;
          }
        }
      });

      // Calculate accurate bounding box of visible meshes
      model.updateMatrixWorld(true);
      const box = new THREE.Box3();
      model.traverse((child) => {
        if ((child.isMesh || child.isSkinnedMesh) && child.visible) {
          if (child.geometry) {
            if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
            box.expandByObject(child);
          }
        }
      });

      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Authentic Heroic Proportions & Race Sizing (identical to CharacterLoader.js)
      let targetHeight = 1.95;
      let widthScale = 1.0;
      let depthScale = 1.0;

      if (this.classId === 'dwarf') {
        targetHeight = 1.45;
        widthScale = 1.35;
        depthScale = 1.25;
      } else if (this.classId === 'elf') {
        targetHeight = 2.05;
        widthScale = 0.95;
        depthScale = 0.95;
      } else if (this.classId === 'beastman') {
        targetHeight = 2.10;
        widthScale = 1.18;
        depthScale = 1.15;
      } else if (this.classId === 'human') {
        targetHeight = 1.95;
        widthScale = 1.0;
        depthScale = 1.0;
      }

      const scale = targetHeight / (size.y || 1);
      model.scale.set(scale * widthScale, scale, scale * depthScale);

      // Store base offsets so feet stay exactly on ground plane
      this.baseModelOffsetX = -center.x * scale * widthScale;
      this.baseModelOffsetY = -box.min.y * scale;
      this.baseModelOffsetZ = -center.z * scale * depthScale;

      model.position.set(this.baseModelOffsetX, this.baseModelOffsetY, this.baseModelOffsetZ);

      // Skeletal Animation Mixer
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
          this.actions[clip.name] = this.mixer.clipAction(clip);
        });

        const idleClips = {
          human: 'Idle',
          elf: '2H_Melee_Idle',
          dwarf: '2H_Melee_Idle',
          beastman: 'Idle'
        };
        const defaultIdle = this.actions[idleClips[this.classId]] || this.actions['Idle'] || this.actions['Unarmed_Idle'];
        if (defaultIdle) {
          this.currentAction = defaultIdle;
          defaultIdle.play();
        }
      }

      this.container.add(model);
    });
  }

  buildSculptedWolfMount() {
    const wolf = new THREE.Group();
    wolf.name = `WolfMount_${this.id}`;

    const furMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65, flatShading: true });
    const underMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
    const runeGlowMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.6, roughness: 0.1 });

    // 1. Torso
    const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.40, 1.35, 12), furMat);
    ribcage.rotation.x = Math.PI / 2;
    ribcage.position.set(0, 0.82, 0);
    wolf.add(ribcage);

    const chestRuff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), underMat);
    chestRuff.position.set(0, 0.84, -0.42);
    chestRuff.scale.set(0.9, 0.95, 1.1);
    wolf.add(chestRuff);

    const underbelly = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.9), underMat);
    underbelly.position.set(0, 0.65, 0.05);
    wolf.add(underbelly);

    // 2. Saddle & Stirrups
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.65), saddleMat);
    saddle.position.set(0, 1.05, 0.05);
    wolf.add(saddle);

    for (let side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.06), saddleMat);
      strap.position.set(side * 0.4, 0.85, 0.05);
      wolf.add(strap);

      const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 8), goldMat);
      stirrup.position.set(side * 0.4, 0.62, 0.05);
      stirrup.rotation.y = Math.PI / 2;
      wolf.add(stirrup);
    }

    // 3. Neck & Glowing Collar
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.65, 8), furMat);
    neck.position.set(0, 1.12, -0.72);
    neck.rotation.x = -0.55;
    wolf.add(neck);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 16), runeGlowMat);
    collar.position.set(0, 1.06, -0.76);
    collar.rotation.x = Math.PI / 2.8;
    wolf.add(collar);

    // 4. Head, Muzzle & Ears
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.34, -1.02);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), furMat);
    head.scale.set(0.9, 0.95, 1.1);
    headGroup.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.36), underMat);
    muzzle.position.set(0, -0.06, -0.3);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), darkMat);
    nose.position.set(0, -0.02, -0.48);
    headGroup.add(nose);

    for (let ex of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), runeGlowMat);
      eye.position.set(ex, 0.08, -0.22);
      headGroup.add(eye);
    }

    for (let side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 4), furMat);
      ear.position.set(side * 0.18, 0.32, 0.05);
      ear.rotation.set(-0.25, 0, -side * 0.15);
      headGroup.add(ear);
    }
    wolf.add(headGroup);

    // 5. Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.95, 0.75);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 0.85, 6), furMat);
    tail.position.set(0, -0.28, 0.28);
    tail.rotation.x = -0.7;
    tailGroup.add(tail);
    this.wolfTail = tailGroup;
    wolf.add(tailGroup);

    // 6. Running Legs
    const legOffsets = [
      { name: 'fl', x: -0.32, z: -0.52, isFront: true },
      { name: 'fr', x: 0.32, z: -0.52, isFront: true },
      { name: 'bl', x: -0.32, z: 0.52, isFront: false },
      { name: 'br', x: 0.32, z: 0.52, isFront: false }
    ];

    this.wolfLegs = legOffsets.map(cfg => {
      const pivot = new THREE.Group();
      pivot.position.set(cfg.x, 0.82, cfg.z);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.24), furMat);
      thigh.position.y = -0.18;
      pivot.add(thigh);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.16), furMat);
      shin.position.set(0, -0.46, -0.04);
      pivot.add(shin);

      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.22), darkMat);
      paw.position.set(0, -0.66, 0.04);
      pivot.add(paw);

      wolf.add(pivot);
      return { pivot, isFront: cfg.isFront };
    });

    // Face forward along movement direction
    wolf.rotation.y = Math.PI;
    wolf.visible = false;

    this.container.add(wolf);
    this.wolfMesh = wolf;
  }

  setAnim(animName) {
    if (!this.mixer) return;

    const idleClips = {
      human: 'Idle',
      elf: '2H_Melee_Idle',
      dwarf: '2H_Melee_Idle',
      beastman: 'Idle'
    };
    const attackClips = {
      human: '1H_Melee_Attack_Slice_Horizontal',
      elf: 'Spellcast_Shoot',
      dwarf: '2H_Melee_Attack_Spin',
      beastman: 'Dualwield_Melee_Attack_Slice'
    };

    let targetClip = 'Idle';
    if (this.isRiding) {
      targetClip = this.actions['Sit_Chair_Idle'] ? 'Sit_Chair_Idle' : 'Idle';
    } else if (animName === 'run') {
      targetClip = this.actions['Running_A'] ? 'Running_A' : 'Walking_A';
    } else if (animName === 'attack') {
      targetClip = attackClips[this.classId] || '1H_Melee_Attack_Slice_Horizontal';
    } else if (animName === 'sit') {
      targetClip = this.actions['Sit_Chair_Idle'] ? 'Sit_Chair_Idle' : 'Idle';
    } else if (animName === 'jump') {
      targetClip = this.actions['Jump_Full_Short'] ? 'Jump_Full_Short' : 'Jump_Start';
    } else {
      targetClip = idleClips[this.classId] || 'Idle';
    }

    const action = this.actions[targetClip] || this.actions['Idle'];
    if (!action) return;

    if (this.currentAction !== action) {
      if (this.currentAction) this.currentAction.fadeOut(0.15);
      action.reset().fadeIn(0.15).play();
      this.currentAction = action;
    }
  }

  update(delta, camera) {
    // 1. Smooth position and orientation interpolation
    const prevPos = this.container.position.clone();
    this.container.position.lerp(this.targetPosition, Math.min(1, 16 * delta));

    let diff = (this.targetRotationY - this.container.rotation.y) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    this.container.rotation.y += diff * Math.min(1, 14 * delta);

    const isMoving = this.container.position.distanceTo(prevPos) > 0.005;

    // 2. Synchronize Wolf Mount & Rider Position
    if (this.wolfMesh) {
      this.wolfMesh.visible = this.isRiding;
    }

    if (this.modelRoot) {
      if (this.isRiding) {
        // Elevate hero gracefully onto the saddle with forward displacement
        this.modelRoot.position.set(
          this.baseModelOffsetX,
          this.baseModelOffsetY + 0.58,
          this.baseModelOffsetZ + 0.45
        );
        if (this.currentAction !== this.actions['Sit_Chair_Idle'] && this.actions['Sit_Chair_Idle']) {
          this.setAnim('sit');
        }
      } else {
        this.modelRoot.position.set(
          this.baseModelOffsetX,
          this.baseModelOffsetY,
          this.baseModelOffsetZ
        );
      }
    }

    // 3. Mount Gallop Animation when moving
    if (this.isRiding && this.wolfMesh && this.wolfMesh.visible) {
      if (isMoving) {
        this.animTime += delta * 14;
        const swing = Math.sin(this.animTime) * 0.65;
        this.wolfLegs.forEach((leg, i) => {
          const phase = (i % 2 === 0) ? swing : -swing;
          leg.pivot.rotation.x = phase;
        });
        if (this.wolfTail) {
          this.wolfTail.rotation.z = Math.sin(this.animTime * 0.8) * 0.3;
        }
      } else {
        this.wolfLegs.forEach(leg => {
          leg.pivot.rotation.x *= 0.85;
        });
      }
    }

    // 4. Update Skeletal Animation Mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // 5. Update HTML Screen-Space Nameplate & Speech Bubble (Ultra-Crisp & Proportionate!)
    const activeCamera = camera || this.camera;
    if (activeCamera && this.tagElement) {
      const headHeight = this.isRiding ? 2.5 : 2.05;
      const headWorldPos = new THREE.Vector3(
        this.container.position.x,
        this.container.position.y + headHeight,
        this.container.position.z
      );

      const dist = activeCamera.position.distanceTo(headWorldPos);
      headWorldPos.project(activeCamera);

      // In front of camera check (z < 1.0) and visual range check (< 50m)
      if (headWorldPos.z < 1.0 && dist < 50) {
        const screenX = (headWorldPos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-headWorldPos.y * 0.5 + 0.5) * window.innerHeight;

        this.tagElement.style.display = 'flex';
        this.tagElement.style.left = `${Math.round(screenX)}px`;
        this.tagElement.style.top = `${Math.round(screenY)}px`;
        this.tagElement.style.opacity = dist > 40 ? `${(50 - dist) / 10}` : '1';

        if (this.bubbleElement && this.speechTimer > 0) {
          this.bubbleElement.style.display = 'block';
          this.bubbleElement.style.left = `${Math.round(screenX)}px`;
          this.bubbleElement.style.top = `${Math.round(screenY - 26)}px`;
        }
      } else {
        this.tagElement.style.display = 'none';
        if (this.bubbleElement) this.bubbleElement.style.display = 'none';
      }
    }

    // 6. Speech Timer Countdown
    if (this.speechTimer > 0) {
      this.speechTimer -= delta;
      if (this.speechTimer <= 0 && this.bubbleElement) {
        this.bubbleElement.style.display = 'none';
      }
    }
  }

  destroy() {
    this.scene.remove(this.container);
    if (this.tagElement && this.tagElement.parentNode) {
      this.tagElement.parentNode.removeChild(this.tagElement);
    }
    if (this.bubbleElement && this.bubbleElement.parentNode) {
      this.bubbleElement.parentNode.removeChild(this.bubbleElement);
    }
  }
}

class MultiplayerSystem {
  constructor(scene, playerController, characterLoader, mountSystem, combatSystem) {
    this.scene = scene;
    this.playerController = playerController;
    this.characterLoader = characterLoader;
    this.mountSystem = mountSystem;
    this.combatSystem = combatSystem;
    this.camera = playerController ? playerController.camera : null;

    this.ws = null;
    this.isConnected = false;
    this.myId = null;
    this.playerName = 'Hero';
    this.classId = 'human';

    this.remotePlayers = new Map(); // id -> RemotePlayer

    this.createChatUI();
    this.bindWindowEvents();
  }

  bindWindowEvents() {
    // When switching tabs or focusing window, send instant sync packet
    const sendInstantSync = () => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN && this.playerController) {
        this.transmitPlayerState();
      }
    };

    window.addEventListener('focus', sendInstantSync);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) sendInstantSync();
    });
  }

  connect(heroName, classId) {
    this.playerName = heroName || 'Hero';
    this.classId = classId || 'human';

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.updateConnectionPill(true);
        this.addChatMessage({
          sender: 'SYSTEM',
          classId: 'system',
          text: `Connected to Aetheria Online Realm! Logged in as [${this.playerName}].`
        });

        // Send Join Packet with current state
        const pos = this.playerController ? this.playerController.position : { x: 0, y: 0.05, z: 7.5 };
        const rotY = this.playerController ? this.playerController.rotationY : Math.PI;
        const isRiding = this.playerController ? !!this.playerController.isRidingMount : false;

        this.ws.send(JSON.stringify({
          type: 'join',
          name: this.playerName,
          classId: this.classId,
          x: Number(pos.x.toFixed(2)),
          y: Number(pos.y.toFixed(2)),
          z: Number(pos.z.toFixed(2)),
          rotY: Number(rotY.toFixed(3)),
          isRiding: isRiding
        }));

        this.startSyncLoop();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handlePacket(msg);
        } catch (e) {
          console.warn('Packet parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.updateConnectionPill(false);
        this.addChatMessage({
          sender: 'SYSTEM',
          classId: 'system',
          text: 'Disconnected from multiplayer server. Reconnecting in 3s...'
        });
        setTimeout(() => this.connect(this.playerName, this.classId), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket status:', err);
      };
    } catch (e) {
      console.warn('Could not connect to WebSocket:', e);
    }
  }

  transmitPlayerState() {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.playerController) return;

    const pos = this.playerController.position;
    const rotY = this.playerController.rotationY;
    const anim = this.characterLoader ? this.characterLoader.currentActionName : 'idle';
    const isRiding = this.playerController.isRidingMount || (this.mountSystem && this.mountSystem.isMounted);
    const lvl = this.combatSystem ? this.combatSystem.level : 1;

    this.ws.send(JSON.stringify({
      type: 'update',
      x: Number(pos.x.toFixed(2)),
      y: Number(pos.y.toFixed(2)),
      z: Number(pos.z.toFixed(2)),
      rotY: Number(rotY.toFixed(3)),
      anim: anim,
      isRiding: !!isRiding,
      level: lvl
    }));
  }

  startSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Transmit position update every 45ms (~22 packets per sec, highly responsive & bandwidth-light)
    this.syncInterval = setInterval(() => {
      this.transmitPlayerState();
    }, 45);
  }

  handlePacket(msg) {
    if (msg.type === 'init') {
      this.myId = msg.id;

      // Spawn all existing players already in the world
      if (msg.existingPlayers && Array.isArray(msg.existingPlayers)) {
        msg.existingPlayers.forEach(pData => {
          if (pData.id !== this.myId && !this.remotePlayers.has(pData.id)) {
            const remote = new RemotePlayer(this.scene, pData, this.camera);
            this.remotePlayers.set(pData.id, remote);
          }
        });
      }
    }

    else if (msg.type === 'player_joined') {
      const pData = msg.player;
      if (pData && pData.id !== this.myId && !this.remotePlayers.has(pData.id)) {
        const remote = new RemotePlayer(this.scene, pData, this.camera);
        this.remotePlayers.set(pData.id, remote);
      }
    }

    else if (msg.type === 'player_moved') {
      const remote = this.remotePlayers.get(msg.id);
      if (remote) {
        remote.targetPosition.set(msg.x, msg.y, msg.z);
        remote.targetRotationY = msg.rotY;
        remote.isRiding = !!msg.isRiding;
        remote.setAnim(msg.anim);
        if (msg.level) remote.updateNameplate(msg.level);
      }
    }

    else if (msg.type === 'player_action') {
      const remote = this.remotePlayers.get(msg.id);
      if (remote) {
        remote.setAnim(msg.action);
      }
    }

    else if (msg.type === 'player_left') {
      const remote = this.remotePlayers.get(msg.id);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(msg.id);
      }
    }

    else if (msg.type === 'chat') {
      this.addChatMessage(msg);
      if (msg.id && this.remotePlayers.has(msg.id)) {
        this.remotePlayers.get(msg.id).showSpeech(msg.text);
      }
    }
  }

  createChatUI() {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'game-chat-panel';
    chatContainer.innerHTML = `
      <style>
        #game-chat-panel {
          position: absolute;
          left: 24px;
          bottom: 84px;
          width: 380px;
          max-height: 220px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
          z-index: 50;
          overflow: hidden;
          transition: all 0.25s ease;
        }
        #chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 14px;
          background: rgba(2, 132, 199, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #38bdf8;
        }
        #chat-status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          margin-right: 6px;
        }
        #chat-status-dot.online {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        #chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-family: 'Segoe UI', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          max-height: 140px;
        }
        .chat-msg {
          word-break: break-word;
          color: #f1f5f9;
        }
        .chat-sender {
          font-weight: 800;
          color: #38bdf8;
        }
        .chat-sender.system {
          color: #fbbf24;
          font-style: italic;
        }
        .chat-time {
          font-size: 10px;
          color: #64748b;
          margin-right: 6px;
        }
        #chat-input-row {
          display: flex;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.35);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        #chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 12px;
          font-family: inherit;
          outline: none;
        }
        #chat-input::placeholder {
          color: #94a3b8;
        }
        #chat-send-btn {
          background: #0284c7;
          border: none;
          color: white;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
      </style>
      <div id="chat-header">
        <span><span id="chat-status-dot"></span>AETHERIA WORLD CHAT</span>
        <span style="font-size: 10px; color: #94a3b8;">Press [ENTER] to chat</span>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-row">
        <input type="text" id="chat-input" placeholder="Type message... (Press Enter)" maxlength="100" autocomplete="off" />
        <button id="chat-send-btn">Send</button>
      </div>
    `;

    document.body.appendChild(chatContainer);

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    const sendCurrentMsg = () => {
      const val = input.value.trim();
      if (val && this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({
          type: 'chat',
          text: val
        }));
        input.value = '';
      }
      input.blur();
    };

    sendBtn.addEventListener('click', sendCurrentMsg);

    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Prevent WASD player movement while typing!
      if (e.key === 'Enter') {
        sendCurrentMsg();
      } else if (e.key === 'Escape') {
        input.blur();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  updateConnectionPill(online) {
    const dot = document.getElementById('chat-status-dot');
    if (dot) {
      if (online) dot.classList.add('online');
      else dot.classList.remove('online');
    }
  }

  addChatMessage(msg) {
    const list = document.getElementById('chat-messages');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'chat-msg';

    const timeSpan = `<span class="chat-time">${msg.time || ''}</span>`;
    const isSystem = msg.sender === 'SYSTEM' || msg.classId === 'system';
    const senderSpan = `<span class="chat-sender ${isSystem ? 'system' : ''}">[${msg.sender}]:</span>`;
    const textSpan = ` <span>${msg.text}</span>`;

    row.innerHTML = timeSpan + senderSpan + textSpan;
    list.appendChild(row);

    while (list.children.length > 40) {
      list.removeChild(list.firstChild);
    }
    list.scrollTop = list.scrollHeight;
  }

  update(delta) {
    const cam = this.camera || (this.playerController ? this.playerController.camera : null);
    this.remotePlayers.forEach(remote => {
      remote.update(delta, cam);
    });
  }
}

window.MultiplayerSystem = MultiplayerSystem;
window.RemotePlayer = RemotePlayer;
