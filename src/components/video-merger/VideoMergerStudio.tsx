import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Download,
  Play,
  Film,
  Music,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { MediaItem, TransitionType } from '../../types/editor';
import { exportViaPythonEngine, triggerDownload } from '../../utils/mediaExporter';

interface MergerClipItem {
  id: string;
  name: string;
  url: string;
  path?: string;
  thumbnail?: string;
  duration: number;
  startTrim: number;
  endTrim: number;
  transitionAfter: TransitionType;
}

export const VideoMergerStudio: React.FC = () => {
  const [clips, setClips] = useState<MergerClipItem[]>([
    {
      id: 'm1',
      name: 'Misty Alpine Mountains',
      url: '/samples/sample_countdown.mp4',
      thumbnail: '/src/assets/images/cinematic_nature_clip_1791202091447.jpg',
      duration: 5.0,
      startTrim: 0,
      endTrim: 5.0,
      transitionAfter: 'crossfade',
    },
    {
      id: 'm2',
      name: 'SMPTE Cinematic Sequence',
      url: '/samples/sample_cinematic.mp4',
      thumbnail: '/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg',
      duration: 6.0,
      startTrim: 0,
      endTrim: 6.0,
      transitionAfter: 'none',
    },
  ]);

  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm' | 'gif' | 'mov'>('mp4');
  const [resolution, setResolution] = useState<'1280x720' | '1920x1080' | '720x1280'>('1280x720');
  const [fps, setFps] = useState<number>(30);
  const [bgAudio, setBgAudio] = useState<string>('/samples/music_synth_chill.mp3');
  const [includeMusic, setIncludeMusic] = useState<boolean>(true);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add preset sample clip
  const handleAddSampleClip = (name: string, url: string, thumb: string, duration: number) => {
    const newItem: MergerClipItem = {
      id: `merge-${Date.now()}`,
      name,
      url,
      thumbnail: thumb,
      duration,
      startTrim: 0,
      endTrim: duration,
      transitionAfter: 'none',
    };
    setClips((prev) => [...prev, newItem]);
  };

  // Reordering clips
  const moveClip = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clips.length) return;
    const updated = [...clips];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setClips(updated);
  };

  const removeClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  // Calculate total merged duration
  const totalMergedDuration = clips.reduce((acc, c) => acc + (c.endTrim - c.startTrim), 0);

  // Trigger merge via Python FFmpeg backend
  const handleExecuteMerge = async () => {
    if (clips.length < 2) {
      setErrorMessage('Please add at least 2 video clips to merge.');
      return;
    }

    setIsMerging(true);
    setErrorMessage(null);
    setStatusMessage('Python FFmpeg engine initializing streams and filter graphs...');

    try {
      const payloadClips = clips.map((c) => ({
        url: c.url,
        path: c.path,
        start: c.startTrim,
        duration: c.endTrim - c.startTrim,
        speed: 1.0,
        volume: 1.0,
      }));

      const options = {
        format: outputFormat,
        resolution,
        fps,
        audioPath: includeMusic ? bgAudio : undefined,
        audioVolume: 0.8,
      };

      const result = await exportViaPythonEngine(payloadClips, options);
      if (result.success && result.url) {
        setMergedVideoUrl(result.url);
        setStatusMessage('Videos successfully merged and encoded with Python FFmpeg!');
      } else {
        throw new Error(result.error || 'Merging failed');
      }
    } catch (err: any) {
      console.error('Merge error:', err);
      setErrorMessage(err.message || 'Error occurred during video merging');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 p-6 overflow-y-auto select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Multi-Video Merger Studio
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Combine multiple video clips into one seamless video with custom transitions, audio mix, and Python FFmpeg rendering.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExecuteMerge}
              disabled={isMerging || clips.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging with Python...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Merge {clips.length} Videos</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status / Error Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-xl flex items-center gap-2.5 text-xs text-cyan-300">
            <CheckCircle className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Main Grid: Left Clip Sequence, Right Output Settings & Result */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Clips List (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Sequence Order ({clips.length} clips · {totalMergedDuration.toFixed(1)}s total)
              </span>

              {/* Quick Add Samples */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Add Sample:</span>
                <button
                  onClick={() =>
                    handleAddSampleClip(
                      'Alpine Mountains',
                      '/samples/sample_countdown.mp4',
                      '/src/assets/images/cinematic_nature_clip_1791202091447.jpg',
                      5.0
                    )
                  }
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  + Alpine
                </button>
                <button
                  onClick={() =>
                    handleAddSampleClip(
                      'SMPTE Studio',
                      '/samples/sample_cinematic.mp4',
                      '/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg',
                      6.0
                    )
                  }
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  + Studio
                </button>
                <button
                  onClick={() =>
                    handleAddSampleClip(
                      'Mobile Reel 9:16',
                      '/samples/sample_vertical_reel.mp4',
                      '/src/assets/images/vertical_vlog_clip_1791202104717.jpg',
                      5.0
                    )
                  }
                  className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                >
                  + Reel
                </button>
              </div>
            </div>

            {/* Clips Container */}
            <div className="space-y-3">
              {clips.map((clip, index) => (
                <div
                  key={clip.id}
                  className="bg-[#121824] border border-slate-800 rounded-xl p-3.5 space-y-3 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    {/* Index badge */}
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    {/* Thumbnail */}
                    <div className="w-20 h-12 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                      {clip.thumbnail ? (
                        <img
                          src={clip.thumbnail}
                          alt={clip.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cyan-950/40 text-cyan-400">
                          <Play className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">{clip.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Duration: {(clip.endTrim - clip.startTrim).toFixed(1)}s (Raw {clip.duration}s)
                      </p>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveClip(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveClip(index, 'down')}
                        disabled={index === clips.length - 1}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeClip(clip.id)}
                        className="p-1.5 rounded text-red-400 hover:bg-red-950/40 ml-1"
                        title="Remove Clip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trim Controls for this clip */}
                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-400 block mb-1">Start Trim (s)</span>
                      <input
                        type="number"
                        min="0"
                        max={clip.endTrim - 0.5}
                        step="0.5"
                        value={clip.startTrim}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setClips((prev) =>
                            prev.map((c) => (c.id === clip.id ? { ...c, startTrim: val } : c))
                          );
                        }}
                        className="w-full bg-[#182030] border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">End Trim (s)</span>
                      <input
                        type="number"
                        min={clip.startTrim + 0.5}
                        max={clip.duration}
                        step="0.5"
                        value={clip.endTrim}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || clip.duration;
                          setClips((prev) =>
                            prev.map((c) => (c.id === clip.id ? { ...c, endTrim: val } : c))
                          );
                        }}
                        className="w-full bg-[#182030] border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Transition to Next</span>
                      <select
                        value={clip.transitionAfter}
                        onChange={(e) => {
                          const val = e.target.value as TransitionType;
                          setClips((prev) =>
                            prev.map((c) => (c.id === clip.id ? { ...c, transitionAfter: val } : c))
                          );
                        }}
                        className="w-full bg-[#182030] border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none text-[11px]"
                      >
                        <option value="none">Direct Cut</option>
                        <option value="crossfade">Cross Dissolve</option>
                        <option value="fade_black">Fade via Black</option>
                        <option value="slide_left">Slide Left</option>
                        <option value="zoom_in">Zoom In</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Output Settings & Merged Result */}
          <div className="space-y-4">
            {/* Merged Video Result Preview */}
            {mergedVideoUrl && (
              <div className="bg-[#121824] border border-cyan-500/40 rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Merged Video Output Ready
                </span>
                <video
                  src={mergedVideoUrl}
                  controls
                  className="w-full rounded-lg bg-black aspect-video object-contain"
                />
                <button
                  onClick={() => triggerDownload(mergedVideoUrl, `merged-video.${outputFormat}`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold rounded-lg text-xs hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Merged Video ({outputFormat.toUpperCase()})</span>
                </button>
              </div>
            )}

            {/* Merge Settings Card */}
            <div className="bg-[#121824] border border-slate-800 rounded-xl p-4 space-y-4">
              <span className="text-xs font-semibold text-slate-200 block">Export Format & Resolution</span>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Target Format</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['mp4', 'webm', 'gif', 'mov'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setOutputFormat(fmt)}
                      className={`py-1.5 rounded-lg text-xs font-medium border uppercase transition-colors ${
                        outputFormat === fmt
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-[#182030] border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Resolution</span>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-[#182030] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none"
                >
                  <option value="1280x720">720p HD (1280x720) - 16:9</option>
                  <option value="1920x1080">1080p Full HD (1920x1080) - 16:9</option>
                  <option value="720x1280">Vertical Reel / TikTok (720x1280) - 9:16</option>
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Frame Rate (FPS)</span>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 30, 60].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFps(f)}
                      className={`py-1 rounded-lg text-xs font-mono border ${
                        fps === f
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-[#182030] border-slate-700 text-slate-300'
                      }`}
                    >
                      {f} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Music Option */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-cyan-400" /> Add Background Music
                  </span>
                  <input
                    type="checkbox"
                    checked={includeMusic}
                    onChange={(e) => setIncludeMusic(e.target.checked)}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
                {includeMusic && (
                  <p className="text-[11px] text-slate-400">
                    Audio track <span className="text-cyan-300 font-mono">Synthwave Chill</span> will be mixed with video audio at 80% volume.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
