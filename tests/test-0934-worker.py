import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('worker',Path(__file__).resolve().parents[1]/'tools/rf_media_worker.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
with tempfile.TemporaryDirectory(prefix='rf0934test_') as d:
    root=Path(d)
    fixture=root/'sample.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=25', '-t','5','-c:v','libx264','-pix_fmt','yuv420p',str(fixture)],check=True)
    w.ROOT=root
    job='b'*32
    w.JOBS[job]={'status':'queued','percent':0,'clips':[]}
    with patch.object(w,'download',return_value=fixture):
        w.process_job(job,[{'provider':'youtube','videoId':'a1b2c3d4e5F','sourceStart':1,'duration':2,'start':3,'sentence':'تست'}])
    assert w.JOBS[job]['status']=='done', w.JOBS[job]
    target=root/job/'clip_00.mp4'
    assert target.exists() and target.stat().st_size>1000
    assert 1.8<=w.ffprobe_duration(target)<=2.2
    assert w.JOBS[job]['clips'][0]['start']==3
print('PASS worker FFmpeg creates real, aligned MP4 cut')
