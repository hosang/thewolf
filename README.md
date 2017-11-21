# The Wolf

![Image of Winston Wolfe](https://raw.githubusercontent.com/hosang/thewolf/master/thewolf/static/images/winston.jpg)

> That's thirty minutes away. I'll be there in ten.  
> — Winston Wolfe, a.k.a. The Wolf

> A person who solves problems - usually with brilliant, lucid thinking under pressure and stylish charisma for galvanizing other people into action.  
> — [Lior Bar-On](https://www.urbandictionary.com/define.php?term=Winston%20Wolf)

A productivity dashboard for the Raspberry Pi inspired by
[Jean-Luc's project](https://www.jlwinkler.com/2017-05-25/raspberry-pi-productivity-dashboard/).
In his blog post he describes the hardware and his architecture, but doesn't
provide code. This is an attempt at making the software starting point
easier for anybody who would like to set up such a productivity dashboard.

![Screenshot of the dashboard](https://raw.githubusercontent.com/hosang/thewolf/screenshot.png)

**Disclaimer:** Even though this is a best effort, I am no expert at any of
the technologies involved. I am no designer and no web developer. Use this
project at your own risc. If you are an expert and know how to do all of these
things properly, pull requests are definitely welcome!


## Architecture

To avoid the complications with security and setting up an internet-facing
service I decided to run everything locally on the Raspberry Pi. This has the
drawback that you lose all data in the database if the SD card fails and
you have no synchronization across multiple devices. I'll postpone these
issues for now.

I set up apache to serve static files: html, css, and javscript code. Most
features are either directly used from third party services (Trello, Google
calendar, dark sky) or handled by python code that is running in apache
through wsgi and that saves everything into a mysql database.

## Features

1. Time, date
1. Weather
1. Calendar events
1. Trello Todo/Doing/Done list
1. Pomodoro timer with plan
1. Bookkeeping of past pomodoro sessions and finished tasks

## Installing

### General

#### Python

Create virtual env:
```
$ virtualenv-3.6 ~/env/py36-virtualenv
```

Activate it
```
$ source ~/env/py36-virtualenv/bin/activate
```

Install dependencies
```
$ pip install -r requirements.txt
```

#### Create Mysql

### Deploy
TODO(hosang): describe apache and wsgi

### Debugging

Start `run.py` in your virtualenv and it will start a webserver in debug mode
on `localhost:5000`.

## Requirements

* Python3
* virtualenv with requirements.txt installed
* mysql server

