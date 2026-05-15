import * as THREE from "three";
import { createCollectibles } from "./createCollectibles";
import { createCrabs } from "./createCrabs";
import { createOliver } from "./createOliver";
import { createSeagulls } from "./createSeagulls";
import { createWorld } from "./createWorld";
import { Controls } from "./controls";
import type { Collectible, Crab, DayPhase, Difficulty, GameMode, HudState, Oliver, Seagull, Weather, World } from "./types";

type HudCallback = (state: HudState) => void;

const TOTAL_STARS = 5;
const START_TIME = 180;
const WORLD_RADIUS = 19.5;
const DAY_LENGTH = 150;
const RAIN_COUNT = 180;
const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    crabSpeed: number;
    gullAttraction: number;
    gullChaseSpeed: number;
    gullFleeSpeed: number;
    gullPatrolSpeed: number;
  }
> = {
  easy: {
    crabSpeed: 0.75,
    gullAttraction: 5.1,
    gullChaseSpeed: 3,
    gullFleeSpeed: 5.2,
    gullPatrolSpeed: 0.82,
  },
  normal: {
    crabSpeed: 1,
    gullAttraction: 6.8,
    gullChaseSpeed: 3.9,
    gullFleeSpeed: 5.6,
    gullPatrolSpeed: 1,
  },
  hard: {
    crabSpeed: 1.32,
    gullAttraction: 9.1,
    gullChaseSpeed: 5,
    gullFleeSpeed: 5.9,
    gullPatrolSpeed: 1.18,
  },
};

export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 100);
  private clock = new THREE.Clock();
  private controls = new Controls();
  private world: World;
  private oliver: Oliver;
  private collectibles: Collectible[];
  private crabs: Crab[];
  private seagulls: Seagull[];
  private frameId = 0;
  private resizeObserver: ResizeObserver;
  private hudAccumulator = 0;
  private animationTime = 0;
  private velocityY = 0;
  private grounded = true;
  private invulnerableTimer = 0;
  private barkCooldown = 0;
  private atmosphereTime = 0;
  private weatherTimer = 18;
  private weatherIndex = 0;
  private weatherSequence: Weather[] = ["clear", "mist", "clear", "drizzle", "mist"];
  private rain!: THREE.Points;
  private rainPositions!: Float32Array;
  private dustMaterial = new THREE.MeshBasicMaterial({ color: 0xd6b36b, transparent: true, opacity: 0.5 });
  private sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xfff4a6, transparent: true, opacity: 0.8 });
  private featherMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xf8f3df, transparent: true, opacity: 0.95 }),
    new THREE.MeshBasicMaterial({ color: 0xd8dde0, transparent: true, opacity: 0.95 }),
    new THREE.MeshBasicMaterial({ color: 0x3a3f42, transparent: true, opacity: 0.95 }),
  ];
  private pulseMaterial = new THREE.MeshBasicMaterial({
    color: 0x91dbff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  private effects: THREE.Mesh[] = [];
  private state: HudState = this.freshState();

  constructor(
    private host: HTMLElement,
    private onHud: HudCallback,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = "game-canvas";
    this.host.appendChild(this.renderer.domElement);

    this.world = createWorld();
    this.oliver = createOliver();
    this.collectibles = createCollectibles(this.world.scene);
    this.crabs = createCrabs(this.world.scene);
    this.seagulls = createSeagulls(this.world.scene);
    const rainField = this.createRainField();
    this.rain = rainField.rain;
    this.rainPositions = rainField.positions;
    this.world.scene.add(this.rain);
    this.world.scene.add(this.oliver.group);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.restart();
  }

  start() {
    this.clock.start();
    this.loop();
  }

  startRun() {
    if (this.state.mode === "paused") {
      this.state.mode = "playing";
      this.state.message = "Back to the beach. Keep moving!";
      this.onHud({ ...this.state });
      return;
    }

    if (this.state.mode !== "ready") return;
    this.state.mode = "playing";
    this.state.message = "Find the 5 Nantucket Stars. Jump over crabs on the beach!";
    this.onHud({ ...this.state });
  }

  setDifficulty(difficulty: Difficulty) {
    this.state.difficulty = difficulty;
    if (this.state.mode === "ready") {
      this.state.message = this.difficultyMessage(difficulty);
    }
    this.onHud({ ...this.state });
  }

  restart() {
    this.state = this.freshState();
    this.controls.reset();
    this.animationTime = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.invulnerableTimer = 0;
    this.barkCooldown = 0;
    this.atmosphereTime = 0;
    this.weatherTimer = 18;
    this.weatherIndex = 0;
    this.oliver.group.position.copy(this.world.spawnPoint);
    this.oliver.group.rotation.set(0, Math.PI, 0);
    this.oliver.group.visible = true;
    this.collectibles.forEach((item) => {
      item.collected = false;
      item.group.visible = true;
      item.group.position.y = item.baseY;
    });
    this.crabs.forEach((crab, index) => {
      crab.group.position.copy(crab.start.clone().lerp(crab.end, index % 2 === 0 ? 0.15 : 0.7));
      crab.direction = index % 2 === 0 ? 1 : -1;
      crab.pinchCooldown = 0;
      crab.group.visible = true;
    });
    this.seagulls.forEach((gull, index) => {
      const angle = index * 1.9;
      gull.group.position.copy(this.patrolTarget(gull, angle));
      gull.velocity.set(0, 0, 0);
      gull.patrolAngle = angle;
      gull.state = "patrol";
      gull.fleeTimer = 0;
      gull.bonkCooldown = 0;
      gull.respawnTimer = 0;
      gull.group.visible = true;
    });
    this.clearEffects();
    this.updateFinishRing();
    this.updateAtmosphere(0);
    this.onHud({ ...this.state });
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.clearEffects();
    this.disposeObject(this.world.scene);
    this.dustMaterial.dispose();
    this.sparkleMaterial.dispose();
    this.featherMaterials.forEach((material) => material.dispose());
    this.pulseMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.033);
    this.update(dt);
    this.renderer.render(this.world.scene, this.camera);
    this.frameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.controls.consumePause()) {
      this.togglePause();
    }

    if (this.state.mode === "playing") {
      this.state.timeLeft -= dt;
      if (this.state.timeLeft <= 0) {
        this.state.timeLeft = 0;
        this.lose("The sun slipped below the horizon before Oliver reached the light.");
      }

      this.updateOliver(dt);
      this.updateCollectibles(dt);
      this.updateCrabs(dt);
      this.updateSeagulls(dt);
      this.updateFinish(dt);
      this.updateAtmosphere(dt);
    } else if (this.state.mode === "ready") {
      this.animateOliver(dt, false, false);
      this.updateAttractAnimations(dt);
      this.updateAtmosphere(dt);
    } else if (this.state.mode === "won" || this.state.mode === "lost") {
      this.updateAtmosphere(dt * 0.35);
    }

    this.updateEffects(dt);
    this.updateCamera(dt);
    this.updateHud(dt);
  }

  private togglePause() {
    if (this.state.mode === "playing") {
      this.state.mode = "paused";
      this.state.message = "Paused. Press P or Escape to keep running.";
      this.onHud({ ...this.state });
      return;
    }

    if (this.state.mode === "paused") {
      this.state.mode = "playing";
      this.state.message = "Back to the beach. Keep moving!";
      this.onHud({ ...this.state });
    }
  }

  private updateOliver(dt: number) {
    const c = this.controls.state;
    const turnSpeed = 2.7;
    const baseSpeed = 5.1;
    const canZoom = c.forward && c.sprint && this.state.zoomFuel > 0.02;
    const zooming = canZoom;
    const speed = baseSpeed * (zooming ? 1.75 : 1);

    if (c.left) this.oliver.group.rotation.y += turnSpeed * dt;
    if (c.right) this.oliver.group.rotation.y -= turnSpeed * dt;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.oliver.group.quaternion);
    const move = Number(c.forward) - Number(c.backward);
    if (move !== 0) {
      this.oliver.group.position.addScaledVector(forward, move * speed * dt);
    }

    if (zooming) {
      this.state.zoomFuel = Math.max(0, this.state.zoomFuel - dt * 0.28);
      this.spawnDust();
    } else {
      this.state.zoomFuel = Math.min(1, this.state.zoomFuel + dt * 0.16);
    }

    if (this.controls.consumeJump() && this.grounded) {
      this.velocityY = 7.2;
      this.grounded = false;
    }

    if (this.controls.consumeBark() && this.barkCooldown <= 0) {
      this.barkCooldown = 0.95;
      this.bark();
    }

    this.velocityY -= 18 * dt;
    this.oliver.group.position.y += this.velocityY * dt;
    if (this.oliver.group.position.y <= 0) {
      this.oliver.group.position.y = 0;
      this.velocityY = 0;
      this.grounded = true;
    }

    this.keepOnIsland(this.oliver.group.position);
    this.barkCooldown = Math.max(0, this.barkCooldown - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.animateOliver(dt, Math.abs(move) > 0.05, zooming);
  }

  private animateOliver(dt: number, moving: boolean, zooming: boolean) {
    const rate = moving ? (zooming ? 16 : 9) : 3;
    this.animationTime += dt * rate;
    const wave = Math.sin(this.animationTime);
    const counter = Math.sin(this.animationTime + Math.PI);
    const stride = moving ? 0.55 : 0.12;

    this.oliver.body.position.y = 0.72 + Math.abs(wave) * (moving ? 0.08 : 0.02);
    this.oliver.head.position.y = 1.22 + Math.abs(counter) * (moving ? 0.07 : 0.025);
    this.oliver.bandana.rotation.z = Math.PI / 3 + wave * 0.08;

    this.oliver.legs.forEach((leg, index) => {
      const phase = index % 2 === 0 ? wave : counter;
      leg.rotation.x = phase * stride;
      leg.position.y = 0.36 + Math.max(0, phase) * (moving ? 0.12 : 0.02);
    });

    this.oliver.ears.forEach((ear, index) => {
      const side = index === 0 ? -1 : 1;
      ear.rotation.z = side * (0.28 + wave * (moving ? 0.16 : 0.05));
      ear.rotation.x = counter * (moving ? 0.18 : 0.04);
    });

    this.oliver.tail.rotation.z = wave * (zooming ? 0.72 : 0.45);
    this.oliver.tail.rotation.x = Math.PI / 2.8 + Math.abs(counter) * 0.15;
  }

  private updateCollectibles(dt: number) {
    for (const item of this.collectibles) {
      if (item.collected) continue;
      item.group.rotation.y += dt * (item.kind === "star" ? 2.6 : 1.6);
      item.group.position.y = item.baseY + Math.sin(this.animationTime * 0.8 + item.group.position.x) * 0.16;

      if (item.group.position.distanceTo(this.oliver.group.position) < item.radius + 0.6) {
        item.collected = true;
        item.group.visible = false;
        this.state.score += item.kind === "star" ? 100 : 25;
        if (item.kind === "star") {
          this.state.stars += 1;
          this.state.message =
            this.state.stars === TOTAL_STARS
              ? "All stars found. The lighthouse ring is glowing!"
              : "Nantucket Star collected!";
          this.updateFinishRing();
        } else {
          this.state.message = "Beach treasure found. Stylish.";
        }
        this.sparkle(item.group.position, item.kind === "star" ? 10 : 5);
      }
    }
  }

  private updateAttractAnimations(dt: number) {
    for (const item of this.collectibles) {
      if (item.collected) continue;
      item.group.rotation.y += dt * 1.2;
      item.group.position.y = item.baseY + Math.sin(this.animationTime * 0.8 + item.group.position.x) * 0.16;
    }

    for (const gull of this.seagulls) {
      this.updatePatrolGull(gull, dt, 0.7, true);
      gull.group.position.y = THREE.MathUtils.clamp(gull.group.position.y, 1.05, 2.7);
      this.animateGullWings(gull, 0.32);
    }

    for (const crab of this.crabs) {
      this.animateCrab(crab, dt, 0.5);
    }
  }

  private updateCrabs(dt: number) {
    const config = this.difficultyConfig();
    for (const crab of this.crabs) {
      const target = crab.direction === 1 ? crab.end : crab.start;
      const toTarget = target.clone().sub(crab.group.position);
      if (toTarget.length() < 0.18) {
        crab.direction *= -1;
      }

      const nextTarget = crab.direction === 1 ? crab.end : crab.start;
      const travel = nextTarget.clone().sub(crab.group.position).normalize();
      crab.group.position.addScaledVector(travel, crab.speed * config.crabSpeed * dt);
      this.faceCrabSideways(crab, travel);
      crab.pinchCooldown = Math.max(0, crab.pinchCooldown - dt);
      this.animateCrab(crab, dt, 1);

      const canPinch = this.grounded && this.oliver.group.position.y < 0.42;
      if (canPinch && this.flatDistance(crab.group.position, this.oliver.group.position) < 0.72 && crab.pinchCooldown <= 0 && this.invulnerableTimer <= 0) {
        crab.pinchCooldown = 1.25;
        this.pinchOliver(crab);
      }
    }
  }

  private animateCrab(crab: Crab, dt: number, intensity: number) {
    const scuttle = Math.sin(this.animationTime * 1.7 + crab.group.position.x) * intensity;
    crab.legs.forEach((leg, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      leg.rotation.y = side * scuttle * 0.42;
    });
    crab.claws.forEach((claw, index) => {
      const side = index === 0 ? -1 : 1;
      claw.rotation.z = side * (0.28 + Math.abs(scuttle) * 0.34);
    });
    crab.group.position.y = 0.16 + Math.abs(scuttle) * 0.025;
  }

  private faceCrabSideways(crab: Crab, travel: THREE.Vector3) {
    const sidewaysFacing = Math.atan2(travel.x, travel.z) + Math.PI / 2;
    crab.group.rotation.y = sidewaysFacing;
  }

  private pinchOliver(crab: Crab) {
    this.state.lives -= 1;
    this.invulnerableTimer = 1;
    const away = this.flatDirection(this.oliver.group.position, crab.group.position);
    this.oliver.group.position.addScaledVector(away, 0.95);
    this.sparkle(crab.group.position.clone().add(new THREE.Vector3(0, 0.25, 0)), 6);
    this.state.message = this.state.lives > 0 ? "Pinched by a crab. Jump over them!" : "Oliver got pinched one too many times.";
    if (this.state.lives <= 0) this.lose("Oliver ran out of lives on the crabby shoreline.");
  }

  private updateSeagulls(dt: number) {
    const oliverPos = this.oliver.group.position;
    const config = this.difficultyConfig();
    for (const gull of this.seagulls) {
      if (gull.state === "respawn") {
        this.updateRespawningGull(gull, dt);
        continue;
      }

      const toOliver = new THREE.Vector3().subVectors(oliverPos, gull.group.position);
      const distance = toOliver.length();

      gull.fleeTimer = Math.max(0, gull.fleeTimer - dt);
      gull.bonkCooldown = Math.max(0, gull.bonkCooldown - dt);
      if (gull.fleeTimer > 0) {
        gull.state = "flee";
      } else if (distance < config.gullAttraction) {
        gull.state = "chase";
      } else {
        gull.state = "patrol";
      }

      if (gull.state === "patrol") {
        this.updatePatrolGull(gull, dt, config.gullPatrolSpeed, false);
      } else if (gull.state === "chase") {
        gull.velocity.copy(this.flatDirection(oliverPos, gull.group.position).multiplyScalar(config.gullChaseSpeed));
      } else {
        gull.velocity.copy(this.flatDirection(gull.group.position, oliverPos).multiplyScalar(config.gullFleeSpeed));
      }

      gull.group.position.addScaledVector(gull.velocity, dt);
      gull.group.position.y = THREE.MathUtils.clamp(gull.group.position.y, 1.05, 2.7);
      this.keepOnIsland(gull.group.position, 17);
      gull.group.lookAt(oliverPos.x, gull.group.position.y, oliverPos.z);
      this.animateGullWings(gull, 0.45);

      const contactDistance = this.flatDistance(gull.group.position, oliverPos);
      if (contactDistance < 0.92 && gull.bonkCooldown <= 0 && this.invulnerableTimer <= 0) {
        gull.bonkCooldown = 1.4;
        this.bonkOliver(gull);
      }
    }
  }

  private updatePatrolGull(gull: Seagull, dt: number, speedScale: number, shouldMove: boolean) {
    gull.patrolAngle += dt * 0.9 * speedScale;
    const target = this.patrolTarget(gull, gull.patrolAngle);
    gull.velocity.subVectors(target, gull.group.position).multiplyScalar(1.35 * speedScale);
    if (shouldMove) {
      gull.group.position.addScaledVector(gull.velocity, dt);
    }
    gull.group.lookAt(target.x, gull.group.position.y, target.z);
  }

  private patrolTarget(gull: Seagull, angle: number) {
    return gull.patrolCenter.clone().add(new THREE.Vector3(Math.cos(angle) * 2.6, Math.sin(angle * 2) * 0.28, Math.sin(angle) * 2.6));
  }

  private animateGullWings(gull: Seagull, intensity: number) {
    gull.wings.forEach((wing, index) => {
      const side = index === 0 ? -1 : 1;
      wing.rotation.z = side * (0.24 + Math.sin(this.animationTime * 1.8) * intensity);
    });
  }

  private updateFinish(dt: number) {
    this.world.finishRing.rotation.z += dt * (this.state.stars === TOTAL_STARS ? 2.4 : 0.8);
    if (this.state.stars === TOTAL_STARS && this.world.finishRing.position.distanceTo(this.oliver.group.position) < 1.7) {
      this.state.mode = "won";
      this.state.score += Math.ceil(this.state.timeLeft) * 3;
      this.state.message = "Oliver reached the glowing lighthouse ring before sunset.";
    }
  }

  private updateFinishRing() {
    const active = this.state.stars === TOTAL_STARS;
    const material = this.world.finishRing.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = active ? 1.4 : 0.08;
    material.emissive.set(active ? 0xffd95c : 0x2f1b00);
    this.world.finishGlow.intensity = active ? 2.6 : 0.15;
  }

  private bark() {
    const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 28), this.pulseMaterial);
    pulse.position.copy(this.oliver.group.position).add(new THREE.Vector3(0, 0.42, 0));
    pulse.rotation.x = Math.PI / 2;
    pulse.userData.life = 0.45;
    pulse.userData.maxLife = 0.45;
    this.world.scene.add(pulse);
    this.effects.push(pulse);
    this.state.message = "Bark! Nearby seagulls scatter.";

    for (const gull of this.seagulls) {
      if (gull.state === "respawn") continue;
      const distance = gull.group.position.distanceTo(this.oliver.group.position);
      if (distance < 6.2) {
        const away = gull.group.position.clone().sub(this.oliver.group.position).normalize();
        gull.group.position.addScaledVector(away, 0.6);
        gull.fleeTimer = 2.6;
        gull.state = "flee";
      }
    }
  }

  private bonkOliver(gull: Seagull) {
    this.state.lives -= 1;
    this.invulnerableTimer = 1.2;
    const away = this.flatDirection(this.oliver.group.position, gull.group.position);
    this.oliver.group.position.addScaledVector(away, 1.15);
    this.spawnFeathers(gull.group.position);
    this.queueReplacementGull(gull);
    this.state.message = this.state.lives > 0 ? "Bonked by a seagull. Bark to scare them off!" : "Oliver ran out of lives.";
    if (this.state.lives <= 0) this.lose("Oliver was bonked one too many times by the Nantucket gull squad.");
  }

  private updateRespawningGull(gull: Seagull, dt: number) {
    gull.respawnTimer = Math.max(0, gull.respawnTimer - dt);
    gull.bonkCooldown = Math.max(0, gull.bonkCooldown - dt);

    if (gull.respawnTimer > 1.15) {
      gull.group.visible = false;
      return;
    }

    gull.group.visible = true;
    const toHome = gull.patrolCenter.clone().sub(gull.group.position);
    if (toHome.length() > 0.35) {
      gull.velocity.copy(toHome.normalize().multiplyScalar(4.8));
      gull.group.position.addScaledVector(gull.velocity, dt);
      gull.group.position.y = THREE.MathUtils.lerp(gull.group.position.y, gull.patrolCenter.y, 1 - Math.pow(0.01, dt));
      gull.group.lookAt(gull.patrolCenter.x, gull.group.position.y, gull.patrolCenter.z);
      gull.wings.forEach((wing, index) => {
        const side = index === 0 ? -1 : 1;
        wing.rotation.z = side * (0.32 + Math.sin(this.animationTime * 2.4) * 0.55);
      });
      return;
    }

    gull.group.position.copy(gull.patrolCenter);
    gull.velocity.set(0, 0, 0);
    gull.fleeTimer = 0;
    gull.state = "patrol";
    gull.bonkCooldown = 0.85;
  }

  private queueReplacementGull(gull: Seagull) {
    const angle = Math.atan2(gull.patrolCenter.z, gull.patrolCenter.x) + Math.PI + (Math.random() - 0.5) * 0.8;
    gull.group.position.set(Math.cos(angle) * 20.5, 2.4, Math.sin(angle) * 20.5);
    gull.velocity.set(0, 0, 0);
    gull.state = "respawn";
    gull.fleeTimer = 0;
    gull.bonkCooldown = 2.2;
    gull.respawnTimer = 2.2;
    gull.group.visible = false;
  }

  private lose(message: string) {
    this.state.mode = "lost";
    this.state.message = message;
  }

  private updateCamera(dt: number) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.oliver.group.quaternion);
    const zooming = this.controls.state.forward && this.controls.state.sprint && this.state.zoomFuel > 0.02;
    const target = this.oliver.group.position
      .clone()
      .addScaledVector(forward, zooming ? -7.6 : -6.4)
      .add(new THREE.Vector3(0, zooming ? 4.1 : 3.45, 0));
    this.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
    const lookAt = this.oliver.group.position.clone().add(new THREE.Vector3(0, 1.0, 0)).addScaledVector(forward, 1.6);
    this.camera.lookAt(lookAt);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, zooming ? 70 : 62, 1 - Math.pow(0.01, dt));
    this.camera.updateProjectionMatrix();
  }

  private updateAtmosphere(dt: number) {
    this.atmosphereTime = (this.atmosphereTime + dt) % DAY_LENGTH;
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherIndex = (this.weatherIndex + 1) % this.weatherSequence.length;
      this.state.weather = this.weatherSequence[this.weatherIndex];
      this.weatherTimer = this.state.weather === "drizzle" ? 18 : 24;
    }

    const cycle = this.atmosphereTime / DAY_LENGTH;
    const daylight = Math.max(0, Math.sin(cycle * Math.PI * 2));
    const sunset = Math.max(0, Math.sin(cycle * Math.PI * 2 + Math.PI * 0.45));
    const night = 1 - daylight;
    this.state.dayPhase = this.dayPhase(cycle);

    const nightSky = new THREE.Color(0x17213c);
    const daySky = new THREE.Color(0x83c7e8);
    const sunsetSky = new THREE.Color(0xffa15f);
    const sky = nightSky.clone().lerp(daySky, daylight).lerp(sunsetSky, sunset * 0.42);
    const fog = sky.clone().lerp(new THREE.Color(0xb8c3c4), this.state.weather === "mist" ? 0.35 : 0.08);
    this.world.scene.background = sky;
    if (this.world.scene.fog instanceof THREE.Fog) {
      this.world.scene.fog.color.copy(fog);
      this.world.scene.fog.near = this.state.weather === "mist" ? 10 : this.state.weather === "drizzle" ? 15 : 24;
      this.world.scene.fog.far = this.state.weather === "mist" ? 36 : this.state.weather === "drizzle" ? 45 : 62;
    }

    const weatherDim = this.state.weather === "clear" ? 1 : this.state.weather === "mist" ? 0.78 : 0.68;
    this.world.sun.intensity = (0.7 + daylight * 1.75 + sunset * 0.55) * weatherDim;
    this.world.ambient.intensity = (0.72 + daylight * 0.72 + night * 0.22) * weatherDim;
    this.world.sun.color.set(sunset > 0.45 ? 0xffd0a0 : daylight > 0.35 ? 0xfff2c7 : 0x8fa8d8);
    this.world.ambient.color.set(daylight > 0.4 ? 0x87c8ff : 0x3d527e);
    this.world.ambient.groundColor.set(sunset > 0.35 ? 0xd7ad6f : 0x7d8a6c);
    this.world.sun.position.set(Math.cos(cycle * Math.PI * 2) * 10, 5 + daylight * 9, Math.sin(cycle * Math.PI * 2) * 8);

    this.updateRain(dt);
  }

  private updateRain(dt: number) {
    this.rain.visible = this.state.weather === "drizzle";
    if (!this.rain.visible) return;

    const positions = this.rainPositions;
    for (let i = 0; i < RAIN_COUNT; i++) {
      const offset = i * 3;
      positions[offset] += dt * 1.4;
      positions[offset + 1] -= dt * 9.5;
      positions[offset + 2] += dt * 0.5;
      if (positions[offset + 1] < 0.35) {
        positions[offset] = (Math.random() - 0.5) * 34;
        positions[offset + 1] = 7 + Math.random() * 7;
        positions[offset + 2] = (Math.random() - 0.5) * 34;
      }
    }
    const position = this.rain.geometry.getAttribute("position") as THREE.BufferAttribute;
    position.needsUpdate = true;
  }

  private createRainField() {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const offset = i * 3;
      positions[offset] = (Math.random() - 0.5) * 34;
      positions[offset + 1] = 1 + Math.random() * 12;
      positions[offset + 2] = (Math.random() - 0.5) * 34;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xb7d7ff,
      size: 0.09,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const rain = new THREE.Points(geometry, material);
    rain.visible = false;
    return { rain, positions };
  }

  private dayPhase(cycle: number): DayPhase {
    if (cycle < 0.18) return "Dawn";
    if (cycle < 0.58) return "Day";
    if (cycle < 0.74) return "Sunset";
    return "Night";
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.userData.life -= dt;
      const life = effect.userData.life as number;
      const maxLife = effect.userData.maxLife as number;
      const t = Math.max(0, life / maxLife);
      const velocity = effect.userData.velocity as THREE.Vector3 | undefined;
      const spin = effect.userData.spin as THREE.Vector3 | undefined;
      if (velocity) {
        velocity.y -= 6.5 * dt;
        effect.position.addScaledVector(velocity, dt);
      }
      if (spin) {
        effect.rotation.x += spin.x * dt;
        effect.rotation.y += spin.y * dt;
        effect.rotation.z += spin.z * dt;
      }
      effect.scale.multiplyScalar(1 + dt * 2.8);
      const material = effect.material as THREE.MeshBasicMaterial;
      material.opacity = Math.min(material.opacity, t);
      effect.position.y += dt * 0.4;
      if (life <= 0) {
        this.world.scene.remove(effect);
        effect.geometry.dispose();
        if (effect.userData.disposeMaterial) {
          material.dispose();
        }
        this.effects.splice(i, 1);
      }
    }
  }

  private updateHud(dt: number) {
    this.hudAccumulator += dt;
    if (this.hudAccumulator >= 0.1) {
      this.hudAccumulator = 0;
      this.state.barkReady = this.barkCooldown <= 0;
      this.state.ringReady = this.state.stars === TOTAL_STARS;
      this.onHud({ ...this.state });
    }
  }

  private spawnDust() {
    if (Math.random() > 0.45) return;
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), this.dustMaterial);
    const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.oliver.group.quaternion);
    puff.position.copy(this.oliver.group.position).addScaledVector(backward, 0.72);
    puff.position.y = 0.12;
    puff.userData.life = 0.45;
    puff.userData.maxLife = 0.45;
    this.world.scene.add(puff);
    this.effects.push(puff);
  }

  private spawnFeathers(position: THREE.Vector3) {
    for (let i = 0; i < 18; i++) {
      const material = this.featherMaterials[i % this.featherMaterials.length].clone();
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.34), material);
      feather.position.copy(position);
      feather.position.y = Math.max(0.7, position.y);
      feather.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      feather.userData.life = 0.75 + Math.random() * 0.45;
      feather.userData.maxLife = feather.userData.life;
      feather.userData.disposeMaterial = true;
      feather.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 5.2, 2.2 + Math.random() * 3.2, (Math.random() - 0.5) * 5.2);
      feather.userData.spin = new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
      this.world.scene.add(feather);
      this.effects.push(feather);
    }
  }

  private sparkle(position: THREE.Vector3, count: number) {
    for (let i = 0; i < count; i++) {
      const sparkle = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), this.sparkleMaterial);
      sparkle.position.copy(position);
      sparkle.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.7));
      sparkle.userData.life = 0.55 + Math.random() * 0.25;
      sparkle.userData.maxLife = sparkle.userData.life;
      this.world.scene.add(sparkle);
      this.effects.push(sparkle);
    }
  }

  private keepOnIsland(position: THREE.Vector3, radius = WORLD_RADIUS) {
    const flat = new THREE.Vector2(position.x, position.z);
    if (flat.length() > radius) {
      flat.setLength(radius);
      position.x = flat.x;
      position.z = flat.y;
    }
  }

  private flatDistance(a: THREE.Vector3, b: THREE.Vector3) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private flatDirection(from: THREE.Vector3, to: THREE.Vector3) {
    const direction = new THREE.Vector3(from.x - to.x, 0, from.z - to.z);
    if (direction.lengthSq() < 0.0001) {
      return new THREE.Vector3(0, 0, 1).applyQuaternion(this.oliver.group.quaternion);
    }
    return direction.normalize();
  }

  private resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private clearEffects() {
    for (const effect of this.effects) {
      this.world.scene.remove(effect);
      effect.geometry.dispose();
      if (effect.userData.disposeMaterial) {
        const material = effect.material as THREE.Material;
        material.dispose();
      }
    }
    this.effects = [];
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }

  private freshState(): HudState {
    return {
      score: 0,
      stars: 0,
      totalStars: TOTAL_STARS,
      lives: 3,
      timeLeft: START_TIME,
      zoomFuel: 1,
      barkReady: true,
      ringReady: false,
      difficulty: this.state?.difficulty ?? "normal",
      weather: "clear",
      dayPhase: "Dawn",
      message: "Collect 5 Nantucket Stars, then reach the lighthouse ring.",
      mode: "ready",
    };
  }

  private difficultyConfig() {
    return DIFFICULTY_CONFIG[this.state.difficulty];
  }

  private difficultyMessage(difficulty: Difficulty) {
    if (difficulty === "easy") return "Beach Walk: slower crabs and gulls, smaller gull chase range.";
    if (difficulty === "hard") return "Storm Watch: faster crabs, faster gulls, and a wider gull chase range.";
    return "Nantucket Run: balanced crab speed and gull pressure.";
  }
}
