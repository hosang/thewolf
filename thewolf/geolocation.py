from flask import request
import subprocess
import requests
import json
import plistlib

from . import app


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
    access_points = get_wifi_aps_mac()
    req = {'wifi_access_points': access_points}
    url = 'https://www.googleapis.com/geolocation/v1/geolocate?key={}'.format(
            app.config['GOOGLE_API_KEY'])
    r = requests.post(
            url, data=json.dumps(req), headers={'referer': request.url})
    loc = r.json()
    loc['latitude'] = loc['location']['lat']
    loc['longitude'] = loc['location']['lng']
    del loc['location']
    return loc

@app.route('/api/location')
def get_location_handler():
    loc = get_location()
    return json.dumps(loc), 200, {'Content-Type': 'application/json'}
