// SkillSystem.js - Active Combat Skills Engine for All 4 Fantasy Races
// Manages Mana costs, cooldowns, 3D visual effects (lightning, frost nova, shield bash, fissures),
// and multi-target area-of-effect damage calculations.

class SkillSystem {
  constructor(scene, camera, playerController, combatSystem, damageSystem) {
    this.scene = scene;
    this.camera = camera;
    this.playerController = playerController;
    this.combatSystem = combatSystem;
    this.damageSystem = damageSystem;

    this.activeVFX = [];
    this.cooldowns = { Q: 0, E: 0 };
    this.buffTimer = 0; // Berserker buff duration

    this.initSkills();
  }

  setRace(race) {
    this.race = race;
  }

  initSkills() {
    this.skillsByRace = {
      human: {
        Q: {
          id: 'shield_bash',
          name: 'Shield Bash',
          key: 'Q',
          icon: '🛡️',
          mpCost: 15,
          cdMax: 4.0,
          desc: 'Stuns enemies in front for 1.8s and deals 1.4x ATK.'
        },
        E: {
          id: 'holy_cleave',
          name: 'Holy Cleave',
          key: 'E',
          icon: '✨',
          mpCost: 25,
          cdMax: 7.0,
          desc: 'Radiant 360-degree holy slash dealing 2.5x ATK to all nearby enemies.'
        }
      },
      elf: {
        Q: {
          id: 'frost_nova',
          name: 'Frost Nova',
          key: 'Q',
          icon: '❄️',
          mpCost: 20,
          cdMax: 5.0,
          desc: 'Freezes all enemies within 6m in ice, dealing 1.6x magic damage.'
        },
        E: {
          id: 'thunder_strike',
          name: 'Thunder Strike',
          key: 'E',
          icon: '⚡',
          mpCost: 30,
          cdMax: 8.0,
          desc: 'Calls down a thunderous lightning pillar dealing 3.2x magic damage.'
        }
      },
      dwarf: {
        Q: {
          id: 'berserker_warcry',
          name: 'Berserker Warcry',
          key: 'Q',
          icon: '🔥',
          mpCost: 15,
          cdMax: 10.0,
          desc: 'Primal roar granting +50% ATK boost and speed for 6 seconds.'
        },
        E: {
          id: 'earth_shatter',
          name: 'Earth Shatter',
          key: 'E',
          icon: '🪨',
          mpCost: 25,
          cdMax: 6.0,
          desc: 'Slams axe into the earth, causing an explosive fissure dealing 2.8x heavy damage.'
        }
      },
      beastman: {
        Q: {
          id: 'shadow_dash',
          name: 'Shadow Dash',
          key: 'Q',
          icon: '💨',
          mpCost: 12,
          cdMax: 3.5,
          desc: 'Teleports 6 meters forward in a shadow blur, dodging attacks.'
        },
        E: {
          id: 'savage_flurry',
          name: 'Savage Flurry',
          key: 'E',
          icon: '🐾',
          mpCost: 24,
          cdMax: 6.5,
          desc: 'Rapid 4-hit dagger frenzy slice dealing 3.0x rapid cross damage.'
        }
      }
    };
  }

  getCurrentSkills() {
    const raceKey = this.race || 'human';
    return this.skillsByRace[raceKey] || this.skillsByRace.human;
  }

  castSkill(slotKey) {
    const skills = this.getCurrentSkills();
    const skill = skills[slotKey];
    if (!skill) return false;

    // Check Cooldown
    if (this.cooldowns[slotKey] > 0) return false;

    // Check MP
    if (this.combatSystem.mp < skill.mpCost) {
      if (this.onManaInsufficient) this.onManaInsufficient();
      return false;
    }

    // Deduct MP & Set Cooldown
    this.combatSystem.mp -= skill.mpCost;
    this.cooldowns[slotKey] = skill.cdMax;

    // Execute skill logic by ID
    this.executeSkill(skill);

    if (this.onSkillCast) {
      this.onSkillCast(skill);
    }
    return true;
  }

  executeSkill(skill) {
    const pPos = this.playerController.position;
    const pRotY = this.playerController.rotationY;
    const forward = new THREE.Vector3(Math.sin(pRotY), 0, Math.cos(pRotY)).normalize();
    const atk = this.combatSystem.attackPower;

    switch (skill.id) {
      // 1. Human Knight Skills
      case 'shield_bash': {
        if (window.soundFX) window.soundFX.playShieldBash();
        this.spawnShieldBashVFX(pPos, forward);
        this.hitConeEnemies(pPos, forward, 3.2, atk * 1.4, true);
        break;
      }
      case 'holy_cleave': {
        if (window.soundFX) window.soundFX.playAttack('slash');
        this.spawnHolyCleaveVFX(pPos);
        this.hitAreaEnemies(pPos, 5.2, atk * 2.5);
        break;
      }

      // 2. Elf Mage Skills
      case 'frost_nova': {
        if (window.soundFX) window.soundFX.playFrostNova();
        this.spawnFrostNovaVFX(pPos);
        this.hitAreaEnemies(pPos, 6.2, atk * 1.6);
        break;
      }
      case 'thunder_strike': {
        if (window.soundFX) window.soundFX.playThunder();
        // Target in front of player
        const strikePos = pPos.clone().addScaledVector(forward, 6.0);
        this.spawnThunderStrikeVFX(strikePos);
        this.hitAreaEnemies(strikePos, 4.5, atk * 3.2);
        break;
      }

      // 3. Dwarf Barbarian Skills
      case 'berserker_warcry': {
        if (window.soundFX) window.soundFX.playWarcry();
        this.buffTimer = 6.0;
        this.combatSystem.attackPower = Math.round(atk * 1.5);
        this.spawnWarcryVFX(pPos);
        break;
      }
      case 'earth_shatter': {
        if (window.soundFX) window.soundFX.playHit(true);
        const shatterPos = pPos.clone().addScaledVector(forward, 2.5);
        this.spawnEarthShatterVFX(shatterPos, forward);
        this.hitAreaEnemies(shatterPos, 4.2, atk * 2.8);
        break;
      }

      // 4. Beastman Rogue Skills
      case 'shadow_dash': {
        if (window.soundFX) window.soundFX.playAttack('spell');
        this.spawnShadowDashVFX(pPos);
        // Teleport player 6 meters forward
        this.playerController.position.addScaledVector(forward, 6.0);
        this.playerController.position.y = this.playerController.getGroundHeight(
          this.playerController.position.x,
          this.playerController.position.z
        );
        break;
      }
      case 'savage_flurry': {
        if (window.soundFX) window.soundFX.playAttack('slash');
        this.spawnSavageFlurryVFX(pPos, forward);
        this.hitConeEnemies(pPos, forward, 3.4, atk * 3.0);
        break;
      }
    }
  }

  hitAreaEnemies(centerPos, radius, damage) {
    this.combatSystem.monsters.forEach(m => {
      if (m.isDead) return;
      if (m.position.distanceTo(centerPos) <= radius) {
        m.takeDamage(damage, true, centerPos);
      }
    });
  }

  hitConeEnemies(pPos, forward, range, damage, stun = false) {
    this.combatSystem.monsters.forEach(m => {
      if (m.isDead) return;
      const toM = m.position.clone().sub(pPos);
      toM.y = 0;
      const dist = toM.length();
      if (dist <= range) {
        toM.normalize();
        if (forward.dot(toM) > 0.2) {
          m.takeDamage(damage, true, pPos);
          if (stun) {
            m.stateTimer = 1.8; // Stun pause
          }
        }
      }
    });
  }

  // --- 3D Visual Effects ---

  spawnShieldBashVFX(pPos, forward) {
    const geo = new THREE.RingGeometry(0.8, 2.2, 16, 1, 0, Math.PI * 0.8);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pPos.x + forward.x * 1.2, pPos.y + 1.0, pPos.z + forward.z * 1.2);
    mesh.rotation.y = this.playerController.rotationY - Math.PI * 0.4;
    this.scene.add(mesh);
    this.activeVFX.push({ mesh, mat, age: 0, lifetime: 0.25 });
  }

  spawnHolyCleaveVFX(pPos) {
    const geo = new THREE.RingGeometry(1.6, 5.0, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pPos.x, pPos.y + 0.85, pPos.z);
    this.scene.add(mesh);
    this.activeVFX.push({ mesh, mat, age: 0, lifetime: 0.35 });
  }

  spawnFrostNovaVFX(pPos) {
    const group = new THREE.Group();
    group.position.set(pPos.x, pPos.y + 0.1, pPos.z);
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.8
    });

    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 6), iceMat);
      spike.position.set(Math.sin(ang) * 3.2, 0.7, Math.cos(ang) * 3.2);
      spike.rotation.set((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3);
      group.add(spike);
    }
    this.scene.add(group);
    this.activeVFX.push({ mesh: group, age: 0, lifetime: 0.65 });
  }

  spawnThunderStrikeVFX(strikePos) {
    const boltGeo = new THREE.CylinderGeometry(0.4, 0.4, 28, 8);
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(strikePos.x, strikePos.y + 14, strikePos.z);
    this.scene.add(bolt);

    const light = new THREE.PointLight(0xa855f7, 2.5, 14);
    light.position.set(strikePos.x, strikePos.y + 2, strikePos.z);
    this.scene.add(light);

    this.activeVFX.push({ mesh: bolt, mat: boltMat, light, age: 0, lifetime: 0.3 });
  }

  spawnWarcryVFX(pPos) {
    const ringGeo = new THREE.RingGeometry(1.2, 1.8, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.position.set(pPos.x, pPos.y + 0.6, pPos.z);
    this.scene.add(mesh);
    this.activeVFX.push({ mesh, mat, age: 0, lifetime: 0.5, expand: true });
  }

  spawnEarthShatterVFX(pos, forward) {
    const fissureMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.5,
      roughness: 0.3
    });
    const fissure = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 3.8), fissureMat);
    fissure.position.set(pos.x, pos.y + 0.05, pos.z);
    fissure.rotation.y = this.playerController.rotationY;
    this.scene.add(fissure);
    this.activeVFX.push({ mesh: fissure, mat: fissureMat, age: 0, lifetime: 0.7 });
  }

  spawnShadowDashVFX(pPos) {
    this.damageSystem.spawnHitSparks(pPos, 0x9333ea);
  }

  spawnSavageFlurryVFX(pPos, forward) {
    for (let i = 0; i < 3; i++) {
      this.damageSystem.spawnHitSparks(
        pPos.clone().addScaledVector(forward, 1.4 + i * 0.4),
        0xef4444
      );
    }
  }

  update(delta) {
    // 1. Tick Cooldowns
    if (this.cooldowns.Q > 0) this.cooldowns.Q = Math.max(0, this.cooldowns.Q - delta);
    if (this.cooldowns.E > 0) this.cooldowns.E = Math.max(0, this.cooldowns.E - delta);

    // 2. Tick Berserker Buff
    if (this.buffTimer > 0) {
      this.buffTimer -= delta;
      if (this.buffTimer <= 0) {
        // Reset base attack power for race
        this.combatSystem.setRace(this.race);
      }
    }

    // 3. Update Active VFX
    for (let i = this.activeVFX.length - 1; i >= 0; i--) {
      const v = this.activeVFX[i];
      v.age += delta;
      if (v.mat) {
        v.mat.opacity = Math.max(0, 1.0 - v.age / v.lifetime);
      }
      if (v.expand) {
        v.mesh.scale.multiplyScalar(1.0 + delta * 3.0);
      }

      if (v.age >= v.lifetime) {
        this.scene.remove(v.mesh);
        if (v.light) this.scene.remove(v.light);
        if (v.mesh.geometry) v.mesh.geometry.dispose();
        if (v.mat) v.mat.dispose();
        this.activeVFX.splice(i, 1);
      }
    }
  }
}

window.SkillSystem = SkillSystem;
