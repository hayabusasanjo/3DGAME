// CombatSystem.js - Complete Real-Time Action RPG Combat Engine
// Manages player stats, anime weapon visual slash arcs & magic projectiles,
// monster hitboxes, loot drop pickups, floating damage, and Level Up fanfare!

class CombatSystem {
  constructor(scene, camera, playerController, damageSystem) {
    this.scene = scene;
    this.camera = camera;
    this.playerController = playerController;
    this.damageSystem = damageSystem;

    // Player Combat Stats
    this.level = 1;
    this.exp = 0;
    this.expNext = 100;
    this.hp = 100;
    this.maxHp = 100;
    this.mp = 50;
    this.maxMp = 50;
    this.gold = 0;
    this.potions = 2; // Start with 2 Healing Potions
    this.inventory = {};
    this.questSystem = null;

    this.attackPower = 24;
    this.isAttacking = false;
    this.attackCooldown = 0;

    // Active entities
    this.monsters = [];
    this.boss = null;
    this.projectiles = [];
    this.lootDrops = [];
    this.slashEffects = [];
    this.levelUpEffects = [];

    this.setupSlashMaterials();
    this.spawnPlainsMonsters();
    this.hookPlayerAttack();
    this.bindPotionHotbar();

    window.combatSystem = this;
  }

  getMonsterById(id) {
    if (!this.monsters) return null;
    return this.monsters.find(m => m.id === id);
  }

  setQuestSystem(questSystem) {
    this.questSystem = questSystem;
  }

  bindPotionHotbar() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        this.usePotion();
      }
    });
  }

  usePotion() {
    if ((this.potions || 0) <= 0) return false;
    if (this.hp >= this.maxHp) return false;

    this.potions--;
    const healAmt = 50;
    this.hp = Math.min(this.maxHp, this.hp + healAmt);
    this.damageSystem.spawnNumber(this.playerController.position.clone().add(new THREE.Vector3(0, 1.4, 0)), healAmt, 'heal');

    if (window.soundFX) window.soundFX.playLoot();

    // Spawn green healing sparkle ring
    this.damageSystem.spawnHitSparks(this.playerController.position, 0x10b981);
    return true;
  }

  setRace(race) {
    this.race = race;
    if (race === 'human') {
      this.attackPower = 26; // Balanced Knight
    } else if (race === 'elf') {
      this.attackPower = 34; // High Magic Burst
    } else if (race === 'dwarf') {
      this.attackPower = 40; // Heavy Berserker Cleave
    } else if (race === 'beastman') {
      this.attackPower = 22; // Agile Dual Blades
    }
  }

  setupSlashMaterials() {
    // Glowing Arc Material for Melee Swings
    this.slashMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    // Magic Missile Material
    this.magicOrbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.1
    });
  }

  spawnPlainsMonsters() {
    // Clean up any existing monsters to guarantee no duplicate spawns
    if (this.monsters && this.monsters.length > 0) {
      this.monsters.forEach(m => {
        if (m.group && m.group.parent) m.group.parent.remove(m.group);
      });
      this.monsters = [];
    }
    this.boss = null;
    this.dungeonBoss = null;

    // 1. Central Meadow Path (Level 1 Azure Slimes & Level 3 Horned Rabbits)
    const azureSpawns = [
      { id: 'slime_azure_0', pos: new THREE.Vector3(-6, 0.05, 28) },
      { id: 'slime_azure_1', pos: new THREE.Vector3(7, 0.05, 32) }
    ];
    azureSpawns.forEach(item => {
      const slime = new SlimeMonster(this.scene, this.damageSystem, { id: item.id, type: 'azure', spawnPos: item.pos });
      slime.id = item.id;
      slime.onDeath = (m) => this.handleMonsterDeath(m);
      this.monsters.push(slime);
    });

    const rabbitSpawns = [
      { id: 'rabbit_0', pos: new THREE.Vector3(-8, 0.05, 42) },
      { id: 'rabbit_1', pos: new THREE.Vector3(9, 0.05, 46) }
    ];
    rabbitSpawns.forEach(item => {
      const rabbit = new HornedRabbitMonster(this.scene, this.damageSystem, { id: item.id, spawnPos: item.pos });
      rabbit.id = item.id;
      rabbit.onDeath = (m) => this.handleMonsterDeath(m);
      this.monsters.push(rabbit);
    });

    // 2. South-West Zone: Slime Mire & King Slime Hollow (x: -45, z: 55)
    // Emerald Slime Minions guarding the marsh
    const emeraldSpawns = [
      { id: 'slime_emerald_0', pos: new THREE.Vector3(-36, 0.05, 50) },
      { id: 'slime_emerald_1', pos: new THREE.Vector3(-52, 0.05, 60) }
    ];
    emeraldSpawns.forEach(item => {
      const slime = new SlimeMonster(this.scene, this.damageSystem, { id: item.id, type: 'emerald', spawnPos: item.pos });
      slime.id = item.id;
      slime.onDeath = (m) => this.handleMonsterDeath(m);
      this.monsters.push(slime);
    });

    // Level 5 King Slime Mini-Boss in the center of the Slime Mire Arena!
    const kingSlime = new KingSlimeBoss(this.scene, this.damageSystem, {
      id: 'boss_king_slime',
      spawnPos: new THREE.Vector3(-45, 0.05, 55)
    });
    kingSlime.id = 'boss_king_slime';
    kingSlime.onDeath = (m) => this.handleMonsterDeath(m);
    this.monsters.push(kingSlime);
    this.boss = kingSlime;

    // 3. North-East Zone: Goblin Ridge & Warband Encampment (x: 45, z: 58)
    // Level 5 KayKit Goblin Scouts patrolling their war camp
    const goblinSpawns = [
      { id: 'goblin_0', pos: new THREE.Vector3(42, 0.05, 52) },
      { id: 'goblin_1', pos: new THREE.Vector3(48, 0.05, 62) }
    ];
    goblinSpawns.forEach(item => {
      const goblin = new GoblinScoutMonster(this.scene, this.damageSystem, { id: item.id, spawnPos: item.pos });
      goblin.id = item.id;
      goblin.onDeath = (m) => this.handleMonsterDeath(m);
      this.monsters.push(goblin);
    });

    // 4. Far North: Mystic Crystal Caverns (Dungeon Zone, z: 88 to 148)
    const spiderSpawns = [
      { id: 'spider_0', pos: new THREE.Vector3(-9, 0.05, 108) },
      { id: 'spider_1', pos: new THREE.Vector3(10, 0.05, 118) }
    ];
    spiderSpawns.forEach(item => {
      const spider = new CrystalSpiderMonster(this.scene, this.damageSystem, { id: item.id, spawnPos: item.pos });
      spider.id = item.id;
      spider.onDeath = (m) => this.handleMonsterDeath(m);
      this.monsters.push(spider);
    });

    // Dungeon Goblin Guard inside the cave
    const caveGoblin = new GoblinScoutMonster(this.scene, this.damageSystem, {
      id: 'goblin_cave',
      name: 'Cave Goblin Berserker',
      level: 6,
      maxHp: 175,
      attackPower: 26,
      spawnPos: new THREE.Vector3(6, 0.05, 128)
    });
    caveGoblin.id = 'goblin_cave';
    caveGoblin.onDeath = (m) => this.handleMonsterDeath(m);
    this.monsters.push(caveGoblin);

    // Level 8 Ancient Crystal Golem Final Dungeon Boss
    const golemBoss = new AncientCrystalGolemBoss(this.scene, this.damageSystem, {
      id: 'boss_golem',
      spawnPos: new THREE.Vector3(0, 0.05, 142)
    });
    golemBoss.id = 'boss_golem';
    golemBoss.onDeath = (m) => this.handleMonsterDeath(m);
    this.monsters.push(golemBoss);
    this.dungeonBoss = golemBoss;
  }

  setSkillSystem(skillSystem) {
    this.skillSystem = skillSystem;
  }

  upgradeWeapon(targetTier) {
    if (targetTier === 2) {
      const slimeGels = (this.inventory['Azure Slime Gel'] || 0) + (this.inventory['Emerald Slime Gel'] || 0);
      if (this.gold < 40 || slimeGels < 2) {
        return { success: false, reason: 'Requires 40 Gold and 2 Slime Gels!' };
      }

      this.gold -= 40;
      let need = 2;
      for (let k of ['Azure Slime Gel', 'Emerald Slime Gel']) {
        if (this.inventory[k] && need > 0) {
          const take = Math.min(this.inventory[k], need);
          this.inventory[k] -= take;
          need -= take;
        }
      }

      this.weaponTier = 2;
      this.attackPower += 12;
      if (window.soundFX) window.soundFX.playForgeHammer();
      this.attachWeaponAura(0x38bdf8); // Cyan enchanted glow
      return { success: true, tier: 2, title: 'Tier 2: Enchanted Weapon (+12 ATK)' };
    } else if (targetTier === 3) {
      const crowns = this.inventory['Crown of the Slime King'] || 0;
      if (this.gold < 100 || crowns < 1) {
        return { success: false, reason: 'Requires 100 Gold and 1 Crown of the Slime King!' };
      }

      this.gold -= 100;
      this.inventory['Crown of the Slime King']--;
      this.weaponTier = 3;
      this.attackPower += 16;
      if (window.soundFX) {
        window.soundFX.playForgeHammer();
        window.soundFX.playLevelUp();
      }
      this.attachWeaponAura(0xf59e0b); // Legendary radiant gold glow
      return { success: true, tier: 3, title: 'Tier 3: Royal Legendary Weapon (+28 Total ATK)' };
    }
    return { success: false, reason: 'No upgrade available.' };
  }

  attachWeaponAura(colorHex) {
    if (this.weaponAura && this.playerController.characterLoader.characterGroup) {
      this.playerController.characterLoader.characterGroup.remove(this.weaponAura);
    }
    const auraLight = new THREE.PointLight(colorHex, 1.5, 5);
    auraLight.position.set(0.4, 1.2, 0.4);
    if (this.playerController.characterLoader.characterGroup) {
      this.playerController.characterLoader.characterGroup.add(auraLight);
    }
    this.weaponAura = auraLight;
  }

  hookPlayerAttack() {
    // Intercept attack calls from PlayerController
    const origAttack = this.playerController.attack.bind(this.playerController);
    this.playerController.attack = () => {
      if (this.attackCooldown > 0) return;
      origAttack();
      this.performAttack();
    };
  }

  performAttack() {
    this.attackCooldown = 0.45; // 0.45s attack rate
    const pPos = this.playerController.position;
    const pRotY = this.playerController.rotationY;

    // Forward direction player is facing
    const forward = new THREE.Vector3(Math.sin(pRotY), 0, Math.cos(pRotY)).normalize();

    if (this.race === 'elf') {
      // Elf Mage fires Mana Bolt Projectile
      this.spawnMagicProjectile(pPos, forward);
      if (window.soundFX) window.soundFX.playAttack('spell');
    } else {
      // Melee Slash Arc Visual Effect
      this.spawnSlashArc(pPos, forward);
      if (window.soundFX) window.soundFX.playAttack('slash');

      // Check melee hit cone (Distance <= 3.2m, within 70 deg cone)
      this.checkMeleeHits(pPos, forward);
    }
  }

  spawnSlashArc(pPos, forward) {
    const arcGeo = new THREE.RingGeometry(1.2, 2.5, 16, 1, 0, Math.PI * 0.7);
    arcGeo.rotateX(-Math.PI / 2);

    let colorHex = 0x38bdf8; // Cyan default
    if (this.race === 'dwarf') colorHex = 0xef4444; // Fiery Red Whirl
    if (this.race === 'beastman') colorHex = 0xa855f7; // Purple Claw

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const arcMesh = new THREE.Mesh(arcGeo, mat);
    arcMesh.position.set(pPos.x + forward.x * 0.9, pPos.y + 0.9, pPos.z + forward.z * 0.9);
    arcMesh.rotation.y = this.playerController.rotationY - Math.PI * 0.35;
    this.scene.add(arcMesh);

    this.slashEffects.push({
      mesh: arcMesh,
      mat: mat,
      age: 0,
      lifetime: 0.22
    });
  }

  spawnMagicProjectile(pPos, forward) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), this.magicOrbMat);
    orb.position.set(pPos.x + forward.x * 0.8, pPos.y + 1.2, pPos.z + forward.z * 0.8);
    this.scene.add(orb);

    const light = new THREE.PointLight(0x38bdf8, 1.2, 5);
    orb.add(light);

    this.projectiles.push({
      mesh: orb,
      dir: forward.clone(),
      speed: 18.0,
      distanceTraveled: 0,
      maxDistance: 16.0
    });
  }

  checkMeleeHits(pPos, forward) {
    const range = this.race === 'dwarf' ? 3.4 : 2.8;

    this.monsters.forEach(m => {
      if (m.isDead) return;
      const toMonster = m.position.clone().sub(pPos);
      toMonster.y = 0;
      const dist = toMonster.length();

      if (dist <= range) {
        toMonster.normalize();
        const dot = forward.dot(toMonster);
        // Angle <= 75 degrees (dot > 0.25)
        if (dot > 0.25 || this.race === 'dwarf') { // Dwarf hits in full spin!
          this.applyHitToMonster(m);
        }
      }
    });
  }

  applyHitToMonster(monster) {
    // 18% Critical Hit Chance
    const isCrit = Math.random() < 0.18;
    const totalAtk = this.attackPower + (this.bonusEquipmentAtk || 0);
    const baseDmg = totalAtk + (Math.random() * 8 - 4);
    const finalDmg = isCrit ? baseDmg * 1.8 : baseDmg;

    monster.takeDamage(finalDmg, isCrit, this.playerController.position);
  }

  // Handle Monster attacking player with defense reduction
  damagePlayer(amount, monsterPos) {
    const def = this.defensePower || 5;
    const reduction = 100 / (100 + def);
    const effectiveDmg = Math.max(1, Math.round(amount * reduction));

    this.hp = Math.max(0, this.hp - effectiveDmg);
    this.damageSystem.spawnNumber(this.playerController.position.clone().add(new THREE.Vector3(0, 1.4, 0)), effectiveDmg, 'player-hurt');

    if (window.soundFX) window.soundFX.playPlayerHurt();

    // Trigger Screen Red Flash Vignette on HUD
    if (this.onPlayerDamageEffect) {
      this.onPlayerDamageEffect();
    }

    if (this.hp <= 0) {
      this.respawnPlayer();
    }
  }

  respawnPlayer() {
    this.hp = this.maxHp;
    this.playerController.position.set(0, 0.05, 7.5); // Respawn at Fountain
    this.playerController.velocity.set(0, 0, 0);

    if (this.onPlayerRespawn) {
      this.onPlayerRespawn();
    }
  }

  handleMonsterDeath(monster) {
    // Award EXP & Gold
    this.addExp(monster.expReward);
    this.gold += monster.goldReward;

    // Track kill in Quest System
    if (this.questSystem) {
      this.questSystem.onMonsterKilled(monster);
    }

    // Spawn 3D Dropped Loot Item
    this.spawnLootDrop(monster.position, monster.lootItem, monster.goldReward);
  }

  spawnLootDrop(pos, item, goldAmt) {
    const dropGroup = new THREE.Group();
    dropGroup.position.copy(pos);
    dropGroup.position.y = 0.4;

    // Glowing Diamond/Cube Loot Core
    const itemMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    const cube = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), itemMat);
    dropGroup.add(cube);

    // Upward Light Beam / Beacon
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.1;
    dropGroup.add(beam);

    this.scene.add(dropGroup);

    this.lootDrops.push({
      group: dropGroup,
      item: item,
      gold: goldAmt,
      rotSpeed: 2.2,
      time: 0
    });
  }

  addExp(amount) {
    this.exp += amount;
    if (this.exp >= this.expNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level += 1;
    this.exp -= this.expNext;
    this.expNext = Math.round(this.expNext * 1.6);

    // Stat boost & Full Heal
    this.maxHp += 25;
    this.hp = this.maxHp;
    this.maxMp += 10;
    this.mp = this.maxMp;
    this.attackPower += 6;

    if (window.soundFX) window.soundFX.playLevelUp();

    // Spawn 3D Ascending Pillar of Light around Player
    this.spawnLevelUpLightPillar();

    // Trigger HUD Level Up Banner
    if (this.onLevelUp) {
      this.onLevelUp(this.level);
    }
  }

  spawnLevelUpLightPillar() {
    const pPos = this.playerController.position;
    const pillarGeo = new THREE.CylinderGeometry(1.4, 1.4, 8, 16, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pPos.x, pPos.y + 4, pPos.z);
    this.scene.add(pillar);

    this.levelUpEffects.push({
      mesh: pillar,
      mat: pillarMat,
      age: 0,
      lifetime: 1.4
    });
  }

  update(delta) {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
    if (this.skillSystem) {
      this.skillSystem.update(delta);
    }

    const pPos = this.playerController.position;

    // 1. Update Monsters (with ground detection)
    const getGround = (x, z) => (this.playerController ? this.playerController.getGroundHeight(x, z) : 0.05);
    this.monsters.forEach(m => {
      m.update(delta, pPos, this.camera, (dmg, monsterPos) => {
        this.damagePlayer(dmg, monsterPos);
      }, getGround);
    });

    // 2. Update Magic Projectiles (Elf Mage)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const moveDist = proj.speed * delta;
      proj.mesh.position.addScaledVector(proj.dir, moveDist);
      proj.distanceTraveled += moveDist;

      // Check collision with monsters
      let hasHit = false;
      for (let m of this.monsters) {
        if (!m.isDead && m.position.distanceTo(proj.mesh.position) < 1.4) {
          this.applyHitToMonster(m);
          hasHit = true;
          break;
        }
      }

      if (hasHit || proj.distanceTraveled >= proj.maxDistance) {
        this.damageSystem.spawnHitSparks(proj.mesh.position, 0x38bdf8);
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Update Melee Slash Effects
    for (let i = this.slashEffects.length - 1; i >= 0; i--) {
      const s = this.slashEffects[i];
      s.age += delta;
      s.mesh.scale.multiplyScalar(1.0 + delta * 2.5);
      s.mat.opacity = Math.max(0, 1.0 - s.age / s.lifetime);

      if (s.age >= s.lifetime) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mat.dispose();
        this.slashEffects.splice(i, 1);
      }
    }

    // 4. Update Level Up Light Pillar
    for (let i = this.levelUpEffects.length - 1; i >= 0; i--) {
      const lu = this.levelUpEffects[i];
      lu.age += delta;
      lu.mesh.rotation.y += delta * 3.0;
      lu.mesh.scale.x = 1.0 + Math.sin(lu.age * 3) * 0.2;
      lu.mesh.scale.z = lu.mesh.scale.x;
      lu.mat.opacity = Math.max(0, 1.0 - lu.age / lu.lifetime);

      if (lu.age >= lu.lifetime) {
        this.scene.remove(lu.mesh);
        lu.mesh.geometry.dispose();
        lu.mat.dispose();
        this.levelUpEffects.splice(i, 1);
      }
    }

    // 5. Update Loot Drops & Pickup Check
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      drop.time += delta;
      drop.group.rotation.y += drop.rotSpeed * delta;
      const dropGroundY = getGround(drop.group.position.x, drop.group.position.z);
      drop.group.position.y = dropGroundY + 0.45 + Math.sin(drop.time * 3) * 0.12;

      // Vacuum pickup if player is within 2.2m
      const dist = drop.group.position.distanceTo(pPos);
      if (dist < 2.2) {
        // Collect!
        if (window.soundFX) window.soundFX.playLoot();

        const itemName = drop.item.name;
        this.inventory[itemName] = (this.inventory[itemName] || 0) + 1;

        if (this.onLootCollected) {
          this.onLootCollected(drop.item, drop.gold);
        }

        this.scene.remove(drop.group);
        this.lootDrops.splice(i, 1);
      }
    }
  }
}

window.CombatSystem = CombatSystem;
