// Monster.js - Stylized 3D Anime Fantasy Monsters & State Machine AI
// Features Azure/Emerald Slimes and Horned Beasts with overhead 3D health bars,
// procedural squash-and-stretch animation, aggro leashing, combat lunges, and loot drops.

class Monster {
  constructor(scene, damageSystem, config) {
    this.scene = scene;
    this.damageSystem = damageSystem;
    this.id = config.id || ('monster_' + Math.floor(Math.random() * 10000));
    this.name = config.name || 'Monster';
    this.level = config.level || 1;
    this.maxHp = config.maxHp || 45;
    this.hp = this.maxHp;
    this.attackPower = config.attackPower || 8;
    this.speed = config.speed || 3.2;
    this.expReward = config.expReward || 35;
    this.goldReward = config.goldReward || 5;
    this.lootItem = config.lootItem || { name: 'Slime Jelly', icon: '🧪' };

    this.spawnPos = config.spawnPos ? config.spawnPos.clone() : new THREE.Vector3(0, 0.05, 30);
    this.position = this.spawnPos.clone();

    // AI States: 'IDLE', 'WANDER', 'AGGRO', 'ATTACK', 'DEAD'
    this.state = 'IDLE';
    this.stateTimer = Math.random() * 2.0;
    this.wanderTarget = this.spawnPos.clone();
    this.aggroRadius = 9.0;
    this.attackRadius = 1.6;
    this.leashRadius = 24.0;
    this.attackCooldown = 0;
    this.isAttacking = false;

    // Respawn timer
    this.respawnTimer = 0;
    this.isDead = false;

    // Flash timer when hit
    this.flashTimer = 0;

    // Multiplayer Co-Op Synchronized Position & Remote Target
    this.remoteSyncPos = null;
    this.remoteSyncRotY = null;
    this.remoteSyncTime = 0;
    this.isControlledRemotely = false;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.buildOverheadUI();
    this.scene.add(this.group);
  }

  buildOverheadUI() {
    this.uiGroup = new THREE.Group();
    this.uiGroup.position.set(0, 1.4, 0);

    // 1. Health Bar Background
    const bgGeo = new THREE.PlaneGeometry(1.2, 0.14);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    this.hpBg = new THREE.Mesh(bgGeo, bgMat);
    this.uiGroup.add(this.hpBg);

    // 2. Health Bar Fill (Red / Green)
    const fillGeo = new THREE.PlaneGeometry(1.16, 0.10);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    this.hpFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpFill.position.z = 0.005;
    this.uiGroup.add(this.hpFill);

    // 3. Name & Level Sprite Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    this.nameCanvas = canvas;
    this.nameCtx = canvas.getContext('2d');
    this.drawNameTexture();

    this.nameTexture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.SpriteMaterial({ map: this.nameTexture, transparent: true });
    this.nameSprite = new THREE.Sprite(textMat);
    this.nameSprite.position.set(0, 0.22, 0);
    this.nameSprite.scale.set(1.5, 0.38, 1);
    this.uiGroup.add(this.nameSprite);

    // 4. Alert Exclamation Mark `!` (Shown when aggroed)
    const markCanvas = document.createElement('canvas');
    markCanvas.width = 64;
    markCanvas.height = 64;
    const mctx = markCanvas.getContext('2d');
    mctx.fillStyle = '#ef4444';
    mctx.font = 'bold 52px sans-serif';
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    mctx.fillText('!', 32, 32);
    const markTexture = new THREE.CanvasTexture(markCanvas);
    const markMat = new THREE.SpriteMaterial({ map: markTexture, transparent: true });
    this.alertSprite = new THREE.Sprite(markMat);
    this.alertSprite.position.set(0, 0.55, 0);
    this.alertSprite.scale.set(0.6, 0.6, 1);
    this.alertSprite.visible = false;
    this.uiGroup.add(this.alertSprite);

    this.group.add(this.uiGroup);
  }

  drawNameTexture() {
    const ctx = this.nameCtx;
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 236, 44);

    ctx.fillStyle = '#fef08a';
    ctx.fillText(`Lv.${this.level} ${this.name}`, 128, 32);
  }

  updateHealthBar() {
    if (this.hpFill) {
      const ratio = Math.max(0, this.hp / this.maxHp);
      this.hpFill.scale.x = ratio;
      this.hpFill.position.x = -0.58 * (1 - ratio);

      if (ratio > 0.5) {
        this.hpFill.material.color.setHex(0x22c55e); // Green
      } else if (ratio > 0.25) {
        this.hpFill.material.color.setHex(0xfbbf24); // Yellow
      } else {
        this.hpFill.material.color.setHex(0xef4444); // Red
      }
    }
  }

  updateOverheadUI(camera) {
    if (this.uiGroup && camera) {
      // Billboard towards camera
      this.uiGroup.lookAt(camera.position);
      this.updateHealthBar();
    }
  }

  takeDamage(amount, isCrit = false, attackerPos = null, syncToNetwork = true) {
    if (this.isDead) return;

    this.hp -= amount;
    this.updateHealthBar();
    this.damageSystem.spawnNumber(this.position.clone().add(new THREE.Vector3(0, 0.8, 0)), amount, isCrit ? 'crit' : 'normal');
    if (window.soundFX) window.soundFX.playHit(isCrit);

    // Emissive flash
    this.flashTimer = 0.16;
    this.setEmissiveFlash(true);

    // Knockback
    if (attackerPos) {
      const kbDir = this.position.clone().sub(attackerPos).normalize();
      kbDir.y = 0;
      this.position.addScaledVector(kbDir, isCrit ? 1.4 : 0.8);
      this.group.position.copy(this.position);
    }

    // Aggro onto attacker immediately
    this.state = 'AGGRO';

    // Broadcast damage to multiplayer server so party allies see shared monster damage
    if (syncToNetwork && window.multiplayerSystem && window.multiplayerSystem.isConnected) {
      window.multiplayerSystem.sendMonsterDamage(this.id, amount, isCrit, attackerPos);
    }

    if (this.hp <= 0) {
      this.die(syncToNetwork);
    }
  }

  die(syncToNetwork = true) {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'DEAD';
    this.hp = 0;
    this.respawnTimer = this.isBoss ? 35.0 : 16.0;

    if (window.soundFX) {
      window.soundFX.playMonsterDeath();
    }

    // Death sparkle burst
    this.damageSystem.spawnHitSparks(this.position, 0x38bdf8);
    this.group.visible = false;

    // Trigger onDeath callback (CombatSystem will reward EXP, Gold, and spawn Loot)
    if (this.onDeath) {
      this.onDeath(this);
    }
  }

  respawn() {
    this.isDead = false;
    this.hp = this.maxHp;
    this.position.copy(this.spawnPos);
    this.group.position.copy(this.position);
    this.state = 'IDLE';
    this.group.visible = true;
    this.alertSprite.visible = false;
    this.setEmissiveFlash(false);
  }

  setEmissiveFlash(flash) {
    // Overridden by child classes for mesh color flash
  }

  syncRemoteState(x, y, z, rotY, state) {
    if (!this.remoteSyncPos) this.remoteSyncPos = new THREE.Vector3();
    this.remoteSyncPos.set(x, y, z);
    this.remoteSyncRotY = rotY;
    this.state = state;
    this.remoteSyncTime = Date.now();
    this.isControlledRemotely = true;
    if (this.alertSprite) {
      this.alertSprite.visible = (state === 'AGGRO' || state === 'ATTACK');
    }
  }

  applyRemoteSync(delta, getGroundHeight) {
    if (this.isControlledRemotely && this.remoteSyncPos && (Date.now() - this.remoteSyncTime < 3000)) {
      this.position.lerp(this.remoteSyncPos, Math.min(1, 14 * delta));
      if (getGroundHeight) {
        this.position.y = getGroundHeight(this.position.x, this.position.z) + 0.05;
      }
      this.group.position.copy(this.position);
      if (this.remoteSyncRotY !== null) {
        this.group.rotation.y = this.remoteSyncRotY;
      }
      return true;
    }
    this.isControlledRemotely = false;
    return false;
  }

  getNearestPlayer(localPlayerPos) {
    let nearestPos = localPlayerPos;
    let minDist = this.position.distanceTo(localPlayerPos);

    if (window.multiplayerSystem && window.multiplayerSystem.remotePlayers) {
      window.multiplayerSystem.remotePlayers.forEach(r => {
        if (r && r.container) {
          const d = this.position.distanceTo(r.container.position);
          if (d < minDist) {
            minDist = d;
            nearestPos = r.container.position;
          }
        }
      });
    }

    return { pos: nearestPos, dist: minDist };
  }
}

// -------------------------------------------------------------------------
// 1. Slime Monster (Azure or Emerald Jelly Slime with Cute Eyes & Bounce)
// -------------------------------------------------------------------------
class SlimeMonster extends Monster {
  constructor(scene, damageSystem, config = {}) {
    const isEmerald = config.type === 'emerald';
    super(scene, damageSystem, {
      name: isEmerald ? 'Emerald Slime' : 'Azure Slime',
      level: isEmerald ? 2 : 1,
      maxHp: isEmerald ? 65 : 45,
      attackPower: isEmerald ? 12 : 7,
      speed: isEmerald ? 3.4 : 2.8,
      expReward: isEmerald ? 50 : 35,
      goldReward: isEmerald ? 8 : 5,
      lootItem: isEmerald ? { name: 'Emerald Slime Gel', icon: '🧪' } : { name: 'Azure Slime Gel', icon: '💧' },
      spawnPos: config.spawnPos || new THREE.Vector3(0, 0.05, 32)
    });

    this.slimeColor = isEmerald ? 0x10b981 : 0x0ea5e9;
    this.hopPhase = Math.random() * Math.PI * 2;
    this.isHopping = false;
    this.hopProgress = 0;

    this.buildSlimeModel();
  }

  buildSlimeModel() {
    this.meshGroup = new THREE.Group();

    // 1. Translucent Jelly Slime Dome (Squashed sphere)
    const bodyGeo = new THREE.SphereGeometry(0.72, 20, 16);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: this.slimeColor,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      roughness: 0.1
    });

    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.bodyMesh.position.y = 0.55;
    this.bodyMesh.scale.set(1.0, 0.85, 1.0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.meshGroup.add(this.bodyMesh);

    // 2. Glowing Inner Mana Core
    const coreGeo = new THREE.SphereGeometry(0.28, 12, 10);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: this.slimeColor,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.y = 0.55;
    this.meshGroup.add(this.coreMesh);

    // 3. Cute Anime Eyes (Black spheres with bright white highlight reflections)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), eyeMat);
      eye.position.set(side * 0.22, 0.65, 0.62);
      this.meshGroup.add(eye);

      // White sparkle dot
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), shineMat);
      shine.position.set(side * 0.22 + 0.02, 0.68, 0.68);
      this.meshGroup.add(shine);
    }

    this.group.add(this.meshGroup);
  }

  setEmissiveFlash(flash) {
    if (this.bodyMat) {
      this.bodyMat.emissive = new THREE.Color(flash ? 0xff4444 : 0x000000);
      this.bodyMat.emissiveIntensity = flash ? 0.9 : 0;
    }
  }

  update(delta, playerPos, camera, onPlayerAttack, getGroundHeight = null) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.updateOverheadUI(camera);

    // Handle hit flash decay
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setEmissiveFlash(false);
      }
    }

    // Apply remote peer co-op sync if active
    if (this.applyRemoteSync(delta, getGroundHeight)) return;

    // Check nearest player among local and remote party members!
    const targetPlayer = this.getNearestPlayer(playerPos);
    const distToPlayer = targetPlayer.dist;
    const distToSpawn = this.position.distanceTo(this.spawnPos);

    // Balanced chase leash: disengage if lured too far (> 55m)
    if (distToSpawn > 55.0) {
      if (this.state === 'AGGRO') {
        this.state = 'RETURNING';
        this.alertSprite.visible = false;
      }
    } else if (distToPlayer < this.aggroRadius && this.state !== 'RETURNING') {
      if (this.state !== 'AGGRO') {
        this.state = 'AGGRO';
        this.alertSprite.visible = true;
        if (window.soundFX) window.soundFX.playSlimeSquish();
      }
    }

    // AI Logic by State
    let moveTarget = null;
    let currentSpeed = this.speed;

    if (this.state === 'RETURNING') {
      moveTarget = this.spawnPos;
      currentSpeed = this.speed * 1.1;
      if (this.position.distanceTo(this.spawnPos) < 1.0) {
        this.state = 'IDLE';
        this.stateTimer = 2.0;
        this.hp = this.maxHp;
      }
    } else if (this.state === 'AGGRO') {
      moveTarget = targetPlayer.pos;
      currentSpeed = this.speed * 1.35;

      // Check Attack Range
      if (distToPlayer <= this.attackRadius) {
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.6;
          // Lunge at player!
          if (onPlayerAttack) {
            onPlayerAttack(this.attackPower, this.position);
          }
          if (window.soundFX) window.soundFX.playSlimeSquish();
        }
      }
    } else if (this.state === 'WANDER') {
      moveTarget = this.wanderTarget;
      currentSpeed = this.speed * 0.6;
      if (this.position.distanceTo(this.wanderTarget) < 0.8) {
        this.state = 'IDLE';
        this.stateTimer = 1.5 + Math.random() * 2.0;
      }
    } else if (this.state === 'IDLE') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = 'WANDER';
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * 5.0;
        this.wanderTarget.set(
          this.spawnPos.x + Math.sin(angle) * rad,
          0.05,
          this.spawnPos.z + Math.cos(angle) * rad
        );
      }
    }

    // Procedural Wobble & Hopping
    this.hopPhase += delta * (this.state === 'AGGRO' ? 8.5 : 4.5);

    if (moveTarget && this.state !== 'IDLE') {
      const dir = moveTarget.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.3) {
        dir.normalize();
        this.position.addScaledVector(dir, currentSpeed * delta);
        this.position.z = Math.max(15.2, this.position.z); // Protected Town Safe Zone Barrier
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    // Slime squash and stretch hop
    const hopSin = Math.sin(this.hopPhase);
    const hopHeight = Math.max(0, hopSin) * (this.state === 'AGGRO' ? 0.75 : 0.45);
    this.meshGroup.position.y = hopHeight;

    if (hopHeight > 0.05) {
      // Airborne stretch
      this.meshGroup.scale.set(0.85, 1.25, 0.85);
    } else {
      // Landing squish
      this.meshGroup.scale.set(1.15, 0.82, 1.15);
    }

    if (getGroundHeight) {
      this.position.y = getGroundHeight(this.position.x, this.position.z);
    }

    this.group.position.copy(this.position);
  }
}

// -------------------------------------------------------------------------
// 2. Horned Rabbit / Forest Biped (Agile Starter Beast with Horn)
// -------------------------------------------------------------------------
class HornedRabbitMonster extends Monster {
  constructor(scene, damageSystem, config = {}) {
    super(scene, damageSystem, {
      name: 'Horned Rabbit',
      level: 3,
      maxHp: 85,
      attackPower: 15,
      speed: 4.8,
      expReward: 75,
      goldReward: 14,
      lootItem: { name: 'Mana Horn Fragment', icon: '🦄' },
      spawnPos: config.spawnPos || new THREE.Vector3(12, 0.05, 58)
    });

    this.hopPhase = Math.random() * Math.PI * 2;
    this.buildRabbitModel();
  }

  buildRabbitModel() {
    this.meshGroup = new THREE.Group();

    // Stylized Fur Materials
    this.furMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Silver-slate fluffy fur
      roughness: 0.85
    });

    this.hornMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Radiant Golden Horn
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2
    });

    // 1. Fluffy Body
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), this.furMat);
    body.position.y = 0.55;
    body.scale.set(0.9, 1.0, 1.2);
    body.castShadow = true;
    this.meshGroup.add(body);

    // 2. Head
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), this.furMat);
    head.position.set(0, 0.95, 0.42);
    head.castShadow = true;
    this.meshGroup.add(head);

    // 3. Tall Long Ears
    for (let side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 6), this.furMat);
      ear.position.set(side * 0.2, 1.45, 0.35);
      ear.rotation.set(-0.25, 0, side * 0.15);
      ear.castShadow = true;
      this.meshGroup.add(ear);
    }

    // 4. Golden Unicorn Horn
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 6), this.hornMat);
    horn.position.set(0, 1.35, 0.65);
    horn.rotation.x = 0.45;
    this.meshGroup.add(horn);

    // 5. Crimson Glowing Beast Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
      eye.position.set(side * 0.22, 1.0, 0.7);
      this.meshGroup.add(eye);
    }

    // 6. Fluffy Cotton Tail
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    tail.position.set(0, 0.6, -0.65);
    this.meshGroup.add(tail);

    this.group.add(this.meshGroup);
  }

  setEmissiveFlash(flash) {
    if (this.furMat) {
      this.furMat.emissive = new THREE.Color(flash ? 0xff4444 : 0x000000);
      this.furMat.emissiveIntensity = flash ? 0.9 : 0;
    }
  }

  update(delta, playerPos, camera, onPlayerAttack, getGroundHeight = null) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.updateOverheadUI(camera);

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setEmissiveFlash(false);
      }
    }

    // Apply remote peer co-op sync if active
    if (this.applyRemoteSync(delta, getGroundHeight)) return;

    // Check nearest player among local and remote party members!
    const targetPlayer = this.getNearestPlayer(playerPos);
    const distToPlayer = targetPlayer.dist;
    const distToSpawn = this.position.distanceTo(this.spawnPos);

    // Balanced chase leash: disengage if lured too far (> 55m)
    if (distToSpawn > 55.0) {
      if (this.state === 'AGGRO') {
        this.state = 'RETURNING';
        this.alertSprite.visible = false;
      }
    } else if (distToPlayer < this.aggroRadius && this.state !== 'RETURNING') {
      if (this.state !== 'AGGRO') {
        this.state = 'AGGRO';
        this.alertSprite.visible = true;
      }
    }

    let moveTarget = null;
    let currentSpeed = this.speed;

    if (this.state === 'RETURNING') {
      moveTarget = this.spawnPos;
      currentSpeed = this.speed * 1.1;
      if (this.position.distanceTo(this.spawnPos) < 1.0) {
        this.state = 'IDLE';
        this.stateTimer = 2.0;
        this.hp = this.maxHp;
      }
    } else if (this.state === 'AGGRO') {
      moveTarget = targetPlayer.pos;
      currentSpeed = this.speed * 1.4;

      if (distToPlayer <= this.attackRadius) {
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.5;
          if (onPlayerAttack) {
            onPlayerAttack(this.attackPower, this.position);
          }
          if (window.soundFX) window.soundFX.playAttack('slash');
        }
      }
    } else if (this.state === 'WANDER') {
      moveTarget = this.wanderTarget;
      currentSpeed = this.speed * 0.6;
      if (this.position.distanceTo(this.wanderTarget) < 0.8) {
        this.state = 'IDLE';
        this.stateTimer = 1.0 + Math.random() * 2.0;
      }
    } else if (this.state === 'IDLE') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = 'WANDER';
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * 7.0;
        this.wanderTarget.set(
          this.spawnPos.x + Math.sin(angle) * rad,
          0.05,
          this.spawnPos.z + Math.cos(angle) * rad
        );
      }
    }

    this.hopPhase += delta * (this.state === 'AGGRO' ? 12.0 : 6.0);

    if (moveTarget && this.state !== 'IDLE') {
      const dir = moveTarget.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.3) {
        dir.normalize();
        this.position.addScaledVector(dir, currentSpeed * delta);
        this.position.z = Math.max(15.2, this.position.z); // Protected Town Safe Zone Barrier
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    // Fast energetic hopping
    const hopHeight = Math.max(0, Math.sin(this.hopPhase)) * 0.65;
    this.meshGroup.position.y = hopHeight;
    if (getGroundHeight) {
      this.position.y = getGroundHeight(this.position.x, this.position.z);
    }

    this.group.position.copy(this.position);
  }
}

window.Monster = Monster;
window.SlimeMonster = SlimeMonster;
window.HornedRabbitMonster = HornedRabbitMonster;

// -------------------------------------------------------------------------
// 3. King Slime (Colossal Field Mini-Boss with Golden Crown & Ground Slam)
// -------------------------------------------------------------------------
class KingSlimeBoss extends Monster {
  constructor(scene, damageSystem, config = {}) {
    super(scene, damageSystem, {
      name: 'King Slime',
      level: 5,
      maxHp: 420,
      attackPower: 22,
      speed: 3.2,
      expReward: 250,
      goldReward: 150,
      lootItem: { name: 'Crown of the Slime King', icon: '👑' },
      spawnPos: config.spawnPos || new THREE.Vector3(0, 0.05, 78)
    });

    this.isBoss = true;
    this.hopPhase = 0;
    this.slamCooldown = 6.0;
    this.isSlamming = false;
    this.slamHeight = 0;
    this.slamTime = 0;
    this.shockwaves = [];

    // Increase aggro & leash radius for boss
    this.aggroRadius = 16.0;
    this.leashRadius = 32.0;

    this.buildBossModel();
  }

  buildBossModel() {
    this.meshGroup = new THREE.Group();

    // 1. Giant Royal Azure Slime Body (Radius 2.0m)
    const bodyGeo = new THREE.SphereGeometry(2.0, 24, 20);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.9,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.2
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.bodyMesh.position.y = 1.6;
    this.bodyMesh.scale.set(1.0, 0.85, 1.0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.meshGroup.add(this.bodyMesh);

    // 2. Glowing Inner Mana Core
    const coreGeo = new THREE.SphereGeometry(0.8, 16, 12);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xa855f7,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.y = 1.6;
    this.meshGroup.add(this.coreMesh);

    // 3. Magnificent 3D Golden Crown with Rubies
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 3.15, 0);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.3
    });

    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });

    // Crown Base Ring
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 16, 1, true), goldMat);
    crownGroup.add(crownBase);

    // 5 Crown Points & Gems
    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), goldMat);
      spike.position.set(Math.sin(ang) * 0.85, 0.35, Math.cos(ang) * 0.85);
      crownGroup.add(spike);

      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), rubyMat);
      gem.position.set(Math.sin(ang) * 0.88, 0.15, Math.cos(ang) * 0.88);
      crownGroup.add(gem);
    }

    crownGroup.rotation.z = 0.12; // Royal tilted angle
    this.meshGroup.add(crownGroup);

    // 4. Expressive Boss Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), eyeMat);
      eye.position.set(side * 0.65, 1.85, 1.7);
      this.meshGroup.add(eye);

      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), shineMat);
      shine.position.set(side * 0.65 + 0.06, 1.95, 1.85);
      this.meshGroup.add(shine);
    }

    // Boss UI Position
    this.uiGroup.position.set(0, 4.4, 0);

    this.group.add(this.meshGroup);
  }

  setEmissiveFlash(flash) {
    if (this.bodyMat) {
      this.bodyMat.emissive = new THREE.Color(flash ? 0xff4444 : 0x1d4ed8);
      this.bodyMat.emissiveIntensity = flash ? 1.0 : 0.2;
    }
  }

  update(delta, playerPos, camera, onPlayerAttack, getGroundHeight = null) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.updateOverheadUI(camera);

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setEmissiveFlash(false);
      }
    }

    // Apply remote peer co-op sync if active
    if (this.applyRemoteSync(delta, getGroundHeight)) return;

    // Check nearest player among local and remote party members!
    const targetPlayer = this.getNearestPlayer(playerPos);
    const distToPlayer = targetPlayer.dist;
    const distToSpawn = this.position.distanceTo(this.spawnPos);

    // Check Aggro & Leash Radius (Arena Bounds)
    if (distToSpawn > 60.0) {
      if (this.state === 'AGGRO') {
        this.state = 'RETURNING';
        this.alertSprite.visible = false;
        this.isSlamming = false;
        this.slamHeight = 0;
      }
    } else if (distToPlayer < this.aggroRadius && this.state !== 'RETURNING') {
      if (this.state !== 'AGGRO') {
        this.state = 'AGGRO';
        this.alertSprite.visible = true;
        if (window.soundFX) window.soundFX.playSlimeSquish();
      }
    }

    // Ground Slam Boss Skill logic
    if (this.state === 'AGGRO') {
      this.slamCooldown -= delta;
      if (this.slamCooldown <= 0 && !this.isSlamming) {
        this.isSlamming = true;
        this.slamTime = 0;
        this.slamCooldown = 8.5; // Next slam in 8.5 seconds
      }
    }

    let moveTarget = null;
    let currentSpeed = this.speed;

    if (this.state === 'RETURNING') {
      moveTarget = this.spawnPos;
      currentSpeed = this.speed * 1.1;
      if (this.position.distanceTo(this.spawnPos) < 1.5) {
        this.state = 'IDLE';
        this.stateTimer = 2.0;
        this.hp = this.maxHp;
      }
    } else if (this.isSlamming) {
      // Ground Slam Leap & Impact animation
      this.slamTime += delta;
      if (this.slamTime < 0.7) {
        // Leaping into the air (Up to 3.8m)
        this.slamHeight = Math.sin((this.slamTime / 0.7) * Math.PI) * 3.8;
      } else if (this.slamTime < 1.0) {
        // Hover at peak
        this.slamHeight = 3.8;
      } else if (this.slamTime < 1.3) {
        // Fast downward crash slam!
        const slamProgress = (this.slamTime - 1.0) / 0.3;
        this.slamHeight = (1 - slamProgress) * 3.8;
      } else {
        // IMPACT! Trigger Ground Shockwave!
        this.slamHeight = 0;
        this.isSlamming = false;
        this.triggerShockwave(targetPlayer.pos, onPlayerAttack, getGroundHeight);
      }
    } else if (this.state === 'AGGRO') {
      moveTarget = targetPlayer.pos;
      currentSpeed = this.speed * 1.3;

      if (distToPlayer <= 2.8) {
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 2.0;
          if (onPlayerAttack) {
            onPlayerAttack(this.attackPower, this.position);
          }
          if (window.soundFX) window.soundFX.playHit(true);
        }
      }
    } else if (this.state === 'WANDER') {
      moveTarget = this.wanderTarget;
      currentSpeed = this.speed * 0.6;
      if (this.position.distanceTo(this.wanderTarget) < 1.2) {
        this.state = 'IDLE';
        this.stateTimer = 2.0;
      }
    } else if (this.state === 'IDLE') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = 'WANDER';
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * 8.0;
        this.wanderTarget.set(
          this.spawnPos.x + Math.sin(angle) * rad,
          0.05,
          this.spawnPos.z + Math.cos(angle) * rad
        );
      }
    }

    // Normal Hopping motion when not slamming
    if (!this.isSlamming) {
      this.hopPhase += delta * (this.state === 'AGGRO' ? 6.0 : 3.5);
      const hopSin = Math.sin(this.hopPhase);
      const hopHeight = Math.max(0, hopSin) * (this.state === 'AGGRO' ? 1.1 : 0.6);
      this.meshGroup.position.y = hopHeight;

      if (hopHeight > 0.1) {
        this.meshGroup.scale.set(0.9, 1.2, 0.9);
      } else {
        this.meshGroup.scale.set(1.15, 0.85, 1.15);
      }
    } else {
      this.meshGroup.position.y = this.slamHeight;
      this.meshGroup.scale.set(1.25, 0.75, 1.25);
    }

    if (moveTarget && this.state !== 'IDLE' && !this.isSlamming) {
      const dir = moveTarget.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.5) {
        dir.normalize();
        this.position.addScaledVector(dir, currentSpeed * delta);
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    if (getGroundHeight) {
      this.position.y = getGroundHeight(this.position.x, this.position.z);
    }

    this.group.position.copy(this.position);

    // Update active shockwave rings
    this.updateShockwaves(delta);
  }

  triggerShockwave(playerPos, onPlayerAttack, getGroundHeight) {
    if (window.soundFX) window.soundFX.playHit(true);

    // Spawn 3D expanding ground shockwave ring
    const groundY = getGroundHeight ? getGroundHeight(this.position.x, this.position.z) : 0.05;
    const ringGeo = new THREE.RingGeometry(0.8, 1.6, 24);
    ringGeo.rotateX(-Math.PI / 2);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    const shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
    shockwaveMesh.position.set(this.position.x, groundY + 0.1, this.position.z);
    this.scene.add(shockwaveMesh);

    this.shockwaves.push({
      mesh: shockwaveMesh,
      mat: ringMat,
      radius: 1.6,
      maxRadius: 8.5,
      speed: 12.0
    });

    // Check hit against player: If player is within 8.5m and NOT jumping over it!
    const dist = this.position.distanceTo(playerPos);
    if (dist <= 8.5) {
      // If player jumped high (y > groundY + 0.65m), they successfully dodge it!
      const playerGroundY = getGroundHeight ? getGroundHeight(playerPos.x, playerPos.z) : 0.05;
      const isPlayerJumpingOver = playerPos.y > playerGroundY + 0.65;

      if (!isPlayerJumpingOver) {
        if (onPlayerAttack) {
          onPlayerAttack(30, this.position); // 30 Heavy Shockwave damage
        }
      }
    }
  }

  updateShockwaves(delta) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * delta;
      sw.mesh.scale.set(sw.radius, 1, sw.radius);
      sw.mat.opacity = Math.max(0, 1.0 - (sw.radius / sw.maxRadius));

      if (sw.radius >= sw.maxRadius) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mat.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }
}

window.KingSlimeBoss = KingSlimeBoss;

// -------------------------------------------------------------------------
// 4. Crystal Spider (Level 4 Dungeon Cavern Beast)
// -------------------------------------------------------------------------
class CrystalSpiderMonster extends Monster {
  constructor(scene, damageSystem, config = {}) {
    super(scene, damageSystem, {
      name: 'Crystal Spider',
      level: 4,
      maxHp: 110,
      attackPower: 18,
      speed: 4.5,
      expReward: 110,
      goldReward: 25,
      lootItem: { name: 'Crystal Silk', icon: '🕸️' },
      spawnPos: config.spawnPos || new THREE.Vector3(-8, 0.05, 105)
    });

    this.walkPhase = Math.random() * Math.PI * 2;
    this.buildSpiderModel();
  }

  buildSpiderModel() {
    this.meshGroup = new THREE.Group();

    // Dark Chitin Body
    this.chitinMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.3
    });

    // Glowing Bioluminescent Crystal Cluster on Back
    this.gemMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9
    });

    // Cephalothorax (Head/Chest)
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), this.chitinMat);
    head.position.set(0, 0.45, 0.3);
    head.scale.set(0.9, 0.7, 1.1);
    head.castShadow = true;
    this.meshGroup.add(head);

    // Abdomen
    const abdomen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), this.chitinMat);
    abdomen.position.set(0, 0.6, -0.65);
    abdomen.scale.set(1.0, 0.85, 1.4);
    abdomen.castShadow = true;
    this.meshGroup.add(abdomen);

    // Crystal Spikes growing on Abdomen
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const spike = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.gemMat);
      spike.scale.set(0.5, 1.8, 0.5);
      spike.position.set(Math.sin(ang) * 0.3, 1.15, -0.65 + Math.cos(ang) * 0.3);
      spike.rotation.set(Math.sin(ang) * 0.4, 0, Math.cos(ang) * 0.4);
      this.meshGroup.add(spike);
    }

    // Glowing Red Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let ex of [-0.18, -0.06, 0.06, 0.18]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
      eye.position.set(ex, 0.55, 0.72);
      this.meshGroup.add(eye);
    }

    // 6 Spider Legs (Low-poly arched rods)
    this.legs = [];
    for (let side of [-1, 1]) {
      for (let l = 0; l < 3; l++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 5), this.chitinMat);
        leg.position.set(side * 0.65, 0.35, -0.2 + l * 0.4);
        leg.rotation.set((l - 1) * 0.2, 0, side * 0.8);
        this.meshGroup.add(leg);
        this.legs.push({ mesh: leg, baseRotZ: side * 0.8, side, index: l });
      }
    }

    this.group.add(this.meshGroup);
  }

  setEmissiveFlash(flash) {
    if (this.chitinMat) {
      this.chitinMat.emissive = new THREE.Color(flash ? 0xff4444 : 0x000000);
      this.chitinMat.emissiveIntensity = flash ? 0.9 : 0;
    }
  }

  update(delta, playerPos, camera, onPlayerAttack, getGroundHeight = null) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.updateOverheadUI(camera);

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setEmissiveFlash(false);
      }
    }

    // Apply remote peer co-op sync if active
    if (this.applyRemoteSync(delta, getGroundHeight)) return;

    // Check nearest player among local and remote party members!
    const targetPlayer = this.getNearestPlayer(playerPos);
    const distToPlayer = targetPlayer.dist;
    const distToSpawn = this.position.distanceTo(this.spawnPos);

    if (distToSpawn > 55.0) {
      if (this.state === 'AGGRO') {
        this.state = 'RETURNING';
        this.alertSprite.visible = false;
      }
    } else if (distToPlayer < this.aggroRadius && this.state !== 'RETURNING') {
      if (this.state !== 'AGGRO') {
        this.state = 'AGGRO';
        this.alertSprite.visible = true;
      }
    }

    let moveTarget = null;
    let currentSpeed = this.speed;

    if (this.state === 'RETURNING') {
      moveTarget = this.spawnPos;
      currentSpeed = this.speed * 1.1;
      if (this.position.distanceTo(this.spawnPos) < 1.0) {
        this.state = 'IDLE';
        this.stateTimer = 2.0;
        this.hp = this.maxHp;
      }
    } else if (this.state === 'AGGRO') {
      moveTarget = targetPlayer.pos;
      currentSpeed = this.speed * 1.35;

      if (distToPlayer <= this.attackRadius) {
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.4;
          if (onPlayerAttack) {
            onPlayerAttack(this.attackPower, this.position);
          }
          if (window.soundFX) window.soundFX.playAttack('slash');
        }
      }
    } else if (this.state === 'WANDER') {
      moveTarget = this.wanderTarget;
      currentSpeed = this.speed * 0.6;
      if (this.position.distanceTo(this.wanderTarget) < 0.8) {
        this.state = 'IDLE';
        this.stateTimer = 1.2 + Math.random() * 2.0;
      }
    } else if (this.state === 'IDLE') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = 'WANDER';
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * 6.0;
        this.wanderTarget.set(
          this.spawnPos.x + Math.sin(angle) * rad,
          0.05,
          this.spawnPos.z + Math.cos(angle) * rad
        );
      }
    }

    this.walkPhase += delta * (this.state === 'AGGRO' ? 14.0 : 7.0);

    // Skittering Leg Animation
    this.legs.forEach(l => {
      const legPhase = this.walkPhase + l.index * 1.2 + (l.side > 0 ? 0 : Math.PI);
      l.mesh.rotation.x = Math.sin(legPhase) * 0.35;
    });

    if (moveTarget && this.state !== 'IDLE') {
      const dir = moveTarget.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.3) {
        dir.normalize();
        this.position.addScaledVector(dir, currentSpeed * delta);
        this.position.z = Math.max(15.2, this.position.z); // Protected Town Safe Zone Barrier
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    if (getGroundHeight) {
      this.position.y = getGroundHeight(this.position.x, this.position.z);
    }
    this.group.position.copy(this.position);
  }
}

// -------------------------------------------------------------------------
// 5. Goblin Scout (Level 5 KayKit Orc / Goblin Warband - Bright Green Chibi)
// -------------------------------------------------------------------------
class GoblinScoutMonster extends Monster {
  constructor(scene, damageSystem, config = {}) {
    super(scene, damageSystem, {
      name: config.name || 'Goblin Scout',
      level: config.level || 5,
      maxHp: config.maxHp || 150,
      attackPower: config.attackPower || 24,
      speed: 4.0,
      expReward: 140,
      goldReward: 38,
      lootItem: { name: 'Tribal Cleaver Shard', icon: '🪓' },
      spawnPos: config.spawnPos || new THREE.Vector3(45, 0.05, 52)
    });

    this.runPhase = Math.random() * Math.PI * 2;
    this.buildGoblinModel();
  }

  buildGoblinModel() {
    this.meshGroup = new THREE.Group();

    // 1. Stylized KayKit Palette Materials
    // Bright Lime Green Skin (matches user image 0x84cc16)
    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.6,
      metalness: 0.05
    });

    // Dark Warpaint Warrior Band across eyes
    this.warpaintMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9
    });

    // Studded Harness & Leather Tunic
    this.harnessMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.75
    });

    // Leather Bracers, Belts & Boots
    this.leatherMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7
    });

    // Orc Fangs & Carved Bone Buckle
    this.boneMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.4
    });

    // Dark Topknot Hair
    this.hairMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85
    });

    // Heavy Tribal Iron Blade & Metal Rim
    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.25
    });

    // Wooden Tribal Shield
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x543828,
      roughness: 0.8
    });

    // 2. Chibi Green Torso with Studded Cross-Harness
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 0.68;

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.54, 0.42), this.skinMat);
    chest.castShadow = true;
    torsoGroup.add(chest);

    // Leather Harness Cross Straps
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.44), this.harnessMat);
    strap1.rotation.z = 0.48;
    torsoGroup.add(strap1);

    const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.44), this.harnessMat);
    strap2.rotation.z = -0.48;
    torsoGroup.add(strap2);

    // Center Bone / Skull Buckle
    const buckle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), this.boneMat);
    buckle.position.set(0, 0, 0.23);
    torsoGroup.add(buckle);

    // Belt & Loincloth
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.44), this.harnessMat);
    belt.position.y = -0.25;
    torsoGroup.add(belt);

    this.meshGroup.add(torsoGroup);

    // 3. Legs & Leather Boots
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.24), this.leatherMat);
    this.leftLeg.position.set(-0.17, 0.21, 0);
    this.leftLeg.castShadow = true;
    this.meshGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.24), this.leatherMat);
    this.rightLeg.position.set(0.17, 0.21, 0);
    this.rightLeg.castShadow = true;
    this.meshGroup.add(this.rightLeg);

    // 4. Stylized Chibi Goblin Head (Oversized with big ears & warpaint)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.18, 0.05);

    // Main Green Head Cube/Sphere
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.58, 0.56), this.skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Dark Warpaint Band across Eyes
    const warpaint = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.58), this.warpaintMat);
    warpaint.position.set(0, 0.04, 0);
    this.headGroup.add(warpaint);

    // Fierce Glowing Amber Eyes (set in warpaint)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    for (let side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), eyeMat);
      eye.position.set(side * 0.16, 0.05, 0.29);
      this.headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), pupilMat);
      pupil.position.set(side * 0.16, 0.05, 0.35);
      this.headGroup.add(pupil);
    }

    // Lower Jaw Orc Tusks / Fangs pointing UP!
    for (let side of [-1, 1]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 5), this.boneMat);
      tusk.position.set(side * 0.14, -0.16, 0.29);
      tusk.rotation.x = -Math.PI; // Pointing up
      tusk.rotation.z = side * 0.15;
      this.headGroup.add(tusk);
    }

    // Big Protruding Pointed Goblin / Orc Ears (Angled outward & up)
    for (let side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.34, 0.08, 0.02);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.52, 5), this.skinMat);
      ear.position.set(side * 0.24, 0.06, -0.05);
      ear.rotation.set(-0.25, side * 0.25, -side * 1.25);
      ear.scale.set(1.0, 1.0, 0.45); // Flatted ear shape
      earGroup.add(ear);

      // Dark inner ear shadow
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 4), this.harnessMat);
      innerEar.position.set(side * 0.2, 0.05, -0.04);
      innerEar.rotation.set(-0.25, side * 0.25, -side * 1.25);
      innerEar.scale.set(0.9, 0.9, 0.3);
      earGroup.add(innerEar);

      this.headGroup.add(earGroup);
    }

    // Topknot Hair Tuft (Tied with red/leather hair tie on top)
    const hairTie = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8), this.harnessMat);
    hairTie.position.set(0, 0.35, -0.06);
    this.headGroup.add(hairTie);

    const hairTuft = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 6), this.hairMat);
    hairTuft.position.set(0, 0.56, -0.14);
    hairTuft.rotation.x = -0.45; // Angled backward
    this.headGroup.add(hairTuft);

    this.meshGroup.add(this.headGroup);

    // 5. Right Arm & Curved Tribal Cleaver
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.38, 0.82, 0);

    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.18), this.skinMat);
    rUpper.position.y = -0.15;
    this.rightArm.add(rUpper);

    const rBracer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), this.leatherMat);
    rBracer.position.y = -0.28;
    this.rightArm.add(rBracer);

    // Tribal Cleaver / War Axe
    const cleaverGroup = new THREE.Group();
    cleaverGroup.position.set(0, -0.32, 0.15);

    // Wrapped Hilt
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), this.woodMat);
    hilt.rotation.x = Math.PI / 3;
    cleaverGroup.add(hilt);

    // Heavy Curved Notched Blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.04), this.metalMat);
    blade.position.set(0.08, 0.18, 0.28);
    blade.rotation.x = Math.PI / 4;
    cleaverGroup.add(blade);

    const bladeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), this.metalMat);
    bladeSpike.position.set(0.08, 0.45, 0.5);
    bladeSpike.rotation.x = Math.PI / 4;
    cleaverGroup.add(bladeSpike);

    this.rightArm.add(cleaverGroup);
    this.meshGroup.add(this.rightArm);

    // 6. Left Arm & Round Tribal Skull Shield
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.38, 0.82, 0);

    const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.18), this.skinMat);
    lUpper.position.y = -0.15;
    this.leftArm.add(lUpper);

    const lBracer = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.2), this.leatherMat);
    lBracer.position.y = -0.28;
    this.leftArm.add(lBracer);

    // Round Tribal Wooden Shield with Skull Emblem
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.12, -0.18, 0.25);
    shieldGroup.rotation.y = -0.3;

    // Wooden Shield Disc
    const shieldWood = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 16), this.woodMat);
    shieldWood.rotation.x = Math.PI / 2;
    shieldGroup.add(shieldWood);

    // Metal Rim
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.035, 6, 20), this.metalMat);
    shieldGroup.add(shieldRim);

    // Carved Skull Emblem on Center of Shield
    const skullHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), this.boneMat);
    skullHead.position.z = 0.06;
    skullHead.scale.set(1.0, 1.1, 0.6);
    shieldGroup.add(skullHead);

    const skullEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), this.warpaintMat);
    skullEye1.position.set(-0.045, 0.02, 0.12);
    shieldGroup.add(skullEye1);

    const skullEye2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), this.warpaintMat);
    skullEye2.position.set(0.045, 0.02, 0.12);
    shieldGroup.add(skullEye2);

    this.leftArm.add(shieldGroup);
    this.meshGroup.add(this.leftArm);

    this.group.add(this.meshGroup);
  }

  setEmissiveFlash(flash) {
    if (this.skinMat) {
      this.skinMat.emissive = new THREE.Color(flash ? 0xff4444 : 0x000000);
      this.skinMat.emissiveIntensity = flash ? 0.9 : 0;
    }
  }

  update(delta, playerPos, camera, onPlayerAttack, getGroundHeight = null) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.updateOverheadUI(camera);

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.setEmissiveFlash(false);
      }
    }

    // Apply remote peer co-op sync if active
    if (this.applyRemoteSync(delta, getGroundHeight)) return;

    // Check nearest player among local and remote party members!
    const targetPlayer = this.getNearestPlayer(playerPos);
    const distToPlayer = targetPlayer.dist;
    const distToSpawn = this.position.distanceTo(this.spawnPos);

    if (distToSpawn > 55.0) {
      if (this.state === 'AGGRO') {
        this.state = 'RETURNING';
        this.alertSprite.visible = false;
      }
    } else if (distToPlayer < this.aggroRadius && this.state !== 'RETURNING') {
      if (this.state !== 'AGGRO') {
        this.state = 'AGGRO';
        this.alertSprite.visible = true;
      }
    }

    let moveTarget = null;
    let currentSpeed = this.speed;

    if (this.state === 'RETURNING') {
      moveTarget = this.spawnPos;
      currentSpeed = this.speed * 1.1;
      if (this.position.distanceTo(this.spawnPos) < 1.0) {
        this.state = 'IDLE';
        this.stateTimer = 2.0;
        this.hp = this.maxHp;
      }
    } else if (this.state === 'AGGRO') {
      moveTarget = targetPlayer.pos;
      currentSpeed = this.speed * 1.35;

      if (distToPlayer <= this.attackRadius) {
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.5;
          if (onPlayerAttack) {
            onPlayerAttack(this.attackPower, this.position);
          }
          if (window.soundFX) window.soundFX.playHit(false);
        }
      }
    } else if (this.state === 'WANDER') {
      moveTarget = this.wanderTarget;
      currentSpeed = this.speed * 0.6;
      if (this.position.distanceTo(this.wanderTarget) < 0.8) {
        this.state = 'IDLE';
        this.stateTimer = 1.5 + Math.random() * 2.0;
      }
    } else if (this.state === 'IDLE') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = 'WANDER';
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * 7.0;
        this.wanderTarget.set(
          this.spawnPos.x + Math.sin(angle) * rad,
          0.05,
          this.spawnPos.z + Math.cos(angle) * rad
        );
      }
    }

    this.runPhase += delta * (this.state === 'AGGRO' ? 12.0 : 6.0);
    this.meshGroup.position.y = Math.abs(Math.sin(this.runPhase)) * 0.12;

    // Running leg scissoring and arm swing animations
    if (moveTarget && this.state !== 'IDLE') {
      const legAngle = Math.sin(this.runPhase) * 0.55;
      if (this.leftLeg) this.leftLeg.rotation.x = legAngle;
      if (this.rightLeg) this.rightLeg.rotation.x = -legAngle;
      if (this.rightArm) this.rightArm.rotation.x = -legAngle * 0.9;
      if (this.leftArm) this.leftArm.rotation.x = legAngle * 0.5;
      if (this.headGroup) this.headGroup.rotation.z = Math.sin(this.runPhase * 0.5) * 0.08;
    } else {
      if (this.leftLeg) this.leftLeg.rotation.x = 0;
      if (this.rightLeg) this.rightLeg.rotation.x = 0;
      const breathe = Math.sin(Date.now() * 0.004);
      if (this.rightArm) this.rightArm.rotation.x = breathe * 0.1;
      if (this.leftArm) this.leftArm.rotation.x = -breathe * 0.1;
      if (this.headGroup) this.headGroup.rotation.z = 0;
    }

    if (moveTarget && this.state !== 'IDLE') {
      const dir = moveTarget.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.3) {
        dir.normalize();
        this.position.addScaledVector(dir, currentSpeed * delta);
        this.position.z = Math.max(15.2, this.position.z); // Protected Town Safe Zone Barrier
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }

    if (getGroundHeight) {
      this.position.y = getGroundHeight(this.position.x, this.position.z);
    }
    this.group.position.copy(this.position);
  }
}

// 6. Ancient Crystal Golem - Level 8 Final Dungeon Boss of Mystic Caverns (Phase 5)
class AncientCrystalGolemBoss extends Monster {
  constructor(scene, damageSystem, config = {}) {
    super(scene, damageSystem, {
      name: '👑 ANCIENT CRYSTAL GOLEM',
      level: 8,
      maxHp: 380,
      attackPower: 18,
      speed: 3.6,
      expReward: 280,
      goldReward: 75,
      lootItem: { name: 'Core of the Crystal Golem', icon: '💎' },
      spawnPos: config.spawnPos || new THREE.Vector3(0, 0.05, 142)
    });

    this.isBoss = true;
    this.isEnraged = false;
    this.slamCooldown = 4.0;
    this.buildGolemModel();
  }

  buildGolemModel() {
    this.golemMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Ancient slate stone
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true
    });

    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.8,
      roughness: 0.1
    });

    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      roughness: 0.1
    });

    this.meshGroup = new THREE.Group();

    // 1. Massive Stone Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 1.8), this.golemMat);
    torso.position.y = 2.4;
    torso.castShadow = true;
    this.meshGroup.add(torso);

    // 2. Bioluminescent Crystal Chest Core
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), this.coreMat);
    core.position.set(0, 2.4, 0.95);
    this.meshGroup.add(core);
    this.golemCore = core;

    // Glowing Core Light
    this.coreLight = new THREE.PointLight(0xa855f7, 2.0, 12);
    this.coreLight.position.set(0, 2.4, 1.1);
    this.meshGroup.add(this.coreLight);

    // 3. Stone Head with Glowing Monolith Eyes
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.1), this.golemMat);
    head.position.set(0, 3.8, 0.1);
    this.meshGroup.add(head);

    // Crystal Horns on Head
    for (let hx of [-0.45, 0.45]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 5), this.crystalMat);
      horn.position.set(hx, 4.4, 0.1);
      horn.rotation.z = hx < 0 ? 0.3 : -0.3;
      this.meshGroup.add(horn);
    }

    // 4. Floating Boulders (Arms & Heavy Fists)
    this.armL = new THREE.Group();
    this.armL.position.set(-1.8, 2.2, 0);
    const shoulderL = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), this.golemMat);
    const fistL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), this.golemMat);
    fistL.position.y = -1.1;
    this.armL.add(shoulderL);
    this.armL.add(fistL);
    this.meshGroup.add(this.armL);

    this.armR = new THREE.Group();
    this.armR.position.set(1.8, 2.2, 0);
    const shoulderR = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), this.golemMat);
    const fistR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), this.golemMat);
    fistR.position.y = -1.1;
    this.armR.add(shoulderR);
    this.armR.add(fistR);
    this.meshGroup.add(this.armR);

    // 5. Heavy Stone Legs
    for (let lx of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.5, 0.9), this.golemMat);
      leg.position.set(lx, 0.75, 0);
      leg.castShadow = true;
      this.meshGroup.add(leg);
    }

    this.group.add(this.meshGroup);
  }

  update(delta, playerPos, camera, onPlayerAttack, getGroundHeight) {
    if (this.isDead) return;

    this.updateOverheadUI(camera);

    // Apply remote peer co-op sync if active
    if (this.applyRemoteSync(delta, getGroundHeight)) return;

    // Check nearest player among local and remote party members!
    const targetPlayer = this.getNearestPlayer(playerPos);

    // Check Enrage Mode at < 35% HP
    if (!this.isEnraged && (this.hp / this.maxHp) < 0.35) {
      this.isEnraged = true;
      this.speed = 5.2;
      this.attackPower = 26;
      this.coreMat.color.setHex(0xef4444);
      this.coreMat.emissive.setHex(0xdc2626);
      this.coreLight.color.setHex(0xef4444);
      this.coreLight.intensity = 3.5;
      if (window.soundFX) window.soundFX.playWarcry();
      if (window.gameHUD) {
        window.gameHUD.triggerZoneBanner('⚠️ GOLEM ENRAGED!', 'The Ancient Crystal Golem core turns crimson! +50% ATK & Speed!');
      }
    }

    // Core Pulse
    if (this.golemCore) {
      const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.15;
      this.golemCore.scale.set(pulse, pulse, pulse);
    }

    // Floating Arm Oscillation
    const armSwing = Math.sin(Date.now() * 0.003) * 0.25;
    if (this.armL) this.armL.rotation.x = armSwing;
    if (this.armR) this.armR.rotation.x = -armSwing;

    const distToPlayer = targetPlayer.dist;
    const distToSpawn = this.position.distanceTo(this.spawnPos);

    // Boss leash boundary: stays in Dungeon Sanctum arena
    if (distToSpawn > 32.0 || targetPlayer.pos.z < 88.0) {
      this.state = 'RETURNING';
    } else if (distToPlayer < 24.0) {
      this.state = 'AGGRO';
    } else {
      this.state = 'IDLE';
    }

    if (this.state === 'RETURNING') {
      const dir = this.spawnPos.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.5) {
        dir.normalize();
        this.position.addScaledVector(dir, this.speed * 1.2 * delta);
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        this.state = 'IDLE';
        this.hp = this.maxHp;
      }
    } else if (this.state === 'AGGRO') {

      // Look at Player
      const dir = targetPlayer.pos.clone().sub(this.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.1) {
        dir.normalize();
        this.position.addScaledVector(dir, this.speed * delta);
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      // Ground Fissure Slam Special Attack
      this.slamCooldown -= delta;
      if (this.slamCooldown <= 0 && distToPlayer < 12.0) {
        this.slamCooldown = this.isEnraged ? 3.0 : 5.0;
        if (window.soundFX) window.soundFX.playGolemSlam();

        // Spawn Expanding Crystal Fissure Shockwave
        this.spawnFissureShockwave();

        // Check if player is on ground (jumping dodges slam!)
        const isPlayerJumping = window.gameHUD &&
          window.gameHUD.playerController &&
          !window.gameHUD.playerController.isGrounded;

        if (!isPlayerJumping && distToPlayer < 9.5) {
          if (onPlayerAttack) {
            onPlayerAttack(this.attackPower * 1.5, this.position);
          }
        }
      }

      // Regular Melee Hit
      if (distToPlayer <= 3.2) {
        this.attackCooldown -= delta;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.6;
          if (onPlayerAttack) onPlayerAttack(this.attackPower, this.position);
          if (window.soundFX) window.soundFX.playHit(true);
        }
      }
    }

    if (getGroundHeight) {
      this.position.y = getGroundHeight(this.position.x, this.position.z);
    }
    this.group.position.copy(this.position);
  }

  spawnFissureShockwave() {
    const ringGeo = new THREE.RingGeometry(0.8, 1.4, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.isEnraged ? 0xef4444 : 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.position);
    ring.position.y += 0.08;
    this.scene.add(ring);

    let scale = 1.0;
    const expandAnim = setInterval(() => {
      scale += 0.45;
      ring.scale.set(scale, 1, scale);
      ringMat.opacity -= 0.05;
      if (ringMat.opacity <= 0.02) {
        clearInterval(expandAnim);
        this.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
      }
    }, 30);
  }
}

window.CrystalSpiderMonster = CrystalSpiderMonster;
window.GoblinScoutMonster = GoblinScoutMonster;
window.AncientCrystalGolemBoss = AncientCrystalGolemBoss;

