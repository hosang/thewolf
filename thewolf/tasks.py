import datetime
from flask import request
import json

from . import app, get_table
from .pomodoro import json_serial


@app.route('/api/tasks/done/<iso>')
def task_list_day(iso):
    if iso == 'today':
        day = datetime.date.today()
    else:
        day = datetime.datetime.strptime(iso, "%Y-%m-%d").date()
    tasks = list(get_table('tasks').find(day=day))
    response = {
        'tasks': tasks,
        'count': len(tasks),
    }
    return json.dumps(response, default=json_serial), 200, {'Content-Type': 'application/json'}

@app.route('/api/tasks/done/add', methods=['POST'])
def task_list_today():
    data = request.get_json()
    now = datetime.datetime.now()
    entry = {
        'timestamp': now,
        'day': now.date(),
        'name': data['name'],
    }
    get_table('tasks').insert(entry)
    return json.dumps({'success': True}), 200, {'Content-Type': 'application/json'}
