// CharacterSelectUI.js - Hero Class Selection & Online Multiplayer Login
class CharacterSelectUI {
  constructor(characterLoader, stage) {
    this.characterLoader = characterLoader;
    this.stage = stage;
    this.currentClass = 'human'; // 'human' (Knight), 'elf' (Mage), 'dwarf' (Barbarian), 'beastman' (Rogue)
    this.currentGender = 'male';

    this.classData = {
      human: {
        title: "KNIGHT",
        icon: "⚔️",
        themeColor: "#38bdf8",
        badge: "Royal Vanguard Champion",
        subTitle: "Sword & Shield Frontline Master",
        desc: "Steadfast frontline guardians clad in royal blue capes and polished silver plate armor. Excels in balanced melee combat and defense.",
        hp: "85%", mp: "65%", atk: "85%", def: "82%", spd: "75%",
        skill: "🛡️ [Valor Slash] Deals 150% physical slash damage with a 20% bonus against fiends."
      },
      elf: {
        title: "MAGE",
        icon: "🌿",
        themeColor: "#34d399",
        badge: "Emerald Archmage",
        subTitle: "Elemental Spellcaster",
        desc: "Masters of arcane wisdom wielding nature-infused staves and emerald robes. Dominates battle with mystical ranged projectiles.",
        hp: "62%", mp: "95%", atk: "78%", def: "58%", spd: "96%",
        skill: "🔮 [Arcane Volley] Fires a barrage of homing starlight energy bolts that pierce enemy defenses."
      },
      dwarf: {
        title: "BARBARIAN",
        icon: "🛡️",
        themeColor: "#fb923c",
        badge: "Ironclad Berserker",
        subTitle: "Heavy Battleaxe Juggernaut",
        desc: "Powerhouse dwarven juggernauts boasting massive battleaxes and unbreakable armor. Crushes adversaries with raw crushing strength.",
        hp: "100%", mp: "40%", atk: "95%", def: "100%", spd: "45%",
        skill: "💥 [Earth Tremor] Slams battleaxe into the ground, inflicting heavy AoE stun on surrounding enemies."
      },
      beastman: {
        title: "ROGUE",
        icon: "🐺",
        themeColor: "#f43f5e",
        badge: "Shadow Blade",
        subTitle: "Dual-Dagger Assassin",
        desc: "Agile lupine shadow stalkers equipped with dual enchanted daggers. Strikes with lethal critical speed from the shadows.",
        hp: "80%", mp: "55%", atk: "96%", def: "65%", spd: "98%",
        skill: "🗡️ [Shadow Flurry] Slashes rapidly with dual blades, unleashing continuous critical bleeding strikes."
      }
    };

    this.createDom();
    this.bindEvents();
  }

  createDom() {
    const savedName = localStorage.getItem('isekai_hero_name') || 'Hero';

    const container = document.createElement('div');
    container.id = 'character-ui';
    container.innerHTML = `
      <style>
        #character-ui {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px 32px;
          color: #f8fafc;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          z-index: 20;
          transition: opacity 0.4s ease;
        }

        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          pointer-events: auto;
        }
        .header-title-box {
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 14px 24px;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .header-title-box h1 {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 2.5px;
          background: linear-gradient(135deg, #38bdf8, #818cf8, #f43f5e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header-title-box p {
          font-size: 11px;
          color: #94a3b8;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* Left Side: Hero Class Selection */
        .selection-left {
          position: absolute;
          left: 32px;
          top: 115px;
          width: 260px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: auto;
        }

        .class-card-btn {
          background: rgba(15, 23, 42, 0.82);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          padding: 14px 18px;
          color: #e2e8f0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .class-card-btn:hover {
          background: rgba(56, 189, 248, 0.2);
          border-color: #38bdf8;
          transform: translateX(6px);
        }
        .class-card-btn.active {
          background: linear-gradient(135deg, rgba(2, 132, 199, 0.45), rgba(99, 102, 241, 0.45));
          border: 2px solid #38bdf8;
          box-shadow: 0 0 25px rgba(56, 189, 248, 0.4);
          transform: translateX(10px);
        }
        .class-card-icon {
          font-size: 26px;
        }
        .class-card-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .class-card-sub {
          font-size: 11px;
          color: #94a3b8;
        }

        /* Right Side: Multiplayer Hero Login & Class Stats */
        .selection-right {
          position: absolute;
          right: 32px;
          top: 115px;
          width: 360px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          pointer-events: auto;
        }

        .login-card {
          background: rgba(15, 23, 42, 0.90);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .login-card-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #38bdf8;
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .server-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid #10b981;
          color: #34d399;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 10px;
        }
        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .hero-name-input {
          width: 100%;
          background: rgba(2, 6, 23, 0.7);
          border: 1.5px solid rgba(56, 189, 248, 0.4);
          color: #f8fafc;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }
        .hero-name-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.45);
        }

        .spec-box {
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .spec-name {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: #38bdf8;
        }
        .spec-sub-title {
          font-size: 12px;
          font-weight: 700;
          color: #e2e8f0;
          margin-top: 2px;
        }
        .spec-badge {
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
          margin-bottom: 8px;
        }
        .spec-desc {
          font-size: 12px;
          color: #cbd5e1;
          line-height: 1.45;
          margin-bottom: 12px;
        }

        .skill-box {
          background: rgba(2, 132, 199, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 12px;
          font-size: 11px;
          color: #e0f2fe;
          line-height: 1.4;
        }

        .stat-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .stat-bar-track {
          width: 140px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }
        .stat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #818cf8);
          border-radius: 3px;
          transition: width 0.4s ease;
        }

        /* Bottom Controls Bar & Enter Game Button */
        .bottom-control-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
        }

        /* Big Glowing Enter Town Button */
        .btn-enter-town {
          background: linear-gradient(135deg, #0284c7, #6366f1, #f43f5e);
          background-size: 200% 200%;
          border: none;
          color: white;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 1.5px;
          padding: 16px 48px;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: 0 10px 35px rgba(2, 132, 199, 0.6), 0 0 25px rgba(99, 102, 241, 0.5);
          transition: all 0.25s ease;
          animation: gradientShift 3s ease infinite;
        }
        .btn-enter-town:hover {
          transform: scale(1.06) translateY(-2px);
          box-shadow: 0 15px 45px rgba(2, 132, 199, 0.8), 0 0 35px rgba(244, 63, 94, 0.6);
        }

        .action-preview-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 8px 16px;
          border-radius: 16px;
        }
        .snap-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .snap-btn:hover {
          background: #0284c7;
          border-color: #38bdf8;
          color: white;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      </style>

      <!-- Top Header -->
      <div class="header-section">
        <div class="header-title-box">
          <h1>ISEKAI CHRONICLES</h1>
          <p>Online Multiplayer Realm • Choose Class & Enter World</p>
        </div>
      </div>

      <!-- Left Selection (Hero Classes) -->
      <div class="selection-left">
        <button class="class-card-btn active" data-class="human">
          <span class="class-card-icon">⚔️</span>
          <div>
            <div class="class-card-title">KNIGHT</div>
            <div class="class-card-sub">Royal Vanguard Champion</div>
          </div>
        </button>

        <button class="class-card-btn" data-class="elf">
          <span class="class-card-icon">🌿</span>
          <div>
            <div class="class-card-title">MAGE</div>
            <div class="class-card-sub">Emerald Archmage</div>
          </div>
        </button>

        <button class="class-card-btn" data-class="dwarf">
          <span class="class-card-icon">🛡️</span>
          <div>
            <div class="class-card-title">BARBARIAN</div>
            <div class="class-card-sub">Ironclad Berserker</div>
          </div>
        </button>

        <button class="class-card-btn" data-class="beastman">
          <span class="class-card-icon">🐺</span>
          <div>
            <div class="class-card-title">ROGUE</div>
            <div class="class-card-sub">Shadow Blade Assassin</div>
          </div>
        </button>
      </div>

      <!-- Right Panel: Multiplayer Login & Class Specs -->
      <div class="selection-right">
        <!-- Multiplayer Hero Login Card -->
        <div class="login-card">
          <div class="login-card-title">
            <span>👤 MULTIPLAYER HERO LOGIN</span>
            <span class="server-status-badge"><span class="pulse-dot"></span> Online</span>
          </div>
          <input type="text" id="login-hero-name" class="hero-name-input" placeholder="Enter Your Hero Name..." maxlength="15" value="${savedName}" autocomplete="off" />
          <div style="font-size: 11px; color: #94a3b8;">
            Your level, inventory, and rank will automatically save to this hero profile!
          </div>
        </div>

        <!-- Class Combat Specs -->
        <div class="spec-box">
          <div class="spec-name" id="ui-spec-name">KNIGHT</div>
          <div class="spec-sub-title" id="ui-spec-title">Royal Vanguard Champion</div>
          <div class="spec-badge" id="ui-spec-badge">Brave • Determined • Versatile</div>
          <div class="spec-desc" id="ui-spec-desc"></div>

          <div class="skill-box" id="ui-spec-skill"></div>

          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 8px;">Combat Aptitude</div>
          <div class="stat-line"><span>HP (Vitality)</span><div class="stat-bar-track"><div class="stat-bar-fill" id="stat-hp"></div></div></div>
          <div class="stat-line"><span>MP (Mana)</span><div class="stat-bar-track"><div class="stat-bar-fill" id="stat-mp"></div></div></div>
          <div class="stat-line"><span>ATK (Strength)</span><div class="stat-bar-track"><div class="stat-bar-fill" id="stat-atk"></div></div></div>
          <div class="stat-line"><span>DEF (Defense)</span><div class="stat-bar-track"><div class="stat-bar-fill" id="stat-def"></div></div></div>
          <div class="stat-line"><span>SPD (Agility)</span><div class="stat-bar-track"><div class="stat-bar-fill" id="stat-spd"></div></div></div>
        </div>
      </div>

      <!-- Bottom Panel: Enter World CTA & Preview Actions -->
      <div class="bottom-control-panel">
        <button class="btn-enter-town" id="btn-enter-town">
          ⚔️ ENTER WORLD & JOIN MULTIPLAYER
        </button>

        <div class="action-preview-row">
          <span style="font-size: 12px; font-weight: 700; color: #94a3b8;">Preview:</span>
          <button class="snap-btn" id="action-idle">🧍 Idle</button>
          <button class="snap-btn" id="action-run">🏃 Run</button>
          <button class="snap-btn" id="action-attack">⚔️ Attack</button>
          <button class="snap-btn" id="action-cheer">🎉 Cheer</button>
          <span style="font-size: 11px; color: #64748b; margin-left: 8px;">| Rotate:</span>
          <button class="snap-btn" id="rot-front">Front</button>
          <button class="snap-btn" id="rot-left">Side</button>
          <button class="snap-btn" id="rot-back">Back</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;
    this.updateCard();
  }

  bindEvents() {
    // Class Selection
    document.querySelectorAll('.class-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.class-card-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentClass = btn.dataset.class;
        this.characterLoader.loadRace(this.currentClass, this.currentGender);
        this.updateCard();
      });
    });

    // Enter Town / Join World
    const enterBtn = document.getElementById('btn-enter-town');
    enterBtn.addEventListener('click', () => {
      if (enterBtn.disabled) return;
      enterBtn.disabled = true;

      const nameInput = document.getElementById('login-hero-name');
      const heroName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'Hero';
      localStorage.setItem('isekai_hero_name', heroName);

      this.container.style.opacity = '0';
      setTimeout(() => {
        this.container.style.display = 'none';
        if (this.onStartAdventure) {
          const classIcons = { human: '⚔️', elf: '🌿', dwarf: '🛡️', beastman: '🐺' };
          this.onStartAdventure(this.currentClass, classIcons[this.currentClass] || '⚔️', heroName);
        }
      }, 400);
    });

    // Animation Previews
    document.getElementById('action-idle').addEventListener('click', () => this.characterLoader.setAction('idle'));
    document.getElementById('action-run').addEventListener('click', () => this.characterLoader.setAction('run'));
    document.getElementById('action-attack').addEventListener('click', () => this.characterLoader.setAction('attack'));
    document.getElementById('action-cheer').addEventListener('click', () => this.characterLoader.setAction('cheer'));

    // Camera Snaps
    document.getElementById('rot-front').addEventListener('click', () => this.stage.snapCamera('front'));
    document.getElementById('rot-left').addEventListener('click', () => this.stage.snapCamera('left'));
    document.getElementById('rot-back').addEventListener('click', () => this.stage.snapCamera('back'));
  }

  updateCard() {
    const data = this.classData[this.currentClass];
    if (!data) return;

    document.getElementById('ui-spec-name').innerText = data.title;
    document.getElementById('ui-spec-title').innerText = data.subTitle;
    document.getElementById('ui-spec-badge').innerText = data.badge;
    document.getElementById('ui-spec-desc').innerText = data.desc;
    document.getElementById('ui-spec-skill').innerText = data.skill;

    document.getElementById('stat-hp').style.width = data.hp;
    document.getElementById('stat-mp').style.width = data.mp;
    document.getElementById('stat-atk').style.width = data.atk;
    document.getElementById('stat-def').style.width = data.def;
    document.getElementById('stat-spd').style.width = data.spd;
  }
}

window.CharacterSelectUI = CharacterSelectUI;