import json

from . import app


@app.route('/api/keys/trello')
def get_trello_keys():
    data = {
        'key': app.config['TRELLO_KEY'],
        'token': app.config['TRELLO_TOKEN'],
        'board': app.config['TRELLO_BOARD'],
    }
    return json.dumps(data), 200, {'Content-Type':'application/json'}

@app.route('/api/keys/google')
def get_google_keys():
    data = {
        'api_key': app.config['GOOGLE_API_KEY'],
        'client_id': app.config['GOOGLE_CLIENT_ID'],
    }
    return json.dumps(data), 200, {'Content-Type':'application/json'}
