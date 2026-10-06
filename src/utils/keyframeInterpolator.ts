import { Keyframe } from '../types/editor';

export interface InterpolatedTransform {
  opacity: number;
  scale: number;
  positionX: number; // % offset (-50 to +50)
  positionY: number; // % offset (-50 to +50)
  rotation: number;  // degrees (-180 to 180)
}

/**
 * Smooth Hermite interpolation (smoothstep) for organic video animations.
 */
function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Linearly interpolates two numbers with an easing factor.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculates current animated properties for a clip at a given time offset.
 */
export function interpolateKeyframes(
  keyframes: Keyframe[] | undefined,
  timeOffset: number,
  base: {
    opacity?: number;
    scale?: number;
    positionX?: number;
    positionY?: number;
    rotation?: number;
  }
): InterpolatedTransform {
  const defaultTransform: InterpolatedTransform = {
    opacity: base.opacity ?? 1.0,
    scale: base.scale ?? 1.0,
    positionX: base.positionX ?? 0,
    positionY: base.positionY ?? 0,
    rotation: base.rotation ?? 0,
  };

  if (!keyframes || keyframes.length === 0) {
    return defaultTransform;
  }

  // Sort keyframes by time offset
  const sorted = [...keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  // Before or at first keyframe
  if (timeOffset <= sorted[0].timeOffset) {
    const k = sorted[0];
    return {
      opacity: k.opacity ?? defaultTransform.opacity,
      scale: k.scale ?? defaultTransform.scale,
      positionX: k.positionX ?? defaultTransform.positionX,
      positionY: k.positionY ?? defaultTransform.positionY,
      rotation: k.rotation ?? defaultTransform.rotation,
    };
  }

  // After or at last keyframe
  const last = sorted[sorted.length - 1];
  if (timeOffset >= last.timeOffset) {
    return {
      opacity: last.opacity ?? defaultTransform.opacity,
      scale: last.scale ?? defaultTransform.scale,
      positionX: last.positionX ?? defaultTransform.positionX,
      positionY: last.positionY ?? defaultTransform.positionY,
      rotation: last.rotation ?? defaultTransform.rotation,
    };
  }

  // Find surrounding pair (k1 and k2)
  let k1 = sorted[0];
  let k2 = sorted[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (timeOffset >= sorted[i].timeOffset && timeOffset <= sorted[i + 1].timeOffset) {
      k1 = sorted[i];
      k2 = sorted[i + 1];
      break;
    }
  }

  const span = k2.timeOffset - k1.timeOffset;
  if (span <= 0.0001) {
    return {
      opacity: k1.opacity ?? defaultTransform.opacity,
      scale: k1.scale ?? defaultTransform.scale,
      positionX: k1.positionX ?? defaultTransform.positionX,
      positionY: k1.positionY ?? defaultTransform.positionY,
      rotation: k1.rotation ?? defaultTransform.rotation,
    };
  }

  const rawT = (timeOffset - k1.timeOffset) / span;
  const t = smoothstep(rawT);

  const op1 = k1.opacity ?? defaultTransform.opacity;
  const op2 = k2.opacity ?? defaultTransform.opacity;

  const sc1 = k1.scale ?? defaultTransform.scale;
  const sc2 = k2.scale ?? defaultTransform.scale;

  const px1 = k1.positionX ?? defaultTransform.positionX;
  const px2 = k2.positionX ?? defaultTransform.positionX;

  const py1 = k1.positionY ?? defaultTransform.positionY;
  const py2 = k2.positionY ?? defaultTransform.positionY;

  const rot1 = k1.rotation ?? defaultTransform.rotation;
  const rot2 = k2.rotation ?? defaultTransform.rotation;

  return {
    opacity: Math.max(0, Math.min(1, lerp(op1, op2, t))),
    scale: Math.max(0.1, lerp(sc1, sc2, t)),
    positionX: lerp(px1, px2, t),
    positionY: lerp(py1, py2, t),
    rotation: lerp(rot1, rot2, t),
  };
}

/**
 * Finds if there is an existing keyframe close to the target time offset (within threshold).
 */
export function findKeyframeAtTime(
  keyframes: Keyframe[] | undefined,
  timeOffset: number,
  threshold = 0.15
): Keyframe | undefined {
  if (!keyframes) return undefined;
  return keyframes.find((k) => Math.abs(k.timeOffset - timeOffset) <= threshold);
}

export type AnimationPreset =
  | 'slow-zoom-in'
  | 'punch-zoom'
  | 'pan-left-to-right'
  | 'fade-in-out'
  | 'spin-intro'
  | 'floating-pulse';

/**
 * Creates dynamic multi-keyframe animation presets.
 */
export function generateKeyframePreset(
  preset: AnimationPreset,
  duration: number
): Keyframe[] {
  const dur = Math.max(1, duration);

  switch (preset) {
    case 'slow-zoom-in':
      return [
        { id: `kf-${Date.now()}-1`, timeOffset: 0, scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
        { id: `kf-${Date.now()}-2`, timeOffset: dur, scale: 1.35, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
      ];

    case 'punch-zoom':
      return [
        { id: `kf-${Date.now()}-1`, timeOffset: 0, scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
        { id: `kf-${Date.now()}-2`, timeOffset: Math.min(0.6, dur * 0.2), scale: 1.4, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
        { id: `kf-${Date.now()}-3`, timeOffset: Math.min(1.2, dur * 0.4), scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
      ];

    case 'pan-left-to-right':
      return [
        { id: `kf-${Date.now()}-1`, timeOffset: 0, scale: 1.25, positionX: -18, positionY: 0, opacity: 1, rotation: 0 },
        { id: `kf-${Date.now()}-2`, timeOffset: dur, scale: 1.25, positionX: 18, positionY: 0, opacity: 1, rotation: 0 },
      ];

    case 'fade-in-out':
      return [
        { id: `kf-${Date.now()}-1`, timeOffset: 0, scale: 1.0, positionX: 0, positionY: 0, opacity: 0.0, rotation: 0 },
        { id: `kf-${Date.now()}-2`, timeOffset: Math.min(0.8, dur * 0.25), scale: 1.0, positionX: 0, positionY: 0, opacity: 1.0, rotation: 0 },
        { id: `kf-${Date.now()}-3`, timeOffset: Math.max(0.9, dur - 0.8), scale: 1.0, positionX: 0, positionY: 0, opacity: 1.0, rotation: 0 },
        { id: `kf-${Date.now()}-4`, timeOffset: dur, scale: 1.0, positionX: 0, positionY: 0, opacity: 0.0, rotation: 0 },
      ];

    case 'spin-intro':
      return [
        { id: `kf-${Date.now()}-1`, timeOffset: 0, scale: 0.4, positionX: 0, positionY: 0, opacity: 0, rotation: -90 },
        { id: `kf-${Date.now()}-2`, timeOffset: Math.min(0.7, dur * 0.3), scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
      ];

    case 'floating-pulse':
      return [
        { id: `kf-${Date.now()}-1`, timeOffset: 0, scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
        { id: `kf-${Date.now()}-2`, timeOffset: dur * 0.5, scale: 1.15, positionX: 0, positionY: -5, opacity: 1, rotation: 3 },
        { id: `kf-${Date.now()}-3`, timeOffset: dur, scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
      ];
  }
}
