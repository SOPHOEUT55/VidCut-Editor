import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Type,
  Image as ImageIcon,
  Download,
  Trash2,
  Layers,
  Palette,
  Camera,
  Smile,
  Copy,
  Plus,
} from 'lucide-react';
import { ThumbnailLayer } from '../../types/editor';
import { triggerDownload } from '../../utils/mediaExporter';

interface ThumbnailDesignerProps {
  initialVideoFrame?: string | null;
}

export const ThumbnailDesigner: React.FC<ThumbnailDesignerProps> = ({ initialVideoFrame }) => {
  const [platformPreset, setPlatformPreset] = useState<'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'facebook'>('youtube');
  const [backgroundType, setBackgroundType] = useState<'image' | 'gradient' | 'color'>('image');
  const [backgroundValue, setBackgroundValue] = useState<string>(
    initialVideoFrame || '/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg'
  );
  const [layers, setLayers] = useState<ThumbnailLayer[]>([
    {
      id: 'l1',
      type: 'badge',
      content: 'VIRAL SECRET',
      x: 30,
      y: 25,
      scale: 1.1,
      rotation: -4,
      fontSize: 26,
      fontFamily: 'Plus Jakarta Sans',
      color: '#ffffff',
      backgroundColor: '#ef4444',
      opacity: 1,
    },
    {
      id: 'l2',
      type: 'text',
      content: 'DON’T MISS THIS!',
      x: 50,
      y: 48,
      scale: 1.3,
      rotation: 0,
      fontSize: 54,
      fontFamily: 'Plus Jakarta Sans',
      color: '#fbbf24',
      strokeColor: '#000000',
      strokeWidth: 6,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 16,
      opacity: 1,
    },
    {
      id: 'l3',
      type: 'sticker',
      content: '🔥',
      x: 82,
      y: 48,
      scale: 1.8,
      rotation: 12,
      opacity: 1,
    },
  ]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('l2');
  const [exportScale, setExportScale] = useState<1 | 2>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Platform dimensions
  const presetDimensions = {
    youtube: { w: 1280, h: 720, label: 'YouTube (1280x720 · 16:9)' },
    tiktok: { w: 1080, h: 1920, label: 'TikTok / Shorts / Reel (1080x1920 · 9:16)' },
    instagram: { w: 1080, h: 1080, label: 'Instagram Square (1080x1080 · 1:1)' },
    twitter: { w: 1200, h: 675, label: 'X / Twitter Card (1200x675 · 16:9)' },
    facebook: { w: 1200, h: 630, label: 'Facebook Cover (1200x630)' },
  };

  const currentDims = presetDimensions[platformPreset];

  // Templates
  const applyTemplate = (name: 'gaming' | 'podcast' | 'vlog' | 'tutorial') => {
    if (name === 'gaming') {
      setBackgroundType('image');
      setBackgroundValue('/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg');
      setLayers([
        {
          id: 't1',
          type: 'badge',
          content: 'NEW RECORD',
          x: 25,
          y: 20,
          scale: 1.0,
          rotation: -5,
          fontSize: 24,
          fontFamily: 'Plus Jakarta Sans',
          color: '#000000',
          backgroundColor: '#38bdf8',
          opacity: 1,
        },
        {
          id: 't2',
          type: 'text',
          content: '100% UNBEATABLE',
          x: 50,
          y: 50,
          scale: 1.4,
          rotation: -2,
          fontSize: 60,
          fontFamily: 'Plus Jakarta Sans',
          color: '#facc15',
          strokeColor: '#000000',
          strokeWidth: 8,
          shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 20,
          opacity: 1,
        },
        {
          id: 't3',
          type: 'sticker',
          content: '⚡',
          x: 85,
          y: 50,
          scale: 2.0,
          rotation: 15,
          opacity: 1,
        },
      ]);
    } else if (name === 'podcast') {
      setBackgroundType('image');
      setBackgroundValue('/src/assets/images/podcast_interview_bg_1791202133345.jpg');
      setLayers([
        {
          id: 'p1',
          type: 'badge',
          content: 'EPISODE 42',
          x: 20,
          y: 18,
          scale: 1.0,
          rotation: 0,
          fontSize: 20,
          fontFamily: 'Plus Jakarta Sans',
          color: '#ffffff',
          backgroundColor: '#0284c7',
          opacity: 1,
        },
        {
          id: 'p2',
          type: 'text',
          content: 'THE TRUTH ABOUT AI',
          x: 50,
          y: 45,
          scale: 1.2,
          rotation: 0,
          fontSize: 48,
          fontFamily: 'serif',
          color: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 4,
          shadowColor: 'rgba(0,0,0,0.8)',
          shadowBlur: 14,
          opacity: 1,
        },
      ]);
    } else if (name === 'vlog') {
      setBackgroundType('image');
      setBackgroundValue('/src/assets/images/cinematic_nature_clip_1791202091447.jpg');
      setLayers([
        {
          id: 'v1',
          type: 'text',
          content: 'WE LEFT EVERYTHING...',
          x: 50,
          y: 50,
          scale: 1.3,
          rotation: 0,
          fontSize: 52,
          fontFamily: 'Plus Jakarta Sans',
          color: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 6,
          shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 18,
          opacity: 1,
        },
        {
          id: 'v2',
          type: 'sticker',
          content: '😱',
          x: 85,
          y: 50,
          scale: 2.2,
          rotation: 10,
          opacity: 1,
        },
      ]);
    }
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = currentDims.w;
    const h = currentDims.h;
    canvas.width = w;
    canvas.height = h;

    // Draw background
    if (backgroundType === 'color') {
      ctx.fillStyle = backgroundValue;
      ctx.fillRect(0, 0, w, h);
      renderLayers(ctx, w, h);
    } else if (backgroundType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      renderLayers(ctx, w, h);
    } else if (backgroundType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = backgroundValue;
      img.onload = () => {
        // Draw image cover
        const scale = Math.max(w / img.width, h / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = (w - nw) / 2;
        const ny = (h - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);

        // Apply subtle vignette for contrast
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        renderLayers(ctx, w, h);
      };
      img.onerror = () => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        renderLayers(ctx, w, h);
      };
    }
  }, [platformPreset, backgroundType, backgroundValue, layers, selectedLayerId]);

  const renderLayers = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    for (const layer of layers) {
      ctx.save();
      const posX = (layer.x / 100) * w;
      const posY = (layer.y / 100) * h;
      ctx.translate(posX, posY);
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
      ctx.scale(layer.scale, layer.scale);
      ctx.globalAlpha = layer.opacity ?? 1;

      if (layer.type === 'text') {
        ctx.font = `900 ${layer.fontSize || 48}px ${layer.fontFamily || 'Plus Jakarta Sans'}, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (layer.shadowColor) {
          ctx.shadowColor = layer.shadowColor;
          ctx.shadowBlur = layer.shadowBlur || 15;
        }

        if (layer.strokeWidth && layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.strokeColor || '#000000';
          ctx.lineWidth = layer.strokeWidth;
          ctx.lineJoin = 'miter';
          ctx.strokeText(layer.content, 0, 0);
        }

        ctx.fillStyle = layer.color || '#ffffff';
        ctx.fillText(layer.content, 0, 0);
      } else if (layer.type === 'badge') {
        const text = layer.content;
        const fontSize = layer.fontSize || 24;
        ctx.font = `bold ${fontSize}px Plus Jakarta Sans, sans-serif`;
        const metrics = ctx.measureText(text);
        const padX = 18;
        const padY = 8;
        const badgeW = metrics.width + padX * 2;
        const badgeH = fontSize + padY * 2;

        ctx.fillStyle = layer.backgroundColor || '#ef4444';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 6);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
      } else if (layer.type === 'sticker') {
        ctx.font = '64px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.content, 0, 0);
      }

      ctx.restore();
    }
  };

  // Export high res thumbnail
  const handleExportThumbnail = (format: 'png' | 'jpeg' | 'webp') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (exportScale === 2) {
      // 2x Retina rendering
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width * 2;
      exportCanvas.height = canvas.height * 2;
      const expCtx = exportCanvas.getContext('2d');
      if (expCtx) {
        expCtx.scale(2, 2);
        // redraw
        renderLayers(expCtx, canvas.width, canvas.height);
        const dataUrl = exportCanvas.toDataURL(`image/${format}`, 0.95);
        triggerDownload(dataUrl, `thumbnail-${platformPreset}-4k.${format === 'jpeg' ? 'jpg' : format}`);
        return;
      }
    }

    const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
    triggerDownload(dataUrl, `thumbnail-${platformPreset}.${format === 'jpeg' ? 'jpg' : format}`);
  };

  const activeLayer = layers.find((l) => l.id === selectedLayerId);

  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Top Secondary Action Bar */}
      <div className="h-12 bg-[#0e1422] border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs text-white">Preset:</span>
          </div>
          <select
            value={platformPreset}
            onChange={(e) => setPlatformPreset(e.target.value as any)}
            className="bg-[#182133] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
          >
            <option value="youtube">YouTube (1280x720 · 16:9)</option>
            <option value="tiktok">TikTok / Shorts / Reels (1080x1920 · 9:16)</option>
            <option value="instagram">Instagram Square (1080x1080 · 1:1)</option>
            <option value="twitter">X / Twitter Card (1200x675)</option>
            <option value="facebook">Facebook Cover (1200x630)</option>
          </select>
        </div>

        {/* Templates */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Viral Templates:</span>
          <button
            onClick={() => applyTemplate('gaming')}
            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Gaming
          </button>
          <button
            onClick={() => applyTemplate('podcast')}
            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Podcast
          </button>
          <button
            onClick={() => applyTemplate('vlog')}
            className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Vlog
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <select
            value={exportScale}
            onChange={(e) => setExportScale(Number(e.target.value) as 1 | 2)}
            className="bg-[#182133] border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 outline-none"
          >
            <option value={1}>1x Standard</option>
            <option value={2}>2x 4K Retina</option>
          </select>
          <button
            onClick={() => handleExportThumbnail('png')}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Controls, Center Canvas, Right Layer List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Controls */}
        <div className="w-80 bg-[#0d131f] border-r border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 text-xs">
          {/* Background Chooser */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-300 block">Canvas Background</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setBackgroundType('image');
                  setBackgroundValue('/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg');
                }}
                className={`py-1.5 rounded border text-[11px] font-medium ${
                  backgroundType === 'image' && backgroundValue.includes('gaming')
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-[#151c2a] border-slate-700 text-slate-300'
                }`}
              >
                Cyber Arena
              </button>
              <button
                onClick={() => {
                  setBackgroundType('image');
                  setBackgroundValue('/src/assets/images/podcast_interview_bg_1791202133345.jpg');
                }}
                className={`py-1.5 rounded border text-[11px] font-medium ${
                  backgroundType === 'image' && backgroundValue.includes('podcast')
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-[#151c2a] border-slate-700 text-slate-300'
                }`}
              >
                Podcast Studio
              </button>
              <button
                onClick={() => {
                  setBackgroundType('image');
                  setBackgroundValue('/src/assets/images/cinematic_nature_clip_1791202091447.jpg');
                }}
                className={`py-1.5 rounded border text-[11px] font-medium ${
                  backgroundType === 'image' && backgroundValue.includes('nature')
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                    : 'bg-[#151c2a] border-slate-700 text-slate-300'
                }`}
              >
                Alpine Sunrise
              </button>
            </div>

            {/* Video Frame Snapshot notice if available */}
            {initialVideoFrame && (
              <button
                onClick={() => {
                  setBackgroundType('image');
                  setBackgroundValue(initialVideoFrame);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/50 rounded-lg text-cyan-300 font-medium"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Use Video Frame Snapshot</span>
              </button>
            )}
          </div>

          {/* Add Elements */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="font-semibold text-slate-300 block">Add Thumbnail Layers</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const newL: ThumbnailLayer = {
                    id: `l-${Date.now()}`,
                    type: 'text',
                    content: 'NEW HOOK',
                    x: 50,
                    y: 50,
                    scale: 1.2,
                    rotation: 0,
                    fontSize: 48,
                    color: '#ffffff',
                    strokeColor: '#000000',
                    strokeWidth: 4,
                  };
                  setLayers((prev) => [...prev, newL]);
                  setSelectedLayerId(newL.id);
                }}
                className="flex items-center justify-center gap-1.5 py-2 bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200"
              >
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Big Text</span>
              </button>

              <button
                onClick={() => {
                  const newL: ThumbnailLayer = {
                    id: `l-${Date.now()}`,
                    type: 'badge',
                    content: 'EPIC',
                    x: 50,
                    y: 30,
                    scale: 1.0,
                    rotation: -5,
                    fontSize: 24,
                    color: '#ffffff',
                    backgroundColor: '#ef4444',
                  };
                  setLayers((prev) => [...prev, newL]);
                  setSelectedLayerId(newL.id);
                }}
                className="flex items-center justify-center gap-1.5 py-2 bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Badge</span>
              </button>
            </div>

            {/* Quick Stickers */}
            <div className="grid grid-cols-6 gap-1 pt-1">
              {['🔥', '😱', '⚡', '👀', '🚨', '💯'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    const newL: ThumbnailLayer = {
                      id: `l-${Date.now()}`,
                      type: 'sticker',
                      content: emoji,
                      x: 50,
                      y: 50,
                      scale: 1.8,
                      rotation: 0,
                    };
                    setLayers((prev) => [...prev, newL]);
                    setSelectedLayerId(newL.id);
                  }}
                  className="h-9 flex items-center justify-center text-xl bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Active Layer Inspector */}
          {activeLayer && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-400">Edit Layer ({activeLayer.type})</span>
                <button
                  onClick={() => {
                    setLayers((prev) => prev.filter((l) => l.id !== activeLayer.id));
                    setSelectedLayerId(null);
                  }}
                  className="text-red-400 hover:text-red-300"
                  title="Delete layer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Content</span>
                <input
                  type="text"
                  value={activeLayer.content}
                  onChange={(e) =>
                    setLayers((prev) =>
                      prev.map((l) => (l.id === activeLayer.id ? { ...l, content: e.target.value } : l))
                    )
                  }
                  className="w-full bg-[#182133] border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Scale</span>
                  <span className="font-mono text-slate-300">{activeLayer.scale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={activeLayer.scale}
                  onChange={(e) =>
                    setLayers((prev) =>
                      prev.map((l) =>
                        l.id === activeLayer.id ? { ...l, scale: parseFloat(e.target.value) } : l
                      )
                    )
                  }
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Rotation</span>
                  <span className="font-mono text-slate-300">{activeLayer.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={activeLayer.rotation}
                  onChange={(e) =>
                    setLayers((prev) =>
                      prev.map((l) =>
                        l.id === activeLayer.id ? { ...l, rotation: parseInt(e.target.value, 10) } : l
                      )
                    )
                  }
                  className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block mb-1">Position X</span>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={activeLayer.x}
                    onChange={(e) =>
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === activeLayer.id ? { ...l, x: parseInt(e.target.value, 10) } : l
                        )
                      )
                    }
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Position Y</span>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={activeLayer.y}
                    onChange={(e) =>
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === activeLayer.id ? { ...l, y: parseInt(e.target.value, 10) } : l
                        )
                      )
                    }
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Canvas Viewport */}
        <div className="flex-1 bg-[#070b13] flex items-center justify-center p-6 overflow-hidden">
          <div className="relative max-w-4xl max-h-[80vh] border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[75vh] object-contain block"
            />
          </div>
        </div>

        {/* Right Layer Stack */}
        <div className="w-64 bg-[#0d131f] border-l border-slate-800 p-4 shrink-0 flex flex-col text-xs">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">Layer Stack ({layers.length})</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {layers.map((layer, idx) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                  selectedLayerId === layer.id
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200'
                    : 'bg-[#151c2a] border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[11px] truncate">{layer.content}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{layer.type}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayers((prev) => prev.filter((l) => l.id !== layer.id));
                  }}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
