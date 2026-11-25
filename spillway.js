import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

const lip = 5.05, mark = .75, liftStart = -7.19, liftTravel = 16;
const bronze = 0xba8252, stone = 0x63736a, jade = 0x65d8bd;
const rune = { x: 2.3, y: lip, z: -24 };
const winch = { x: -3.9, y: lip, z: -26.8 };
const catchPoint = { x: -.9, y: lip, z: -34.1 };
const exitZ = -36.3;
const asset = name => new URL(`./assets/spillway/${name}`, import.meta.url).href;
const liftTop = progress => lip * progress / mark;
const liftZ = progress => liftStart - liftTravel * progress;
const at = (person, item, range = 1.72) => person && Math.abs(person.y - item.y) < 1.1 &&
  Math.hypot(person.x - item.x, person.z - item.z) < range;
const onRail = person => person && Math.abs(person.y) < .65 && person.x >= -7.0 &&
  person.x <= -4.15 && person.z < -3.25 && person.z > -17.8;
const onDeck = (person, progress, clearance = .22) => person && Math.abs(person.x) < 1.67 &&
  Math.abs(person.z - liftZ(progress)) < 1.18 && Math.abs(person.y - liftTop(progress)) < clearance;
const atMark = progress => Math.abs(progress - mark) <= .048;

export function createSpillway({ T, R, scene, world, box, mesh, floor, collider, sound }) {
  const start = floor(0, 0, 0, 14, 12, stone);
  const rail = floor(-5.55, 0, -11.9, 2.8, 12.03, stone);
  const launch = floor(-8.4, 0, -16.38, 3.13, 2.86, stone);
  const landing = floor(0, lip, -25.25, 13.1, 9.8, stone);
  const exit = floor(0, lip, -34.1, 4.3, 8.0, stone);
  exit.safeZ = -34.0;
  const checkpoints = [start, rail, launch, landing, exit];

  const texture = new T.TextureLoader().load(asset('stone.jpg'));
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 2;
  const flagstone = new T.MeshStandardMaterial({ color: 0xb4c3aa, map: texture, roughness: .94 });
  for (const platform of checkpoints) {
    const top = new T.PlaneGeometry(platform.w, platform.d);
    const uv = top.attributes.uv;
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(index, uv.getX(index) * platform.w / 3.0, uv.getY(index) * platform.d / 3.0);
    }
    const overlay = new T.Mesh(top, flagstone);
    overlay.name = 'spillway-stone';
    overlay.position.set(platform.x, platform.y + .012, platform.z);
    overlay.rotation.x = -Math.PI / 2;
    overlay.receiveShadow = true;
    scene.add(overlay);
  }

  const loader = new GLTFLoader();
  const bounds = new T.Box3(), size = new T.Vector3(), center = new T.Vector3();
  function decorate(model, point, height, name) {
    const prop = model.clone();
    bounds.setFromObject(prop).getSize(size);
    bounds.getCenter(center);
    const scale = height / size.y;
    prop.name = name;
    prop.scale.multiplyScalar(scale);
    prop.position.set(point.x - center.x * scale, point.y - bounds.min.y * scale, point.z - center.z * scale);
    prop.traverse(part => { if (part.isMesh) part.castShadow = part.receiveShadow = true; });
    scene.add(prop);
  }
  loader.load(asset('wall-pillar.glb'), ({ scene: model }) => {
    for (const [x, y, z] of [[-2.6, 0, -5.15], [2.6, 0, -5.15], [-5.95, lip, -29.2], [5.95, lip, -29.2]]) {
      decorate(model, { x, y, z }, 2.95, 'spillway-model-pillar');
      collider(x, y + 1.5, z, .75, 3.0, .75);
    }
  }, undefined, error => console.warn('Spillway pillar failed to load', error));
  loader.load(asset('wall-doorway.glb'), ({ scene: model }) => {
    decorate(model, { x: 0, y: lip, z: -38.2 }, 5.8, 'spillway-model-arch');
  }, undefined, error => console.warn('Spillway arch failed to load', error));

  const water = new T.Mesh(new T.PlaneGeometry(58, 88), new T.MeshStandardMaterial({ color: 0x24665f, roughness: .51 }));
  water.position.set(0, -8.3, -18);
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  const mist = new T.MeshBasicMaterial({ color: 0x7bc8ba, transparent: true, opacity: .34, depthWrite: false, side: T.DoubleSide });
  const waterfall = new T.Group();
  waterfall.position.set(8.0, -2.4, -17.2);
  scene.add(waterfall);
  for (let stripe = 0; stripe < 9; stripe++) {
    const stream = new T.Mesh(new T.PlaneGeometry(.17 + stripe % 3 * .055, 11.7), mist.clone());
    stream.position.x = stripe * .20;
    stream.position.z = Math.sin(stripe * .8) * .17;
    waterfall.add(stream);
  }
  const rock = new T.DodecahedronGeometry(1);
  for (let ridge = 0; ridge < 11; ridge++) {
    const side = ridge % 2 === 0 ? 1 : -1;
    const column = mesh(rock, ridge % 3 ? 0x62776c : 0x4d665f,
      side * (12.5 + ridge % 4 * 1.1), -3 + ridge % 3 * 1.2, -5 - ridge * 3.9, scene, false);
    column.scale.set(3.4 + ridge % 2, 9 + ridge % 4 * 2, 5.2);
    column.rotation.set(.1, ridge * 1.4, .19 * side);
  }

  for (const x of [-6.49, -4.60]) box(.073, .046, 13.38, bronze, x, .031, -10.53);
  for (const z of [-6, -8.5, -11, -13.75, -16.25]) box(1.9, .047, .13, z === -13.75 ? jade : bronze, -5.55, .034, z);
  for (const x of [-1.74, 1.74]) box(.11, .11, 17.65, bronze, x, 3.33, -15.25).rotation.x = -.42;
  const weight = mesh(new T.CylinderGeometry(.45, .51, .74, 8), bronze, -4.62, .62, -4);
  const weightBand = new T.Mesh(new T.TorusGeometry(.47, .056, 8, 24), new T.MeshBasicMaterial({ color: 0xf1b574 }));
  weightBand.rotation.x = Math.PI / 2;
  weight.add(weightBand);

  const cabin = new T.Group();
  scene.add(cabin);
  box(3.34, .40, 2.34, stone, 0, -.2, 0, cabin);
  box(3.27, .045, 2.28, 0x907357, 0, .025, 0, cabin);
  for (const x of [-1.56, 1.56]) box(.13, .08, 2.31, bronze, x, .065, 0, cabin);
  const cabinPlate = box(1.04, .07, .8, jade, 0, .055, 0, cabin);
  cabinPlate.material = cabinPlate.material.clone();
  const cabinBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -.2, liftStart));
  world.createCollider(R.ColliderDesc.cuboid(1.67, .2, 1.17), cabinBody);
  for (const x of [-2.56, 2.56]) {
    box(.31, 5.35, .41, stone, x, lip / 2, -20.44);
    box(.46, .175, .49, jade, x, lip + .71, -20.44);
  }
  function pedestal(point, color) {
    mesh(new T.CylinderGeometry(.29, .44, .93, 6), stone, point.x, point.y + .465, point.z);
    collider(point.x, point.y + .46, point.z, .71, .92, .71);
    const orb = new T.Mesh(new T.OctahedronGeometry(.22), new T.MeshBasicMaterial({ color }));
    orb.position.set(point.x, point.y + 1.14, point.z);
    scene.add(orb);
    return orb;
  }
  const beacons = [pedestal(rune, jade), pedestal(winch, bronze), pedestal(catchPoint, jade)];

  const stones = [
    [-8.7, 1.0, -18.91, 2.56, 1.82], [-9.15, 2.15, -20.86, 2.54, 1.82],
    [-9.0, 3.28, -22.81, 2.40, 1.82], [-7.73, 4.40, -24.7, 2.22, 1.87],
  ].map(([x, y, z, w, d]) => {
    const support = collider(x, y - .14, z, w, .28, d);
    const surface = new T.Mesh(new T.BoxGeometry(w, .28, d), new T.MeshStandardMaterial({
      color: 0x4e8f84, emissive: 0x329d85, emissiveIntensity: .67, roughness: .59,
    }));
    surface.position.set(x, y - .14, z);
    scene.add(surface);
    support.setEnabled(false);
    surface.visible = false;
    return { x, y, z, w, d, support, surface };
  });
  for (const side of [-1, 1]) {
    box(4.46, 4.62, .82, stone, side * 4.22, lip + 2.31, -30.13);
    collider(side * 4.22, lip + 2.31, -30.13, 4.46, 4.62, .82);
    box(1.12, 4.35, 8.26, stone, side * 2.64, lip + 2.175, -34.06);
    collider(side * 2.64, lip + 2.175, -34.06, 1.12, 4.35, 8.26);
  }
  box(4.1, .64, .62, bronze, 0, lip + 4.35, -30.13);
  const gate = new T.Group();
  gate.position.set(0, lip, -30.13);
  scene.add(gate);
  for (let bar = -4; bar <= 4; bar++) box(.125, 3.68, .24, bronze, bar * .43, 1.84, 0, gate);
  for (const y of [.48, 2.65]) box(3.72, .20, .27, stone, 0, y, 0, gate);
  const obstruction = collider(0, lip + 1.84, -30.13, 3.72, 3.68, .34);
  const portal = mesh(new T.TorusGeometry(1.4, .19, 8, 32), bronze, 0, lip + 1.45, exitZ);
  const gateLight = new T.MeshBasicMaterial({ color: jade, side: T.DoubleSide, transparent: true, opacity: .09 });
  const lightDisk = new T.Mesh(new T.CircleGeometry(1.22, 28), gateLight);
  lightDisk.position.copy(portal.position);
  scene.add(lightDisk);

  let progress = 0, observedProgress = 0, grip = false, brake = false, brakeCall = 0, handledBrake = 0;
  let stairs = false, raisingGate = false, remoteGate = false, gateCaught = false, gateHeight = 0, time = 0;
  let stairsVisible = false, gateBlocked = true;

  function reset() {
    progress = observedProgress = brakeCall = handledBrake = gateHeight = 0;
    grip = brake = stairs = raisingGate = remoteGate = gateCaught = false;
    placeCabin();
    setStairs(false);
    gate.position.y = lip;
    obstruction.setEnabled(true);
    gateBlocked = true;
  }
  function placeCabin() {
    const y = liftTop(progress), z = liftZ(progress);
    cabin.position.set(0, y, z);
    cabinBody.setNextKinematicTranslation({ x: 0, y: y - .2, z });
  }
  function setStairs(visible) {
    if (visible === stairsVisible) return;
    stairsVisible = visible;
    for (const stone of stones) {
      stone.support.setEnabled(visible);
      stone.surface.visible = visible;
    }
  }

  function update(dt, context) {
    const { role, pos, other, solo, peer, grounded, carry } = context;
    const authoritative = solo || role === 0;
    const kai = role === 0 ? pos : other;
    const previous = progress;
    const wasRiding = grounded && onDeck(pos, previous);
    const waitingRider = solo && onDeck(other, previous);
    if (authoritative) {
      if (peer?.slot === 1) {
        if (Number.isSafeInteger(peer.spillBrakeCall) && peer.spillBrakeCall > handledBrake) {
          handledBrake = peer.spillBrakeCall;
          if (Math.abs(progress - mark) < .075 && onDeck(peer, progress, .55)) brake = true;
        }
        if (brake && peer.spillStairs === true) stairs = true;
        if (stairs && peer.spillCaught === true) gateCaught = true;
      }
      if (!onRail(kai)) grip = false;
      const requested = brake ? mark : grip ? T.MathUtils.clamp((-kai.z - 4) / 13, 0, 1) : 0;
      progress = T.MathUtils.damp(progress, requested, brake ? 11 : 3.15, dt);
    } else if (peer?.slot === 0) {
      if (Number.isFinite(peer.spillProgress)) observedProgress = T.MathUtils.clamp(peer.spillProgress, 0, 1);
      brake ||= peer.spillBrake === true;
      remoteGate = peer.spillGate === true;
      progress = T.MathUtils.damp(progress, brake ? mark : observedProgress, 13, dt);
    }
    if (wasRiding) carry(liftTop(progress) - liftTop(previous), liftZ(progress) - liftZ(previous));
    if (waitingRider) {
      other.y += liftTop(progress) - liftTop(previous);
      other.z += liftZ(progress) - liftZ(previous);
    }
    placeCabin();
    const railZ = grip && onRail(kai) ? T.MathUtils.clamp(kai.z, -17, -4) : -4 - 13 * progress;
    weight.position.z = T.MathUtils.damp(weight.position.z, railZ, 8, dt);
    cabinPlate.material.color.setHex(atMark(progress) || brake ? jade : 0xb8995b);
    setStairs(stairs);

    const underGate = person => person && Math.abs(person.y - lip) < 1.2 &&
      Math.abs(person.x) < 1.8 && Math.abs(person.z + 30.13) < .66;
    const gateOpen = gateCaught || (authoritative ? raisingGate && at(kai, winch) : remoteGate);
    const holdDoor = gateHeight > 2.65 && (underGate(pos) || underGate(other));
    const desiredHeight = gateOpen || holdDoor ? 3.85 : 0;
    gateHeight = T.MathUtils.damp(gateHeight, desiredHeight, 8.4, dt);
    gate.position.y = lip + gateHeight;
    const blockPassage = gateHeight < 2.35;
    if (blockPassage !== gateBlocked) {
      obstruction.setEnabled(blockPassage);
      gateBlocked = blockPassage;
    }
    gateLight.opacity = gateCaught ? .61 : .09;
  }

  function interact({ pos, role, solo, grounded }) {
    if (role === 0) {
      if (!brake && onRail(pos)) { grip = !grip; return 1; }
      if (stairs && !gateCaught && at(pos, winch)) { raisingGate = !raisingGate; return 1; }
    }
    if (role === 1) {
      if (!brake && grounded && onDeck(pos, progress)) {
        if (!atMark(progress)) return 0;
        if (solo) brake = true;
        else brakeCall++;
        return 2;
      }
      if (brake && !stairs && at(pos, rune)) { stairs = true; return 2; }
      if (stairs && !gateCaught && at(pos, catchPoint)) {
        if (gateHeight < 2.35) return 0;
        gateCaught = true;
        return 2;
      }
    }
    return -1;
  }

  function status({ pos, role, solo, won }) {
    if (won) return { hint: 'Оба героя у выхода. Водосброс открыт!', power: 'Способность' };
    if (gateCaught) return { hint: 'Затвор закреплён. Соберитесь у портала.', power: role === 0 ? 'Рывок' : 'Магия' };
    if (stairs && pos.y >= lip - .7) {
      if (role === 0) return at(pos, winch) ? {
        hint: raisingGate ? 'Удерживай затвор, пока Люми не закрепит его за проходом.' : 'Магнит поднимет затвор. Оставайся у механизма, пока Люми проходит.',
        power: raisingGate ? 'Отпустить' : 'Поднять',
      } : { hint: 'У левой стены на верхней площадке есть привод затвора.', power: 'Рывок' };
      if (at(pos, catchPoint)) return gateHeight >= 2.35
        ? { hint: 'Закрепи затвор, чтобы Кай мог пройти.', power: 'Фиксатор' }
        : { hint: 'Попроси Кая снова поднять затвор, чтобы закрепить его.', power: 'Фиксатор' };
      return { hint: 'Подожди, пока Кай поднимет затвор, и найди фиксатор за ним.', power: 'Магия' };
    }
    if (stairs) return { hint: 'Ступени появились слева от шахты. Поднимись к затвору.', power: role === 0 ? 'Рывок' : 'Магия' };
    if (brake) {
      if (role === 0) return { hint: 'Люми остановила подъёмник. Она создаст ступени слева от тебя.', power: 'Рывок' };
      return at(pos, rune) ? { hint: 'Руна создаст ступени для Кая.', power: 'Ступени' }
        : { hint: 'Сойди с подъёмника на верхнюю площадку и найди руну справа.', power: 'Магия' };
    }
    if (role === 0) {
      if (onRail(pos)) return { hint: grip ? 'Веди противовес вдоль рельсов. Люми скажет, когда остановиться.' : 'Включи магнит на рельсах после того, как Люми встанет на подъёмник.', power: grip ? 'Отпустить' : 'Магнит' };
      return { hint: 'Путь Кая слева вдоль медных рельсов. Подъёмник Люми в центре.', power: 'Рывок' };
    }
    if (onDeck(pos, progress)) return { hint: atMark(progress) ? 'Отметки совпали. Зафиксируй подъёмник.' : (solo ? 'Смени героя на Кая, чтобы подвинуть противовес.' : 'Подскажи Каю, когда площадка сравняется с бирюзовой отметкой.'), power: 'Стоп' };
    return { hint: 'Встань на подъёмник в центре. Кай направит его по рельсу.', power: 'Магия' };
  }

  return {
    start, checkpoints, update, reset, interact, status,
    canDash: ({ role, pos }) => role === 0 && !onRail(pos),
    checkpoint: point => point.y < lip || brake,
    groundHeight(pos) {
      const surfaces = stairs ? [...checkpoints, ...stones] : checkpoints;
      const deck = onDeck(pos, progress, .19) ? liftTop(progress) : null;
      return deck ?? surfaces.find(point => Math.abs(pos.x - point.x) < point.w / 2 &&
        Math.abs(pos.z - point.z) < point.d / 2 && Math.abs(pos.y - point.y) < .12)?.y;
    },
    state: context => ({ spillProgress: progress, spillBrake: brake, spillBrakeCall: brakeCall,
      spillStairs: stairs, spillGate: raisingGate && at(context.role === 0 ? context.pos : context.other, winch), spillCaught: gateCaught }),
    indicators: () => [['Подъёмник', brake], ['Ступени', stairs], ['Затвор', gateCaught]],
    finish: ({ pos, other }) => gateCaught && [pos, other].every(person => at(person, { x: 0, y: lip, z: exitZ }, 1.78)),
    animate(dt) {
      time += dt;
      waterfall.children.forEach((stream, index) => { stream.material.opacity = .15 + .33 * (Math.sin(time * 3.4 + index * .85) * .5 + .5); });
      for (const beacon of beacons) beacon.rotation.y += dt * .7;
    },
  };
}
