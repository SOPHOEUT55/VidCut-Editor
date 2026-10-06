import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sliders,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Upload,
  Pencil,
  Undo,
  Wand2,
  CheckCircle,
} from 'lucide-react';
import { triggerDownload } from '../../utils/mediaExporter';

export const ImageEditorStudio: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string>(
    '/src/assets/images/cinematic_nature_clip_1791202091447.jpg'
  );
  const [activeTab, setActiveTab] = useState<'adjust' | 'filters' | 'transform' | 'draw'>('adjust');

  // Adjustments state
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(0);
  const [vignette, setVignette] = useState<number>(0);
  const [blur, setBlur] = useState<number>(0);
  const [exposure, setExposure] = useState<number>(0);

  // Filters
  const [filterPreset, setFilterPreset] = useState<'none' | 'vintage' | 'noir' | 'cyberpunk' | 'warm' | 'pastel'>('none');

  // Transform
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '16:9' | '4:3' | '9:16'>('free');

  // Drawing
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#06b6d4');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [drawStrokes, setDrawStrokes] = useState<Array<{ points: Array<{ x: number; y: number }>; color: string; size: number }>>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Export
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom image
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setDrawStrokes([]);
      resetAdjustments();
    }
  };

  const resetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setTemperature(0);
    setVignette(0);
    setBlur(0);
    setExposure(0);
    setFilterPreset('none');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setDrawStrokes([]);
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      let w = img.width;
      let h = img.height;

      // Crop ratio adjustments if selected
      if (cropAspect === '1:1') {
        const side = Math.min(w, h);
        w = side;
        h = side;
      } else if (cropAspect === '16:9') {
        h = Math.round((w * 9) / 16);
      } else if (cropAspect === '9:16') {
        w = Math.round((h * 9) / 16);
      } else if (cropAspect === '4:3') {
        h = Math.round((w * 3) / 4);
      }

      // Handle 90/270 deg rotation canvas swap
      if (rotation % 180 !== 0) {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      // Build CSS Filter String
      const bVal = 100 + brightness + exposure;
      const cVal = 100 + contrast;
      const sVal = 100 + saturation;
      let filterStr = `brightness(${bVal}%) contrast(${cVal}%) saturate(${sVal}%)`;
      if (blur > 0) filterStr += ` blur(${blur}px)`;
      if (temperature > 0) filterStr += ` sepia(${temperature}%)`;

      if (filterPreset === 'vintage') filterStr += ' sepia(40%) contrast(110%)';
      if (filterPreset === 'noir') filterStr += ' grayscale(100%) contrast(140%)';
      if (filterPreset === 'cyberpunk') filterStr += ' hue-rotate(180deg) saturate(150%)';
      if (filterPreset === 'warm') filterStr += ' sepia(25%) brightness(105%)';
      if (filterPreset === 'pastel') filterStr += ' saturate(80%) brightness(115%)';

      ctx.filter = filterStr;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Vignette effect
      if (vignette > 0) {
        const grad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.2,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.7
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Render drawing strokes
      for (const stroke of drawStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.save();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
    };
  }, [
    imageSrc,
    brightness,
    contrast,
    saturation,
    temperature,
    vignette,
    blur,
    exposure,
    filterPreset,
    rotation,
    flipH,
    flipV,
    cropAspect,
    drawStrokes,
  ]);

  // Drawing mouse handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setDrawStrokes((prev) => [
      ...prev,
      { points: [{ x, y }], color: brushColor, size: brushSize },
    ]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setDrawStrokes((prev) => {
      const updated = [...prev];
      const currentStroke = updated[updated.length - 1];
      if (currentStroke) {
        currentStroke.points.push({ x, y });
      }
      return updated;
    });
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing) setIsDrawing(false);
  };

  // Export processed image
  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL(`image/${exportFormat}`, 0.95);
    triggerDownload(dataUrl, `edited-image.${exportFormat === 'jpeg' ? 'jpg' : exportFormat}`);
  };

  return (
    <div className="flex-1 bg-[#090d16] text-slate-100 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Top Bar for Image Studio */}
      <div className="h-12 bg-[#0e1422] border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadImage}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#182133] hover:bg-[#202b42] border border-slate-700 rounded-lg text-xs font-medium text-slate-200"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Custom Image</span>
          </button>

          <button
            onClick={resetAdjustments}
            className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
          >
            Reset All
          </button>
        </div>

        {/* Export selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Format:</span>
          {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setExportFormat(fmt)}
              className={`px-2 py-0.5 rounded text-[11px] uppercase font-mono border ${
                exportFormat === fmt
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                  : 'bg-[#182133] border-slate-700 text-slate-300'
              }`}
            >
              {fmt}
            </button>
          ))}
          <button
            onClick={handleExportImage}
            className="flex items-center gap-1.5 px-4 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors ml-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Inspector Tools */}
        <div className="w-80 bg-[#0d131f] border-r border-slate-800 flex flex-col shrink-0 text-xs">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-[#0c101b] p-1 shrink-0">
            <button
              onClick={() => setActiveTab('adjust')}
              className={`flex-1 py-1.5 text-center rounded text-[11px] font-medium ${
                activeTab === 'adjust' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Adjust
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex-1 py-1.5 text-center rounded text-[11px] font-medium ${
                activeTab === 'filters' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Filters
            </button>
            <button
              onClick={() => setActiveTab('transform')}
              className={`flex-1 py-1.5 text-center rounded text-[11px] font-medium ${
                activeTab === 'transform' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Crop
            </button>
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-1.5 text-center rounded text-[11px] font-medium ${
                activeTab === 'draw' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Draw
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ADJUST TAB */}
            {activeTab === 'adjust' && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Brightness</span>
                    <span className="font-mono text-slate-300">{brightness > 0 ? `+${brightness}` : brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Contrast</span>
                    <span className="font-mono text-slate-300">{contrast > 0 ? `+${contrast}` : contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Saturation</span>
                    <span className="font-mono text-slate-300">{saturation > 0 ? `+${saturation}` : saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Warmth / Temperature</span>
                    <span className="font-mono text-slate-300">{temperature > 0 ? `+${temperature}` : temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Vignette Depth</span>
                    <span className="font-mono text-slate-300">{vignette}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vignette}
                    onChange={(e) => setVignette(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Blur Softness</span>
                    <span className="font-mono text-slate-300">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* FILTERS TAB */}
            {activeTab === 'filters' && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'none', label: 'Normal' },
                  { id: 'vintage', label: 'Vintage 90s' },
                  { id: 'noir', label: 'Film Noir B&W' },
                  { id: 'cyberpunk', label: 'Cyberpunk' },
                  { id: 'warm', label: 'Golden Warm' },
                  { id: 'pastel', label: 'Pastel Glow' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterPreset(f.id as any)}
                    className={`p-3 rounded-lg border text-left font-medium transition-colors ${
                      filterPreset === f.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#151c2a] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* TRANSFORM TAB */}
            {activeTab === 'transform' && (
              <div className="space-y-4">
                <div>
                  <span className="text-slate-400 block mb-1.5">Crop Ratio</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['free', '1:1', '16:9', '4:3', '9:16'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setCropAspect(r)}
                        className={`py-1.5 rounded border text-xs ${
                          cropAspect === r
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                            : 'bg-[#151c2a] border-slate-700 text-slate-300'
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-slate-400 block mb-1">Rotation & Flips</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="flex flex-col items-center gap-1 p-2 bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded text-slate-200"
                    >
                      <RotateCw className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px]">+90°</span>
                    </button>
                    <button
                      onClick={() => setFlipH((prev) => !prev)}
                      className="flex flex-col items-center gap-1 p-2 bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded text-slate-200"
                    >
                      <FlipHorizontal className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px]">Flip H</span>
                    </button>
                    <button
                      onClick={() => setFlipV((prev) => !prev)}
                      className="flex flex-col items-center gap-1 p-2 bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded text-slate-200"
                    >
                      <FlipVertical className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px]">Flip V</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DRAW TAB */}
            {activeTab === 'draw' && (
              <div className="space-y-4">
                <button
                  onClick={() => setIsDrawingMode((p) => !p)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold border ${
                    isDrawingMode
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                      : 'bg-[#151c2a] border-slate-700 text-slate-200'
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  <span>{isDrawingMode ? 'Drawing Enabled (Click & Drag on Canvas)' : 'Enable Brush Mode'}</span>
                </button>

                {isDrawingMode && (
                  <>
                    <div>
                      <span className="text-slate-400 block mb-1">Brush Color</span>
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="w-full h-8 bg-transparent cursor-pointer rounded border border-slate-700"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Brush Size</span>
                        <span className="font-mono text-slate-300">{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    {drawStrokes.length > 0 && (
                      <button
                        onClick={() => setDrawStrokes((prev) => prev.slice(0, -1))}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#151c2a] hover:bg-slate-700 border border-slate-700 rounded text-slate-300"
                      >
                        <Undo className="w-3.5 h-3.5" />
                        <span>Undo Last Stroke</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas Viewport */}
        <div className="flex-1 bg-[#070b13] flex items-center justify-center p-6 overflow-hidden">
          <div className="relative max-w-4xl max-h-[80vh] border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`max-w-full max-h-[75vh] object-contain block ${
                isDrawingMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
