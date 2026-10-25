// DamageText.js - Stylized Floating RPG Damage Numbers & Particle Hit Sparks
// Renders dynamic 3D-projected floating numbers with anime bounce & glowing hit sparks.

class DamageSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.activeNumbers = [];
    this.sparks = [];

    // Create container for floating damage numbers
    this.container = document.createElement('div');
    this.container.id = 'damage-numbers-layer';
    this.container.style.position = 'fixed';
    this.container.style.inset = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.overflow = 'hidden';
    this.container.style.zIndex = '80';
    document.body.appendChild(this.container);

    // Reuse spark geometry
    this.sparkGeo = new THREE.BufferGeometry();
    const count = 16;
    const pos = new Float32Array(count * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }

  // Spawn a floating damage number in world space
  spawnNumber(worldPos, damage, type = 'normal') {
    const el = document.createElement('div');
    el.className = `floating-dmg dmg-${type}`;
    
    let text = `${Math.round(damage)}`;
    let color = '#fbbf24'; // Golden yellow
    let fontSize = '22px';
    let scale = 1.0;

    if (type === 'crit') {
      text = `CRIT! ${Math.round(damage)}`;
      color = '#ef4444'; // Fiery red
      fontSize = '28px';
      scale = 1.25;
    } else if (type === 'player-hurt') {
      text = `-${Math.round(damage)}`;
      color = '#f87171'; // Red
      fontSize = '24px';
    } else if (type === 'heal') {
      text = `+${Math.round(damage)}`;
      color = '#34d399'; // Emerald
      fontSize = '22px';
    }

    el.innerText = text;
    el.style.cssText = `
      position: absolute;
      transform: translate(-50%, -50%) scale(${scale});
      font-family: 'Segoe UI', Impact, -apple-system, sans-serif;
      font-weight: 900;
      font-size: ${fontSize};
      color: ${color};
      text-shadow: 0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9), 0 0 16px ${color}88;
      -webkit-text-stroke: 1.5px #000;
      letter-spacing: 1px;
      user-select: none;
      pointer-events: none;
      transition: opacity 0.3s ease-out;
      will-change: transform, opacity;
    `;

    this.container.appendChild(el);

    this.activeNumbers.push({
      element: el,
      pos: worldPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.4 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.4
      )),
      age: 0,
      lifetime: 0.85,
      vy: 1.8
    });

    // Spawn 3D Hit Spark
    this.spawnHitSparks(worldPos, type === 'crit' ? 0xff4444 : 0xffea00);
  }

  // Visual Anime Hit Sparks in Three.js
  spawnHitSparks(pos, colorHex = 0xffea00) {
    const sparkCount = 14;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    const velocities = [];

    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.5;
      positions[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      const vy = (Math.random() - 0.2) * 3.0;

      velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        vy,
        Math.sin(angle) * speed
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.35,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const pSystem = new THREE.Points(geometry, material);
    this.scene.add(pSystem);

    this.sparks.push({
      points: pSystem,
      positions,
      velocities,
      age: 0,
      maxAge: 0.32
    });
  }

  update(delta) {
    // 1. Update Floating HTML numbers
    for (let i = this.activeNumbers.length - 1; i >= 0; i--) {
      const item = this.activeNumbers[i];
      item.age += delta;
      item.pos.y += item.vy * delta;
      item.vy = Math.max(0.2, item.vy - delta * 3.0); // Decelerate float

      // Project 3D pos to 2D screen
      const screenPos = item.pos.clone().project(this.camera);

      // Check if behind camera
      if (screenPos.z > 1.0) {
        item.element.style.display = 'none';
      } else {
        item.element.style.display = 'block';
        const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        const progress = item.age / item.lifetime;
        const popScale = progress < 0.2 ? 1.0 + Math.sin(progress * Math.PI * 5) * 0.35 : 1.0;
        const opacity = Math.max(0, 1.0 - Math.pow(progress, 2.5));

        item.element.style.left = `${sx}px`;
        item.element.style.top = `${sy}px`;
        item.element.style.opacity = opacity;
        item.element.style.transform = `translate(-50%, -50%) scale(${popScale})`;
      }

      if (item.age >= item.lifetime) {
        item.element.remove();
        this.activeNumbers.splice(i, 1);
      }
    }

    // 2. Update 3D Hit Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.age += delta;

      const posArr = sp.positions;
      for (let j = 0; j < sp.velocities.length; j++) {
        const vel = sp.velocities[j];
        posArr[j * 3] += vel.x * delta;
        posArr[j * 3 + 1] += vel.y * delta;
        posArr[j * 3 + 2] += vel.z * delta;
        vel.y -= 9.8 * delta; // Gravity
      }

      sp.points.geometry.attributes.position.needsUpdate = true;
      sp.points.material.opacity = Math.max(0, 1.0 - sp.age / sp.maxAge);

      if (sp.age >= sp.maxAge) {
        this.scene.remove(sp.points);
        sp.points.geometry.dispose();
        sp.points.material.dispose();
        this.sparks.splice(i, 1);
      }
    }
  }
}

window.DamageSystem = DamageSystem;
