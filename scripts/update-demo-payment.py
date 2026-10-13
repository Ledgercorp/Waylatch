"""Retain verified prior footage; insert actual settled UI and selected real evidence."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import textwrap

root = Path('.cache/release-demo')
root.mkdir(parents=True, exist_ok=True)
dest = Path('docs/demo')
original_commit = '5ca7ce805597a46570aab250e350ba37052d6313'
video_path = 'docs/demo/waylatch-engineering-preview.mp4'
original = root / 'original.mp4'
original_bytes = subprocess.check_output(['git', 'show', f'{original_commit}:{video_path}'])
original.write_bytes(original_bytes)
prior = json.loads(subprocess.check_output(['git', 'show', f'{original_commit}:docs/evidence/demo-video.json']))
if hashlib.sha256(original_bytes).hexdigest() != prior['sha256']:
    raise RuntimeError('Historical authentic footage digest mismatch')
Path('docs/evidence/demo-video-prior.json').write_text(json.dumps(prior, indent=2) + '\n')
settled = json.loads(Path('docs/evidence/paypal-real-sandbox.json').read_text())
verified = json.loads(Path('docs/evidence/paypal-independent-verification.json').read_text())
recording = json.loads(Path('docs/evidence/settled-demo-recording.json').read_text())
if not (verified['independentlyVerified'] and verified['orderStatus'] == 'COMPLETED' and
        verified['captureStatus'] == 'COMPLETED' and settled['captureAuthorized'] and
        settled['paymentState'] == 'PAID' and recording['financialStateUnchanged'] and
        not recording['paymentApprovalReenacted'] and settled['realMoneyUsed'] == 0):
    raise RuntimeError('Genuine independent transaction and settled UI evidence required')
for key in ['orderId', 'captureId', 'recordId', 'amountCents']:
    if settled[key] != verified[key] or settled[key] != recording[key]:
        raise RuntimeError('Source references disagree')
recorded_video = Path(recording['file'])
if hashlib.sha256(recorded_video.read_bytes()).hexdigest() != recording['sha256']:
    raise RuntimeError('Actual settled UI recording digest mismatch')

def ffmpeg(args):
    subprocess.run(['ffmpeg', '-y', '-v', 'warning', *args], check=True)

font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font_bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
mono = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def draw(text, y, size=30, color='0xffffff', font_file=font):
    # All text is derived from bounded saved evidence; no token/account data is read.
    safe = text.replace('\\', '\\\\').replace(':', '\\:').replace("'", "\\'")
    return f"drawtext=fontfile={font_file}:text='{safe}':fontsize={size}:fontcolor={color}:x=(w-text_w)/2:y={y}"

fps = 25
parts = []
def clip(name, path, start, frames, banner, original_padded=False):
    target = root / f'{name}.mp4'
    body = 'crop=1600:740:0:60,' if original_padded else ''
    filters = body + 'pad=1600:900:0:60:color=0x091824,' + draw(banner, 20, 20, '0x9bd0c6')
    ffmpeg(['-ss', str(start), '-i', str(path), '-vf', filters, '-an', '-r', str(fps),
            '-frames:v', str(frames), '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
            '-threads', '2', '-pix_fmt', 'yuv420p', str(target)])
    parts.append(target)

clip('retained', original, 0, 2096,
     'RECORDED APP FOOTAGE / FICTIONAL DATA / AUTOMATED NONFINANCIAL FIXTURES', True)
clip('paid', recorded_video, recording['payStartSeconds'] + 0.25, 256,
     'GENUINE PAYPAL SANDBOX RESULT / ACTUAL HUMAN APPROVALS / $0 REAL SPENDING')
clip('audit', recorded_video, recording['auditStartSeconds'] + 0.10, 202,
     'ACTUAL SETTLED SQLITE AUDIT / 7 VERIFIED EVENTS / SAME ORDER AND CAPTURE')

closing = root / 'closing.mp4'
summary = [
    draw('Waylatch / verified Sandbox purchase', 145, 46, '0x9bd0c6', font_bold),
    draw('USD 1.00 simulated funds  |  USD 0.00 real spending', 235, 31),
    draw('PayPal COMPLETED  /  Waylatch PAID', 305, 38, '0x9bd0c6', font_bold),
    draw('Order  ' + settled['orderId'], 385, 29, font_file=mono),
    draw('Capture  ' + settled['captureId'], 432, 29, font_file=mono),
    draw('Independent Sandbox Orders and Capture GETs returned HTTP 200.', 505, 25),
    draw('Human REVIEW / AUTHORIZE / buyer approval / separate CAPTURE preserved.', 555, 24),
    draw('7 linked audit events verified; genuine callback and Payouts remain unverified.', 610, 23),
    draw('SELECTED ACTUAL EVIDENCE / NOT A CHECKOUT REENACTMENT', 705, 22, '0x9bd0c6'),
]
ffmpeg(['-f', 'lavfi', '-i', 'color=c=0x091824:s=1600x900:r=25', '-vf', ','.join(summary),
        '-frames:v', '197', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
        '-threads', '2', '-pix_fmt', 'yuv420p', str(closing)])
parts.append(closing)
concat = root / 'concat.txt'
concat.write_text(''.join(f"file '{part.resolve()}'\n" for part in parts))

old_caption_blocks = subprocess.check_output(['git', 'show', f'{original_commit}:docs/demo/captions.srt']).decode().strip().split('\n\n')
captions = old_caption_blocks[:11] + [
    '12\n00:01:23,840 --> 00:01:34,080\nSeparate USD 1.00 Sandbox fixture: genuine human-authorized purchase, completed capture, $0 real spending.',
    '13\n00:01:34,080 --> 00:01:42,160\nActual settled payment audit: seven verified events and an exported chain matching SQLite.',
    '14\n00:01:42,160 --> 00:01:50,040\nIndependent PayPal order/capture inspection confirms COMPLETED. Webhook delivery and Payouts remain unverified.',
]
captions[10] = captions[10].replace('00:01:23,853', '00:01:23,840')
(dest / 'captions.srt').write_text('\n\n'.join(captions) + '\n')
ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1600
PlayResY: 900
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Caption,DejaVu Sans,29,&H00FFFFFF,&H00FFFFFF,&H00182409,&H00182409,0,0,0,0,100,100,0,0,1,0,0,2,45,45,20,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
'''
def ass_time(srt_time):
    h, m, seconds = srt_time.split(':')
    sec, ms = seconds.split(',')
    return f'{int(h)}:{m}:{sec}.{int(ms)//10:02}'
for block in captions:
    lines = block.splitlines()
    start, end = lines[1].split(' --> ')
    caption = '\\N'.join(textwrap.wrap(' '.join(lines[2:]), width=94))
    ass += f'Dialogue: 0,{ass_time(start)},{ass_time(end)},Caption,,0,0,0,,{caption}\n'
(dest / 'captions.ass').write_text(ass)
ffmpeg(['-f', 'concat', '-safe', '0', '-i', str(concat), '-vf', f'subtitles={dest / "captions.ass"}',
        '-an', '-r', '25', '-frames:v', '2751', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
        '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video_path])
metadata = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', video_path]))
duration = float(metadata['format']['duration'])
if abs(duration - 110.04) > 0.05 or len(metadata['streams']) != 1:
    raise RuntimeError('Unexpected final media duration or audio stream')
evidence = {
    'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'category': 'existing-application-footage-updated-with-genuine-settled-payment-footage-and-evidence',
    'file': video_path, 'sha256': hashlib.sha256(Path(video_path).read_bytes()).hexdigest(),
    'durationSeconds': duration, 'bytes': Path(video_path).stat().st_size,
    'codec': metadata['streams'][0]['codec_name'], 'width': 1600, 'height': 900,
    'audio': False, 'publiclyPublished': False, 'realLocalAI': True, 'realPayPalTransaction': True,
    'orderId': settled['orderId'], 'captureId': settled['captureId'], 'amountCents': 100, 'realMoneyUsed': 0,
    'sourceCommit': original_commit, 'retainedSourceVideoSha256': prior['sha256'],
    'settledSourceVideoSha256': recording['sha256'],
    'paymentEvidenceFile': 'docs/evidence/paypal-real-sandbox.json',
    'independentVerificationFile': 'docs/evidence/paypal-independent-verification.json',
    'segments': [
        {'startSeconds': 0, 'endSeconds': 83.84, 'source': 'Retained authentic historical application footage; automated nonfinancial fixtures labeled.'},
        {'startSeconds': 83.84, 'endSeconds': 94.08, 'source': 'New authentic UI recording of the genuine settled USD1.00 Sandbox purchase.'},
        {'startSeconds': 94.08, 'endSeconds': 102.16, 'source': 'New authentic UI recording of its seven-event audit and browser export.'},
        {'startSeconds': 102.16, 'endSeconds': 110.04, 'source': 'Selected factual saved evidence from independent authorized Sandbox GETs.'},
    ],
    'limitations': [
        'Original offline/QR/AI scenes retain synthetic records, automated nonfinancial review fixtures and simulated disconnection.',
        'The genuine USD1.00 purchasing fixture is separate from the retained USD128 offline/example records.',
        'Checkout login, buyer approval and capture actions were not screen-recorded; no reenactment claims are made.',
        'The paid-state and audit UI show authentic persisted financial evidence after the actual human-authorized capture.',
        'Actual signed webhook/callback delivery and Payouts remain unverified.',
        'Silent with captions; no narration or music. Public publication requires owner approval.',
    ],
}
Path('docs/evidence/demo-video.json').write_text(json.dumps(evidence, indent=2) + '\n')
print(json.dumps(evidence))
