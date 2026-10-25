// Stage.js - Clean, Crystal-Clear Isekai Anime Studio & Town Renderer
// Eliminates over-exposed bloom/composer blowout for rich, vibrant anime visuals.

class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    // Soft atmospheric anime haze
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 1.7, 4.0);

    // Auto-detect mobile device for optimized lightweight performance
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);

    // High Performance WebGL Renderer (Auto-tuned for 60 FPS on mobile!)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile, // Disable heavy MSAA on mobile for 2x FPS boost!
      powerPreference: "high-performance",
      precision: this.isMobile ? "mediump" : "highp"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Clamp pixel ratio on mobile so phone doesn't render at burning 4K resolution
    this.renderer.setPixelRatio(this.isMobile ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05; // Balanced, natural exposure

    // Selection Showcase Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 1.1, 0);
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 6.0;
    this.controls.autoRotate = false;

    this.setupAtmosphericLighting();
    this.setupSkyDome();
    this.setupFloatingSparks();
    this.setupPedestal();

    window.addEventListener('resize', () => this.onResize());
  }

  setupAtmosphericLighting() {
    // Warm Natural Sunlight
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
    this.sunLight.position.set(18, 32, 16);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = this.isMobile ? 1024 : 2048;
    this.sunLight.shadow.mapSize.height = this.isMobile ? 1024 : 2048;
    this.sunLight.shadow.bias = -0.0003;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Vibrant Anime Sky/Ground Ambient Bounce
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.65);
    this.scene.add(this.hemiLight);

    // Gentle Front-Fill Light
    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.35);
    fillLight.position.set(-12, 10, -14);
    this.scene.add(fillLight);
  }

  setupSkyDome() {
    // Rich Cerulean Anime Sky Dome (No runaway HDR blowout)
    const skyGeo = new THREE.SphereGeometry(300, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1e3a8a) },     // Deep vibrant anime sky
        horizonColor: { value: new THREE.Color(0x38bdf8) }, // Bright cyan horizon
        bottomColor: { value: new THREE.Color(0x15803d) }   // Green ground
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 sky = mix(bottomColor, horizonColor, max(pow(max(h + 0.15, 0.0), 0.7), 0.0));
          sky = mix(sky, topColor, max(pow(max(h - 0.1, 0.0), 0.6), 0.0));
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);
  }

  setupFloatingSparks() {
    // Gentle drifting mana embers
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 14 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.45,
      transparent: true,
      opacity: 0.7
    });
    this.sparks = new THREE.Points(geo, mat);
    this.scene.add(this.sparks);
  }

  setupPedestal() {
    this.pedestal = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.12, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.06;
    base.receiveShadow = true;
    this.pedestal.add(base);

    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.runeRing = new THREE.Mesh(ringGeo, ringMat);
    this.runeRing.rotation.x = -Math.PI / 2;
    this.runeRing.position.y = 0.01;
    this.pedestal.add(this.runeRing);

    this.scene.add(this.pedestal);
  }

  setRotationDegrees(deg) {
    const rad = (deg * Math.PI) / 180;
    const distance = 4.0;
    this.camera.position.x = Math.sin(rad) * distance;
    this.camera.position.z = Math.cos(rad) * distance;
    this.camera.position.y = 1.7;
    this.controls.target.set(0, 1.1, 0);
    this.controls.update();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(delta, playerPos = null) {
    if (this.controls.enabled) {
      this.controls.update();
    }
    if (this.runeRing) {
      this.runeRing.rotation.z += 0.005;
    }
    if (this.sparks) {
      this.sparks.rotation.y += delta * 0.02;
    }
    // Dynamic Sunlight follows hero across town and plains
    if (playerPos && this.sunLight) {
      this.sunLight.position.set(playerPos.x + 18, playerPos.y + 32, playerPos.z + 16);
      this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
      this.sunLight.target.updateMatrixWorld();
    }
    // Crystal-clear direct PBR render (No bloom runaway white-out!)
    this.renderer.render(this.scene, this.camera);
  }
}

window.Stage = Stage;
