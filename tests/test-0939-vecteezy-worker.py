import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'tools'))
import rf_media_worker as w
assert w.source_url('vecteezy','123456')=='https://www.vecteezy.com/video/123456'
for source,video in [('vecteezy','../../etc/passwd'),('vecteezy','abcd'),('aparat','!'),('youtube','bad')]:
    try:w.source_url(source,video)
    except ValueError:pass
    else:raise AssertionError('Unvalidated id '+video)
# URL checks reject insecure hosts before any DNS resolution occurs.
for url in ['http://cdn.vecteezy.com/a.mp4','https://127.0.0.1/a.mp4','https://evil.com/a.mp4','file:///etc/passwd']:
    try:w.validate_media_url(url)
    except (ValueError, OSError):pass
    else:raise AssertionError('Unvalidated URL '+url)
print('PASS worker IDs and allowed Vecteezy source validation')
