from datetime import datetime, timedelta
import json
import requests

from . import app, get_table, query


cache_time = timedelta(minutes=5)

@app.route('/api/weather/<longitude>,<latitude>')
def cache_weather(longitude, latitude):
    now = datetime.now()
    table = get_table('weather')
    # only if table already exists
    al = table.table
    if hasattr(al.c, 'timestamp'):
        query(al.delete().where(al.c.timestamp < now - cache_time))
    row = table.find_one(longitude=longitude, latitude=latitude, order_by=['timestamp'])
    if row is None:
        url = 'https://api.darksky.net/forecast/{key}/{longitude},{latitude}?units=si&exclude=daily,hourly'.format(
                key=app.config['DARKSKY_KEY'], longitude=longitude, latitude=latitude)
        response = requests.get(url)
        app.logger.debug(response.text)
        row = {
            'timestamp': now,
            'response': response.text,
            'status': response.status_code,
            'contenttype': response.headers['content-type'],
            'longitude': longitude,
            'latitude': latitude,
        }
        table.insert(row)
        cached = False
    else:
        cached = True
    data = json.loads(row['response'])
    data['cached'] = cached
    return json.dumps(data), row['status'], {'Content-Type': row['contenttype']}

