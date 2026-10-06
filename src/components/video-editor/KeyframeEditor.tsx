import React from 'react';
import {
  Diamond,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  Move,
  Maximize2,
  Eye,
  RotateCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Keyframe } from '../../types/editor';
import {
  interpolateKeyframes,
  findKeyframeAtTime,
  generateKeyframePreset,
  AnimationPreset,
} from '../../utils/keyframeInterpolator';

interface KeyframeEditorProps {
  clipDuration: number;
  clipStartTime: number;
  currentTimelineTime: number;
  keyframes: Keyframe[] | undefined;
  baseProperties: {
    opacity?: number;
    scale?: number;
    positionX?: number;
    positionY?: number;
    rotation?: number;
  };
  onChangeKeyframes: (updatedKeyframes: Keyframe[]) => void;
  onSeekTimeline: (timelineTime: number) => void;
  onUpdateBaseProperties?: (properties: {
    opacity?: number;
    scale?: number;
    positionX?: number;
    positionY?: number;
    rotation?: number;
  }) => void;
}

export const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  clipDuration,
  clipStartTime,
  currentTimelineTime,
  keyframes = [],
  baseProperties,
  onChangeKeyframes,
  onSeekTimeline,
  onUpdateBaseProperties,
}) => {
  // Current time within the clip
  const clipTime = Math.max(0, Math.min(clipDuration, currentTimelineTime - clipStartTime));
  const activeKeyframe = findKeyframeAtTime(keyframes, clipTime, 0.15);
  const currentValues = interpolateKeyframes(keyframes, clipTime, baseProperties);

  // Toggle Keyframe at current playhead position
  const handleToggleKeyframe = () => {
    if (activeKeyframe) {
      // Remove keyframe
      const updated = keyframes.filter((k) => k.id !== activeKeyframe.id);
      onChangeKeyframes(updated);
    } else {
      // Add keyframe with current interpolated values
      const newKf: Keyframe = {
        id: `kf-${Date.now()}`,
        timeOffset: Math.round(clipTime * 100) / 100,
        opacity: currentValues.opacity,
        scale: currentValues.scale,
        positionX: currentValues.positionX,
        positionY: currentValues.positionY,
        rotation: currentValues.rotation,
      };
      const updated = [...keyframes, newKf].sort((a, b) => a.timeOffset - b.timeOffset);
      onChangeKeyframes(updated);
    }
  };

  // Seek to adjacent keyframes
  const sortedKeyframes = [...keyframes].sort((a, b) => a.timeOffset - b.timeOffset);
  const prevKf = sortedKeyframes.filter((k) => k.timeOffset < clipTime - 0.05).pop();
  const nextKf = sortedKeyframes.find((k) => k.timeOffset > clipTime + 0.05);

  const handleSeekToKf = (kf: Keyframe) => {
    onSeekTimeline(clipStartTime + kf.timeOffset);
  };

  // Modify active keyframe property, or update base property if no keyframes
  const updateCurrentProperty = (field: keyof Keyframe, val: number) => {
    if (keyframes.length === 0) {
      if (onUpdateBaseProperties) {
        onUpdateBaseProperties({ [field]: val });
      }
      return;
    }

    if (activeKeyframe) {
      const updated = keyframes.map((k) =>
        k.id === activeKeyframe.id ? { ...k, [field]: val } : k
      );
      onChangeKeyframes(updated);
    } else {
      // Create new keyframe automatically at current playhead time
      const newKf: Keyframe = {
        id: `kf-${Date.now()}`,
        timeOffset: Math.round(clipTime * 100) / 100,
        opacity: field === 'opacity' ? val : currentValues.opacity,
        scale: field === 'scale' ? val : currentValues.scale,
        positionX: field === 'positionX' ? val : currentValues.positionX,
        positionY: field === 'positionY' ? val : currentValues.positionY,
        rotation: field === 'rotation' ? val : currentValues.rotation,
      };
      const updated = [...keyframes, newKf].sort((a, b) => a.timeOffset - b.timeOffset);
      onChangeKeyframes(updated);
    }
  };

  // Apply Animation Preset
  const handleApplyPreset = (preset: AnimationPreset) => {
    const presetKeyframes = generateKeyframePreset(preset, clipDuration);
    onChangeKeyframes(presetKeyframes);
  };

  // Clear all keyframes
  const handleClearAll = () => {
    onChangeKeyframes([]);
  };

  return (
    <div className="bg-[#121929] border border-cyan-500/30 rounded-xl p-3 space-y-3 select-none text-xs">
      {/* Header and CapCut Diamond Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
          <Diamond className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
          <span>Keyframe Animation</span>
        </div>

        <div className="flex items-center gap-1 bg-[#182133] px-2 py-0.5 rounded-lg border border-slate-700/80 font-mono text-[10px] text-slate-300">
          <span>{clipTime.toFixed(1)}s</span>
          <span className="text-slate-500">/</span>
          <span>{clipDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Action Bar: Prev, Diamond Add/Remove, Next, Count */}
      <div className="flex items-center justify-between bg-[#162033] p-1.5 rounded-lg border border-slate-700/80">
        <div className="flex items-center gap-1">
          <button
            onClick={() => prevKf && handleSeekToKf(prevKf)}
            disabled={!prevKf}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Seek to previous keyframe"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Iconic Diamond Keyframe Button */}
          <button
            onClick={handleToggleKeyframe}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all text-xs cursor-pointer ${
              activeKeyframe
                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40'
            }`}
            title={activeKeyframe ? 'Remove keyframe at current time' : 'Add keyframe at current time'}
          >
            <Diamond className={`w-3.5 h-3.5 ${activeKeyframe ? 'fill-current' : 'fill-none'}`} />
            <span>{activeKeyframe ? 'Remove Keyframe' : 'Add Keyframe'}</span>
          </button>

          <button
            onClick={() => nextKf && handleSeekToKf(nextKf)}
            disabled={!nextKf}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Seek to next keyframe"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          {keyframes.length} {keyframes.length === 1 ? 'kf' : 'keyframes'}
        </span>
      </div>

      {/* Mini Visual Keyframe Track */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickFrac = (e.clientX - rect.left) / rect.width;
          const targetSec = Math.max(0, Math.min(clipDuration, clickFrac * clipDuration));
          onSeekTimeline(clipStartTime + targetSec);
        }}
        className="relative h-6 bg-[#0b0f17] rounded border border-slate-700/80 cursor-pointer overflow-hidden flex items-center px-1"
        title="Click along track to jump playhead"
      >
        {/* Track center line */}
        <div className="absolute left-0 right-0 h-0.5 bg-slate-800" />

        {/* Keyframe Diamonds */}
        {keyframes.map((kf) => {
          const pct = (kf.timeOffset / clipDuration) * 100;
          const isAtCurrent = Math.abs(kf.timeOffset - clipTime) <= 0.15;
          return (
            <div
              key={kf.id}
              onClick={(e) => {
                e.stopPropagation();
                handleSeekToKf(kf);
              }}
              style={{ left: `${pct}%` }}
              className={`absolute -translate-x-1/2 w-2.5 h-2.5 transform rotate-45 transition-transform hover:scale-125 z-10 ${
                isAtCurrent
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                  : 'bg-cyan-400 border border-slate-900 shadow-sm'
              }`}
            />
          );
        })}

        {/* Current Needle Indicator */}
        <div
          style={{ left: `${(clipTime / clipDuration) * 100}%` }}
          className="absolute -translate-x-1/2 top-0 bottom-0 w-1 bg-red-400 pointer-events-none z-20 shadow-[0_0_6px_rgba(248,113,113,0.9)]"
        />
      </div>

      {/* Animated Properties Sliders */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        {/* Scale / Zoom */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-300 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-cyan-400" /> Scale (Zoom)
            </span>
            <span className="font-mono text-cyan-300 font-semibold">{currentValues.scale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={currentValues.scale}
            onChange={(e) => updateCurrentProperty('scale', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex gap-1 mt-1 text-[10px]">
            {[1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => updateCurrentProperty('scale', s)}
                className="flex-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-300 flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" /> Opacity
            </span>
            <span className="font-mono text-slate-300">{Math.round(currentValues.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentValues.opacity}
            onChange={(e) => updateCurrentProperty('opacity', parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Position X & Y Pan */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-slate-400">Pan X</span>
              <span className="font-mono text-slate-300">{Math.round(currentValues.positionX)}%</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={currentValues.positionX}
              onChange={(e) => updateCurrentProperty('positionX', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-slate-400">Pan Y</span>
              <span className="font-mono text-slate-300">{Math.round(currentValues.positionY)}%</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={currentValues.positionY}
              onChange={(e) => updateCurrentProperty('positionY', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-300 flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-cyan-400" /> Rotation
            </span>
            <span className="font-mono text-slate-300">{Math.round(currentValues.rotation)}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={currentValues.rotation}
            onChange={(e) => updateCurrentProperty('rotation', parseInt(e.target.value, 10))}
            className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Quick Animation Presets */}
      <div className="pt-2 border-t border-slate-800 space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> 1-Click Keyframe Ramps
        </span>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <button
            onClick={() => handleApplyPreset('slow-zoom-in')}
            className="p-1 rounded bg-[#172031] hover:bg-slate-700 text-slate-300 border border-slate-700 text-left truncate"
          >
            Slow Zoom In
          </button>
          <button
            onClick={() => handleApplyPreset('punch-zoom')}
            className="p-1 rounded bg-[#172031] hover:bg-slate-700 text-slate-300 border border-slate-700 text-left truncate"
          >
            Punch Zoom
          </button>
          <button
            onClick={() => handleApplyPreset('pan-left-to-right')}
            className="p-1 rounded bg-[#172031] hover:bg-slate-700 text-slate-300 border border-slate-700 text-left truncate"
          >
            Pan Left to Right
          </button>
          <button
            onClick={() => handleApplyPreset('fade-in-out')}
            className="p-1 rounded bg-[#172031] hover:bg-slate-700 text-slate-300 border border-slate-700 text-left truncate"
          >
            Fade In / Out
          </button>
        </div>

        {keyframes.length > 0 && (
          <button
            onClick={handleClearAll}
            className="w-full mt-1 flex items-center justify-center gap-1 py-1 rounded bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 text-[10px]"
          >
            <Trash2 className="w-3 h-3" />
            <span>Reset All Keyframes</span>
          </button>
        )}
      </div>
    </div>
  );
};
