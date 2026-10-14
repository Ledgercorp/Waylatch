"""Combine authentic current footage and a labeled genuine historical MiniLM excerpt."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import textwrap

root = Path('.cache/competitive-demo').resolve()
dest = Path('docs/demo')
recording = json.loads(Path('docs/evidence/competitive-demo-recording.json').read_text())
legacy = Path('docs/demo/waylatch-engineering-preview.mp4')
legacy_meta = json.loads(Path('docs/evidence/demo-video.json').read_text())
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
if sha(legacy) != legacy_meta['sha256'] or not legacy_meta['realLocalAI']:
    raise RuntimeError('Verified historical genuine inference footage required')
for file, digest in recording['sourceVideos'].items():
    if sha(root / file) != digest:
        raise RuntimeError('Authentic recording digest mismatch')
if recording['paymentRecords'] != 0 or recording['financialProviderCalls'] != 0 or recording['historicalPurchaseReenacted']:
    raise RuntimeError('Financial boundary violation')

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))

def ffmpeg(args):
    subprocess.run(['ffmpeg', '-y', '-v', 'warning', *args], check=True)

scenes = recording['scenes']
field_frames = round(float(probe(root / 'field.webm')['format']['duration']) * 25)
coordinator_frames = round(float(probe(root / 'coordinator.webm')['format']['duration']) * 25)
boundary = next(s for s in scenes if s['kind'] == 'human-boundary')
boundary_frames = round(boundary['seconds'] * 25)
historical_frames = 288
historical_seconds = historical_frames / 25
parts = []
def clip(name, path, start, frames, banner, padded=False):
    target = root / f'{name}.mp4'
    banner_file = root / f'{name}-banner.txt'
    banner_file.write_text(banner)
    filters = ('crop=1600:740:0:60,' if padded else '') + 'pad=1600:900:0:60:color=0x091824,' + f'drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile={banner_file}:fontsize=19:fontcolor=0x9bd0c6:x=(w-text_w)/2:y=20'
    ffmpeg(['-ss', str(start), '-i', str(path), '-vf', filters, '-an', '-r', '25', '-frames:v', str(frames), '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-threads', '2', '-pix_fmt', 'yuv420p', str(target)])
    parts.append(target)

clip('field', root / 'field.webm', 0, field_frames, 'ACTUAL CURRENT APP / FICTIONAL REQUESTS / SIMULATED DISCONNECTION / NO FINANCIAL ACTIONS')
clip('review', root / 'coordinator.webm', 0, boundary_frames, 'ACTUAL CURRENT APP / EXPLICIT DETERMINISTIC FALLBACK / PINNED MODEL ACCESS BLOCKED' if recording['evidenceOnly'] else 'ACTUAL CURRENT APP / GENUINE LOCAL CPU INFERENCE / ADVISORY REVIEW')
clip('historical-ai', legacy, 48.197, historical_frames, 'HISTORICAL VERIFIED MINILM FOOTAGE / NEW 240-CASE EVALUATION STILL BLOCKED', True)
clip('proof', root / 'coordinator.webm', boundary_frames / 25, coordinator_frames - boundary_frames, 'ACTUAL CURRENT APP / SEPARATE HISTORICAL SANDBOX PURCHASE / NO CHECKOUT REENACTMENT / $0 REAL SPENDING')
duration = (field_frames + coordinator_frames + historical_frames) / 25
if duration >= 180:
    raise RuntimeError('Competitive preview exceeds three minutes')
captions = []
for s in scenes:
    at = s['seconds'] + (field_frames / 25 if s['segment'] else 0)
    if s['segment'] and s['seconds'] >= boundary_frames / 25:
        at += historical_seconds
    captions.append({'seconds': at, 'caption': s['caption']})
insert_at = (field_frames + boundary_frames) / 25
captions.append({'seconds': insert_at, 'caption': 'Historical genuine local MiniLM inference from the verified demo. This is not a new evaluation run; held-out metrics remain unavailable.'})
captions.sort(key=lambda item: item['seconds'])
captions[0]['seconds'] = 0
def stamp(seconds, ass=False):
    units = round(seconds * (100 if ass else 1000)); whole, fraction = divmod(units, 100 if ass else 1000)
    hours, rest = divmod(whole, 3600); minutes, sec = divmod(rest, 60)
    return f'{hours}:{minutes:02}:{sec:02}.{fraction:02}' if ass else f'{hours:02}:{minutes:02}:{sec:02},{fraction:03}'
ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1600
PlayResY: 900
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Caption,DejaVu Sans,27,&H00FFFFFF,&H00FFFFFF,&H00182409,&H00182409,0,0,0,0,100,100,0,0,1,0,0,2,45,45,20,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
'''
srt = []
for index, item in enumerate(captions):
    end = captions[index + 1]['seconds'] if index + 1 < len(captions) else duration
    caption = '\\N'.join(textwrap.wrap(item['caption'], width=100))
    ass += f"Dialogue: 0,{stamp(item['seconds'], True)},{stamp(end, True)},Caption,,0,0,0,,{caption}\n"
    srt.append(f"{index+1}\n{stamp(item['seconds'])} --> {stamp(end)}\n{item['caption']}\n")
subtitle = dest / 'competitive-captions.ass'; subtitle.write_text(ass)
(dest / 'competitive-captions.srt').write_text('\n'.join(srt))
concat = root / 'concat.txt'; concat.write_text(''.join(f"file '{p}'\n" for p in parts))
output = dest / 'waylatch-competitive-preview.mp4'
ffmpeg(['-f', 'concat', '-safe', '0', '-i', str(concat), '-vf', f'subtitles={subtitle}', '-an', '-r', '25', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)])
meta = probe(output); actual = float(meta['format']['duration'])
if actual >= 180 or abs(actual - duration) > 0.1 or len(meta['streams']) != 1:
    raise RuntimeError('Unexpected competitive preview output')
evidence = {'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'category': 'authentic-current-application-and-labeled-historical-inference', 'file': str(output), 'sha256': sha(output), 'durationSeconds': actual, 'bytes': output.stat().st_size, 'codec': meta['streams'][0]['codec_name'], 'width': 1600, 'height': 900, 'audio': False, 'publiclyPublished': False, 'realSpending': 0, 'newLocalAIValidated': not recording['evidenceOnly'], 'genuineHistoricalAIShown': True, 'historicalAIStartSeconds': insert_at, 'historicalAIEndSeconds': insert_at + historical_seconds, 'historicalSourceVideoSha256': legacy_meta['sha256'], 'actualCurrentRecording': 'docs/evidence/competitive-demo-recording.json', 'paymentEvidence': 'docs/evidence/paypal-real-sandbox.json', 'orderId': '2W330508JA572391V', 'captureId': '8WY07860808872629', 'historicalPurchaseReenacted': False, 'captions': captions, 'limitations': ['New comparison footage uses explicit deterministic fallback while pinned model access is blocked.', 'Genuine MiniLM inference appears only in a clearly labeled historical excerpt from the verified video.', 'Synthetic requests and browser disconnection simulation; not field data.', 'Human financial controls are shown disabled in judge mode, never automated or impersonated.', 'The previously human-authorized USD 1.00 Sandbox capture is read-only archived evidence, not a new checkout.', 'Silent with captions; no narration/music. No public upload or submission.']}
Path('docs/evidence/competitive-demo-video.json').write_text(json.dumps(evidence, indent=2) + '\n')
print(json.dumps(evidence))
