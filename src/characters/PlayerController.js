// PlayerController.js - Heroic 3rd-Person WASD Character Controller
// Features Raycast Ground Detection (zero terrain sinking!), Solid Obstacle Colliders
// (sliding against trees, ruins, buildings), and Fence Vaulting (jump to clear fences).

class PlayerController {
  constructor(characterLoader, camera, domElement) {
    this.characterLoader = characterLoader;
    this.camera = camera;
    this.domElement = domElement;

    // World position and physics
    this.position = new THREE.Vector3(0, 0.05, 7.5); // Spawn in front of Town Fountain
    this.velocity = new THREE.Vector3();
    this.rotationY = Math.PI; // Face Guild Hall initially
    this.speed = 8.5;
    this.gravity = -26;
    this.isGrounded = true;
    this.isAttacking = false;
    this.isSitting = false;
    this.currentSeat = null;
    this.isSleeping = false;
    this.currentBed = null;

    // Over-the-Shoulder Heroic Camera Settings
    this.cameraYaw = 0;
    this.cameraPitch = 0.22;
    this.cameraDistance = 4.2;
    this.minDistance = 2.0;
    this.maxDistance = 6.8;
    this.isMouseDown = false;
    this.isAttackHolding = false;
    this.isRightMouseDown = false;

    // Dynamic Auto-Follow & Manual Look Priority
    this.lastManualCameraTime = 0;
    this.isManualCameraActive = false;

    // Smart Indoor Sanctuary Building Definitions (Zero Wall/Roof Clipping)
    this.indoorBuildings = [
      {
        name: 'guild',
        minX: -6.6, maxX: 6.6, minZ: -23.8, maxZ: -9.9,
        maxCamDist: 2.2, minPitch: 0.18, maxPitch: 0.36, ceilY: 4.2
      },
      {
        name: 'blacksmith',
        minX: -17.4, maxX: -11.6, minZ: -8.0, maxZ: -2.0,
        maxCamDist: 1.85, minPitch: 0.18, maxPitch: 0.35, ceilY: 3.4
      },
      {
        name: 'alchemist',
        minX: 11.6, maxX: 17.4, minZ: -8.0, maxZ: -2.0,
        maxCamDist: 1.85, minPitch: 0.18, maxPitch: 0.35, ceilY: 3.4
      },
      {
        name: 'tavern',
        minX: -16.8, maxX: -10.2, minZ: 5.6, maxZ: 11.4,
        maxCamDist: 1.85, minPitch: 0.18, maxPitch: 0.35, ceilY: 3.4
      },
      {
        name: 'store',
        minX: 10.2, maxX: 16.8, minZ: 5.6, maxZ: 11.4,
        maxCamDist: 1.85, minPitch: 0.18, maxPitch: 0.35, ceilY: 3.4
      }
    ];

    // Exterior Building Envelopes for Camera Anti-Clipping
    this.exteriorBuildingBoxes = [
      { minX: -7.2, maxX: 7.2, minZ: -24.4, maxZ: -9.8 }, // Guild Hall
      { minX: -17.6, maxX: -11.4, minZ: -8.2, maxZ: -1.8 }, // Blacksmith
      { minX: 11.4, maxX: 17.6, minZ: -8.2, maxZ: -1.8 },  // Alchemist
      { minX: -17.0, maxX: -10.0, minZ: 5.4, maxZ: 11.6 }, // Tavern
      { minX: 10.0, maxX: 17.0, minZ: 5.4, maxZ: 11.6 }   // Store
    ];

    // Raycast Ground Detection
    this.groundMeshes = [];
    this.raycaster = new THREE.Raycaster();
    this.rayDown = new THREE.Vector3(0, -1, 0);
    this.rayOrigin = new THREE.Vector3();

    // Solid World Obstacles (Trees, Ruins, Buildings, Fountain, Stalls)
    this.initObstacles();

    this.skillSystem = null;

    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
    this.bindInputs();

    // Hook loader action completion to return to running or idling
    this.characterLoader.onActionComplete = (actionName) => {
      if (actionName === 'attack' || actionName === 'jump') {
        this.isAttacking = false;
        if (actionName === 'attack' && this.isAttackHolding) {
          this.attack();
          return;
        }
        const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d ||
                         (this.joystickInput && (Math.abs(this.joystickInput.x) > 0.05 || Math.abs(this.joystickInput.y) > 0.05));
        if (this.isGrounded) {
          this.characterLoader.setAction(isMoving ? 'run' : 'idle');
        }
      }
    };
  }

  setGroundMeshes(meshes) {
    this.groundMeshes = meshes || [];
  }

  setSkillSystem(skillSystem) {
    this.skillSystem = skillSystem;
  }

  initObstacles() {
    this.obstacles = [
      // 1. Central Fountain (Town Plaza)
      { type: 'circle', x: 0, z: 0, radius: 2.7 },

      // 2. Grand Guild Hall Walls (Center at z = -17.0, entrance at z = -10.0)
      { type: 'box', minX: -7.0, maxX: 7.0, minZ: -24.2, maxZ: -23.6 }, // North Back Wall
      { type: 'box', minX: -7.2, maxX: -6.6, minZ: -24.0, maxZ: -10.0 }, // West Left Wall
      { type: 'box', minX: 6.6, maxX: 7.2, minZ: -24.0, maxZ: -10.0 },  // East Right Wall
      { type: 'box', minX: -7.0, maxX: -1.7, minZ: -10.4, maxZ: -9.8 },  // Front South Wall (Left of door)
      { type: 'box', minX: 1.7, maxX: 7.0, minZ: -10.4, maxZ: -9.8 },   // Front South Wall (Right of door)

      // Guild Hall Interior Furnishings
      { type: 'box', minX: -1.8, maxX: 1.8, minZ: -19.4, maxZ: -18.0 },  // Luna's Reception Counter
      { type: 'box', minX: 2.7, maxX: 4.5, minZ: -19.4, maxZ: -18.2 },   // Interior Quest Notice Board
      { type: 'box', minX: -5.4, maxX: -2.2, minZ: -14.8, maxZ: -13.2 }, // Tavern Table 1 (Left Front)
      { type: 'box', minX: -5.4, maxX: -2.2, minZ: -19.8, maxZ: -18.2 }, // Tavern Table 2 (Left Back)
      { type: 'box', minX: 2.2, maxX: 5.4, minZ: -14.8, maxZ: -13.2 },  // Tavern Table 3 (Right Front)
      { type: 'box', minX: -6.8, maxX: -5.4, minZ: -17.8, maxZ: -15.2 }, // Stone Fireplace & Hearth

      // 3. Spacious Town Districts (Walk-in 3D Buildings with Open Doorways)
      // West: Crafting & Armory Quarter (Blacksmith Borin) - Doorway open at x = -11.7, z: [-6.0, -4.0]
      { type: 'box', minX: -17.6, maxX: -17.2, minZ: -7.8, maxZ: -2.2 }, // Back West Wall
      { type: 'box', minX: -17.6, maxX: -11.6, minZ: -8.1, maxZ: -7.7 }, // North Wall
      { type: 'box', minX: -17.6, maxX: -11.6, minZ: -2.3, maxZ: -1.9 }, // South Wall
      { type: 'box', minX: -11.9, maxX: -11.5, minZ: -7.8, maxZ: -6.0 }, // Front East Wall (North panel)
      { type: 'box', minX: -11.9, maxX: -11.5, minZ: -4.0, maxZ: -2.2 }, // Front East Wall (South panel)
      { type: 'box', minX: -16.8, maxX: -15.2, minZ: -4.0, maxZ: -2.2 }, // Forge Hearth inside
      { type: 'circle', x: -14.3, z: -5.2, radius: 0.55 },               // Anvil on stump

      // East: Magic & Herbarium Quarter (Alchemist Elina) - Doorway open at x = 11.7, z: [-6.0, -4.0]
      { type: 'box', minX: 17.2, maxX: 17.6, minZ: -7.8, maxZ: -2.2 },  // Back East Wall
      { type: 'box', minX: 11.6, maxX: 17.6, minZ: -2.3, maxZ: -1.9 },  // South Wall
      { type: 'box', minX: 11.6, maxX: 17.6, minZ: -8.1, maxZ: -7.7 },  // North Wall
      { type: 'box', minX: 11.5, maxX: 11.9, minZ: -7.8, maxZ: -6.0 },  // Front West Wall (North panel)
      { type: 'box', minX: 11.5, maxX: 11.9, minZ: -4.0, maxZ: -2.2 },  // Front West Wall (South panel)
      { type: 'circle', x: 14.5, z: -5.0, radius: 0.65 },               // Cauldron inside

      // South-West: Tavern & Rest Quarter (Glenn the Barkeep & Inn Beds) - Doorway open at z = 5.8, x: [-14.6, -12.4]
      { type: 'box', minX: -16.8, maxX: -10.2, minZ: 11.0, maxZ: 11.4 }, // Back South Wall
      { type: 'box', minX: -16.9, maxX: -16.5, minZ: 5.8, maxZ: 11.4 },  // West Wall
      { type: 'box', minX: -10.5, maxX: -10.1, minZ: 5.8, maxZ: 11.4 },  // East Wall
      { type: 'box', minX: -16.8, maxX: -14.6, minZ: 5.6, maxZ: 6.0 },   // Front North Wall (West panel)
      { type: 'box', minX: -12.4, maxX: -10.2, minZ: 5.6, maxZ: 6.0 },   // Front North Wall (East panel)
      { type: 'box', minX: -16.2, maxX: -14.0, minZ: 8.8, maxZ: 9.4 },   // Bar Counter inside
      { type: 'box', minX: -12.4, maxX: -10.8, minZ: 8.6, maxZ: 10.8 },  // Deluxe Bed inside

      // South-East: General Merchant Store - Doorway open at z = 5.8, x: [12.4, 14.6]
      { type: 'box', minX: 10.2, maxX: 16.8, minZ: 11.0, maxZ: 11.4 },  // Back South Wall
      { type: 'box', minX: 10.1, maxX: 10.5, minZ: 5.8, maxZ: 11.4 },   // West Wall
      { type: 'box', minX: 16.5, maxX: 16.9, minZ: 5.8, maxZ: 11.4 },   // East Wall
      { type: 'box', minX: 10.2, maxX: 12.4, minZ: 5.6, maxZ: 6.0 },    // Front North Wall (West panel)
      { type: 'box', minX: 14.6, maxX: 16.8, minZ: 5.6, maxZ: 6.0 },    // Front North Wall (East panel)
      { type: 'box', minX: 11.8, maxX: 15.2, minZ: 9.0, maxZ: 9.6 },    // Store Counter inside

      // 4. Waystone Obelisks (Relocated out of the road!)
      { type: 'circle', x: 8.5, z: -1.0, radius: 1.4 },   // Plaza Garden Shrine Waystone
      { type: 'circle', x: -36.0, z: 48.0, radius: 1.2 }, // Slime Mire Waystone
      { type: 'circle', x: 36.0, z: 50.0, radius: 1.2 },  // Goblin Ridge Waystone
      { type: 'circle', x: -6.5, z: 82.0, radius: 1.2 },  // Caverns Mountain Pass Waystone

      // 5. Market Stalls
      { type: 'box', minX: -9.2, maxX: -6.4, minZ: 2.1, maxZ: 3.5 },
      { type: 'box', minX: 6.4, maxX: 9.2, minZ: 2.1, maxZ: 3.5 },

      // 6. South Gate Pillars
      { type: 'box', minX: -3.1, maxX: -1.7, minZ: 13.3, maxZ: 14.7 },
      { type: 'box', minX: 1.7, maxX: 3.1, minZ: 13.3, maxZ: 14.7 },

      // 7. Town Trees
      { type: 'circle', x: -11, z: -12, radius: 0.75 },
      { type: 'circle', x: 11, z: -12, radius: 0.75 },
      { type: 'circle', x: -15, z: 1.5, radius: 0.75 },
      { type: 'circle', x: 15, z: 1.5, radius: 0.75 },

      // 8. Whispering Plains Trees
      { type: 'circle', x: -14, z: 26, radius: 0.8 },
      { type: 'circle', x: 15, z: 28, radius: 0.8 },
      { type: 'circle', x: -22, z: 38, radius: 0.8 },
      { type: 'circle', x: 24, z: 42, radius: 0.8 },
      { type: 'circle', x: -18, z: 62, radius: 0.8 },
      { type: 'circle', x: 22, z: 66, radius: 0.8 },
      { type: 'circle', x: -8, z: 76, radius: 0.8 },
      { type: 'circle', x: 12, z: 80, radius: 0.8 },

      // 9. Ancient Stone Ruins in Plains Center
      { type: 'box', minX: -5.3, maxX: -3.7, minZ: 47.2, maxZ: 48.8 }, // Left Pillar
      { type: 'box', minX: 3.7, maxX: 5.3, minZ: 47.2, maxZ: 48.8 },  // Right Pillar
      { type: 'circle', x: 3.2, z: 50.4, radius: 1.3 },               // Fallen monolith chunk

      // 10. Open World Landmark Obstacles
      { type: 'circle', x: 51.5, z: 53.5, radius: 1.8 },               // Goblin Camp Watchtower
      { type: 'circle', x: 45.0, z: 58.0, radius: 1.1 },               // Goblin Camp Fire Pit
      { type: 'circle', x: -45.0, z: 55.0, radius: 2.2 },              // Slime Mire Sunken Basin Center

      // 11. Wooden Trail Signposts
      { type: 'circle', x: 2.2, z: 16.5, radius: 0.4 },
      { type: 'circle', x: -2.5, z: 50.8, radius: 0.4 },

      // 12. Mystic Crystal Caverns Obstacles (z = 88 to 148)
      { type: 'circle', x: 0, z: 144, radius: 2.2 },                  // Grand Central Crystal Sanctum
      { type: 'box', minX: -1.0, maxX: 1.0, minZ: 125.0, maxZ: 127.0 }, // Abandoned Minecart
      { type: 'circle', x: -18, z: 116, radius: 1.4 },                // Bioluminescent Cyan Crystal Spire Left
      { type: 'circle', x: 16, z: 122, radius: 1.4 }                  // Bioluminescent Purple Crystal Spire Right
    ];
  }

  getGroundHeight(x, z) {
    if (!this.groundMeshes || this.groundMeshes.length === 0) {
      return 0.05;
    }
    this.rayOrigin.set(x, 40, z);
    this.raycaster.set(this.rayOrigin, this.rayDown);
    const hits = this.raycaster.intersectObjects(this.groundMeshes, false);
    if (hits.length > 0) {
      return hits[0].point.y;
    }
    return 0.05;
  }

  getCurrentIndoorBuilding() {
    const px = this.position.x;
    const pz = this.position.z;
    for (let i = 0; i < this.indoorBuildings.length; i++) {
      const b = this.indoorBuildings[i];
      if (px >= b.minX && px <= b.maxX && pz >= b.minZ && pz <= b.maxZ) {
        return b;
      }
    }
    return null;
  }

  checkCameraWallCollision(px, pz, cx, cz) {
    let closestFraction = 1.0;
    const dx = cx - px;
    const dz = cz - pz;
    if (Math.abs(dx) < 0.0001 && Math.abs(dz) < 0.0001) return { x: cx, z: cz };

    const camPad = 0.35;
    for (let i = 0; i < this.exteriorBuildingBoxes.length; i++) {
      const b = this.exteriorBuildingBoxes[i];
      const minX = b.minX - camPad;
      const maxX = b.maxX + camPad;
      const minZ = b.minZ - camPad;
      const maxZ = b.maxZ + camPad;

      let t0 = 0.0;
      let t1 = 1.0;

      if (Math.abs(dx) > 0.00001) {
        let tNear = (minX - px) / dx;
        let tFar = (maxX - px) / dx;
        if (tNear > tFar) { const tmp = tNear; tNear = tFar; tFar = tmp; }
        t0 = Math.max(t0, tNear);
        t1 = Math.min(t1, tFar);
        if (t0 > t1) continue;
      } else {
        if (px < minX || px > maxX) continue;
      }

      if (Math.abs(dz) > 0.00001) {
        let tNear = (minZ - pz) / dz;
        let tFar = (maxZ - pz) / dz;
        if (tNear > tFar) { const tmp = tNear; tNear = tFar; tFar = tmp; }
        t0 = Math.max(t0, tNear);
        t1 = Math.min(t1, tFar);
        if (t0 > t1) continue;
      } else {
        if (pz < minZ || pz > maxZ) continue;
      }

      if (t0 > 0.001 && t0 < closestFraction) {
        closestFraction = t0;
      }
    }

    if (closestFraction < 1.0) {
      const safeFraction = Math.max(0.12, closestFraction * 0.90);
      return {
        x: px + dx * safeFraction,
        z: pz + dz * safeFraction
      };
    }
    return { x: cx, z: cz };
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.w = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.s = true; break;
        case 'KeyA': case 'ArrowLeft': this.keys.a = true; break;
        case 'KeyD': case 'ArrowRight': this.keys.d = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.shift = true; break;
        case 'Space':
          this.jump();
          break;
        case 'KeyF':
        case 'KeyJ':
          this.isAttackHolding = true;
          this.attack();
          break;
        case 'KeyK':
          if (this.skillSystem) {
            this.skillSystem.castSkill('Q');
          }
          break;
        case 'KeyL':
          if (this.skillSystem) {
            this.skillSystem.castSkill('E');
          }
          break;
        case 'AltLeft':
        case 'AltRight':
          if (document.pointerLockElement === this.domElement) {
            document.exitPointerLock();
          } else {
            this.domElement.requestPointerLock();
          }
          break;
        case 'KeyQ':
          if (this.skillSystem) {
            this.skillSystem.castSkill('Q');
          }
          break;
        case 'KeyE': {
          this.interact();
          break;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.w = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.s = false; break;
        case 'KeyA': case 'ArrowLeft': this.keys.a = false; break;
        case 'KeyD': case 'ArrowRight': this.keys.d = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; break;
        case 'KeyF': case 'KeyJ': this.isAttackHolding = false; break;
      }
    });

    // Disable browser context menu on canvas for Right-Click combat
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // 1-Click Action Camera / Pointer Lock Engagement (Parang Genshin / Minecraft)
    this.domElement.addEventListener('click', (e) => {
      if (e.target.closest('#game-hud, #dialog-box, #card-modal, #game-chat-panel, #save-menu-modal')) return;
      if (document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      const isLocked = (document.pointerLockElement === this.domElement);
      const reticle = document.getElementById('rpg-crosshair');
      if (reticle) {
        if (isLocked) reticle.classList.add('locked');
        else reticle.classList.remove('locked');
      }
    });

    // Action Combat Mouse Clicks (Left = Continuous Attack, Right = Skill 1)
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.target.closest('#game-hud, #dialog-box, #card-modal, #game-chat-panel, #save-menu-modal')) return;

      if (document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
      }

      if (e.button === 0) {
        this.isAttackHolding = true;
        if (!this.isAttacking) {
          this.attack();
        }
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
        if (this.skillSystem) {
          this.skillSystem.castSkill('Q');
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isAttackHolding = false;
      } else if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    // Butter-Smooth Mouse Movement (No dragging required when locked!)
    window.addEventListener('mousemove', (e) => {
      const isLocked = (document.pointerLockElement === this.domElement);
      if (isLocked || this.isRightMouseDown) {
        if (Math.abs(e.movementX || 0) > 0 || Math.abs(e.movementY || 0) > 0) {
          this.lastManualCameraTime = Date.now();
        }
        this.cameraYaw -= (e.movementX || 0) * 0.0028;
        this.cameraPitch -= (e.movementY || 0) * 0.0022;
        this.cameraPitch = Math.max(-0.15, Math.min(0.85, this.cameraPitch));
      }
    });

    // Zoom Camera with Scroll Wheel
    window.addEventListener('wheel', (e) => {
      if (e.target.closest('#game-hud, #dialog-box, #card-modal, #game-chat-panel')) return;
      this.lastManualCameraTime = Date.now();
      this.cameraDistance = Math.max(
        this.minDistance,
        Math.min(this.maxDistance, this.cameraDistance + e.deltaY * 0.004)
      );
    }, { passive: true });
  }

  interact() {
    if (this.isSitting) {
      this.standUp();
      return;
    }
    if (this.isSleeping) {
      this.wakeUp();
      return;
    }
    const hud = window.gameHUD;
    const canInteractWithTarget = (this.canInteract && this.canInteract()) ||
      (hud && (hud.isNearNpc || hud.isNearBoard || hud.isNearBlacksmith ||
               hud.isNearGuard || hud.isNearAlchemist || hud.isNearBarkeep ||
               hud.isNearVillagerArthur || hud.isNearVillagerAria || hud.isNearVillagerTom || hud.isNearWaystone ||
               hud.nearbyChair || hud.nearbyBed));
    if (canInteractWithTarget) {
      if (this.onInteract) this.onInteract();
    } else if (this.skillSystem) {
      this.skillSystem.castSkill('E');
    } else if (this.onInteract) {
      this.onInteract();
    }
  }

  jump() {
    if (this.isSitting) {
      this.standUp();
      return;
    }
    if (this.isSleeping) {
      this.wakeUp();
      return;
    }
    if (this.isGrounded && !this.isAttacking) {
      this.velocity.y = 10.5;
      this.isGrounded = false;
      this.characterLoader.setAction('jump');
    }
  }

  attack() {
    if (this.isSitting) {
      this.standUp();
      return;
    }
    if (this.isSleeping) {
      this.wakeUp();
      return;
    }
    this.isAttacking = true;
    this.characterLoader.setAction('attack');

    const reticle = document.getElementById('rpg-crosshair');
    if (reticle) {
      reticle.classList.add('attacking');
      setTimeout(() => reticle.classList.remove('attacking'), 180);
    }
  }

  sitDown(seat) {
    if (this.isSitting || this.isSleeping || !seat) return;
    this.isSitting = true;
    this.currentSeat = seat;
    const floorY = this.getGroundHeight(seat.pos.x, seat.pos.z);
    const seatRot = seat.rot !== undefined ? seat.rot : 0;
    this.rotationY = seatRot;

    // The 'sit' clip naturally places hips ~0.40m behind the model root.
    // By offsetting the root forward along seatRot, the hips land dead-center on the seat surface.
    const fwdX = Math.sin(seatRot) * 0.40;
    const fwdZ = Math.cos(seatRot) * 0.40;
    this.position.set(seat.pos.x + fwdX, floorY, seat.pos.z + fwdZ);

    const root = this.characterLoader.characterGroup;
    if (root) {
      root.position.copy(this.position);
      root.rotation.y = this.rotationY;
    }
    this.characterLoader.setAction('sit');
    if (window.gameHUD) {
      window.gameHUD.showSimpleToast(`🛋️ Seated on ${seat.name || 'Chair'}. Press [W/A/S/D] or [Space] to stand up.`);
    }
  }

  standUp() {
    if (!this.isSitting) return;
    this.isSitting = false;
    this.currentSeat = null;

    // Immediately stop sitting clips so all leg and hip bone transforms are completely released
    if (this.characterLoader && this.characterLoader.actions) {
      if (this.characterLoader.actions['Sit_Chair_Idle']) this.characterLoader.actions['Sit_Chair_Idle'].stop();
      if (this.characterLoader.actions['Sit_Floor_Idle']) this.characterLoader.actions['Sit_Floor_Idle'].stop();
    }

    const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;
    if (isMoving) {
      this.characterLoader.setAction('run');
    } else {
      this.characterLoader.setAction('stand');
    }
  }

  sleepInBed(bed, combatSystem, environmentSystem) {
    if (this.isSitting || this.isSleeping || !bed) return;
    this.isSleeping = true;
    this.currentBed = bed;
    this.position.set(bed.pos.x, bed.pos.y, bed.pos.z);
    if (bed.rot !== undefined) {
      this.rotationY = bed.rot;
    }
    const root = this.characterLoader.characterGroup;
    if (root) {
      root.position.copy(this.position);
      root.rotation.y = this.rotationY;
    }
    this.characterLoader.setAction('sleep');

    // Restores 100% HP & MP
    if (combatSystem) {
      combatSystem.hp = combatSystem.maxHp;
      combatSystem.mp = combatSystem.maxMp;
    }
    if (window.soundFX && window.soundFX.playRestHarp) {
      window.soundFX.playRestHarp();
    }

    if (window.gameHUD) {
      window.gameHUD.updateStatusUI();
      window.gameHUD.triggerRestFade();
      window.gameHUD.showSimpleToast(`💤 Rested peacefully in ${bed.name || 'Bed'}... 100% HP and MP restored! Press [W/A/S/D] or [Space] to wake up.`);
    }
  }

  wakeUp() {
    if (!this.isSleeping) return;
    this.isSleeping = false;
    this.currentBed = null;

    if (this.characterLoader && this.characterLoader.actions) {
      if (this.characterLoader.actions['Lie_Idle']) this.characterLoader.actions['Lie_Idle'].stop();
      if (this.characterLoader.actions['Lie_Pose']) this.characterLoader.actions['Lie_Pose'].stop();
    }

    const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;
    if (isMoving) {
      this.characterLoader.setAction('run');
    } else {
      this.characterLoader.setAction('wake');
    }
  }

  resolveCollisions(prevX, prevZ, groundY) {
    const pRadius = 0.45; // Hero collision radius

    // 1. Solid World Obstacles (Trees, Ruins, Buildings, Fountain, Stalls)
    for (let obs of this.obstacles) {
      if (obs.type === 'circle') {
        const dx = this.position.x - obs.x;
        const dz = this.position.z - obs.z;
        const distSq = dx * dx + dz * dz;
        const minDist = obs.radius + pRadius;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          this.position.x += (dx / dist) * overlap;
          this.position.z += (dz / dist) * overlap;
        }
      } else if (obs.type === 'box') {
        const cx = Math.max(obs.minX, Math.min(this.position.x, obs.maxX));
        const cz = Math.max(obs.minZ, Math.min(this.position.z, obs.maxZ));
        const dx = this.position.x - cx;
        const dz = this.position.z - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < pRadius * pRadius) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = pRadius - dist;
          if (dist > 0.001) {
            this.position.x += (dx / dist) * overlap;
            this.position.z += (dz / dist) * overlap;
          } else {
            const dLeft = Math.abs(this.position.x - obs.minX);
            const dRight = Math.abs(this.position.x - obs.maxX);
            const dTop = Math.abs(this.position.z - obs.minZ);
            const dBottom = Math.abs(this.position.z - obs.maxZ);
            const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
            if (minEdge === dLeft) this.position.x = obs.minX - pRadius;
            else if (minEdge === dRight) this.position.x = obs.maxX + pRadius;
            else if (minEdge === dTop) this.position.z = obs.minZ - pRadius;
            else this.position.z = obs.maxZ + pRadius;
          }
        }
      }
    }

    // 2. Impenetrable Enclosed Town Building Envelopes with Doorway Passes
    const buildings = [
      {
        name: 'blacksmith',
        minX: -17.4, maxX: -11.6, minZ: -8.0, maxZ: -2.0,
        doorAxis: 'x', doorVal: -11.6, doorMin: -6.0, doorMax: -4.0
      },
      {
        name: 'alchemist',
        minX: 11.6, maxX: 17.4, minZ: -8.0, maxZ: -2.0,
        doorAxis: 'x', doorVal: 11.6, doorMin: -6.0, doorMax: -4.0
      },
      {
        name: 'tavern',
        minX: -16.8, maxX: -10.2, minZ: 5.6, maxZ: 11.4,
        doorAxis: 'z', doorVal: 5.6, doorMin: -14.6, doorMax: -12.4
      },
      {
        name: 'store',
        minX: 10.2, maxX: 16.8, minZ: 5.6, maxZ: 11.4,
        doorAxis: 'z', doorVal: 5.6, doorMin: 12.4, doorMax: 14.6
      }
    ];

    for (let b of buildings) {
      const wasInside = prevX > b.minX && prevX < b.maxX && prevZ > b.minZ && prevZ < b.maxZ;
      const isInside = this.position.x > b.minX && this.position.x < b.maxX && this.position.z > b.minZ && this.position.z < b.maxZ;

      if (wasInside) {
        // Player was inside: can ONLY exit through open doorway
        if (!isInside) {
          let throughDoor = false;
          if (b.doorAxis === 'z') {
            throughDoor = prevX >= b.doorMin && prevX <= b.doorMax && Math.abs(this.position.z - b.doorVal) < 1.4;
          } else {
            throughDoor = prevZ >= b.doorMin && prevZ <= b.doorMax && Math.abs(this.position.x - b.doorVal) < 1.4;
          }
          if (!throughDoor) {
            // Keep player safely inside the room
            this.position.x = Math.max(b.minX + pRadius, Math.min(b.maxX - pRadius, this.position.x));
            this.position.z = Math.max(b.minZ + pRadius, Math.min(b.maxZ - pRadius, this.position.z));
          }
        }
      } else {
        // Player was outside: can ONLY enter through open doorway
        if (isInside) {
          let throughDoor = false;
          if (b.doorAxis === 'z') {
            throughDoor = prevX >= b.doorMin && prevX <= b.doorMax;
          } else {
            throughDoor = prevZ >= b.doorMin && prevZ <= b.doorMax;
          }
          if (!throughDoor) {
            // Push player back to outside side
            this.position.x = prevX;
            this.position.z = prevZ;
          }
        }
      }
    }

    // 3. Wooden Guide Fences (Bakod) with Jump Vaulting Mechanic!
    // Fences run along x = -2.8 and x = +2.8 from z = 15.5 to 42.5.
    // If the player jumps above the fence rail (y > groundY + 0.85m), they CAN pass over!
    // If the player is walking on the ground, the fence acts as a solid barrier.
    const fenceTopY = groundY + 0.85;
    const isVaultingOverFence = this.position.y > fenceTopY;

    if (!isVaultingOverFence && this.position.z >= 15.5 && this.position.z <= 42.5) {
      // Left Fence (x = -2.8)
      if (prevX >= -2.8 && this.position.x < -2.35) {
        this.position.x = -2.35; // Blocked inside trail
      } else if (prevX <= -2.8 && this.position.x > -3.25) {
        this.position.x = -3.25; // Blocked outside in meadow
      }

      // Right Fence (x = +2.8)
      if (prevX <= 2.8 && this.position.x > 2.35) {
        this.position.x = 2.35; // Blocked inside trail
      } else if (prevX >= 2.8 && this.position.x < 3.25) {
        this.position.x = 3.25; // Blocked outside in meadow
      }
    }
  }

  update(delta) {
    const root = this.characterLoader.characterGroup;
    if (!root) return;

    // Handle Sitting & Sleeping Input (WASD or Space to stand/wake)
    if (this.isSitting) {
      if (this.keys.w || this.keys.s || this.keys.a || this.keys.d || this.keys.space) {
        this.standUp();
      }
      return;
    }

    if (this.isSleeping) {
      if (this.keys.w || this.keys.s || this.keys.a || this.keys.d || this.keys.space) {
        this.wakeUp();
      }
      return;
    }

    // 1. Calculate WASD Direction Vector relative to Camera Yaw
    const moveInput = new THREE.Vector3();
    if (this.keys.w) moveInput.z -= 1;
    if (this.keys.s) moveInput.z += 1;
    if (this.keys.a) moveInput.x -= 1;
    if (this.keys.d) moveInput.x += 1;

    if (this.joystickInput && (this.joystickInput.x !== 0 || this.joystickInput.y !== 0)) {
      moveInput.x = this.joystickInput.x;
      moveInput.z = this.joystickInput.y;
    }

    const isMoving = moveInput.lengthSq() > 0.001;
    if (isMoving && moveInput.lengthSq() > 1) moveInput.normalize();

    const currentSpeed = this.keys.shift ? this.speed * 1.5 : this.speed;

    const moveDir = new THREE.Vector3();
    moveDir.x = moveInput.x * Math.cos(this.cameraYaw) + moveInput.z * Math.sin(this.cameraYaw);
    moveDir.z = -moveInput.x * Math.sin(this.cameraYaw) + moveInput.z * Math.cos(this.cameraYaw);

    // Apply movement velocity
    this.velocity.x = moveDir.x * currentSpeed;
    this.velocity.z = moveDir.z * currentSpeed;

    const prevX = this.position.x;
    const prevZ = this.position.z;

    // 2. Physics: Move Horizontal & Apply Gravity
    this.velocity.y += this.gravity * delta;
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // 3. Raycast Ground Detection (Millimeter-accurate surface height!)
    const groundY = this.getGroundHeight(this.position.x, this.position.z);

    // Snap to ground when grounded or descending onto ground
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 4. Resolve Obstacle Collisions & Fence Jump Mechanics
    this.resolveCollisions(prevX, prevZ, groundY);

    // 5. Impenetrable Mountain Face & Cavern Portal Boundary (z = 85.5 to 88.0)
    // The ONLY path connecting Whispering Plains to Mystic Caverns is the Cave Mouth Archway (|x| <= 3.2).
    // All other mountain regions across x = -70 to 70 are solid rock.
    const isInsideDoorwayX = Math.abs(this.position.x) <= 3.2;

    if (prevZ < 85.5 && this.position.z >= 85.5) {
      // Crossing from Whispering Plains towards Dungeon:
      if (!isInsideDoorwayX) {
        this.position.z = 85.5; // Impenetrable mountain cliff wall
      }
    } else if (prevZ >= 88.0 && this.position.z < 88.0) {
      // Crossing from inside Dungeon back towards Plains:
      if (!isInsideDoorwayX) {
        this.position.z = 88.0; // Blocked by interior rock face
      }
    }

    if (this.position.z >= 88.0) {
      // INSIDE MYSTIC CRYSTAL CAVERNS (DUNGEON LEVEL 5+)
      // Cavern tunnel walls (|x| <= 16.5) and Boss Sanctum rear wall (z <= 147.0)
      this.position.x = Math.max(-16.5, Math.min(16.5, this.position.x));
      this.position.z = Math.min(147.0, this.position.z);

      // Exiting cave: can ONLY exit through the archway doorway
      if (this.position.z < 88.0 && !isInsideDoorwayX) {
        this.position.z = 88.0;
      }
    } else if (this.position.z > 14.5) {
      // In Whispering Plains (Wide multi-directional open-world hunting field)
      this.position.x = Math.max(-66.0, Math.min(66.0, this.position.x));

      // Blocked at mountain cliff face unless entering cave portal
      if (this.position.z > 85.5 && !isInsideDoorwayX) {
        this.position.z = 85.5;
      }

      // Prevent walking backwards through town walls unless aligned with gate archway
      if (this.position.z < 14.8 && Math.abs(this.position.x) > 1.8) {
        this.position.z = 14.8;
      }
    } else if (this.position.z < -9.8 && Math.abs(this.position.x) < 6.8) {
      // INSIDE GRAND GUILD HALL!
      this.position.x = Math.max(-6.4, Math.min(6.4, this.position.x));
      this.position.z = Math.max(-23.4, Math.min(-9.9, this.position.z));
    } else {
      // In Capital Town Plaza
      const inGateCorridor = Math.abs(this.position.x) <= 1.8 && this.position.z >= 12.0;
      const inGuildCorridor = Math.abs(this.position.x) <= 1.6 && this.position.z <= -9.2;

      if (!inGateCorridor && !inGuildCorridor) {
        const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (distFromCenter > 22.0) {
          const angle = Math.atan2(this.position.z, this.position.x);
          this.position.x = Math.cos(angle) * 22.0;
          this.position.z = Math.sin(angle) * 22.0;
        }
      }
    }

    // 6. Apply Position to Character Root Container (Elevated on Mount Saddle when riding)
    const isRiding = this.isRidingMount || (window.gameMount && window.gameMount.isMounted);
    const riderOffsetY = isRiding ? 0.58 : 0;
    const fwdX = isRiding ? Math.sin(this.rotationY) * 0.45 : 0;
    const fwdZ = isRiding ? Math.cos(this.rotationY) * 0.45 : 0;
    root.position.set(this.position.x + fwdX, this.position.y + riderOffsetY, this.position.z + fwdZ);
    root.rotation.y = this.rotationY;

    // 7. Smooth Rotation without 360-spin glitch (Shortest angular difference)
    if (isMoving) {
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let diff = (targetAngle - this.rotationY) % (Math.PI * 2);
      if (diff < -Math.PI) diff += Math.PI * 2;
      if (diff > Math.PI) diff -= Math.PI * 2;
      this.rotationY += diff * Math.min(1, 14 * delta);
      root.rotation.y = this.rotationY;

      // Dynamic Auto-Follow Camera: Automatically swing camera behind player's movement
      const now = Date.now();
      const isManualControlling = this.isManualCameraActive || (now - this.lastManualCameraTime < 900);

      if (!isManualControlling) {
        // Desired camera yaw is directly behind movement vector
        const desiredCamYaw = Math.atan2(-moveDir.x, -moveDir.z);
        let camDiff = (desiredCamYaw - this.cameraYaw) % (Math.PI * 2);
        if (camDiff < -Math.PI) camDiff += Math.PI * 2;
        if (camDiff > Math.PI) camDiff -= Math.PI * 2;

        const absDiff = Math.abs(camDiff);
        if (absDiff > 0.015) {
          // Dynamic responsive turn speed: fast on U-turns, smooth on gentle steering
          const followSpeed = (absDiff > 1.8) ? 4.5 : (absDiff > 0.8 ? 3.2 : 2.2);
          this.cameraYaw += camDiff * Math.min(1.0, followSpeed * delta);
        }
      }

      if (isRiding) {
        if (this.characterLoader.currentActionName !== 'sit') {
          this.characterLoader.setAction('sit');
        }
      } else if (!this.isAttacking) {
        if (this.isGrounded) {
          if (this.characterLoader.currentActionName !== 'run') {
            this.characterLoader.setAction('run');
          }
        } else {
          if (this.characterLoader.currentActionName !== 'jump') {
            this.characterLoader.setAction('jump');
          }
        }
      }
    } else {
      if (isRiding) {
        if (this.characterLoader.currentActionName !== 'sit') {
          this.characterLoader.setAction('sit');
        }
      } else if (!this.isAttacking) {
        if (this.isGrounded) {
          if (this.characterLoader.currentActionName === 'run') {
            this.characterLoader.setAction('idle');
          }
        }
      }
    }

    // 8. Smart Dynamic Heroic Camera Follow (Intelligent Indoor Anti-Clipping Bounds)
    const indoor = this.getCurrentIndoorBuilding();
    const isInsideDungeon = this.position.z >= 88.0;

    let targetCamDist = this.cameraDistance;
    let targetPitch = this.cameraPitch;

    if (indoor) {
      targetCamDist = Math.min(indoor.maxCamDist, this.cameraDistance);
      targetPitch = Math.max(indoor.minPitch, Math.min(indoor.maxPitch, this.cameraPitch));
    } else if (isInsideDungeon) {
      targetCamDist = Math.min(3.6, this.cameraDistance);
      targetPitch = Math.max(0.12, Math.min(0.42, this.cameraPitch));
    }

    const targetY = this.position.y + 1.25;
    let cx = this.position.x + Math.sin(this.cameraYaw) * Math.cos(targetPitch) * targetCamDist;
    let cy = targetY + Math.sin(targetPitch) * targetCamDist;
    let cz = this.position.z + Math.cos(this.cameraYaw) * Math.cos(targetPitch) * targetCamDist;

    if (indoor) {
      // 100% Guaranteed Indoor Sanctuary: Camera CANNOT leave the interior room!
      const pad = 0.45;
      cx = Math.max(indoor.minX + pad, Math.min(indoor.maxX - pad, cx));
      cz = Math.max(indoor.minZ + pad, Math.min(indoor.maxZ - pad, cz));
      cy = Math.min(cy, indoor.ceilY - 0.25);

      // Instant boundary containment: prevent any frame from showing exterior walls
      this.camera.position.x = Math.max(indoor.minX + pad, Math.min(indoor.maxX - pad, this.camera.position.x));
      this.camera.position.z = Math.max(indoor.minZ + pad, Math.min(indoor.maxZ - pad, this.camera.position.z));
      this.camera.position.y = Math.min(this.camera.position.y, indoor.ceilY - 0.25);
    } else if (isInsideDungeon) {
      // Cavern tunnel boundary clamp
      cx = Math.max(-15.8, Math.min(15.8, cx));
      cz = Math.max(88.2, Math.min(146.5, cz));
    } else {
      // When outside in town or plains: check exterior wall collision so camera never penetrates building walls!
      const safeExterior = this.checkCameraWallCollision(this.position.x, this.position.z, cx, cz);
      cx = safeExterior.x;
      cz = safeExterior.z;
    }

    // Ensure camera stays comfortably above local ground terrain
    const camGroundY = this.getGroundHeight(cx, cz);
    const safeCy = Math.max(cy, camGroundY + 0.65);

    // Smooth camera spring-arm interpolation
    const lerpRate = indoor ? 22 : 16;
    this.camera.position.lerp(new THREE.Vector3(cx, safeCy, cz), lerpRate * delta);
    this.camera.lookAt(this.position.x, targetY, this.position.z);
  }
}

window.PlayerController = PlayerController;
