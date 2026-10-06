import React, { useState, useEffect } from 'react';
import { MediaDrawer } from './MediaDrawer';
import { VideoCanvas } from './VideoCanvas';
import { Timeline } from './Timeline';
import { ClipInspector } from './ClipInspector';
import {
  MediaItem,
  VideoClip,
  TextClip,
  OverlayClip,
  AudioClip,
  AspectRatioType,
  TextStylePreset,
  TransitionType,
} from '../../types/editor';

interface VideoEditorProps {
  aspectRatio: AspectRatioType;
  videoClips: VideoClip[];
  setVideoClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  textClips: TextClip[];
  setTextClips: React.Dispatch<React.SetStateAction<TextClip[]>>;
  overlayClips: OverlayClip[];
  setOverlayClips: React.Dispatch<React.SetStateAction<OverlayClip[]>>;
  audioClips: AudioClip[];
  setAudioClips: React.Dispatch<React.SetStateAction<AudioClip[]>>;
  onSnapToThumbnail: (frameDataUrl: string) => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  aspectRatio,
  videoClips,
  setVideoClips,
  textClips,
  setTextClips,
  overlayClips,
  setOverlayClips,
  audioClips,
  setAudioClips,
  onSnapToThumbnail,
}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedClipType, setSelectedClipType] = useState<'video' | 'text' | 'overlay' | 'audio' | null>(null);

  // Calculate total timeline duration based on maximum end of all clips
  const totalDuration = Math.max(
    5,
    ...videoClips.map((c) => c.startTime + c.duration),
    ...textClips.map((c) => c.startTime + c.duration),
    ...overlayClips.map((c) => c.startTime + c.duration),
    ...audioClips.map((c) => c.startTime + c.duration)
  );

  // Playback timer loop
  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      const interval = 1000 / 30; // 30 fps
      timer = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1 / 30;
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalDuration]);

  // Keyboard shortcut: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'KeyS') {
        handleSplitClip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Adding video clip to timeline
  const handleAddVideoClip = (media: MediaItem, startTime?: number) => {
    const nextStart = videoClips.length > 0 ? videoClips[videoClips.length - 1].startTime + videoClips[videoClips.length - 1].duration : 0;
    const clipDur = media.duration || 5;

    const newClip: VideoClip = {
      id: `vid-${Date.now()}`,
      mediaId: media.id,
      name: media.name,
      url: media.url,
      path: media.path,
      startTime: startTime ?? nextStart,
      inPoint: 0,
      outPoint: clipDur,
      duration: clipDur,
      speed: 1.0,
      volume: 1.0,
      opacity: 1.0,
      filter: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
        lut: 'normal',
      },
      transitionIn: 'none',
      transitionDuration: 0.5,
    };

    setVideoClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
    setSelectedClipType('video');
  };

  const handleMoveClipPosition = (id: string, startTime: number) => {
    setVideoClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, startTime } : clip))
    );
    setTextClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, startTime } : clip))
    );
    setOverlayClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, startTime } : clip))
    );
    setAudioClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, startTime } : clip))
    );
  };

  // Adding text clip
  const handleAddTextClip = (preset: TextStylePreset) => {
    const defaultTexts: Record<TextStylePreset, string> = {
      'bold-impact': 'ATTENTION HOOK',
      'neon-glow': 'CYBER WAVE',
      'cinema-serif': 'EPISODE 01',
      'typewriter': 'TOP SECRET INTEL',
      'subtitle-box': 'This changes everything...',
      'gradient-pop': 'WATCH TILL END',
    };

    const newClip: TextClip = {
      id: `txt-${Date.now()}`,
      text: defaultTexts[preset] || 'New Title',
      startTime: currentTime,
      duration: 3.0,
      x: 50,
      y: preset === 'subtitle-box' ? 82 : 50,
      fontSize: preset === 'subtitle-box' ? 24 : 42,
      fontFamily: preset === 'cinema-serif' ? 'serif' : 'Plus Jakarta Sans',
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: preset === 'bold-impact' ? 4 : 0,
      stylePreset: preset,
    };

    setTextClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
    setSelectedClipType('text');
  };

  // Adding audio clip
  const handleAddAudioClip = (media: MediaItem) => {
    const newAudio: AudioClip = {
      id: `aud-${Date.now()}`,
      mediaId: media.id,
      name: media.name,
      url: media.url,
      startTime: currentTime,
      inPoint: 0,
      duration: media.duration || 5,
      volume: 0.8,
      category: media.name.toLowerCase().includes('whoosh') ? 'sfx' : 'music',
    };
    setAudioClips((prev) => [...prev, newAudio]);
    setSelectedClipId(newAudio.id);
    setSelectedClipType('audio');
  };

  // Adding sticker
  const handleAddSticker = (symbol: string) => {
    const newOverlay: OverlayClip = {
      id: `ov-${Date.now()}`,
      type: 'sticker',
      symbol,
      startTime: currentTime,
      duration: 3.0,
      x: 50,
      y: 50,
      scale: 1.2,
      rotation: 0,
      opacity: 1.0,
    };
    setOverlayClips((prev) => [...prev, newOverlay]);
    setSelectedClipId(newOverlay.id);
    setSelectedClipType('overlay');
  };

  // Split clip at playhead
  const handleSplitClip = () => {
    const targetVideo = videoClips.find(
      (c) => currentTime > c.startTime + 0.1 && currentTime < c.startTime + c.duration - 0.1
    );
    if (!targetVideo) return;

    const splitOffset = currentTime - targetVideo.startTime;
    const mediaSplitPoint = targetVideo.inPoint + splitOffset * targetVideo.speed;

    const clip1: VideoClip = {
      ...targetVideo,
      outPoint: mediaSplitPoint,
      duration: splitOffset,
    };

    const clip2: VideoClip = {
      ...targetVideo,
      id: `vid-${Date.now()}`,
      startTime: currentTime,
      inPoint: mediaSplitPoint,
      duration: targetVideo.duration - splitOffset,
    };

    setVideoClips((prev) =>
      prev.flatMap((c) => (c.id === targetVideo.id ? [clip1, clip2] : [c]))
    );
    setSelectedClipId(clip2.id);
  };

  // C++ Auto Scene Detection Split
  const handleCppAutoSplit = (cuts: number[]) => {
    if (!cuts || cuts.length === 0) return;
    const targetVideo = videoClips.find((c) => c.id === selectedClipId) || videoClips[0];
    if (!targetVideo) return;

    // Filter cuts that fall strictly within the clip duration
    const validCuts = cuts.filter((c) => c > 0.5 && c < targetVideo.duration - 0.5).sort((a, b) => a - b);
    if (validCuts.length === 0) return;

    let currentStart = targetVideo.startTime;
    let currentIn = targetVideo.inPoint;
    const newSegments: VideoClip[] = [];

    const cutTimesWithBounds = [0, ...validCuts, targetVideo.duration];

    for (let i = 0; i < cutTimesWithBounds.length - 1; i++) {
      const segStart = cutTimesWithBounds[i];
      const segEnd = cutTimesWithBounds[i + 1];
      const segDur = segEnd - segStart;

      newSegments.push({
        ...targetVideo,
        id: `vid-${Date.now()}-${i}`,
        startTime: currentStart,
        inPoint: currentIn,
        outPoint: currentIn + segDur * targetVideo.speed,
        duration: segDur,
        transitionIn: i > 0 ? 'crossfade' : targetVideo.transitionIn,
      });

      currentStart += segDur;
      currentIn += segDur * targetVideo.speed;
    }

    setVideoClips((prev) =>
      prev.flatMap((c) => (c.id === targetVideo.id ? newSegments : [c]))
    );
    if (newSegments.length > 0) {
      setSelectedClipId(newSegments[0].id);
    }
  };

  // Delete clip
  const handleDeleteClip = (id: string) => {
    setVideoClips((prev) => prev.filter((c) => c.id !== id));
    setTextClips((prev) => prev.filter((c) => c.id !== id));
    setOverlayClips((prev) => prev.filter((c) => c.id !== id));
    setAudioClips((prev) => prev.filter((c) => c.id !== id));
    if (selectedClipId === id) {
      setSelectedClipId(null);
      setSelectedClipType(null);
    }
  };

  // Duplicate clip
  const handleDuplicateClip = (id: string) => {
    const vid = videoClips.find((c) => c.id === id);
    if (vid) {
      const cloned: VideoClip = {
        ...vid,
        id: `vid-${Date.now()}`,
        startTime: vid.startTime + vid.duration,
      };
      setVideoClips((prev) => [...prev, cloned]);
      setSelectedClipId(cloned.id);
      return;
    }
    const txt = textClips.find((c) => c.id === id);
    if (txt) {
      const cloned: TextClip = {
        ...txt,
        id: `txt-${Date.now()}`,
        startTime: txt.startTime + txt.duration,
      };
      setTextClips((prev) => [...prev, cloned]);
      setSelectedClipId(cloned.id);
      return;
    }
  };

  // Apply filter to selected video clip
  const handleApplyFilter = (lut: any) => {
    if (selectedClipId && selectedClipType === 'video') {
      setVideoClips((prev) =>
        prev.map((c) =>
          c.id === selectedClipId ? { ...c, filter: { ...c.filter, lut } } : c
        )
      );
    }
  };

  // Apply transition to selected video clip
  const handleApplyTransition = (transitionIn: TransitionType) => {
    if (selectedClipId && selectedClipType === 'video') {
      setVideoClips((prev) =>
        prev.map((c) => (c.id === selectedClipId ? { ...c, transitionIn } : c))
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top Workspace: Left Drawer + Center Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        <MediaDrawer
          onAddVideoClip={handleAddVideoClip}
          onAddTextClip={handleAddTextClip}
          onAddAudioClip={handleAddAudioClip}
          onAddSticker={handleAddSticker}
          onApplyFilterToSelected={handleApplyFilter}
          onApplyTransitionToSelected={handleApplyTransition}
        />

        <VideoCanvas
          aspectRatio={aspectRatio}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSeek={(t) => setCurrentTime(t)}
          videoClips={videoClips}
          textClips={textClips}
          overlayClips={overlayClips}
          onSnapToThumbnail={onSnapToThumbnail}
        />

        <ClipInspector
          selectedClipId={selectedClipId}
          selectedClipType={selectedClipType}
          currentTime={currentTime}
          onSeekTimeline={(t) => setCurrentTime(t)}
          videoClips={videoClips}
          textClips={textClips}
          overlayClips={overlayClips}
          audioClips={audioClips}
          onUpdateVideoClip={(id, updates) =>
            setVideoClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
          }
          onUpdateTextClip={(id, updates) =>
            setTextClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
          }
          onUpdateOverlayClip={(id, updates) =>
            setOverlayClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
          }
          onUpdateAudioClip={(id, updates) =>
            setAudioClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
          }
          onClose={() => {
            setSelectedClipId(null);
            setSelectedClipType(null);
          }}
          onDeleteClip={handleDeleteClip}
        />
      </div>

      {/* Bottom Timeline */}
      <Timeline
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSeek={(t) => setCurrentTime(t)}
        videoClips={videoClips}
        textClips={textClips}
        overlayClips={overlayClips}
        audioClips={audioClips}
        selectedClipId={selectedClipId}
        onSelectClip={(id, type) => {
          setSelectedClipId(id);
          setSelectedClipType(type);
        }}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onUpdateClipDuration={() => {}}
        onMoveClipPosition={handleMoveClipPosition}
        onDropVideoClip={handleAddVideoClip}
        onCppAutoSplit={handleCppAutoSplit}
      />
    </div>
  );
};
