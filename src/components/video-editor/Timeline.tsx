import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Gauge,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Cpu,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { VideoClip, TextClip, OverlayClip, AudioClip } from '../../types/editor';
import { formatTimecode, formatDurationSimple } from '../../utils/timeFormat';

interface TimelineProps {
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  videoClips: VideoClip[];
  textClips: TextClip[];
  overlayClips: OverlayClip[];
  audioClips: AudioClip[];
  selectedClipId: string | null;
  onSelectClip: (id: string, type: 'video' | 'text' | 'overlay' | 'audio') => void;
  onSplitClip: () => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onUpdateClipDuration: (id: string, newIn: number, newOut: number) => void;
  onMoveClipPosition: (id: string, newStartTime: number) => void;
  onCppAutoSplit?: (cuts: number[]) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  totalDuration,
  onSeek,
  videoClips,
  textClips,
  overlayClips,
  audioClips,
  selectedClipId,
  onSelectClip,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClipDuration,
  onMoveClipPosition,
  onCppAutoSplit,
}) => {
  const [zoom, setZoom] = useState(30); // pixels per second
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDetectingScenes, setIsDetectingScenes] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);

  // Load C++ audio waveform analysis for active audio
  useEffect(() => {
    if (audioClips.length > 0) {
      const activeAudio = audioClips[0];
      fetch('/api/cpp/waveform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: activeAudio.url, bars: 40 }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.bars && Array.isArray(data.bars)) {
            setWaveformBars(data.bars);
          }
        })
        .catch(() => {});
    }
  }, [audioClips]);

  // C++ Auto Scene Detection and Split
  const handleCppSceneSplit = async () => {
    const targetVideo = videoClips.find((c) => c.id === selectedClipId) || videoClips[0];
    if (!targetVideo) return;

    setIsDetectingScenes(true);
    try {
      const res = await fetch('/api/cpp/scene-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: targetVideo.url }),
      });
      const data = await res.json();
      if (data.cuts && Array.isArray(data.cuts) && onCppAutoSplit) {
        onCppAutoSplit(data.cuts);
      }
    } catch (e) {
      console.error('Scene detection failed:', e);
    } finally {
      setIsDetectingScenes(false);
    }
  };

  // Maximum timeline duration to display (at least totalDuration or 30s)
  const maxDuration = Math.max(30, totalDuration + 5);
  const timelineWidth = maxDuration * zoom;

  // Handle playhead scrubbing
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const newTime = Math.max(0, Math.min(maxDuration, clickX / zoom));
    onSeek(newTime);
    setIsScrubbing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const newTime = Math.max(0, Math.min(maxDuration, clickX / zoom));
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, maxDuration, zoom, onSeek]);

  // Generate ruler tick marks
  const renderRulerTicks = () => {
    const ticks = [];
    const step = zoom > 50 ? 1 : zoom > 20 ? 2 : 5;
    for (let sec = 0; sec <= maxDuration; sec += step) {
      ticks.push(
        <div
          key={sec}
          className="absolute top-0 flex flex-col items-center select-none"
          style={{ left: `${sec * zoom}px` }}
        >
          <div className="h-2 w-px bg-slate-700" />
          <span className="text-[10px] font-mono text-slate-500 mt-0.5">
            {formatDurationSimple(sec)}
          </span>
        </div>
      );
    }
    return ticks;
  };

  const playheadLeft = currentTime * zoom;

  return (
    <div className="h-64 bg-[#0a0e17] border-t border-slate-800 flex flex-col shrink-0 select-none">
      {/* Timeline Action Bar */}
      <div className="h-10 bg-[#0e1421] border-b border-slate-800 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Split at Playhead */}
          <button
            onClick={onSplitClip}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#172031] hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border border-slate-700 font-medium transition-colors cursor-pointer"
            title="Split selected clip at current playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split Clip</span>
          </button>

          {/* Duplicate Clip */}
          {selectedClipId && (
            <button
              onClick={() => onDuplicateClip(selectedClipId)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#172031] hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
              title="Duplicate selected clip"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
          )}

          {/* Delete Clip */}
          {selectedClipId && (
            <button
              onClick={() => onDeleteClip(selectedClipId)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/40 hover:bg-red-600 hover:text-white text-red-400 border border-red-800/60 font-medium transition-colors"
              title="Delete clip (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          {/* C++ Auto Scene Split Button */}
          <button
            onClick={handleCppSceneSplit}
            disabled={isDetectingScenes || videoClips.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-950/50 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Auto Scene Cut Detection using C++ Turbo Engine"
          >
            {isDetectingScenes ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>C++ Auto Split</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 text-slate-400">
          <button
            onClick={() => setZoom(Math.max(10, zoom - 5))}
            className="p-1 rounded hover:bg-slate-800 hover:text-white"
            title="Zoom out timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="10"
            max="80"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-24 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <button
            onClick={() => setZoom(Math.min(80, zoom + 5))}
            className="p-1 rounded hover:bg-slate-800 hover:text-white"
            title="Zoom in timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Multi-Track Scroll Area */}
      <div
        ref={timelineRef}
        onMouseDown={handleTimelineMouseDown}
        className="flex-1 overflow-x-auto overflow-y-auto relative cursor-crosshair bg-[#0a0e17]"
      >
        <div
          className="relative min-h-full"
          style={{ width: `${timelineWidth}px` }}
        >
          {/* Time Ruler */}
          <div className="h-6 bg-[#0c111c] border-b border-slate-800/80 sticky top-0 z-20">
            {renderRulerTicks()}
          </div>

          {/* Playhead Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
            style={{ left: `${playheadLeft}px` }}
          >
            {/* Playhead Head */}
            <div className="w-3 h-3 bg-cyan-400 transform rotate-45 -mt-1.5 shadow-md shadow-cyan-400/50" />
            {/* Playhead Line */}
            <div className="w-0.5 flex-1 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>

          {/* Tracks Area */}
          <div className="py-2 space-y-2">
            {/* Track 1: Text & Subtitles Track */}
            <div className="h-9 bg-[#111726]/40 border-y border-slate-800/40 relative flex items-center">
              <span className="absolute left-2 text-[10px] text-slate-500 font-mono pointer-events-none z-10">
                TEXT
              </span>
              {textClips.map((clip) => {
                const left = clip.startTime * zoom;
                const width = Math.max(30, clip.duration * zoom);
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id, 'text');
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute h-7 rounded px-2 flex items-center justify-between text-xs font-medium cursor-pointer transition-all border overflow-hidden ${
                      isSelected
                        ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-sm'
                        : 'bg-[#1e273b] border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <span className="truncate">{clip.text}</span>
                    {clip.keyframes && clip.keyframes.length > 0 && (
                      <div className="absolute inset-x-0 bottom-0.5 h-1.5 pointer-events-none">
                        {clip.keyframes.map((kf) => (
                          <div
                            key={kf.id}
                            style={{ left: `${(kf.timeOffset / clip.duration) * 100}%` }}
                            className="absolute -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 transform rotate-45 shadow-[0_0_3px_rgba(251,191,36,0.8)]"
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-[9px] font-mono opacity-60 ml-1">{clip.duration.toFixed(1)}s</span>
                  </div>
                );
              })}
            </div>

            {/* Track 2: Overlays & Stickers Track */}
            <div className="h-9 bg-[#111726]/40 border-y border-slate-800/40 relative flex items-center">
              <span className="absolute left-2 text-[10px] text-slate-500 font-mono pointer-events-none z-10">
                OVERLAY
              </span>
              {overlayClips.map((clip) => {
                const left = clip.startTime * zoom;
                const width = Math.max(30, clip.duration * zoom);
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id, 'overlay');
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute h-7 rounded px-2 flex items-center justify-between text-xs cursor-pointer transition-all border overflow-hidden ${
                      isSelected
                        ? 'bg-purple-500/30 border-purple-400 text-purple-200 shadow-sm'
                        : 'bg-[#1b2234] border-slate-700 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-sm mr-1">{clip.symbol || '🖼️'}</span>
                    {clip.keyframes && clip.keyframes.length > 0 && (
                      <div className="absolute inset-x-0 bottom-0.5 h-1.5 pointer-events-none">
                        {clip.keyframes.map((kf) => (
                          <div
                            key={kf.id}
                            style={{ left: `${(kf.timeOffset / clip.duration) * 100}%` }}
                            className="absolute -translate-x-1/2 w-1.5 h-1.5 bg-purple-400 transform rotate-45 shadow-[0_0_3px_rgba(192,132,252,0.8)]"
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-[9px] font-mono opacity-60">{clip.duration.toFixed(1)}s</span>
                  </div>
                );
              })}
            </div>

            {/* Track 3: Main Video Track */}
            <div className="h-16 bg-[#121929]/70 border-y border-slate-800/60 relative flex items-center">
              <span className="absolute left-2 text-[10px] text-cyan-400 font-mono pointer-events-none z-10">
                VIDEO
              </span>
              {videoClips.map((clip) => {
                const left = clip.startTime * zoom;
                const width = Math.max(40, clip.duration * zoom);
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id, 'video');
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute h-14 rounded-lg overflow-hidden flex flex-col justify-between p-1.5 cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-[#192336] border-slate-700/80 hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-200">
                      <span className="truncate">{clip.name}</span>
                      <span className="text-[9px] font-mono text-cyan-300 ml-1">
                        {clip.speed !== 1 && `${clip.speed}x · `}{clip.duration.toFixed(1)}s
                      </span>
                    </div>

                    {/* Transition badge if present */}
                    {clip.transitionIn !== 'none' && (
                      <span className="text-[9px] bg-cyan-900/60 text-cyan-300 px-1 rounded w-fit">
                        ⚡ {clip.transitionIn}
                      </span>
                    )}

                    {/* Keyframe Diamond Indicators on Video Clip */}
                    {clip.keyframes && clip.keyframes.length > 0 && (
                      <div className="absolute inset-x-0 bottom-2.5 h-2 pointer-events-none">
                        {clip.keyframes.map((kf) => (
                          <div
                            key={kf.id}
                            style={{ left: `${(kf.timeOffset / clip.duration) * 100}%` }}
                            className="absolute -translate-x-1/2 w-2 h-2 bg-amber-400 transform rotate-45 shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                          />
                        ))}
                      </div>
                    )}

                    {/* Subtle clip film strip effect */}
                    <div className="h-1.5 w-full bg-slate-800/80 rounded flex gap-0.5 overflow-hidden">
                      <div className="flex-1 bg-cyan-500/30" />
                      <div className="flex-1 bg-cyan-500/20" />
                      <div className="flex-1 bg-cyan-500/30" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Track 4: Audio / Music Track */}
            <div className="h-10 bg-[#101624]/50 border-y border-slate-800/40 relative flex items-center">
              <span className="absolute left-2 text-[10px] text-emerald-400 font-mono pointer-events-none z-10">
                AUDIO
              </span>
              {audioClips.map((clip) => {
                const left = clip.startTime * zoom;
                const width = Math.max(30, clip.duration * zoom);
                const isSelected = selectedClipId === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id, 'audio');
                    }}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    className={`absolute h-8 rounded px-2 flex flex-col justify-between py-1 text-xs cursor-pointer transition-all border overflow-hidden ${
                      isSelected
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200 shadow-sm'
                        : 'bg-[#15232d] border-emerald-900/60 text-slate-200 hover:border-emerald-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium text-emerald-300 w-full z-10">
                      <span className="truncate">🎵 {clip.name}</span>
                      <span className="text-[9px] font-mono text-emerald-400 ml-1">{clip.duration.toFixed(1)}s</span>
                    </div>

                    {/* C++ Audio Waveform Bars Visualization */}
                    <div className="flex items-end gap-0.5 h-2.5 w-full opacity-60">
                      {waveformBars.length > 0 ? (
                        waveformBars.map((val, idx) => (
                          <div
                            key={idx}
                            className="flex-1 bg-emerald-400 rounded-t-sm"
                            style={{ height: `${Math.max(15, Math.min(100, val * 1200))}%` }}
                          />
                        ))
                      ) : (
                        <div className="w-full h-1 bg-emerald-500/30 rounded" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
