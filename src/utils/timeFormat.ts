/**
 * Formats seconds into MM:SS:FF or HH:MM:SS format.
 */
export function formatTimecode(seconds: number, fps = 30): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const frames = Math.floor((seconds - totalSeconds) * fps);

  const mm = minutes.toString().padStart(2, '0');
  const ss = remainingSeconds.toString().padStart(2, '0');
  const ff = frames.toString().padStart(2, '0');

  return `${mm}:${ss}:${ff}`;
}

export function formatDurationSimple(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimecode(tc: string, fps = 30): number {
  const parts = tc.split(':').map(Number);
  if (parts.length === 3) {
    const [mm, ss, ff] = parts;
    return mm * 60 + ss + ff / fps;
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm * 60 + ss;
  }
  return 0;
}
