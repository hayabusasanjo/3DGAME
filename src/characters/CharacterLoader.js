// CharacterLoader.js - Genuine 3D Animated Fantasy RPG Character Loader
// Supports Human (Knight), Elf (Mage), Dwarf (Barbarian), and Beastman (Rogue)
// Ensures correct weapon filtering, proper scaling, zero-ground alignment, and signature animations.

class CharacterLoader {
  constructor(scene) {
    this.scene = scene;
    this.gltfLoader = new THREE.GLTFLoader();

    // Root container that moves in world space
    this.characterGroup = new THREE.Group();
    this.characterGroup.name = 'PlayerRoot';
    this.scene.add(this.characterGroup);

    this.currentRace = 'human';
    this.currentGender = 'male';

    this.currentModel = null;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.currentActionName = 'idle';

    // Race-specific weapon filtering rules (KayKit Adventurers)
    // Only keep appropriate weapons/armor; hide cluttering duplicate items
    this.meshFilters = {
      human: {
        keep: ['Knight_Body', 'Knight_Head', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', 'Knight_Cape', 'Knight_Helmet', '1H_Sword', 'Round_Shield'],
        idleClip: 'Idle',
        attackClip: '1H_Melee_Attack_Slice_Horizontal'
      },
      elf: {
        keep: ['Mage_Body', 'Mage_Head', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_LegLeft', 'Mage_LegRight', 'Mage_Cape', 'Mage_Hat', '2H_Staff'],
        idleClip: '2H_Melee_Idle',
        attackClip: 'Spellcast_Shoot'
      },
      dwarf: {
        keep: ['Barbarian_Body', 'Barbarian_Head', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_LegLeft', 'Barbarian_LegRight', 'Barbarian_Cape', 'Barbarian_Hat', '2H_Axe'],
        idleClip: '2H_Melee_Idle',
        attackClip: '2H_Melee_Attack_Spin'
      },
      beastman: {
        keep: ['Rogue_Body', 'Rogue_Head', 'Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_LegLeft', 'Rogue_LegRight', 'Rogue_Cape', 'Knife', 'Knife_Offhand'],
        idleClip: 'Idle',
        attackClip: 'Dualwield_Melee_Attack_Slice'
      }
    };
  }

  loadRace(race, gender = 'male') {
    this.currentRace = race;
    this.currentGender = gender;

    const modelPath = `assets/models/${race}/${gender}.glb`;

    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        this.setupModel(gltf, race, gender);
      },
      undefined,
      (err) => {
        console.error('Error loading fantasy model:', err);
      }
    );
  }

  setupModel(gltf, race, gender) {
    // 1. Clear old model from container
    while (this.characterGroup.children.length > 0) {
      this.characterGroup.remove(this.characterGroup.children[0]);
    }
    this.actions = {};
    if (this.mixer) {
      this.mixer.stopAllAction();
    }

    const model = gltf.scene;
    this.currentModel = model;

    // 2. Filter Meshes: Hide extra weapons, duplicate shields, mugs, crossbows
    const filter = this.meshFilters[race] || this.meshFilters.human;
    model.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        if (filter.keep.includes(child.name)) {
          child.visible = true;
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.55;
            child.material.metalness = 0.2;
          }
        } else {
          // Hide conflicting weapons/shields
          child.visible = false;
        }
      }
    });

    // 3. Compute accurate bounding box of VISIBLE meshes only
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    let meshCount = 0;
    model.traverse((child) => {
      if ((child.isMesh || child.isSkinnedMesh) && child.visible) {
        if (child.geometry) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          box.expandByObject(child);
          meshCount++;
        }
      }
    });

    // Fallback if box is empty
    if (meshCount === 0 || box.isEmpty()) {
      box.setFromObject(model);
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 4. Heroic Proportions & Race Sizing
    // Human: 1.95m tall
    // Elf: 2.05m tall (tall, elegant)
    // Dwarf: 1.45m tall (stocky, broad shoulders, massive waraxe)
    // Beastman: 2.10m tall (muscular, imposing lupine berserker)
    let targetHeight = 1.95;
    let widthScale = 1.0;
    let depthScale = 1.0;

    if (race === 'dwarf') {
      targetHeight = 1.45;
      widthScale = 1.35;
      depthScale = 1.25;
    } else if (race === 'elf') {
      targetHeight = 2.05;
      widthScale = 0.95;
      depthScale = 0.95;
    } else if (race === 'beastman') {
      targetHeight = 2.10;
      widthScale = 1.18;
      depthScale = 1.15;
    } else if (race === 'human') {
      targetHeight = 1.95;
      widthScale = 1.0;
      depthScale = 1.0;
    }

    const scale = targetHeight / (size.y || 1);
    model.scale.set(scale * widthScale, scale, scale * depthScale);

    // 5. Zero-Ground Alignment:
    // Align model so that bottom of feet is at local y = 0 inside characterGroup.
    // Center horizontal pivot at (0, 0) for perfect spin in place without orbiting.
    model.position.set(
      -center.x * scale * widthScale,
      -box.min.y * scale,
      -center.z * scale * depthScale
    );

    // 6. Setup Skeletal Animation Mixer
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);

      gltf.animations.forEach((clip) => {
        this.actions[clip.name] = this.mixer.clipAction(clip);
      });

      // Play Race-Appropriate Default Idle
      const defaultIdle = this.actions[filter.idleClip] || this.actions['Idle'] || this.actions['Unarmed_Idle'];
      if (defaultIdle) {
        this.activeAction = defaultIdle;
        this.currentActionName = 'idle';
        this.activeAction.play();
      }
    }

    this.characterGroup.add(model);
  }

  // Crossfade smoothly between animations
  setAction(actionName) {
    if (!this.mixer) return;

    const filter = this.meshFilters[this.currentRace] || this.meshFilters.human;
    let targetClipName = 'Idle';
    let loopOnce = false;

    if (actionName === 'idle') {
      targetClipName = filter.idleClip || 'Idle';
      if (!this.actions[targetClipName]) targetClipName = 'Idle';
      if (!this.actions[targetClipName]) targetClipName = 'Unarmed_Idle';
    } else if (actionName === 'run') {
      targetClipName = this.actions['Running_A'] ? 'Running_A' : 'Walking_A';
    } else if (actionName === 'attack') {
      targetClipName = filter.attackClip || '1H_Melee_Attack_Slice_Horizontal';
      if (!this.actions[targetClipName]) targetClipName = '1H_Melee_Attack_Slice_Horizontal';
      if (!this.actions[targetClipName]) targetClipName = '1H_Melee_Attack_Chop';
      loopOnce = true;
    } else if (actionName === 'cheer') {
      targetClipName = this.actions['Cheer'] ? 'Cheer' : 'Interact';
      loopOnce = true;
    } else if (actionName === 'jump') {
      targetClipName = this.actions['Jump_Full_Short'] ? 'Jump_Full_Short' : 'Jump_Start';
      loopOnce = true;
    } else if (actionName === 'sit') {
      targetClipName = this.actions['Sit_Chair_Idle'] ? 'Sit_Chair_Idle' : (this.actions['Sit_Floor_Idle'] ? 'Sit_Floor_Idle' : 'Idle');
    } else if (actionName === 'stand') {
      targetClipName = this.actions['Sit_Chair_StandUp'] ? 'Sit_Chair_StandUp' : 'Idle';
      loopOnce = true;
    } else if (actionName === 'sleep') {
      targetClipName = this.actions['Lie_Idle'] ? 'Lie_Idle' : 'Idle';
    } else if (actionName === 'wake') {
      targetClipName = this.actions['Lie_StandUp'] ? 'Lie_StandUp' : 'Idle';
      loopOnce = true;
    }

    const targetAction = this.actions[targetClipName];
    if (!targetAction) return;

    if (this.currentActionName === actionName && targetAction.isRunning()) {
      return;
    }

    const prevAction = this.activeAction;
    if (prevAction && prevAction !== targetAction) {
      prevAction.fadeOut(0.15);
      setTimeout(() => {
        if (this.activeAction !== prevAction) {
          prevAction.stop();
        }
      }, 160);
    }

    targetAction.reset();
    targetAction.setEffectiveTimeScale(1);
    targetAction.setEffectiveWeight(1);
    targetAction.fadeIn(0.15);

    if (loopOnce) {
      targetAction.setLoop(THREE.LoopOnce, 1);
      targetAction.clampWhenFinished = false;
      targetAction.play();

      const onFinished = (e) => {
        if (e.action === targetAction) {
          this.mixer.removeEventListener('finished', onFinished);
          if (this.onActionComplete) {
            this.onActionComplete(actionName);
          } else if (this.currentActionName === actionName) {
            // Only return to idle if player hasn't already transitioned to run/walk
            this.setAction('idle');
          }
        }
      };
      this.mixer.addEventListener('finished', onFinished);
    } else {
      targetAction.setLoop(THREE.LoopRepeat, Infinity);
      targetAction.play();
    }

    this.activeAction = targetAction;
    this.currentActionName = actionName;
  }

  update(delta) {
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }
}

window.CharacterLoader = CharacterLoader;
