import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  Film,
  Cpu,
  Layers,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  LockKeyhole,
} from 'lucide-react';
import { VideoClip, TextClip, OverlayClip, AudioClip, ExportSettings, AspectRatioType } from '../types/editor';
import { renderTimelineInBrowser, exportViaPythonEngine, triggerDownload } from '../utils/mediaExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: AspectRatioType;
  videoClips: VideoClip[];
  textClips: TextClip[];
  overlayClips: OverlayClip[];
  audioClips: AudioClip[];
  totalDuration: number;
  accessToken?: string;
  isExpert: boolean;
  onUpgrade: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  aspectRatio,
  videoClips,
  textClips,
  overlayClips,
  audioClips,
  totalDuration,
  accessToken,
  isExpert,
  onUpgrade,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    resolution: '720p',
    fps: 30,
    engine: 'python_ffmpeg',
    quality: 'high',
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpert && settings.resolution !== '720p') {
      setSettings((current) => ({ ...current, resolution: '720p' }));
    }
  }, [isExpert, settings.resolution]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    if (settings.resolution !== '720p' && settings.engine === 'browser_canvas') {
      setErrorMessage('Full HD exports must use the authenticated server rendering engine.');
      return;
    }
    setIsExporting(true);
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      if (settings.engine === 'python_ffmpeg') {
        setStatusText('Sending project timeline to Python FFmpeg processing engine...');
        setProgress(20);

        const payloadClips = videoClips.map((c) => ({
          url: c.url,
          path: c.path,
          start: c.inPoint,
          duration: c.duration,
          speed: c.speed,
          volume: c.volume,
        }));

        const options = {
          format: settings.format,
          resolution: settings.resolution === '4k' ? '3840x2160' : settings.resolution === '1080p' ? '1920x1080' : '1280x720',
          fps: settings.fps,
          accessToken,
        };

        const result = await exportViaPythonEngine(payloadClips, options);
        setProgress(100);
        setStatusText('Render complete via Python FFmpeg!');
        if (result.url) {
          setDownloadUrl(result.url);
          triggerDownload(result.url, `capcut-export.${settings.format}`);
        }
      } else {
        // Browser Canvas Engine
        setStatusText('Initialising in-browser compositor stream...');
        const blob = await renderTimelineInBrowser(
          videoClips,
          textClips,
          overlayClips,
          audioClips,
          totalDuration,
          aspectRatio,
          settings,
          (prog, text) => {
            setProgress(prog);
            setStatusText(text);
          }
        );

        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        triggerDownload(url, `capcut-export.${settings.format === 'gif' ? 'gif' : 'webm'}`);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage(err.message || 'Export error encountered');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-[#0f1624] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0b0f19]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Export Video Project
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Format Selector */}
          <div>
            <span className="text-slate-400 font-medium block mb-2">Video & Audio Format</span>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'mp4', label: 'MP4', sub: 'H.264 / AAC' },
                { id: 'webm', label: 'WebM', sub: 'VP9' },
                { id: 'gif', label: 'GIF', sub: 'Animated' },
                { id: 'mov', label: 'MOV', sub: 'Pro' },
                { id: 'mp3', label: 'MP3', sub: 'Audio Only' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSettings({ ...settings, format: fmt.id as any })}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.format === fmt.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-sm'
                      : 'bg-[#151c2a] border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xs block font-bold">{fmt.label}</span>
                  <span className="text-[9px] opacity-75 block mt-0.5">{fmt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution & FPS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 font-medium block mb-1.5">Resolution</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['720p', '1080p', '4k'] as const).map((res) => {
                  const requiresExpert = res !== '720p' && !isExpert;
                  return (
                  <button
                    key={res}
                    onClick={() => {
                      if (requiresExpert) {
                        onUpgrade();
                        return;
                      }
                      setSettings({
                        ...settings,
                        resolution: res,
                        engine: res === '720p' ? settings.engine : 'python_ffmpeg',
                      });
                    }}
                    aria-label={requiresExpert ? `${res.toUpperCase()} requires Expert subscription` : res.toUpperCase()}
                    className={`py-2 rounded-lg border text-center font-mono ${
                      settings.resolution === res
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : requiresExpert
                          ? 'bg-[#151c2a] border-amber-700/60 text-amber-200 hover:border-amber-500'
                          : 'bg-[#151c2a] border-slate-700 text-slate-200'
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      {res.toUpperCase()}
                      {requiresExpert && <LockKeyhole className="h-3 w-3" />}
                    </span>
                  </button>
                  );
                })}
              </div>
              {!isExpert && (
                <button
                  onClick={onUpgrade}
                  className="mt-2 text-[10px] font-medium text-amber-300 hover:text-amber-200"
                >
                  Upgrade to Expert for Full HD export · $4.99/month
                </button>
              )}
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1.5">Frame Rate</span>
              <div className="grid grid-cols-3 gap-1.5">
                {([24, 30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setSettings({ ...settings, fps })}
                    className={`py-2 rounded-lg border text-center font-mono ${
                      settings.fps === fps
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-[#151c2a] border-slate-700 text-slate-200'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Processing Engine (Python vs Browser) */}
          <div>
            <span className="text-slate-400 font-medium block mb-2">Rendering Engine</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({ ...settings, engine: 'python_ffmpeg' })}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  settings.engine === 'python_ffmpeg'
                    ? 'bg-cyan-950/40 border-cyan-400 text-white'
                    : 'bg-[#151c2a] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className={`w-4 h-4 mt-0.5 ${settings.engine === 'python_ffmpeg' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div>
                  <span className="font-semibold text-xs block text-slate-200">Fast Export</span>
                </div>
              </button>

              <button
                onClick={() => setSettings({ ...settings, engine: 'browser_canvas' })}
                disabled={settings.resolution !== '720p'}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  settings.engine === 'browser_canvas'
                    ? 'bg-cyan-950/40 border-cyan-400 text-white'
                    : 'bg-[#151c2a] border-slate-800 text-slate-400 hover:text-slate-200'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Sparkles className={`w-4 h-4 mt-0.5 ${settings.engine === 'browser_canvas' ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div>
                  <span className="font-semibold text-xs block text-slate-200">Instant Browser Engine</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Real-time client-side Canvas and MediaRecorder stream.</span>
                </div>
              </button>
            </div>
            {settings.resolution !== '720p' && (
              <p className="mt-2 text-[10px] text-amber-200">
                Full HD and higher exports use server rendering to verify your Expert subscription.
              </p>
            )}
          </div>

          {/* Progress / Status feedback */}
          {isExporting && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-cyan-400 font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {statusText}
                </span>
                <span className="text-slate-300 font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Download Banner */}
          {downloadUrl && !isExporting && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Export finished successfully!</span>
              </div>
              <button
                onClick={() => triggerDownload(downloadUrl, `capcut-export.${settings.format}`)}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Download Again
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0b0f19] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Timeline duration: {totalDuration.toFixed(1)}s
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-medium text-xs transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleStartExport}
              disabled={isExporting || videoClips.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Start Export</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
