import * as THREE from "three";
import type { Collectible } from "./types";

const starPositions = [
  [-8, 0.8, -8],
  [7, 0.8, -10],
  [-11, 0.8, 3],
  [10, 0.8, 5],
  [0, 0.8, 10],
];

const treasurePositions = [
  [-4, 0.35, 6],
  [4.5, 0.35, -4],
  [12, 0.35, -2],
  [-12, 0.35, -5],
];

export function createCollectibles(scene: THREE.Scene): Collectible[] {
  const starMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdd48,
    emissive: 0x7c5600,
    emissiveIntensity: 0.35,
    flatShading: true,
    roughness: 0.55,
  });
  const treasureMaterial = new THREE.MeshStandardMaterial({
    color: 0x5cc8ff,
    emissive: 0x12334a,
    emissiveIntensity: 0.2,
    flatShading: true,
    roughness: 0.5,
  });

  const items: Collectible[] = [];
  for (const position of starPositions) {
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), starMaterial));
    group.children.forEach((child) => {
      child.castShadow = true;
    });
    scene.add(group);
    items.push({ group, kind: "star", radius: 0.75, collected: false, baseY: position[1] });
  }

  for (const position of treasurePositions) {
    const group = new THREE.Group();
    group.position.set(position[0], position[1], position[2]);
    const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), treasureMaterial);
    shell.scale.set(1.1, 0.55, 0.8);
    shell.castShadow = true;
    group.add(shell);
    scene.add(group);
    items.push({ group, kind: "treasure", radius: 0.55, collected: false, baseY: position[1] });
  }

  return items;
}
