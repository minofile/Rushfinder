import importlib.util,json,subprocess,tempfile,time,threading,urllib.request
from pathlib import Path
from unittest.mock import patch
from http.server import ThreadingHTTPServer
sp=importlib.util.spec_from_file_location('rfworker',Path(__file__).resolve().parents[1]/'tools/rf_media_worker.py')
w=importlib.util.module_from_spec(sp);sp.loader.exec_module(w)
with tempfile.TemporaryDirectory(prefix='rfworker_') as td:
    root=Path(td);w.ROOT=root
    src=root/'sample.mp4'
    subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=25','-t','6','-c:v','libx264',str(src)],check=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),w.Handler);w.PORT=server.server_port
    th=threading.Thread(target=server.serve_forever,daemon=True);th.start()
    origin='https://rushfinder.vercel.app'
    def get(path):
        req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}'+path,headers={'Origin':origin});return urllib.request.urlopen(req)
    def post(path,body):
        req=urllib.request.Request(f'http://127.0.0.1:{server.server_port}'+path,data=json.dumps(body).encode(),headers={'Origin':origin,'Content-Type':'application/json'});return json.load(urllib.request.urlopen(req))
    with patch.object(w,'check_tools',return_value=['py','-m','yt_dlp']), patch.object(w,'download',return_value=src):
        assert json.load(get('/health'))['ok'] is True
        job=post('/jobs',{'rightsConfirmed':True,'clips':[{'provider':'youtube','videoId':'a1b2c3d4e5F','start':3,'sourceStart':1,'duration':2,'sentence':'demo'}]})['jobId']
        for _ in range(60):
            result=json.load(get('/jobs/'+job))
            if result['status'] in ('done','error'):break
            time.sleep(.2)
        assert result['status']=='done', result
        clip=result['clips'][0]
        assert clip['start']==3
        res=get('/media/'+job+'/clip_00.mp4')
        assert res.headers.get('Access-Control-Allow-Origin')==origin
        assert len(res.read())>1000
        frames=post('/frames',{'provider':'aparat','videoId':'Aparat12','rightsConfirmed':True,'around':3,'window':6})
        assert len(frames['frames'])>=3
    server.shutdown()
print('PASS live local API: health, job, MP4 media, Aparat frame sampling, CORS')
