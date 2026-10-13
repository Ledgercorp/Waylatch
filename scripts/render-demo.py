"""Render actual Playwright recordings with explicit evidence labels. Requires ffmpeg/ffprobe."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import textwrap

root = Path('.cache/demo').resolve()
dest = Path('docs/demo')
dest.mkdir(parents=True, exist_ok=True)
clips = [root / 'field.webm', root / 'coordinator.webm']

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))

durations = [float(probe(p)['format']['duration']) for p in clips]
scenes = json.loads((root / 'scenes.json').read_text())
for scene in scenes:
    scene['seconds'] += durations[0] if scene['segment'] else 0
scenes.sort(key=lambda s: s['seconds'])
scenes[0]['seconds'] = 0

def timestamp(seconds, ass=False):
    units = round(seconds * (100 if ass else 1000))
    whole, frac = divmod(units, 100 if ass else 1000)
    hour, rest = divmod(whole, 3600)
    minute, second = divmod(rest, 60)
    return f'{hour}:{minute:02}:{second:02}.{frac:02}' if ass else f'{hour:02}:{minute:02}:{second:02},{frac:03}'

ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1600
PlayResY: 900
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Caption,DejaVu Sans,30,&H00FFFFFF,&H00FFFFFF,&H00182409,&H00182409,0,0,0,0,100,100,0,0,1,0,0,2,45,45,20,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
'''
srt = []
for i, scene in enumerate(scenes):
    end = scenes[i + 1]['seconds'] if i + 1 < len(scenes) else sum(durations)
    caption = '\\N'.join(textwrap.wrap(scene['caption'], width=90))
    ass += f"Dialogue: 0,{timestamp(scene['seconds'], True)},{timestamp(end, True)},Caption,,0,0,0,,{caption}\n"
    srt.append(f"{i + 1}\n{timestamp(scene['seconds'])} --> {timestamp(end)}\n{scene['caption']}\n")
(dest / 'captions.ass').write_text(ass)
(dest / 'captions.srt').write_text('\n'.join(srt))
(root / 'concat.txt').write_text(''.join(f"file '{p}'\n" for p in clips))
banner = 'ENGINEERING PREVIEW  /  FICTIONAL DATA  /  AUTOMATED UI FIXTURES  /  NO PAYPAL TRANSACTION'
filters = f"pad=1600:900:0:60:color=0x091824,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='{banner}':fontsize=20:fontcolor=0x9bd0c6:x=(w-text_w)/2:y=20,subtitles={dest / 'captions.ass'}"
output = dest / 'waylatch-engineering-preview.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'warning', '-f', 'concat', '-safe', '0', '-i', str(root / 'concat.txt'), '-vf', filters, '-an', '-r', '25', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)], check=True)
metadata = probe(output)
duration = float(metadata['format']['duration'])
if duration >= 180:
    raise RuntimeError('Video exceeds the under-three-minute requirement')
evidence = {
    'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'category': 'actual-application-footage-with-labeled-automated-fixtures',
    'file': str(output), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'durationSeconds': duration, 'bytes': output.stat().st_size,
    'codec': metadata['streams'][0]['codec_name'], 'width': metadata['streams'][0]['width'], 'height': metadata['streams'][0]['height'],
    'audio': False, 'publiclyPublished': False,
    'realLocalAI': True, 'realPayPalTransaction': False,
    'limitations': ['Engineering preview; not final financial integration footage.', 'Review and authorization use labeled automated local fixtures, not an independent human decision.', 'Disconnection simulated; IndexedDB, QR decoding, inference and audit validation actually executed.', 'No narration or music. Captions and narration script provided.'],
}
Path('docs/evidence/demo-video.json').write_text(json.dumps(evidence, indent=2) + '\n')
print(json.dumps(evidence))
