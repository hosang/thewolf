from flask import request
import json

from . import app, get_table, get_db


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
    if 'cid' not in table.columns:
        db = get_db()
        table = get_table('calendar')
        table.create_column('cid', db.types.string(256))
    table = get_table('calendar')
    if request.method == 'PUT':
        table.upsert({'cid': id}, ['cid'])
    else:
        table.delete(cid=id)
    return json.dumps({'success':True}), 200, {'Content-Type':'application/json'}

