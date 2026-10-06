import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Ensure storage directories exist
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const EXPORTS_DIR = path.resolve(__dirname, 'exports');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Helper to run python video_processor.py
function callPythonProcessor(action: string, params: Record<string, unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, 'server', 'video_processor.py');
    const child = spawn('python3', [scriptPath, action, JSON.stringify(params)]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`Python process exited with code ${code}: ${stderr}`));
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (err) {
        reject(new Error(`Failed to parse python output: ${stdout || stderr}`));
      }
    });
  });
}

// Streaming range handler for videos and audio
function streamFileWithRanges(req: express.Request, res: express.Response, filePath: string) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

// API Routes
app.get('/api/health', async (_req, res) => {
  try {
    res.json({
      status: 'ok',
      engine: 'Python 3 + FFmpeg + Express',
      uploadsDir: UPLOADS_DIR,
      exportsDir: EXPORTS_DIR,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload media (video, audio, image)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const size = req.file.size;

  let metadata: any = { duration: 0, width: 1280, height: 720, fps: 30 };
  try {
    metadata = await callPythonProcessor('probe', { filePath });
  } catch (e) {
    console.warn('Probe failed or not video:', e);
  }

  res.json({
    success: true,
    file: {
      id: filename,
      name: originalName,
      size,
      mimeType,
      url: `/api/media/uploads/${filename}`,
      path: filePath,
      duration: metadata.duration || 5,
      width: metadata.width || 1280,
      height: metadata.height || 720,
      fps: metadata.fps || 30,
      hasAudio: metadata.has_audio ?? true,
      hasVideo: metadata.has_video ?? true,
    },
  });
});

// Probe existing media file
app.post('/api/probe', async (req, res) => {
  try {
    const { filePath } = req.body;
    const result = await callPythonProcessor('probe', { filePath });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Merge clips via Python FFmpeg engine
app.post('/api/merge', async (req, res) => {
  try {
    const { clips, options } = req.body;
    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'Clips list is required' });
    }

    const fmt = options?.format || 'mp4';
    const outFileName = `merged-${Date.now()}.${fmt}`;
    const outPath = path.resolve(EXPORTS_DIR, outFileName);

    // Resolve absolute paths for clips
    const processedClips = clips.map((clip: any) => {
      let resolvedPath = clip.path;
      if (clip.url && !resolvedPath) {
        if (clip.url.startsWith('/api/media/uploads/')) {
          resolvedPath = path.resolve(UPLOADS_DIR, clip.url.replace('/api/media/uploads/', ''));
        } else if (clip.url.startsWith('/samples/')) {
          resolvedPath = path.resolve(__dirname, 'public', clip.url.replace(/^\//, ''));
        }
      }
      return {
        ...clip,
        path: resolvedPath,
      };
    });

    const result = await callPythonProcessor('merge', {
      clips: processedClips,
      outputPath: outPath,
      options: options || {},
    });

    if (result.error) {
      return res.status(422).json({ error: result.error });
    }

    res.json({
      success: true,
      filename: outFileName,
      url: `/api/media/exports/${outFileName}`,
      fileSize: result.fileSize,
      format: fmt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Extract frame for thumbnail designer
app.post('/api/extract-frame', async (req, res) => {
  try {
    const { videoPath, videoUrl, time = 0 } = req.body;
    let actualPath = videoPath;
    if (!actualPath && videoUrl) {
      if (videoUrl.startsWith('/api/media/uploads/')) {
        actualPath = path.resolve(UPLOADS_DIR, videoUrl.replace('/api/media/uploads/', ''));
      } else if (videoUrl.startsWith('/samples/')) {
        actualPath = path.resolve(__dirname, 'public', videoUrl.replace(/^\//, ''));
      }
    }

    if (!actualPath || !fs.existsSync(actualPath)) {
      return res.status(400).json({ error: 'Valid video path required' });
    }

    const outFileName = `frame-${Date.now()}.png`;
    const outPath = path.resolve(EXPORTS_DIR, outFileName);

    const result = await callPythonProcessor('extract_frame', {
      inputPath: actualPath,
      time,
      outputPath: outPath,
    });

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      url: `/api/media/exports/${outFileName}`,
      filename: outFileName,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save client-side exported canvas or thumbnail (base64 image/video blob)
app.post('/api/save-export', (req, res) => {
  try {
    const { dataUrl, filename, type } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl required' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid dataUrl format' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const safeName = filename || `export-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
    const filePath = path.resolve(EXPORTS_DIR, safeName);

    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      filename: safeName,
      url: `/api/media/exports/${safeName}`,
      size: buffer.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// C++ Native Engine Endpoints
app.get('/api/cpp/status', async (_req, res) => {
  try {
    const result = await callPythonProcessor('cpp_benchmark', { iterations: 10 });
    res.json({
      ...result,
      nativeCompiler: 'g++ 12 (Ubuntu Linux)',
      integration: 'C++17 + Python 3 + ctypes / Subprocess IPC',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cpp/waveform', async (req, res) => {
  try {
    const { audioUrl, bars = 60 } = req.body;
    let actualPath = audioUrl;
    if (audioUrl) {
      if (audioUrl.startsWith('/api/media/uploads/')) {
        actualPath = path.resolve(UPLOADS_DIR, audioUrl.replace('/api/media/uploads/', ''));
      } else if (audioUrl.startsWith('/samples/')) {
        actualPath = path.resolve(__dirname, 'public', audioUrl.replace(/^\//, ''));
      }
    }

    if (!actualPath || !fs.existsSync(actualPath)) {
      return res.status(400).json({ error: 'Valid audio file required' });
    }

    const result = await callPythonProcessor('cpp_waveform', { audioPath: actualPath, bars });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cpp/scene-cuts', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    let actualPath = videoUrl;
    if (videoUrl) {
      if (videoUrl.startsWith('/api/media/uploads/')) {
        actualPath = path.resolve(UPLOADS_DIR, videoUrl.replace('/api/media/uploads/', ''));
      } else if (videoUrl.startsWith('/samples/')) {
        actualPath = path.resolve(__dirname, 'public', videoUrl.replace(/^\//, ''));
      }
    }

    if (!actualPath || !fs.existsSync(actualPath)) {
      return res.status(400).json({ error: 'Valid video file required' });
    }

    const result = await callPythonProcessor('cpp_scene_detect', { videoPath: actualPath });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cpp/grade-frame', async (req, res) => {
  try {
    const { imageUrl, lut = 'cinematic' } = req.body;
    let actualPath = imageUrl;
    if (imageUrl) {
      if (imageUrl.startsWith('/api/media/uploads/')) {
        actualPath = path.resolve(UPLOADS_DIR, imageUrl.replace('/api/media/uploads/', ''));
      } else if (imageUrl.startsWith('/api/media/exports/')) {
        actualPath = path.resolve(EXPORTS_DIR, imageUrl.replace('/api/media/exports/', ''));
      } else if (imageUrl.startsWith('/samples/')) {
        actualPath = path.resolve(__dirname, 'public', imageUrl.replace(/^\//, ''));
      }
    }

    if (!actualPath || !fs.existsSync(actualPath)) {
      return res.status(400).json({ error: 'Valid image path required' });
    }

    const outName = `cpp-grade-${Date.now()}.png`;
    const outPath = path.resolve(EXPORTS_DIR, outName);

    const result = await callPythonProcessor('cpp_grade_frame', {
      inputPath: actualPath,
      outputPath: outPath,
      lut,
    });

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      url: `/api/media/exports/${outName}`,
      filename: outName,
      engine: result.engine,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stream media from uploads or exports
app.get('/api/media/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  const targetDir = folder === 'uploads' ? UPLOADS_DIR : EXPORTS_DIR;
  const safeFilename = path.basename(filename);
  const filePath = path.join(targetDir, safeFilename);

  streamFileWithRanges(req, res, filePath);
});

// Curated sample library metadata
app.get('/api/samples', (_req, res) => {
  res.json({
    videos: [
      {
        id: 'sample-countdown',
        name: 'Countdown & Timecode (16:9)',
        url: '/samples/sample_countdown.mp4',
        duration: 5.0,
        aspectRatio: '16:9',
        width: 1280,
        height: 720,
        fps: 30,
        thumbnail: '/src/assets/images/cinematic_nature_clip_1791202091447.jpg',
      },
      {
        id: 'sample-cinematic',
        name: 'SMPTE Cinematic Bars (16:9)',
        url: '/samples/sample_cinematic.mp4',
        duration: 6.0,
        aspectRatio: '16:9',
        width: 1280,
        height: 720,
        fps: 30,
        thumbnail: '/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg',
      },
      {
        id: 'sample-vertical-reel',
        name: 'Mobile Reel Story (9:16)',
        url: '/samples/sample_vertical_reel.mp4',
        duration: 5.0,
        aspectRatio: '9:16',
        width: 720,
        height: 1280,
        fps: 30,
        thumbnail: '/src/assets/images/vertical_vlog_clip_1791202104717.jpg',
      },
    ],
    audios: [
      {
        id: 'sample-music-synth',
        name: 'Synthwave Chill Beat',
        url: '/samples/music_synth_chill.mp3',
        duration: 10.0,
        category: 'music',
      },
      {
        id: 'sample-sfx-whoosh',
        name: 'Cinematic Whoosh Transition',
        url: '/samples/sfx_whoosh.mp3',
        duration: 1.0,
        category: 'sfx',
      },
    ],
    images: [
      {
        id: 'bg-nature',
        name: 'Cinematic Mountain Sunrise',
        url: '/src/assets/images/cinematic_nature_clip_1791202091447.jpg',
        aspectRatio: '16:9',
      },
      {
        id: 'bg-vlog',
        name: 'Neon Studio Creator (9:16)',
        url: '/src/assets/images/vertical_vlog_clip_1791202104717.jpg',
        aspectRatio: '9:16',
      },
      {
        id: 'bg-gaming',
        name: 'Esports Cyber Arena',
        url: '/src/assets/images/gaming_thumbnail_bg_1791202121004.jpg',
        aspectRatio: '16:9',
      },
      {
        id: 'bg-podcast',
        name: 'Warm Podcast Studio',
        url: '/src/assets/images/podcast_interview_bg_1791202133345.jpg',
        aspectRatio: '16:9',
      },
    ],
  });
});

// Vite or Static serving setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Serve public folder statically (for samples)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CapCut Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
