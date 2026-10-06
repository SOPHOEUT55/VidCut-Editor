export type EditorMode = 'video-editor' | 'video-merger' | 'thumbnail-designer' | 'image-editor';

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '4:5' | '21:9' | '4:3';

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  path?: string;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  thumbnail?: string;
  aspectRatio?: string;
}

export type TransitionType = 'none' | 'crossfade' | 'fade_black' | 'slide_left' | 'slide_right' | 'zoom_in' | 'zoom_out' | 'glitch';

export interface Keyframe {
  id: string;
  timeOffset: number; // in seconds relative to clip start (0 to clip.duration)
  opacity?: number;   // 0 to 1
  scale?: number;     // 0.2 to 3.0 (default 1.0)
  positionX?: number; // -50 to +50 (% offset from center)
  positionY?: number; // -50 to +50 (% offset from center)
  rotation?: number;  // -180 to 180 degrees
}

export interface VideoClip {
  id: string;
  mediaId: string;
  name: string;
  url: string;
  path?: string;
  startTime: number; // in timeline seconds
  inPoint: number;   // trim start in clip seconds
  outPoint: number;  // trim end in clip seconds
  duration: number;  // effective duration in timeline = (outPoint - inPoint) / speed
  speed: number;     // 0.25 - 2.0
  volume: number;    // 0 - 1
  opacity: number;   // 0 - 1
  scale?: number;    // base scale (default 1.0)
  positionX?: number;// base position offset X in % (default 0)
  positionY?: number;// base position offset Y in % (default 0)
  rotation?: number; // base rotation in degrees (default 0)
  keyframes?: Keyframe[]; // animated keyframes
  filter: {
    brightness: number; // 50 - 150 (100 normal)
    contrast: number;   // 50 - 150 (100 normal)
    saturation: number; // 0 - 200 (100 normal)
    sepia: number;      // 0 - 100
    blur: number;       // 0 - 10
    hueRotate: number;  // 0 - 360
    lut: 'normal' | 'cyberpunk' | 'vintage' | 'cinematic' | 'noir' | 'warm';
  };
  transitionIn: TransitionType;
  transitionDuration: number;
}

export interface OverlayClip {
  id: string;
  type: 'image' | 'sticker' | 'shape';
  url?: string;
  symbol?: string;
  startTime: number;
  duration: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  scale: number; // 0.2 - 3.0
  rotation: number; // -180 - 180
  opacity: number;
  keyframes?: Keyframe[];
}

export type TextStylePreset = 'bold-impact' | 'neon-glow' | 'cinema-serif' | 'typewriter' | 'subtitle-box' | 'gradient-pop';

export interface TextClip {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number; // percentage
  y: number; // percentage
  fontSize: number; // px
  fontFamily: string;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  stylePreset: TextStylePreset;
  rotation?: number;
  scale?: number;
  opacity?: number;
  keyframes?: Keyframe[];
}

export interface AudioClip {
  id: string;
  mediaId: string;
  name: string;
  url: string;
  startTime: number;
  inPoint: number;
  duration: number;
  volume: number;
  loop?: boolean;
  category: 'music' | 'sfx' | 'voiceover';
}

export interface ThumbnailLayer {
  id: string;
  type: 'text' | 'image' | 'badge' | 'sticker' | 'shape';
  content: string; // text content or image URL
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width?: number; // percentage or px
  height?: number;
  scale: number;
  rotation: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  shadowColor?: string;
  shadowBlur?: number;
  opacity?: number;
}

export interface ThumbnailProject {
  id: string;
  title: string;
  preset: 'youtube' | 'tiktok' | 'instagram_post' | 'instagram_story' | 'twitter' | 'facebook';
  width: number;
  height: number;
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundValue: string;
  layers: ThumbnailLayer[];
}

export interface ImageEditorProject {
  imageSrc: string;
  originalWidth: number;
  originalHeight: number;
  cropRatio: 'free' | '1:1' | '16:9' | '4:3' | '9:16';
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  adjustments: {
    brightness: number;  // -50 to 50
    contrast: number;    // -50 to 50
    saturation: number;  // -50 to 50
    temperature: number; // -50 to 50
    vignette: number;    // 0 to 100
    blur: number;        // 0 to 20
    exposure: number;    // -50 to 50
  };
  filter: 'normal' | 'vintage' | 'noir' | 'cyberpunk' | 'warm' | 'pastel';
  drawings: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'gif' | 'mov' | 'mp3' | 'png' | 'jpg' | 'webp';
  resolution: '480p' | '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  engine: 'python_ffmpeg' | 'browser_canvas';
  quality: 'standard' | 'high' | 'ultra';
}
