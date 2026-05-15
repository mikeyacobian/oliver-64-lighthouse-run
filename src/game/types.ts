import type * as THREE from "three";

export type GameMode = "ready" | "playing" | "won" | "lost";

export type HudState = {
  score: number;
  stars: number;
  totalStars: number;
  lives: number;
  timeLeft: number;
  zoomFuel: number;
  barkReady: boolean;
  ringReady: boolean;
  message: string;
  mode: GameMode;
};

export type ControlsState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  bark: boolean;
  sprint: boolean;
};

export type Oliver = {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Group;
  ears: THREE.Mesh[];
  legs: THREE.Mesh[];
  tail: THREE.Mesh;
  bandana: THREE.Mesh;
};

export type Collectible = {
  group: THREE.Group;
  kind: "star" | "treasure";
  radius: number;
  collected: boolean;
  baseY: number;
};

export type SeagullState = "patrol" | "chase" | "flee" | "respawn";

export type Seagull = {
  group: THREE.Group;
  wings: THREE.Mesh[];
  velocity: THREE.Vector3;
  patrolCenter: THREE.Vector3;
  patrolAngle: number;
  state: SeagullState;
  fleeTimer: number;
  bonkCooldown: number;
  respawnTimer: number;
};

export type Crab = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  claws: THREE.Mesh[];
  start: THREE.Vector3;
  end: THREE.Vector3;
  speed: number;
  direction: 1 | -1;
  pinchCooldown: number;
};

export type World = {
  scene: THREE.Scene;
  lighthouse: THREE.Group;
  finishRing: THREE.Mesh;
  finishGlow: THREE.PointLight;
  spawnPoint: THREE.Vector3;
};
