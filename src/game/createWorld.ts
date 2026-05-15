import * as THREE from "three";
import type { World } from "./types";

export function createWorld(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffb66f);
  scene.fog = new THREE.Fog(0xffb66f, 24, 62);

  const sun = new THREE.DirectionalLight(0xfff2c7, 2.2);
  sun.position.set(-8, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ambient = new THREE.HemisphereLight(0x87c8ff, 0xd7ad6f, 1.45);
  scene.add(ambient);

  const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xe6c777, flatShading: true, roughness: 0.95 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x3e9ec8, flatShading: true, roughness: 0.85 });
  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x7aa856, flatShading: true, roughness: 0.9 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8f5732, flatShading: true, roughness: 0.85 });
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xf7efe0, flatShading: true, roughness: 0.75 });
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xa52a2a, flatShading: true, roughness: 0.7 });

  const sand = new THREE.Mesh(new THREE.CylinderGeometry(22, 24, 0.45, 18), sandMaterial);
  sand.receiveShadow = true;
  sand.position.y = -0.25;
  scene.add(sand);

  const water = new THREE.Mesh(new THREE.CylinderGeometry(34, 36, 0.18, 28), waterMaterial);
  water.position.y = -0.48;
  water.receiveShadow = true;
  scene.add(water);

  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2;
    const radius = 16 + Math.sin(i * 2.1) * 2.2;
    const dune = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + (i % 3) * 0.18, 0), grassMaterial);
    dune.scale.set(1.8, 0.35, 0.9);
    dune.position.set(Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius);
    dune.rotation.y = angle;
    dune.castShadow = true;
    dune.receiveShadow = true;
    scene.add(dune);
  }

  for (let i = 0; i < 10; i++) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 1.6), woodMaterial);
    fence.position.set(-13 + i * 1.2, 0.23, -13.5 + Math.sin(i) * 0.2);
    fence.rotation.y = 0.18;
    fence.castShadow = true;
    scene.add(fence);
  }

  const lighthouse = new THREE.Group();
  lighthouse.position.set(0, 0, -17);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, 5.2, 10), whiteMaterial);
  tower.position.y = 2.6;
  tower.castShadow = true;
  lighthouse.add(tower);

  for (const y of [1.2, 2.55, 3.9]) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 1.08, 0.34, 10), redMaterial);
    stripe.position.y = y;
    stripe.castShadow = true;
    lighthouse.add(stripe);
  }

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.55, 10), redMaterial);
  cap.position.y = 5.45;
  cap.castShadow = true;
  lighthouse.add(cap);

  const lantern = new THREE.PointLight(0xffe578, 1.4, 12);
  lantern.position.y = 5.7;
  lighthouse.add(lantern);
  scene.add(lighthouse);

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe28a,
    emissive: 0x2f1b00,
    emissiveIntensity: 0.08,
    flatShading: true,
    roughness: 0.45,
  });
  const finishRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.11, 8, 24), ringMaterial);
  finishRing.position.set(0, 1.3, -12.8);
  finishRing.rotation.x = Math.PI / 2;
  finishRing.castShadow = true;
  scene.add(finishRing);

  const finishGlow = new THREE.PointLight(0xffdf55, 0.15, 8);
  finishGlow.position.copy(finishRing.position);
  scene.add(finishGlow);

  return {
    scene,
    lighthouse,
    finishRing,
    finishGlow,
    spawnPoint: new THREE.Vector3(0, 0, 8),
  };
}
