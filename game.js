import R from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.17.3/+esm';
import * as T from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { buildTempleArt, templeTexture } from './temple-art.js';
import { createOpticalCourt } from './optics.js';
import { moveAvatar } from './avatar-motion.js';

function makeSocket(){
 let pc,dc,role=0,remote=null,local=null,handlers={},ready=false;
 const msg=t=>document.getElementById('msg').textContent=t;
 const el=id=>document.getElementById(id);
 const fail=e=>msg('Ошибка: '+e.message);
 const pack=o=>btoa(JSON.stringify(o)); const unpack=s=>JSON.parse(atob(s.trim()));
 function setup(r){if(pc)pc.close();role=r;ready=false;remote=null;local=null;pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState)){if(ready){ready=false;handlers.disconnect?.();}msg('Соединение потеряно или недоступно. Попробуйте другую сеть или TURN.');}};pc.ondatachannel=e=>wire(e.channel);}
 function wire(c){dc=c;c.onopen=()=>{ready=true;enter('P2P');};c.onclose=()=>{if(ready){ready=false;handlers.disconnect?.();}};c.onmessage=e=>{try{const p=JSON.parse(e.data);if(![p.x,p.y,p.z].every(Number.isFinite))return;remote={...p,slot:1-role};publish();}catch{}};}
 function publish(){const s={};if(local)s.self=local;if(remote)s.peer=remote;handlers.state?.(s);}
 async function gather(){if(pc.iceGatheringState==='complete')return;await new Promise(resolve=>{let timer=setTimeout(done,12000);function done(){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();}function check(){if(pc.iceGatheringState==='complete')done();}pc.addEventListener('icegatheringstatechange',check);});}
 return {on:(n,f)=>handlers[n]=f,emit:(n,v,cb)=>{if(n==='enter'){local={slot:role,x:role?1:-1,y:0,z:0};cb({id:'self',slot:role,code:'P2P'});publish();}if(n==='move'){local={...v,slot:role};if(dc?.readyState==='open'&&dc.bufferedAmount<65536)dc.send(JSON.stringify(v));publish();}},offer:async()=>{try{setup(0);wire(pc.createDataChannel('game',{ordered:false,maxRetransmits:0}));await pc.setLocalDescription(await pc.createOffer());msg('Собираем код…');await gather();el('out').value=pack(pc.localDescription.toJSON());msg('Отправьте исходящий код второму игроку. Затем вставьте его ответ и нажмите Завершить.');}catch(e){fail(e);}},answer:async()=>{try{setup(1);await pc.setRemoteDescription(unpack(el('code').value));await pc.setLocalDescription(await pc.createAnswer());msg('Собираем ответ…');await gather();el('out').value=pack(pc.localDescription.toJSON());msg('Отправьте исходящий код первому игроку. Ожидаем соединения.');}catch(e){fail(e);}},finish:async()=>{try{if(!pc||role!==0)throw Error('Сначала создайте приглашение');await pc.setRemoteDescription(unpack(el('code').value));msg('Подключаемся…');}catch(e){fail(e);}}};
}

await R.init();
const $=id=>document.getElementById(id),socket=makeSocket(),scene=new T.Scene();
scene.background=new T.Color(0xa3b9a7);scene.fog=new T.FogExp2(0xa3b9a7,.021);
const camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.15,160),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;document.body.prepend(renderer.domElement);scene.add(new T.HemisphereLight(0xcceadb,0x384751,1.52));const sun=new T.DirectionalLight(0xffd5a1,2.8);sun.position.set(-17,24,6);scene.add(sun,sun.target);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:65});sun.shadow.bias=-.0005;sun.shadow.normalBias=.055;
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,flatShading:true,roughness:.85}));return mats.get(c)}function mesh(g,c,x,y,z,parent=scene,shadow=true){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m}function box(w,h,d,c,x,y,z,parent=scene){return mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent)}
const world=new R.World({x:0,y:-22,z:0});
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

function updateInterface() {
  const role = slot === 1 ? 'lumi' : 'kai';
  if ($('controls').dataset.role !== role) $('controls').dataset.role = role;
  const labels = {
    hero: slot === 1 ? 'Люми' : 'Кай',
    status: solo ? 'Одиночная игра' : 'Кооператив',
    hud: bridgeHint(),
    power: abilityLabel(),
  };
  for (const [name, value] of Object.entries(labels)) {
    const element = $(name);
    if (element.textContent !== value) element.textContent = value;
  }
  const court = bridgeLocked && pos.z <= -25.5;
  const title = court ? 'Зал отражений' : 'Поворотный мост';
  if ($('section-title').textContent !== title) $('section-title').textContent = title;
  const { charged } = optics.state();
  const state = court ? [
    ['Янтарный', Boolean(charged & 1)], ['Бирюзовый', Boolean(charged & 2)], ['Портал', optics.isReady()],
  ] : [
    ['Секция 1', nextAngle(0) === 0], ['Секция 2', nextAngle(1) === 0], ['Печать', bridgeLocked],
  ];
  for (const [index, id] of ['section-one', 'section-two', 'seal'].entries()) {
    const [label, active] = state[index];
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
  const limbs = new T.CapsuleGeometry(.085, .26, 2, 6);
  const boots = new T.BoxGeometry(.24, .18, .36);

  mesh(new T.CylinderGeometry(lumi ? .245 : .32, .19, .54, 7), fabric, 0, 1.03, 0, torso);
  mesh(new T.IcosahedronGeometry(.225, 1), skin, 0, 1.49, .042, torso);
  const hood = mesh(new T.IcosahedronGeometry(lumi ? .275 : .243, 1), lumi ? hide : metal,
    0, 1.57, lumi ? -.045 : -.062, torso);
  hood.scale.set(1.13, 1.06, .92);
  box(.35, .10, .31, hide, 0, .74, 0, torso);
  box(.12, .10, .07, trim, 0, .75, .17, torso);
  for (const side of [-1, 1]) {
    box(.045, .022, .025, 0x26353a, side * .073, 1.51, .246, torso);
  }

  if (lumi) {
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
    box(.25, .06, .1, trim, 0, 1.60, .16, torso);
  }

  const legs = [], arms = [];
  function joint(parent, x, y, z) {
    const node = new T.Group();
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }
  for (const side of [-1, 1]) {
    const hip = joint(model, side * .14, .77, 0);
    const knee = joint(hip, 0, -.34, 0);
    const foot = joint(knee, 0, -.34, 0);
    mesh(limbs, 0x323f41, 0, -.15, 0, hip).scale.set(1.2, .75, 1.16);
    mesh(limbs, hide, 0, -.14, 0, knee).scale.set(1.04, .75, 1);
    mesh(boots, hide, 0, -.02, .076, foot);
    box(.14, .085, .13, metal, 0, -.09, .065, knee);
    legs.push({ hip, knee, foot });

    const shoulder = joint(torso, side * (lumi ? .29 : .36), 1.23, 0);
    const elbow = joint(shoulder, 0, -.23, 0);
    mesh(limbs, fabric, 0, -.10, 0, shoulder).scale.y = .61;
    mesh(new T.IcosahedronGeometry(lumi ? .126 : .167, 0), metal, 0, -.03, 0, shoulder);
    mesh(limbs, fabric, 0, -.115, 0, elbow).scale.y = .59;
    mesh(new T.CylinderGeometry(.084, .08, .10, 7), trim, 0, -.174, 0, elbow);
    mesh(new T.IcosahedronGeometry(.078, 0), skin, 0, -.235, 0, elbow);
    arms.push({ shoulder, elbow });
  }
  group.userData = { model, top, cape, legs, arms, lumi, motion: { gait: 0, air: false, landing: 0, action: 0, gesture: 0 } };
  return group;
}
const actionCount = [0, 0];
const avatars=[avatar(0),avatar(1)];avatars.forEach(a=>a.visible=false);let me=null,slot=0,solo=false,state={},pos=new T.Vector3(),vel=new T.Vector3(),ground=false,jumps=0,checkpoint=start,won=false,yaw=0,pitch=.38,face=0,dash=0,cd=0,dx=0,dz=0,look=null,lx=0,ly=0;const keys=new Set();let jumpReq=false,powerReq=false,swapReq=false;function enter(c){socket.emit('enter',c,r=>{me=r.id;slot=r.slot;solo=c==='SOLO';state={};pos.set(slot?1:-1,0,2);body.setTranslation({x:pos.x,y:pos.y+.84,z:pos.z},true);vel.set(0,0,0);checkpoint=start;bridgeTurn=0;bridgeLocked=false;optics.reset();actionCount.fill(0);for(const avatar of avatars){avatar.userData.motion.action=0;avatar.userData.motion.gesture=0;}won=false;jumps=0;ground=true;dash=0;cd=0;$('menu').style.display='none';$('controls').style.display='block';$('swap').style.display=solo?'block':'none';});} $('solo').onclick=()=>enter('SOLO');$('create').onclick=()=>socket.offer();$('join').onclick=()=>socket.answer();$('finish').onclick=()=>socket.finish();$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('out').value);$('msg').textContent='Код скопирован'}catch{$('out').select()}};socket.on('state',s=>state=s);socket.on('disconnect',()=>{me=null;$('menu').style.display='grid';$('controls').style.display='none';$('msg').textContent='Связь потеряна'});
const pad=$('pad');function stick(e){const r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,z=e.clientY-r.top-r.height/2,l=Math.max(r.width*.36,Math.hypot(x,z));dx=x/l;dz=z/l;$('knob').style.transform=`translate(${dx*35}px,${dz*35}px)`}pad.onpointerdown=e=>{pad.setPointerCapture(e.pointerId);stick(e)};pad.onpointermove=e=>{if(pad.hasPointerCapture(e.pointerId))stick(e)};pad.onpointerup=pad.onpointercancel=()=>{dx=dz=0;$('knob').style.transform=''};onkeydown=e=>{if(!keys.has(e.code)){if(e.code==='Space')jumpReq=true;if(e.code==='KeyE')powerReq=true;if(e.code==='KeyQ')swapReq=true}keys.add(e.code)};onkeyup=e=>keys.delete(e.code);$('jump').onpointerdown=()=>jumpReq=true;$('power').onpointerdown=()=>powerReq=true;$('swap').onpointerdown=()=>swapReq=true;const cv=renderer.domElement;cv.onpointerdown=e=>{if(!me)return;look=e.pointerId;lx=e.clientX;ly=e.clientY;cv.setPointerCapture(look)};cv.onpointermove=e=>{if(e.pointerId!==look)return;yaw-=(e.clientX-lx)*.006;pitch=T.MathUtils.clamp(pitch+(e.clientY-ly)*.005,.1,.9);lx=e.clientX;ly=e.clientY};cv.onpointerup=cv.onpointercancel=()=>look=null;$('full').onclick=async()=>{try{await document.documentElement.requestFullscreen?.();await screen.orientation?.lock?.('landscape')}catch{}};
function respawn(){pos.set(checkpoint.x,checkpoint.y+.1,checkpoint.safeZ ?? checkpoint.z);body.setTranslation({x:pos.x,y:pos.y+.84,z:pos.z},true);vel.set(0,0,0);jumps=0;dash=0}let last=performance.now(),send=0,prevGP=[],phase=0;function tick(now){requestAnimationFrame(tick);const dt=Math.max(.001,Math.min(.025,(now-last)/1000));last=now;phase+=dt;animateTemple(phase);if(me){const peer=solo?null:state.peer;
if (peer?.slot === 0 && Number.isSafeInteger(peer.bridgeTurn) && peer.bridgeTurn > bridgeTurn) bridgeTurn = peer.bridgeTurn;
if (peer?.slot === 1 && peer.bridgeLocked === true) bridgeLocked = true;
updateDecks(dt);
optics.receive(peer);
if (optics.update(dt, bridgeLocked, solo || slot === 0)) sound(589, .46, 'sine', .11);
if(swapReq&&solo){slot=1-slot;swapReq=false}let x=dx+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=dz+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);const gp=navigator.getGamepads?.()[0];if(gp){x+=Math.abs(gp.axes[0])>.15?gp.axes[0]:0;z+=Math.abs(gp.axes[1])>.15?gp.axes[1]:0;yaw-=(gp.axes[2]||0)*dt*2;pitch=T.MathUtils.clamp(pitch+(gp.axes[3]||0)*dt,.1,.9);for(const [i,f] of [[0,()=>jumpReq=true],[2,()=>powerReq=true],[3,()=>swapReq=true]])if(gp.buttons[i]?.pressed&&!prevGP[i])f();prevGP=gp.buttons.map(b=>b.pressed)}const l=Math.max(1,Math.hypot(x,z)),mx=(x*Math.cos(yaw)+z*Math.sin(yaw))/l,mz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/l;const movingInput=Math.hypot(mx,mz)>.1;if(movingInput)face=Math.atan2(mx,mz);cd=Math.max(0,cd-dt);dash=Math.max(0,dash-dt);if (jumpReq) {
  if (ground || jumps < 2) {
    sound(420, .18, "triangle");
    vel.y = ground ? 8.8 : 8.2;
    jumps++;
    ground = false;
  }
  jumpReq = false;
}
if (powerReq) {
  const opticalStation = bridgeLocked && !optics.isReady() && optics.stationAt(pos) >= 0;
  if (opticalStation) {
    if (optics.use(pos, slot)) {
      actionCount[slot]++;
      sound(slot === 0 ? 230 : 460, .24, 'triangle', .095);
    }
  } else if (!useBridgePower() && slot === 0 && cd === 0) {
    sound(660, .35, "sine");
    dash = .22;
    actionCount[slot]++;
    cd = 1.4;
    vel.y = Math.max(vel.y, 0);
  }
  powerReq = false;
}
const a=1-Math.exp(-dt*(ground?15:7));vel.x=T.MathUtils.lerp(vel.x,dash?Math.sin(face)*14:mx*6,a);vel.z=T.MathUtils.lerp(vel.z,dash?Math.cos(face)*14:mz*6,a);vel.y-=22*dt;controller.computeColliderMovement(capsule,{x:vel.x*dt,y:vel.y*dt,z:vel.z*dt});const mv=controller.computedMovement();pos.x+=mv.x;pos.y+=mv.y;pos.z+=mv.z;ground=controller.computedGrounded();if(ground){
  vel.y = 0;
  jumps = 0;
  // The decks and landings share y=0. Keep a small margin above the sweep offset so flat contact cannot stall walking.
  if (Math.abs(pos.y) < .05) pos.y = Math.max(pos.y, .035);
  for (const point of checkpoints) {
  if (Math.abs(pos.y - point.y) < .2 && Math.abs(pos.x - point.x) < point.w / 2 &&
      Math.abs(pos.z - point.z) < point.d / 2) checkpoint = point;
}}else if(vel.y>0&&mv.y<vel.y*dt*.5)vel.y=0;body.setNextKinematicTranslation({x:pos.x,y:pos.y+.84,z:pos.z});world.timestep=dt||.016;world.step();if(pos.y<-12){sound(90,.4,"triangle");respawn();}if(ground&&Math.hypot(vel.x,vel.z)>2&&Math.floor(phase*3.8)!==Math.floor((phase-dt)*3.8))sound(95,.08,"triangle",.045);const local = avatars[slot], other = avatars[1 - slot];
local.visible = true;
local.position.copy(pos);
const speed = Math.min(1, Math.hypot(mv.x, mv.z) / (6 * dt));
moveAvatar(local, dt, phase, { face, speed, air: !ground, rise: vel.y, action: actionCount[slot] });
other.visible = Boolean(peer);
if (peer) {
  other.position.lerp(new T.Vector3(peer.x, peer.y, peer.z), 1 - Math.exp(-dt * 15));
  moveAvatar(other, dt, phase, {
    face: Number.isFinite(peer.face) ? peer.face : 0,
    speed: Number.isFinite(peer.speed) ? peer.speed : 0,
    air: Boolean(peer.air),
    rise: Number.isFinite(peer.rise) ? peer.rise : 0,
    action: Number.isSafeInteger(peer.action) ? peer.action : 0,
  });
}
if (!solo && now - send > 50) {
  socket.emit('move', {
    x: pos.x, y: pos.y, z: pos.z, face, speed, air: !ground, rise: vel.y, action: actionCount[slot],
    bridgeTurn, bridgeLocked, ...optics.state(),
  });
  send = now;
}
const atPortal = point => point && Math.hypot(point.x, point.z - portalZ) < 1.7 && Math.abs(point.y) < 1.2;
if (bridgeLocked && optics.isReady() && atPortal(pos) && (solo || atPortal(peer))) won = true;
updateInterface();const target=new T.Vector3(pos.x,pos.y+1.3,pos.z),desired=new T.Vector3(pos.x+Math.sin(yaw)*6.5*Math.cos(pitch),pos.y+1.3+6.5*Math.sin(pitch),pos.z+Math.cos(yaw)*6.5*Math.cos(pitch));const rayDir=desired.clone().sub(target);const rayLength=rayDir.length();rayDir.normalize();const hit=world.castRay(new R.Ray(target,rayDir),rayLength,true,undefined,undefined,capsule,body);if(hit)desired.copy(target).addScaledVector(rayDir,Math.max(.5,hit.timeOfImpact-.2));camera.position.lerp(desired,1-Math.exp(-dt*10));camera.lookAt(target);sun.position.set(pos.x-17,pos.y+24,pos.z+6);sun.target.position.copy(pos);sun.target.updateMatrixWorld()}else{camera.position.set(6.4,5.8,7.5);camera.lookAt(0,1.3,-21)}renderer.render(scene,camera)}
requestAnimationFrame(tick);onresize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)};
