const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (from, to, weight) => from + (to - from) * weight;
const legLength = .34;

function groundLeg(stride, pace, stepHeight) {
  const forward = Math.cos(stride) * pace * .29;
  const lift = Math.max(0, Math.sin(stride)) * stepHeight;
  const drop = .66 - lift;
  const reach = Math.min(legLength * 2 - .002, Math.hypot(forward, drop));
  const bend = 2 * Math.acos(reach / (legLength * 2));
  const hip = -Math.atan2(forward, drop) - bend / 2;
  return [hip, bend, -hip - bend + lift * .55];
}

export function moveAvatar(avatar, dt, phase, pose) {
  const { model, top, cape, legs, arms, lumi, motion } = avatar.userData;
  const blend = 1 - Math.exp(-dt * 16);
  const pace = clamp(pose.speed, 0, 1);
  if (pose.air !== motion.air && !pose.air) motion.landing = .17;
  motion.air = pose.air;
  motion.landing = Math.max(0, motion.landing - dt);
  if (pose.action > motion.action) {
    motion.action = pose.action;
    motion.gesture = .58;
  }
  motion.gesture = Math.max(0, motion.gesture - dt);
  motion.gait += dt * (4.5 + pace * 7.5);

  const travel = pose.air ? 0 : pace;
  const turn = Math.atan2(Math.sin(pose.face - avatar.rotation.y), Math.cos(pose.face - avatar.rotation.y));
  avatar.rotation.y += turn * (1 - Math.exp(-dt * 17));
  const landing = Math.sin(Math.PI * motion.landing / .17);
  const gesture = Math.sin(Math.PI * motion.gesture / .58);
  const rise = clamp(pose.rise / 7, -1, 1);
  const bounce = (1 - Math.cos(motion.gait * 2)) * travel * .018;
  model.position.y = mix(model.position.y, bounce - landing * .055, blend);
  top.rotation.x = mix(top.rotation.x, (pose.air ? -.06 + rise * .11 : .18 * travel) + landing * .19, blend);
  top.rotation.z = mix(top.rotation.z, Math.cos(motion.gait) * travel * .048, blend);
  top.scale.y = 1 + Math.sin(phase * 2.2) * .008 - landing * .075;
  if (cape) cape.rotation.x = mix(cape.rotation.x, pose.air ? .56 + rise * .15 : .33 * travel + Math.sin(phase * 2.8) * .065, blend);

  for (let index = 0; index < 2; index++) {
    const stride = motion.gait + Math.PI * index;
    const opposite = index === 0 ? 1 : -1;
    let [hip, knee, ankle] = groundLeg(stride, travel, travel * .17);
    if (pose.air) {
      hip = -.43 - .25 * rise + opposite * .18;
      knee = .71 + .39 * Math.max(0, rise) + opposite * .13;
      ankle = -.23 - rise * .15;
    }
    const leg = legs[index];
    leg.hip.rotation.x = mix(leg.hip.rotation.x, hip - landing * .15, blend);
    leg.knee.rotation.x = mix(leg.knee.rotation.x, knee + landing * .28, blend);
    leg.foot.rotation.x = mix(leg.foot.rotation.x, ankle - landing * .13, blend);

    const arm = arms[index];
    const swing = Math.cos(stride) * travel * .58;
    const reach = gesture * (lumi ? 1.56 : (index === 0 ? 1.35 : .89));
    const shoulder = pose.air ? -.64 - rise * .21 : swing * (1 - gesture) - reach;
    arm.shoulder.rotation.x = mix(arm.shoulder.rotation.x, shoulder, blend);
    arm.shoulder.rotation.z = mix(arm.shoulder.rotation.z, opposite * (.09 + gesture * .25 + (pose.air ? .23 : 0)), blend);
    arm.elbow.rotation.x = mix(arm.elbow.rotation.x, -.26 - travel * .17 - gesture * .52 - (pose.air ? .3 : 0), blend);
  }
}
