from flask import render_template
import random

from .core import app, get_table, query
from . import calendar, keys, weather, geolocation, pomodoro, tasks


__all__ = ['app']

@app.route('/')
def serve_root():
    img = random.choice([
        'winston.jpg',
        'winston-good-coffee.jpg',
    ])
    return render_template('index.html', img=img)