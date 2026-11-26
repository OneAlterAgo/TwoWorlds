import { buildSpillwayRoute } from './spillway-route.js?v=spillway5';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

const lip = 5.05, mark = .75, liftStart = -7.19, liftTravel = 16;
const bronze = 0xba8252, stone = 0x63736a, jade = 0x65d8bd;
const rune = { x: 2.3, y: lip, z: -24 };
const gateY = 2.65, gateZ = -51.1, exitZ = -56.9;
const winch = { x: -3.35, y: gateY, z: -48.65 };
const catchPoint = { x: -.9, y: gateY, z: -54.45 };
const asset = name => new URL(`./assets/spillway/${name}`, import.meta.url).href;
const liftTop = progress => lip * progress / mark;
const liftZ = progress => liftStart - liftTravel * progress;
const at = (person, item, range = 1.72) => person && Math.abs(person.y - item.y) < 1.1 &&
  Math.hypot(person.x - item.x, person.z - item.z) < range;
const onRail = person => person && Math.abs(person.y) < .65 && person.x >= -7.0 &&
  person.x <= -4.15 && person.z < -3.25 && person.z > -17.8;
const onDeck = (person, progress, clearance = .22) => person && Math.abs(person.x) < 1.67 &&
  Math.abs(person.z - liftZ(progress)) < 1.18 && Math.abs(person.y - liftTop(progress)) < clearance;
const moveLift = (math, previous, next, damping, dt) => previous +
  math.clamp(math.damp(previous, next, damping, dt) - previous, -dt * .78, dt * .78);
const atMark = progress => Math.abs(progress - mark) <= .048;

export function createSpillway({ T, R, scene, world, box, mesh, floor, collider, sound }) {
  const route = buildSpillwayRoute({ T, scene, box, mesh, floor, collider, sound, lip, at });
  const { start, intake, galleryRelay } = route;
  floor(0, 0, 0, 14, 12, stone);
  const rail = floor(-5.55, 0, -11.9, 2.8, 12.03, stone);
  const launch = floor(-8.4, 0, -16.38, 3.13, 2.86, stone);
  const landing = floor(0, lip, -26.135, 13.1, 8.03, stone);
  const courtyard = { x: 0, y: 0, z: .4, w: 14, d: 11.2, safeZ: 2.7 };
  const checkpoints = [...route.floors, courtyard, rail, launch, landing];

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
    prop.updateMatrixWorld(true);
  }
  loader.load(asset('wall-pillar.glb'), ({ scene: model }) => {
    for (const [x, y, z] of [[-2.6, 0, -5.15], [2.6, 0, -5.15], [-5.95, lip, -29.2], [5.95, lip, -29.2]]) {
      decorate(model, { x, y, z }, 2.95, 'spillway-model-pillar');
      const scale = 2.95 / size.y;
      collider(x, y + 1.475, z, size.x * scale, 2.95, size.z * scale);
    }
  }, undefined, error => console.warn('Spillway pillar failed to load', error));

  const water = new T.Mesh(new T.PlaneGeometry(78, 114), new T.MeshStandardMaterial({ color: 0x24665f, roughness: .51 }));
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
      side * (side > 0 ? 23.5 + ridge % 4 : 17 + ridge % 4), -3 + ridge % 3 * 1.2, -5 - ridge * 3.9, scene, false);
    column.scale.set(3.4 + ridge % 2, 9 + ridge % 4 * 2, 5.2);
    column.rotation.set(.1, ridge * 1.4, .19 * side);
  }

  for (const x of [-6.49, -4.60]) box(.073, .046, 13.38, bronze, x, .031, -10.53);
  for (const z of [-6, -8.5, -11, -13.75, -16.25]) box(1.9, .047, .13, z === -13.75 ? jade : bronze, -5.55, .034, z);

  const counterweightX = -3.15;
  for (const side of [-1, 1]) box(.10, .17, 14.15, 0x474c42, counterweightX + side * .35, -.34, -10.5);
  for (const z of [-4.2, -7.15, -10.1, -13.05, -16.85]) box(1.45, .22, .20, 0x56675a, -3.85, -.41, z);
  const weight = new T.Group();
  weight.name = 'spillway-counterweight';
  weight.position.set(counterweightX, -.12, -4);
  scene.add(weight);
  box(.78, .16, .86, 0x5b4a3d, 0, -.07, 0, weight);
  box(.65, .28, .66, bronze, 0, .08, 0, weight);
  const weightLamp = box(.27, .039, .33, 0xf1b574, 0, .24, 0, weight);
  weightLamp.material = weightLamp.material.clone();
  weightLamp.material.emissiveIntensity = .38;

  const guideRise = 2.25;
  const guideLength = Math.hypot(liftTop(1), liftTravel);
  const guideAngle = Math.atan2(liftTop(1), liftTravel);
  for (const side of [-1, 1]) {
    const x = side * 1.60;
    box(.14, .15, guideLength, bronze, x, liftTop(.5) + guideRise, liftZ(.5)).rotation.x = guideAngle;
  }
  for (const progress of [0, 1]) {
    const y = liftTop(progress) + guideRise, z = liftZ(progress);
    box(4.12, .21, .30, 0x75634e, 0, y + .015, z);
    for (const side of [-1, 1]) {
      const foot = progress ? lip - .12 : -8.3;
      const width = progress ? .32 : .47;
      box(width, y - foot, .45, stone, side * 2.08, (y + foot) / 2, z);
      collider(side * 2.08, (y + foot) / 2, z, width, y - foot, .45);
    }
  }

  const cabin = new T.Group();
  cabin.name = 'spillway-lift';
  scene.add(cabin);
  box(3.34, .40, 2.34, stone, 0, -.2, 0, cabin);
  box(3.27, .045, 2.28, 0x907357, 0, .025, 0, cabin);
  for (const x of [-1.56, 1.56]) box(.13, .08, 2.31, bronze, x, .065, 0, cabin);
  for (const x of [-1.60, 1.60]) {
    box(.095, guideRise, .10, 0xa78965, x, guideRise / 2, 0, cabin);
    box(.25, .21, .29, 0x5b4a3d, x, guideRise, 0, cabin);
  }
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

  const upperGateZ = -22.02, upperGateHeight = 5.0, upperGateTravel = 2.95;
  const upperGrate = new T.Group();
  upperGrate.name = 'spillway-upper-grate';
  upperGrate.position.set(0, lip, upperGateZ);
  scene.add(upperGrate);
  for (let bar = -4; bar <= 4; bar++) box(.11, upperGateHeight, .15, bronze, bar * .43, upperGateHeight / 2, 0, upperGrate);
  for (const y of [.14, 1.45, 3.3, 4.9]) box(4.03, .14, .25, 0x9a7751, 0, y, 0, upperGrate);
  const upperBarrier = collider(0, lip + upperGateHeight / 2, upperGateZ, 4.03, upperGateHeight, .25);
  const dockSignal = new T.MeshBasicMaterial({ color: 0xeead61 });
  for (const side of [-1, 1]) {
    solidWall(4.62, upperGateHeight, .56, side * 4.30, lip + upperGateHeight / 2, upperGateZ);
    solidWall(.56, upperGateHeight, 1.28, side * 6.34, lip + upperGateHeight / 2, -22.39);
    solidWall(.30, upperGateHeight + upperGateTravel + .1, .47, side * 2.11, lip + (upperGateHeight + upperGateTravel + .1) / 2, upperGateZ);
    box(.53, lip + 8.3, .67, stone, side * 6.34, (lip - 8.3) / 2, -22.39);
    box(.46, .22, .39, bronze, side * 2.11, lip + 1.13, upperGateZ + .33).material = dockSignal;
  }
  box(4.53, .25, .52, bronze, 0, lip + upperGateHeight + upperGateTravel + .08, upperGateZ);
  const dock = new T.Group();
  dock.name = 'spillway-upper-dock';
  scene.add(dock);
  const dockFloor = { x: 0, y: lip, z: -21.24, w: 3.44, d: 1.91 };
  box(dockFloor.w, .24, dockFloor.d, 0x5d6f62, 0, lip - .12, dockFloor.z, dock);
  for (const x of [-1.61, 1.61]) box(.13, .045, 1.88, bronze, x, lip + .026, dockFloor.z, dock);
  const dockSupport = collider(0, lip - .12, dockFloor.z, dockFloor.w, .24, dockFloor.d);

  function solidWall(w, h, d, x, y, z) {
    box(w, h, d, stone, x, y, z);
    collider(x, y, z, w, h, d);
  }
  function placeUpperGrate(y) {
    upperGrate.position.y = y;
    upperBarrier.setTranslation({ x: 0, y: y + upperGateHeight / 2, z: upperGateZ });
  }
  function setDock(open) {
    if (dock.visible === open) return;
    dock.visible = open;
    dockSupport.setEnabled(open);
    dockSignal.color.setHex(open ? jade : 0xeead61);
  }
  setDock(false);

  const takeoffLamp = pedestal({ x: -9.52, y: 0, z: -16.52 }, 0xf1b574);
  takeoffLamp.name = 'spillway-takeoff-lamp';
  const takeoffMark = new T.MeshBasicMaterial({ color: 0xe5a75c });
  for (const [x, z, length, direction] of [
    [-5.54, -15.3, .68, 0], [-5.54, -16.28, .55, 0],
    [-6.52, -16.80, .6, Math.PI / 2], [-7.45, -16.80, .6, Math.PI / 2],
    [-8.42, -17.24, .60, 0],
  ]) {
    const arrow = new T.Mesh(new T.ConeGeometry(.26, length, 3), takeoffMark);
    arrow.rotation.order = 'YXZ';
    arrow.rotation.set(-Math.PI / 2, direction, 0);
    arrow.scale.set(1, 1, .12);
    arrow.position.set(x, .055, z);
    scene.add(arrow);
  }

  const stones = [
    [-8.7, 1.0, -18.91, 2.76, 2.04], [-9.15, 2.15, -20.86, 2.54, 1.82],
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
    box(4.46, 4.62, .82, stone, side * 4.22, gateY + 2.31, gateZ);
    collider(side * 4.22, gateY + 2.31, gateZ, 4.46, 4.62, .82);
    box(1.12, 4.35, 7.73, stone, side * 2.62, gateY + 2.175, -54.94);
    collider(side * 2.62, gateY + 2.175, -54.94, 1.12, 4.35, 7.73);
  }
  const chamberRoof = { y: gateY + 4.43, z: -54.94, w: 5.68, h: .38, d: 7.73 };
  box(chamberRoof.w, chamberRoof.h, chamberRoof.d, stone, 0, chamberRoof.y, chamberRoof.z);
  collider(0, chamberRoof.y, chamberRoof.z, chamberRoof.w, chamberRoof.h, chamberRoof.d);
  box(4.2, 4.40, .35, 0x46574e, 0, gateY + 2.2, -58.51);
  collider(0, gateY + 2.2, -58.51, 4.2, 4.4, .35);
  box(4.16, .72, .68, bronze, 0, gateY + 4.02, gateZ);
  collider(0, gateY + 4.02, gateZ, 4.16, .72, .68);
  const gate = new T.Group();
  gate.position.set(0, gateY, gateZ);
  scene.add(gate);
  for (const side of [-1, 1]) {
    box(.14, 7.78, .16, 0x97744a, side * 1.87, gateY + 3.89, gateZ - .12);
    box(.28, 2.72, .30, stone, side * 1.66, gateY + 1.36, exitZ + .03);
  }
  box(3.92, .22, .38, bronze, 0, gateY + 7.71, gateZ);
  for (let bar = -4; bar <= 4; bar++) box(.125, 3.68, .24, bronze, bar * .43, 1.84, 0, gate);
  for (const y of [.48, 2.65]) box(3.72, .20, .27, stone, 0, y, 0, gate);
  const obstruction = collider(0, gateY + 1.84, gateZ, 3.72, 3.68, .34);
  const portal = mesh(new T.TorusGeometry(1.4, .19, 8, 32), bronze, 0, gateY + 1.45, exitZ);
  const gateLight = new T.MeshBasicMaterial({ color: jade, side: T.DoubleSide, transparent: true, opacity: .09 });
  const lightDisk = new T.Mesh(new T.CircleGeometry(1.22, 28), gateLight);
  lightDisk.position.copy(portal.position);
  scene.add(lightDisk);

  let progress = 0, observedProgress = 0, grip = false, brake = false, brakeCall = 0, handledBrake = 0;
  let stairs = false, raisingGate = false, remoteGate = false, gateCaught = false, gateHeight = 0, time = 0;
  let stairsVisible = false, stairsTime = 0, stairCall = 0, handledStair = 0;
  let kaiUp = false, lampActive = false, gateAudible = false, latchRequested = false;

  function reset() {
    progress = observedProgress = brakeCall = handledBrake = gateHeight = 0;
    grip = brake = stairs = raisingGate = remoteGate = gateCaught = false;
    stairsTime = stairCall = handledStair = 0;
    kaiUp = lampActive = gateAudible = latchRequested = false;
    intake.reset();
    galleryRelay.reset();
    placeCabin();
    placeUpperGrate(lip);
    setDock(false);
    setStairs(false);
    gate.position.y = gateY;
    obstruction.setTranslation({ x: 0, y: gateY + 1.84, z: gateZ });
  }
  function placeCabin() {
    const y = liftTop(progress), z = liftZ(progress);
    cabin.position.set(0, y, z);
    cabinBody.setTranslation({ x: 0, y: y - .2, z }, true);
    world.propagateModifiedBodyPositionsToColliders();
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
    intake.update(dt, context);
    if (kaiUp) galleryRelay.update(dt, context);
    const authoritative = solo || role === 0;
    const kai = role === 0 ? pos : other;
    const previous = progress;
    const wasRiding = (grounded || context.vertical <= 0) && onDeck(pos, previous, .14);
    const waitingRider = solo && onDeck(other, previous);
    if (authoritative) {
      if (peer?.slot === 1) {
        if (Number.isSafeInteger(peer.spillBrakeCall) && peer.spillBrakeCall > handledBrake) {
          handledBrake = peer.spillBrakeCall;
          if (Math.abs(progress - mark) < .075 && onDeck(peer, progress, .55)) brake = true;
        }
        if (brake && Number.isSafeInteger(peer.spillStairCall) && peer.spillStairCall > handledStair) {
          handledStair = peer.spillStairCall;
          if (at(other, rune, 2.3)) { stairs = true; stairsTime = 33; }
        }
        if (galleryRelay.opened && gateHeight >= 2.28 && peer.spillLatch === true && at(other, catchPoint, 2.3)) gateCaught = true;
      }
      if (!onRail(kai) || !intake.opened) grip = false;
      if (stairs && kai && kai.y >= lip - .16 && Math.abs(kai.x) < 6.6 && kai.z < -21 && kai.z > -30.14) kaiUp = true;
      stairsTime = Math.max(0, stairsTime - dt);
      const requested = brake ? mark : grip ? T.MathUtils.clamp((-kai.z - 4) / 13, 0, .82) : 0;
      progress = moveLift(T.MathUtils, progress, requested, brake ? 11 : 3.15, dt);
    } else if (peer?.slot === 0) {
      if (Number.isFinite(peer.spillProgress)) observedProgress = T.MathUtils.clamp(peer.spillProgress, 0, 1);
      brake ||= peer.spillBrake === true;
      remoteGate = peer.spillGate === true;
      stairs = peer.spillStairs === true;
      kaiUp ||= peer.spillKaiUp === true;
      stairsTime = Number.isFinite(peer.spillStairsTime) ? Math.max(0, peer.spillStairsTime) : 0;
      gateCaught ||= peer.spillCaught === true;
      if (!at(pos, catchPoint)) latchRequested = false;
      progress = moveLift(T.MathUtils, progress, brake ? mark : observedProgress, 13, dt);
    }
    placeCabin();
    placeUpperGrate(T.MathUtils.damp(upperGrate.position.y, lip + (brake ? upperGateTravel : 0), 8, dt));
    setDock(brake);
    if (wasRiding) carry(liftTop(progress) - liftTop(previous), liftZ(progress) - liftZ(previous));
    if (waitingRider) {
      other.y += liftTop(progress) - liftTop(previous);
      other.z += liftZ(progress) - liftZ(previous);
    }
    weight.position.z = -4 - 13 * progress;
    const atStop = atMark(progress) || brake;
    if (atStop && !lampActive) sound(560, .20, 'sine', .11);
    lampActive = atStop;
    weightLamp.material.emissive.setHex(atStop ? jade : 0xf1b574);
    cabinPlate.material.color.setHex(atStop ? jade : 0xb8995b);
    setStairs(stairsTime > 0);
    const stairColor = stairsVisible ? jade : 0xe5a75c;
    takeoffLamp.material.color.setHex(stairColor);
    takeoffMark.color.setHex(stairColor);
    for (const step of stones) if (stairsVisible) step.surface.material.emissiveIntensity = stairsTime > 6 ? .67 : .38 + .35 * Math.sin(time * 14);

    const underGate = person => person && Math.abs(person.y - gateY) < 1.2 &&
      Math.abs(person.x) < 1.8 && Math.abs(person.z - gateZ) < .83;
    const gateOpen = gateCaught || (authoritative ? raisingGate && at(kai, winch) : remoteGate);
    const holdDoor = gateHeight > 2.65 && (underGate(pos) || underGate(other));
    const desiredHeight = gateOpen || holdDoor ? 3.85 : 0;
    gateHeight = T.MathUtils.damp(gateHeight, desiredHeight, 8.4, dt);
    gate.position.y = gateY + gateHeight;
    obstruction.setTranslation({ x: 0, y: gate.position.y + 1.84, z: gateZ });
    if (gateOpen && !gateAudible) sound(151, .42, 'triangle', .13);
    gateAudible = gateOpen;
    gateLight.opacity = gateCaught ? .61 : .09;
  }

  function interact(context) {
    const { pos, role, solo, grounded } = context;
    if (!intake.opened) return intake.interact(context);
    if (kaiUp && !galleryRelay.opened) return galleryRelay.interact(context);
    if (role === 0) {
      if (!brake && onRail(pos)) { grip = !grip; return 1; }
      if (galleryRelay.opened && !gateCaught && at(pos, winch)) { raisingGate = !raisingGate; return 1; }
    }
    if (role === 1) {
      if (!brake && grounded && onDeck(pos, progress)) {
        if (!atMark(progress)) return 0;
        if (solo) brake = true;
        else brakeCall++;
        return 2;
      }
      if (brake && at(pos, rune)) {
        stairCall++;
        if (solo) { stairs = true; stairsTime = 33; }
        return 2;
      }
      if (galleryRelay.opened && !gateCaught && at(pos, catchPoint)) {
        if (gateHeight < 2.35) return 0;
        if (solo) gateCaught = true;
        else latchRequested = true;
        return 2;
      }
    }
    return -1;
  }

  function status({ pos, role, solo, won }) {
    if (won) return { hint: 'Оба героя у выхода. Водосброс открыт!', power: 'Способность' };
    if (gateCaught) return { hint: 'Затвор закреплён. Соберитесь у портала.', power: role === 0 ? 'Рывок' : 'Магия' };
    if (!intake.opened) return intake.status({ pos, role });
    if (kaiUp && !galleryRelay.opened) return galleryRelay.status({ pos, role });
    if (galleryRelay.opened) {
      if (role === 0) return at(pos, winch) ? {
        hint: raisingGate ? 'Удерживай затвор, пока Люми не закрепит его за проходом.' : 'Магнит поднимет затвор. Оставайся у механизма, пока Люми проходит.',
        power: raisingGate ? 'Отпустить' : 'Поднять',
      } : { hint: 'Спустись из галереи. У левой стены перед затвором есть привод.', power: 'Рывок' };
      if (at(pos, catchPoint)) return gateHeight >= 2.35
        ? { hint: 'Закрепи затвор, чтобы Кай мог пройти.', power: 'Фиксатор' }
        : { hint: 'Попроси Кая снова поднять затвор, чтобы закрепить его.', power: 'Фиксатор' };
      return { hint: 'Спустись из галереи. Когда Кай поднимет затвор, пройди к фиксатору за ним.', power: 'Магия' };
    }
    if (stairsTime > 0 && role === 0) {
      const next = pos.x < -7.15 ? 'Прыгай от фонаря по бирюзовым ступеням.' : 'Иди по бирюзовым стрелкам к фонарю на левом выступе.';
      return { hint: next + ' Осталось ' + Math.ceil(stairsTime) + ' с.', power: 'Рывок' };
    }
    if (brake) {
      if (role === 0) return { hint: 'Иди к янтарному фонарю слева в конце рельсов. Люми создаст там ступени.', power: 'Рывок' };
      return at(pos, rune) ? { hint: 'Создай ступени для Кая. Если время истечёт, активируй руну снова.', power: 'Ступени' }
        : { hint: 'Сойди с подъёмника на верхнюю площадку и найди руну справа.', power: 'Магия' };
    }
    if (role === 0) {
      if (onRail(pos)) return { hint: grip ? 'Веди противовес вдоль рельсов. Люми скажет, когда остановиться.' : 'Включи магнит на рельсах после того, как Люми встанет на подъёмник.', power: grip ? 'Отпустить' : 'Магнит' };
      return { hint: 'Путь Кая слева вдоль медных рельсов. Подъёмник Люми в центре.', power: 'Рывок' };
    }
    if (onDeck(pos, progress)) return { hint: atMark(progress) ? 'Отметки совпали. Нажми «Стоп», чтобы открыть верхнюю решётку.' : (solo ? 'Смени героя на Кая, чтобы подвинуть противовес.' : 'Подскажи Каю, когда площадка сравняется с бирюзовой отметкой.'), power: 'Стоп' };
    if (pos.y >= lip - .2 && pos.z < upperGateZ) return { hint: 'Подъёмник не зафиксирован. Нажми ↺ или R, чтобы вернуться к контрольной точке.', power: 'Магия' };
    return { hint: 'Встань на подъёмник в центре. Кай направит его по рельсу.', power: 'Магия' };
  }

  return {
    start, checkpoints, update, reset, interact, status,
    canDash: ({ role, pos }) => role === 0 && !onRail(pos),
    checkpoint: point => point === route.exit ? gateCaught : point === route.gateBase ? galleryRelay.opened : point.y === lip ? brake : point !== rail && point !== launch || intake.opened,
    supportsRider(pos) { return onDeck(pos, progress, .085) && pos.y > liftTop(progress) - .03; },
    groundHeight(pos) {
      const surfaces = stairsVisible ? [...checkpoints, ...stones] : checkpoints;
      const deck = onDeck(pos, progress, .19) ? liftTop(progress) : null;
      const covers = point => Math.abs(pos.x - point.x) < point.w / 2 &&
        Math.abs(pos.z - point.z) < point.d / 2 && Math.abs(pos.y - point.y) < .12;
      if (brake && covers(dockFloor)) return lip;
      return deck ?? surfaces.find(covers)?.y;
    },
    state: context => ({ spillProgress: progress, spillBrake: brake, spillBrakeCall: brakeCall,
      spillStairs: stairs, spillStairCall: stairCall, spillStairsTime: stairsTime, spillKaiUp: kaiUp,
      ...intake.state(), ...galleryRelay.state(), spillGate: raisingGate && at(context.role === 0 ? context.pos : context.other, winch), spillCaught: gateCaught, spillLatch: latchRequested }),
    title: ({ pos }) => !intake.opened ? (pos.z > 5 ? 'Набережная' : 'Водозабор') : !brake ? 'Подъёмник' : !kaiUp ? 'Ступени' : !galleryRelay.opened ? 'Галерея' : 'Нижний затвор',
    indicators: () => [['Решётка', intake.opened], ['Подъёмник', brake], ['Затвор', gateCaught]],
    finish: ({ pos, other }) => gateCaught && [pos, other].every(person => at(person, { x: 0, y: gateY, z: exitZ }, 1.78)),
    animate(dt) {
      time += dt;
      waterfall.children.forEach((stream, index) => { stream.material.opacity = .15 + .33 * (Math.sin(time * 3.4 + index * .85) * .5 + .5); });
      for (const beacon of beacons) beacon.rotation.y += dt * .7;
      takeoffLamp.rotation.y += dt * (stairsVisible ? 2.2 : .7);
    },
  };
}
