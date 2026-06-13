import urllib.request
import json

urls = [
    'http://localhost:3002/api/sessions',
    'http://localhost:3002/api/metrics',
]
for url in urls:
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            body = r.read().decode('utf-8')
            print(url, r.status)
            try:
                print(json.dumps(json.loads(body), indent=2)[:1000])
            except Exception:
                print(body[:1000])
    except Exception as e:
        print(url, 'ERROR', e)
