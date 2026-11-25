const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeFormat = /^[A-HJ-NP-Z2-9]{6}$/;
const tokenFormat = /^[a-f0-9]{32}$/;
const broker = 'wss://broker.emqx.io:8084/mqtt';
const libraryUrl = 'https://cdn.jsdelivr.net/npm/mqtt@5.16.1/dist/mqtt.esm.js';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let library;

function roomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), byte => alphabet[byte & 31]).join('');
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function prepareRoom(scene, code) {
  const room = 'two-worlds/rooms1/' + scene + '/' + code;
  const [id, secret] = await Promise.all(['topic', 'messages'].map(label =>
    crypto.subtle.digest('SHA-256', encoder.encode(room + '/' + label))));
  const key = await crypto.subtle.importKey('raw', secret, 'AES-GCM', false, ['encrypt', 'decrypt']);
  // Use a room-specific topic and encrypt the packets sent to the public test broker.
  return { topic: 'two-worlds/rooms1/' + hex(id), key };
}

export function createRoomSocket(scene) {
  const events = {};
  let active;

  function report(text, code = '', phase = 'idle') {
    events.status?.({ text, code, phase });
  }

  function dispose(session = active) {
    if (!session) return;
    if (session === active) active = undefined;
    clearTimeout(session.timer);
    clearInterval(session.interval);
    session.client?.end(true);
  }

  function fail(session, text) {
    if (active !== session) return;
    dispose(session);
    if (session.connected) events.disconnect?.();
    report(text);
  }

  function enter(session) {
    if (session.connected) return;
    clearTimeout(session.timer);
    clearInterval(session.interval);
    session.connected = true;
    session.lastReceived = Date.now();
    session.interval = setInterval(() => {
      if (Date.now() - session.lastReceived > 14000) {
        fail(session, 'Связь со вторым игроком потеряна. Создай комнату заново.');
      } else {
        void publish(session, { type: 'ping' });
      }
    }, 3000);
    report('Игрок подключился.');
    events.connected?.(session.role);
  }

  async function publish(session, packet, qos = 0) {
    if (!session.client?.connected || !session.guest) return;
    const topic = session.role === 0 ? session.topic + '/guest/' + session.guest : session.topic + '/host';
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = encoder.encode(JSON.stringify({ ...packet, guest: session.guest, role: session.role }));
    let encrypted;
    try {
      encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, session.key, plaintext);
    } catch {
      fail(session, 'Не удалось отправить игровые данные. Создай комнату заново.');
      return;
    }
    if (active !== session || !session.client.connected) return;
    const bytes = new Uint8Array(iv.length + encrypted.byteLength);
    bytes.set(iv);
    bytes.set(new Uint8Array(encrypted), iv.length);
    session.client.publish(topic, bytes, { qos });
  }

  async function receive(session, topic, bytes) {
    if (active !== session || topic !== session.inbox || bytes.length < 29 || bytes.length > 2048) return;
    let packet;
    try {
      const decoded = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, session.key, bytes.subarray(12));
      packet = JSON.parse(decoder.decode(decoded));
    } catch {
      return;
    }
    if (active !== session || packet?.role !== 1 - session.role || typeof packet.guest !== 'string' || !tokenFormat.test(packet.guest)) return;
    if (packet.type === 'join' && session.role === 0 && !session.connected) {
      if (session.guest && packet.guest !== session.guest && Date.now() < session.offerExpires) return;
      session.guest = packet.guest;
      session.offerExpires = Date.now() + 5000;
      void publish(session, { type: 'welcome' }, 1);
      return;
    }
    if (packet.guest !== session.guest) return;
    if (packet.type === 'welcome' && session.role === 1) {
      void publish(session, { type: 'ready' }, 1);
      enter(session);
      return;
    }
    if (packet.type === 'ready' && session.role === 0) {
      session.lastReceived = Date.now();
      enter(session);
      return;
    }
    if (packet.type === 'ping' && session.connected) session.lastReceived = Date.now();
    if (packet.type !== 'state' || !packet.state) return;
    const { sequence, state } = packet;
    if (!Number.isSafeInteger(sequence) || sequence <= session.received || ![state.x, state.y, state.z].every(Number.isFinite)) return;
    if (session.role === 0) enter(session);
    if (!session.connected) return;
    session.received = sequence;
    session.lastReceived = Date.now();
    events.state?.({ ...state, slot: 1 - session.role });
  }

  async function open(role, code) {
    dispose();
    const serverError = 'Сервер комнат недоступен. Проверь подключение к интернету и попробуй ещё раз.';
    const session = { role, sent: 0, received: 0, guest: role === 1 ? hex(crypto.getRandomValues(new Uint8Array(16))) : '' };
    active = session;
    report(role === 0 ? 'Создаём комнату…' : 'Ищем комнату…', '', 'joining');
    session.timer = setTimeout(() => fail(session, serverError), 15000);
    try {
      library ??= import(libraryUrl).catch(error => { library = undefined; throw error; });
      const [mqtt, room] = await Promise.all([library, prepareRoom(scene, code)]);
      if (active !== session) return;
      Object.assign(session, room);
      session.inbox = session.topic + (role === 0 ? '/host' : '/guest/' + session.guest);
      const { connect } = mqtt.default ?? mqtt;
      const client = connect(broker, { protocolVersion: 4, reconnectPeriod: 1200, connectTimeout: 4500 });
      session.client = client;
      client.on('message', (topic, bytes) => { void receive(session, topic, bytes); });
      client.on('close', () => {
        if (session.subscribed) fail(session, 'Связь с сервером прервалась. Создай комнату заново.');
      });
      client.on('connect', async () => {
        const attempt = session.attempt = (session.attempt ?? 0) + 1;
        try {
          const [grant] = await client.subscribeAsync(session.inbox, { qos: 1 });
          if (active !== session || attempt !== session.attempt || !client.connected) return;
          if (grant?.qos !== 1) throw new Error('Room subscription rejected');
          session.subscribed = true;
          clearTimeout(session.timer);
          if (role === 0) {
            report('Отправь код другу и оставь страницу открытой.', code, 'waiting');
            return;
          }
          const request = () => { void publish(session, { type: 'join' }, 1); };
          request();
          session.interval = setInterval(request, 1500);
          session.timer = setTimeout(() => fail(session, 'Комната не найдена или занята. Проверь код и откройте одну и ту же сцену.'), 9000);
        } catch {
          if (attempt === session.attempt && client.connected) fail(session, serverError);
        }
      });
    } catch {
      fail(session, serverError);
    }
  }

  return {
    on: (event, callback) => { events[event] = callback; },
    host: () => open(0, roomCode()),
    join(input) {
      const code = input.replace(/\s/g, '').toUpperCase();
      if (!codeFormat.test(code)) {
        report('Введи все шесть символов из кода комнаты.');
        return;
      }
      return open(1, code);
    },
    leave() {
      dispose();
      report('');
    },
    send(state) {
      if (!active?.connected) return;
      void publish(active, { type: 'state', sequence: ++active.sent, state });
    },
  };
}

