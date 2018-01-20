from datetime import datetime
from flask import request, redirect, url_for, session
import google.oauth2.credentials
import google_auth_oauthlib.flow
import os.path
import os
import requests

from . import app, root_dir, get_table, get_db


os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
CLIENT_SECRETS_FILE = os.path.join(root_dir, '..', 'google_client_secret.json')

@app.route('/api/auth/google')
def auth():
    app.logger.debug(request.url_root)
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES)
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    authorization_url, state = flow.authorization_url(
            access_type='offline',
            login_hint=app.config['GOOGLE_USER_HINT'],
            include_granted_scopes='true')
    session['state'] = state
    return redirect(authorization_url)

@app.route('/api/auth/google/oauth2callback')
def oauth2callback():
    state = session['state']
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    flow.fetch_token(authorization_response=request.url)

    save_credentials(flow.credentials)
    return redirect(url_for('static', filename='dashboard.html'))

@app.route('/api/auth/google/revoke')
def revoke():
    cred = get_credentials()
    get_table('google_credentials').delete()
    resp = requests.post('https://accounts.google.com/o/oauth2/revoke',
        params={'token': cred.token},
        headers = {'content-type': 'application/x-www-form-urlencoded'})
    return '', resp.status_code

def save_credentials(credentials_obj):
    credentials = credentials_to_dict(credentials_obj)
    now = datetime.now()

    table = get_table('google_credentials')
    if 'key' not in table.columns:
        db = get_db()
        table.create_column('key', db.types.string(256))
        table = get_table('google_credentials')

    for key, val in credentials.items():
        table.upsert({'key': key, 'val': val, 'timestamp': now}, ['key'])

def get_credentials():
    table = get_table('google_credentials')
    c = {row['key']: row['val'] for row in table.all()}
    if len(c) == 0:
        return None
    else:
        return google.oauth2.credentials.Credentials(**c)

def credentials_to_dict(credentials):
  return {'token': credentials.token,
          'refresh_token': credentials.refresh_token,
          'token_uri': credentials.token_uri,
          'client_id': credentials.client_id,
          'client_secret': credentials.client_secret,
          'scopes': credentials.scopes}
