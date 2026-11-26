import R from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.17.3/+esm';
import * as T from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { buildTempleArt, templeTexture } from './temple-art.js';
import { createOpticalCourt } from './optics.js';
import { moveAvatar } from './avatar-motion.js?v=spillway3';
import { createRoomSocket } from './rooms.js?v=rooms2';

await R.init();
const isSpillway = document.body.dataset.trial === 'spillway';
const $=id=>document.getElementById(id),socket=createRoomSocket(isSpillway ? 'spillway5' : 'reflections'),scene=new T.Scene();
scene.background=new T.Color(0xa3b9a7);scene.fog=new T.FogExp2(0xa3b9a7,.021);
const camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.15,160),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;document.body.prepend(renderer.domElement);scene.add(new T.HemisphereLight(0xcceadb,0x384751,1.52));const sun=new T.DirectionalLight(0xffd5a1,2.8);sun.position.set(-17,24,6);scene.add(sun,sun.target);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:65});sun.shadow.bias=-.0005;sun.shadow.normalBias=.055;
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,flatShading:true,roughness:.85}));return mats.get(c)}function mesh(g,c,x,y,z,parent=scene,shadow=true){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m}function box(w,h,d,c,x,y,z,parent=scene){return mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent)}
const world=new R.World({x:0,y:-22,z:0});
const physicsStep = 1 / 60;
world.timestep = physicsStep;
const controller = world.createCharacterController(.025);
controller.enableSnapToGround(.16);
controller.setMaxSlopeClimbAngle(.75);
const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.85,3));const capsule=world.createCollider(R.ColliderDesc.capsule(.52,.32),body);
function collider(x, y, z, w, h, d) {
  return world.createCollider(R.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z));
}
function floor(x, y, z, w, d, color) {
  box(w, .55, d, color, x, y - .275, z);
  collider(x, y - .275, z, w, .55, d);
  return { x, y, z, w, d };
}
function block(x, y, z, w, h, d, color) {
  box(w, h, d, color, x, y, z);
  collider(x, y, z, w, h, d);
}

function createBridgeTrial() {
  const stone = 0x465d57;
  const bronze = 0xb77942;
  const kaiColor = 0xf1a653;
  const lumiColor = 0x69ddd5;
  const woodGrain = templeTexture('wood');
  const brushedBronze = templeTexture('bronze');
  mat(bronze).map = brushedBronze;
  for (const color of [0x856c51, 0x967c5d]) mat(color).map = woodGrain;
  const start = floor(0, 0, -1, 12, 12, 0x666b63);
  const ledge = floor(0, 0, -16.25, 3.8, 3.1, 0x666b63);
  const farBank = floor(0, 0, -31, 12, 11, 0x666b63);
  const annexes = [];
  for (const side of [-1, 1]) {
    const annex = floor(side * 9.15, 0, -31.5, 4.4, 9.25, 0x5d6c5c);
    annex.safeZ = -30;
    annexes.push(annex);
    for (const z of [-28.35, -34.65]) {
      floor(side * 6.48, 0, z, 1.05, 2.05, 0x696f5c);
      for (const edge of [-1, 1]) box(1.05, .038, .078, bronze, side * 6.48, .023, z + edge * .89);
    }
  }
  const checkpoints = [start, ledge, farBank, ...annexes];
  const optics = createOpticalCourt(scene, collider);

  for (const bank of [start, farBank]) {
    for (const side of [-1, 1]) {
      for (const z of [bank.z - 3, bank.z + 2]) {
        const x = side * 4.8;
        block(x, 1.43, z, .87, 2.86, .87, stone);
        box(1.16, .29, 1.16, 0x798371, x, .155, z);
        box(1.08, .15, 1.08, bronze, x, 2.35, z);
        box(1.2, .32, 1.2, 0x8f9173, x, 2.78, z);
        box(.12, .045, 4.5, bronze, side * 1.35, .026, z);
      }
    }
  }
  for (const landing of checkpoints) {
    box(landing.w * .62, .045, .14, bronze, 0, .026, landing.z + landing.d / 2 - .22);
  }

  const crank = { x: -2.6, z: -5.05 };
  const relay = { x: 1.28, z: -16.25 };
  const anchor = { x: 2.6, z: -27.7 };

  function station({ x, z }, color, height = 1.25) {
    const pedestal = mesh(new T.CylinderGeometry(.42, .55, height, 6), stone, x, height / 2, z);
    collider(x, height / 2, z, .85, height, .85);
    box(1.09, .14, 1.09, bronze, x, .073, z);
    const light = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .65 });
    const dial = new T.Mesh(new T.TorusGeometry(.34, .085, 7, 18), light);
    dial.rotation.x = -Math.PI / 2;
    dial.position.y = height / 2 + .1;
    pedestal.add(dial);
    const beacon = new T.Mesh(new T.OctahedronGeometry(.18), light);
    beacon.position.y = height / 2 + .34;
    pedestal.add(beacon);
    return light;
  }

  const crankLight = station(crank, kaiColor);
  const anchorLight = station(anchor, lumiColor);
  const relayLight = station(relay, kaiColor, .73);

  function rotatingDeck(z) {
    const width = 2.65, length = 7.55, thickness = .48;
    const pivot = new T.Group();
    pivot.position.set(0, -thickness / 2, z);
    pivot.rotation.y = Math.PI / 2;
    scene.add(pivot);
    box(width, thickness, length, stone, 0, 0, 0, pivot);
    for (let row = 0; row < 8; row++) {
      box(width - .31, .025, length / 8 - .045, row % 2 ? 0x856c51 : 0x967c5d,
        0, thickness / 2 + .014, -length / 2 + (row + .5) * length / 8, pivot);
    }
    mesh(new T.CylinderGeometry(.65, .65, .044, 8), bronze, 0, thickness / 2 + .038, 0, pivot);
    for (const x of [-1.05, 1.05]) {
      box(.11, .033, length - .25, bronze, x, thickness / 2 + .019, 0, pivot);
    }
    for (const offset of [-3.25, 3.25]) {
      box(1.95, .035, .16, bronze, 0, thickness / 2 + .019, offset, pivot);
    }
    mesh(new T.CylinderGeometry(.72, .94, 6.1, 10), 0x665741, 0, -3.4, z);
    mesh(new T.CylinderGeometry(1.27, 1.27, .33, 12), bronze, 0, -.63, z);
    mesh(new T.CylinderGeometry(1.03, 1.16, .41, 10), 0x4e594f, 0, -1.0, z);
    const descriptor = R.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, -thickness / 2, z)
      .setRotation(pivot.quaternion);
    const rigidBody = world.createRigidBody(descriptor);
    world.createCollider(R.ColliderDesc.cuboid(width / 2, thickness / 2, length / 2), rigidBody);
    return { pivot, rigidBody, z, width, length, angle: Math.PI / 2 };
  }

  const decks = [rotatingDeck(-10.85), rotatingDeck(-21.65)];
  const portalZ = -34;
  const portal = mesh(new T.TorusGeometry(1.45, .2, 9, 36), bronze, 0, 1.52, portalZ);
  const portalLight = new T.MeshBasicMaterial({ color: lumiColor, transparent: true, opacity: .13, side: T.DoubleSide });
  const glow = new T.Mesh(new T.CircleGeometry(1.27, 32), portalLight);
  glow.position.copy(portal.position);
  scene.add(glow);

  const animateTemple = buildTempleArt(scene, checkpoints);
  // The arch posts match the stonework at the far end of the bank.
  for (const side of [-1, 1]) collider(side * 3.615, 1.62, -35.55, 1.14, 3.24, 1.36);

  let bridgeTurn = 0, bridgeLocked = false;
  const nextAngle = (index) => bridgeLocked || (bridgeTurn > 0 && (bridgeTurn - 1) % 2 === index)
    ? 0 : Math.PI / 2;

  function updateDecks(dt) {
    for (const [index, deck] of decks.entries()) {
      const target = nextAngle(index);
      if (deck.angle === target) continue;
      const previous = deck.angle;
      const angle = previous + T.MathUtils.clamp(target - previous, -2.1 * dt, 2.1 * dt);
      if (ground && Math.abs(pos.y) < .12) {
        const z = pos.z - deck.z;
        const localX = pos.x * Math.cos(previous) - z * Math.sin(previous);
        const localZ = pos.x * Math.sin(previous) + z * Math.cos(previous);
        if (Math.abs(localX) < deck.width / 2 && Math.abs(localZ) < deck.length / 2) {
          pos.x = localX * Math.cos(angle) + localZ * Math.sin(angle);
          pos.z = deck.z - localX * Math.sin(angle) + localZ * Math.cos(angle);
          body.setTranslation({ x: pos.x, y: pos.y + .84, z: pos.z }, true);
        }
      }
      deck.angle = angle;
      deck.pivot.rotation.y = angle;
      deck.rigidBody.setNextKinematicRotation(deck.pivot.quaternion);
    }
    relayLight.emissiveIntensity = solo ? .65 : .06;
    crankLight.emissiveIntensity = bridgeLocked ? .12 : .65;
    anchorLight.emissiveIntensity = bridgeLocked ? 1.5 : bridgeTurn > 0 && bridgeTurn % 2 === 0 ? 1 : .24;
    portalLight.opacity = optics.isReady() ? .68 : .13;
  }

  const bridgeMoving = () => decks.some((deck, index) => Math.abs(nextAngle(index) - deck.angle) > .005);
  const near = ({ x, z }, radius = 1.85) => Math.abs(pos.y) < 1.2 && Math.hypot(pos.x - x, pos.z - z) < radius;

  function atCrank() {
    return near(crank) || (solo && near(relay, 1.55));
  }

  function useBridgePower() {
    if (bridgeLocked) return false;
    if (atCrank()) {
      if (slot === 0 && !bridgeMoving()) {
        bridgeTurn += 1;
        actionCount[slot]++;
        sound(180, .28, 'triangle', .12);
      }
      return true;
    }
    if (near(anchor)) {
      if (slot === 1 && bridgeTurn > 0 && bridgeTurn % 2 === 0 && !bridgeMoving()) {
        bridgeLocked = true;
        actionCount[slot]++;
        sound(523.25, .35, 'sine');
        sound(783.99, .8, 'triangle', .085);
      }
      return true;
    }
    return false;
  }

  function bridgeHint() {
    if (won) return 'Портал открыт. Испытание пройдено!';
    if (bridgeLocked) return pos.z > -25.5 ? 'Мост закреплён. Перейди во двор с зеркалами.' : optics.hint(pos, slot, solo);
    if (near(anchor)) {
      if (slot !== 1) return solo ? 'Переключись на Люми у бирюзовой печати.' : 'Люми должна закрепить мост у печати.';
      return bridgeTurn > 0 && bridgeTurn % 2 === 0
        ? 'Нажми «Закрепить», когда вторая секция остановится.'
        : 'Вторая секция должна смотреть вдоль моста.';
    }
    if (solo && near(relay, 1.55)) {
      if (bridgeTurn > 0 && bridgeTurn % 2 === 0) return 'Пройди по второй секции к бирюзовой печати.';
      return slot === 0 ? 'Нажми «Повернуть» у пульта, чтобы развернуть вторую секцию.' : 'Переключись на Кая у пульта на площадке.';
    }
    if (slot === 0) {
      if (bridgeTurn === 0) return 'Подойди к янтарному пульту слева и поверни первую секцию.';
      if (bridgeTurn % 2 === 1) return solo ? 'Перейди на площадку посередине моста.' : 'Когда Люми будет на площадке, поверни вторую секцию.';
      return solo ? 'Перейди по второй секции и переключись на Люми у печати.' : 'Подожди, пока Люми закрепит мост. Можно вернуть первую секцию, если она упала.';
    }
    if (bridgeTurn === 0) return 'Подожди, пока Кай повернёт первую секцию.';
    if (bridgeTurn % 2 === 1) return pos.z < -14.7 ? 'Ты на площадке. Попроси Кая повернуть вторую секцию.' : 'Пройди по первой секции до площадки.';
    return 'Пройди по второй секции к бирюзовой печати на дальнем берегу.';
  }

  function abilityLabel() {
    if (bridgeLocked && !optics.isReady() && optics.stationAt(pos) === slot) return slot === 0 ? 'Цвет луча' : 'Зеркало';
    if (!bridgeLocked && slot === 0 && atCrank()) return 'Повернуть';
    if (!bridgeLocked && slot === 1 && near(anchor)) return 'Закрепить';
    return slot === 1 ? 'Магия' : 'Рывок';
  }

  return {
    start, checkpoints,
    reset() { bridgeTurn = 0; bridgeLocked = false; optics.reset(); },
    update(dt, { peer, role, solo }) {
      if (peer?.slot === 0 && Number.isSafeInteger(peer.bridgeTurn) && peer.bridgeTurn > bridgeTurn) bridgeTurn = peer.bridgeTurn;
      if (peer?.slot === 1 && peer.bridgeLocked === true) bridgeLocked = true;
      updateDecks(dt);
      optics.receive(peer);
      if (optics.update(dt, bridgeLocked, solo || role === 0)) sound(589, .46, 'sine', .11);
    },
    interact() {
      if (bridgeLocked && !optics.isReady() && optics.stationAt(pos) >= 0) {
        return optics.use(pos, slot) ? (slot === 0 ? 3 : 4) : 0;
      }
      return useBridgePower() ? 0 : -1;
    },
    status() { return { hint: bridgeHint(), power: abilityLabel() }; },
    indicators() {
      const court = bridgeLocked && pos.z <= -25.5;
      const { charged } = optics.state();
      return court
        ? [['Янтарный', Boolean(charged & 1)], ['Бирюзовый', Boolean(charged & 2)], ['Портал', optics.isReady()]]
        : [['Секция 1', nextAngle(0) === 0], ['Секция 2', nextAngle(1) === 0], ['Печать', bridgeLocked]];
    },
    title: () => bridgeLocked && pos.z <= -25.5 ? 'Зал отражений' : 'Поворотный мост',
    state: () => ({ bridgeTurn, bridgeLocked, ...optics.state() }),
    finish({ pos, other, solo }) {
      const atPortal = point => point && Math.hypot(point.x, point.z - portalZ) < 1.7 && Math.abs(point.y) < 1.2;
      return bridgeLocked && optics.isReady() && atPortal(pos) && (solo || atPortal(other));
    },
    animate() { animateTemple(phase); },
  };
}

const trial = isSpillway
  ? (await import('./spillway.js?v=spillway5')).createSpillway({ T, R, scene, world, box, mesh, floor, collider, sound })
  : createBridgeTrial();
const { start, checkpoints } = trial;


function updateInterface(context) {
  const role = slot === 1 ? 'lumi' : 'kai';
  if ($('controls').dataset.role !== role) $('controls').dataset.role = role;
  const { hint, power } = trial.status(context);
  const labels = {
    hero: slot === 1 ? 'Люми' : 'Кай',
    status: solo ? 'Одиночная игра' : 'Кооператив',
    hud: hint,
    power,
    'section-title': trial.title(context),
  };
  for (const [name, value] of Object.entries(labels)) {
    const element = $(name);
    if (element.textContent !== value) element.textContent = value;
  }
  for (const [index, id] of ['section-one', 'section-two', 'seal'].entries()) {
    const [label, active] = trial.indicators()[index];
    const element = $(id);
    if (element.textContent !== label) element.textContent = label;
    if (element.dataset.active !== String(active)) element.dataset.active = String(active);
  }
}

// Original synthesized ambient score and sound effects, activated by user gesture.
let audio,master,musicGain,fxGain,beat=0;function sound(f,d=.15,type='sine',vol=.12,bus=fxGain){if(!audio||!bus)return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(vol,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(bus);o.start();o.stop(t+d+.03)}function startAudio(){if(audio){audio.resume();return}try{audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.45;master.connect(audio.destination);musicGain=audio.createGain();fxGain=audio.createGain();musicGain.gain.value=.55;fxGain.gain.value=.8;musicGain.connect(master);fxGain.connect(master);setInterval(()=>{if(!me||audio.state!=='running')return;let notes=[130.81,164.81,196,146.83,110,130.81,174.61,196];let f=notes[beat++%notes.length];sound(f,2.8,'sine',.14,musicGain);sound(f*2,1.2,'triangle',.035,musicGain)},950)}catch{}}document.addEventListener('click', startAudio, { once: true });
function avatar(index) {
  const lumi = index === 1;
  const group = new T.Group();
  scene.add(group);
  const model = new T.Group();
  group.add(model);
  const top = new T.Group();
  top.position.y = .75;
  model.add(top);
  const torso = new T.Group();
  torso.position.y = -.75;
  top.add(torso);
  let cape;
  const fabric = lumi ? 0x267c78 : 0x474744;
  const trim = lumi ? 0x90e4ce : 0xe9aa5c;
  const hide = lumi ? 0x275352 : 0x543d35;
  const metal = lumi ? 0x759a8f : 0x9d613a;
  const skin = lumi ? 0xd39d7c : 0xc78759;
  const limbs = new T.CapsuleGeometry(.088, .26, 2, 7);
  const boots = new T.BoxGeometry(lumi ? .178 : .225, .16, lumi ? .284 : .33);
  const jointShell = new T.IcosahedronGeometry(.106, 1);

  const jacket = mesh(new T.CylinderGeometry(lumi ? .248 : .326, lumi ? .232 : .237, .57, 8), fabric, 0, 1.015, 0, torso);
  jacket.scale.z = .76;
  mesh(new T.CylinderGeometry(.267, .225, .21, 8), hide, 0, .755, 0, torso).scale.z = .81;
  mesh(new T.CylinderGeometry(.129, .142, .16, 7), hide, 0, 1.305, 0, torso);
  box(.36, .21, .12, lumi ? 0x328d87 : metal, 0, 1.09, .144, torso);
  mesh(new T.IcosahedronGeometry(.225, 1), skin, 0, 1.485, .057, torso).scale.set(.96, 1.10, .89);
  const hood = mesh(new T.IcosahedronGeometry(lumi ? .275 : .243, 1), lumi ? hide : metal,
    0, 1.57, lumi ? -.045 : -.062, torso);
  hood.scale.set(1.13, 1.06, .92);
  box(.35, .10, .31, hide, 0, .74, 0, torso);
  box(.12, .10, .07, trim, 0, .75, .17, torso);
  for (const side of [-1, 1]) {
    box(.055, .026, .024, 0x26353a, side * .074, 1.52, .241, torso);
    box(.062, .017, .021, lumi ? 0x23413e : 0x57352a, side * .074, 1.557, .24, torso).rotation.z = side * .11;
  }

  mesh(new T.OctahedronGeometry(.054), skin, 0, 1.475, .244, torso).scale.set(.65, .94, .72);
  box(.072, .012, .024, lumi ? 0x824d45 : 0x76483a, 0, 1.419, .231, torso);
  if (lumi) {
    const ponytail = mesh(new T.IcosahedronGeometry(.16, 0), 0x163a38, 0, 1.46, -.222, torso);
    ponytail.scale.set(.66, 1.30, .78);
    box(.178, .043, .094, trim, 0, 1.48, -.262, torso);
    const panels = [
      [-.24, 1.23, -.14, .24, 1.23, -.14, .36, .57, -.24],
      [-.24, 1.23, -.14, .36, .57, -.24, -.33, .62, -.28],
      [-.33, .62, -.28, .36, .57, -.24, 0, .4, -.30],
    ];
    const cloak = new T.BufferGeometry();
    cloak.setAttribute('position', new T.Float32BufferAttribute(panels.flat(), 3));
    cloak.translate(0, -1.23, .14);
    cloak.computeVertexNormals();
    cape = new T.Group();
    cape.position.set(0, 1.23, -.14);
    torso.add(cape);
    const fabricMesh = new T.Mesh(cloak, new T.MeshStandardMaterial({ color: hide, flatShading: true, side: T.DoubleSide }));
    fabricMesh.castShadow = true;
    cape.add(fabricMesh);
    const rune = mesh(new T.OctahedronGeometry(.142), trim, 0, -.20, -.102, cape);
    rune.scale.z = .22;
    const clasp = mesh(new T.OctahedronGeometry(.099), trim, 0, 1.21, .185, torso);
    clasp.scale.z = .35;
  } else {
    box(.38, .46, .22, hide, 0, 1.02, -.25, torso);
    box(.19, .39, .11, metal, 0, 1.03, -.40, torso);
    for (const side of [-1, 1]) {
      mesh(new T.CylinderGeometry(.071, .071, .34, 7), metal, side * .17, .98, -.40, torso);
      box(.054, .13, .035, trim, side * .17, .97, -.471, torso);
    }
    box(.29, .063, .10, hide, 0, 1.613, .197, torso);
    for (const side of [-1, 1]) box(.104, .055, .049, trim, side * .083, 1.615, .244, torso);
    const harness = box(.075, .44, .048, hide, -.15, 1.025, .204, torso);
    harness.rotation.z = -.30;
  }

  const legs = [], arms = [];
  let abilityFx;
  function joint(parent, x, y, z) {
    const node = new T.Bone();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }
  for (const side of [-1, 1]) {
    const hip = joint(model, side * .14, .77, 0);
    const knee = joint(hip, 0, -.34, 0);
    const foot = joint(knee, 0, -.34, 0);
    mesh(limbs, lumi ? 0x254d50 : 0x323f41, 0, -.155, 0, hip).scale.set(lumi ? 1.05 : 1.28, .92, 1.16);
    mesh(jointShell, hide, 0, 0, 0, knee).scale.set(.93, 1.0, 1.0);
    mesh(limbs, hide, 0, -.17, 0, knee).scale.set(1.04, .9, 1);
    mesh(boots, hide, 0, -.02, .076, foot);
    box(.14, .085, .13, metal, 0, -.09, .065, knee);
    legs.push({ hip, knee, foot });

    const shoulder = joint(torso, side * (lumi ? .29 : .36), 1.23, 0);
    const elbow = joint(shoulder, 0, -.23, 0);
    mesh(limbs, fabric, 0, -.10, 0, shoulder).scale.y = .67;
    mesh(jointShell, fabric, 0, 0, 0, elbow).scale.set(.83, .88, .87);
    mesh(new T.IcosahedronGeometry(lumi ? .126 : .167, 0), metal, 0, -.03, 0, shoulder);
    mesh(limbs, fabric, 0, -.115, 0, elbow).scale.y = .59;
    mesh(new T.CylinderGeometry(.084, .08, .10, 7), trim, 0, -.174, 0, elbow);
    mesh(new T.IcosahedronGeometry(.078, 0), skin, 0, -.235, 0, elbow);
    if (side === -1) {
      if (!lumi) {
        mesh(new T.CylinderGeometry(.112, .148, .199, 7), metal, 0, -.139, 0, elbow);
        box(.203, .123, .084, trim, 0, -.143, .09, elbow);
        box(.173, .115, .158, hide, 0, -.236, .012, elbow);
      } else {
        mesh(new T.OctahedronGeometry(.113), trim, 0, -.18, .092, elbow).scale.z = .33;
      }
      abilityFx = new T.Mesh(new T.TorusGeometry(lumi ? .30 : .208, .024, 5, 18), new T.MeshBasicMaterial({ color: trim, transparent: true, depthWrite: false }));
      abilityFx.position.set(0, -.29, .03);
      abilityFx.visible = false;
      elbow.add(abilityFx);
    }
    arms.push({ shoulder, elbow });
  }
  group.userData = { model, top, cape, legs, arms, lumi, abilityFx, motion: { gait: 0, air: false, landing: 0, action: 0, gesture: 0 } };
  return group;
}

const actionCount = [0, 0];
const avatars = [avatar(0), avatar(1)];
avatars.forEach(avatar => { avatar.visible = false; });
let me = null, slot = 0, solo = false, state = {}, ground = false, jumps = 0, checkpoint = start, won = false;
let yaw = 0, pitch = .38, face = 0, dash = 0, cd = 0, dx = 0, dz = 0, look = null, lx = 0, ly = 0;
const pos = new T.Vector3(), vel = new T.Vector3();
const previousPosition = new T.Vector3(), renderPosition = new T.Vector3();
const parked = [new T.Vector3(), new T.Vector3()];
const parkedFace = [0, 0], playerCheckpoints = [start, start];
const keys = new Set();
let jumpTime = 0, coyoteTime = 0, cameraDistance = 6.5;
let jumpReq = false, powerReq = false, swapReq = false, returnReq = false;

function teleportPlayer() {
  body.setTranslation({ x: pos.x, y: pos.y + .84, z: pos.z }, true);
  world.propagateModifiedBodyPositionsToColliders();
  previousPosition.copy(pos);
}

function enter(mode, role = 0) {
  me = 'self';
  slot = role;
  solo = mode === 'SOLO';
  state = {};
  parked[0].set(isSpillway ? start.x : -1, .04, isSpillway ? start.z : 2);
  parked[1].set(isSpillway ? start.x : 1, .04, isSpillway ? start.z + 1.2 : 2);
  yaw = face = isSpillway ? Math.PI / 2 : 0;
  pitch = .38;
  cameraDistance = 6.5;
  parkedFace.fill(face);
  playerCheckpoints.fill(start);
  pos.copy(parked[slot]);
  teleportPlayer();
  vel.set(0, 0, 0);
  checkpoint = start;
  trial.reset();
  actionCount.fill(0);
  for (const avatar of avatars) {
    avatar.userData.motion.action = 0;
    avatar.userData.motion.gesture = 0;
  }
  won = false;
  jumps = dash = cd = 0;
  physicsTime = speed = jumpTime = coyoteTime = 0;
  ground = true;
  $('menu').style.display = 'none';
  $('controls').style.display = 'block';
  $('swap').style.display = solo ? 'block' : 'none';
}
$('solo').onclick = () => { socket.leave(); enter('SOLO'); };
$('create').onclick = () => socket.host();
$('join').onclick = () => socket.join($('code').value);
$('cancel-room').onclick = () => socket.leave();
$('code').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase(); });
$('code').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !$('join').disabled) socket.join(event.target.value);
});
$('copy').onclick = async () => {
  const code = $('out').textContent;
  try {
    await navigator.clipboard.writeText(code);
    $('msg').textContent = 'Код скопирован. Отправь его другу.';
  } catch {
    $('msg').textContent = 'Код комнаты — ' + code;
  }
};
socket.on('status', ({ text, code, phase }) => {
  $('msg').textContent = text;
  $('out').textContent = code;
  $('room-code').hidden = !code;
  $('cancel-room').hidden = phase === 'idle';
  for (const id of ['create', 'join', 'code']) $(id).disabled = phase !== 'idle';
});
socket.on('connected', role => enter('COOP', role));
socket.on('state', peer => { state = { peer }; });
socket.on('disconnect', () => {
  me = null;
  $('coop-menu').open = true;
  $('menu').style.display = 'grid';
  $('controls').style.display = 'none';
  avatars.forEach(avatar => { avatar.visible = false; });
});

function frameContext(peer) {
  function carry(dy, dz) {
    if (Math.abs(dy) + Math.abs(dz) < .00001) return;
    pos.y += dy;
    pos.z += dz;
    body.setTranslation({ x: pos.x, y: pos.y + .84, z: pos.z }, true);
    world.propagateModifiedBodyPositionsToColliders();
  }
  return { pos, role: slot, solo, peer, grounded: ground, vertical: vel.y, other: solo && isSpillway ? parked[1 - slot] : peer, won, carry };
}

function switchHero() {
  if (!solo || (isSpillway && !ground)) return;
  if (isSpillway) {
    parked[slot].copy(pos);
    parkedFace[slot] = face;
    playerCheckpoints[slot] = checkpoint;
  }
  slot = 1 - slot;
  if (isSpillway) {
    pos.copy(parked[slot]);
    face = parkedFace[slot];
    checkpoint = playerCheckpoints[slot];
    teleportPlayer();
    vel.set(0, 0, 0);
    jumps = dash = cd = jumpTime = coyoteTime = 0;
  }
}

const pad = $('pad'), canvas = renderer.domElement;
let stickPointer = null;
function stick(event) {
  const bounds = pad.getBoundingClientRect();
  const x = event.clientX - bounds.left - bounds.width / 2;
  const z = event.clientY - bounds.top - bounds.height / 2;
  const distance = Math.hypot(x, z);
  const strength = T.MathUtils.clamp((distance / (bounds.width * .36) - .13) / .87, 0, 1);
  dx = distance ? x / distance * strength : 0;
  dz = distance ? z / distance * strength : 0;
  $('knob').style.transform = 'translate(' + dx * 35 + 'px,' + dz * 35 + 'px)';
}
function stopStick(event) {
  if (event && event.pointerId !== stickPointer) return;
  stickPointer = null;
  dx = dz = 0;
  $('knob').style.transform = '';
}
pad.onpointerdown = event => {
  if (stickPointer !== null) return;
  stickPointer = event.pointerId;
  pad.setPointerCapture(stickPointer);
  stick(event);
};
pad.onpointermove = event => { if (event.pointerId === stickPointer) stick(event); };
pad.onpointerup = pad.onpointercancel = pad.onlostpointercapture = stopStick;
onkeydown = event => {
  if (event.target instanceof HTMLInputElement) return;
  if (me && ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) event.preventDefault();
  if (!keys.has(event.code)) {
    if (event.code === 'Space') jumpReq = true;
    if (event.code === 'KeyE') powerReq = true;
    if (event.code === 'KeyQ') swapReq = true;
    if (event.code === 'KeyR' && isSpillway) returnReq = true;
  }
  keys.add(event.code);
};
onkeyup = event => keys.delete(event.code);
window.addEventListener('blur', () => {
  keys.clear();
  stopStick();
  look = null;
  jumpTime = 0;
  jumpReq = powerReq = swapReq = returnReq = false;
});
$('jump').onpointerdown = () => { jumpReq = true; };
$('power').onpointerdown = () => { powerReq = true; };
$('swap').onpointerdown = () => { swapReq = true; };
if (isSpillway) $('reset-position').onclick = () => { returnReq = true; };
canvas.onpointerdown = event => {
  if (!me || look !== null) return;
  look = event.pointerId;
  lx = event.clientX;
  ly = event.clientY;
  canvas.setPointerCapture(look);
};
canvas.onpointermove = event => {
  if (event.pointerId !== look) return;
  yaw -= (event.clientX - lx) * .006;
  pitch = T.MathUtils.clamp(pitch + (event.clientY - ly) * .005, .1, .9);
  lx = event.clientX;
  ly = event.clientY;
};
canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = event => {
  if (event.pointerId === look) look = null;
};
$('full').onclick = async () => {
  try {
    await document.documentElement.requestFullscreen?.();
    await screen.orientation?.lock?.('landscape');
  } catch {}
};
function respawn() {
  pos.set(checkpoint.safeX ?? checkpoint.x, checkpoint.y + .1, checkpoint.safeZ ?? checkpoint.z);
  teleportPlayer();
  vel.set(0, 0, 0);
  jumps = dash = jumpTime = coyoteTime = 0;
  jumpReq = false;
  ground = false;
  speed = 0;
}

let last = performance.now(), send = 0, prevGP = [], phase = 0;
let physicsTime = 0, speed = 0;

function updatePhysics(dt, peer) {
  previousPosition.copy(pos);
  if (returnReq && isSpillway) { returnReq = false; respawn(); }
  if (swapReq) { swapReq = false; switchHero(); }
  const context = frameContext(peer);
  trial.update(dt, context);

  let x = dx + Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  let z = dz + Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
  const gamepad = navigator.getGamepads?.()[0];
  if (gamepad) {
    x += Math.abs(gamepad.axes[0]) > .15 ? gamepad.axes[0] : 0;
    z += Math.abs(gamepad.axes[1]) > .15 ? gamepad.axes[1] : 0;
    yaw -= (gamepad.axes[2] || 0) * dt * 2;
    pitch = T.MathUtils.clamp(pitch + (gamepad.axes[3] || 0) * dt, .1, .9);
    for (const [index, press] of [[0, () => jumpReq = true], [2, () => powerReq = true], [3, () => swapReq = true]]) {
      if (gamepad.buttons[index]?.pressed && !prevGP[index]) press();
    }
    prevGP = gamepad.buttons.map(button => button.pressed);
  }
  const length = Math.max(1, Math.hypot(x, z));
  const mx = (x * Math.cos(yaw) + z * Math.sin(yaw)) / length;
  const mz = (-x * Math.sin(yaw) + z * Math.cos(yaw)) / length;
  if (Math.hypot(mx, mz) > .1) face = Math.atan2(mx, mz);
  cd = Math.max(0, cd - dt);
  dash = Math.max(0, dash - dt);

  jumpTime = jumpReq ? .13 : Math.max(0, jumpTime - dt);
  jumpReq = false;
  coyoteTime = ground ? .10 : Math.max(0, coyoteTime - dt);
  const groundJump = jumps === 0 && coyoteTime > 0;
  if (jumpTime > 0 && (groundJump || jumps < 2)) {
    const ray = new R.Ray({ x: pos.x, y: pos.y + .08, z: pos.z }, { x: 0, y: -1, z: 0 });
    const landing = !groundJump && vel.y < -4.8 &&
      world.castRay(ray, .74, true, undefined, undefined, capsule, body);
    if (!landing) {
      sound(420, .18, 'triangle');
      vel.y = groundJump ? 8.8 : 8.2;
      jumps = groundJump ? 1 : 2;
      jumpTime = coyoteTime = 0;
      ground = false;
    }
  }
  if (powerReq) {
    const abilityContext = frameContext(peer);
    const result = trial.interact(abilityContext);
    if (result > 0) {
      actionCount[slot]++;
      sound(result === 1 || result === 3 ? 210 : 525, .33, 'triangle', .1);
    } else if (result === -1 && slot === 0 && cd === 0 && (!isSpillway || trial.canDash(abilityContext))) {
      sound(660, .35, 'sine');
      dash = .22;
      actionCount[slot]++;
      cd = 1.4;
      vel.y = Math.max(vel.y, 0);
    }
    powerReq = false;
  }

  const targetX = dash ? Math.sin(face) * 14 : mx * 6;
  const targetZ = dash ? Math.cos(face) * 14 : mz * 6;
  const changeX = targetX - vel.x, changeZ = targetZ - vel.z;
  const distance = Math.hypot(changeX, changeZ);
  const steer = Math.hypot(mx, mz) > .01;
  const reversing = targetX * vel.x + targetZ * vel.z < 0;
  const rate = dash ? 85 : ground ? (!steer ? 68 : reversing ? 62 : 38) : steer ? 23 : 7;
  const weight = distance ? Math.min(1, rate * dt / distance) : 0;
  vel.x += changeX * weight;
  vel.z += changeZ * weight;
  vel.y -= 22 * dt;
  controller.computeColliderMovement(capsule, { x: vel.x * dt, y: vel.y * dt, z: vel.z * dt });
  const movement = controller.computedMovement();
  pos.x += movement.x;
  pos.y += movement.y;
  pos.z += movement.z;
  // A rounded capsule can touch the corner of a higher step while still rising.
  const touchingGround = controller.computedGrounded();
  ground = vel.y <= 0 && (touchingGround || (isSpillway && trial.supportsRider(pos)));
  if (ground) {
    vel.y = 0;
    jumps = 0;
    // Keep a little clearance above flat surfaces so contact does not stall walking.
    const surfaceHeight = isSpillway ? trial.groundHeight(pos) : 0;
    if (Math.abs(pos.y - surfaceHeight) < .052) pos.y = Math.max(pos.y, surfaceHeight + .035);
    for (const point of checkpoints) {
      if (Math.abs(pos.y - point.y) < .2 && Math.abs(pos.x - point.x) < point.w / 2 &&
          Math.abs(pos.z - point.z) < point.d / 2 && (!isSpillway || trial.checkpoint(point))) checkpoint = point;
    }
  } else if (!touchingGround && vel.y > 0 && movement.y < vel.y * dt * .5) {
    vel.y = 0;
  }
  body.setNextKinematicTranslation({ x: pos.x, y: pos.y + .84, z: pos.z });
  world.step();
  speed = Math.min(1, Math.hypot(movement.x, movement.z) / (6 * dt));

  if (pos.y < (isSpillway ? -6 : -12)) {
    sound(90, .4, 'triangle');
    respawn();
  }
  if (trial.finish(frameContext(peer))) won = true;
}

function renderPlayers(dt, peer) {
  const local = avatars[slot], other = avatars[1 - slot];
  local.visible = true;
  local.position.copy(renderPosition);
  moveAvatar(local, dt, phase, { face, speed, air: !ground, rise: vel.y, action: actionCount[slot] });
  other.visible = Boolean(peer) || (solo && isSpillway);
  if (peer) {
    const remote = new T.Vector3(peer.x, peer.y, peer.z);
    if (other.position.distanceToSquared(remote) > 20) other.position.copy(remote);
    else other.position.lerp(remote, 1 - Math.exp(-dt * 15));
    moveAvatar(other, dt, phase, {
      face: Number.isFinite(peer.face) ? peer.face : 0,
      speed: Number.isFinite(peer.speed) ? peer.speed : 0,
      air: Boolean(peer.air),
      rise: Number.isFinite(peer.rise) ? peer.rise : 0,
      action: Number.isSafeInteger(peer.action) ? peer.action : 0,
    });
  } else if (solo && isSpillway) {
    other.position.copy(parked[1 - slot]);
    moveAvatar(other, dt, phase, { face: parkedFace[1 - slot], speed: 0, air: false, rise: 0, action: actionCount[1 - slot] });
  }
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = T.MathUtils.clamp((now - last) / 1000, 0, .1);
  last = now;
  phase += dt;
  trial.animate(dt);

  if (me) {
    const peer = solo ? null : state.peer;
    // Physics uses the same step at any display rate. Cap catch-up after a tab suspension.
    physicsTime += dt;
    while (physicsTime + 1e-9 >= physicsStep) {
      updatePhysics(physicsStep, peer);
      physicsTime = Math.max(0, physicsTime - physicsStep);
    }
    renderPosition.lerpVectors(previousPosition, pos, physicsTime / physicsStep);
    renderPlayers(dt, peer);
    if (ground && Math.hypot(vel.x, vel.z) > 2 && Math.floor(phase * 3.8) !== Math.floor((phase - dt) * 3.8)) {
      sound(95, .08, 'triangle', .045);
    }

    const context = frameContext(peer);
    if (!solo && now - send > 80) {
      socket.send({
        x: pos.x, y: pos.y, z: pos.z, face, speed, air: !ground, rise: vel.y, action: actionCount[slot],
        ...trial.state(context),
      });
      send = now;
    }
    updateInterface(context);
    const { x, y, z } = renderPosition;
    const target = new T.Vector3(x, y + 1.23, z);
    const direction = new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const shoulder = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    let clearance = 6.5;
    for (const side of [-.23, 0, .23]) {
      const from = target.clone().addScaledVector(shoulder, side);
      const hit = world.castRay(new R.Ray(from, direction), clearance, true, undefined, undefined, capsule, body);
      if (hit) clearance = Math.min(clearance, Math.max(.22, hit.timeOfImpact - .23));
    }
    cameraDistance = Math.min(clearance, T.MathUtils.damp(cameraDistance, clearance, 5, dt));
    camera.position.copy(target).addScaledVector(direction, cameraDistance);
    const close = cameraDistance < 2.1;
    let rise = 0;
    if (cameraDistance < 1.3) {
      const up = new R.Ray(camera.position, { x: 0, y: 1, z: 0 });
      const ceiling = world.castRay(up, 1.28, true, undefined, undefined, capsule, body);
      rise = 1.28 * (1 - T.MathUtils.smoothstep(cameraDistance, .35, 1.3));
      if (ceiling) rise = Math.min(rise, Math.max(0, ceiling.timeOfImpact - .18));
      camera.position.y += rise;
    }
    target.addScaledVector(direction, close ? -.65 : -.24);
    target.y -= rise * .53;
    camera.lookAt(target);
    avatars[slot].visible = cameraDistance > .58 || rise > .72;
    const fov = T.MathUtils.damp(camera.fov, close ? 73 : 62, 9, dt);
    if (Math.abs(camera.fov - fov) > .01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    sun.position.set(x - 17, y + 24, z + 6);
    sun.target.position.copy(renderPosition);
    sun.target.updateMatrixWorld();
  } else {
    camera.position.set(6.4, 5.8, 7.5);
    camera.lookAt(0, isSpillway ? 3.5 : 1.3, -21);
  }
  renderer.render(scene, camera);
}

requestAnimationFrame(tick);
onresize = () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
