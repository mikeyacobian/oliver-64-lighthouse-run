import * as THREE from "three";
import type { Crab } from "./types";

const crabRoutes = [
  {
    start: [-9, 0.16, 1.8],
    end: [-1.5, 0.16, 1.8],
    speed: 1.45,
  },
  {
    start: [4.5, 0.16, -3.2],
    end: [11.5, 0.16, -3.2],
    speed: 1.75,
  },
  {
    start: [-11.5, 0.16, -8.2],
    end: [-4.5, 0.16, -8.2],
    speed: 1.6,
  },
  {
    start: [2.5, 0.16, 7.2],
    end: [10.5, 0.16, 7.2],
    speed: 1.35,
  },
];

export function createCrabs(scene: THREE.Scene): Crab[] {
  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0xb7472f, flatShading: true, roughness: 0.82 });
  const clawMaterial = new THREE.MeshStandardMaterial({ color: 0xe05b3f, flatShading: true, roughness: 0.76 });
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x84291f, flatShading: true, roughness: 0.86 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x171717, flatShading: true, roughness: 0.5 });

  return crabRoutes.map((route, index) => {
    const group = new THREE.Group();
    const start = new THREE.Vector3(route.start[0], route.start[1], route.start[2]);
    const end = new THREE.Vector3(route.end[0], route.end[1], route.end[2]);
    group.position.copy(start.clone().lerp(end, index % 2 === 0 ? 0.15 : 0.7));
    group.name = `Crab ${index + 1}`;

    const shell = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), shellMaterial);
    shell.scale.set(1.35, 0.46, 0.9);
    shell.castShadow = true;
    group.add(shell);

    const legs = [-1, 1].flatMap((side) =>
      [-0.22, 0, 0.22].map((z) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.055, 0.08), legMaterial);
        leg.position.set(side * 0.42, -0.06, z);
        leg.rotation.z = side * 0.22;
        leg.castShadow = true;
        group.add(leg);
        return leg;
      }),
    );

    const claws = [-1, 1].map((side) => {
      const claw = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), clawMaterial);
      claw.scale.set(1.2, 0.48, 0.8);
      claw.position.set(side * 0.36, 0.03, -0.36);
      claw.rotation.z = side * 0.28;
      claw.castShadow = true;
      group.add(claw);
      return claw;
    });

    for (const x of [-0.12, 0.12]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), eyeMaterial);
      eye.position.set(x, 0.17, -0.25);
      group.add(eye);
    }

    scene.add(group);

    return {
      group,
      legs,
      claws,
      start,
      end,
      speed: route.speed,
      direction: index % 2 === 0 ? 1 : -1,
      pinchCooldown: 0,
    };
  });
}
