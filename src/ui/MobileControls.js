// MobileControls.js - Ultra-Clean High-Performance Mobile RPG Controls
// Features: Ergonomic Virtual Joystick, Responsive Action Button Arc, Floating Chat Toggle,
// and 60 FPS lightweight styling without laggy backdrop filters.

class MobileControls {
  constructor(playerController, skillSystem, combatSystem, mountSystem, inventorySystem) {
    this.playerController = playerController;
    this.skillSystem = skillSystem;
    this.combatSystem = combatSystem;
    this.mountSystem = mountSystem;
    this.inventorySystem = inventorySystem;

    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
    this.activeTouchId = null;
    this.cameraTouchId = null;
    this.lastCamX = 0;
    this.lastCamY = 0;

    this.maxRadius = 45;

    this.createUI();
    this.bindTouchEvents();
  }

  createUI() {
    const container = document.createElement('div');
    container.id = 'mobile-controls-container';
    container.innerHTML = `
      <style>
        #mobile-controls-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 55;
          user-select: none;
          -webkit-user-select: none;
          display: ${this.isTouchDevice ? 'block' : 'none'};
        }

        @media (max-width: 1024px), (pointer: coarse), (hover: none) {
          #mobile-controls-container {
            display: block !important;
          }
        }

        /* Top-Left Floating Chat Button */
        #mobile-chat-toggle-btn {
          position: absolute;
          top: 14px;
          left: 216px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.90);
          border: 2px solid #38bdf8;
          color: white;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
          z-index: 60;
          touch-action: manipulation;
          cursor: pointer;
        }
        #mobile-chat-toggle-btn:active {
          transform: scale(0.92);
          background: #0284c7;
        }

        /* Virtual Joystick (Clean Bottom-Left, ZERO Overlap!) */
        #mobile-joystick-base {
          position: absolute;
          bottom: 24px;
          left: 24px;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.55);
          border: 2px solid rgba(56, 189, 248, 0.45);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: none;
        }
        #mobile-joystick-stick {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #38bdf8, #0284c7);
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
          border: 2px solid #e0f2fe;
          transform: translate(0px, 0px);
          pointer-events: none;
        }

        /* Ergonomic Action Buttons Cluster (Bottom Right) */
        .mobile-action-cluster {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 250px;
          height: 240px;
          pointer-events: none;
          z-index: 70;
        }

        .m-btn {
          position: absolute;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Segoe UI', -apple-system, sans-serif;
          font-weight: 800;
          pointer-events: auto;
          touch-action: manipulation;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
          transition: transform 0.08s ease, filter 0.08s ease;
          border: 2px solid rgba(255, 255, 255, 0.35);
          user-select: none;
          -webkit-user-select: none;
          cursor: pointer;
        }
        .m-btn:active, .m-btn.pressed {
          transform: scale(0.88);
          filter: brightness(1.35);
        }
        .m-btn-icon {
          line-height: 1;
        }
        .m-btn-lbl {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin-top: 1px;
          text-transform: uppercase;
          opacity: 0.95;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
        }

        /* 1. Big Attack Button (Primary thumb resting point) */
        #m-btn-attack {
          bottom: 10px;
          right: 10px;
          width: 70px;
          height: 70px;
          background: radial-gradient(circle at 35% 35%, #f43f5e, #be123c);
          border-color: #fda4af;
          box-shadow: 0 0 18px rgba(244, 63, 94, 0.8);
        }
        #m-btn-attack .m-btn-icon { font-size: 26px; }

        /* 2. Jump Button (Above Attack, with distinct JUMP tag & icon) */
        #m-btn-jump {
          bottom: 96px;
          right: 10px;
          width: 52px;
          height: 52px;
          background: radial-gradient(circle at 35% 35%, #0284c7, #0369a1);
          border-color: #7dd3fc;
          box-shadow: 0 0 14px rgba(2, 132, 199, 0.7);
        }
        #m-btn-jump .m-btn-icon { font-size: 20px; }

        /* 3. Skill 1 Button (Q) */
        #m-btn-skill1 {
          bottom: 74px;
          right: 76px;
          width: 50px;
          height: 50px;
          background: radial-gradient(circle at 35% 35%, #0ea5e9, #0284c7);
          border-color: #bae6fd;
        }
        #m-btn-skill1 .m-btn-icon { font-size: 19px; }

        /* 4. Skill 2 Button (E) */
        #m-btn-skill2 {
          bottom: 10px;
          right: 94px;
          width: 50px;
          height: 50px;
          background: radial-gradient(circle at 35% 35%, #8b5cf6, #6d28d9);
          border-color: #ddd6fe;
        }
        #m-btn-skill2 .m-btn-icon { font-size: 19px; }

        /* 5. Wolf Mount Button */
        #m-btn-mount {
          bottom: 136px;
          right: 76px;
          width: 48px;
          height: 48px;
          background: radial-gradient(circle at 35% 35%, #334155, #0f172a);
          border-color: #38bdf8;
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
        }
        #m-btn-mount .m-btn-icon { font-size: 18px; }

        /* 6. Potion Button */
        #m-btn-potion {
          bottom: 136px;
          right: 134px;
          width: 46px;
          height: 46px;
          background: radial-gradient(circle at 35% 35%, #059669, #065f46);
          border-color: #6ee7b7;
        }
        #m-btn-potion .m-btn-icon { font-size: 17px; }

        /* 7. Bag Button */
        #m-btn-bag {
          bottom: 74px;
          right: 138px;
          width: 46px;
          height: 46px;
          background: radial-gradient(circle at 35% 35%, #d97706, #92400e);
          border-color: #fde68a;
        }
        #m-btn-bag .m-btn-icon { font-size: 17px; }

        /* 8. Talk / Interact Button (E) */
        #m-btn-interact {
          bottom: 12px;
          right: 154px;
          width: 48px;
          height: 48px;
          background: radial-gradient(circle at 35% 35%, #0284c7, #0f172a);
          border-color: #38bdf8;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.6);
        }
        #m-btn-interact .m-btn-icon { font-size: 19px; }

        /* Camera Swipe Touch Zone (Upper & Middle Screen only, safe from buttons!) */
        #mobile-camera-zone {
          position: fixed;
          top: 0;
          right: 0;
          width: 55%;
          height: 42%;
          pointer-events: auto;
          touch-action: none;
          z-index: 50;
        }
      </style>

      <!-- Floating Chat Toggle for Mobile -->
      <button id="mobile-chat-toggle-btn" title="Open World Chat">💬</button>

      <!-- Right Touch Area for Camera Pan -->
      <div id="mobile-camera-zone"></div>

      <!-- Virtual Joystick -->
      <div id="mobile-joystick-base">
        <div id="mobile-joystick-stick"></div>
      </div>

      <!-- Action Buttons Cluster with Clear Icons & Mini Labels -->
      <div class="mobile-action-cluster">
        <button class="m-btn" id="m-btn-attack" title="Attack">
          <span class="m-btn-icon">⚔️</span>
          <span class="m-btn-lbl">ATK</span>
        </button>
        <button class="m-btn" id="m-btn-jump" title="Jump">
          <span class="m-btn-icon">⏫</span>
          <span class="m-btn-lbl">JUMP</span>
        </button>
        <button class="m-btn" id="m-btn-skill1" title="Skill 1">
          <span class="m-btn-icon">🛡️</span>
          <span class="m-btn-lbl">SKL 1</span>
        </button>
        <button class="m-btn" id="m-btn-skill2" title="Skill 2">
          <span class="m-btn-icon">✨</span>
          <span class="m-btn-lbl">SKL 2</span>
        </button>
        <button class="m-btn" id="m-btn-mount" title="Wolf Mount">
          <span class="m-btn-icon">🐺</span>
          <span class="m-btn-lbl">WOLF</span>
        </button>
        <button class="m-btn" id="m-btn-potion" title="Heal Potion">
          <span class="m-btn-icon">🧪</span>
          <span class="m-btn-lbl">POT</span>
        </button>
        <button class="m-btn" id="m-btn-bag" title="Open Inventory">
          <span class="m-btn-icon">🎒</span>
          <span class="m-btn-lbl">BAG</span>
        </button>
        <button class="m-btn" id="m-btn-interact" title="Talk / Interact (E)">
          <span class="m-btn-icon">💬</span>
          <span class="m-btn-lbl">TALK</span>
        </button>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;

    this.joystickBase = document.getElementById('mobile-joystick-base');
    this.joystickStick = document.getElementById('mobile-joystick-stick');
    this.cameraZone = document.getElementById('mobile-camera-zone');
    this.chatToggleBtn = document.getElementById('mobile-chat-toggle-btn');

    // Chat Toggle Logic
    if (this.chatToggleBtn) {
      this.chatToggleBtn.addEventListener('click', () => {
        const chatPanel = document.getElementById('game-chat-panel');
        if (chatPanel) {
          chatPanel.classList.toggle('mobile-open');
          const input = document.getElementById('chat-input');
          if (chatPanel.classList.contains('mobile-open') && input) {
            setTimeout(() => input.focus(), 100);
          }
        }
      });
    }

    // Update Skill Icons based on Class
    if (this.skillSystem && this.skillSystem.skillsByRace) {
      const race = this.skillSystem.race || 'human';
      const skills = this.skillSystem.skillsByRace[race];
      if (skills) {
        const s1 = document.querySelector('#m-btn-skill1 .m-btn-icon');
        const s2 = document.querySelector('#m-btn-skill2 .m-btn-icon');
        if (s1 && skills.Q && skills.Q.icon) s1.innerText = skills.Q.icon;
        if (s2 && skills.E && skills.E.icon) s2.innerText = skills.E.icon;
      }
    }
  }

  bindTouchEvents() {
    // 1. Virtual Joystick
    const handleJoystickMove = (touchX, touchY) => {
      const rect = this.joystickBase.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = touchX - centerX;
      let dy = touchY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.maxRadius) {
        dx = (dx / dist) * this.maxRadius;
        dy = (dy / dist) * this.maxRadius;
      }

      this.joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;

      const normX = dx / this.maxRadius;
      const normY = dy / this.maxRadius;

      if (this.playerController) {
        this.playerController.joystickInput = { x: normX, y: normY };
        this.playerController.keys.shift = (dist > this.maxRadius * 0.75);
      }
    };

    const resetJoystick = () => {
      this.joystickStick.style.transform = `translate(0px, 0px)`;
      if (this.playerController) {
        this.playerController.joystickInput = { x: 0, y: 0 };
        this.playerController.keys.shift = false;
      }
      this.activeTouchId = null;
    };

    this.joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.activeTouchId = touch.identifier;
      handleJoystickMove(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.activeTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.activeTouchId) {
            handleJoystickMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
          }
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (this.activeTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.activeTouchId) {
            resetJoystick();
            break;
          }
        }
      }
    });

    window.addEventListener('touchcancel', () => resetJoystick());

    // 2. Camera Touch Pan Zone
    this.cameraZone.addEventListener('touchstart', (e) => {
      const touch = e.changedTouches[0];
      this.cameraTouchId = touch.identifier;
      this.lastCamX = touch.clientX;
      this.lastCamY = touch.clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.cameraTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.cameraTouchId) {
            const deltaX = t.clientX - this.lastCamX;
            const deltaY = t.clientY - this.lastCamY;
            this.lastCamX = t.clientX;
            this.lastCamY = t.clientY;

            if (this.playerController) {
              this.playerController.cameraYaw -= deltaX * 0.0055;
              this.playerController.cameraPitch -= deltaY * 0.0045;
              this.playerController.cameraPitch = Math.max(-0.15, Math.min(0.85, this.playerController.cameraPitch));
            }
            break;
          }
        }
      }
    }, { passive: true });

    const endCameraTouch = (e) => {
      if (this.cameraTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.cameraTouchId) {
            this.cameraTouchId = null;
            break;
          }
        }
      }
    };
    window.addEventListener('touchend', endCameraTouch);
    window.addEventListener('touchcancel', endCameraTouch);

    // 3. Action Buttons Bindings (Supports touch, pointer, and click!)
    const bindButton = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;

      const press = (e) => {
        if (e && e.cancelable) e.preventDefault();
        el.classList.add('pressed');
        if (onDown) onDown();
      };

      const release = (e) => {
        if (e && e.cancelable) e.preventDefault();
        el.classList.remove('pressed');
        if (onUp) onUp();
      };

      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') press(e);
      });
      el.addEventListener('pointerup', (e) => {
        if (e.pointerType !== 'touch') release(e);
      });
      el.addEventListener('click', (e) => {
        if (!el.classList.contains('pressed')) {
          press(e);
          setTimeout(() => release(e), 120);
        }
      });
    };

    // Attack
    bindButton('m-btn-attack', () => {
      if (this.playerController) {
        this.playerController.isAttackHolding = true;
        this.playerController.attack();
      }
    }, () => {
      if (this.playerController) {
        this.playerController.isAttackHolding = false;
      }
    });

    // Jump
    bindButton('m-btn-jump', () => {
      if (this.playerController) this.playerController.jump();
    });

    // Skill 1 (Q)
    bindButton('m-btn-skill1', () => {
      if (this.skillSystem) this.skillSystem.castSkill('Q');
    });

    // Skill 2 (E)
    bindButton('m-btn-skill2', () => {
      if (this.skillSystem) this.skillSystem.castSkill('E');
    });

    // Wolf Mount (T)
    bindButton('m-btn-mount', () => {
      const ms = this.mountSystem || window.gameMount;
      if (ms) {
        ms.toggleMount();
        const btn = document.getElementById('m-btn-mount');
        if (btn) {
          if (ms.isMounted) {
            btn.style.borderColor = '#fbbf24';
            btn.style.boxShadow = '0 0 16px #fbbf24';
          } else {
            btn.style.borderColor = '#38bdf8';
            btn.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.5)';
          }
        }
      }
    });

    // Healing Potion (1)
    bindButton('m-btn-potion', () => {
      if (this.combatSystem) this.combatSystem.usePotion();
    });

    // Bag (I)
    bindButton('m-btn-bag', () => {
      const bagModal = document.getElementById('inventory-modal');
      if (bagModal) {
        bagModal.style.display = bagModal.style.display === 'flex' ? 'none' : 'flex';
      }
    });

    // Talk / Interact (E)
    bindButton('m-btn-interact', () => {
      if (this.playerController) this.playerController.interact();
    });
  }

  show() {
    if (this.container) this.container.style.display = 'block';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }
}

window.MobileControls = MobileControls;
