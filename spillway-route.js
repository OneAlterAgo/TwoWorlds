const bankColor = 0x536a60, teal = 0x78ebd1, copper = 0xffad55;

export function buildSpillwayRoute({ T, scene, box, mesh, floor, collider, sound, lip, at }) {
  const low = 2.65;
  const start = floor(11, 0, 17, 20, 4.6, bankColor);
  start.safeX = 18;
  const turn = floor(0, 0, 17, 4.4, 4.6, bankColor);
  const approach = floor(0, 0, 10.35, 4.4, 8.8, bankColor);
  const gallery = [
    floor(11.35, lip, -25, 9.65, 4.4, bankColor),
    floor(16.25, lip, -25, 4.4, 4.4, bankColor),
    floor(16.25, lip, -31.2, 4.4, 8, bankColor),
    floor(16.25, lip, -36.95, 4.4, 3.5, bankColor),
    floor(8, lip, -36.95, 12.1, 3.5, bankColor),
    floor(0, lip, -37.6, 4, 4.8, bankColor),
  ];
  const gateBase = floor(0, low, -47.6, 10, 7.2, bankColor);
  const exit = floor(0, low, -54.9, 4.5, 7.4, bankColor);
  gateBase.safeX = 0;
  gateBase.safeZ = -47.8;
  exit.safeZ = -54.6;

  const rampStart = -39.99, rampEnd = -44.02;
  const theta = -Math.atan2(lip - low, rampStart - rampEnd);
  const rampLength = Math.hypot(lip - low, rampStart - rampEnd);
  const thick = .42, rampY = (lip + low) / 2 - thick * Math.cos(theta) / 2;
  const rampZ = (rampStart + rampEnd) / 2 - thick * Math.sin(theta) / 2;
  box(4, thick, rampLength, 0x68796b, 0, rampY, rampZ).rotation.x = theta;
  collider(0, rampY, rampZ, 4, thick, rampLength).setRotation(new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), theta));

  function solid(w, h, d, color, x, y, z) {
    box(w, h, d, color, x, y, z);
    collider(x, y, z, w, h, d);
  }

  for (const x of [3, 6, 9, 12, 15, 18]) {
    solid(.28, 1, .28, 0x987461, x, .5, 19.12);
    box(.62, .13, .62, copper, x, 1.05, 19.12);
  }
  solid(20, .12, .17, 0x987461, 11, .74, 19.12);
  for (const z of [7.6, 10.5, 13.4]) {
    box(.11, .028, 1.9, 0xb4c09f, 0, .027, z);
    for (const side of [-1, 1]) solid(.21, .85, 2.55, 0x556a60, side * 2.15, .42, z);
  }
  solid(.78, 2.8, 3.7, 0x5e7470, 0, 1.4, -.9);
  solid(2.1, 1.42, .77, 0x765f4a, -3.3, .71, 1.4);
  solid(1.7, 1.22, .86, 0x567a73, 3.1, .61, -.5);
  for (const x of [8, 12, 16]) solid(.50, 3.9, .50, 0x60766a, x, lip + 1.95, -23.12);
  solid(.4, 3.9, 10.85, 0x536b61, 18.24, lip + 1.95, -31.7);
  solid(15.6, 1.18, .36, 0x728674, 9.5, lip + .59, -38.53);
  for (const side of [-1, 1]) {
    solid(.26, 1.04, 1.89, 0x778874, side * 1.9, lip + .52, -39.40);
    solid(.22, 1.04, 2.45, 0x778874, side * 4.85, low + .52, -47.67);
  }

  function signal(x, y, z, color, kind) {
    mesh(new T.CylinderGeometry(.24, .40, .8, kind === 0 ? 6 : 5), bankColor, x, y + .4, z);
    collider(x, y + .4, z, .58, .8, .58);
    const light = new T.Mesh(new T.OctahedronGeometry(.24), new T.MeshBasicMaterial({ color }));
    light.position.set(x, y + 1.01, z);
    scene.add(light);
    return { x, y, z, light };
  }

  function relay({ kai, lumi, barrier, name, texts }) {
    const [x, y, z, width] = barrier;
    // One solid grate matches the collision hull even as it moves.
    const grid = new T.Group();
    grid.position.set(x, y, z);
    scene.add(grid);
    const gate = collider(x, y + 2.5, z, width, 5, .28);
    for (let part = 0; part < Math.ceil(width / .45); part++) {
      const steps = Math.ceil(width / .45);
      box(.11, 5, .23, 0x685847, width * ((part + .5) / steps - .5), 2.5, 0, grid);
    }
    for (const bar of [.10, 1.2, 3.5, 4.95]) box(width, .14, .28, 0xa17b53, 0, bar, 0, grid);
    const amber = signal(...kai, copper, 0), jade = signal(...lumi, teal, 1);
    let armed = false, ready = false, opened = false;
    return {
      get opened() { return opened; },
      reset() {
        armed = ready = opened = false;
        grid.position.y = y;
        gate.setTranslation({ x, y: y + 2.5, z });
      },
      update(dt, { role, solo, pos, other, peer }) {
        const wasOpen = opened;
        if (solo || role === 0) {
          if (armed && !at(role === 0 ? pos : other, amber, 1.9)) armed = false;
          if (armed && (solo ? ready : peer?.[name + 'Ready'] === true && at(other, jade, 2.3))) opened = true;
        } else {
          armed = peer?.[name + 'Lever'] === true;
          opened ||= peer?.[name + 'Open'] === true;
          if (!armed && !opened) ready = false;
        }
        if (opened && !wasOpen) sound(392, .42, 'triangle', .12);
        grid.position.y = T.MathUtils.damp(grid.position.y, opened ? y + 5.3 : y, 7, dt);
        gate.setTranslation({ x, y: grid.position.y + 2.5, z });
        amber.light.rotation.y += dt * (armed || opened ? 5 : 1.2);
        jade.light.rotation.y += dt * (ready || opened ? 5 : 1.2);
        amber.light.scale.setScalar(armed || opened ? 1.32 : .87);
        jade.light.scale.setScalar(armed || opened ? 1.22 : .76);
      },
      interact({ role, pos }) {
        if (opened) return -1;
        if (role === 0 && at(pos, amber)) {
          armed = !armed;
          return 1;
        }
        if (role === 1 && at(pos, jade)) {
          if (!armed) return 0;
          ready = true;
          return 2;
        }
        return -1;
      },
      status({ role, pos }) {
        if (role === 0 && at(pos, amber)) return { hint: armed ? texts.hold : texts.arm, power: armed ? 'Отпустить' : 'Удерживать' };
        if (role === 1 && at(pos, jade)) return { hint: armed ? texts.cast : texts.wait, power: 'Руна' };
        return { hint: role === 0 ? texts.kai : texts.lumi, power: role === 0 ? 'Рывок' : 'Магия' };
      },
      state() { return { [name + 'Lever']: armed, [name + 'Ready']: ready, [name + 'Open']: opened }; },
    };
  }

  const intake = relay({
    name: 'intake', kai: [-5.1, 0, .35], lumi: [5.0, 0, -1.4], barrier: [0, 0, -3.72, 14],
    texts: {
      arm: 'Удержи янтарный рычаг. Он зажжёт руну в правом проходе.',
      hold: 'Останься у рычага, пока Люми открывает решётку.',
      wait: 'Жди янтарного сигнала от Кая. Затем активируй руну.',
      cast: 'Руна горит. Открой решётку к подъёмнику.',
      kai: 'Иди вдоль воды, затем сверни к янтарному рычагу в левом проходе.',
      lumi: 'Иди вдоль воды, затем по правому проходу к бирюзовой руне.',
    },
  });
  const galleryRelay = relay({
    name: 'gallery', kai: [6.2, lip, -36.95], lumi: [16.25, lip, -31.9], barrier: [0, lip, -38.95, 4],
    texts: {
      arm: 'Удержи привод галереи, чтобы Люми смогла открыть спуск.',
      hold: 'Оставайся у привода. Люми видит твой сигнал с восточной стороны галереи.',
      wait: 'Пусть Кай обойдёт галерею и включит привод у западной стены.',
      cast: 'Сигнал пришёл. Открой спуск к затвору.',
      kai: 'Выйди направо на балкон и обойди шахту. Привод в конце галереи слева.',
      lumi: 'Выйди направо на балкон. Найди бирюзовую руну за первым поворотом галереи.',
    },
  });
  return { start, gateBase, exit, floors: [start, turn, approach, ...gallery, gateBase, exit], intake, galleryRelay };
}
