import * as THREE from "three";
import type { Oliver } from "./types";

export function createOliver(): Oliver {
  const group = new THREE.Group();
  group.name = "Oliver";

  const white = new THREE.MeshStandardMaterial({ color: 0xf7f3e8, flatShading: true, roughness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: 0x171717, flatShading: true, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd92525, flatShading: true, roughness: 0.65 });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), white);
  body.scale.set(1.18, 0.72, 0.82);
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Group();
  head.position.set(0, 1.22, -0.58);
  group.add(head);

  const headMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), white);
  headMesh.scale.set(1, 0.92, 0.98);
  headMesh.castShadow = true;
  head.add(headMesh);

  const snout = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), white);
  snout.scale.set(0.9, 0.65, 1.1);
  snout.position.set(0, -0.06, -0.33);
  snout.castShadow = true;
  head.add(snout);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), black);
  nose.position.set(0, -0.03, -0.53);
  nose.castShadow = true;
  head.add(nose);

  const eyeGeo = new THREE.BoxGeometry(0.055, 0.055, 0.035);
  for (const x of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(eyeGeo, black);
    eye.position.set(x, 0.1, -0.38);
    head.add(eye);
  }

  const ears = [-1, 1].map((side) => {
    const ear = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), black);
    ear.scale.set(0.58, 1.45, 0.38);
    ear.position.set(side * 0.36, -0.08, -0.02);
    ear.rotation.z = side * 0.28;
    ear.castShadow = true;
    head.add(ear);
    return ear;
  });

  const bandana = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 3), red);
  bandana.position.set(0, 0.98, -0.58);
  bandana.rotation.set(Math.PI, 0, Math.PI / 3);
  bandana.castShadow = true;
  group.add(bandana);

  const legs = [
    [-0.38, 0.36, -0.38],
    [0.38, 0.36, -0.38],
    [-0.38, 0.36, 0.36],
    [0.38, 0.36, 0.36],
  ].map(([x, y, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.18), x < 0 ? black : white);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    group.add(leg);
    return leg;
  });

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 6), white);
  tail.position.set(0, 0.96, 0.66);
  tail.rotation.x = Math.PI / 2.8;
  tail.castShadow = true;
  group.add(tail);

  return { group, body, head, ears, legs, tail, bandana };
}
