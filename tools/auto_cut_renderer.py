#!/usr/bin/env python3
"""RushFinder 0933: render actual, licensed local source files from Gemini storyboard.

This intentionally does NOT download YouTube streams. YouTube Data API provides search
metadata, not raw MP4 bytes. Users supply footage they have rights to use; source files
should be named by their 11-character YouTube video IDs (e.g. a1b2c3d4e5F.mp4).
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

VIDEO_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')
EXTS = ('.mp4', '.mov', '.mkv', '.webm', '.m4v')

def seconds(value):
    try:
        num = float(value)
    except (TypeError, ValueError):
        raise ValueError('تایم‌کد نامعتبر است')
    if not math.isfinite(num) or num < 0 or num > 10800:
        raise ValueError('تایم‌کد خارج از محدوده قابل قبول است')
    return num

def run(cmd):
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError('خطای FFmpeg:\n'+result.stderr[-1700:])

def find_source(folder, id):
    if not VIDEO_ID.fullmatch(id):
        raise ValueError('شناسه ویدیوی نامعتبر')
    for ext in EXTS:
        f = folder / (id+ext)
        if f.is_file():
            return f
    matches = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTS and id in p.stem]
    return sorted(matches)[0] if len(matches) == 1 else None

def main():
    a = argparse.ArgumentParser(description='Render actual MP4 cuts from licensed local footage and RushFinder 0933 JSON.')
    a.add_argument('--storyboard', type=Path, required=True)
    a.add_argument('--sources', type=Path, required=True, help='Folder with licensed video files named ID.mp4')
    a.add_argument('--narration', type=Path, help='Optional narration MP3/WAV file')
    a.add_argument('--output', type=Path, default=Path('RushFinder-Edited.mp4'))
    a.add_argument('--ffmpeg', default=os.environ.get('RUSHFINDER_FFMPEG') or shutil.which('ffmpeg') or 'ffmpeg')
    a.add_argument('--rights-confirmed', action='store_true', help='Confirm permission to edit the source clips')
    args = a.parse_args()
    if not args.rights_confirmed:
        a.error('Only process video files you are authorized to use. Pass --rights-confirmed.')
    if not args.sources.is_dir() or not args.storyboard.is_file():
        a.error('Storyboard or sources folder not found.')
    data = json.loads(args.storyboard.read_text(encoding='utf-8-sig'))
    clips = data.get('clips')
    if not isinstance(clips, list) or not (1 <= len(clips) <= 120):
        a.error('Storyboard must contain between 1 and 120 valid cuts.')
    ordered = sorted(clips, key=lambda x: seconds(x.get('timelineStart')))
    plan = []
    cursor = 0.0
    for clip in ordered:
        src = clip.get('source') or {}
        vid = str(src.get('id') or '')
        path = find_source(args.sources, vid)
        if not path:
            raise SystemExit('فایل ویدیو پیدا نشد: '+vid+' (نام فایل باید حاوی شناسه یوتیوب باشد)')
        start = seconds(clip.get('timelineStart'))
        src_start = seconds(clip.get('sourceStart'))
        length = seconds(clip.get('timelineDuration'))
        if length < .4 or length > 70 or start < cursor-.05:
            raise SystemExit('برش‌های همپوشان، کوتاه یا نامعتبر در طرح وجود دارد.')
        if start > cursor + .05:
            plan.append(('black',start-cursor,None,None))
        plan.append(('video',length,path,src_start))
        cursor = start+length
    total = max(cursor,seconds(data.get('voiceSeconds') or 0))
    if total > cursor+.05:
        plan.append(('black',total-cursor,None,None))
    ff = str(args.ffmpeg)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='rushfinder-autocut-') as t:
        tmp=Path(t)
        files=[]
        for i, (kind,length,path,source_start) in enumerate(plan):
            dest=tmp/f'segment-{i:03d}.mp4'
            base=[ff,'-hide_banner','-loglevel','error','-y']
            if kind=='video':
                base+=['-ss',f'{source_start:.3f}','-i',str(path),'-t',f'{length:.3f}','-an']
            else:
                base+=['-f','lavfi','-i',f'color=c=black:s=1280x720:r=30:d={length:.3f}','-t',f'{length:.3f}']
            base+=['-vf','scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=30,format=yuv420p','-c:v','libx264','-crf','21','-preset','veryfast','-movflags','+faststart',str(dest)]
            print(f'برش {i+1}/{len(plan)}: {kind} {length:.1f}s',flush=True)
            run(base)
            files.append(dest)
        lst=tmp/'concat.txt'
        lst.write_text(''.join("file '"+str(f).replace("'", "'\\''")+"'\n" for f in files), encoding='utf-8')
        joined=tmp/'joined.mp4'
        run([ff,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(lst),'-c','copy',str(joined)])
        if args.narration:
            if not args.narration.is_file():
                raise SystemExit('فایل نریشن پیدا نشد.')
            run([ff,'-hide_banner','-loglevel','error','-y','-i',str(joined),'-i',str(args.narration),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',f'{total:.3f}','-movflags','+faststart',str(args.output)])
        else:
            shutil.copyfile(joined,args.output)
    print('✓ خروجی MP4 ساخته شد: '+str(args.output.resolve()))

if __name__=='__main__':
    try:
        main()
    except (ValueError,RuntimeError) as error:
        print('خطا:',error,file=sys.stderr)
        sys.exit(1)
