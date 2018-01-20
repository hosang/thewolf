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

@app.route('/api/productivity')
def productivity():
    weekend = frozenset([5, 6])
    n_days = int(request.args.get('days', 1))
    today = datetime.date.today()
    task_table = get_table('tasks')
    pomo_table = get_table('pomodoro')
    series = []
    for d in range(n_days):
        day = today - datetime.timedelta(days=d)
        if day.weekday() in weekend:
            continue
        tasks = sum(1 for _ in task_table.find(day=day))
        work_time = sum(row['minutes']
                for row in pomo_table.find(day=day, type='work'))
        series.append([day, tasks, work_time])
    series.reverse()
    columns = [['date', 'Day'], ['number', 'Tasks done'], ['number', 'Minutes worked']]
    resp = {
        'success': True,
        'stats': series,
        'columns': columns,
    }
    return json.dumps(resp, default=json_serial), 200, {'Content-Type': 'application/json'}
