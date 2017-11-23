from flask import Flask
import dataset
import os.path


app = Flask(__name__)
root_dir = os.path.dirname(os.path.abspath(__file__))

db = None
def get_db():
    return db

def get_table(table):
    global db
    if db is None:
        db = dataset.connect(app.config['DATABASE_URI'])
    return db[table]

def query(*args, **kwargs):
    return db.query(*args, **kwargs)

