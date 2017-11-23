import re
import subprocess
import os.path

from .core import app, root_dir


macRE = re.compile(r'BSS (?P<macAddress>[0-9a-fA-F:]+)\(on .+?\)( -- associated)?$')
regexps = [
    re.compile(r'^SSID: (?P<essid>.*)$'),
    re.compile(r'^last seen: (?P<age>\d+) ms ago$'),
    re.compile(r'^signal: (?P<signalStrength>[-\.\d]+) dBm$'),
    re.compile(r'^DS Parameter set: channel (?P<channel>\d+)$'),
]

def scan(interface='wlan0'):
    cmd = [os.path.join(root_dir, '..', 'raspi_scan_wlan'), interface]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    points = proc.stdout.read().decode('utf-8')
    return parse(points)

def parse(content):
    cells = []
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        m = macRE.search(line)
        if m is not None:
            cells.append(m.groupdict())
            continue
        for expression in regexps:
            m = expression.search(line)
            if m is not None:
                cells[-1].update(m.groupdict())
                continue
    return cells
