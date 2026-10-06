/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { TopBar } from './components/TopBar';
import { VideoEditor } from './components/video-editor/VideoEditor';
import { VideoMergerStudio } from './components/video-merger/VideoMergerStudio';
import { ThumbnailDesigner } from './components/thumbnail-designer/ThumbnailDesigner';
import { ImageEditorStudio } from './components/image-editor/ImageEditorStudio';
import { ExportModal } from './components/ExportModal';
import { CppEngineModal } from './components/CppEngineModal';
import { AccountModal } from './components/AccountModal';
import { supabase } from './utils/supabase';
import {
  EditorMode,
  AspectRatioType,
  VideoClip,
  TextClip,
  OverlayClip,
  AudioClip,
} from './types/editor';

interface SubscriptionState {
  status: string;
  currentPeriodEnd: string | null;
  isExpert: boolean;
}

export default function App() {
  const [currentMode, setCurrentMode] = useState<EditorMode>('video-editor');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isCppModalOpen, setIsCppModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [capturedThumbnailFrame, setCapturedThumbnailFrame] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const isExpert = subscription?.isExpert === true;

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Could not restore Supabase session:', error);
        return;
      }
      if (isMounted) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession) setSubscription(null);
    });
    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

  const refreshSubscription = useCallback(async (): Promise<SubscriptionState | null> => {
    if (!session) {
      setSubscription(null);
      setSubscriptionError(null);
      return null;
    }
    const response = await fetch('/api/subscription', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result: SubscriptionState & { error?: string } = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Could not load subscription status.');
    }
    setSubscription(result);
    setSubscriptionError(null);
    return result;
  }, [session]);

  useEffect(() => {
    if (!session) {
      setSubscription(null);
      return;
    }
    void refreshSubscription().catch((error: unknown) => {
      console.error('Could not refresh subscription status:', error);
      setSubscription((current) => current ? { ...current, isExpert: false } : null);
      setSubscriptionError(error instanceof Error ? error.message : 'Could not load subscription status.');
    });
  }, [session, refreshSubscription]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutResult = params.get('subscription');
    if (!checkoutResult || (checkoutResult === 'success' && !session)) return;

    params.delete('subscription');
    const remainingQuery = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`
    );

    if (checkoutResult === 'cancelled') {
      setBillingNotice('Checkout was cancelled. Your account remains on the free plan.');
      setIsAccountModalOpen(true);
      return;
    }

    if (checkoutResult === 'success') {
      setIsAccountModalOpen(true);
      setBillingNotice('Payment received. Confirming your Expert subscription…');
      let isCancelled = false;
      const pollSubscription = async () => {
        for (let attempt = 0; attempt < 12 && !isCancelled; attempt += 1) {
          try {
            const latest = await refreshSubscription();
            if (latest?.isExpert) {
              setBillingNotice('Your Expert subscription is active. Full HD export is now unlocked.');
              return;
            }
          } catch (error) {
            console.error('Could not confirm the subscription yet:', error);
          }
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
        if (!isCancelled) {
          setBillingNotice('Payment received. Subscription confirmation is still processing; refresh the status shortly.');
        }
      };
      void pollSubscription();
      return () => {
        isCancelled = true;
      };
    }
  }, [session, refreshSubscription]);

  // Initial demo project state with working clips
  const [videoClips, setVideoClips] = useState<VideoClip[]>([
    {
      id: 'clip-1',
      mediaId: 'sample-countdown',
      name: 'Misty Alpine Mountains',
      url: '/samples/sample_countdown.mp4',
      startTime: 0,
      inPoint: 0,
      outPoint: 5.0,
      duration: 5.0,
      speed: 1.0,
      volume: 1.0,
      opacity: 1.0,
      filter: {
        brightness: 105,
        contrast: 110,
        saturation: 115,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
        lut: 'cinematic',
      },
      transitionIn: 'fade_black',
      transitionDuration: 0.6,
      keyframes: [
        { id: 'kf-demo-1', timeOffset: 0.0, scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
        { id: 'kf-demo-2', timeOffset: 2.5, scale: 1.25, positionX: -5, positionY: -3, opacity: 1, rotation: 0 },
        { id: 'kf-demo-3', timeOffset: 5.0, scale: 1.0, positionX: 0, positionY: 0, opacity: 1, rotation: 0 },
      ],
    },
    {
      id: 'clip-2',
      mediaId: 'sample-cinematic',
      name: 'SMPTE Studio Sequence',
      url: '/samples/sample_cinematic.mp4',
      startTime: 5.0,
      inPoint: 0,
      outPoint: 6.0,
      duration: 6.0,
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
      transitionIn: 'crossfade',
      transitionDuration: 0.8,
    },
  ]);

  const [textClips, setTextClips] = useState<TextClip[]>([
    {
      id: 'txt-1',
      text: 'CINEMATIC HORIZONS',
      startTime: 0.5,
      duration: 4.0,
      x: 50,
      y: 45,
      fontSize: 48,
      fontFamily: 'Plus Jakarta Sans',
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 4,
      stylePreset: 'bold-impact',
    },
    {
      id: 'txt-2',
      text: 'Produced with VidCut Studio',
      startTime: 5.2,
      duration: 4.0,
      x: 50,
      y: 82,
      fontSize: 22,
      fontFamily: 'Plus Jakarta Sans',
      color: '#06b6d4',
      stylePreset: 'subtitle-box',
    },
  ]);

  const [overlayClips, setOverlayClips] = useState<OverlayClip[]>([
    {
      id: 'ov-1',
      type: 'sticker',
      symbol: '🔥',
      startTime: 1.0,
      duration: 3.5,
      x: 85,
      y: 35,
      scale: 1.3,
      rotation: 8,
      opacity: 0.95,
      keyframes: [
        { id: 'kf-ov-1', timeOffset: 0.0, scale: 0.4, opacity: 0, rotation: -25 },
        { id: 'kf-ov-2', timeOffset: 0.8, scale: 1.4, opacity: 1, rotation: 12 },
        { id: 'kf-ov-3', timeOffset: 3.5, scale: 1.2, opacity: 0.95, rotation: 0 },
      ],
    },
  ]);

  const [audioClips, setAudioClips] = useState<AudioClip[]>([
    {
      id: 'aud-1',
      mediaId: 'sample-music-synth',
      name: 'Synthwave Chill Beat',
      url: '/samples/music_synth_chill.mp3',
      startTime: 0,
      inPoint: 0,
      duration: 10.0,
      volume: 0.7,
      category: 'music',
    },
  ]);

  // Reset to default demo project
  const handleResetProject = () => {
    if (window.confirm('Reset project back to default demo state?')) {
      setVideoClips([
        {
          id: `clip-${Date.now()}-1`,
          mediaId: 'sample-countdown',
          name: 'Misty Alpine Mountains',
          url: '/samples/sample_countdown.mp4',
          startTime: 0,
          inPoint: 0,
          outPoint: 5.0,
          duration: 5.0,
          speed: 1.0,
          volume: 1.0,
          opacity: 1.0,
          filter: {
            brightness: 105,
            contrast: 110,
            saturation: 115,
            sepia: 0,
            blur: 0,
            hueRotate: 0,
            lut: 'cinematic',
          },
          transitionIn: 'fade_black',
          transitionDuration: 0.6,
        },
      ]);
      setTextClips([
        {
          id: `txt-${Date.now()}`,
          text: 'NEW STORY BEGINS',
          startTime: 0.5,
          duration: 3.5,
          x: 50,
          y: 48,
          fontSize: 42,
          fontFamily: 'Plus Jakarta Sans',
          color: '#ffffff',
          stylePreset: 'bold-impact',
        },
      ]);
      setOverlayClips([]);
      setAudioClips([]);
    }
  };

  // One click snapshot frame transfer to Thumbnail Studio
  const handleSnapToThumbnail = (frameDataUrl: string) => {
    setCapturedThumbnailFrame(frameDataUrl);
    setCurrentMode('thumbnail-designer');
  };

  const totalDuration = Math.max(
    5,
    ...videoClips.map((c) => c.startTime + c.duration),
    ...textClips.map((c) => c.startTime + c.duration),
    ...overlayClips.map((c) => c.startTime + c.duration),
    ...audioClips.map((c) => c.startTime + c.duration)
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Bar with Top Bar Contract */}
      <TopBar
        currentMode={currentMode}
        onSelectMode={(mode) => setCurrentMode(mode)}
        aspectRatio={aspectRatio}
        onChangeAspectRatio={(ratio) => setAspectRatio(ratio)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenCppModal={() => setIsCppModalOpen(true)}
        onResetProject={handleResetProject}
        hasItems={videoClips.length > 0}
        isExpert={isExpert}
        onOpenAccount={() => {
          setBillingNotice(null);
          setIsAccountModalOpen(true);
        }}
      />

      {/* Main Switchable Studio Views */}
      <main className="flex-1 flex overflow-hidden">
        {currentMode === 'video-editor' && (
          <VideoEditor
            aspectRatio={aspectRatio}
            videoClips={videoClips}
            setVideoClips={setVideoClips}
            textClips={textClips}
            setTextClips={setTextClips}
            overlayClips={overlayClips}
            setOverlayClips={setOverlayClips}
            audioClips={audioClips}
            setAudioClips={setAudioClips}
            onSnapToThumbnail={handleSnapToThumbnail}
          />
        )}

        {currentMode === 'video-merger' && (
          <VideoMergerStudio
            accessToken={session?.access_token}
            isExpert={isExpert}
            onUpgrade={() => {
              setBillingNotice(null);
              setIsAccountModalOpen(true);
            }}
          />
        )}

        {currentMode === 'thumbnail-designer' && (
          <ThumbnailDesigner initialVideoFrame={capturedThumbnailFrame} />
        )}

        {currentMode === 'image-editor' && <ImageEditorStudio />}
      </main>

      {/* Universal Full Format Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        aspectRatio={aspectRatio}
        videoClips={videoClips}
        textClips={textClips}
        overlayClips={overlayClips}
        audioClips={audioClips}
        totalDuration={totalDuration}
        accessToken={session?.access_token}
        isExpert={isExpert}
        onUpgrade={() => {
          setBillingNotice(null);
          setIsAccountModalOpen(true);
        }}
      />

      {isAccountModalOpen && (
        <AccountModal
          session={session}
          user={user}
          subscription={subscription}
          subscriptionError={subscriptionError}
          billingNotice={billingNotice}
          onClose={() => setIsAccountModalOpen(false)}
          onSubscriptionUpdated={refreshSubscription}
        />
      )}

      {/* C++ Native Turbo Engine Benchmark & Status Modal */}
      <CppEngineModal
        isOpen={isCppModalOpen}
        onClose={() => setIsCppModalOpen(false)}
      />
    </div>
  );
}
