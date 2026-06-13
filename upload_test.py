import requests

BASE='http://localhost:3002'

s = requests.get(BASE+'/api/sessions').json()
if not s:
    print('No sessions found')
    raise SystemExit(1)

sid = s[0]['id']
print('Using session', sid)

with open('test_upload.txt','rb') as f:
    files = {'file': ('test_upload.txt', f)}
    data = {'sender':'AutomatedTester','role':'agent'}
    r = requests.post(f"{BASE}/api/session/{sid}/upload", files=files, data=data)
    print('Status', r.status_code)
    print(r.text)
