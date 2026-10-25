// HUD.js - Professional Anime RPG HUD for Phase 3: Guild Interior, Quests & Bosses
// Features Walk-in Guild Location, Interactive Quest Board, Boss Health Bar,
// Potion Hotbar, Real-time Quest Tracker, and Rank E Promotion Ceremony.

class GameHUD {
  constructor(playerController, town, combatSystem, questSystem, skillSystem, inventorySystem, mountSystem, waystoneSystem, environmentSystem) {
    this.playerController = playerController;
    this.town = town;
    this.combatSystem = combatSystem;
    this.questSystem = questSystem;
    this.skillSystem = skillSystem || null;
    this.inventorySystem = inventorySystem || null;
    this.mountSystem = mountSystem || null;
    this.waystoneSystem = waystoneSystem || null;
    this.environmentSystem = environmentSystem || null;

    this.isNearNpc = false;
    this.isNearBoard = false;
    this.isNearBlacksmith = false;
    this.isNearGuard = false;
    this.isNearAlchemist = false;
    this.isNearBarkeep = false;
    this.isNearVillagerArthur = false;
    this.isNearVillagerTom = false;
    this.isNearWaystone = null;

    this.currentZone = 'town'; // 'town', 'guild', 'plains', or 'dungeon'
    this.playerRank = 'RANK F';

    this.createDom();
    this.bindEvents();
    this.hookCombatAndQuest();
  }

  setInventorySystem(inv) { this.inventorySystem = inv; }
  setMountSystem(mount) { this.mountSystem = mount; }
  setWaystoneSystem(way) { this.waystoneSystem = way; }
  setEnvironmentSystem(env) { this.environmentSystem = env; }

  setSkillSystem(skillSystem) {
    this.skillSystem = skillSystem;
    if (this.race) {
      this.updateSkillSlots();
    }
  }

  createDom() {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.innerHTML = `
      <style>
        #game-hud {
          position: absolute;
          inset: 0;
          pointer-events: none;
          color: white;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          z-index: 50;
        }

        /* Fullscreen Red Damage Vignette */
        #damage-vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0) 50%, rgba(239, 68, 68, 0.65) 100%);
          opacity: 0;
          transition: opacity 0.15s ease-out;
          z-index: 70;
        }

        /* Action Combat Crosshair / Reticle */
        #rpg-crosshair {
          position: fixed;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 65;
          display: none;
          transition: transform 0.12s ease-out;
        }
        #rpg-crosshair.locked {
          display: block;
        }
        #rpg-crosshair::before {
          content: '';
          position: absolute;
          inset: 0;
          border: 2px solid rgba(56, 189, 248, 0.75);
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
          transition: all 0.15s ease;
        }
        #rpg-crosshair::after {
          content: '';
          position: absolute;
          top: 8px;
          left: 8px;
          width: 4px;
          height: 4px;
          background: #38bdf8;
          border-radius: 50%;
          box-shadow: 0 0 6px #38bdf8;
        }
        #rpg-crosshair.attacking::before {
          border-color: #f43f5e;
          box-shadow: 0 0 16px rgba(244, 63, 94, 0.9);
          transform: scale(1.4);
        }

        /* Top Left: Player Status & Stats */
        .hud-player-card {
          position: absolute;
          top: 20px;
          left: 24px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 12px 18px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
          width: auto;
        }
        .hud-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid #38bdf8;
          background: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
        }
        .hud-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .hud-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hud-name {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .hud-level-tag {
          background: #2563eb;
          color: white;
          font-size: 11px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .hud-rank-tag {
          background: #d97706;
          color: white;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 6px;
          transition: all 0.3s;
        }
        .hud-gold-tag {
          color: #fbbf24;
          font-size: 11px;
          font-weight: 800;
          margin-left: 4px;
        }

        /* Health & Resource Bars */
        .hud-bar-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
        }
        .hud-bar-track {
          width: 140px;
          height: 8px;
          background: rgba(30, 41, 59, 0.9);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hud-bar-fill {
          height: 100%;
          transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hud-hp-fill {
          background: linear-gradient(90deg, #ef4444, #f87171);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }
        .hud-mp-fill {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
        }
        .hud-exp-fill {
          background: linear-gradient(90deg, #10b981, #34d399);
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        /* Top Right: Location Pill */
        .hud-location-pill {
          position: absolute;
          top: 150px;
          right: 20px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 8px 16px;
          border-radius: 14px;
          text-align: right;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          width: auto;
          pointer-events: auto;
          transition: border-color 0.4s;
        }
        .hud-location-title {
          font-size: 12px;
          font-weight: 800;
          color: #38bdf8;
          letter-spacing: 0.5px;
        }
        .hud-location-sub {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 1px;
        }

        /* Active Quest Tracker Pill (Right side below location) */
        #quest-tracker-pill {
          position: absolute;
          top: 214px;
          right: 20px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(14px);
          border: 1px solid #fbbf24;
          border-radius: 16px;
          padding: 10px 16px;
          width: 250px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
          transition: all 0.3s;
        }
        #quest-tracker-pill.ready-claim {
          border-color: #34d399;
          box-shadow: 0 0 25px rgba(52, 211, 153, 0.5);
          animation: questPulse 1.8s infinite;
        }
        @keyframes questPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .tracker-header {
          font-size: 11px;
          font-weight: 900;
          color: #fbbf24;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .tracker-title {
          font-size: 13px;
          font-weight: 800;
          color: #f1f5f9;
        }
        .tracker-progress {
          font-size: 12px;
          font-weight: 700;
          color: #38bdf8;
          margin-top: 4px;
        }

        /* Top Center: Field Boss Health Bar (King Slime) */
        #boss-hud {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 480px;
          max-width: 90%;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(16px);
          border: 2px solid #ef4444;
          border-radius: 18px;
          padding: 12px 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.4);
          display: none;
          flex-direction: column;
          gap: 6px;
          z-index: 65;
          pointer-events: none;
        }
        .boss-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .boss-name {
          font-size: 15px;
          font-weight: 900;
          color: #fca5a5;
          letter-spacing: 1px;
        }
        .boss-tag {
          font-size: 10px;
          font-weight: 900;
          background: #dc2626;
          color: white;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .boss-hp-track {
          width: 100%;
          height: 12px;
          background: #1e293b;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .boss-hp-fill {
          height: 100%;
          background: linear-gradient(90deg, #dc2626, #f87171);
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
          transition: width 0.15s ease-out;
        }

        /* Center Zone Announcement Banner */
        #zone-banner {
          position: fixed;
          top: 22%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.9);
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(16px);
          border-top: 2px solid #38bdf8;
          border-bottom: 2px solid #38bdf8;
          padding: 18px 48px;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(56, 189, 248, 0.4);
          z-index: 90;
        }
        #zone-banner.active {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .zone-banner-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 3px;
          color: #e0f2fe;
          text-shadow: 0 0 14px rgba(56, 189, 248, 0.8);
        }
        .zone-banner-sub {
          font-size: 13px;
          color: #94a3b8;
          letter-spacing: 2px;
          margin-top: 4px;
          text-transform: uppercase;
        }

        /* Level Up & Rank Promotion Banner */
        #levelup-banner {
          position: fixed;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
          border: 3px solid #fbbf24;
          border-radius: 24px;
          padding: 26px 52px;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 50px rgba(251, 191, 36, 0.5);
          z-index: 95;
        }
        #levelup-banner.active {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .levelup-title {
          font-size: 32px;
          font-weight: 900;
          color: #fbbf24;
          letter-spacing: 3px;
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
        }
        .levelup-sub {
          font-size: 15px;
          font-weight: 700;
          color: #e2e8f0;
          margin-top: 8px;
        }

        /* Loot Toast Notification Stack */
        #toast-layer {
          position: fixed;
          bottom: 80px;
          right: 28px;
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          pointer-events: none;
          z-index: 85;
        }
        .loot-toast {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid #fbbf24;
          border-radius: 14px;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 800;
          color: #fef08a;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
          animation: toastSlideIn 0.35s ease-out;
        }
        @keyframes toastSlideIn {
          from { transform: translateX(80px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* Proximity Prompts */
        .hud-interact-prompt {
          position: absolute;
          top: 60%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(14px);
          border: 2px solid #38bdf8;
          padding: 12px 24px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 800;
          color: #e0f2fe;
          display: none;
          align-items: center;
          gap: 10px;
          box-shadow: 0 0 30px rgba(56, 189, 248, 0.5);
        }
        .hud-key-tag {
          background: #0284c7;
          color: white;
          padding: 4px 10px;
          border-radius: 8px;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
        }

        /* Bottom Controls Bar & Potion Hotbar */
        .hud-bottom-bar {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 96vw;
          gap: 6px;
          pointer-events: auto;
          z-index: 55;
        }
        .hud-slot {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          user-select: none;
        }
        .potion-slot {
          border-color: #10b981;
          color: #a7f3d0;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .potion-slot:hover {
          transform: scale(1.05);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
        }

        /* Guild Dialogue Box */
        #dialog-box {
          position: absolute;
          bottom: 35px;
          left: 50%;
          transform: translateX(-50%);
          width: 580px;
          max-width: 90%;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 2px solid #38bdf8;
          border-radius: 24px;
          padding: 24px 28px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.3);
          pointer-events: auto;
          display: none;
          flex-direction: column;
          gap: 14px;
          z-index: 60;
        }
        .dialog-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .npc-name {
          font-size: 17px;
          font-weight: 900;
          color: #38bdf8;
        }
        .npc-badge {
          font-size: 10px;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .dialog-content {
          font-size: 14px;
          line-height: 1.6;
          color: #e2e8f0;
        }
        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .btn-claim {
          background: linear-gradient(135deg, #0284c7, #6366f1);
          color: white;
          border: none;
          padding: 10px 22px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-claim:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.6);
        }

        /* Quest Notice Board Modal */
        #quest-board-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 9, 20, 0.88);
          backdrop-filter: blur(20px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100;
          pointer-events: auto;
        }
        .board-container {
          width: 820px;
          max-width: 92%;
          background: #451a03;
          border: 4px solid #b45309;
          border-radius: 24px;
          padding: 28px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(180, 83, 9, 0.5);
        }
        .board-header {
          text-align: center;
          margin-bottom: 22px;
        }
        .board-header h2 {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #fef08a;
        }
        .board-header p {
          font-size: 12px;
          color: #d97706;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 4px;
        }
        .quest-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .quest-card {
          background: #fef3c7;
          color: #1e293b;
          border: 2px solid #d97706;
          border-radius: 14px;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          position: relative;
        }
        .quest-card.boss-card {
          border-color: #ef4444;
          background: #fff1f2;
        }
        .quest-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .quest-card-title {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
        }
        .quest-card-badge {
          font-size: 9px;
          font-weight: 900;
          background: #d97706;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .boss-card .quest-card-badge {
          background: #dc2626;
        }
        .quest-card-desc {
          font-size: 11px;
          line-height: 1.5;
          color: #475569;
          margin-bottom: 12px;
        }
        .quest-card-reward {
          font-size: 11px;
          font-weight: 800;
          color: #059669;
          margin-bottom: 14px;
          padding-top: 6px;
          border-top: 1px dashed #cbd5e1;
        }
        .btn-accept-quest {
          background: #0284c7;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .btn-accept-quest:hover {
          transform: scale(1.04);
          background: #0369a1;
        }

        /* Adventurer Card Modal */
        #card-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 9, 20, 0.88);
          backdrop-filter: blur(20px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100;
          pointer-events: auto;
          cursor: pointer;
        }
        .card-plate {
          width: 380px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border: 3px solid #d97706; /* Copper Rank F or Bronze Rank E */
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(217, 119, 6, 0.4);
          text-align: center;
          transition: border-color 0.4s;
        }
        .card-plate.rank-e {
          border-color: #cd7f32; /* Bronze */
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(205, 127, 50, 0.5);
        }
        .card-plate h2 {
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #fbbf24;
          margin-bottom: 4px;
        }
        .card-plate p {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 18px;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
          font-weight: 700;
        }
        .card-val {
          color: #38bdf8;
        }

        /* Active Combat Skill Slots */
        .skill-slot {
          border-color: #38bdf8;
          color: #e0f2fe;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s, border-color 0.2s, opacity 0.2s;
        }
        .skill-slot:hover {
          transform: scale(1.05);
          border-color: #60a5fa;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.4);
        }
        .skill-mp-tag {
          font-size: 10px;
          color: #60a5fa;
          font-weight: 800;
          background: rgba(59, 130, 246, 0.25);
          padding: 2px 6px;
          border-radius: 6px;
          margin-left: 2px;
        }
        .skill-cooldown-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.82);
          pointer-events: none;
          height: 0%;
          bottom: 0;
          top: auto;
          transition: height 0.08s linear;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          color: #f87171;
        }

        /* Master Blacksmith Borin Forge Modal */
        #blacksmith-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 9, 20, 0.88);
          backdrop-filter: blur(20px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100;
          pointer-events: auto;
        }
        .blacksmith-container {
          width: 780px;
          max-width: 92%;
          background: linear-gradient(145deg, #1e1b2e, #0f172a);
          border: 3px solid #f97316;
          border-radius: 24px;
          padding: 28px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(249, 115, 22, 0.4);
        }
        .blacksmith-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .blacksmith-header h2 {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #fdba74;
        }
        .blacksmith-header p {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 4px;
        }
        .forge-info-box {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .forge-upgrade-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .forge-card {
          background: rgba(30, 41, 59, 0.85);
          border: 2px solid #ea580c;
          border-radius: 16px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }
        .forge-card.completed {
          border-color: #10b981;
          background: rgba(6, 78, 59, 0.35);
        }
        .forge-card-title {
          font-size: 15px;
          font-weight: 900;
          color: #ffedd5;
        }
        .forge-card-desc {
          font-size: 12px;
          color: #cbd5e1;
          line-height: 1.5;
        }
        .forge-reqs {
          font-size: 12px;
          font-weight: 800;
          color: #fbbf24;
          background: rgba(0, 0, 0, 0.3);
          padding: 8px 12px;
          border-radius: 8px;
        }
        .btn-forge {
          background: linear-gradient(135deg, #ea580c, #f97316);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .btn-forge:hover {
          transform: scale(1.04);
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.6);
        }
        .btn-forge:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Top-Right Circular Minimap Radar */
        #minimap-container {
          position: absolute;
          top: 16px;
          right: 20px;
          width: 124px;
          height: 124px;
          border-radius: 50%;
          border: 2px solid #38bdf8;
          background: rgba(9, 13, 22, 0.94);
          box-shadow: 0 0 24px rgba(56, 189, 248, 0.45);
          pointer-events: auto;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 55;
        }
        #minimap-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        #time-pill {
          position: absolute;
          bottom: 4px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 9px;
          font-weight: 800;
          color: #fbbf24;
          padding: 1px 6px;
          border-radius: 8px;
          pointer-events: none;
        }

        /* RPG Grid Inventory Modal */
        #inventory-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 9, 20, 0.88);
          backdrop-filter: blur(20px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100;
          pointer-events: auto;
        }
        .inv-container {
          width: 820px;
          max-width: 94%;
          background: linear-gradient(145deg, #0f172a, #1e293b);
          border: 3px solid #38bdf8;
          border-radius: 24px;
          padding: 26px 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.4);
        }
        .inv-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          margin-top: 16px;
        }
        .inv-gear-panel {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .gear-slot {
          background: rgba(30, 41, 59, 0.85);
          border: 2px dashed #64748b;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .gear-slot.equipped {
          border-style: solid;
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.15);
        }
        .gear-slot:hover {
          transform: scale(1.02);
          border-color: #60a5fa;
        }
        .inv-stats-box {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .inv-grid-panel {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 18px;
        }
        .inv-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .inv-cell {
          aspect-ratio: 1;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          padding: 6px;
          text-align: center;
        }
        .inv-cell:hover {
          transform: scale(1.05);
          border-color: #fbbf24;
          background: rgba(251, 191, 36, 0.15);
        }
        .inv-cell.empty {
          opacity: 0.35;
          cursor: default;
        }

        /* Waystone Warp Portal Modal */
        #waystone-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 9, 20, 0.88);
          backdrop-filter: blur(20px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100;
          pointer-events: auto;
        }
        .waystone-box {
          width: 650px;
          max-width: 92%;
          background: linear-gradient(145deg, #091a2e, #0f172a);
          border: 3px solid #38bdf8;
          border-radius: 24px;
          padding: 28px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.4);
        }
        .warp-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 18px;
        }
        .warp-card {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid #38bdf8;
          border-radius: 14px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s;
        }
        .warp-card:hover {
          transform: scale(1.02);
          background: rgba(56, 189, 248, 0.2);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
        }

        /* Settings Modal (ESC) */
        #settings-modal {
          position: fixed;
          inset: 0;
          background: rgba(7, 9, 20, 0.88);
          backdrop-filter: blur(20px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100;
          pointer-events: auto;
        }
        .settings-box {
          width: 580px;
          max-width: 90%;
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 2px solid #cbd5e1;
          border-radius: 24px;
          padding: 28px 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.9);
        }
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
          font-weight: 700;
        }

        /* Mobile Touch Responsive Mode: Ultra-Clean, Fast 60 FPS Layout */
        @media (max-width: 1024px), (pointer: coarse) {
          /* 1. HIDE the PC keyboard hotbar completely on mobile! */
          .hud-bottom-bar {
            display: none !important;
          }

          /* 2. Remove laggy backdrop blur on mobile */
          * {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          /* 3. Scale down and tidy player status card */
          .hud-player-card {
            top: 10px !important;
            left: 10px !important;
            padding: 8px 12px !important;
            border-radius: 14px !important;
            transform: scale(0.78);
            transform-origin: top left;
          }

          /* 4. Scale down minimap */
          #minimap-container {
            top: 10px !important;
            right: 10px !important;
            transform: scale(0.72);
            transform-origin: top right;
          }

          /* 5. Tidy location & quest tracker pills so they NEVER collide with action buttons */
          .hud-location-pill {
            top: 110px !important;
            right: 10px !important;
            transform: scale(0.75);
            transform-origin: top right;
          }
          #quest-tracker-pill {
            top: 155px !important;
            right: 10px !important;
            transform: scale(0.72);
            transform-origin: top right;
            max-width: 170px !important;
          }

          /* 6. Hide reticle/crosshair on mobile */
          #rpg-crosshair {
            display: none !important;
          }

          /* 7. Proximity talk prompt on mobile */
          .hud-interact-prompt {
            bottom: 90px !important;
            font-size: 11px !important;
            padding: 6px 14px !important;
          }

          /* 8. Mobile Notification & Banner Optimization - Clean, Sleek & Non-Obtrusive! */
          #zone-banner {
            top: 50px !important;
            padding: 6px 18px !important;
            border-top: 1.5px solid #38bdf8 !important;
            border-bottom: 1.5px solid #38bdf8 !important;
            border-radius: 10px !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7) !important;
            max-width: 85vw !important;
          }
          .zone-banner-title {
            font-size: 13px !important;
            letter-spacing: 1px !important;
          }
          .zone-banner-sub {
            font-size: 9px !important;
            letter-spacing: 1px !important;
            margin-top: 2px !important;
          }

          /* Scale down Level Up banner on mobile */
          #levelup-banner {
            top: 36% !important;
            padding: 14px 26px !important;
            border-width: 2px !important;
            border-radius: 16px !important;
            max-width: 85vw !important;
          }
          .levelup-title {
            font-size: 18px !important;
            letter-spacing: 1.5px !important;
          }
          .levelup-sub {
            font-size: 11px !important;
            margin-top: 4px !important;
          }

          /* Reposition and scale Toast notifications so they NEVER block mobile action buttons */
          #toast-layer {
            top: 60px !important;
            left: 14px !important;
            bottom: auto !important;
            right: auto !important;
            flex-direction: column !important;
            gap: 6px !important;
            max-width: 240px !important;
          }
          .loot-toast {
            font-size: 10px !important;
            padding: 4px 10px !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
          }
        }
      </style>

      <!-- Fullscreen Damage Flash Vignette -->
      <div id="damage-vignette"></div>

      <!-- Top-Left Player Status & Stats -->
      <div class="hud-player-card">
        <div class="hud-avatar" id="hud-avatar-icon">⚔️</div>
        <div class="hud-meta">
          <div class="hud-name-row">
            <span class="hud-name" id="hud-player-name">HERO</span>
            <span class="hud-level-tag" id="hud-level-tag">LV. 1</span>
            <span class="hud-rank-tag" id="hud-rank-tag">RANK F</span>
            <span class="hud-gold-tag" id="hud-gold-tag">🪙 0G</span>
          </div>
          <!-- HP Bar -->
          <div class="hud-bar-row">
            <span style="width: 24px;">HP</span>
            <div class="hud-bar-track">
              <div class="hud-bar-fill hud-hp-fill" id="hud-hp-fill" style="width: 100%;"></div>
            </div>
            <span id="hud-hp-val" style="font-size: 9px; color: #cbd5e1;">100/100</span>
          </div>
          <!-- MP Bar -->
          <div class="hud-bar-row">
            <span style="width: 24px;">MP</span>
            <div class="hud-bar-track">
              <div class="hud-bar-fill hud-mp-fill" id="hud-mp-fill" style="width: 100%;"></div>
            </div>
            <span id="hud-mp-val" style="font-size: 9px; color: #cbd5e1;">50/50</span>
          </div>
          <!-- EXP Bar -->
          <div class="hud-bar-row">
            <span style="width: 24px;">EXP</span>
            <div class="hud-bar-track">
              <div class="hud-bar-fill hud-exp-fill" id="hud-exp-fill" style="width: 0%;"></div>
            </div>
            <span id="hud-exp-val" style="font-size: 9px; color: #cbd5e1;">0/100</span>
          </div>
        </div>
      </div>

      <!-- Top-Right Minimap Radar & Time -->
      <div id="minimap-container">
        <canvas id="minimap-canvas" width="124" height="124"></canvas>
        <div id="time-pill">☀️ 10:00</div>
      </div>

      <!-- Top-Right Dynamic Location -->
      <div class="hud-location-pill" id="hud-location-pill">
        <div class="hud-location-title" id="hud-location-title">🏰 AETHERIA: CAPITAL PLAZA</div>
        <div class="hud-location-sub" id="hud-location-sub">Town Center (Safe Zone)</div>
      </div>

      <!-- Active Quest Tracker (Right Side below location) -->
      <div id="quest-tracker-pill">
        <div class="tracker-header">📜 ACTIVE GUILD QUEST</div>
        <div class="tracker-title" id="tracker-title">No Active Quest</div>
        <div class="tracker-progress" id="tracker-progress">Inspect Notice Board in Guild</div>
      </div>

      <!-- Top-Center Boss Health Bar (King Slime / Ancient Golem) -->
      <div id="boss-hud">
        <div class="boss-header">
          <span class="boss-name" id="boss-title">👑 KING SLIME</span>
          <span class="boss-tag" id="boss-lvl-tag">LVL 5 FIELD BOSS</span>
        </div>
        <div class="boss-hp-track">
          <div class="boss-hp-fill" id="boss-hp-fill" style="width: 100%;"></div>
        </div>
      </div>

      <!-- Center Zone Announcement Banner -->
      <div id="zone-banner">
        <div class="zone-banner-title" id="banner-title">WHISPERING PLAINS</div>
        <div class="zone-banner-sub" id="banner-sub">Danger Level 1-5 • Hunting Field</div>
      </div>

      <!-- Level Up / Rank Promotion Screen Banner -->
      <div id="levelup-banner">
        <div class="levelup-title" id="levelup-title">🎉 LEVEL UP! 🎉</div>
        <div class="levelup-sub" id="levelup-sub">You reached Level 2!</div>
        <div id="levelup-bonus" style="font-size: 13px; color: #4ade80; margin-top: 8px; font-weight: 800;">
          Max HP +25 • Max MP +10 • ATK +6 • Fully Restored!
        </div>
      </div>

      <!-- Action Combat Aim Reticle / Crosshair -->
      <div id="rpg-crosshair"></div>

      <!-- Loot Notifications Toast Stack -->
      <div id="toast-layer"></div>

      <!-- Center Proximity Prompt -->
      <div class="hud-interact-prompt" id="prompt-talk">
        <span class="hud-key-tag">E</span>
        <span id="prompt-text">Talk to James the Guild Master</span>
      </div>

      <!-- Bottom Controls & Potion Hotbar -->
      <div class="hud-bottom-bar">
        <div class="hud-slot"><span class="hud-key-tag">W A S D</span> Move</div>
        <div class="hud-slot"><span class="hud-key-tag">SHIFT</span> Sprint</div>
        <div class="hud-slot"><span class="hud-key-tag">SPACE</span> Jump</div>
        <div class="hud-slot" title="Click or Hold to attack combo"><span class="hud-key-tag">L-CLICK / F / J</span> Attack (Hold)</div>
        <!-- Active Combat Skills [Q] and [E] -->
        <div class="hud-slot skill-slot" id="slot-skill-q" title="Skill 1">
          <span class="hud-key-tag">R-CLICK / Q / K</span> <span id="skill-icon-q">🛡️</span> <span id="skill-name-q">Skill 1</span>
          <span class="skill-mp-tag" id="skill-mp-q">15 MP</span>
          <div class="skill-cooldown-overlay" id="skill-cd-overlay-q"></div>
        </div>
        <div class="hud-slot skill-slot" id="slot-skill-e" title="Skill 2">
          <span class="hud-key-tag">E / L</span> <span id="skill-icon-e">✨</span> <span id="skill-name-e">Skill 2</span>
          <span class="skill-mp-tag" id="skill-mp-e">25 MP</span>
          <div class="skill-cooldown-overlay" id="skill-cd-overlay-e"></div>
        </div>
        <div class="hud-slot potion-slot" id="slot-potion" title="Quick Heal">
          <span class="hud-key-tag">1</span> 🧪 Potion: <span id="potion-count">2</span>
        </div>
        <div class="hud-slot" id="slot-mount" style="cursor: pointer;"><span class="hud-key-tag">T</span> 🐺 Mount</div>
        <div class="hud-slot" id="slot-inventory" style="cursor: pointer;"><span class="hud-key-tag">I</span> 🎒 Bag</div>
        <div class="hud-slot" id="slot-card" style="cursor: pointer;"><span class="hud-key-tag">C</span> Card</div>
        <div class="hud-slot" style="cursor: pointer;" title="Toggle Mouse Cursor Freedom"><span class="hud-key-tag">ALT</span> Cursor</div>
        <div class="hud-slot" id="slot-settings" style="cursor: pointer;"><span class="hud-key-tag">ESC</span> ⚙️</div>
      </div>

      <!-- Guild Master Dialogue Box -->
      <div id="dialog-box">
        <div class="dialog-header">
          <div class="npc-name">James the Guild Master</div>
          <div class="npc-badge">Grand Guildmaster of Aetheria</div>
        </div>
        <div class="dialog-content" id="dialog-text">
          "Welcome to the Grand Adventurer's Guild! I am James, Guild Master of Aetheria. To my right is the official <b>Quest Notice Board</b>. Accept a commission and begin your expedition into the Whispering Plains!"
        </div>
        <div class="dialog-actions" id="dialog-actions">
          <button class="btn-claim" id="btn-open-board">📜 VIEW QUEST BOARD</button>
          <button class="btn-claim" id="btn-claim-card">📋 INSPECT CARD</button>
          <button class="btn-claim" style="background: rgba(255,255,255,0.12);" onclick="document.getElementById('dialog-box').style.display='none'">Close</button>
        </div>
      </div>

      <!-- Official Guild Quest Notice Board Modal -->
      <div id="quest-board-modal">
        <div class="board-container">
          <div class="board-header">
            <h2>📜 ADVENTURER'S GUILD NOTICE BOARD</h2>
            <p>Kingdom of Aetheria • Open Guild Commissions</p>
          </div>
          <div class="quest-grid" id="quest-grid">
            <!-- Rendered dynamically -->
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('quest-board-modal').style.display='none'">Close Notice Board</button>
          </div>
        </div>
      </div>

      <!-- Adventurer Card Modal -->
      <div id="card-modal" onclick="this.style.display='none'">
        <div class="card-plate" id="card-plate-box">
          <h2>ADVENTURER CARD</h2>
          <p>Kingdom of Aetheria Guild Association</p>

          <div class="card-row"><span>Adventurer Name:</span><span class="card-val" id="plate-name">Hero</span></div>
          <div class="card-row"><span>Race:</span><span class="card-val" id="plate-race">Human</span></div>
          <div class="card-row"><span>Guild Rank:</span><span class="card-val" id="plate-rank" style="color: #fbbf24;">RANK F (Copper Plate)</span></div>
          <div class="card-row"><span>Level:</span><span class="card-val" id="plate-lvl">LVL 1</span></div>
          <div class="card-row"><span>Attack Power:</span><span class="card-val" id="plate-atk">26 ATK</span></div>
          <div class="card-row"><span>Current Gold:</span><span class="card-val" id="plate-gold" style="color: #fbbf24;">0 G</span></div>

          <div style="margin-top: 16px; font-size: 11px; color: #94a3b8;">
            ✓ Official Guild Seal • Issued by James the Guild Master<br>
            (Press 'C' or click anywhere to close)
          </div>
        </div>
      </div>

      <!-- Master Blacksmith Borin Forge Modal -->
      <div id="blacksmith-modal">
        <div class="blacksmith-container">
          <div class="blacksmith-header">
            <h2>⚒️ MASTER BLACKSMITH BORIN'S FORGE</h2>
            <p>Kingdom of Aetheria Armory • Weapon Reforging & Aura Infusion</p>
          </div>
          <div class="forge-info-box">
            <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
              "Oy, adventurer! I am <b>Borin</b>, royal master blacksmith of Aetheria. Bring me monster trophies and gold, and I'll temper your weapon with magical elemental auras to slice through any beast in the Whispering Plains or Mystic Caverns!"
            </div>
            <div style="margin-top: 10px; font-weight: 800; color: #fbbf24; font-size: 14px;">
              Current Weapon: <span id="forge-current-weapon" style="color: #38bdf8;">Tier 1 Standard Blade</span>
            </div>
          </div>
          <div class="forge-upgrade-grid">
            <!-- Tier 2 Upgrade Card -->
            <div class="forge-card" id="card-tier-2">
              <div>
                <div class="forge-card-title">✨ Tier 2: Enchanted Weapon</div>
                <div class="forge-card-desc">Infuses blade with glowing cyan elemental aura. Grants +12 permanent Attack Power boost!</div>
              </div>
              <div>
                <div class="forge-reqs" id="forge-req-2">Requirements: 🪙 40 Gold + 🧪 2 Slime Gels</div>
                <button class="btn-forge" id="btn-forge-tier-2" style="width: 100%; margin-top: 10px;">⚒️ REFURBISH (TIER 2)</button>
              </div>
            </div>
            <!-- Tier 3 Upgrade Card -->
            <div class="forge-card" id="card-tier-3">
              <div>
                <div class="forge-card-title">👑 Tier 3: Royal Legendary Weapon</div>
                <div class="forge-card-desc">Tempered with sovereign gold aura. Grants +16 Additional Attack Power (+28 Total ATK)!</div>
              </div>
              <div>
                <div class="forge-reqs" id="forge-req-3">Requirements: 🪙 100 Gold + 👑 1 Crown of the Slime King</div>
                <button class="btn-forge" id="btn-forge-tier-3" style="width: 100%; margin-top: 10px;">🔥 FORGE LEGENDARY (TIER 3)</button>
              </div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 22px;">
            <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('blacksmith-modal').style.display='none'">Close Forge</button>
          </div>
        </div>
      </div>

      <!-- RPG Grid Inventory & Equipment Modal (Phase 5) -->
      <div id="inventory-modal">
        <div class="inv-container">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
            <div>
              <h2 style="font-size: 20px; font-weight: 900; color: #38bdf8; letter-spacing: 1.5px;">🎒 ADVENTURER'S INVENTORY & GEAR</h2>
              <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Equipment Paperdoll & Grid Satchel</p>
            </div>
            <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('inventory-modal').style.display='none'">✕ Close [I]</button>
          </div>

          <div class="inv-layout">
            <!-- Left: Equipped Gear & Live Stats -->
            <div class="inv-gear-panel">
              <div style="font-size: 12px; font-weight: 900; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px;">⚔️ Equipped Armor</div>
              <div class="gear-slot" id="slot-gear-head" onclick="window.gameHUD.onUnequipClick('head')">
                <span>👑 Head:</span> <span id="gear-name-head" style="color: #94a3b8;">Empty</span>
              </div>
              <div class="gear-slot" id="slot-gear-chest" onclick="window.gameHUD.onUnequipClick('chest')">
                <span>🛡️ Armor:</span> <span id="gear-name-chest" style="color: #94a3b8;">Empty</span>
              </div>
              <div class="gear-slot" id="slot-gear-cape" onclick="window.gameHUD.onUnequipClick('cape')">
                <span>🧣 Cape:</span> <span id="gear-name-cape" style="color: #94a3b8;">Empty</span>
              </div>
              <div class="gear-slot" id="slot-gear-ring" onclick="window.gameHUD.onUnequipClick('ring')">
                <span>💍 Ring:</span> <span id="gear-name-ring" style="color: #94a3b8;">Empty</span>
              </div>

              <!-- Live Character Stats Summary -->
              <div style="font-size: 12px; font-weight: 900; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px;">📊 Total Battle Stats</div>
              <div class="inv-stats-box">
                <div style="display: flex; justify-content: space-between;"><span>Total ATK:</span><span id="stat-total-atk" style="color: #38bdf8;">26 ATK</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Total DEF:</span><span id="stat-total-def" style="color: #4ade80;">5 DEF</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Max HP:</span><span id="stat-total-hp" style="color: #f87171;">100 HP</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Max MP:</span><span id="stat-total-mp" style="color: #60a5fa;">50 MP</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Gold Coins:</span><span id="stat-total-gold" style="color: #fbbf24;">0 G</span></div>
              </div>
            </div>

            <!-- Right: 16-Grid Satchel Bag -->
            <div class="inv-grid-panel">
              <div style="font-size: 12px; font-weight: 900; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                🎒 Satchel Items (Click to Equip or Use)
              </div>
              <div class="inv-grid" id="inv-grid-container">
                <!-- Dynamically rendered cells -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ancient Waystone Warp Modal (Phase 6) -->
      <div id="waystone-modal">
        <div class="waystone-box">
          <div style="text-align: center;">
            <h2 style="font-size: 22px; font-weight: 900; color: #38bdf8; letter-spacing: 2px;">🌀 ANCIENT TELEPORT WAYSTONE</h2>
            <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">Choose destination across the realm of Aetheria</p>
          </div>
          <div class="warp-grid" id="warp-list">
            <!-- Rendered dynamically -->
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('waystone-modal').style.display='none'">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Soothing Rest Fade Overlay for Sleeping in Bed -->
      <div id="rest-fade-overlay" style="position: fixed; inset: 0; background: rgba(5, 10, 24, 0.95); opacity: 0; pointer-events: none; transition: opacity 0.8s ease-in-out; z-index: 100; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 14px;">
        <div style="font-size: 54px;">🌙</div>
        <div style="font-size: 26px; font-weight: 900; color: #fef08a; letter-spacing: 2px;">RESTED IN BED...</div>
        <div style="font-size: 14px; color: #94a3b8; font-weight: 600;">100% HP and MP restored! Reinvigorated and ready for battle.</div>
      </div>

      <!-- Tavern & Rations Food Purchasing Menu Modal -->
      <div id="food-menu-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: none; align-items: center; justify-content: center; z-index: 80; pointer-events: auto;">
        <div style="background: rgba(15, 23, 42, 0.96); border: 2px solid #f59e0b; border-radius: 24px; padding: 24px 28px; width: 620px; max-width: 92vw; box-shadow: 0 12px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 32px;">🍖</span>
              <div>
                <h2 style="font-size: 20px; font-weight: 900; color: #fbbf24; margin: 0; letter-spacing: 1px;">WANDERING WOLF TAVERN & RATIONS</h2>
                <p style="font-size: 11px; color: #94a3b8; margin: 3px 0 0; text-transform: uppercase; letter-spacing: 1px;">Hot meals and hearty provisions to restore Health and Mana</p>
              </div>
            </div>
            <button class="btn-claim" style="background: rgba(255,255,255,0.15); padding: 6px 12px; font-size: 13px;" onclick="document.getElementById('food-menu-modal').style.display='none'">✕ Close</button>
          </div>
          <div id="food-items-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 50vh; overflow-y: auto; padding: 4px;">
            <!-- Rendered dynamically -->
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 14px;">
            <div style="font-size: 14px; font-weight: 800; color: #fef08a;">
              Current Gold: <span id="food-menu-gold" style="color: #fbbf24; font-size: 17px;">0</span> G
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
              💡 Once purchased, press <b>[I]</b> to open inventory and click an item to consume it!
            </div>
          </div>
        </div>
      </div>

      <!-- In-Game Settings Modal (ESC) (Phase 9) -->
      <div id="settings-modal">
        <div class="settings-box">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
            <h2 style="font-size: 20px; font-weight: 900; color: #f1f5f9; letter-spacing: 1px;">⚙️ GAME SETTINGS</h2>
            <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('settings-modal').style.display='none'">✕ Close [ESC]</button>
          </div>
          <div style="margin-top: 14px;">
            <div class="setting-row">
              <span>🎵 Background Music (BGM) Volume</span>
              <input type="range" id="bgm-slider" min="0" max="100" value="25" style="width: 160px; cursor: pointer;">
            </div>
            <div class="setting-row">
              <span>🔊 Sound Effects (SFX) Volume</span>
              <input type="range" id="sfx-slider" min="0" max="100" value="70" style="width: 160px; cursor: pointer;">
            </div>
            <div class="setting-row">
              <span>🌅 Time of Day (Manual Override)</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn-claim" style="padding: 6px 10px; font-size: 11px;" onclick="window.gameHUD.setTimePreset(7.0)">Sunrise</button>
                <button class="btn-claim" style="padding: 6px 10px; font-size: 11px;" onclick="window.gameHUD.setTimePreset(12.0)">Noon</button>
                <button class="btn-claim" style="padding: 6px 10px; font-size: 11px;" onclick="window.gameHUD.setTimePreset(18.0)">Sunset</button>
                <button class="btn-claim" style="padding: 6px 10px; font-size: 11px;" onclick="window.gameHUD.setTimePreset(22.0)">Night</button>
              </div>
            </div>
            <div class="setting-row">
              <span>🌧️ Weather State</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn-claim" style="padding: 6px 12px; font-size: 11px;" onclick="window.gameHUD.setWeatherPreset('CLEAR')">☀️ Clear</button>
                <button class="btn-claim" style="padding: 6px 12px; font-size: 11px;" onclick="window.gameHUD.setWeatherPreset('RAIN')">🌧️ Rain</button>
              </div>
            </div>
            <div class="setting-row">
              <span>💾 LocalStorage Auto-Save</span>
              <button class="btn-claim" style="background: #10b981; padding: 6px 14px; font-size: 11px;" onclick="if(window.saveSystem) window.saveSystem.saveGame();">Save Game Now</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(hud);
    this.hudElement = hud;
  }

  setPlayerInfo(race, avatarIcon) {
    this.race = race;
    document.getElementById('hud-player-name').innerText = race.toUpperCase();
    document.getElementById('hud-avatar-icon').innerText = avatarIcon;
    document.getElementById('plate-name').innerText = `${race.toUpperCase()} WANDERER`;
    document.getElementById('plate-race').innerText = race.toUpperCase();
    this.updateSkillSlots();
  }

  updateSkillSlots() {
    if (!this.skillSystem) return;
    const skills = this.skillSystem.getCurrentSkills();
    const qSkill = skills.Q;
    const eSkill = skills.E;

    if (qSkill) {
      const qIcon = document.getElementById('skill-icon-q');
      const qName = document.getElementById('skill-name-q');
      const qMp = document.getElementById('skill-mp-q');
      if (qIcon) qIcon.innerText = qSkill.icon;
      if (qName) qName.innerText = qSkill.name;
      if (qMp) qMp.innerText = `${qSkill.mpCost} MP`;
    }

    if (eSkill) {
      const eIcon = document.getElementById('skill-icon-e');
      const eName = document.getElementById('skill-name-e');
      const eMp = document.getElementById('skill-mp-e');
      if (eIcon) eIcon.innerText = eSkill.icon;
      if (eName) eName.innerText = eSkill.name;
      if (eMp) eMp.innerText = `${eSkill.mpCost} MP`;
    }
  }

  hookCombatAndQuest() {
    if (!this.combatSystem) return;

    // Red Damage Flash Vignette
    this.combatSystem.onPlayerDamageEffect = () => {
      const vig = document.getElementById('damage-vignette');
      if (vig) {
        vig.style.opacity = '1';
        setTimeout(() => { vig.style.opacity = '0'; }, 180);
      }
    };

    // Level Up Screen Banner
    this.combatSystem.onLevelUp = (newLevel) => {
      this.triggerLevelUpBanner(`🎉 LEVEL UP! 🎉`, `You reached Level ${newLevel}!`, `Max HP +25 • Max MP +10 • ATK +6 • Fully Restored!`);
    };

    // Loot Pickup Toast
    this.combatSystem.onLootCollected = (item, gold) => {
      const toastLayer = document.getElementById('toast-layer');
      if (toastLayer) {
        const toast = document.createElement('div');
        toast.className = 'loot-toast';
        toast.innerHTML = `<span>${item.icon}</span> <span>+1 ${item.name}</span> <span style="color: #fbbf24;">(+${gold}G)</span>`;
        toastLayer.appendChild(toast);

        setTimeout(() => {
          toast.style.transition = 'all 0.3s';
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(20px)';
          setTimeout(() => toast.remove(), 300);
        }, 2400);
      }
    };

    // Hook Quest System Events
    if (this.questSystem) {
      this.questSystem.onQuestAccepted = (quest) => {
        this.updateQuestTracker();
        document.getElementById('quest-board-modal').style.display = 'none';
        this.triggerZoneBanner('📜 QUEST ACCEPTED', quest.title);
      };

      this.questSystem.onQuestUpdated = (quest) => {
        this.updateQuestTracker();
      };

      this.questSystem.onQuestCompleted = (quest) => {
        this.updateQuestTracker();
        this.triggerZoneBanner('✓ QUEST OBJECTIVE COMPLETE!', 'Report to James the Guild Master in Guild Hall');
      };

      this.questSystem.onQuestClaimed = (quest, rankTier) => {
        this.updateQuestTracker();
        if (rankTier === 'RANK_D') {
          this.playerRank = 'RANK D';
          document.getElementById('hud-rank-tag').innerText = 'RANK D (SILVER) 🌟';
          document.getElementById('hud-rank-tag').style.background = '#475569';
          document.getElementById('plate-rank').innerText = 'RANK D (Silver Plate)';
          document.getElementById('plate-rank').style.color = '#e2e8f0';
          document.getElementById('card-plate-box').classList.add('rank-d');

          this.triggerLevelUpBanner('🌟 RANK PROMOTION! 🌟', 'Promoted to RANK D ADVENTURER (Silver Plate)!', 'Kingdom of Aetheria Grand Hero Seal of Merit Granted!');
        } else if (rankTier === 'RANK_E' || rankTier === true) {
          this.playerRank = 'RANK E';
          document.getElementById('hud-rank-tag').innerText = 'RANK E (BRONZE) ⭐';
          document.getElementById('hud-rank-tag').style.background = '#b45309';
          document.getElementById('plate-rank').innerText = 'RANK E (Bronze Plate)';
          document.getElementById('plate-rank').style.color = '#cd7f32';
          document.getElementById('card-plate-box').classList.add('rank-e');

          this.triggerLevelUpBanner('⭐ RANK PROMOTION! ⭐', 'Promoted to RANK E ADVENTURER (Bronze Plate)!', 'Guild Association Seal of Honor Granted!');
        } else {
          this.triggerZoneBanner('🏆 QUEST COMPLETED!', `Rewarded: +${quest.expReward} EXP, +${quest.goldReward}G`);
        }
      };
    }
  }

  updateQuestTracker() {
    if (!this.questSystem) return;
    const q = this.questSystem.activeQuest;
    const trackerEl = document.getElementById('quest-tracker-pill');
    const titleEl = document.getElementById('tracker-title');
    const progEl = document.getElementById('tracker-progress');

    if (!q) {
      trackerEl.classList.remove('ready-claim');
      titleEl.innerText = 'No Active Quest';
      progEl.innerText = 'Inspect Notice Board in Guild';
    } else {
      titleEl.innerText = q.title;
      if (q.status === 'READY_TO_CLAIM') {
        trackerEl.classList.add('ready-claim');
        progEl.innerHTML = `<span style="color: #34d399; font-weight: 900;">✓ COMPLETE!</span> Talk to James in Guild Hall`;
      } else {
        trackerEl.classList.remove('ready-claim');
        progEl.innerText = `${q.targetMonster}: ${q.currentCount} / ${q.targetCount} Slayed`;
      }
    }
  }

  renderQuestBoard() {
    const grid = document.getElementById('quest-grid');
    grid.innerHTML = '';

    if (!this.questSystem) return;
    const quests = Object.values(this.questSystem.quests);

    quests.forEach(q => {
      const card = document.createElement('div');
      card.className = `quest-card ${q.id === 'king_slime' ? 'boss-card' : ''}`;
      
      let btnHtml = '';
      if (q.status === 'COMPLETED') {
        btnHtml = `<span style="color: #059669; font-weight: 900; font-size: 12px;">✓ CLEARED</span>`;
      } else if (q.status === 'ACTIVE' || q.status === 'READY_TO_CLAIM') {
        btnHtml = `<span style="color: #0284c7; font-weight: 900; font-size: 12px;">⏳ IN PROGRESS</span>`;
      } else {
        btnHtml = `<button class="btn-accept-quest" onclick="window.gameHUD.questSystem.acceptQuest('${q.id}')">📜 ACCEPT QUEST</button>`;
      }

      card.innerHTML = `
        <div>
          <div class="quest-card-header">
            <span class="quest-card-title">${q.title}</span>
            <span class="quest-card-badge">${q.badge}</span>
          </div>
          <div class="quest-card-desc">${q.desc}</div>
        </div>
        <div>
          <div class="quest-card-reward">🏆 Rewards: +${q.expReward} EXP • +${q.goldReward}G • +${q.potionReward} Potions</div>
          <div style="text-align: right;">${btnHtml}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  triggerLevelUpBanner(title, sub, bonus) {
    const banner = document.getElementById('levelup-banner');
    document.getElementById('levelup-title').innerText = title;
    document.getElementById('levelup-sub').innerText = sub;
    document.getElementById('levelup-bonus').innerText = bonus;
    banner.classList.add('active');
    setTimeout(() => {
      banner.classList.remove('active');
    }, 3800);
  }

  bindEvents() {
    window.gameHUD = this;

    // Interaction key 'E'
    this.playerController.onInteract = () => {
      if (this.nearbyBed) {
        this.playerController.sleepInBed(this.nearbyBed, this.combatSystem, this.environmentSystem);
      } else if (this.nearbyChair) {
        this.playerController.sitDown(this.nearbyChair);
      } else if (this.isNearWaystone) {
        this.openWaystoneModal();
      } else if (this.isNearGuard) {
        this.openGuardDialogue();
      } else if (this.isNearAlchemist) {
        this.openAlchemistDialogue();
      } else if (this.isNearBarkeep) {
        this.openBarkeepDialogue();
      } else if (this.isNearVillagerArthur || this.isNearVillagerAria) {
        this.openArthurDialogue();
      } else if (this.isNearVillagerTom) {
        this.openTomDialogue();
      } else if (this.isNearBlacksmith) {
        this.openBlacksmithModal();
      } else if (this.isNearNpc) {
        this.openJamesDialogue();
      } else if (this.isNearBoard) {
        this.renderQuestBoard();
        document.getElementById('quest-board-modal').style.display = 'flex';
      }
    };

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyC') {
        const modal = document.getElementById('card-modal');
        if (modal.style.display === 'flex') {
          modal.style.display = 'none';
        } else {
          this.openAdventurerCard();
        }
      } else if (e.code === 'KeyI') {
        this.toggleInventory();
      }
    });

    // Potion click hotbar
    document.getElementById('slot-potion').addEventListener('click', () => {
      if (this.combatSystem) this.combatSystem.usePotion();
    });

    // Mount slot hotbar
    const slotMount = document.getElementById('slot-mount');
    if (slotMount) {
      slotMount.addEventListener('click', () => {
        if (this.mountSystem) this.mountSystem.toggleMount();
      });
    }

    // Inventory slot hotbar
    const slotInv = document.getElementById('slot-inventory');
    if (slotInv) {
      slotInv.addEventListener('click', () => {
        this.toggleInventory();
      });
    }

    // Card slot hotbar
    const slotCard = document.getElementById('slot-card');
    if (slotCard) {
      slotCard.addEventListener('click', () => {
        this.openAdventurerCard();
      });
    }

    // Settings slot hotbar
    const slotSettings = document.getElementById('slot-settings');
    if (slotSettings) {
      slotSettings.addEventListener('click', () => {
        this.toggleSettingsModal();
      });
    }

    // Skill slots click hotbar
    const skillQEl = document.getElementById('slot-skill-q');
    if (skillQEl) {
      skillQEl.addEventListener('click', () => {
        if (this.skillSystem) this.skillSystem.castSkill('Q');
      });
    }

    const skillEEl = document.getElementById('slot-skill-e');
    if (skillEEl) {
      skillEEl.addEventListener('click', () => {
        if (this.skillSystem) this.skillSystem.castSkill('E');
      });
    }

    // Settings Sliders
    const bgmSlider = document.getElementById('bgm-slider');
    if (bgmSlider) {
      bgmSlider.addEventListener('input', (e) => {
        if (window.soundFX) window.soundFX.setBGMVolume(e.target.value / 100);
      });
    }

    // Blacksmith Forge Upgrade Buttons
    const btnTier2 = document.getElementById('btn-forge-tier-2');
    if (btnTier2) {
      btnTier2.addEventListener('click', () => {
        const res = this.combatSystem.upgradeWeapon(2);
        if (res.success) {
          this.triggerLevelUpBanner('⚒️ WEAPON ENCHANTED! ⚒️', res.title, 'Cyan Elemental Aura Activated! +12 Attack Power!');
          this.updateBlacksmithModalUI();
        } else {
          this.showSimpleToast(`⚠️ ${res.reason}`);
        }
      });
    }

    const btnTier3 = document.getElementById('btn-forge-tier-3');
    if (btnTier3) {
      btnTier3.addEventListener('click', () => {
        const res = this.combatSystem.upgradeWeapon(3);
        if (res.success) {
          this.triggerLevelUpBanner('🔥 ROYAL LEGENDARY WEAPON! 🔥', res.title, 'Golden Sovereign Aura Activated! +16 Additional Attack Power!');
          this.updateBlacksmithModalUI();
        } else {
          this.showSimpleToast(`⚠️ ${res.reason}`);
        }
      });
    }

    document.getElementById('btn-open-board').addEventListener('click', () => {
      document.getElementById('dialog-box').style.display = 'none';
      this.renderQuestBoard();
      document.getElementById('quest-board-modal').style.display = 'flex';
    });

    document.getElementById('btn-claim-card').addEventListener('click', () => {
      document.getElementById('dialog-box').style.display = 'none';
      this.openAdventurerCard();
    });
  }

  showSimpleToast(msg) {
    const toastLayer = document.getElementById('toast-layer');
    if (toastLayer) {
      const toast = document.createElement('div');
      toast.className = 'loot-toast';
      toast.style.borderColor = '#f97316';
      toast.style.color = '#fed7aa';
      toast.innerHTML = `<span>${msg}</span>`;
      toastLayer.appendChild(toast);
      setTimeout(() => {
        toast.style.transition = 'all 0.3s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }, 2600);
    }
  }

  openBlacksmithModal() {
    this.updateBlacksmithModalUI();
    document.getElementById('blacksmith-modal').style.display = 'flex';
  }

  updateBlacksmithModalUI() {
    if (!this.combatSystem) return;
    const tier = this.combatSystem.weaponTier || 1;
    const curWeaponEl = document.getElementById('forge-current-weapon');
    const card2 = document.getElementById('card-tier-2');
    const card3 = document.getElementById('card-tier-3');
    const btn2 = document.getElementById('btn-forge-tier-2');
    const btn3 = document.getElementById('btn-forge-tier-3');

    const slimeGels = (this.combatSystem.inventory['Azure Slime Gel'] || 0) + (this.combatSystem.inventory['Emerald Slime Gel'] || 0);
    const crowns = this.combatSystem.inventory['Crown of the Slime King'] || 0;
    const gold = this.combatSystem.gold || 0;

    const req2El = document.getElementById('forge-req-2');
    if (req2El) req2El.innerHTML = `Requirements: 🪙 ${gold}/40 Gold • 🧪 ${slimeGels}/2 Slime Gels`;

    const req3El = document.getElementById('forge-req-3');
    if (req3El) req3El.innerHTML = `Requirements: 🪙 ${gold}/100 Gold • 👑 ${crowns}/1 King Crown`;

    if (tier === 1) {
      curWeaponEl.innerText = 'Tier 1 Standard Adventurer Blade';
      curWeaponEl.style.color = '#cbd5e1';
      card2.classList.remove('completed');
      card3.classList.remove('completed');
      btn2.disabled = false;
      btn2.innerText = '⚒️ REFURBISH (TIER 2)';
      btn3.disabled = true;
      btn3.innerText = '🔒 UNLOCKS AT TIER 2';
    } else if (tier === 2) {
      curWeaponEl.innerText = 'Tier 2 Enchanted Weapon (Cyan Elemental Aura)';
      curWeaponEl.style.color = '#38bdf8';
      card2.classList.add('completed');
      card3.classList.remove('completed');
      btn2.disabled = true;
      btn2.innerText = '✓ ENCHANTED (OWNED)';
      btn3.disabled = false;
      btn3.innerText = '🔥 FORGE LEGENDARY (TIER 3)';
    } else if (tier >= 3) {
      curWeaponEl.innerText = 'Tier 3 Royal Legendary Weapon (Sovereign Gold Aura)';
      curWeaponEl.style.color = '#f59e0b';
      card2.classList.add('completed');
      card3.classList.add('completed');
      btn2.disabled = true;
      btn2.innerText = '✓ ENCHANTED';
      btn3.disabled = true;
      btn3.innerText = '👑 MAX TIER REACHED';
    }
  }

  openJamesDialogue() {
    const dialog = document.getElementById('dialog-box');
    const textEl = document.getElementById('dialog-text');
    const actionsEl = document.getElementById('dialog-actions');
    document.querySelector('.npc-name').innerText = 'James the Guild Master';
    document.querySelector('.npc-badge').innerText = 'Grand Guildmaster of Aetheria';

    const activeQ = this.questSystem ? this.questSystem.activeQuest : null;

    if (activeQ && activeQ.status === 'READY_TO_CLAIM') {
      textEl.innerHTML = `
        "Magnificent feat, Hero! You have successfully completed the commission <b>${activeQ.title}</b>! As Guild Master, I officially confer your reward and commend your valor!"
      `;
      actionsEl.innerHTML = `
        <button class="btn-claim" id="btn-turnin-quest" style="background: linear-gradient(135deg, #059669, #10b981);">🏆 TURN IN QUEST & CLAIM REWARDS</button>
        <button class="btn-claim" style="background: rgba(255,255,255,0.12);" onclick="document.getElementById('dialog-box').style.display='none'">Close</button>
      `;
      document.getElementById('btn-turnin-quest').addEventListener('click', () => {
        this.questSystem.claimReward(activeQ.id);
        dialog.style.display = 'none';
      });
    } else if (activeQ && activeQ.status === 'ACTIVE') {
      textEl.innerHTML = `
        "You are currently undertaking the commission <b>${activeQ.title}</b>. Travel safely in the Whispering Plains! Report back to me once you have vanquished the required fiends."
      `;
      actionsEl.innerHTML = `
        <button class="btn-claim" id="btn-open-board">📜 VIEW QUEST BOARD</button>
        <button class="btn-claim" id="btn-claim-card">📋 INSPECT CARD</button>
        <button class="btn-claim" style="background: rgba(255,255,255,0.12);" onclick="document.getElementById('dialog-box').style.display='none'">Close</button>
      `;
      document.getElementById('btn-open-board').addEventListener('click', () => {
        dialog.style.display = 'none';
        this.renderQuestBoard();
        document.getElementById('quest-board-modal').style.display = 'flex';
      });
      document.getElementById('btn-claim-card').addEventListener('click', () => {
        dialog.style.display = 'none';
        this.openAdventurerCard();
      });
    } else {
      textEl.innerHTML = `
        "Welcome to the Grand Adventurer's Guild! I am James, Guild Master of Aetheria. To my right stands our official <b>Quest Notice Board</b>. Accept a commission, prove your mettle in the Whispering Plains, and forge your legend!"
      `;
      actionsEl.innerHTML = `
        <button class="btn-claim" id="btn-open-board">📜 VIEW QUEST BOARD</button>
        <button class="btn-claim" id="btn-claim-card">📋 INSPECT CARD</button>
        <button class="btn-claim" style="background: rgba(255,255,255,0.12);" onclick="document.getElementById('dialog-box').style.display='none'">Close</button>
      `;
      document.getElementById('btn-open-board').addEventListener('click', () => {
        dialog.style.display = 'none';
        this.renderQuestBoard();
        document.getElementById('quest-board-modal').style.display = 'flex';
      });
      document.getElementById('btn-claim-card').addEventListener('click', () => {
        dialog.style.display = 'none';
        this.openAdventurerCard();
      });
    }

    dialog.style.display = 'flex';
  }

  // Backward compatibility alias
  openLunaDialogue() {
    this.openJamesDialogue();
  }

  openAdventurerCard() {
    const modal = document.getElementById('card-modal');
    if (this.combatSystem) {
      document.getElementById('plate-lvl').innerText = `LVL ${this.combatSystem.level}`;
      const totalAtk = this.combatSystem.attackPower + (this.combatSystem.bonusEquipmentAtk || 0);
      document.getElementById('plate-atk').innerText = `${totalAtk} ATK`;
      document.getElementById('plate-gold').innerText = `${this.combatSystem.gold} G`;
    }
    modal.style.display = 'flex';
  }

  // NPC Dialogues
  openGuardDialogue() {
    const dialog = document.getElementById('dialog-box');
    document.querySelector('.npc-name').innerText = 'Captain Alden';
    document.querySelector('.npc-badge').innerText = 'Aetheria Gate Commander';
    document.getElementById('dialog-text').innerHTML = `
      "Halt, hero! Beyond these southern iron gates lie the <b>Whispering Plains</b> and the deep <b>Mystic Crystal Caverns</b>. Keep your blade sharp and your wits sharper. The safety of the Capital rests on your shoulders!"
    `;
    document.getElementById('dialog-actions').innerHTML = `
      <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('dialog-box').style.display='none'">Farewell, Commander</button>
    `;
    dialog.style.display = 'flex';
  }

  openAlchemistDialogue() {
    const dialog = document.getElementById('dialog-box');
    document.querySelector('.npc-name').innerText = 'Alchemist Elina';
    document.querySelector('.npc-badge').innerText = 'Royal Herbalist & Apothecary';
    document.getElementById('dialog-text').innerHTML = `
      "Welcome to my apothecary laboratory! I distill remedies from the native flora of the Whispering Plains. Would you care to purchase a <b>Health Potion</b> for your journey?"
    `;
    document.getElementById('dialog-actions').innerHTML = `
      <button class="btn-claim" id="btn-buy-potion" style="background: linear-gradient(135deg, #059669, #10b981);">🧪 BUY HEALTH POTION (25G)</button>
      <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('dialog-box').style.display='none'">Close</button>
    `;
    const buyBtn = document.getElementById('btn-buy-potion');
    if (buyBtn) {
      buyBtn.onclick = () => {
        if (this.combatSystem.gold >= 25) {
          this.combatSystem.gold -= 25;
          this.combatSystem.potions = (this.combatSystem.potions || 0) + 1;
          if (window.soundFX) window.soundFX.playLoot();
          this.showSimpleToast('🧪 Purchased 1 Health Potion! (-25G)');
          dialog.style.display = 'none';
        } else {
          this.showSimpleToast('⚠️ Insufficient Gold (25G required)!');
        }
      };
    }
    dialog.style.display = 'flex';
  }

  openBarkeepDialogue() {
    const dialog = document.getElementById('dialog-box');
    document.querySelector('.npc-name').innerText = 'Glenn the Barkeep';
    document.querySelector('.npc-badge').innerText = 'The Wandering Wolf Innkeeper';
    document.getElementById('dialog-text').innerHTML = `
      "Welcome to <b>The Wandering Wolf Tavern & Inn</b>! Weary or hungry from your travels? We serve hot roasted boar ribs, hearth bread, and cold dwarven ale. You may also rest in the inn beds to restore 100% of your HP and MP!"
    `;
    document.getElementById('dialog-actions').innerHTML = `
      <button class="btn-claim" style="background: #f59e0b;" onclick="window.gameHUD.openFoodMenu()">🍖 Buy Provisions & Food</button>
      <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('dialog-box').style.display='none'">Farewell, Glenn!</button>
    `;
    dialog.style.display = 'flex';
  }

  openArthurDialogue() {
    const dialog = document.getElementById('dialog-box');
    document.querySelector('.npc-name').innerText = 'Arthur the Merchant';
    document.querySelector('.npc-badge').innerText = 'Plaza Resident & Vendor';
    document.getElementById('dialog-text').innerHTML = `
      "Good day, adventurer! I am Arthur, merchant of the Capital Plaza. Alongside fresh fragrant blossoms, I provide wholesome travel rations and crisp honey apples from the plains. Would you care to see my wares?"
    `;
    document.getElementById('dialog-actions').innerHTML = `
      <button class="btn-claim" style="background: #f59e0b;" onclick="window.gameHUD.openFoodMenu()">🍎 Buy Travel Rations</button>
      <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('dialog-box').style.display='none'">Farewell, Arthur!</button>
    `;
    dialog.style.display = 'flex';
  }

  // Backward compatibility alias
  openAriaDialogue() {
    this.openArthurDialogue();
  }

  triggerRestFade() {
    const fade = document.getElementById('rest-fade-overlay');
    if (fade) {
      fade.style.opacity = '1';
      setTimeout(() => {
        fade.style.opacity = '0';
      }, 1600);
    }
  }

  openFoodMenu() {
    const dialog = document.getElementById('dialog-box');
    if (dialog) dialog.style.display = 'none';

    const modal = document.getElementById('food-menu-modal');
    if (!modal) return;

    const goldEl = document.getElementById('food-menu-gold');
    if (goldEl && this.combatSystem) {
      goldEl.innerText = this.combatSystem.gold;
    }

    const container = document.getElementById('food-items-container');
    container.innerHTML = '';

    const foodMenu = [
      {
        id: 'food_boar',
        name: 'Roast Boar Ribs',
        icon: '🍖',
        price: 15,
        healHp: 80,
        healMp: 0,
        desc: 'Fresh flame-roasted wild boar ribs. Restores +80 HP.'
      },
      {
        id: 'food_bread',
        name: 'Aetherian Baguette',
        icon: '🥖',
        price: 8,
        healHp: 45,
        healMp: 0,
        desc: 'Crisp and warm hearth-baked bread. Restores +45 HP.'
      },
      {
        id: 'food_ale',
        name: 'Dwarven Golden Ale',
        icon: '🍺',
        price: 10,
        healHp: 0,
        healMp: 50,
        desc: 'Chilled, foaming dwarven craft ale. Restores +50 MP.'
      },
      {
        id: 'food_apple',
        name: 'Sweet Honey Apple',
        icon: '🍎',
        price: 5,
        healHp: 30,
        healMp: 0,
        desc: 'Sweet and crisp orchard apple from the valley. Restores +30 HP.'
      },
      {
        id: 'food_stew',
        name: "Hunter's Hot Stew",
        icon: '🍲',
        price: 20,
        healHp: 110,
        healMp: 60,
        desc: 'Savory simmered meat with mountain herbs. Restores +110 HP & +60 MP.'
      }
    ];

    foodMenu.forEach(food => {
      const card = document.createElement('div');
      card.style.cssText = 'background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;';
      card.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
          <div style="font-size: 32px; background: rgba(255,255,255,0.06); width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">${food.icon}</div>
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 14px; color: #f8fafc;">${food.name}</div>
            <div style="font-size: 11px; color: #10b981; font-weight: 700;">${food.healHp > 0 ? `+${food.healHp} HP` : ''} ${food.healMp > 0 ? `+${food.healMp} MP` : ''}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${food.desc}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
          <div style="font-size: 12px; font-weight: 800; color: #fbbf24;">🪙 ${food.price} G</div>
          <button class="btn-claim btn-buy-food" style="padding: 5px 12px; font-size: 11px; background: #10b981;">Purchase</button>
        </div>
      `;
      card.querySelector('.btn-buy-food').onclick = () => {
        this.buyFoodItem(food);
      };
      container.appendChild(card);
    });

    modal.style.display = 'flex';
  }

  buyFoodItem(food) {
    if (!this.combatSystem || !this.inventorySystem) return;
    if (this.combatSystem.gold < food.price) {
      this.showSimpleToast(`⚠️ Insufficient Gold! Requires ${food.price} G.`);
      return;
    }
    this.combatSystem.gold -= food.price;
    if (this.combatSystem.soundEffects && this.combatSystem.soundEffects.playCoin) {
      this.combatSystem.soundEffects.playCoin();
    }
    this.inventorySystem.addItem({
      id: food.id,
      name: food.name,
      type: 'food',
      healHp: food.healHp || 0,
      healMp: food.healMp || 0,
      icon: food.icon,
      desc: food.desc,
      count: 1
    });
    this.updateStatusUI();
    this.updateInventoryUI();
    const goldEl = document.getElementById('food-menu-gold');
    if (goldEl) goldEl.innerText = this.combatSystem.gold;
    this.showSimpleToast(`🍖 Purchased ${food.name} (-${food.price} G)! Stored in Inventory [I].`);
  }

  openTomDialogue() {
    const dialog = document.getElementById('dialog-box');
    document.querySelector('.npc-name').innerText = 'Novice Tom';
    document.querySelector('.npc-badge').innerText = 'Aspiring Adventurer';
    document.getElementById('dialog-text').innerHTML = `
      "Greetings, Hero! What magnificent weapons and armor you wield! One day, I will pass the Adventurer's Guild examination and earn my own Adventurer Plate just like you!"
    `;
    document.getElementById('dialog-actions').innerHTML = `
      <button class="btn-claim" style="background: rgba(255,255,255,0.15);" onclick="document.getElementById('dialog-box').style.display='none'">Keep training, Tom!</button>
    `;
    dialog.style.display = 'flex';
  }

  // Waystone Teleport Modal
  openWaystoneModal() {
    const modal = document.getElementById('waystone-modal');
    const warpList = document.getElementById('warp-list');
    warpList.innerHTML = '';

    if (this.waystoneSystem) {
      this.waystoneSystem.waystones.forEach(w => {
        const card = document.createElement('div');
        card.className = 'warp-card';
        card.innerHTML = `
          <div>
            <div style="font-size: 14px; font-weight: 900; color: #38bdf8;">${w.name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${w.sub}</div>
          </div>
          <button class="btn-claim" style="padding: 8px 16px;">🌀 WARP</button>
        `;
        card.onclick = () => {
          this.waystoneSystem.teleportTo(w.id);
          modal.style.display = 'none';
        };
        warpList.appendChild(card);
      });
    }
    modal.style.display = 'flex';
  }

  // RPG Grid Inventory
  toggleInventory() {
    const modal = document.getElementById('inventory-modal');
    if (modal.style.display === 'flex') {
      modal.style.display = 'none';
    } else {
      this.updateInventoryUI();
      modal.style.display = 'flex';
    }
  }

  updateInventoryUI() {
    if (!this.inventorySystem) return;

    // 1. Equipped Gear Slots
    for (let slot of ['head', 'chest', 'cape', 'ring']) {
      const item = this.inventorySystem.equipped[slot];
      const slotEl = document.getElementById(`slot-gear-${slot}`);
      const nameEl = document.getElementById(`gear-name-${slot}`);
      if (item) {
        slotEl.classList.add('equipped');
        nameEl.innerHTML = `<span style="color: #38bdf8;">${item.icon} ${item.name}</span>`;
      } else {
        slotEl.classList.remove('equipped');
        nameEl.innerText = 'Empty';
      }
    }

    // 2. Live Stats
    const totalAtk = (this.combatSystem ? this.combatSystem.attackPower : 26) + (this.inventorySystem.totalBonusAtk || 0);
    const totalDef = (this.combatSystem ? this.combatSystem.defensePower : 5);
    const maxHp = (this.combatSystem ? this.combatSystem.maxHp : 100) + (this.inventorySystem.totalBonusHp || 0);
    const maxMp = (this.combatSystem ? this.combatSystem.maxMp : 50) + (this.inventorySystem.totalBonusMp || 0);
    const gold = this.combatSystem ? this.combatSystem.gold : 0;

    document.getElementById('stat-total-atk').innerText = `${totalAtk} ATK`;
    document.getElementById('stat-total-def').innerText = `${totalDef} DEF`;
    document.getElementById('stat-total-hp').innerText = `${maxHp} HP`;
    document.getElementById('stat-total-mp').innerText = `${maxMp} MP`;
    document.getElementById('stat-total-gold').innerText = `${gold} G`;

    // 3. 16 Grid Bag Cells
    const gridEl = document.getElementById('inv-grid-container');
    gridEl.innerHTML = '';
    const bag = this.inventorySystem.bag;

    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      const item = bag[i];

      if (item) {
        cell.className = 'inv-cell';
        const isFood = item.type === 'food';
        const actionLabel = isFood
          ? `<span style="color: #10b981; font-weight: 800;">Consume (${item.healHp > 0 ? `+${item.healHp}HP` : ''}${item.healMp > 0 ? `+${item.healMp}MP` : ''})</span>`
          : `<span style="color: #38bdf8;">Equip</span>`;
        cell.innerHTML = `
          <div style="font-size: 20px;">${item.icon}</div>
          <div style="font-size: 10px; font-weight: 800; color: #f1f5f9; line-height: 1.2;">${item.name}</div>
          <div style="font-size: 9px;">${actionLabel}</div>
        `;
        cell.onclick = () => {
          this.inventorySystem.useItem(item);
        };
      } else {
        cell.className = 'inv-cell empty';
        cell.innerHTML = `<span style="font-size: 18px; opacity: 0.25;">▫️</span>`;
      }
      gridEl.appendChild(cell);
    }
  }

  onUnequipClick(slot) {
    if (this.inventorySystem) {
      this.inventorySystem.unequipItem(slot);
    }
  }

  // Settings Modal Controls
  toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    }
  }

  setTimePreset(hour) {
    if (this.environmentSystem) {
      this.environmentSystem.timeOfDay = hour;
      this.showSimpleToast(`☀️ Time set to ${hour}:00`);
    }
  }

  setWeatherPreset(weather) {
    if (this.environmentSystem) {
      this.environmentSystem.setWeather(weather);
    }
  }

  // Minimap Radar Rendering
  updateMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Dark Radar Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Concentric Range Rings (15m, 30m, 45m)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    for (let r of [18, 36, 54]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pPos = this.playerController.position;
    const pRotY = this.playerController.rotationY;
    const scale = 1.35; // 1m = 1.35 pixels

    // Render Monsters (Red dots)
    if (this.combatSystem && this.combatSystem.monsters) {
      ctx.fillStyle = '#ef4444';
      this.combatSystem.monsters.forEach(m => {
        if (m.isDead) return;
        const dx = (m.position.x - pPos.x) * scale;
        const dz = (m.position.z - pPos.z) * scale;
        if (dx * dx + dz * dz < 54 * 54) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dz, m.isBoss ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Render Waystones (Cyan dots)
    if (this.waystoneSystem && this.waystoneSystem.waystones) {
      ctx.fillStyle = '#38bdf8';
      this.waystoneSystem.waystones.forEach(ws => {
        const dx = (ws.pos.x - pPos.x) * scale;
        const dz = (ws.pos.z - pPos.z) * scale;
        if (dx * dx + dz * dz < 54 * 54) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Render NPCs (Gold dots)
    ctx.fillStyle = '#fbbf24';
    const npcs = [
      this.town.npcPosition,
      this.town.blacksmithPosition,
      this.town.guardPosition,
      this.town.alchemistPosition,
      this.town.barkeepPosition,
      this.town.villagerArthurPos || this.town.villagerAriaPos,
      this.town.villagerTomPos
    ].filter(Boolean);

    npcs.forEach(pos => {
      const dx = (pos.x - pPos.x) * scale;
      const dz = (pos.z - pPos.z) * scale;
      if (dx * dx + dz * dz < 54 * 54) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dz, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Player Direction Arrow (Center)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-pRotY + Math.PI);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  triggerZoneBanner(title, sub) {
    const banner = document.getElementById('zone-banner');
    document.getElementById('banner-title').innerText = title;
    document.getElementById('banner-sub').innerText = sub;
    banner.classList.add('active');
    setTimeout(() => {
      banner.classList.remove('active');
    }, 2800);
  }

  update() {
    const playerPos = this.playerController.position;

    // 1. Proximity to Waystones, NPCs, Guards, Shops & Quest Board
    const npcPos = this.town.npcPosition;
    const boardPos = this.town.questBoardPosition;
    const smithPos = this.town.blacksmithPosition;
    const guardPos = this.town.guardPosition;
    const alchPos = this.town.alchemistPosition;
    const barkeepPos = this.town.barkeepPosition;
    const arthurPos = this.town.villagerArthurPos || this.town.villagerAriaPos;
    const tomPos = this.town.villagerTomPos;

    const promptEl = document.getElementById('prompt-talk');
    const promptText = document.getElementById('prompt-text');

    // Reset interaction flags
    this.isNearWaystone = this.waystoneSystem ? this.waystoneSystem.checkProximity(playerPos) : null;
    this.isNearGuard = false;
    this.isNearAlchemist = false;
    this.isNearBarkeep = false;
    this.isNearVillagerArthur = false;
    this.isNearVillagerTom = false;
    this.isNearBlacksmith = false;
    this.isNearNpc = false;
    this.isNearBoard = false;

    // Check nearest chair or bed
    let nearestChair = null;
    let minChairDist = 1.9;
    if (this.town && this.town.chairs) {
      for (let chair of this.town.chairs) {
        const d = playerPos.distanceTo(chair.pos);
        if (d < minChairDist) {
          minChairDist = d;
          nearestChair = chair;
        }
      }
    }
    this.nearbyChair = nearestChair;

    let nearestBed = null;
    let minBedDist = 2.4;
    if (this.town && this.town.beds) {
      for (let bed of this.town.beds) {
        const d = playerPos.distanceTo(bed.pos);
        if (d < minBedDist) {
          minBedDist = d;
          nearestBed = bed;
        }
      }
    }
    this.nearbyBed = nearestBed;

    if (this.playerController.isSitting) {
      promptText.innerText = 'Stand Up [WASD or Space]';
      promptEl.style.display = 'flex';
    } else if (this.playerController.isSleeping) {
      promptText.innerText = 'Wake Up [WASD or Space]';
      promptEl.style.display = 'flex';
    } else if (this.nearbyBed) {
      promptText.innerText = `Sleep & Rest [E] (${this.nearbyBed.name || 'Bed'})`;
      promptEl.style.display = 'flex';
    } else if (this.nearbyChair) {
      promptText.innerText = `Sit Down [E] (${this.nearbyChair.name || 'Chair'})`;
      promptEl.style.display = 'flex';
    } else if (this.isNearWaystone) {
      promptText.innerText = `Warp Portal: ${this.isNearWaystone.name}`;
      promptEl.style.display = 'flex';
    } else if (guardPos && playerPos.distanceTo(guardPos) < 3.8) {
      this.isNearGuard = true;
      promptText.innerText = 'Talk to Captain Alden (City Guard)';
      promptEl.style.display = 'flex';
    } else if (alchPos && playerPos.distanceTo(alchPos) < 3.8) {
      this.isNearAlchemist = true;
      promptText.innerText = 'Talk to Alchemist Elina (Potions)';
      promptEl.style.display = 'flex';
    } else if (barkeepPos && playerPos.distanceTo(barkeepPos) < 3.8) {
      this.isNearBarkeep = true;
      promptText.innerText = 'Talk to Glenn the Barkeep (Tavern)';
      promptEl.style.display = 'flex';
    } else if (arthurPos && playerPos.distanceTo(arthurPos) < 2.8) {
      this.isNearVillagerArthur = true;
      this.isNearVillagerAria = true;
      promptText.innerText = 'Talk to Arthur the Merchant';
      promptEl.style.display = 'flex';
    } else if (tomPos && playerPos.distanceTo(tomPos) < 2.8) {
      this.isNearVillagerTom = true;
      promptText.innerText = 'Talk to Novice Tom';
      promptEl.style.display = 'flex';
    } else if (smithPos && playerPos.distanceTo(smithPos) < 3.8) {
      this.isNearBlacksmith = true;
      promptText.innerText = 'Talk to Master Blacksmith Borin';
      promptEl.style.display = 'flex';
    } else if (npcPos && playerPos.distanceTo(npcPos) < 4.2) {
      this.isNearNpc = true;
      promptText.innerText = 'Talk to James the Guild Master';
      promptEl.style.display = 'flex';
    } else if (boardPos && playerPos.distanceTo(boardPos) < 3.8) {
      this.isNearBoard = true;
      promptText.innerText = 'Inspect Guild Notice Board';
      promptEl.style.display = 'flex';
    } else {
      promptEl.style.display = 'none';
    }

    // 2. Zone Detection & Announcements (Dungeon vs Plains vs Guild vs Plaza)
    if (playerPos.z >= 88.0) {
      if (this.currentZone !== 'dungeon') {
        this.currentZone = 'dungeon';
        document.getElementById('hud-location-title').innerText = '🕳️ MYSTIC CRYSTAL CAVERNS';
        document.getElementById('hud-location-sub').innerText = 'Dungeon Zone • Danger Lv. 5+';
        document.getElementById('hud-location-pill').style.borderColor = '#c084fc';
        this.triggerZoneBanner('🕳️ MYSTIC CRYSTAL CAVERNS', 'Danger Level 5+ • Ancient Mines & Crystal Sanctum');
      }
    } else if (playerPos.z < -9.8 && Math.abs(playerPos.x) < 6.8) {
      if (this.currentZone !== 'guild') {
        this.currentZone = 'guild';
        document.getElementById('hud-location-title').innerText = "🏰 ADVENTURER'S GUILD HALL";
        document.getElementById('hud-location-sub').innerText = 'Grand Reception & Tavern (Safe Zone)';
        document.getElementById('hud-location-pill').style.borderColor = '#fbbf24';
        this.triggerZoneBanner("🏰 ADVENTURER'S GUILD HALL", 'Grand Reception & Tavern • Safe Zone');
      }
    } else if (playerPos.z > 14.5) {
      if (playerPos.x < -24 && playerPos.z > 36 && playerPos.z < 76) {
        if (this.currentZone !== 'mire') {
          this.currentZone = 'mire';
          document.getElementById('hud-location-title').innerText = '🐸 SLIME MIRE HOLLOW';
          document.getElementById('hud-location-sub').innerText = 'Sunken Ruins & King Slime Arena';
          document.getElementById('hud-location-pill').style.borderColor = '#10b981';
          this.triggerZoneBanner('🐸 SLIME MIRE HOLLOW', 'Danger Level 5 • Sunken Ruins & King Slime Arena');
        }
      } else if (playerPos.x > 24 && playerPos.z > 36 && playerPos.z < 76) {
        if (this.currentZone !== 'ridge') {
          this.currentZone = 'ridge';
          document.getElementById('hud-location-title').innerText = '⛺ GOBLIN RIDGE OUTPOST';
          document.getElementById('hud-location-sub').innerText = 'Warband Camp & Watchtower';
          document.getElementById('hud-location-pill').style.borderColor = '#f59e0b';
          this.triggerZoneBanner('⛺ GOBLIN RIDGE OUTPOST', 'Danger Level 5 • Warband Camp & Watchtower');
        }
      } else if (this.currentZone !== 'plains') {
        this.currentZone = 'plains';
        document.getElementById('hud-location-title').innerText = '🌾 WHISPERING PLAINS';
        document.getElementById('hud-location-sub').innerText = 'Danger Lv. 1-5 • Hunting Field';
        document.getElementById('hud-location-pill').style.borderColor = '#22c55e';
        this.triggerZoneBanner('🌾 WHISPERING PLAINS', 'Danger Level 1-5 • Hunting Field');
      }
    } else {
      if (this.currentZone !== 'town') {
        this.currentZone = 'town';
        document.getElementById('hud-location-title').innerText = '🏰 AETHERIA: CAPITAL PLAZA';
        document.getElementById('hud-location-sub').innerText = 'Town Center (Safe Zone)';
        document.getElementById('hud-location-pill').style.borderColor = 'rgba(255, 255, 255, 0.15)';
        this.triggerZoneBanner('🏰 CAPITAL PLAZA', 'Town Center • Safe Zone');
      }
    }

    // 3. Update Boss Health Bar (King Slime in Ruins or Ancient Golem in Caverns)
    const kingSlime = this.combatSystem ? this.combatSystem.boss : null;
    const golemBoss = this.combatSystem ? this.combatSystem.dungeonBoss : null;
    const bossHud = document.getElementById('boss-hud');
    const bossTitle = document.getElementById('boss-title');
    const bossLvlTag = document.getElementById('boss-lvl-tag');

    let activeFightingBoss = null;
    if (golemBoss && !golemBoss.isDead && playerPos.distanceTo(golemBoss.position) < 30.0) {
      activeFightingBoss = golemBoss;
      if (bossTitle) bossTitle.innerText = '👑 ANCIENT CRYSTAL GOLEM';
      if (bossLvlTag) bossLvlTag.innerText = 'LVL 8 DUNGEON BOSS';
    } else if (kingSlime && !kingSlime.isDead && playerPos.distanceTo(kingSlime.position) < 26.0) {
      activeFightingBoss = kingSlime;
      if (bossTitle) bossTitle.innerText = '👑 KING SLIME';
      if (bossLvlTag) bossLvlTag.innerText = 'LVL 5 FIELD BOSS';
    }

    if (activeFightingBoss && bossHud) {
      bossHud.style.display = 'flex';
      const bossHpPct = Math.max(0, Math.min(100, (activeFightingBoss.hp / activeFightingBoss.maxHp) * 100));
      document.getElementById('boss-hp-fill').style.width = `${bossHpPct}%`;
    } else if (bossHud) {
      bossHud.style.display = 'none';
    }

    // 4. Update BGM Track based on Region & Boss Encounter
    if (window.soundFX && window.soundFX.setBGMTrack) {
      if (activeFightingBoss) {
        window.soundFX.setBGMTrack('boss');
      } else if (this.currentZone === 'dungeon') {
        window.soundFX.setBGMTrack('dungeon');
      } else if (this.currentZone === 'plains') {
        window.soundFX.setBGMTrack('plains');
      } else {
        window.soundFX.setBGMTrack('town');
      }
    }

    // 5. Update Minimap Radar & Time Indicator
    this.updateMinimap();
    if (this.environmentSystem) {
      const timePill = document.getElementById('time-pill');
      if (timePill) timePill.innerText = this.environmentSystem.getTimeFormatted();
    }

    // 4. Update Real-Time Combat Stats Gauges
    if (this.combatSystem) {
      // HP Bar
      const hpPct = Math.max(0, Math.min(100, (this.combatSystem.hp / this.combatSystem.maxHp) * 100));
      document.getElementById('hud-hp-fill').style.width = `${hpPct}%`;
      document.getElementById('hud-hp-val').innerText = `${Math.round(this.combatSystem.hp)}/${this.combatSystem.maxHp}`;

      // MP Bar
      const mpPct = Math.max(0, Math.min(100, (this.combatSystem.mp / this.combatSystem.maxMp) * 100));
      document.getElementById('hud-mp-fill').style.width = `${mpPct}%`;
      document.getElementById('hud-mp-val').innerText = `${Math.round(this.combatSystem.mp)}/${this.combatSystem.maxMp}`;

      // EXP Bar
      const expPct = Math.max(0, Math.min(100, (this.combatSystem.exp / this.combatSystem.expNext) * 100));
      document.getElementById('hud-exp-fill').style.width = `${expPct}%`;
      document.getElementById('hud-exp-val').innerText = `${this.combatSystem.exp}/${this.combatSystem.expNext}`;

      // Level & Gold & Potions
      document.getElementById('hud-level-tag').innerText = `LV. ${this.combatSystem.level}`;
      document.getElementById('hud-gold-tag').innerText = `🪙 ${this.combatSystem.gold}G`;
      document.getElementById('potion-count').innerText = `${this.combatSystem.potions || 0}`;
    }

    // 5. Update Active Combat Skills Cooldown & Mana Usability
    if (this.skillSystem) {
      const skills = this.skillSystem.getCurrentSkills();
      for (let slot of ['Q', 'E']) {
        const skill = skills[slot];
        const cd = this.skillSystem.cooldowns[slot] || 0;
        const overlay = document.getElementById(`skill-cd-overlay-${slot.toLowerCase()}`);
        const slotEl = document.getElementById(`slot-skill-${slot.toLowerCase()}`);
        if (overlay && skill) {
          if (cd > 0 && skill.cdMax > 0) {
            overlay.style.height = `${(cd / skill.cdMax) * 100}%`;
            overlay.innerText = `${cd.toFixed(1)}s`;
          } else {
            overlay.style.height = '0%';
            overlay.innerText = '';
          }
        }
        if (slotEl && this.combatSystem && skill) {
          if (this.combatSystem.mp < skill.mpCost) {
            slotEl.style.opacity = '0.5';
          } else {
            slotEl.style.opacity = '1.0';
          }
        }
      }
    }
  }
}

window.GameHUD = GameHUD;
