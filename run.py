#!/usr/bin/env python3

from thewolf import app

if __name__ == '__main__':
    app.config.from_object('config.Dev')
    app.run()

