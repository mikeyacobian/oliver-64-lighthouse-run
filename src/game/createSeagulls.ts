import * as THREE from "three";
import type { Seagull } from "./types";

const gullSeeds = [
  [-6, 1.8, -2],
  [5, 1.8, -7],
  [8, 1.8, 8],
  [-10, 1.8, 7],
];

export function createSeagulls(scene: THREE.Scene): Seagull[] {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f0df, flatShading: true, roughness: 0.8 });
  const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xaeb5b8, flatShading: true, roughness: 0.75 });
  const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xff9e2c, flatShading: true, roughness: 0.55 });

  return gullSeeds.map(([x, y, z], index) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.name = `Seagull ${index + 1}`;

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), bodyMaterial);
    body.scale.set(1, 0.58, 1.25);
    body.castShadow = true;
    group.add(body);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), beakMaterial);
    beak.position.set(0, 0, -0.36);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    const wings = [-1, 1].map((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.22), wingMaterial);
      wing.position.set(side * 0.45, 0.02, 0);
      wing.rotation.z = side * 0.22;
      wing.castShadow = true;
      group.add(wing);
      return wing;
    });

    scene.add(group);

    return {
      group,
      wings,
      velocity: new THREE.Vector3(),
      patrolCenter: new THREE.Vector3(x, y, z),
      patrolAngle: index * 1.9,
      state: "patrol",
      fleeTimer: 0,
      bonkCooldown: 0,
      respawnTimer: 0,
    };
  });
}
