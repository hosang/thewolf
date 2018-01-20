from flask import request
from datetime import datetime, timedelta
import json
import googleapiclient.discovery
from apiclient.http import BatchHttpRequest

from . import app, get_table, get_db
from .google_auth import get_credentials


@app.route('/api/calendars/selected')
def calendar_get_selection():
    table = get_table('calendar')
    ids = {row['cid']: True for row in table.all()}
    return json.dumps(ids), 200, {'Content-Type':'application/json'}

@app.route('/api/calendars/selected', methods=['DELETE'])
def calendar_clear():
    get_table('calendar').delete()
    return json.dumps({'success':True}), 200, {'Content-Type':'application/json'}

@app.route('/api/calendars/select/<id>', methods=['PUT', 'DELETE'])
def calendar_select(id):
    table = get_table('calendar')
    if 'cid' not in table.columns:
        db = get_db()
        table.create_column('cid', db.types.string(256))
        table = get_table('calendar')
    if request.method == 'PUT':
        table.upsert({'cid': id}, ['cid'])
    else:
        table.delete(cid=id)
    return json.dumps({'success':True}), 200, {'Content-Type':'application/json'}

@app.route('/api/calendars/list')
def calendar_list():
    cred = get_credentials()
    if cred is None:
        return (json.dumps({'success':False}), 403,
                {'Content-Type':'application/json'})

    service = googleapiclient.discovery.build(
            'calendar', 'v3', credentials=cred)
    calendar_list = service.calendarList().list().execute()

    table = get_table('calendar')
    selection = {row['cid']: True for row in table.all()}

    resp = {
        'success': True,
        'calendars': calendar_list,
        'selection': selection,
    }
    return json.dumps(resp), 200, {'Content-Type':'application/json'}

@app.route('/api/calendars/events')
def calendar_events():
    cred = get_credentials()
    if cred is None:
        return (json.dumps({'success':False}), 403,
                {'Content-Type':'application/json'})

    n_days = int(request.args.get('days', 1))
    interval_start = datetime.now().astimezone()
    interval_start.replace(hour=0, minute=0, second=0, microsecond=0)
    interval_end = interval_start + timedelta(days=n_days)

    events = []
    errors = []
    def cb(request_id, resp, exception):
        if exception is None:
            events.extend(resp['items'])
        else:
            app.logger.error(exception)
            errors.append(exception)

    cal_ids = [row['cid'] for row in get_table('calendar')]

    service = googleapiclient.discovery.build(
            'calendar', 'v3', credentials=cred)
    batch = service.new_batch_http_request(callback=cb)
    for cal_id in cal_ids:
        batch.add(service.events().list(
            calendarId=cal_id,
            timeMin=interval_start.isoformat(),
            timeMax=interval_end.isoformat(),
            singleEvents=True))
    batch.execute()

    if errors:
        resp = {
            'success': False,
            'errors': errors,
        }
        return json.dumps(resp), 500, {'Content-Type':'application/json'}

    resp = {
        'success': True,
        'events': events,
    }
    return json.dumps(resp), 200, {'Content-Type':'application/json'}

