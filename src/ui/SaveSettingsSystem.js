// SaveSettingsSystem.js - LocalStorage Auto-Save & Settings Modal Engine (Phase 9)
// Provides continuous auto-saving (Level, Gold, Gear, Quests, Rank),
// instant load restoration on refresh, and an ESC Settings Control Menu.

class SaveSettingsSystem {
  constructor(combatSystem, inventorySystem, questSystem, environmentSystem) {
    this.combatSystem = combatSystem;
    this.inventorySystem = inventorySystem;
    this.questSystem = questSystem;
    this.environmentSystem = environmentSystem;

    this.saveKey = 'isekai_chronicles_rpg_save_v1';
    this.autoSaveInterval = 15; // 15 seconds
    this.timer = 0;

    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        const modal = document.getElementById('settings-modal');
        if (modal) {
          modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        }
      }
    });
  }

  saveGame() {
    if (!this.combatSystem) return;

    const data = {
      timestamp: Date.now(),
      combat: {
        level: this.combatSystem.level,
        exp: this.combatSystem.exp,
        expNext: this.combatSystem.expNext,
        hp: this.combatSystem.hp,
        mp: this.combatSystem.mp,
        gold: this.combatSystem.gold,
        potions: this.combatSystem.potions,
        attackPower: this.combatSystem.attackPower,
        weaponTier: this.combatSystem.weaponTier,
        inventory: this.combatSystem.inventory
      },
      inventory: this.inventorySystem ? {
        equipped: this.inventorySystem.equipped,
        bag: this.inventorySystem.bag
      } : null,
      quest: this.questSystem ? {
        activeQuestId: this.questSystem.activeQuest ? this.questSystem.activeQuest.id : null,
        quests: this.questSystem.quests
      } : null,
      rank: window.gameHUD ? window.gameHUD.playerRank : 'RANK F'
    };

    try {
      localStorage.setItem(this.saveKey, JSON.stringify(data));
      if (window.gameHUD) {
        window.gameHUD.showSimpleToast('💾 Game Progress Saved');
      }
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return false;

      const data = JSON.parse(raw);
      if (!data || !data.combat) return false;

      // Restore Combat Stats
      this.combatSystem.level = data.combat.level || 1;
      this.combatSystem.exp = data.combat.exp || 0;
      this.combatSystem.expNext = data.combat.expNext || 100;
      this.combatSystem.hp = data.combat.hp || 100;
      this.combatSystem.mp = data.combat.mp || 50;
      this.combatSystem.gold = data.combat.gold || 0;
      this.combatSystem.potions = data.combat.potions !== undefined ? data.combat.potions : 2;
      this.combatSystem.attackPower = data.combat.attackPower || 26;
      this.combatSystem.inventory = data.combat.inventory || {};

      // Restore Weapon Tier & Aura
      if (data.combat.weaponTier >= 2) {
        this.combatSystem.weaponTier = data.combat.weaponTier;
        const color = data.combat.weaponTier === 3 ? 0xf59e0b : 0x38bdf8;
        this.combatSystem.attachWeaponAura(color);
      }

      // Restore Inventory Equipment
      if (this.inventorySystem && data.inventory) {
        if (data.inventory.bag) this.inventorySystem.bag = data.inventory.bag;
        if (data.inventory.equipped) {
          for (let slot of ['head', 'chest', 'cape', 'ring']) {
            const item = data.inventory.equipped[slot];
            if (item) {
              this.inventorySystem.equipped[slot] = item;
              this.inventorySystem.attach3DVisual(slot, item);
            }
          }
          this.inventorySystem.applyStats();
        }
      }

      // Restore Quests & Rank
      if (this.questSystem && data.quest) {
        if (data.quest.quests) this.questSystem.quests = data.quest.quests;
        if (data.quest.activeQuestId && this.questSystem.quests[data.quest.activeQuestId]) {
          this.questSystem.activeQuest = this.questSystem.quests[data.quest.activeQuestId];
        }
      }

      if (window.gameHUD && data.rank) {
        window.gameHUD.playerRank = data.rank;
        const rankTag = document.getElementById('hud-rank-tag');
        if (rankTag) rankTag.innerText = data.rank;
      }

      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  }

  wipeSave() {
    localStorage.removeItem(this.saveKey);
    window.location.reload();
  }

  update(delta) {
    this.timer += delta;
    if (this.timer >= this.autoSaveInterval) {
      this.timer = 0;
      this.saveGame();
    }
  }
}

window.SaveSettingsSystem = SaveSettingsSystem;
