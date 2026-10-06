#!/usr/bin/env python3
"""
CapCut Pro Video Processor
Supports video merging, trimming, transcoding, filters, audio mixing, frame extraction,
and metadata probing via FFmpeg.
"""

import sys
import os
import json
import subprocess
import shutil
import tempfile

FFMPEG_PATH = shutil.which("ffmpeg") or "/usr/bin/ffmpeg"
FFPROBE_PATH = shutil.which("ffprobe") or "/usr/bin/ffprobe"

def run_command(cmd):
    """Executes a command and returns exit code, stdout, stderr."""
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        stdout, stderr = proc.communicate()
        return proc.returncode, stdout, stderr
    except Exception as e:
        return 1, "", str(e)

def get_media_info(file_path):
    """Probes media file metadata using ffprobe."""
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    cmd = [
        FFPROBE_PATH,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path
    ]
    code, stdout, stderr = run_command(cmd)
    if code != 0:
        return {"error": f"ffprobe error: {stderr}"}
    
    try:
        data = json.loads(stdout)
        duration = 0.0
        width = 0
        height = 0
        fps = 30.0
        has_audio = False
        has_video = False

        if "format" in data and "duration" in data["format"]:
            duration = float(data["format"]["duration"])

        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video" and not has_video:
                has_video = True
                width = int(stream.get("width", 1280))
                height = int(stream.get("height", 720))
                # Calculate FPS
                r_frame_rate = stream.get("r_frame_rate", "30/1")
                if "/" in r_frame_rate:
                    num, den = r_frame_rate.split("/")
                    if float(den) > 0:
                        fps = round(float(num) / float(den), 2)
            elif stream.get("codec_type") == "audio":
                has_audio = True

        return {
            "success": True,
            "duration": duration,
            "width": width,
            "height": height,
            "fps": fps,
            "has_audio": has_audio,
            "has_video": has_video,
            "format": data.get("format", {}).get("format_name", "unknown")
        }
    except Exception as e:
        return {"error": f"Failed to parse media metadata: {str(e)}"}

def extract_frame(input_path, time_sec, output_path):
    """Extracts a single frame from video at time_sec."""
    cmd = [
        FFMPEG_PATH,
        "-y",
        "-ss", str(time_sec),
        "-i", input_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path
    ]
    code, stdout, stderr = run_command(cmd)
    if code == 0 and os.path.exists(output_path):
        return {"success": True, "outputPath": output_path}
    return {"error": f"Frame extraction failed: {stderr}"}

def merge_videos(clips, output_path, options=None):
    """
    Merges multiple video clips sequentially into output_path.
    clips is a list of objects:
    [
      { "path": "...", "start": 0, "duration": 5.5, "speed": 1.0, "volume": 1.0 },
      ...
    ]
    options can include:
      - resolution: "1920x1080" | "1080x1920" | "1280x720"
      - fps: 30
      - format: "mp4" | "webm" | "gif" | "mov"
      - audioPath: optional background music file
      - audioVolume: 0.8
    """
    if not clips:
        return {"error": "No clips provided"}

    options = options or {}
    resolution = options.get("resolution", "1280x720")
    fps = int(options.get("fps", 30))
    fmt = options.get("format", "mp4").lower()
    bg_audio = options.get("audioPath")
    bg_audio_volume = float(options.get("audioVolume", 0.8))

    res_parts = resolution.split("x")
    out_w = int(res_parts[0]) if len(res_parts) == 2 else 1280
    out_h = int(res_parts[1]) if len(res_parts) == 2 else 720

    # Build filter_complex string
    # For each clip: trim if requested, scale to target resolution with aspect ratio preserved and padded, set pts
    inputs = []
    filter_chains = []
    video_concat_nodes = []
    audio_concat_nodes = []

    for i, clip in enumerate(clips):
        path = clip.get("path")
        if not os.path.exists(path):
            return {"error": f"Clip file not found: {path}"}
        
        inputs.extend(["-i", path])
        start = float(clip.get("start", 0))
        duration = clip.get("duration")
        speed = float(clip.get("speed", 1.0))
        volume = float(clip.get("volume", 1.0))

        v_filters = []
        if start > 0 or duration is not None:
            trim_str = f"trim=start={start}"
            if duration is not None:
                trim_str += f":duration={duration}"
            v_filters.append(trim_str)
            v_filters.append("setpts=PTS-STARTPTS")

        if speed != 1.0 and speed > 0:
            v_filters.append(f"setpts={1.0 / speed}*PTS")

        # Scale and pad to match exact resolution
        v_filters.append(
            f"scale={out_w}:{out_h}:force_original_aspect_ratio=decrease,pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:black,fps={fps}"
        )
        
        v_node = f"v{i}"
        filter_chains.append(f"[{i}:v]{','.join(v_filters)}[{v_node}]")
        video_concat_nodes.append(f"[{v_node}]")

        # Audio handling for clip
        a_filters = []
        if start > 0 or duration is not None:
            atrim_str = f"atrim=start={start}"
            if duration is not None:
                atrim_str += f":duration={duration}"
            a_filters.append(atrim_str)
            a_filters.append("asetpts=PTS-STARTPTS")

        if speed != 1.0 and 0.5 <= speed <= 2.0:
            a_filters.append(f"atempo={speed}")
        
        if volume != 1.0:
            a_filters.append(f"volume={volume}")

        a_node = f"a{i}"
        if a_filters:
            filter_chains.append(f"[{i}:a]{','.join(a_filters)}[{a_node}]")
        else:
            filter_chains.append(f"[{i}:a]aeval=val(0)[{a_node}]")
        audio_concat_nodes.append(f"[{a_node}]")

    num_clips = len(clips)
    concat_filter = f"{''.join(video_concat_nodes)}{''.join(audio_concat_nodes)}concat=n={num_clips}:v=1:a=1[outv][outa]"
    filter_chains.append(concat_filter)

    full_filter = ";".join(filter_chains)

    cmd = [FFMPEG_PATH, "-y"]
    cmd.extend(inputs)
    cmd.extend(["-filter_complex", full_filter])
    cmd.extend(["-map", "[outv]", "-map", "[outa]"])

    # Output encoding parameters based on format
    if fmt == "gif":
        cmd = [FFMPEG_PATH, "-y"]
        cmd.extend(inputs)
        # Simplified gif conversion with palette
        gif_filter = full_filter.replace("[outv][outa]", "[outv_raw][outa]") + ";[outv_raw]split[a][b];[a]palettegen[p];[b][p]paletteuse[outv]"
        cmd.extend(["-filter_complex", gif_filter])
        cmd.extend(["-map", "[outv]"])
        cmd.extend(["-r", str(min(fps, 15)), output_path])
    elif fmt == "webm":
        cmd.extend(["-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", "-c:a", "libopus", output_path])
    elif fmt == "mov":
        cmd.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", output_path])
    elif fmt == "mp3":
        cmd = [FFMPEG_PATH, "-y"]
        cmd.extend(inputs)
        cmd.extend(["-filter_complex", full_filter])
        cmd.extend(["-map", "[outa]", "-c:a", "libmp3lame", "-b:a", "192k", output_path])
    else: # mp4 default
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output_path
        ])

    code, stdout, stderr = run_command(cmd)
    if code == 0 and os.path.exists(output_path):
        return {"success": True, "outputPath": output_path, "fileSize": os.path.getsize(output_path)}
    else:
        # Fallback to simple concat demuxer if filter_complex failed (e.g. some clips lack audio stream)
        return try_simple_concat(clips, output_path, fmt, fps, out_w, out_h, stderr)

def try_simple_concat(clips, output_path, fmt, fps, out_w, out_h, prev_error):
    """Robust fallback: normalizes each clip to a temp MP4 and concatenates via demuxer."""
    temp_dir = tempfile.mkdtemp(prefix="capcut_merge_")
    concat_list_file = os.path.join(temp_dir, "concat.txt")
    temp_files = []

    try:
        with open(concat_list_file, "w") as f:
            for i, clip in enumerate(clips):
                in_path = clip.get("path")
                temp_clip = os.path.join(temp_dir, f"part_{i}.mp4")
                start = float(clip.get("start", 0))
                dur = clip.get("duration")

                cmd = [FFMPEG_PATH, "-y"]
                if start > 0:
                    cmd.extend(["-ss", str(start)])
                cmd.extend(["-i", in_path])
                if dur:
                    cmd.extend(["-t", str(dur)])
                
                # Check if audio exists or generate silence
                cmd.extend([
                    "-vf", f"scale={out_w}:{out_h}:force_original_aspect_ratio=decrease,pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:black,fps={fps}",
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-b:a", "128k",
                    temp_clip
                ])
                run_command(cmd)
                if os.path.exists(temp_clip):
                    f.write(f"file '{temp_clip}'\n")
                    temp_files.append(temp_clip)

        if not temp_files:
            return {"error": f"Merging failed: {prev_error}"}

        # Concat demuxer
        cmd = [
            FFMPEG_PATH, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_file,
            "-c", "copy" if fmt == "mp4" else "-c:v",
            output_path
        ]
        if fmt != "mp4":
            cmd = [
                FFMPEG_PATH, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_list_file,
                output_path
            ]
        code, stdout, stderr = run_command(cmd)
        if code == 0 and os.path.exists(output_path):
            return {"success": True, "outputPath": output_path, "fileSize": os.path.getsize(output_path)}
        return {"error": f"Merge failed in fallback: {stderr}"}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: video_processor.py <action> <json_params>"}))
        sys.exit(1)

    action = sys.argv[1]
    try:
        params = json.loads(sys.argv[2])
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON params: {str(e)}"}))
        sys.exit(1)

    if action == "probe":
        result = get_media_info(params.get("filePath"))
    elif action == "extract_frame":
        result = extract_frame(
            params.get("inputPath"),
            params.get("time", 0),
            params.get("outputPath")
        )
    elif action == "merge":
        result = merge_videos(
            params.get("clips", []),
            params.get("outputPath"),
            params.get("options", {})
        )
    elif action == "cpp_benchmark":
        import cpp_bridge
        result = cpp_bridge.get_engine_benchmark(params.get("iterations", 15))
    elif action == "cpp_waveform":
        import cpp_bridge
        result = cpp_bridge.analyze_audio_waveform(params.get("audioPath"), params.get("bars", 60))
    elif action == "cpp_grade_frame":
        import cpp_bridge
        result = cpp_bridge.apply_cpp_grade_to_frame(
            params.get("inputPath"),
            params.get("outputPath"),
            params.get("lut", "cinematic")
        )
    elif action == "cpp_scene_detect":
        import cpp_bridge
        result = cpp_bridge.detect_scene_cuts(params.get("videoPath"))
    else:
        result = {"error": f"Unknown action: {action}"}

    print(json.dumps(result))

if __name__ == "__main__":
    main()
