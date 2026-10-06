import { VideoClip, TextClip, OverlayClip, AudioClip, ExportSettings } from '../types/editor';
import { interpolateKeyframes } from './keyframeInterpolator';

/**
 * Triggers browser download for a Blob or URL.
 */
export function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Converts a dataURL to Blob.
 */
export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Client-side Canvas video rendering & MediaRecorder pipeline.
 */
export async function renderTimelineInBrowser(
  videoClips: VideoClip[],
  textClips: TextClip[],
  overlayClips: OverlayClip[],
  audioClips: AudioClip[],
  totalDuration: number,
  aspectRatio: string,
  settings: ExportSettings,
  onProgress: (progress: number, statusText: string) => void
): Promise<Blob> {
  const dimensionsMap: Record<string, { w: number; h: number }> = {
    '16:9': { w: 1280, h: 720 },
    '9:16': { w: 720, h: 1280 },
    '1:1': { w: 1080, h: 1080 },
    '4:5': { w: 864, h: 1080 },
    '21:9': { w: 1920, h: 820 },
    '4:3': { w: 1024, h: 768 },
  };

  const dims = dimensionsMap[aspectRatio] || { w: 1280, h: 720 };
  let width = dims.w;
  let height = dims.h;

  if (settings.resolution === '480p') {
    width = Math.round(width * 0.5);
    height = Math.round(height * 0.5);
  } else if (settings.resolution === '1080p') {
    width = Math.round(width * 1.5);
    height = Math.round(height * 1.5);
  } else if (settings.resolution === '4k') {
    width = Math.round(width * 2.5);
    height = Math.round(height * 2.5);
  }

  // Ensure even dimensions for video encoders
  width = width % 2 === 0 ? width : width + 1;
  height = height % 2 === 0 ? height : height + 1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas 2D context');

  // Preload video elements
  onProgress(5, 'Pre-buffering video tracks...');
  const videoElements: Map<string, HTMLVideoElement> = new Map();
  for (const clip of videoClips) {
    if (!videoElements.has(clip.url)) {
      const v = document.createElement('video');
      v.src = clip.url;
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.preload = 'auto';
      await new Promise<void>((resolve) => {
        v.onloadedmetadata = () => resolve();
        v.onerror = () => resolve(); // continue on error
      });
      videoElements.set(clip.url, v);
    }
  }

  // Setup Canvas Stream and MediaRecorder
  const fps = settings.fps || 30;
  const stream = canvas.captureStream(fps);

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: settings.quality === 'ultra' ? 8000000 : 4000000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const renderPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve(finalBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(100);

  const totalFrames = Math.max(1, Math.round(totalDuration * fps));
  const frameDuration = 1 / fps;

  for (let f = 0; f < totalFrames; f++) {
    const currentTime = f * frameDuration;
    const progress = Math.round((f / totalFrames) * 90);
    onProgress(progress, `Compositing frame ${f + 1}/${totalFrames} (${currentTime.toFixed(1)}s)...`);

    // 1. Clear background
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, height);

    // 2. Render active video clip
    const activeVideoClip = videoClips.find(
      (c) => currentTime >= c.startTime && currentTime <= c.startTime + c.duration
    );

    if (activeVideoClip) {
      const vEl = videoElements.get(activeVideoClip.url);
      if (vEl) {
        const clipElapsed = (currentTime - activeVideoClip.startTime) * activeVideoClip.speed;
        const targetMediaTime = activeVideoClip.inPoint + clipElapsed;
        vEl.currentTime = targetMediaTime;
        await new Promise((r) => setTimeout(r, 8)); // allow seek settle

        ctx.save();

        const kfTransform = interpolateKeyframes(activeVideoClip.keyframes, clipElapsed, {
          opacity: activeVideoClip.opacity,
          scale: activeVideoClip.scale ?? 1.0,
          positionX: activeVideoClip.positionX ?? 0,
          positionY: activeVideoClip.positionY ?? 0,
          rotation: activeVideoClip.rotation ?? 0,
        });

        // Apply filters
        const filt = activeVideoClip.filter;
        let filterStr = `brightness(${filt.brightness}%) contrast(${filt.contrast}%) saturate(${filt.saturation}%) sepia(${filt.sepia}%) hue-rotate(${filt.hueRotate}deg)`;
        if (filt.blur > 0) filterStr += ` blur(${filt.blur}px)`;
        if (filt.lut === 'cyberpunk') filterStr += ' hue-rotate(180deg) saturate(140%)';
        if (filt.lut === 'vintage') filterStr += ' sepia(50%) contrast(110%)';
        if (filt.lut === 'noir') filterStr += ' grayscale(100%) contrast(130%)';
        ctx.filter = filterStr;

        // Transition fade calculation with keyframe opacity
        let alpha = kfTransform.opacity;
        const clipTimeIn = currentTime - activeVideoClip.startTime;
        if (activeVideoClip.transitionIn === 'fade_black' && clipTimeIn < activeVideoClip.transitionDuration) {
          alpha *= clipTimeIn / activeVideoClip.transitionDuration;
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Preserve aspect ratio draw with keyframe scale, pan, and rotation
        const vW = vEl.videoWidth || 1280;
        const vH = vEl.videoHeight || 720;
        const baseScale = Math.min(width / vW, height / vH);
        const drawW = vW * baseScale;
        const drawH = vH * baseScale;

        const centerX = width / 2 + (kfTransform.positionX / 100) * width;
        const centerY = height / 2 + (kfTransform.positionY / 100) * height;

        ctx.translate(centerX, centerY);
        ctx.rotate((kfTransform.rotation * Math.PI) / 180);
        ctx.scale(kfTransform.scale, kfTransform.scale);
        ctx.drawImage(vEl, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }
    }

    // 3. Render active overlays
    const activeOverlays = overlayClips.filter(
      (o) => currentTime >= o.startTime && currentTime <= o.startTime + o.duration
    );
    for (const ov of activeOverlays) {
      ctx.save();
      const ovElapsed = currentTime - ov.startTime;
      const kf = interpolateKeyframes(ov.keyframes, ovElapsed, {
        opacity: ov.opacity,
        scale: ov.scale,
        positionX: 0,
        positionY: 0,
        rotation: ov.rotation,
      });

      const posX = (ov.x / 100) * width + (kf.positionX / 100) * width;
      const posY = (ov.y / 100) * height + (kf.positionY / 100) * height;
      ctx.translate(posX, posY);
      ctx.rotate((kf.rotation * Math.PI) / 180);
      ctx.scale(kf.scale, kf.scale);
      ctx.globalAlpha = kf.opacity;

      if (ov.symbol) {
        ctx.font = '64px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ov.symbol, 0, 0);
      }
      ctx.restore();
    }

    // 4. Render active text clips
    const activeTexts = textClips.filter(
      (t) => currentTime >= t.startTime && currentTime <= t.startTime + t.duration
    );
    for (const txt of activeTexts) {
      ctx.save();
      const txtElapsed = currentTime - txt.startTime;
      const kf = interpolateKeyframes(txt.keyframes, txtElapsed, {
        opacity: txt.opacity ?? 1.0,
        scale: txt.scale ?? 1.0,
        positionX: 0,
        positionY: 0,
        rotation: txt.rotation ?? 0,
      });

      const posX = (txt.x / 100) * width + (kf.positionX / 100) * width;
      const posY = (txt.y / 100) * height + (kf.positionY / 100) * height;
      ctx.translate(posX, posY);
      ctx.rotate((kf.rotation * Math.PI) / 180);
      ctx.scale(kf.scale, kf.scale);
      ctx.globalAlpha = kf.opacity;

      ctx.font = `bold ${txt.fontSize}px ${txt.fontFamily || 'Plus Jakarta Sans, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Preset styles
      if (txt.stylePreset === 'neon-glow') {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
      } else if (txt.stylePreset === 'subtitle-box') {
        const metrics = ctx.measureText(txt.text);
        const padding = 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(
          posX - metrics.width / 2 - padding,
          posY - txt.fontSize / 2 - padding / 2,
          metrics.width + padding * 2,
          txt.fontSize + padding
        );
      }

      if (txt.strokeWidth && txt.strokeWidth > 0) {
        ctx.strokeStyle = txt.strokeColor || '#000000';
        ctx.lineWidth = txt.strokeWidth;
        ctx.strokeText(txt.text, posX, posY);
      }

      ctx.fillStyle = txt.color || '#ffffff';
      ctx.fillText(txt.text, posX, posY);
      ctx.restore();
    }

    // Slight delay for renderer loop
    await new Promise((r) => setTimeout(r, 10));
  }

  onProgress(95, 'Finalizing video stream encoding...');
  recorder.stop();
  const blob = await renderPromise;
  onProgress(100, 'Export complete!');
  return blob;
}

/**
 * Server-side video merge/transcode caller using Python & FFmpeg.
 */
export async function exportViaPythonEngine(
  clips: Array<{ path?: string; url: string; start: number; duration: number; speed?: number; volume?: number }>,
  options: {
    format: string;
    resolution: string;
    fps: number;
    audioUrl?: string;
  }
) {
  const response = await fetch('/api/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clips, options }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Server video rendering failed');
  }

  return await response.json();
}
