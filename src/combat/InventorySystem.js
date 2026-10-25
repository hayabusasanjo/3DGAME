// InventorySystem.js - Professional RPG Grid Inventory & 3D Visual Equipment Engine (Phase 5)
// Manages Grid Slots, Equippable Gear (Head, Chest, Cape, Ring), Live Stat Buffs,
// and 3D Visual Equipment Mesh Attachments onto the Hero.

class InventorySystem {
  constructor(playerController, combatSystem) {
    this.playerController = playerController;
    this.combatSystem = combatSystem;

    // Equipped Gear
    this.equipped = {
      head: null,
      chest: null,
      cape: null,
      ring: null
    };

    // 3D Visual Mesh Containers attached to character
    this.visualMeshes = {
      head: null,
      chest: null,
      cape: null,
      ring: null
    };

    // 16 Grid Bag Items
    this.bag = [
      {
        id: 'iron_chestplate',
        name: 'Iron Knight Pauldrons',
        slot: 'chest',
        icon: '🛡️',
        rarity: 'rare',
        stats: { def: 14, hp: 45 },
        desc: 'Forged high-carbon steel pauldrons (+14 DEF, +45 Max HP).'
      },
      {
        id: 'crimson_cloak',
        name: 'Royal Crimson Cape',
        slot: 'cape',
        icon: '🧣',
        rarity: 'rare',
        stats: { def: 6, mp: 25 },
        desc: 'Velvet cape worn by Aetherian champions (+6 DEF, +25 Max MP).'
      },
      {
        id: 'silver_helm',
        name: 'Silver Wing Circlet',
        slot: 'head',
        icon: '👑',
        rarity: 'epic',
        stats: { atk: 8, def: 8 },
        desc: 'Blessed mithril headpiece (+8 ATK, +8 DEF).'
      },
      {
        id: 'azure_ring',
        name: 'Azure Mana Ring',
        slot: 'ring',
        icon: '💍',
        rarity: 'epic',
        stats: { atk: 12, mp: 30 },
        desc: 'Infused with raw mana crystal (+12 ATK, +30 Max MP).'
      },
      // Initial Starter Rations & Foods
      {
        id: 'roast_meat',
        name: 'Roast Boar Meat',
        type: 'food',
        icon: '🍖',
        rarity: 'common',
        healHp: 60,
        healMp: 0,
        desc: 'Savory flame-roasted boar ribs. Restores 60 HP when eaten.'
      },
      {
        id: 'fresh_bread',
        name: 'Aetherian Baguette',
        type: 'food',
        icon: '🥖',
        rarity: 'common',
        healHp: 35,
        healMp: 0,
        desc: 'Crisp golden loaf baked in the town bakery. Restores 35 HP.'
      },
      {
        id: 'dwarf_ale',
        name: 'Dwarven Golden Ale',
        type: 'food',
        icon: '🍺',
        rarity: 'common',
        healHp: 25,
        healMp: 30,
        desc: 'Hearty frothy ale from the Prancing Gryphon. Restores 25 HP & 30 MP.'
      }
    ];

    this.initVisualMaterials();
  }

  initVisualMaterials() {
    this.steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25
    });

    this.crimsonClothMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Royal Red
      roughness: 0.85
    });

    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.8,
      roughness: 0.2
    });

    this.crystalRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.5
    });
  }

  equipItem(item) {
    if (!item || !item.slot) return false;
    const slot = item.slot;

    // Unequip current if any
    if (this.equipped[slot]) {
      this.unequipItem(slot);
    }

    // Move from bag to slot
    const idx = this.bag.indexOf(item);
    if (idx > -1) {
      this.bag.splice(idx, 1);
    }

    this.equipped[slot] = item;
    this.applyStats();
    this.attach3DVisual(slot, item);

    if (window.soundFX) window.soundFX.playEquipItem();
    if (window.gameHUD) {
      window.gameHUD.showSimpleToast(`⚔️ Equipped ${item.name}!`);
      window.gameHUD.updateInventoryUI();
    }
    return true;
  }

  unequipItem(slot) {
    const item = this.equipped[slot];
    if (!item) return;

    this.equipped[slot] = null;
    this.bag.push(item);
    this.detach3DVisual(slot);
    this.applyStats();

    if (window.soundFX) window.soundFX.playEquipItem();
    if (window.gameHUD) {
      window.gameHUD.showSimpleToast(`Unequipped ${item.name}`);
      window.gameHUD.updateInventoryUI();
    }
  }

  applyStats() {
    let bonusDef = 0;
    let bonusAtk = 0;
    let bonusHp = 0;
    let bonusMp = 0;

    Object.values(this.equipped).forEach(item => {
      if (item && item.stats) {
        if (item.stats.def) bonusDef += item.stats.def;
        if (item.stats.atk) bonusAtk += item.stats.atk;
        if (item.stats.hp) bonusHp += item.stats.hp;
        if (item.stats.mp) bonusMp += item.stats.mp;
      }
    });

    this.totalBonusDef = bonusDef;
    this.totalBonusAtk = bonusAtk;
    this.totalBonusHp = bonusHp;
    this.totalBonusMp = bonusMp;

    // Apply to combat system stats
    if (this.combatSystem) {
      this.combatSystem.defensePower = 5 + bonusDef;
      this.combatSystem.bonusEquipmentAtk = bonusAtk;
    }
  }

  useItem(item) {
    if (!item) return false;

    // 1. Food & Beverage Consumption
    if (item.type === 'food') {
      const idx = this.bag.indexOf(item);
      if (idx > -1) {
        this.bag.splice(idx, 1);
      }

      const pPos = this.playerController.position.clone().add(new THREE.Vector3(0, 1.4, 0));

      if (item.healHp && this.combatSystem) {
        this.combatSystem.hp = Math.min(this.combatSystem.maxHp, this.combatSystem.hp + item.healHp);
        if (this.playerController.damageSystem) {
          this.playerController.damageSystem.spawnNumber(pPos, item.healHp, 'heal');
          this.playerController.damageSystem.spawnHitSparks(this.playerController.position, 0x10b981);
        }
      }

      if (item.healMp && this.combatSystem) {
        this.combatSystem.mp = Math.min(this.combatSystem.maxMp, this.combatSystem.mp + item.healMp);
      }

      if (window.soundFX) {
        window.soundFX.playEat();
      }

      if (window.gameHUD) {
        window.gameHUD.showSimpleToast(`😋 Consumed ${item.icon} ${item.name}!`);
        window.gameHUD.updateInventoryUI();
      }
      return true;
    }

    // 2. Equippable Gear
    if (item.slot) {
      return this.equipItem(item);
    }

    return false;
  }

  attach3DVisual(slot, item) {
    const root = this.playerController.characterLoader.characterGroup;
    if (!root) return;

    this.detach3DVisual(slot);

    const visualGroup = new THREE.Group();
    visualGroup.name = `Equipment_${slot}`;

    if (slot === 'chest') {
      // Sleek Curving Knight Shoulder Pauldrons
      for (let px of [-0.34, 0.34]) {
        const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), this.steelMat);
        pauldron.scale.set(1.0, 0.65, 1.25);
        pauldron.position.set(px, 1.34, 0);
        visualGroup.add(pauldron);

        const goldTrim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 12), this.goldTrimMat);
        goldTrim.position.set(px, 1.32, 0);
        goldTrim.rotation.x = Math.PI / 2;
        visualGroup.add(goldTrim);
      }

      // Small Golden Lion Crest Clasp
      const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), this.goldTrimMat);
      clasp.position.set(0, 1.25, 0.2);
      visualGroup.add(clasp);
    } else if (slot === 'cape') {
      // Flowing Crimson Velvet Cape behind shoulders
      const capeGeo = new THREE.PlaneGeometry(0.58, 1.15);
      const cape = new THREE.Mesh(capeGeo, this.crimsonClothMat);
      cape.position.set(0, 0.82, -0.22);
      cape.rotation.x = 0.16;
      cape.castShadow = true;
      visualGroup.add(cape);

      // Gold Cape Clasps on left & right shoulders
      for (let cx of [-0.22, 0.22]) {
        const pin = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), this.goldTrimMat);
        pin.position.set(cx, 1.38, -0.18);
        visualGroup.add(pin);
      }
    } else if (slot === 'head') {
      // Delicate Winged Mithril Tiara (Fits cleanly without clipping hats)
      const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 6, 16), this.steelMat);
      circlet.rotation.x = Math.PI / 2;
      circlet.position.set(0, 1.68, 0.02);
      visualGroup.add(circlet);

      // Center Sapphire Jewel
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), this.crystalRingMat);
      gem.position.set(0, 1.70, 0.21);
      visualGroup.add(gem);
    } else if (slot === 'ring') {
      // Subtle Mana Gem Ring fitted to the Right Hand
      const ringAura = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 10), this.crystalRingMat);
      ringAura.position.set(0.36, 0.82, 0.1);
      ringAura.rotation.y = Math.PI / 2;
      visualGroup.add(ringAura);

      const gemGlow = new THREE.PointLight(0x38bdf8, 0.4, 1.5);
      gemGlow.position.set(0.36, 0.82, 0.1);
      visualGroup.add(gemGlow);
    }

    root.add(visualGroup);
    this.visualMeshes[slot] = visualGroup;
  }

  detach3DVisual(slot) {
    const root = this.playerController.characterLoader.characterGroup;
    if (root && this.visualMeshes[slot]) {
      root.remove(this.visualMeshes[slot]);
      this.visualMeshes[slot] = null;
    }
  }
}

window.InventorySystem = InventorySystem;
