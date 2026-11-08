#!/usr/bin/env python3
"""RushFinder local media worker 0937.

Fetch authorized public videos from YouTube/Aparat with yt-dlp, extract timeline
segments using FFmpeg, and serve the cut media back to the site's browser.
Only binds 127.0.0.1; never places API keys in browser source.
"""
import base64
import ipaddress
import socket
import urllib.request
import zipfile
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

HOST = '127.0.0.1'
PORT = int(os.environ.get('RUSHFINDER_WORKER_PORT', '8767'))
ROOT = Path(os.environ.get('RUSHFINDER_WORK_DIR', str(Path(tempfile.gettempdir()) / 'rushfinder-autocut-0934'))).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
ALLOWED_ORIGINS = {s.strip().rstrip('/') for s in os.environ.get('RUSHFINDER_SITE_ORIGINS','https://rushfinder.vercel.app,http://localhost:8000,http://127.0.0.1:8000').split(',') if s.strip()}
JOBS = {}
LOCK = threading.Lock()
MAX_FILES = 12
MAX_BYTES = int(os.environ.get('RUSHFINDER_MAX_VIDEO_MB','350')) * 1024 * 1024
ALLOWED_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')
APARAT_ID = re.compile(r'^[A-Za-z0-9_-]{4,25}$')
VECTEEZY_ID = re.compile(r'^\d{1,15}$')


def source_url(source, vid):
    if source == 'youtube' and ALLOWED_ID.fullmatch(vid):
        return f'https://www.youtube.com/watch?v={vid}'
    if source == 'aparat' and APARAT_ID.fullmatch(vid):
        return f'https://www.aparat.com/v/{vid}'
    if source == 'vecteezy' and VECTEEZY_ID.fullmatch(vid):
        return f'https://www.vecteezy.com/video/{vid}'
    raise ValueError('شناسه یا منبع ویدیو معتبر نیست')


def check_tools():
    try:
        subprocess.run(['ffmpeg','-version'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8)
    except Exception:
        raise RuntimeError('FFmpeg نصب نیست یا در PATH قرار ندارد')
    cmd = [sys.executable, '-m', 'yt_dlp']
    try:
        subprocess.run(cmd+['--version'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=8)
    except Exception:
        raise RuntimeError('yt-dlp نصب نیست؛ در PowerShell اجرا کن: py -m pip install -U yt-dlp')
    return cmd


def command(args, timeout=180):
    r = subprocess.run(args, capture_output=True, text=True, errors='replace', timeout=timeout)
    if r.returncode:
        raise RuntimeError('فرمان پردازش ناموفق بود: '+(r.stderr or r.stdout)[-330:])
    return r


# Vecteezy official-API downloads are resolved by the RushFinder server using a
# shared worker secret. Never scrape Vecteezy HTML or accept arbitrary URLs from the browser.
VECTEEZY_HOST_SUFFIXES=('vecteezy.com','eezy.cloud','amazonaws.com','cloudfront.net','googleapis.com','googleusercontent.com','fastly.net','akamaihd.net')
def validate_media_url(url):
    parsed=urlsplit(url)
    host=(parsed.hostname or '').lower().rstrip('.')
    if parsed.scheme != 'https' or parsed.username or parsed.password or not host or parsed.port not in (None,443):
        raise ValueError('Vecteezy download URL must be HTTPS')
    if not any(host==s or host.endswith('.'+s) for s in VECTEEZY_HOST_SUFFIXES):
        raise ValueError('Vecteezy download URL host is not allowlisted: '+host[:90])
    addresses=socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(info[4][0]).is_global for info in addresses):
        raise ValueError('Vecteezy download URL resolves to a private or invalid address')
    return url

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        validate_media_url(newurl)
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def download_vecteezy(vid,folder):
    token=os.environ.get('RUSHFINDER_WORKER_SHARED_KEY','').strip()
    if not token:raise RuntimeError('برای کات ویتیزی، کلید RUSHFINDER_WORKER_SHARED_KEY در Media Worker لازم است')
    base=os.environ.get('RUSHFINDER_SERVER_URL','https://rushfinder.vercel.app').rstrip('/')
    base_url=urlsplit(base)
    if base_url.scheme!='https' or not base_url.hostname or base_url.username or base_url.password:
        raise RuntimeError('RUSHFINDER_SERVER_URL باید آدرس HTTPS سایت خودت باشد')
    endpoint=base+'/api/youtube-music?mode=smartedit-vecteezy-download'
    req=urllib.request.Request(endpoint,data=json.dumps({'id':vid}).encode(),
      headers={'Content-Type':'application/json','X-RushFinder-Worker-Key':token},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=25) as response:
            reply=json.loads(response.read(100000).decode('utf-8'))
    except Exception as exc:raise RuntimeError('درخواست دانلود مجاز ویتیزی ناموفق بود: '+str(exc)[:180])
    url=validate_media_url(str(reply.get('url','')))
    opener=urllib.request.build_opener(SafeRedirect())
    folder.mkdir(parents=True,exist_ok=True)
    binary=folder/'vecteezy-download.bin'
    with opener.open(urllib.request.Request(url,headers={'User-Agent':'RushFinder/0939'}),timeout=60) as response:
        total=0
        with binary.open('wb') as f:
            while True:
                b=response.read(262144)
                if not b:break
                total+=len(b)
                if total>MAX_BYTES:raise RuntimeError('حجم فایل ویتیزی بیش از حد مجاز است')
                f.write(b)
    if zipfile.is_zipfile(binary):
        with zipfile.ZipFile(binary) as archive:
            options=[z for z in archive.infolist() if not z.is_dir() and
                Path(z.filename).suffix.lower() in {'.mp4','.mov','.mkv','.webm'} and 1000<=z.file_size<=MAX_BYTES]
            if not options:raise RuntimeError('داخل فایل دریافت‌شده از ویتیزی ویدیوی قابل استفاده پیدا نشد')
            z=max(options,key=lambda a:a.file_size)
            suffix=Path(z.filename).suffix.lower()
            dest=folder/('source'+suffix)
            with archive.open(z) as src,dest.open('wb') as out:
                shutil.copyfileobj(src,out,1024*1024)
    else:
        # FFmpeg probes the actual stream; MP4 is the normal licensed stock format.
        extension=Path(urlsplit(url).path).suffix.lower()
        if extension not in {'.mp4','.mov','.mkv','.webm'}:extension='.mp4'
        dest=folder/('source'+extension)
        binary.rename(dest)
    binary.unlink(missing_ok=True)
    return dest

def download(source, vid, folder):
    url = source_url(source, vid)
    folder.mkdir(parents=True, exist_ok=True)
    existing = list(folder.glob('source.*'))
    if existing:
        return existing[0]
    if source=='vecteezy':
        # Use the one licensed download for both visual inspection and the
        # resulting FFmpeg cuts instead of charging for the same item twice.
        shared=ROOT/'inspect'/('vecteezy_'+vid)
        found=[f for f in shared.glob('source.*') if f.suffix.lower() in {'.mp4','.mkv','.webm','.mov'} and f.is_file()] if shared.exists() else []
        if found:return found[0]
        return download_vecteezy(vid,shared)
    ytdlp = check_tools()
    output = folder / 'source.%(ext)s'
    # No cookies, no DRM bypass, playlist disabled, 720p max; download only if
    # the uploader/platform makes a downloadable stream available.
    args = ytdlp + ['--no-playlist','--no-progress','--no-warnings','--no-call-home',
       '--socket-timeout','18','--retries','2','--fragment-retries','2',
       '--max-filesize',str(MAX_BYTES),'--match-filter','duration <= 1800',
       '-f','bv*[height<=720]+ba/b[height<=720]/best',
       '--merge-output-format','mp4','-o',str(output),url]
    command(args, timeout=420)
    downloaded = [p for p in folder.glob('source.*') if p.suffix.lower() in {'.mp4','.mkv','.webm','.mov'} and p.is_file()]
    if not downloaded:
        raise RuntimeError('ویدیوی قابل دریافت پیدا نشد')
    f=max(downloaded, key=lambda x:x.stat().st_size)
    if f.stat().st_size > MAX_BYTES:
        raise RuntimeError('حجم ویدیو بیش از حد مجاز است')
    return f


def ffprobe_duration(path):
    # Some Windows systems have ffmpeg.exe but not ffprobe.exe. A successful
    # /health check must not conceal a missing ffprobe dependency.
    if shutil.which('ffprobe'):
        try:
            r=command(['ffprobe','-v','error','-show_entries','format=duration',
                       '-of','default=noprint_wrappers=1:nokey=1',str(path)],timeout=30)
            duration=float(r.stdout.strip())
            if duration>0:return duration
        except (RuntimeError, ValueError):
            pass
    result=subprocess.run(['ffmpeg','-hide_banner','-i',str(path)],
                          capture_output=True,text=True,errors='replace',timeout=30)
    match=re.search(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)',result.stderr)
    if not match:raise RuntimeError('خواندن مدت ویدیو با FFmpeg ممکن نشد')
    return int(match.group(1))*3600+int(match.group(2))*60+float(match.group(3))


def cut_video(src, dest, start, duration):
    vf = 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25'
    command(['ffmpeg','-y','-hide_banner','-loglevel','error', '-ss',f'{start:.3f}',
             '-i',str(src),'-t',f'{duration:.3f}', '-vf',vf,'-an','-c:v','libx264',
             '-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],timeout=125)
    if not dest.exists() or dest.stat().st_size<1000:
        raise RuntimeError('کلیپ خروجی ساخته نشد')


def frame_at(src, at, path):
    command(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',f'{at:.3f}','-i',str(src),
             '-frames:v','1','-vf','scale=512:-2', '-q:v','7',str(path)],timeout=35)


def set_job(job, **values):
    with LOCK:
        JOBS[job].update(values)


def process_job(job, clips):
    work = ROOT / job
    work.mkdir(parents=True,exist_ok=True)
    total = len(clips)
    out=[]
    failures=[]
    for i,c in enumerate(clips):
        try:
            srcid=c['provider']+'_'+c['videoId']
            set_job(job,status='running',percent=round(i/total*100),stage=f'دریافت و بررسی ویدیو {i+1}/{total}')
            source=download(c['provider'],c['videoId'],work/srcid)
            length=ffprobe_duration(source)
            start=float(c['sourceStart']); dur=float(c['duration'])
            if not (0<=start and .5<=dur<=60 and start+dur<=length+.12):
                raise RuntimeError('زمان کات از طول ویدیوی اصلی بیشتر است')
            name=f'clip_{i:02d}.mp4';cut_video(source,work/name,start,dur)
            out.append({'filename':name,'url':f'http://{HOST}:{PORT}/media/{job}/{name}',
                        'start':c['start'],'duration':dur,'provider':c['provider'],'videoId':c['videoId'],
                        'sourceStart':start,'sentence':c['sentence']})
        except Exception as exc:
            # Do not lose successfully verified and rendered shots merely
            # because one upstream public source becomes unavailable.
            failures.append({'index':i+1,'error':str(exc)[-260:]})
        set_job(job,status='running',percent=round((i+1)/total*100),
                stage=f'کات‌های واقعی {len(out)}/{total} · ناموفق {len(failures)}')
    if out:
        set_job(job,status='done',clips=out,failures=failures,percent=100,
                stage='کلیپ‌های قابل‌دریافت آماده شدند' if failures else 'آماده‌سازی تایم‌لاین کامل شد')
    else:
        reason=failures[0]['error'] if failures else 'هیچ منبعی قابل‌دریافت نبود'
        set_job(job,status='error',clips=[],failures=failures,
                error='هیچ کلیپ واقعی ساخته نشد؛ دلیل اولین ویدیو: '+reason,stage='خطا در دریافت یا برش ویدیو')


class Handler(BaseHTTPRequestHandler):
    server_version='RushFinderMediaWorker/0939'
    def log_message(self, fmt, *args):
        print('%s - %s' % (self.address_string(), fmt%args),flush=True)

    def allowed(self):
        origin=self.headers.get('Origin','').rstrip('/')
        return not origin or origin in ALLOWED_ORIGINS

    def headers_common(self):
        origin=self.headers.get('Origin','').rstrip('/')
        if origin in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary','Origin')
        self.send_header('Access-Control-Allow-Private-Network','true')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-store')

    def json(self, code, obj):
        data=json.dumps(obj,ensure_ascii=False).encode('utf-8')
        self.send_response(code);self.headers_common();self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)

    def body(self):
        n=int(self.headers.get('Content-Length','0'))
        if n<=0 or n>100000:
            raise ValueError('اندازه درخواست نامعتبر است')
        return json.loads(self.rfile.read(n).decode('utf-8'))

    def do_OPTIONS(self):
        if not self.allowed():return self.json(403,{'error':'Origin not allowed'})
        self.send_response(204);self.headers_common()
        self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type')
        self.send_header('Access-Control-Max-Age','600');self.end_headers()

    def do_GET(self):
        if not self.allowed():return self.json(403,{'error':'این سایت مجاز نیست'})
        if self.path=='/health':
            try:check_tools();return self.json(200,{'ok':True,'version':'0939','features':['youtube','aparat','vecteezy','ffmpeg'],'vecteezyWorkerReady':bool(os.environ.get('RUSHFINDER_WORKER_SHARED_KEY'))})
            except Exception as e:return self.json(503,{'ok':False,'error':str(e)})
        if self.path.startswith('/jobs/'):
            job=self.path[6:]
            with LOCK:r=JOBS.get(job)
            return self.json(200,dict(r)) if r else self.json(404,{'error':'کار پیدا نشد'})
        m=re.fullmatch(r'/media/([0-9a-f]{32})/(clip_\d{2}\.mp4)',self.path)
        if not m:return self.json(404,{'error':'مسیر یافت نشد'})
        with LOCK: j=JOBS.get(m.group(1))
        if not j or j['status']!='done':return self.json(404,{'error':'خروجی در دسترس نیست'})
        path=ROOT/m.group(1)/m.group(2)
        if not path.is_file():return self.json(404,{'error':'فایل وجود ندارد'})
        size=path.stat().st_size;begin=0;end=size-1;code=200
        rng=self.headers.get('Range','')
        if rng:
            match=re.fullmatch(r'bytes=(\d*)-(\d*)',rng)
            if not match:return self.json(416,{'error':'Invalid range'})
            if match.group(1):
                begin=int(match.group(1));end=min(size-1,int(match.group(2))) if match.group(2) else size-1
            elif match.group(2):
                begin=max(0,size-int(match.group(2)))
            if begin>end or begin>=size:return self.json(416,{'error':'Range not satisfiable'})
            code=206
        self.send_response(code);self.headers_common();self.send_header('Content-Type','video/mp4')
        self.send_header('Accept-Ranges','bytes')
        if code==206:self.send_header('Content-Range',f'bytes {begin}-{end}/{size}')
        self.send_header('Content-Length',str(end-begin+1));self.end_headers()
        with path.open('rb') as f:
            f.seek(begin);remaining=end-begin+1
            while remaining:
                block=f.read(min(65536,remaining))
                if not block:break
                self.wfile.write(block);remaining-=len(block)

    def do_POST(self):
        if not self.allowed():return self.json(403,{'error':'این سایت مجاز نیست'})
        if self.path not in ('/jobs','/frames','/audio-chunks'):return self.json(404,{'error':'مسیر پیدا نشد'})
        try:
            if self.path=='/audio-chunks':
                n=int(self.headers.get('Content-Length','0'))
                if not 100<=n<=50_000_000:raise ValueError('فایل نریشن باید کمتر از ۵۰ مگابایت باشد')
                with tempfile.TemporaryDirectory(prefix='rf_voice_') as d:
                    src=Path(d)/'narration-input.bin'
                    with src.open('wb') as out:
                        remaining=n
                        while remaining:
                            block=self.rfile.read(min(262144,remaining))
                            if not block:raise ValueError('فایل نریشن ناقص دریافت شد')
                            out.write(block);remaining-=len(block)
                    # 45 seconds of mono 40kbps MP3 are about 225KB, safely under
                    # the Vercel narration request-body cap.
                    command(['ffmpeg','-y','-v','error','-i',str(src),'-vn','-ac','1','-ar','16000',
                         '-c:a','libmp3lame','-b:a','40k','-f','segment','-segment_time','45',
                         '-reset_timestamps','1',str(Path(d)/'chunk_%03d.mp3')],timeout=150)
                    files=sorted(Path(d).glob('chunk_*.mp3'))
                    if not files or len(files)>12:raise ValueError('نریشن بیشتر از حدود ۹ دقیقه است؛ همراه فایل متن را هم وارد کن')
                    parts=[{'mimeType':'audio/mpeg','data':base64.b64encode(f.read_bytes()).decode('ascii')}
                           for f in files if f.stat().st_size<=600000]
                    if len(parts)!=len(files):raise ValueError('تقسیم نریشن ناموفق بود')
                return self.json(200,{'chunks':parts})
            body=self.body()
            if body.get('rightsConfirmed') is not True:raise ValueError('تأیید اجازه استفاده از ویدیوها ضروری است')
            if self.path=='/frames':
                provider=body.get('provider');vid=str(body.get('videoId',''))
                path=download(provider,vid,ROOT/'inspect'/f'{provider}_{vid}')
                duration=ffprobe_duration(path)
                if not 1<=duration<=1800:raise ValueError('مدت ویدیو مناسب نیست')
                count=10;frames=[]
                around=body.get('around',None)
                around=float(around) if around is not None else None
                window=float(body.get('window',24))
                if around is not None and not (0<=around<=duration and 6<=window<=90):
                    raise ValueError('بازه فریم معتبر نیست')
                lower=max(0,around-window/2) if around is not None else 0
                upper=min(duration,around+window/2) if around is not None else duration
                with tempfile.TemporaryDirectory(prefix='rf_frames_') as d:
                    for i in range(count):
                        at=max(0.1,min(duration-.15,lower+(upper-lower)*(i+.5)/count))
                        f=Path(d)/f'{i}.jpg';frame_at(path,at,f)
                        if f.exists() and f.stat().st_size<160000:
                            frames.append({'time':round(at,2),'data':base64.b64encode(f.read_bytes()).decode('ascii')})
                return self.json(200,{'frames':frames,'duration':duration})
            clips=body.get('clips')
            if not isinstance(clips,list) or not 1<=len(clips)<=MAX_FILES:raise ValueError('۱ تا ۱۲ برش معتبر ارسال کن')
            clean=[]
            for c in clips:
                provider=c.get('provider');vid=str(c.get('videoId',''));source_url(provider,vid)
                start=float(c.get('start'));sourceStart=float(c.get('sourceStart'));dur=float(c.get('duration'))
                if not (0<=start<=1200 and 0<=sourceStart<=1800 and .5<=dur<=60 and start+dur<=1200):raise ValueError('زمان کات نامعتبر است')
                clean.append({'provider':provider,'videoId':vid,'start':start,'sourceStart':sourceStart,'duration':dur,'sentence':str(c.get('sentence',''))[:400]})
            with LOCK:
                if sum(1 for j in JOBS.values() if j['status'] in {'queued','running'})>=2:
                    return self.json(429,{'error':'یک تدوین دیگر در حال اجراست'})
                job=uuid.uuid4().hex
                JOBS[job]={'status':'queued','stage':'دریافت ویدیوهای مجاز…','percent':0,'clips':[],'error':''}
            threading.Thread(target=process_job,args=(job,clean),daemon=True).start()
            return self.json(202,{'jobId':job,'status':'queued'})
        except (ValueError,TypeError,KeyError) as exc:return self.json(400,{'error':str(exc)})
        except subprocess.TimeoutExpired:return self.json(504,{'error':'زمان پردازش ویدیو تمام شد'})
        except Exception as exc:return self.json(502,{'error':str(exc)[:350]})

if __name__=='__main__':
    print(f'RushFinder 0939 Media Worker: http://{HOST}:{PORT}/health',flush=True)
    print('Allowed browser origins:',', '.join(sorted(ALLOWED_ORIGINS)),flush=True)
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
