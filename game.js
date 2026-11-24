import R from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.17.3/+esm';
import * as T from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

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
scene.background=new T.Color(0xadcbdc);scene.fog=new T.FogExp2(0xadcbdc,.018);
const camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.15,160),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.prepend(renderer.domElement);scene.add(new T.HemisphereLight(0xffefd2,0x435779,2.1));const sun=new T.DirectionalLight(0xffd4a0,2.5);sun.position.set(-15,25,10);scene.add(sun,sun.target);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:65});sun.shadow.bias=-.0005;sun.shadow.normalBias=.055;
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,flatShading:true,roughness:.85}));return mats.get(c)}function mesh(g,c,x,y,z,parent=scene,shadow=true){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=shadow;parent.add(m);return m}function box(w,h,d,c,x,y,z,parent=scene){return mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent)}let seed=713;function rnd(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}const solids=[],islands=[],walls=[],moving=[],gates=[],crystals=[];function platform(x,y,z,w,d,c=0x91ad72,kind='rock'){const g=new T.Group();g.position.set(x,y,z);scene.add(g);const n=10,verts=[],idx=[];for(let j=0;j<3;j++)for(let i=0;i<n;i++){let a=i*2*Math.PI/n;let r=j===0?1:j===1?.94:.32;verts.push(Math.cos(a)*w*.5*r,j===0?0:j===1?-.65:-Math.min(w,d)*.65,Math.sin(a)*d*.5*r)}verts.push(0,0,0);for(let i=0;i<n;i++){let k=(i+1)%n;idx.push(30,k,i);for(let j=0;j<2;j++){let a=j*n+i,b=j*n+k;idx.push(a,b,b+n,a,b+n,a+n)}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();geo.clearGroups();for(let i=0;i<n;i++){geo.addGroup(i*15,3,0);geo.addGroup(i*15+3,12,1)}const m=new T.Mesh(geo,[mat(c),mat(0x756e79)]);g.add(m);m.castShadow=m.receiveShadow=true;const s={x,y,z,w,d,g,kind,ellipse:true};solids.push(s);return s}
function slab(x,y,z,w,d,c=0xb8a58a){const g=box(w,.55,d,c,x,y-.275,z);const s={x,y,z,w,d,g,ellipse:false};solids.push(s);return s}
function tree(g,x,z,scale=1){const t=new T.Group();t.position.set(x,0,z);t.scale.setScalar(scale);g.add(t);mesh(new T.CylinderGeometry(.13,.29,2.2,6),0x735344,0,1.1,0,t);for(let i=0;i<4;i++){let a=i*2.4;const b=mesh(new T.IcosahedronGeometry(1.15-i*.1,0),[0x376f63,0x518e70,0x86ad70,0xa8bd78][i],Math.cos(a)*.6,2.2+i*.38,Math.sin(a)*.6,t);b.scale.set(1.2,.8,1)}}
function island(x,y,z,w,d){const s=platform(x,y,z,w,d);islands.push(s);for(let i=0;i<7;i++){let a=i*2.4,r=.72+rnd()*.12;tree(s.g,Math.cos(a)*w*.5*r,Math.sin(a)*d*.5*r,.65+rnd()*.5)}for(let i=0;i<24;i++){let a=rnd()*6.28,r=.5+rnd()*.4;let xx=Math.cos(a)*w*.5*r,zz=Math.sin(a)*d*.5*r;let m=mesh(new T.IcosahedronGeometry(.12+rnd()*.32,0),i%3?0x648b69:0xe2bb75,xx,.15,zz,s.g);m.scale.y=.55}return s}
const world=new R.World({x:0,y:-22,z:0});
const controller=world.createCharacterController(.025);controller.enableSnapToGround(.16);controller.setMaxSlopeClimbAngle(.75);
const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.85,3));const capsule=world.createCollider(R.ColliderDesc.capsule(.52,.32),body);
const obstacles=[];function collider(x,y,z,w,h,d){return world.createCollider(R.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(x,y,z))}
function floor(x, y, z, w, d, color = 0x829b76) {
  const surface = slab(x, y, z, w, d, color);
  surface.collider = collider(x, y - .275, z, w, .55, d);
  return surface;
}

function setFloorEnabled(surface, enabled) {
  surface.g.visible = enabled;
  surface.collider.setEnabled(enabled);
}
function block(x,y,z,w,h,d,c=0x867e78){const m=box(w,h,d,c,x,y,z);const col=collider(x,y,z,w,h,d);obstacles.push(m);return {m,col}}
// Temple courtyard with two branches and a central machine.
const start=floor(0,0,0,18,16), ruin=floor(0,0,-18,22,16), upper=floor(0,4,-31,20,12), magic=floor(0,4,-48,24,18), final=floor(0,4,-69,22,14);
const stone=0x777f88, gold=0xb99153;
function masonry(x,y,z,w,h,d){return block(x,y,z,w,h,d,stone)}
function column(x,y,z){masonry(x,y+.25,z,1.5,.5,1.5);masonry(x,y+2.5,z,.85,4,.85);masonry(x,y+4.7,z,1.4,.4,1.4)}
for(const a of [start,ruin,upper,magic,final]){islands.push(a);a.g.material=mat(0x687b75);for(let side of [-1,1]){for(let i=0;i<3;i++)column(side*(a.w/2-1),a.y,a.z-5+i*5);for(let i=0;i<8;i++){let x=side*(a.w/2-2),z=a.z-6+i*1.6;box(.65,.04,.65,gold,x,a.y+.025,z)}}for(let i=0;i<8;i++)box(a.w-4,.035,.08,0x9caa96,a.x,a.y+.023,a.z-5+i*1.4);}
// The west stair and east lift lead to separate crystal chambers.
const westColor = 0x57e6ce, eastColor = 0xffb95e;
const left = floor(-26, 1.3, -18, 8, 10, 0x527b79);
const right = floor(26.5, 0, -18, 8, 10, 0x88715b);
const westSteps = [
  floor(-13, .2, -16.5, 2.8, 3.4, 0x527b79),
  floor(-16.6, .65, -19, 2.7, 3.4, 0x527b79),
  floor(-20.2, 1.05, -16.8, 2.7, 3.4, 0x527b79),
];
const eastDock = floor(12.75, 0, -18, 3.5, 5, 0x88715b);
const westShortcut = floor(-16.6, 0, -22, 11.6, 2.6, 0x527b79);
const eastShortcut = floor(16.75, 0, -22, 12, 2.6, 0x88715b);
for (const step of westSteps) {
  box(step.w - .35, .04, .15, westColor, step.x, step.y + .025, step.z + 1.25);
}
for (const [wing, color] of [[left, westColor], [right, eastColor]]) {
  for (const side of [-1, 1]) {
    column(wing.x + side * 2.8, wing.y, wing.z - 2.7);
    box(.15, .055, 5, color, wing.x + side * 1.1, wing.y + .035, wing.z);
  }
}
box(.18, .04, 3.8, westColor, -10.6, .025, -16.5);
box(.18, .04, 3.8, eastColor, eastDock.x, .025, eastDock.z);
for(let i=0;i<3;i++)floor(i%2?2:-2,0,-9-i*2,3,2.2);
const wall={x:0,z:-25,y:0,top:4,w:5,d:.8};block(0,2,-25,5,4,.8,stone);for(let i=0;i<6;i++)for(let j=0;j<3;j++)box(.7,.15,.25,gold,-1.5+j*1.5,.5+i*.6,-24.48);floor(0,0,-23.5,5,3);floor(0,4,-25.8,5,2);
const lifts = [];
function addLift(centerX, y, z, w, d, travel, offset, color = gold) {
  const centerY = y - .275;
  const x = centerX + Math.sin(offset) * travel;
  const mesh = box(w, .55, d, color, x, centerY, z);
  const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, centerY, z));
  world.createCollider(R.ColliderDesc.cuboid(w / 2, .275, d / 2), body);
  lifts.push({ mesh, body, centerX, centerY, x, y, z, w, d, travel, offset });
  return mesh;
}

for (let i = 0; i < 3; i++) {
  addLift(0, 4, -39 - i * 2.4, 3, 2.2, 1.6, i * .8);
}
const eastLift = addLift(18.5, 0, -18, 3, 3.3, 2.5, -Math.PI / 2);
for (const side of [-1, 1]) {
  box(2.6, .035, .13, eastColor, 0, .293, side * 1.35, eastLift);
  box(8, .18, .14, stone, 18.5, -.38, -18 + side * 1.45);
}

function updateLifts(phase) {
  for (const lift of lifts) {
    const oldX = lift.x;
    lift.x = lift.centerX + Math.sin(phase * .7 + lift.offset) * lift.travel;
    lift.mesh.position.x = lift.x;
    lift.body.setNextKinematicTranslation({ x: lift.x, y: lift.centerY, z: lift.z });
    if (me && ground && Math.abs(pos.y - lift.y) < .12 &&
        Math.abs(pos.z - lift.z) < lift.d / 2 && Math.abs(pos.x - oldX) < lift.w / 2) {
      pos.x += lift.x - oldX;
      body.setTranslation({ x: pos.x, y: pos.y + .84, z: pos.z }, true);
    }
  }
}

const bridge = floor(0, 4, -57, 3, 7), bridge2 = floor(0, 4, -62, 3, 4);
const gate=block(0,5.5,-66,21,3,.7,0xa67b61);const barrier=gate.m;
function crystal(x,y,z,c){const m=mesh(new T.OctahedronGeometry(.65),c,x,y+.8,z);m.material=new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.2,roughness:.4});crystals.push(m);return m}
const rune = crystal(left.x, left.y, left.z, westColor);
const energy = crystal(right.x, right.y, right.z, eastColor);
const objectives = [
  { crystal: rune, hero: 1, name: 'Люми', ability: 'Магия' },
  { crystal: energy, hero: 0, name: 'Кай', ability: 'Рывок' },
];
let displayedFlags = [];

function refreshTemple() {
  if (displayedFlags[0] === flags[0] && displayedFlags[1] === flags[1]) return;
  displayedFlags = [...flags];
  setFloorEnabled(westShortcut, flags[0]);
  setFloorEnabled(eastShortcut, flags[1]);
  setFloorEnabled(bridge, flags[0]);
  setFloorEnabled(bridge2, flags[0]);
  barrier.visible = !flags[1];
  gate.col.setEnabled(!flags[1]);
  objectives.forEach(({ crystal }, index) => {
    crystal.material.emissiveIntensity = flags[index] ? .38 : 1.2;
  });
}

function nearbyCrystal() {
  return objectives.findIndex(({ crystal }, index) => !flags[index] &&
    Math.hypot(pos.x - crystal.position.x, pos.z - crystal.position.z) < 2.4 &&
    Math.abs(pos.y - crystal.position.y) < 1.5);
}

function activateCrystal(index) {
  if (objectives[index].hero !== slot) return;
  flags[index] = true;
  sound(523.25, .3, 'sine');
  sound(783.99, .7, 'triangle', .075);
}

function templeHint() {
  if (won) return 'Глава пройдена!';
  const near = nearbyCrystal();
  if (near >= 0) {
    const { hero, name, ability } = objectives[near];
    if (slot === hero) return `Примени «${ability}», чтобы активировать кристалл`;
    return solo ? `Переключись на героя «${name}»` : `Этот кристалл активирует ${name}`;
  }
  const completedWing = (flags[0] && pos.x < -15) || (flags[1] && pos.x > 15);
  if (completedWing && Math.abs(pos.z + 18) < 7) return 'Вернись во двор по мосту вдоль дальней стены';
  if (!flags.every(Boolean)) {
    if (pos.z < -24) return 'Вернись во двор за оставшимися кристаллами';
    if (!flags[0] && (solo || slot === 1 || flags[1])) return 'Слева — разрушенная лестница к кристаллу Люми';
    return 'Справа — подвижная платформа к кристаллу Кая';
  }
  if (pos.z > -26) return 'Оба кристалла активны. Взберись по стене в северной части двора';
  if (pos.z > -46) return 'Переберись через пропасть на подвижных платформах';
  return solo ? 'Войди в портал' : 'Войдите в портал вместе';
}
const gears=[];for(let side of [-1,1])for(let i=0;i<3;i++){const g=new T.Group();g.position.set(side*9,4,-18-i*10);scene.add(g);mesh(new T.TorusGeometry(2,.22,8,32),gold,0,0,0,g);mesh(new T.CylinderGeometry(.45,.45,.4,12),stone,0,0,0,g).rotation.x=Math.PI/2;for(let j=0;j<12;j++){let a=j*Math.PI/6;let t=box(.45,.7,.45,gold,Math.sin(a)*2.15,Math.cos(a)*2.15,0,g);t.rotation.z=-a;}for(let j=0;j<4;j++){let t=box(.2,3.6,.2,gold,0,0,0,g);t.rotation.z=j*Math.PI/4;}gears.push(g);}
const portal=mesh(new T.TorusGeometry(1.5,.24,10,48),0xffd68c,0,5.7,-73);const glow=new T.Mesh(new T.CircleGeometry(1.3,40),new T.MeshBasicMaterial({color:0x81d9ed,transparent:true,opacity:.45,side:T.DoubleSide}));glow.position.copy(portal.position);scene.add(glow);
for(let i=0;i<28;i++){let x=(i%2?1:-1)*(24+rnd()*24),z=-rnd()*90;let m=mesh(new T.ConeGeometry(5+rnd()*8,18+rnd()*20,6),0x647c86,x,-12,z,scene,false);m.rotation.z=.1;}
scene.background=new T.Color(0x9ab8c5);scene.fog=new T.FogExp2(0x9ab8c5,.015);
// Original synthesized ambient score and sound effects, activated by user gesture.
let audio,master,musicGain,fxGain,beat=0;function sound(f,d=.15,type='sine',vol=.12,bus=fxGain){if(!audio||!bus)return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(vol,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(bus);o.start();o.stop(t+d+.03)}function startAudio(){if(audio){audio.resume();return}try{audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.45;master.connect(audio.destination);musicGain=audio.createGain();fxGain=audio.createGain();musicGain.gain.value=.55;fxGain.gain.value=.8;musicGain.connect(master);fxGain.connect(master);setInterval(()=>{if(!me||audio.state!=='running')return;let notes=[130.81,164.81,196,146.83,110,130.81,174.61,196];let f=notes[beat++%notes.length];sound(f,2.8,'sine',.14,musicGain);sound(f*2,1.2,'triangle',.035,musicGain)},950)}catch{}}document.addEventListener('click', startAudio, { once: true });
function avatar(s){const g=new T.Group(),c=s?0xc57b59:0x367e9d;scene.add(g);const torso=mesh(new T.CylinderGeometry(.32,.24,.65,8),c,0,.96,0,g);mesh(new T.SphereGeometry(.28,8,6),0xe9b991,0,1.48,0,g);const hair=mesh(new T.SphereGeometry(.29,8,5),s?0x87513b:0x493a38,0,1.59,-.035,g);hair.scale.y=.68;box(.46,.12,.31,0x51433f,0,.68,0,g);box(.39,.46,.18,0x9a7552,0,1,-.29,g);const legs=[],arms=[];for(const side of [-1,1]){let l=new T.Group();l.position.set(side*.15,.65,0);g.add(l);mesh(new T.CapsuleGeometry(.105,.28,3,6),0x35495c,0,-.22,0,l);box(.23,.17,.34,0x53473f,0,-.51,.06,l);legs.push(l);let a=new T.Group();a.position.set(side*.37,1.15,0);g.add(a);mesh(new T.CapsuleGeometry(.09,.32,3,6),c,0,-.21,0,a);mesh(new T.SphereGeometry(.1,6,5),0xe9b991,0,-.45,0,a);arms.push(a)}g.userData={legs,arms};return g}
const avatars=[avatar(0),avatar(1)];avatars.forEach(a=>a.visible=false);let me=null,slot=0,solo=false,state={},pos=new T.Vector3(),vel=new T.Vector3(),ground=false,jumps=0,climb=false,checkpoint=start,flags=[false,false],won=false,yaw=0,pitch=.38,face=0,dash=0,cd=0,dx=0,dz=0,look=null,lx=0,ly=0;const keys=new Set();let jumpReq=false,powerReq=false,swapReq=false;function enter(c){socket.emit('enter',c,r=>{me=r.id;slot=r.slot;solo=c==='SOLO';state={};pos.set(slot?1:-1,0,2);body.setTranslation({x:pos.x,y:pos.y+.84,z:pos.z},true);vel.set(0,0,0);checkpoint=start;flags=[false,false];won=false;jumps=0;ground=true;$('menu').style.display='none';$('controls').style.display='block';$('swap').style.display=solo?'block':'none';});} $('solo').onclick=()=>enter('SOLO');$('create').onclick=()=>socket.offer();$('join').onclick=()=>socket.answer();$('finish').onclick=()=>socket.finish();$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('out').value);$('msg').textContent='Код скопирован'}catch{$('out').select()}};socket.on('state',s=>state=s);socket.on('disconnect',()=>{me=null;$('menu').style.display='grid';$('controls').style.display='none';$('msg').textContent='Связь потеряна'});
const pad=$('pad');function stick(e){const r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,z=e.clientY-r.top-r.height/2,l=Math.max(r.width*.36,Math.hypot(x,z));dx=x/l;dz=z/l;$('knob').style.transform=`translate(${dx*35}px,${dz*35}px)`}pad.onpointerdown=e=>{pad.setPointerCapture(e.pointerId);stick(e)};pad.onpointermove=e=>{if(pad.hasPointerCapture(e.pointerId))stick(e)};pad.onpointerup=pad.onpointercancel=()=>{dx=dz=0;$('knob').style.transform=''};onkeydown=e=>{if(!keys.has(e.code)){if(e.code==='Space')jumpReq=true;if(e.code==='KeyE')powerReq=true;if(e.code==='KeyQ')swapReq=true}keys.add(e.code)};onkeyup=e=>keys.delete(e.code);$('jump').onpointerdown=()=>jumpReq=true;$('power').onpointerdown=()=>powerReq=true;$('swap').onpointerdown=()=>swapReq=true;const cv=renderer.domElement;cv.onpointerdown=e=>{if(!me)return;look=e.pointerId;lx=e.clientX;ly=e.clientY;cv.setPointerCapture(look)};cv.onpointermove=e=>{if(e.pointerId!==look)return;yaw-=(e.clientX-lx)*.006;pitch=T.MathUtils.clamp(pitch+(e.clientY-ly)*.005,.1,.9);lx=e.clientX;ly=e.clientY};cv.onpointerup=cv.onpointercancel=()=>look=null;$('full').onclick=async()=>{try{await document.documentElement.requestFullscreen?.();await screen.orientation?.lock?.('landscape')}catch{}};
function inside(s,x,z){return s.enabled!==false&&(s.ellipse?((x-s.x)/(s.w*.46))**2+((z-s.z)/(s.d*.46))**2<1:Math.abs(x-s.x)<s.w/2+.1&&Math.abs(z-s.z)<s.d/2+.1)}function respawn(){pos.set(checkpoint.x,checkpoint.y+.1,checkpoint.z);body.setTranslation({x:pos.x,y:pos.y+.84,z:pos.z},true);vel.set(0,0,0);jumps=0;climb=false;dash=0}let last=performance.now(),send=0,prevGP=[],phase=0;function tick(now){requestAnimationFrame(tick);const dt=Math.max(.001,Math.min(.025,(now-last)/1000));last=now;phase+=dt;for(const g of gears)g.rotation.z+=dt*.35;updateLifts(phase);for(const s of moving){let old=s.x;s.x=s.baseX+Math.sin(phase*.85+s.phase)*.8;s.g.position.x=s.x;if(ground&&inside(s,pos.x,pos.z)&&Math.abs(pos.y-s.y)<.1)pos.x+=s.x-old}for(const m of crystals)m.rotation.y+=dt*.7;portal.rotation.z+=dt*.2;if(me){const peer=solo?null:state.peer;if(peer?.unlock){flags[0]||=!!peer.unlock[0];flags[1]||=!!peer.unlock[1]}if(swapReq&&solo){slot=1-slot;swapReq=false}let x=dx+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=dz+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);const gp=navigator.getGamepads?.()[0];if(gp){x+=Math.abs(gp.axes[0])>.15?gp.axes[0]:0;z+=Math.abs(gp.axes[1])>.15?gp.axes[1]:0;yaw-=(gp.axes[2]||0)*dt*2;pitch=T.MathUtils.clamp(pitch+(gp.axes[3]||0)*dt,.1,.9);for(const [i,f] of [[0,()=>jumpReq=true],[2,()=>powerReq=true],[3,()=>swapReq=true]])if(gp.buttons[i]?.pressed&&!prevGP[i])f();prevGP=gp.buttons.map(b=>b.pressed)}const l=Math.max(1,Math.hypot(x,z)),mx=(x*Math.cos(yaw)+z*Math.sin(yaw))/l,mz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/l;const movingInput=Math.hypot(mx,mz)>.1;if(movingInput)face=Math.atan2(mx,mz);cd=Math.max(0,cd-dt);dash=Math.max(0,dash-dt);const nearWall=Math.abs(pos.x-wall.x)<2.3&&Math.abs(pos.z-(wall.z+.75))<.6&&pos.y>=-.2&&pos.y<4.1;climb=nearWall&&mz<-.15&&!dash;if(jumpReq){sound(420,.18,"triangle");if(climb){vel.y=8;vel.z=4;climb=false;jumps=1}else if(ground||jumps<2){vel.y=ground?8.8:8.2;jumps++;ground=false}jumpReq=false}if (powerReq) {
  const crystalIndex = nearbyCrystal();
  if (crystalIndex >= 0) {
    activateCrystal(crystalIndex);
  } else if (slot === 0 && cd === 0) {
    sound(660, .35, 'sine');
    dash = .22;
    cd = 1.4;
    vel.y = Math.max(vel.y, 0);
  }
  powerReq = false;
}
refreshTemple();
const a=1-Math.exp(-dt*(ground?15:7));vel.x=T.MathUtils.lerp(vel.x,dash?Math.sin(face)*14:mx*6,a);vel.z=T.MathUtils.lerp(vel.z,dash?Math.cos(face)*14:mz*6,a);if(climb){vel.y=3.5;vel.z=0;jumps=0;if(pos.y>3.85){vel.y=4;vel.z=-3}}else vel.y-=22*dt;controller.computeColliderMovement(capsule,{x:vel.x*dt,y:vel.y*dt,z:vel.z*dt});const mv=controller.computedMovement();pos.x+=mv.x;pos.y+=mv.y;pos.z+=mv.z;ground=controller.computedGrounded();if(ground){vel.y=0;jumps=0;for(const s of islands)if(Math.abs(pos.y-s.y)<.2&&inside(s,pos.x,pos.z))checkpoint=s;}else if(vel.y>0&&mv.y<vel.y*dt*.5&&!climb)vel.y=0;body.setNextKinematicTranslation({x:pos.x,y:pos.y+.84,z:pos.z});world.timestep=dt||.016;world.step();if(pos.y<-12){sound(90,.4,"triangle");respawn();}if(ground&&Math.hypot(vel.x,vel.z)>2&&Math.floor(phase*3.8)!==Math.floor((phase-dt)*3.8))sound(95,.08,"triangle",.045);const local=avatars[slot];local.visible=true;local.position.copy(pos);local.rotation.y=face;const other=avatars[1-slot];other.visible=!!peer;if(peer){other.position.lerp(new T.Vector3(peer.x,peer.y,peer.z),1-Math.exp(-dt*15));other.rotation.y=peer.face||0}function anim(g,speed,air){const t=phase*11;g.userData.legs.forEach((b,i)=>b.rotation.x=air?-.35:Math.sin(t+i*Math.PI)*speed*.7);g.userData.arms.forEach((b,i)=>b.rotation.x=air?-.6:-Math.sin(t+i*Math.PI)*speed*.6)}anim(local,Math.min(1,Math.hypot(vel.x,vel.z)/6),!ground);if(peer)anim(other,peer.speed||0,peer.air);if(!solo&&now-send>50){socket.emit('move',{x:pos.x,y:pos.y,z:pos.z,face,speed:Math.min(1,Math.hypot(vel.x,vel.z)/6),air:!ground,unlock:flags});send=now}const atPortal=p=>p&&Math.hypot(p.x,p.z+73)<2&&Math.abs(p.y-4)<1.5;if(flags.every(Boolean)&&atPortal(pos)&&(solo||atPortal(peer)))won=true;$('hud').textContent = templeHint();
$('power').textContent=slot?'Магия':'Рывок';$('hero').textContent=slot?'ЛЮМИ • МАГИЯ':'КАЙ • ЭНЕРГИЯ';$('status').textContent=solo?'SOLO': 'CO-OP';const target=new T.Vector3(pos.x,pos.y+1.3,pos.z),desired=new T.Vector3(pos.x+Math.sin(yaw)*6.5*Math.cos(pitch),pos.y+1.3+6.5*Math.sin(pitch),pos.z+Math.cos(yaw)*6.5*Math.cos(pitch));const rayDir=desired.clone().sub(target);const rayLength=rayDir.length();rayDir.normalize();const hit=world.castRay(new R.Ray(target,rayDir),rayLength,true,undefined,undefined,capsule,body);if(hit)desired.copy(target).addScaledVector(rayDir,Math.max(.5,hit.timeOfImpact-.2));camera.position.lerp(desired,1-Math.exp(-dt*10));camera.lookAt(target);sun.position.set(pos.x-15,pos.y+25,pos.z+10);sun.target.position.copy(pos);sun.target.updateMatrixWorld()}else{camera.position.set(13,12,18);camera.lookAt(0,0,-12)}renderer.render(scene,camera)}
refreshTemple();
requestAnimationFrame(tick);onresize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)};
