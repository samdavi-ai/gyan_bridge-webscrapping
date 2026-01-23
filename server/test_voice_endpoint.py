
import requests
import os

# Create a dummy audio file
with open("dummy.webm", "wb") as f:
    f.write(b"\x00" * 1024) # 1KB of silence/zeros

url = "http://localhost:5001/api/legal/voice_interact"
files = {'audio': open('dummy.webm', 'rb')}
data = {'lang': 'en'}

try:
    print(f"Testing POST to {url}...")
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
finally:
    # cleanup
    try:
        os.remove("dummy.webm")
    except:
        pass
