import React from 'react';
import {
  Video,
  Film,
  Sparkles,
  Image as ImageIcon,
  Download,
  RotateCcw,
  MonitorPlay,
  Layers,
  Cpu,
  Crown,
} from 'lucide-react';
import { EditorMode, AspectRatioType } from '../types/editor';

interface TopBarProps {
  currentMode: EditorMode;
  onSelectMode: (mode: EditorMode) => void;
  aspectRatio: AspectRatioType;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  onOpenExport: () => void;
  onOpenCppModal?: () => void;
  onResetProject: () => void;
  hasItems: boolean;
  isExpert: boolean;
  onOpenAccount: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  onSelectMode,
  aspectRatio,
  onChangeAspectRatio,
  onOpenExport,
  onOpenCppModal,
  onResetProject,
  hasItems,
  isExpert,
  onOpenAccount,
}) => {
  return (
    <header className="h-14 bg-[#0d121c] border-b border-slate-800/80 px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="flex items-center gap-2 text-white font-bold tracking-tight text-base hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Film className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <span className="font-extrabold text-white tracking-normal font-sans">
            VidCut <span className="text-cyan-400 font-semibold text-sm">Studio</span>
          </span>
        </a>
      </div>

      {/* Zone 2: Navigation modes (4 clean single-line tabs) */}
      <nav className="flex items-center bg-[#151b26] p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => onSelectMode('video-editor')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
            currentMode === 'video-editor'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Video Editor</span>
        </button>

        <button
          onClick={() => onSelectMode('video-merger')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
            currentMode === 'video-merger'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Video Merger</span>
        </button>

        <button
          onClick={() => onSelectMode('thumbnail-designer')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
            currentMode === 'thumbnail-designer'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Thumbnail Designer</span>
        </button>

        <button
          onClick={() => onSelectMode('image-editor')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
            currentMode === 'image-editor'
              ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image Editor</span>
        </button>
      </nav>

      {/* Zone 3: Primary actions & canvas aspect ratio selector */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenAccount}
          title={isExpert ? 'Manage your Expert subscription' : 'Sign in or upgrade to Expert'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
            isExpert
              ? 'text-amber-200 bg-amber-950/30 border-amber-500/30 hover:bg-amber-900/50'
              : 'text-slate-300 bg-[#151b26] border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>{isExpert ? 'Expert' : 'Account'}</span>
        </button>

        {currentMode === 'video-editor' && (
          <div className="flex items-center gap-1.5 bg-[#151b26] px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <MonitorPlay className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={aspectRatio}
              onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioType)}
              className="bg-transparent text-slate-200 text-xs font-medium outline-none cursor-pointer pr-1"
            >
              <option value="16:9" className="bg-[#151b26] text-white">16:9 (YouTube / Standard)</option>
              <option value="9:16" className="bg-[#151b26] text-white">9:16 (TikTok / Reels / Shorts)</option>
              <option value="1:1" className="bg-[#151b26] text-white">1:1 (Square / Instagram)</option>
              <option value="4:5" className="bg-[#151b26] text-white">4:5 (Portrait Feed)</option>
              <option value="21:9" className="bg-[#151b26] text-white">21:9 (Cinematic Ultrawide)</option>
            </select>
          </div>
        )}

        {onOpenCppModal && (
          <button
            onClick={onOpenCppModal}
            title="Inspect Turbo Engine & Benchmark"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[11px]">Turbo Engine</span>
          </button>
        )}

        <button
          onClick={onResetProject}
          title="Reset or Load Demo Project"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#151b26] hover:bg-slate-800 hover:text-white border border-slate-800 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all shadow-md shadow-cyan-500/20 whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
