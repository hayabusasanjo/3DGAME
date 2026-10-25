// QuestSystem.js - Official Guild Quest Board & Adventurer Rank Progression System
// Coordinates Quest Postings, Hunt Kill Tracking, Reward Claiming, and Guild Rank Promotions.

class QuestSystem {
  constructor(combatSystem) {
    this.combatSystem = combatSystem;
    this.activeQuest = null;

    this.quests = {
      slime_hunt: {
        id: 'slime_hunt',
        title: 'Slime Hazard',
        rankTag: 'RANK F',
        badge: '🟢 NOVICE',
        desc: 'Subdue 3 Azure Slimes in the Whispering Plains to secure safe passage for Aetherian merchant wagons.',
        targetMonster: 'Azure Slime',
        targetCount: 3,
        currentCount: 0,
        expReward: 65,
        goldReward: 40,
        potionReward: 2,
        status: 'AVAILABLE' // 'AVAILABLE', 'ACTIVE', 'READY_TO_CLAIM', 'COMPLETED'
      },
      rabbit_hunt: {
        id: 'rabbit_hunt',
        title: 'Beast Horn Gatherer',
        rankTag: 'RANK F',
        badge: '🐇 HUNT',
        desc: 'Hunt 2 agile Horned Rabbits in the deep fields of Whispering Plains to supply mana materials to the Apothecary.',
        targetMonster: 'Horned Rabbit',
        targetCount: 2,
        currentCount: 0,
        expReward: 95,
        goldReward: 60,
        potionReward: 2,
        status: 'AVAILABLE'
      },
      king_slime: {
        id: 'king_slime',
        title: '👑 URGENT: The Crowned Menace',
        rankTag: 'RANK PROMOTION',
        badge: '🔥 FIELD BOSS',
        desc: 'A colossal King Slime has claimed the South-West Slime Mire! Vanquish the tyrant in the sunken ruins to earn official Guild Promotion to RANK E (Bronze Plate)!',
        targetMonster: 'King Slime',
        targetCount: 1,
        currentCount: 0,
        expReward: 250,
        goldReward: 150,
        potionReward: 3,
        status: 'AVAILABLE'
      },
      goblin_ridge: {
        id: 'goblin_ridge',
        title: '⛺ Goblin Ridge Threat',
        rankTag: 'RANK E',
        badge: '🪓 OUTPOST',
        desc: 'KayKit Goblin Scouts have set up a warband camp on the North-East Ridge! Defeat 2 Goblin Scouts to safeguard the eastern borders.',
        targetMonster: 'Goblin',
        targetCount: 2,
        currentCount: 0,
        expReward: 160,
        goldReward: 95,
        potionReward: 2,
        status: 'AVAILABLE'
      },
      spider_purge: {
        id: 'spider_purge',
        title: '🕷️ Crystal Infestation',
        rankTag: 'RANK E',
        badge: '🕳️ DUNGEON',
        desc: 'Purge 2 venomous Crystal Spiders stalking the tunnels of the Mystic Crystal Caverns to secure mineral transport routes.',
        targetMonster: 'Crystal Spider',
        targetCount: 2,
        currentCount: 0,
        expReward: 140,
        goldReward: 85,
        potionReward: 2,
        status: 'AVAILABLE'
      },
      golem_conquest: {
        id: 'golem_conquest',
        title: '👑 DUNGEON FINALE: Terror of the Sanctum',
        rankTag: 'RANK PROMOTION',
        badge: '💀 DUNGEON BOSS',
        desc: 'The ancient guardian of the deep mines has awakened! Slay the Level 8 Ancient Crystal Golem to earn promotion to RANK D (Silver Plate)!',
        targetMonster: 'ANCIENT CRYSTAL GOLEM',
        targetCount: 1,
        currentCount: 0,
        expReward: 380,
        goldReward: 220,
        potionReward: 4,
        status: 'AVAILABLE'
      }
    };
  }

  acceptQuest(questId) {
    const q = this.quests[questId];
    if (!q || q.status === 'COMPLETED') return false;

    // Set as active
    this.activeQuest = q;
    q.status = 'ACTIVE';

    if (window.soundFX) window.soundFX.playLoot();

    if (this.onQuestAccepted) {
      this.onQuestAccepted(q);
    }
    return true;
  }

  onMonsterKilled(monster) {
    if (!this.activeQuest || this.activeQuest.status !== 'ACTIVE') return;

    const q = this.activeQuest;
    let match = false;

    if (monster.name.includes(q.targetMonster) || (q.targetMonster === 'Azure Slime' && monster.name.includes('Slime'))) {
      match = true;
    }

    if (match) {
      q.currentCount = Math.min(q.targetCount, q.currentCount + 1);

      if (q.currentCount >= q.targetCount) {
        q.status = 'READY_TO_CLAIM';
        if (window.soundFX) window.soundFX.playLevelUp();
        if (this.onQuestCompleted) {
          this.onQuestCompleted(q);
        }
      } else {
        if (window.soundFX) window.soundFX.playLoot();
      }

      if (this.onQuestUpdated) {
        this.onQuestUpdated(q);
      }
    }
  }

  claimReward(questId) {
    const q = this.quests[questId];
    if (!q || q.status !== 'READY_TO_CLAIM') return null;

    q.status = 'COMPLETED';
    this.activeQuest = null;

    // Award Rewards
    this.combatSystem.addExp(q.expReward);
    this.combatSystem.gold += q.goldReward;
    this.combatSystem.potions = (this.combatSystem.potions || 0) + q.potionReward;

    const isRankE = q.id === 'king_slime';
    const isRankD = q.id === 'golem_conquest';
    const rankTier = isRankD ? 'RANK_D' : (isRankE ? 'RANK_E' : null);

    if (window.soundFX) {
      window.soundFX.playLevelUp();
    }

    if (this.onQuestClaimed) {
      this.onQuestClaimed(q, rankTier);
    }

    return { quest: q, rankTier };
  }
}

window.QuestSystem = QuestSystem;
