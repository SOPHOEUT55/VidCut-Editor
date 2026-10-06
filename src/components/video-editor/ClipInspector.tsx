import React from 'react';
import {
  Sliders,
  Sparkles,
  Type,
  Volume2,
  Trash2,
  X,
  Gauge,
  Eye,
} from 'lucide-react';
import { VideoClip, TextClip, OverlayClip, AudioClip, TransitionType, TextStylePreset } from '../../types/editor';
import { KeyframeEditor } from './KeyframeEditor';

interface ClipInspectorProps {
  selectedClipId: string | null;
  selectedClipType: 'video' | 'text' | 'overlay' | 'audio' | null;
  currentTime: number;
  onSeekTimeline: (time: number) => void;
  videoClips: VideoClip[];
  textClips: TextClip[];
  overlayClips: OverlayClip[];
  audioClips: AudioClip[];
  onUpdateVideoClip: (id: string, updates: Partial<VideoClip>) => void;
  onUpdateTextClip: (id: string, updates: Partial<TextClip>) => void;
  onUpdateOverlayClip: (id: string, updates: Partial<OverlayClip>) => void;
  onUpdateAudioClip: (id: string, updates: Partial<AudioClip>) => void;
  onClose: () => void;
  onDeleteClip: (id: string) => void;
}

export const ClipInspector: React.FC<ClipInspectorProps> = ({
  selectedClipId,
  selectedClipType,
  currentTime,
  onSeekTimeline,
  videoClips,
  textClips,
  overlayClips,
  audioClips,
  onUpdateVideoClip,
  onUpdateTextClip,
  onUpdateOverlayClip,
  onUpdateAudioClip,
  onClose,
  onDeleteClip,
}) => {
  if (!selectedClipId || !selectedClipType) {
    return (
      <div className="w-72 bg-[#0e1420] border-l border-slate-800/80 p-4 flex flex-col items-center justify-center text-center text-slate-500 text-xs shrink-0 select-none">
        <Sliders className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
        <p className="font-medium text-slate-400">No clip selected</p>
        <p className="text-[11px] text-slate-500 mt-1">Select a clip in the timeline to adjust properties, speed, effects, or styles.</p>
      </div>
    );
  }

  const activeVideo = videoClips.find((c) => c.id === selectedClipId);
  const activeText = textClips.find((c) => c.id === selectedClipId);
  const activeOverlay = overlayClips.find((c) => c.id === selectedClipId);
  const activeAudio = audioClips.find((c) => c.id === selectedClipId);

  return (
    <div className="w-72 bg-[#0e1420] border-l border-slate-800/80 flex flex-col h-full shrink-0 select-none text-xs">
      {/* Header */}
      <div className="h-10 px-3 border-b border-slate-800 flex items-center justify-between bg-[#0b0f19]">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="capitalize">{selectedClipType} Properties</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeleteClip(selectedClipId)}
            className="p-1 rounded text-red-400 hover:bg-red-950/40"
            title="Delete this clip"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* VIDEO PROPERTIES */}
        {selectedClipType === 'video' && activeVideo && (
          <>
            {/* Keyframe Editor */}
            <KeyframeEditor
              clipDuration={activeVideo.duration}
              clipStartTime={activeVideo.startTime}
              currentTimelineTime={currentTime}
              keyframes={activeVideo.keyframes}
              baseProperties={{
                opacity: activeVideo.opacity,
                scale: activeVideo.scale ?? 1.0,
                positionX: activeVideo.positionX ?? 0,
                positionY: activeVideo.positionY ?? 0,
                rotation: activeVideo.rotation ?? 0,
              }}
              onChangeKeyframes={(kfs) => onUpdateVideoClip(activeVideo.id, { keyframes: kfs })}
              onSeekTimeline={onSeekTimeline}
              onUpdateBaseProperties={(props) => onUpdateVideoClip(activeVideo.id, props)}
            />

            {/* Speed Multiplier */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Speed
                </span>
                <span className="font-mono text-cyan-400 font-semibold">{activeVideo.speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      const newDuration = (activeVideo.outPoint - activeVideo.inPoint) / s;
                      onUpdateVideoClip(activeVideo.id, { speed: s, duration: newDuration });
                    }}
                    className={`py-1 rounded text-[11px] font-medium border ${
                      activeVideo.speed === s
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-[#151c2a] border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" /> Volume
                </span>
                <span className="font-mono text-slate-300">{Math.round(activeVideo.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeVideo.volume}
                onChange={(e) => onUpdateVideoClip(activeVideo.id, { volume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" /> Opacity
                </span>
                <span className="font-mono text-slate-300">{Math.round(activeVideo.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeVideo.opacity}
                onChange={(e) => onUpdateVideoClip(activeVideo.id, { opacity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Transition */}
            <div>
              <span className="text-slate-400 block mb-1">Transition In</span>
              <select
                value={activeVideo.transitionIn}
                onChange={(e) => onUpdateVideoClip(activeVideo.id, { transitionIn: e.target.value as TransitionType })}
                className="w-full bg-[#151c2a] border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none text-xs"
              >
                <option value="none">None (Cut)</option>
                <option value="fade_black">Fade from Black</option>
                <option value="crossfade">Cross Dissolve</option>
                <option value="slide_left">Slide Left</option>
                <option value="slide_right">Slide Right</option>
                <option value="zoom_in">Zoom In</option>
                <option value="zoom_out">Zoom Out</option>
              </select>
            </div>

            {/* Filter Adjustments */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <span className="font-semibold text-slate-300 block">Color Adjustments</span>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Brightness</span>
                  <span className="font-mono text-slate-300">{activeVideo.filter.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={activeVideo.filter.brightness}
                  onChange={(e) =>
                    onUpdateVideoClip(activeVideo.id, {
                      filter: { ...activeVideo.filter, brightness: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Contrast</span>
                  <span className="font-mono text-slate-300">{activeVideo.filter.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={activeVideo.filter.contrast}
                  onChange={(e) =>
                    onUpdateVideoClip(activeVideo.id, {
                      filter: { ...activeVideo.filter, contrast: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Saturation</span>
                  <span className="font-mono text-slate-300">{activeVideo.filter.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={activeVideo.filter.saturation}
                  onChange={(e) =>
                    onUpdateVideoClip(activeVideo.id, {
                      filter: { ...activeVideo.filter, saturation: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Sepia Warmth</span>
                  <span className="font-mono text-slate-300">{activeVideo.filter.sepia}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeVideo.filter.sepia}
                  onChange={(e) =>
                    onUpdateVideoClip(activeVideo.id, {
                      filter: { ...activeVideo.filter, sepia: parseInt(e.target.value, 10) },
                    })
                  }
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </>
        )}

        {/* TEXT PROPERTIES */}
        {selectedClipType === 'text' && activeText && (
          <>
            {/* Keyframe Editor */}
            <KeyframeEditor
              clipDuration={activeText.duration}
              clipStartTime={activeText.startTime}
              currentTimelineTime={currentTime}
              keyframes={activeText.keyframes}
              baseProperties={{
                opacity: activeText.opacity ?? 1.0,
                scale: activeText.scale ?? 1.0,
                positionX: 0,
                positionY: 0,
                rotation: activeText.rotation ?? 0,
              }}
              onChangeKeyframes={(kfs) => onUpdateTextClip(activeText.id, { keyframes: kfs })}
              onSeekTimeline={onSeekTimeline}
              onUpdateBaseProperties={(props) => onUpdateTextClip(activeText.id, props)}
            />

            <div>
              <span className="text-slate-400 block mb-1">Caption Text</span>
              <textarea
                rows={3}
                value={activeText.text}
                onChange={(e) => onUpdateTextClip(activeText.id, { text: e.target.value })}
                className="w-full bg-[#151c2a] border border-slate-700 rounded p-2 text-slate-200 outline-none text-xs focus:border-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Font Size</span>
                <span className="font-mono text-slate-300">{activeText.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="96"
                value={activeText.fontSize}
                onChange={(e) => onUpdateTextClip(activeText.id, { fontSize: parseInt(e.target.value, 10) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block mb-1">Text Color</span>
                <input
                  type="color"
                  value={activeText.color}
                  onChange={(e) => onUpdateTextClip(activeText.id, { color: e.target.value })}
                  className="w-full h-8 bg-transparent cursor-pointer rounded border border-slate-700"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Stroke Color</span>
                <input
                  type="color"
                  value={activeText.strokeColor || '#000000'}
                  onChange={(e) => onUpdateTextClip(activeText.id, { strokeColor: e.target.value, strokeWidth: activeText.strokeWidth || 3 })}
                  className="w-full h-8 bg-transparent cursor-pointer rounded border border-slate-700"
                />
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Style Preset</span>
              <select
                value={activeText.stylePreset}
                onChange={(e) => onUpdateTextClip(activeText.id, { stylePreset: e.target.value as TextStylePreset })}
                className="w-full bg-[#151c2a] border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
              >
                <option value="bold-impact">Bold Impact</option>
                <option value="neon-glow">Neon Glow</option>
                <option value="subtitle-box">Subtitle Box</option>
                <option value="cinema-serif">Cinema Serif</option>
                <option value="typewriter">Typewriter Mono</option>
                <option value="gradient-pop">Gradient Pop</option>
              </select>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Vertical Position (Y)</span>
              <input
                type="range"
                min="10"
                max="90"
                value={activeText.y}
                onChange={(e) => onUpdateTextClip(activeText.id, { y: parseInt(e.target.value, 10) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </>
        )}

        {/* OVERLAY PROPERTIES */}
        {selectedClipType === 'overlay' && activeOverlay && (
          <>
            {/* Keyframe Editor */}
            <KeyframeEditor
              clipDuration={activeOverlay.duration}
              clipStartTime={activeOverlay.startTime}
              currentTimelineTime={currentTime}
              keyframes={activeOverlay.keyframes}
              baseProperties={{
                opacity: activeOverlay.opacity,
                scale: activeOverlay.scale,
                positionX: 0,
                positionY: 0,
                rotation: activeOverlay.rotation,
              }}
              onChangeKeyframes={(kfs) => onUpdateOverlayClip(activeOverlay.id, { keyframes: kfs })}
              onSeekTimeline={onSeekTimeline}
              onUpdateBaseProperties={(props) => onUpdateOverlayClip(activeOverlay.id, props)}
            />

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Scale</span>
                <span className="font-mono text-slate-300">{activeOverlay.scale.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={activeOverlay.scale}
                onChange={(e) => onUpdateOverlayClip(activeOverlay.id, { scale: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Rotation</span>
                <span className="font-mono text-slate-300">{activeOverlay.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={activeOverlay.rotation}
                onChange={(e) => onUpdateOverlayClip(activeOverlay.id, { rotation: parseInt(e.target.value, 10) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Opacity</span>
                <span className="font-mono text-slate-300">{Math.round(activeOverlay.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeOverlay.opacity}
                onChange={(e) => onUpdateOverlayClip(activeOverlay.id, { opacity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </>
        )}

        {/* AUDIO PROPERTIES */}
        {selectedClipType === 'audio' && activeAudio && (
          <>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Track Volume</span>
                <span className="font-mono text-slate-300">{Math.round(activeAudio.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={activeAudio.volume}
                onChange={(e) => onUpdateAudioClip(activeAudio.id, { volume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
