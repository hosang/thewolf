from flask import request
import subprocess
import requests
import json
import plistlib
import sys

from . import app
from . import iwlist


def get_wifi_aps_raspi():
    return iwlist.scan('wlan0')

def get_wifi_aps_mac():
    cmd = ["/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport", "-s", "-x"]
    proc = subprocess.run(cmd, check=True, stdout=subprocess.PIPE)
    aps = plistlib.loads(proc.stdout)

    results = []
    for ap in aps:
        results.append({
            'macAddress': ap['BSSID'],
            'age': ap['AGE'],
            'signalStrength': ap['RSSI'],
            'channel': ap['CHANNEL'],
            'signalToNoiseRatio': ap['RSSI'] - ap['NOISE'],
        })
    return results

def get_location():
    if sys.platform == 'darwin':
        access_points = get_wifi_aps_mac()
    else:
        access_points = get_wifi_aps_raspi()
    req = {'wifi_access_points': access_points}
    url = 'https://www.googleapis.com/geolocation/v1/geolocate?key={}'.format(
            app.config['GOOGLE_API_KEY'])
    r = requests.post(
            url, data=json.dumps(req), headers={'referer': request.url})
    loc = r.json()
    return loc
    loc['latitude'] = loc['location']['lat']
    loc['longitude'] = loc['location']['lng']
    del loc['location']
    return loc

@app.route('/api/location')
def get_location_handler():
    loc = get_location()
    return json.dumps(loc), 200, {'Content-Type': 'application/json'}
