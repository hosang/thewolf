import datetime
from flask import request, render_template
import json

from . import app, get_table


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    raise TypeError ("Type %s not serializable" % type(obj))

@app.route('/api/pomodoro')
def pomodoro_list_all():
    table = get_table('pomodoro')
    days = list(table.distinct('day'))
    days.sort(key=lambda d: d['day'], reverse=True)
    for day in days:
        day['link'] = '/api/pomodoro/day/{}'.format(day['day'].isoformat())
    return render_template('pomodoro.html', days=days)

@app.route('/api/pomodoro/day/<iso>')
def pomodoro_list_day(iso):
    day = datetime.datetime.strptime(iso, "%Y-%m-%d").date()
    table = get_table('pomodoro')
    entries = list(table.find(day=day))
    minutes = {}
    count = {}
    for e in entries:
        count[e['type']] = count.get(e['type'], 0) + 1
        minutes[e['type']] = minutes.get(e['type'], 0) + e['minutes']
    response = {
        'entries': entries,
        'minutes': minutes,
        'count': count,
    }
    return json.dumps(response, default=json_serial), 200, {'Content-Type': 'application/json'}

@app.route('/api/pomodoro/add', methods=['POST'])
def pomodoro_add_entry():
    data = request.get_json()
    now = datetime.datetime.now()
    entry = {
        'minutes': data['minutes'],
        'type': data['type'],
        'timestamp': now,
        'day': now.date(),
    }
    get_table('pomodoro').insert(entry)
    return json.dumps({'success': True}), 200, {'Content-Type': 'application/json'}

@app.route('/api/pomodoro/plan', methods=['PUT', 'GET'])
def pomodoro_plan():
    if request.method == 'PUT':
        data = request.get_json()
        entry = {
            'plan': json.dumps(data['plan']),
            'state': data['state'],
            'timestamp': datetime.datetime.now(),
        }
        table = get_table('pomodoro_plan')
        table.delete()
        table.insert(entry)
        return json.dumps({'success': True}), 200, {'Content-Type': 'application/json'}
    else:
        entry = get_table('pomodoro_plan').find_one()
        resp = {
            'success': entry is not None,
        }
        if entry is not None:
            resp['plan'] = json.loads(entry['plan'])
            resp['state'] = entry['state']
            resp['timestamp'] = entry['timestamp']
        return json.dumps(resp, default=json_serial), 200, {'Content-Type': 'application/json'}
