from flask import Flask
import dataset


app = Flask(__name__)

db = None
def get_table(table):
    global db
    if db is None:
        db = dataset.connect(app.config['DATABASE_URI'])
    return db[table]

def query(*args, **kwargs):
    return db.query(*args, **kwargs)
