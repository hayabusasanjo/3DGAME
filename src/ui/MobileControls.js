// MobileControls.js - Touchscreen Virtual Joystick & Action Buttons Engine
// Supports Android, iOS, tablets, and mobile APK immersion.
// Features: 360-degree analog Virtual Joystick, Touch Camera Swipe,
// Rapid/Hold Attack, Skills, Jump, Mount, Potion & Inventory Buttons.

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

    this.joystickCenter = { x: 0, y: 0 };
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

        /* Virtual Joystick (Bottom Left) */
        #mobile-joystick-base {
          position: absolute;
          bottom: 36px;
          left: 36px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(56, 189, 248, 0.4);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: none;
        }
        #mobile-joystick-stick {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #38bdf8, #0284c7);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.7);
          border: 2px solid #e0f2fe;
          transform: translate(0px, 0px);
          pointer-events: none;
        }

        /* Action Buttons Cluster (Bottom Right) */
        .mobile-action-cluster {
          position: absolute;
          bottom: 28px;
          right: 28px;
          width: 200px;
          height: 200px;
          pointer-events: none;
        }

        .m-btn {
          position: absolute;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Segoe UI', sans-serif;
          font-weight: 800;
          pointer-events: auto;
          touch-action: none;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
          transition: transform 0.08s ease, filter 0.08s ease;
          border: 2px solid rgba(255, 255, 255, 0.25);
        }
        .m-btn:active, .m-btn.pressed {
          transform: scale(0.92);
          filter: brightness(1.25);
        }

        /* Main Big Attack Button */
        #m-btn-attack {
          bottom: 24px;
          right: 24px;
          width: 76px;
          height: 76px;
          background: radial-gradient(circle at 35% 35%, #f43f5e, #be123c);
          font-size: 32px;
          border-color: #fda4af;
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.65);
        }

        /* Jump Button */
        #m-btn-jump {
          bottom: 110px;
          right: 24px;
          width: 50px;
          height: 50px;
          background: rgba(30, 41, 59, 0.75);
          backdrop-filter: blur(8px);
          font-size: 20px;
          border-color: #94a3b8;
        }

        /* Skill 1 Button (Q) */
        #m-btn-skill1 {
          bottom: 84px;
          right: 90px;
          width: 52px;
          height: 52px;
          background: radial-gradient(circle at 35% 35%, #0ea5e9, #0369a1);
          font-size: 22px;
          border-color: #7dd3fc;
        }

        /* Skill 2 Button (E) */
        #m-btn-skill2 {
          bottom: 24px;
          right: 116px;
          width: 52px;
          height: 52px;
          background: radial-gradient(circle at 35% 35%, #8b5cf6, #6d28d9);
          font-size: 22px;
          border-color: #c4b5fd;
        }

        /* Quick Utility Bar (Top of Action Cluster) */
        #m-btn-mount {
          bottom: 148px;
          right: 88px;
          width: 44px;
          height: 44px;
          background: rgba(15, 23, 42, 0.8);
          font-size: 18px;
          border-color: #38bdf8;
        }
        #m-btn-potion {
          bottom: 148px;
          right: 144px;
          width: 44px;
          height: 44px;
          background: rgba(15, 23, 42, 0.8);
          font-size: 18px;
          border-color: #34d399;
        }

        /* Camera Swipe Touch Zone (Right Screen Half) */
        #mobile-camera-zone {
          position: fixed;
          top: 0;
          right: 0;
          width: 60%;
          height: 70%;
          pointer-events: auto;
          touch-action: none;
          z-index: 52;
        }
      </style>

      <!-- Right Touch Area for Camera Pan -->
      <div id="mobile-camera-zone"></div>

      <!-- Virtual Joystick -->
      <div id="mobile-joystick-base">
        <div id="mobile-joystick-stick"></div>
      </div>

      <!-- Action Buttons -->
      <div class="mobile-action-cluster">
        <button class="m-btn" id="m-btn-attack" title="Attack">⚔️</button>
        <button class="m-btn" id="m-btn-jump" title="Jump">🦘</button>
        <button class="m-btn" id="m-btn-skill1" title="Skill 1">🛡️</button>
        <button class="m-btn" id="m-btn-skill2" title="Skill 2">✨</button>
        <button class="m-btn" id="m-btn-mount" title="Wolf Mount">🐺</button>
        <button class="m-btn" id="m-btn-potion" title="Heal Potion">🧪</button>
      </div>
    `;

    document.body.appendChild(container);
    this.container = container;

    this.joystickBase = document.getElementById('mobile-joystick-base');
    this.joystickStick = document.getElementById('mobile-joystick-stick');
    this.cameraZone = document.getElementById('mobile-camera-zone');

    // Update Skill Icons based on Hero Class
    if (this.skillSystem && this.skillSystem.skillsByRace) {
      const race = this.skillSystem.race || 'human';
      const skills = this.skillSystem.skillsByRace[race];
      if (skills) {
        if (skills.Q && skills.Q.icon) document.getElementById('m-btn-skill1').innerText = skills.Q.icon;
        if (skills.E && skills.E.icon) document.getElementById('m-btn-skill2').innerText = skills.E.icon;
      }
    }
  }

  bindTouchEvents() {
    // 1. Virtual Joystick Touch Handler
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

      // Pass normalized movement vector to PlayerController
      const normX = dx / this.maxRadius;
      const normY = dy / this.maxRadius;

      if (this.playerController) {
        this.playerController.joystickInput = { x: normX, y: normY };
        // Auto sprint if pushed hard
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

    // 2. Touch Camera Pan Zone (Right Screen Half)
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

    // 3. Action Buttons Bindings
    const bindButton = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('pressed');
        if (onDown) onDown();
      }, { passive: false });

      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('pressed');
        if (onUp) onUp();
      }, { passive: false });
    };

    // Attack (Continuous on hold)
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
      if (this.mountSystem) this.mountSystem.toggleMount();
    });

    // Healing Potion (1)
    bindButton('m-btn-potion', () => {
      if (this.combatSystem) this.combatSystem.usePotion();
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
