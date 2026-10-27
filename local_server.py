"""RushFinder local server and BoxAPI image proxy. API keys are used in-memory only."""
import http.server,socketserver,webbrowser,threading,json,urllib.request,urllib.error,base64,re,os
ROOT=os.path.dirname(os.path.abspath(__file__))
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=ROOT,**k)
 def end_headers(self):self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');super().end_headers()
 def sendjson(self,code,obj):
  raw=json.dumps(obj,ensure_ascii=False).encode();self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  if self.path=='/boxapi/health':return self.sendjson(200,{'ok':True})
  return super().do_GET()
 def do_POST(self):
  if self.path!='/boxapi/image':return self.sendjson(404,{'error':'مسیر یافت نشد'})
  try:
   n=int(self.headers.get('Content-Length','0'))
   if not 0<n<25000:raise ValueError('اندازه درخواست نامعتبر است')
   d=json.loads(self.rfile.read(n));key=str(d.get('apiKey','')).strip();text=str(d.get('text','')).strip()[:3000]
   model=str(d.get('model','openai/gpt-5-image-mini'))
   if model not in ('openai/gpt-5-image-mini','openai/gpt-5-image'):raise ValueError('مدل پشتیبانی نمی‌شود')
   if not 10<=len(key)<=400 or any(x.isspace() for x in key):raise ValueError('کلید معتبر نیست')
   if len(text)<8:raise ValueError('متن خبر کافی نیست')
   themes={'urgent':'emerald green','mashhad':'golden yellow','jaryan':'black and yellow','farda':'black and red'}
   brand=themes.get(d.get('brand'),'emerald green')
   prompt=('High-end original 3D editorial news illustration, studio quality, realistic glossy materials, intricate iconography strictly relevant to this Persian news topic: '+text+'. Theme: '+brand+'. Artistic object-focused composition with professional lighting, no flat basic shapes. Absolutely NO writing, letters, words, logos, numerals or watermarks. Beautiful clean presentation, one coherent scene, full frame.')
   payload=json.dumps({'model':model,'prompt':prompt,'size':'1024x1024'},ensure_ascii=False).encode()
   req=urllib.request.Request('https://ai.boxapi.ir/ai/v1/images/generations',payload,{'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
   try:
    with urllib.request.urlopen(req,timeout=160) as response:data=json.loads(response.read(20_000_000))
   except urllib.error.HTTPError as e:raise ValueError('BoxAPI '+str(e.code)+': '+e.read(700).decode('utf-8','replace'))
   images=data.get('data',[])
   if not images:raise ValueError('BoxAPI تصویری برنگرداند')
   img=images[0];b64=img.get('b64_json');url=img.get('url')
   if b64:image='data:image/png;base64,'+b64
   elif url and url.startswith('https://'):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RushFinder/536'}),timeout=60) as res:
     mime=res.headers.get('Content-Type','image/png').split(';')[0]
     if mime not in ('image/png','image/jpeg','image/webp'):raise ValueError('نوع فایل تصویر پشتیبانی نمی‌شود')
     binary=res.read(12_000_000)
    image='data:'+mime+';base64,'+base64.b64encode(binary).decode()
   else:raise ValueError('ساختار پاسخ تصویر BoxAPI پشتیبانی نمی‌شود')
   self.sendjson(200,{'image':image})
  except Exception as e:self.sendjson(400,{'error':str(e)[:700]})
class Server(socketserver.ThreadingTCPServer):allow_reuse_address=True;daemon_threads=True
if __name__=='__main__':
 with Server(('127.0.0.1',0),Handler) as server:
  url='http://127.0.0.1:%s/index.html'%server.server_address[1]
  print('RushFinder local: '+url)
  threading.Timer(.8,lambda:webbrowser.open(url)).start()
  try:server.serve_forever()
  except KeyboardInterrupt:pass
