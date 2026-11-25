import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const stone = [0x435654, 0x56655d, 0x6c7562, 0x8b8d74, 0x9e9778];
const moss = [0x53754e, 0x81974b, 0xadb761];
const bronze = 0xb77a42;
const gold = 0xe0b36e;

export function templeTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const brush = canvas.getContext('2d');
  brush.fillStyle = kind === 'bronze' ? '#e8e8e8' : '#e6e6e6';
  brush.fillRect(0, 0, 128, 128);
  let seed = 2597;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let fleck = 0; fleck < 720; fleck++) {
    brush.fillStyle = random() < .36 ? '#ffffff24' : '#514d4320';
    brush.fillRect(random() * 128, random() * 128, 1 + random() * 3, 1 + random() * 2);
  }
  if (kind === 'stone') {
    for (const x of [5, 66, 116]) {
      const y = 13 + random() * 105;
      brush.strokeStyle = '#655f5535';
      brush.beginPath();
      brush.moveTo(x, y);
      brush.lineTo(x + 8, y + 4);
      brush.lineTo(x + 12, y + 11);
      brush.lineTo(x + 24, y + 15);
      brush.stroke();
    }
  } else {
    const width = kind === 'wood' ? 1 : .42;
    for (let streak = 0; streak < 18; streak++) {
      brush.lineWidth = width;
      brush.strokeStyle = streak % 3 ? '#42382d30' : '#fff5e94e';
      const y = random() * 128;
      brush.beginPath();
      brush.moveTo(0, y);
      brush.bezierCurveTo(42, y + 2, 86, y - 3, 128, y);
      brush.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

export function buildTempleArt(scene, landings) {
  let seed = 5201;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const cube = new THREE.BoxGeometry();
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const leaves = new THREE.IcosahedronGeometry(1, 0);
  const batches = new Map();
  function place(geometry, color, position, scale, rotation = [0, 0, 0], castsShadow = true) {
    const id = `${geometry.id}/${color}/${castsShadow}`;
    if (!batches.has(id)) batches.set(id, { geometry, color, castsShadow, transforms: [] });
    const object = new THREE.Object3D();
    object.position.fromArray(position);
    object.scale.fromArray(scale);
    object.rotation.fromArray(rotation);
    object.updateMatrix();
    batches.get(id).transforms.push(object.matrix);
  }
  function stonework(x, y, z, width, height, depth, color, turn = 0) {
    place(cube, color, [x, y, z], [width, height, depth], [0, 0, turn]);
  }

  const dome = new THREE.Mesh(new THREE.SphereGeometry(118, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec3 direction;
      void main() {
        vec3 ray = normalize(direction);
        vec3 horizon = vec3(0.60, 0.72, 0.66);
        vec3 zenith = vec3(0.09, 0.30, 0.42);
        vec3 color = mix(horizon, zenith, smoothstep(-0.06, 0.8, ray.y));
        float light = max(0.0, dot(ray, normalize(vec3(-0.42, 0.28, -0.86))));
        color += vec3(0.49, 0.34, 0.16) * pow(light, 22.0);
        color += vec3(1.0, 0.72, 0.34) * smoothstep(0.998, 0.999, light);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  dome.position.set(0, 0, -14);
  dome.renderOrder = -10;
  scene.add(dome);

  for (const landing of landings) {
    const { x, y, z, w, d } = landing;
    const rows = Math.ceil(d / 1.55);
    const columns = Math.ceil(w / 1.75);
    const stepX = w / columns, stepZ = d / rows;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const color = stone[1 + Math.floor(random() * 4)];
        stonework(x - w / 2 + (column + .5) * stepX, y + .006, z - d / 2 + (row + .5) * stepZ,
          stepX - .04, .018, stepZ - .04, color);
      }
    }
    for (const side of [-1, 1]) {
      stonework(x + side * (w / 2 - .1), y - .3, z, .18, .64, d, stone[0]);
      for (let segment = 0; segment < rows; segment++) {
        const dz = z - d / 2 + stepZ * (segment + .5);
        const size = .8 + random() * .7;
        place(rock, stone[0], [x + side * (w / 2 - .55), y - .72 - size * .95, dz],
          [size, size * 1.3, size], [.2, dz * .4, side * .3]);
      }
    }
  }

  // The far bank ends in an arch made of individual wedge stones.
  const archZ = -35.55, springY = 3.25, inner = 3.15, outer = 4.08;
  for (const side of [-1, 1]) {
    const x = side * (inner + outer) / 2;
    for (let row = 0; row < 5; row++) {
      stonework(x, .325 + row * .65, archZ, 1.08 + (row === 0 ? .34 : 0), .635, 1.36,
        stone[2 + row % 3]);
    }
    stonework(x, springY, archZ, 1.25, .17, 1.49, bronze);
    stonework(x, 2.62, archZ + .72, .78, .09, .16, gold);
    const banner = new THREE.Shape();
    banner.moveTo(-.34, 0);
    banner.lineTo(.34, 0);
    banner.lineTo(.34, -1.36);
    banner.lineTo(0, -1.63);
    banner.lineTo(-.34, -1.36);
    banner.closePath();
    const fabric = new THREE.Mesh(new THREE.ShapeGeometry(banner), new THREE.MeshStandardMaterial({
      color: side < 0 ? 0x9b583c : 0x367f76, roughness: 1, side: THREE.DoubleSide,
    }));
    fabric.position.set(x, 2.56, archZ + .78);
    scene.add(fabric);
    stonework(x, 1.99, archZ + .79, .22, .22, .025, gold, Math.PI / 4);
  }
  for (let index = 0; index < 13; index++) {
    const start = Math.PI * index / 13 + .009;
    const end = Math.PI * (index + 1) / 13 - .009;
    const wedge = new THREE.Shape();
    wedge.moveTo(inner * Math.cos(start), inner * Math.sin(start));
    wedge.absarc(0, 0, inner, start, end, false);
    wedge.lineTo(outer * Math.cos(end), outer * Math.sin(end));
    wedge.absarc(0, 0, outer, end, start, true);
    wedge.closePath();
    const material = new THREE.MeshStandardMaterial({ color: index === 6 ? bronze : stone[2 + index % 3], flatShading: true });
    const block = new THREE.Mesh(new THREE.ExtrudeGeometry(wedge, { depth: 1.25, bevelEnabled: false, curveSegments: 2 }), material);
    block.position.set(0, springY, archZ - .62);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
  }

  const outcrops = [
    [-11.5, -10, 3.4, 6.1], [12.4, -12, 4.0, 4.7], [-18.3, -26, 6.3, 14],
    [20, -33, 5.7, 12], [-13, -41, 4.1, 9], [13, -43, 4.6, 11],
    [-21, -43, 8, 16], [18, -48, 7, 18], [2, -55, 7, 14],
  ];
  for (const [x, z, radius, height] of outcrops) {
    for (let chunk = 0; chunk < 7; chunk++) {
      const shift = (random() - .5) * radius;
      const top = height * (.66 + random() * .42);
      place(rock, stone[chunk % stone.length], [x + shift, top * .42 - 5, z + (random() - .5) * radius],
        [radius * (.55 + random() * .5), top, radius * (.45 + random() * .42)],
        [random() * .25, random() * 6, (random() - .5) * .3], false);
    }
    for (let patch = 0; patch < 4; patch++) {
      const size = .8 + random() * 2.6;
      place(leaves, moss[patch % moss.length], [x + (random() - .5) * radius, height * 1.2 - 4.5, z + (random() - .5) * radius],
        [size * 1.3, size * .65, size], [0, random() * 6, .2], false);
    }
  }

  for (const bank of landings.filter(({ w }) => w > 5)) {
    for (const side of [-1, 1]) {
      for (let bush = 0; bush < 7; bush++) {
        const x = side * (bank.w / 2 - .75 - random() * .35), z = bank.z + (random() - .5) * (bank.d - .7);
        place(leaves, moss[bush % moss.length], [x, .18, z], [.37 + random() * .45, .25 + random() * .45, .48], [0, random() * 6, .12]);
      }
    }
  }
  const stoneTexture = templeTexture('stone');
  for (const { geometry, color, castsShadow, transforms } of batches.values()) {
    const map = geometry === cube && stone.includes(color) ? stoneTexture : null;
    const material = new THREE.MeshStandardMaterial({ color, map, flatShading: true, roughness: .87 });
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = castsShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const time = { value: 0 };
  const waterfall = new THREE.ShaderMaterial({
    uniforms: { time },
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 coord;
      void main() { coord = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float time;
      varying vec2 coord;
      void main() {
        float threads = sin(coord.x * 135.0 + sin(coord.y * 16.0 + time * 2.5) * 2.5) * 0.5 + 0.5;
        float runs = sin(coord.y * 52.0 + time * 8.0 + coord.x * 11.0) * 0.5 + 0.5;
        float edges = smoothstep(0.0, 0.16, coord.x) * smoothstep(0.0, 0.15, 1.0 - coord.x);
        vec3 color = mix(vec3(0.11, 0.45, 0.48), vec3(0.71, 0.94, 0.88), threads * 0.75 + runs * 0.25);
        gl_FragColor = vec4(color, edges * (0.66 + 0.29 * threads));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  for (const [x, z, width, top] of [[-8.7, -21.0, 2.15, 10], [9.9, -23.8, 1.65, 9.3], [-6.4, -45.5, 2.2, 12]]) {
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(width, top + 9), waterfall);
    fall.position.set(x, (top - 9) / 2, z);
    scene.add(fall);
  }
  const river = new THREE.Mesh(new THREE.PlaneGeometry(38, 81), new THREE.ShaderMaterial({
    uniforms: { time },
    vertexShader: `varying vec2 coord;
      void main() { coord = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float time;
      varying vec2 coord;
      void main() {
        float waves = sin(coord.y * 240.0 + sin(coord.x * 47.0 + time * 1.25) * 1.8 - time * 1.65);
        float light = smoothstep(0.84, 1.0, waves) * (0.5 + 0.5 * sin(coord.x * 69.0 - coord.y * 22.0));
        vec3 color = mix(vec3(0.045, 0.22, 0.20), vec3(0.10, 0.39, 0.34), light);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, -9, -22);
  scene.add(river);
  return (elapsed) => { time.value = elapsed; };
}
