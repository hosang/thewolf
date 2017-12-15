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

![Screenshot of the dashboard](https://raw.githubusercontent.com/hosang/thewolf/master/screenshot.png)

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

## (optional) Touch screen

I bought the Kuman SC11-3.5INCH-UK (https://www.amazon.de/gp/product/B01FX7909Q/).
I am not sure I would recommend it. The display is a little loose in the case
and basically only supported by the GPIO pins, so I don't have long life
expectations. The display is a little slow, which may be normal. I was able to
install the drivers into a Raspbian Lite installation, so at least I didn't
have to use the shipped image (which would probably break after a dist-upgrade.

Please let me know if you find a better one!

## Installing

### General

#### Install and configure OS

The Raspberry Pi page has a lot of useful information if you want to know
more, for example
[general Linux help](https://www.raspberrypi.org/documentation/linux/).

1. Download and extract raspbian stretch light
1. Figure out which device number the SD card has, then write image to the card: `sudo dd bs=1m if=2017-09-07-raspbian-stretch-lite.img of=/dev/rdiskN conv=sync`
1. Configure localisation and keyboard layout with `sudo raspi-config`
1. Boot from card, log in with user `pi` and password `raspberry`
1. Change root password: `sudo passwd`
1. Create your own user and get rid of the default user
   1. `sudo adduser winston`
   1. Add new user to the sudoers config: `sudo visudo` (or change the files in `/etc/visudo.d/`)
   1. `sudo userdel -r pi`
   1. Switch to the new user: logout and login again
1. Configure wifi: `wpa_passphrase "essid" "password" | sudo tee -a /etc/wpa_supplicant/wpa_supplicant.conf`, then edit the file and remove the plaintext password
1. Reconfigure interface: `wpa_cli -i wlan0 reconfigure` (now you should be in your network)
1. Update packages: `sudo apt update` and `sudo apt upgrade`
1. Install necessary packages: `sudo apt install lightdm lxde chromium-browser python3.5 python3.5-dev virtualenv apache2 libapache2-mod-wsgi-py3 mysql-client mysql-server default-libmysqlclient-dev git`
1. Configure the grafical interface
   1. `sudo vim /etc/xdg/lxsession/LXDE/autostart` and append the following:
   ```
   xset s off         # don't activate screensaver 
   xset -dpms         # disable DPMS (Energy Star) features. 
   xset s noblank     # don't blank the video device
   @unclutter -idle 1
   @chromium-browser --incognito --kiosk http://localhost/static/dashboard.html
   ```
   1. `sudo raspi-config`: under `Boot Options > Desktop/CLI` choose `B4 Desktop Autologin` 

#### Create Mysql user and database

1. Connect to mysql server: `sudo mysql`
1. Create database: `CREATE DATABASE thewolf;`
1. Create user: `CREATE USER 'thewolf'@'localhost' IDENTIFIED BY 'somepassword';`
1. Grant access: `GRANT ALL PRIVILEGES ON thewolf.* TO 'thewolf'@'localhost';`
1. Logout with C-d

#### The Wolf

1. Get the code: `git clone https://github.com/hosang/thewolf.git`
1. Create the config file: `cp config-example.py config.py`  
1. Fill API keys in the `config.py`
   1. [Dark Sky](https://darksky.net/dev): get your secret key
   1. Trello: get you [key and token](https://trello.com/app-key); get the key of the board you want to use by visiting it, adding .json to the end of the URL and look it up in the "id" field
   1. [Google](https://console.developers.google.com/project/_/apiui/apis/library): Generate an API key and a client ID, you can specify localhost as the requesting hostname if you want. You should add the following APIs to the project: Calendar API, Maps Geolocation API, Maps JavaScript API
   1. Database information: In the `Deploy` class set `DATABASE_URI` to something like `mysql://thewolf:somepassword@localhost/thewolf` (according to what you have created in the previous section).
1. Prepare the wlan scanning script, will use sudo: `make`

#### Python

1. Create virtual env: `virtualenv -p python3.5 ~/env/py35-virtualenv`
1. Activate it: `source ~/env/py35-virtualenv/bin/activate`
1. Install dependencies: `pip install -r thewolf/requirements.txt`

#### Apache

1. Create apache configuration: `sudo vi /etc/apache2/sites-available/thewolf.conf`  
   The file should look something like this:
    ```
    <VirtualHost localhost:80>
        ServerName localhost

        Alias /static/ /home/winston/thewolf/thewolf/static/

        WSGIProcessGroup thewolf
        WSGIApplicationGroup %{GLOBAL}

        WSGIDaemonProcess thewolf user=winston group=winston threads=2 python-home=/home/winston/env/py35-thewolf python-path=/home/winston/thewolf

        WSGIScriptAlias / /home/winston/thewolf/thewolf.wsgi
        WSGIScriptReloading On

        <Directory /home/winston/thewolf/>
            Require all granted
        </Directory>
        <Directory /home/winston/thewolf/thewolf/static/>
            Require all granted
        </Directory>
    </VirtualHost>
    ```
1. Enable it: `sudo ln -s /etc/apache2/sites-available/thewolf.conf /etc/apache2/sites-enabled/thewolf.conf`
1. Restart apache to load the config: `sudo /etc/init.d/apache2 restart`

#### Install display driver (this may be different for you)

1. `git clone https://github.com/goodtft/LCD-show.git`
1. `sh LCD35-show`
1. rotate screen, change line at end of file to `dtoverlay=tft35a:rotate=270,swapxy=1` in `/boot/config.txt`
1. also change `/etc/X11/xorg.conf.d/99-calibration.conf` to the following:
   ```
Section "InputClass"
        Identifier      "calibration"
        MatchProduct    "ADS7846 Touchscreen"
        Option  "Calibration"   "3936 227 268 3880"
        Option "InvertX" "true"
        Option "InvertY" "true"
EndSection

Section "Device"
        # WaveShare SpotPear 3.5", framebuffer 1
        Identifier "uga"
        driver "fbdev"
        Option "fbdev" "/dev/fb1"
        Option "ShadowFB" "off"
EndSection

Section "Monitor"
        # Primary monitor. WaveShare SpotPear 480x320
        Identifier "WSSP"
EndSection

Section "Screen"
        Identifier "primary"
        Device "uga"
        Monitor "WSSP"
EndSection

Section "ServerLayout"
        Identifier "default"
        Screen 0 "primary" 0 0
EndSection
   ```

### Debugging

Start `run.py` in your virtualenv and it will start a webserver in debug mode
on `localhost:5000`.

## Requirements

* Python3
* virtualenv with requirements.txt installed
* mysql server


## Credits

I used the following products/services/projects and I am grateful for their
work. Without them thise kind of project would be impossible. If you're one
of them and require anything from this project (for example a specific license)
please let me know!

* [Dark Sky](https://darksky.net)
* [Font Awesome](http://fontawesome.io)
* [Google API](https://developers.google.com)
* [Google fonts](https://fonts.google.com)
* [Weather Icons](http://erikflowers.github.io/weather-icons/)
