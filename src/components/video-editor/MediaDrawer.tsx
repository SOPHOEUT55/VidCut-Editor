import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderOpen,
  Music,
  Type,
  Wand2,
  Sparkles,
  Camera,
  Smile,
  Plus,
  Play,
  Volume2,
} from 'lucide-react';
import { MediaItem, TextStylePreset, TransitionType } from '../../types/editor';

interface MediaDrawerProps {
  onAddVideoClip: (media: MediaItem, startTime?: number) => void;
  onAddTextClip: (preset: TextStylePreset) => void;
  onAddAudioClip: (media: MediaItem) => void;
  onAddSticker: (symbol: string) => void;
  onApplyFilterToSelected: (lut: any) => void;
  onApplyTransitionToSelected: (trans: TransitionType) => void;
}

export const MediaDrawer: React.FC<MediaDrawerProps> = ({
  onAddVideoClip,
  onAddTextClip,
  onAddAudioClip,
  onAddSticker,
  onApplyFilterToSelected,
  onApplyTransitionToSelected,
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'audio' | 'text' | 'filters' | 'transitions' | 'stickers' | 'record'>('media');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample Media Library
  const sampleVideos: MediaItem[] = [
    {
      id: 'samp-nature',
      name: 'Misty Alpine Sunrise (16:9)',
      type: 'video',
      url: '/samples/sample_countdown.mp4',
      duration: 5.0,
      aspectRatio: '16:9',
      thumbnail: '/src/assets/images/cinematic_nature_clip_1791202091447.jpg',
    },
    {
      id: 'samp-cinematic',
      name: 'SMPTE Studio Sequence (16:9)',
      type: 'video',
      url: '/samples/sample_cinematic.mp4',
      duration: 6.0,
      aspectRatio: '16:9',
      thumbnail: '/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg',
    },
    {
      id: 'samp-reel',
      name: 'Creator Mobile Reel (9:16)',
      type: 'video',
      url: '/samples/sample_vertical_reel.mp4',
      duration: 5.0,
      aspectRatio: '9:16',
      thumbnail: '/src/assets/images/vertical_vlog_clip_1791202104717.jpg',
    },
  ];

  const sampleAudios: MediaItem[] = [
    {
      id: 'aud-synth',
      name: 'Cyber Synthwave Chill',
      type: 'audio',
      url: '/samples/music_synth_chill.mp3',
      duration: 10.0,
    },
    {
      id: 'aud-whoosh',
      name: 'Cinematic Whoosh Swoosh',
      type: 'audio',
      url: '/samples/sfx_whoosh.mp3',
      duration: 1.0,
    },
  ];

  const textPresets: Array<{ id: TextStylePreset; label: string; preview: string; style: string }> = [
    { id: 'bold-impact', label: 'Bold Impact', preview: 'HEADLINE', style: 'font-black tracking-wider text-amber-400 drop-shadow-md' },
    { id: 'neon-glow', label: 'Cyber Neon', preview: 'NEON GLOW', style: 'font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' },
    { id: 'cinema-serif', label: 'Cinematic Serif', preview: 'CHAPTER ONE', style: 'font-serif tracking-widest text-slate-100' },
    { id: 'typewriter', label: 'Retro Monospace', preview: '> RECORDING', style: 'font-mono text-emerald-400' },
    { id: 'subtitle-box', label: 'CapCut Caption', preview: 'Auto Subtitle', style: 'font-semibold text-white bg-black/80 px-2 py-0.5 rounded' },
    { id: 'gradient-pop', label: 'Gradient Pop', preview: 'VIRAL HOOK', style: 'font-extrabold text-pink-400' },
  ];

  const stickers = [
    '🔥', '✨', '⚡', '🚀', '🎯', '💯', '💥', '🔔', '👍', '👀', '🎬', '🌟', '💎', '🎉', '🏆', '🛑'
  ];

  const filters = [
    { id: 'normal', name: 'Original Normal', desc: 'No color grade' },
    { id: 'cyberpunk', name: 'Cyberpunk Teal & Orange', desc: 'High saturation teal-amber' },
    { id: 'vintage', name: 'Vintage 90s Film', desc: 'Warm nostalgic sepia wash' },
    { id: 'cinematic', name: 'Cinematic Movie LUT', desc: 'Rich contrast & balanced warmth' },
    { id: 'noir', name: 'Film Noir Black & White', desc: 'Monochrome dramatic shadows' },
    { id: 'warm', name: 'Golden Hour Glow', desc: 'Soft sunlit highlights' },
  ];

  const transitions: Array<{ id: TransitionType; name: string }> = [
    { id: 'none', name: 'Cut (None)' },
    { id: 'fade_black', name: 'Fade from Black' },
    { id: 'crossfade', name: 'Cross Dissolve' },
    { id: 'slide_left', name: 'Slide Left' },
    { id: 'slide_right', name: 'Slide Right' },
    { id: 'zoom_in', name: 'Zoom In Punch' },
    { id: 'zoom_out', name: 'Zoom Out Glide' },
  ];

  // Handle local user upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.file) {
        const item: MediaItem = {
          id: data.file.id,
          name: data.file.name,
          type: data.file.mimeType.startsWith('audio') ? 'audio' : 'video',
          url: data.file.url,
          path: data.file.path,
          duration: data.file.duration || 5,
          width: data.file.width,
          height: data.file.height,
          fps: data.file.fps,
        };
        if (item.type === 'audio') {
          onAddAudioClip(item);
        } else {
          onAddVideoClip(item);
        }
      }
    } catch (err) {
      console.warn('Backend upload fallback to local ObjectURL:', err);
      const objUrl = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const fallbackItem: MediaItem = {
        id: `local-${Date.now()}`,
        name: file.name,
        type: isAudio ? 'audio' : 'video',
        url: objUrl,
        duration: 5.0,
      };
      if (isAudio) onAddAudioClip(fallbackItem);
      else onAddVideoClip(fallbackItem);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-80 bg-[#0f1523] border-r border-slate-800/80 flex flex-col h-full shrink-0 select-none">
      {/* Category Icons Tabs */}
      <div className="flex items-center justify-around border-b border-slate-800/80 bg-[#0c101b] p-1.5 shrink-0">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === 'media' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Media Library & Uploads"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Media</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === 'audio' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Background Music & SFX"
        >
          <Music className="w-4 h-4" />
          <span>Audio</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === 'text' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Animated Titles & Text"
        >
          <Type className="w-4 h-4" />
          <span>Text</span>
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === 'filters' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Color LUTs & Effects"
        >
          <Wand2 className="w-4 h-4" />
          <span>Effects</span>
        </button>

        <button
          onClick={() => setActiveTab('transitions')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === 'transitions' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Transitions"
        >
          <Sparkles className="w-4 h-4" />
          <span>Transitions</span>
        </button>

        <button
          onClick={() => setActiveTab('stickers')}
          className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
            activeTab === 'stickers' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Stickers & Overlays"
        >
          <Smile className="w-4 h-4" />
          <span>Stickers</span>
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="space-y-3">
            {/* Upload Area */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-gradient-to-b from-[#1b2333] to-[#141b29] hover:from-[#212b3e] hover:to-[#182133] border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 transition-all shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Processing File...' : 'Upload Video or Audio'}</span>
              </button>
            </div>

            {/* Curated Sample Clips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Ready Sample Videos</span>
                <span className="text-[11px] text-slate-500">Drag to place · + to append</span>
              </div>
              <div className="space-y-2">
                {sampleVideos.map((video) => (
                  <div
                    key={video.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-vidcut-media', JSON.stringify(video));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="group flex items-center gap-2.5 p-2 bg-[#141b27] hover:bg-[#1a2333] border border-slate-800 rounded-lg transition-colors cursor-pointer"
                    onClick={() => onAddVideoClip(video)}
                    title="Drag onto the timeline to choose a position, or click to append"
                  >
                    <div className="w-16 h-10 bg-slate-900 rounded overflow-hidden relative shrink-0">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cyan-950/40 text-cyan-400">
                          <Play className="w-4 h-4" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] font-mono px-1 rounded text-white">
                        {video.duration}s
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{video.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{video.aspectRatio} · 30fps</p>
                    </div>

                    <button
                      className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors"
                      title="Add to timeline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddVideoClip(video);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300">Royalty-Free Tracks & SFX</span>
            <div className="space-y-2">
              {sampleAudios.map((audio) => (
                <div
                  key={audio.id}
                  className="group flex items-center gap-2.5 p-2.5 bg-[#141b27] hover:bg-[#1a2333] border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  onClick={() => onAddAudioClip(audio)}
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{audio.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{audio.duration}s duration</p>
                  </div>
                  <button className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300">Viral Animated Text Presets</span>
            <div className="grid grid-cols-1 gap-2">
              {textPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => onAddTextClip(preset.id)}
                  className="group p-3 bg-[#141b27] hover:bg-[#1a2333] border border-slate-800 rounded-lg transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">{preset.label}</span>
                    <span className={`text-sm ${preset.style}`}>{preset.preview}</span>
                  </div>
                  <button className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILTERS & EFFECTS TAB */}
        {activeTab === 'filters' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300">Color Grading & Cinematic LUTs</span>
            <p className="text-[11px] text-slate-400">Select any video clip in the timeline, then click a LUT to apply.</p>
            <div className="space-y-2">
              {filters.map((f) => (
                <div
                  key={f.id}
                  onClick={() => onApplyFilterToSelected(f.id)}
                  className="p-2.5 bg-[#141b27] hover:bg-[#1a2333] border border-slate-800 hover:border-cyan-500/50 rounded-lg transition-all cursor-pointer"
                >
                  <p className="text-xs font-semibold text-slate-200">{f.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSITIONS TAB */}
        {activeTab === 'transitions' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300">Clip Transitions</span>
            <p className="text-[11px] text-slate-400">Click a transition to apply to the selected clip.</p>
            <div className="grid grid-cols-2 gap-2">
              {transitions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onApplyTransitionToSelected(t.id)}
                  className="p-2.5 bg-[#141b27] hover:bg-[#1a2333] border border-slate-800 hover:border-cyan-500/50 rounded-lg text-left transition-all"
                >
                  <span className="text-xs font-medium text-slate-200 block truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STICKERS TAB */}
        {activeTab === 'stickers' && (
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300">Stickers & Call-to-Actions</span>
            <div className="grid grid-cols-4 gap-2">
              {stickers.map((sym, idx) => (
                <button
                  key={idx}
                  onClick={() => onAddSticker(sym)}
                  className="h-12 flex items-center justify-center text-2xl bg-[#141b27] hover:bg-[#1e283c] border border-slate-800 rounded-lg transition-transform hover:scale-110"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
