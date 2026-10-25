// EnvironmentSystem.js - 24-Hour Day/Night Cycle & Dynamic Weather Engine (Phase 7)
// Manages celestial sun/moon orbits, dynamic anime sky gradients, night stars,
// automatic streetlamp lighting, and dynamic rain particle storms.

class EnvironmentSystem {
  constructor(scene, dirLight, hemiLight) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.hemiLight = hemiLight;

    // Time: 0.0 to 24.0 (Starts at 10:00 AM Sunny Morning)
    this.timeOfDay = 10.0;
    this.timeSpeed = 0.08; // ~5 mins for a full 24h cycle
    this.isNight = false;

    // Weather: 'CLEAR', 'RAIN', 'FOG'
    this.currentWeather = 'CLEAR';
    this.rainParticles = null;
    this.townLamps = [];

    this.createSkyAndStars();
    this.createRainSystem();
  }

  setTownLamps(lamps) {
    this.townLamps = lamps || [];
  }

  createSkyAndStars() {
    // 1. Twinkling Night Stars
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 180 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // Upper celestial dome

      starPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = radius * Math.cos(phi) + 10;
      starPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      transparent: true,
      opacity: 0.0 // Hidden during daytime
    });

    this.starPoints = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.starPoints);
  }

  createRainSystem() {
    const rainCount = 600;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 80;
      rainPos[i * 3 + 1] = Math.random() * 30;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));

    this.rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.0
    });

    this.rainParticles = new THREE.Points(rainGeo, this.rainMat);
    this.scene.add(this.rainParticles);
  }

  setWeather(weather) {
    this.currentWeather = weather;
    if (weather === 'RAIN') {
      this.rainMat.opacity = 0.75;
      if (window.gameHUD) window.gameHUD.showSimpleToast('🌧️ Gentle rain shower begins...');
    } else {
      this.rainMat.opacity = 0.0;
      if (window.gameHUD) window.gameHUD.showSimpleToast('☀️ Skies clear up.');
    }
  }

  getTimeFormatted() {
    const hrs = Math.floor(this.timeOfDay);
    const mins = Math.floor((this.timeOfDay - hrs) * 60);
    const pad = (n) => (n < 10 ? '0' + n : n);
    const period = hrs >= 6 && hrs < 18 ? '☀️ Day' : '🌙 Night';
    return `${pad(hrs)}:${pad(mins)} (${period})`;
  }

  update(delta, playerPos) {
    // 1. Advance Time
    this.timeOfDay = (this.timeOfDay + delta * this.timeSpeed) % 24.0;
    const hours = this.timeOfDay;

    // Check Day vs Night
    this.isNight = hours < 5.5 || hours >= 18.5;

    // 2. Solar & Lunar Arc
    // Sun reaches apex at 12:00 (midday)
    const sunAngle = ((hours - 6) / 24) * Math.PI * 2;
    const sunDistance = 140;

    if (this.dirLight) {
      this.dirLight.position.set(
        Math.cos(sunAngle) * sunDistance,
        Math.sin(sunAngle) * sunDistance,
        25
      );

      // Color Temperature by Time of Day
      if (hours >= 5.5 && hours < 8.0) {
        // Sunrise: Warm golden apricot
        this.dirLight.color.setHex(0xfbbf24);
        this.dirLight.intensity = 1.1;
        this.starMat.opacity = Math.max(0, 1.0 - (hours - 5.5) / 1.5);
      } else if (hours >= 8.0 && hours < 16.5) {
        // Midday: Crisp Anime Sun
        this.dirLight.color.setHex(0xfffbeb);
        this.dirLight.intensity = 1.4;
        this.starMat.opacity = 0.0;
      } else if (hours >= 16.5 && hours < 19.0) {
        // Sunset: Majestic Crimson Gold
        this.dirLight.color.setHex(0xf97316);
        this.dirLight.intensity = 1.0;
        this.starMat.opacity = Math.min(1.0, (hours - 16.5) / 2.0);
      } else {
        // Night: Cool Lunar Indigo
        this.dirLight.color.setHex(0x38bdf8);
        this.dirLight.intensity = 0.45;
        this.starMat.opacity = 0.95;
      }
    }

    // 3. Automatic Town Streetlamp Toggle
    this.townLamps.forEach(lamp => {
      if (lamp) {
        lamp.intensity = this.isNight ? 1.4 : 0.05;
      }
    });

    // 4. Update Rain Particles around Player
    if (this.currentWeather === 'RAIN' && playerPos) {
      const pos = this.rainParticles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= delta * 36; // Fall speed
        if (pos[i + 1] < 0) {
          pos[i] = playerPos.x + (Math.random() - 0.5) * 55;
          pos[i + 1] = 25 + Math.random() * 5;
          pos[i + 2] = playerPos.z + (Math.random() - 0.5) * 55;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
}

window.EnvironmentSystem = EnvironmentSystem;
