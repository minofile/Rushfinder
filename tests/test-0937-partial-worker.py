import importlib.util,json,subprocess,tempfile,time,threading,urllib.request
from pathlib import Path
from unittest.mock import patch
from http.server import ThreadingHTTPServer
sp=importlib.util.spec_from_file_location('rfworker',Path(__file__).resolve().parents[1]/'tools/rf_media_worker.py')
w=importlib.util.module_from_spec(sp);sp.loader.exec_module(w)
with tempfile.TemporaryDirectory(prefix='rfworker_partial_') as td:
 root=Path(td);w.ROOT=root
 src=root/'sample.mp4'
 subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=25','-t','8','-c:v','libx264',str(src)],check=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),w.Handler);w.PORT=server.server_port
 th=threading.Thread(target=server.serve_forever,daemon=True);th.start()
 origin='https://rushfinder.vercel.app';base='http://127.0.0.1:'+str(server.server_port)
 def get(path):
  return json.load(urllib.request.urlopen(urllib.request.Request(base+path,headers={'Origin':origin})))
 def post(path,body):
  return json.load(urllib.request.urlopen(urllib.request.Request(base+path,data=json.dumps(body).encode(),headers={'Origin':origin,'Content-Type':'application/json'})))
 def downloader(provider,video_id,dest):
  if video_id=='a1b2c3d4e5F':raise ValueError('video unavailable')
  return src
 with patch.object(w,'check_tools',return_value=['py','-m','yt_dlp']),patch.object(w,'download',side_effect=downloader):
  job=post('/jobs',{'rightsConfirmed':True,'clips':[
   {'provider':'youtube','videoId':'a1b2c3d4e5F','start':0,'sourceStart':0,'duration':2,'sentence':'video fails'},
   {'provider':'youtube','videoId':'B1b2c3d4e5F','start':2,'sourceStart':2,'duration':2,'sentence':'video works'}]})['jobId']
  for i in range(80):
   state=get('/jobs/'+job)
   if state['status'] in ('done','error'):break
   time.sleep(.2)
  assert state['status']=='done',state
  assert len(state['clips'])==1,state
  assert len(state['failures'])==1,state
  assert state['clips'][0]['filename']=='clip_01.mp4'
 server.shutdown()
print('PASS partial source failure does not erase successfully trimmed MP4 clips')
