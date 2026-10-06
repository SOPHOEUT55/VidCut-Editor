import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Camera,
  Grid,
} from 'lucide-react';
import { VideoClip, TextClip, OverlayClip, AspectRatioType } from '../../types/editor';
import { formatTimecode } from '../../utils/timeFormat';
import { interpolateKeyframes } from '../../utils/keyframeInterpolator';

interface VideoCanvasProps {
  aspectRatio: AspectRatioType;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  videoClips: VideoClip[];
  textClips: TextClip[];
  overlayClips: OverlayClip[];
  onSnapToThumbnail: (frameDataUrl: string) => void;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({
  aspectRatio,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  videoClips,
  textClips,
  overlayClips,
  onSnapToThumbnail,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSafeGuides, setShowSafeGuides] = useState(false);
  const [activeMediaUrl, setActiveMediaUrl] = useState<string>('');

  // Active clip based on currentTime
  const activeVideoClip = videoClips.find(
    (c) => currentTime >= c.startTime && currentTime <= c.startTime + c.duration
  );

  // Synchronize hidden video element with timeline
  useEffect(() => {
    if (!hiddenVideoRef.current) return;
    const video = hiddenVideoRef.current;

    if (activeVideoClip) {
      if (activeMediaUrl !== activeVideoClip.url) {
        setActiveMediaUrl(activeVideoClip.url);
        video.src = activeVideoClip.url;
      }

      const clipElapsed = (currentTime - activeVideoClip.startTime) * activeVideoClip.speed;
      const targetTime = activeVideoClip.inPoint + clipElapsed;
      if (Math.abs(video.currentTime - targetTime) > 0.15) {
        video.currentTime = targetTime;
      }

      video.volume = isMuted ? 0 : volume * activeVideoClip.volume;
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!isPlaying && !video.paused) {
        video.pause();
      }
    } else {
      if (!video.paused) video.pause();
    }
  }, [currentTime, isPlaying, activeVideoClip, activeMediaUrl, volume, isMuted]);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderFrame = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, w, h);

      // 2. Render Video Frame
      const video = hiddenVideoRef.current;
      if (activeVideoClip && video && video.readyState >= 2) {
        ctx.save();

        const clipElapsed = currentTime - activeVideoClip.startTime;
        const kfTransform = interpolateKeyframes(activeVideoClip.keyframes, clipElapsed, {
          opacity: activeVideoClip.opacity,
          scale: activeVideoClip.scale ?? 1.0,
          positionX: activeVideoClip.positionX ?? 0,
          positionY: activeVideoClip.positionY ?? 0,
          rotation: activeVideoClip.rotation ?? 0,
        });

        // Apply filters
        const f = activeVideoClip.filter;
        let filterStr = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) sepia(${f.sepia}%) hue-rotate(${f.hueRotate}deg)`;
        if (f.blur > 0) filterStr += ` blur(${f.blur}px)`;
        if (f.lut === 'cyberpunk') filterStr += ' hue-rotate(180deg) saturate(140%)';
        if (f.lut === 'vintage') filterStr += ' sepia(50%) contrast(110%)';
        if (f.lut === 'noir') filterStr += ' grayscale(100%) contrast(130%)';
        ctx.filter = filterStr;

        // Transition fade calculation with keyframe opacity
        let alpha = kfTransform.opacity;
        if (activeVideoClip.transitionIn === 'fade_black' && clipElapsed < activeVideoClip.transitionDuration) {
          alpha *= clipElapsed / activeVideoClip.transitionDuration;
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Preserve aspect ratio draw with keyframe scale, pan, and rotation
        const vW = video.videoWidth || 1280;
        const vH = video.videoHeight || 720;
        const baseScale = Math.min(w / vW, h / vH);
        const drawW = vW * baseScale;
        const drawH = vH * baseScale;

        const centerX = w / 2 + (kfTransform.positionX / 100) * w;
        const centerY = h / 2 + (kfTransform.positionY / 100) * h;

        ctx.translate(centerX, centerY);
        ctx.rotate((kfTransform.rotation * Math.PI) / 180);
        ctx.scale(kfTransform.scale, kfTransform.scale);
        ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        // Empty state indicator inside canvas
        ctx.fillStyle = '#1e293b';
        ctx.font = '14px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(videoClips.length === 0 ? 'No clips on timeline. Click Media tab to add.' : 'Black frame', w / 2, h / 2);
      }

      // 3. Render Overlays
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

        const posX = (ov.x / 100) * w + (kf.positionX / 100) * w;
        const posY = (ov.y / 100) * h + (kf.positionY / 100) * h;
        ctx.translate(posX, posY);
        ctx.rotate((kf.rotation * Math.PI) / 180);
        ctx.scale(kf.scale, kf.scale);
        ctx.globalAlpha = kf.opacity;

        if (ov.symbol) {
          ctx.font = '48px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ov.symbol, 0, 0);
        }
        ctx.restore();
      }

      // 4. Render Text Clips
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

        const posX = (txt.x / 100) * w + (kf.positionX / 100) * w;
        const posY = (txt.y / 100) * h + (kf.positionY / 100) * h;
        ctx.translate(posX, posY);
        ctx.rotate((kf.rotation * Math.PI) / 180);
        ctx.scale(kf.scale, kf.scale);
        ctx.globalAlpha = kf.opacity;

        ctx.font = `bold ${txt.fontSize}px ${txt.fontFamily || 'Plus Jakarta Sans, sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Styles presets
        if (txt.stylePreset === 'neon-glow') {
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 18;
        } else if (txt.stylePreset === 'subtitle-box') {
          const metrics = ctx.measureText(txt.text);
          const pad = 10;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(
            posX - metrics.width / 2 - pad,
            posY - txt.fontSize / 2 - pad / 2,
            metrics.width + pad * 2,
            txt.fontSize + pad
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

      // 5. Safe Area Guides if enabled
      if (showSafeGuides) {
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        // Action safe (90%)
        ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
        // Title safe (80%)
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
        ctx.restore();
      }

      if (isPlaying) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [currentTime, isPlaying, activeVideoClip, textClips, overlayClips, showSafeGuides]);

  // Capture canvas frame for thumbnail designer
  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSnapToThumbnail(dataUrl);
  };

  // Canvas aspect ratio dimension styling
  const aspectClass = {
    '16:9': 'aspect-[16/9] max-w-[850px]',
    '9:16': 'aspect-[9/16] max-h-[460px]',
    '1:1': 'aspect-square max-h-[460px]',
    '4:5': 'aspect-[4/5] max-h-[460px]',
    '21:9': 'aspect-[21/9] max-w-[950px]',
    '4:3': 'aspect-[4/3] max-w-[700px]',
  }[aspectRatio] || 'aspect-[16/9] max-w-[850px]';

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-[#090d16] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
    >
      {/* Hidden synchronized HTML5 video element */}
      <video
        ref={hiddenVideoRef}
        crossOrigin="anonymous"
        playsInline
        className="hidden"
      />

      {/* Main Preview Screen */}
      <div className={`relative w-full ${aspectClass} rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-black flex items-center justify-center`}>
        <canvas
          ref={canvasRef}
          width={aspectRatio === '9:16' ? 720 : 1280}
          height={aspectRatio === '9:16' ? 1280 : 720}
          className="w-full h-full object-contain cursor-pointer"
          onClick={onTogglePlay}
        />

        {/* Play indicator overlay when paused */}
        {!isPlaying && (
          <div
            onClick={onTogglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 fill-current ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="w-full max-w-3xl mt-3 px-4 py-2 bg-[#121824]/90 backdrop-blur border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
        {/* Left: Timecode */}
        <div className="flex items-center gap-2 font-mono tabular-nums text-slate-200">
          <span className="text-cyan-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Center: Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 1))}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Step back 1 second"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => onSeek(Math.min(totalDuration, currentTime + 1))}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Step forward 1 second"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Audio Volume, Guides, Snap Frame */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <button
            onClick={() => setShowSafeGuides(!showSafeGuides)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showSafeGuides ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Safe Area Guides"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={handleCaptureSnapshot}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a2334] hover:bg-cyan-500 hover:text-slate-950 border border-slate-700 text-slate-200 transition-all font-medium text-[11px]"
            title="Capture current video frame to Thumbnail Studio"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snap to Thumbnail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
