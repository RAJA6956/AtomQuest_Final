import urllib.request
urls = [
    'https://unpkg.com/mediasoup-client@3.20.0/package.json',
    'https://unpkg.com/mediasoup-client@3.20.0/lib/index.mjs',
    'https://unpkg.com/mediasoup-client@3.20.0/dist/mediasoup-client.min.js',
    'https://cdn.jsdelivr.net/npm/mediasoup-client@3.20.0/package.json',
    'https://cdn.jsdelivr.net/npm/mediasoup-client@3.20.0/lib/index.mjs',
    'https://cdn.jsdelivr.net/npm/mediasoup-client@3.20.0/dist/mediasoup-client.min.js',
]
for url in urls:
    try:
        with urllib.request.urlopen(url) as resp:
            print(url, resp.status)
            if 'application/json' in resp.headers.get('Content-Type', ''):
                print(resp.read(1000).decode('utf-8', errors='replace'))
    except Exception as e:
        print(url, 'ERROR', e)
