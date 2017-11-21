# copy this to config.py and fill out the missing information

class Config(object):
    DARKSKY_KEY = ''
    TRELLO_KEY = ''
    TRELLO_TOKEN = ''
    TRELLO_BOARD = ''
    GOOGLE_CLIENT_ID = ''
    GOOGLE_API_KEY = ''

class Deploy(Config):
    DATABASE_URI = ''

class Dev(Config):
    DEBUG = True
    DATABASE_URI = ''

