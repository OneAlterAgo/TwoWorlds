import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const kai = { x: -8.9, z: -31.5 };
const lumi = { x: 8.9, z: -31.5 };
const source = { x: kai.x, z: -27.5 };
const targets = [{ x: lumi.x, z: -27.5 }, { x: lumi.x, z: -35.1 }];
const hues = [0xffb65b, 0x6cf4df];
const names = ['янтарный', 'бирюзовый'];
const beamHeight = 1.25;

export function createOpticalCourt(scene, addCollider) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x536558, flatShading: true });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb87a3e, metalness: .28, roughness: .54 });
  const mirrorFace = new THREE.MeshStandardMaterial({ color: 0xcfd6c8, metalness: .43, roughness: .33 });
  const add = (geometry, material, x, y, z, parent = scene) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  function plinth(point, color, radius = .46) {
    const group = new THREE.Group();
    group.position.set(point.x, 0, point.z);
    scene.add(group);
    add(new THREE.CylinderGeometry(radius * .8, radius, 1.02, 6), stone, 0, .51, 0, group).castShadow = true;
    add(new THREE.CylinderGeometry(radius * 1.25, radius * 1.25, .115, 6), bronze, 0, .06, 0, group);
    addCollider(point.x, .5, point.z, radius * 1.6, 1, radius * 1.6);
    const light = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .24, flatShading: true });
    return { group, light };
  }
  function mirror(point, color) {
    const { group, light } = plinth(point, color);
    const frame = new THREE.Group();
    frame.position.y = beamHeight;
    group.add(frame);
    add(new THREE.BoxGeometry(.8, .58, .09), bronze, 0, 0, 0, frame);
    add(new THREE.BoxGeometry(.64, .43, .032), mirrorFace, 0, 0, .05, frame);
    add(new THREE.BoxGeometry(.64, .43, .032), mirrorFace, 0, 0, -.05, frame);
    add(new THREE.BoxGeometry(.5, .075, .11), light, 0, -.31, 0, frame);
    return { frame, light };
  }
  const filter = mirror(kai, hues[0]);
  const reflector = mirror(lumi, hues[1]);
  const emitter = plinth(source, hues[0], .39);
  add(new THREE.IcosahedronGeometry(.22, 0), emitter.light, 0, beamHeight, 0, emitter.group);

  const receivers = targets.map((point, index) => {
    const receiver = plinth(point, hues[index], .39);
    const ring = add(new THREE.TorusGeometry(.29, .046, 7, 20), receiver.light, 0, beamHeight, 0, receiver.group);
    ring.rotation.y = Math.PI / 2;
    const core = add(new THREE.OctahedronGeometry(.142), receiver.light, 0, beamHeight, 0, receiver.group);
    return { ...receiver, core };
  });

  const beamGeometry = new THREE.CylinderGeometry(.045, .045, 1, 6);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: hues[0] });
  const lightGeometry = new THREE.CylinderGeometry(.109, .109, 1, 7);
  const lightMaterial = new THREE.MeshBasicMaterial({ color: hues[0], transparent: true, opacity: .28,
    blending: THREE.AdditiveBlending, depthWrite: false });
  const beams = Array.from({ length: 3 }, () => {
    const beam = new THREE.Group();
    beam.visible = false;
    add(beamGeometry, beamMaterial, 0, 0, 0, beam);
    add(lightGeometry, lightMaterial, 0, 0, 0, beam);
    scene.add(beam);
    return beam;
  });
  const up = new THREE.Vector3(0, 1, 0), path = new THREE.Vector3();
  function trace(beam, from, to) {
    path.set(to.x - from.x, 0, to.z - from.z);
    beam.position.set((from.x + to.x) / 2, beamHeight, (from.z + to.z) / 2);
    beam.scale.y = path.length();
    beam.quaternion.setFromUnitVectors(up, path.normalize());
  }
  trace(beams[0], source, kai);
  trace(beams[1], kai, lumi);

  let filterStep = 0, mirrorStep = 0, charged = 0, exposure = 0, lastTarget = -1;
  const colorIndex = () => filterStep % 2;
  const output = () => mirrorStep % 3 - 1;
  const close = (position, point) => Math.abs(position.y) < 1.15 &&
    Math.hypot(position.x - point.x, position.z - point.z) < 1.75;
  function stationAt(position) {
    if (close(position, kai)) return 0;
    if (close(position, lumi)) return 1;
    return -1;
  }
  function use(position, role) {
    const station = stationAt(position);
    if (station !== role) return false;
    if (station === 0) filterStep++;
    if (station === 1) mirrorStep++;
    return true;
  }
  function receive(peer) {
    if (peer?.slot === 0) {
      if (Number.isSafeInteger(peer.filterStep) && peer.filterStep > filterStep) filterStep = peer.filterStep;
      if (Number.isInteger(peer.charged)) charged |= peer.charged & 3;
    }
    if (peer?.slot === 1 && Number.isSafeInteger(peer.mirrorStep) && peer.mirrorStep > mirrorStep) {
      mirrorStep = peer.mirrorStep;
    }
  }
  function update(dt, enabled, mayCharge) {
    const color = colorIndex();
    const target = output();
    if (target !== lastTarget || target !== color) exposure = 0;
    lastTarget = target;
    const previous = charged;
    if (enabled && target === color && !(charged & (1 << target))) {
      exposure += dt;
      if (mayCharge && exposure >= 1.15) charged |= 1 << target;
    }

    const hue = hues[color];
    beamMaterial.color.setHex(hue);
    lightMaterial.color.setHex(hue);
    beams.forEach(beam => { beam.visible = enabled; });
    const destination = target < 0 ? { x: lumi.x + 3.3, z: lumi.z } : targets[target];
    trace(beams[2], lumi, destination);
    filter.light.color.setHex(hue);
    filter.light.emissive.setHex(hue);
    filter.light.emissiveIntensity = enabled ? .9 : .1;
    emitter.light.emissive.setHex(hue);
    emitter.light.emissiveIntensity = enabled ? 1.35 : .1;
    // The two angled detents reflect east-flowing light toward the two opposing alcoves.
    const angle = target < 0 ? Math.PI / 2 : (target === 0 ? -Math.PI / 4 : Math.PI / 4);
    reflector.frame.rotation.y = THREE.MathUtils.damp(reflector.frame.rotation.y, angle, 7, dt);
    filter.frame.rotation.y = Math.PI / 4;
    receivers.forEach(({ core, light }, index) => {
      const fill = charged & (1 << index) ? 1 : target === index && target === color ? Math.min(1, exposure / 1.15) : 0;
      core.scale.setScalar(.65 + fill * .48);
      core.rotation.y += dt * (.4 + fill * 1.6);
      light.emissiveIntensity = .19 + fill * 1.65;
    });
    return previous !== charged;
  }
  function hint(position, role, solo) {
    if (charged === 3) return solo ? 'Оба приёмника включены. Войди в портал.' : 'Оба приёмника включены. Войдите в портал вместе.';
    const station = stationAt(position);
    if (station === 0) {
      if (role !== 0) return solo ? 'Переключись на Кая, чтобы выбрать цвет луча.' : 'Цвет луча меняет Кай на западной площадке.';
      return `Сейчас луч ${names[colorIndex()]}. Подстрой цвет под приёмник, к которому Люми ведёт луч.`;
    }
    if (station === 1) {
      if (role !== 1) return solo ? 'Переключись на Люми, чтобы направить луч.' : 'Зеркало на восточной площадке поворачивает Люми.';
      const target = output();
      if (target < 0) return 'Луч уходит мимо приёмников. Поверни зеркало и проследи за лучом.';
      if (target !== colorIndex()) return `Луч попал в ${names[target]} приёмник, но цвет не совпадает. Можно изменить направление или цвет.`;
      return charged & (1 << target) ? 'Этот приёмник заряжен. Направь луч во второй.' : 'Цвет совпал. Удержи луч на приёмнике.';
    }
    return role === 0 ? 'Западная площадка меняет цвет луча. У каждого приёмника свой цвет.' :
      'На восточной площадке поверни зеркало, чтобы направить луч к приёмникам.';
  }
  return {
    update, receive, use, stationAt, hint,
    state: () => ({ filterStep, mirrorStep, charged }),
    isReady: () => charged === 3,
    reset() { filterStep = 0; mirrorStep = 0; charged = 0; exposure = 0; lastTarget = -1; },
  };
}
