"""Start a separate visible Chromium in an existing Pi desktop session.

Run through SSH with Python on stdin. No desktop preferences are changed.
Root, when needed to discover another desktop account, is dropped before launch.
All browser files stay in that account's .local-setup/afresh-performance directory.
"""
import json
import os
import pathlib
import pwd
import re
import signal
import subprocess
import sys
import urllib.request


def read(path):
    try:
        return pathlib.Path(path).read_text().strip().replace('\x00', '')
    except OSError:
        return None


def command(args):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=5).stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return None


sessions = []
for proc in pathlib.Path('/proc').iterdir():
    if not proc.name.isdigit() or read(proc / 'comm') not in ('labwc', 'wayfire', 'lxsession', 'weston', 'sway'):
        continue
    try:
        uid = proc.stat().st_uid
        if uid == 0:
            continue
        env = dict(item.split('=', 1) for item in (proc / 'environ').read_bytes().decode().split('\0') if '=' in item)
        sessions.append((uid, env))
    except OSError:
        pass
if len(sessions) != 1:
    raise RuntimeError('Expected exactly one accessible desktop session')
uid, display_env = sessions[0]
account = pwd.getpwuid(uid)
throttled_status = command(['vcgencmd', 'get_throttled'])
if os.getuid() == 0:
    os.initgroups(account.pw_name, account.pw_gid)
    os.setgid(account.pw_gid)
    os.setuid(uid)
if os.getuid() != uid:
    raise RuntimeError('Desktop account is not accessible')
env = dict(os.environ)
env.update({k: display_env[k] for k in ('DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'WAYLAND_DISPLAY', 'DBUS_SESSION_BUS_ADDRESS') if k in display_env})
env.update(HOME=account.pw_dir, USER=account.pw_name, LOGNAME=account.pw_name)
os.environ.update(env)
directory = pathlib.Path(account.pw_dir) / '.local-setup' / 'afresh-performance'
directory.mkdir(parents=True, exist_ok=True)
state_path = directory / 'browser.json'
action = sys.argv[1] if len(sys.argv) > 1 else 'probe'


def current_browser():
    if not state_path.exists():
        return None
    state = json.loads(state_path.read_text())
    cmdline = read('/proc/%s/cmdline' % state['pid'])
    return state if cmdline and str(directory / 'profile') in cmdline else None


if action in ('start', 'start-uncapped'):
    if current_browser():
        raise RuntimeError('The isolated benchmark browser is already running')
    runtime = pathlib.Path(env.get('XDG_RUNTIME_DIR', '/run/user/%s' % uid))
    sockets = [p for p in runtime.glob('wayland-*') if not p.name.endswith('.lock')]
    platform = 'wayland' if sockets else 'x11'
    if sockets:
        env['WAYLAND_DISPLAY'] = sockets[0].name
    display_status = command(['xset', 'q']) if platform == 'x11' else ''
    restore_off = bool(display_status and 'Monitor is Off' in display_status)
    if restore_off:
        command(['xset', 'dpms', 'force', 'on'])
        command(['xset', 's', 'reset'])
    args = ['chromium', '--user-data-dir=' + str(directory / 'profile'),
            '--remote-debugging-port=9337', '--remote-debugging-address=127.0.0.1',
            '--no-first-run', '--no-default-browser-check', '--disable-session-crashed-bubble',
            '--password-store=basic',
            '--window-size=1480,1000', '--ozone-platform=' + platform, 'about:blank']
    if action == 'start-uncapped':
        args.insert(1, '--disable-frame-rate-limit')
    with (directory / 'browser.log').open('ab') as log:
        proc = subprocess.Popen(args, env=env, stdin=subprocess.DEVNULL, stdout=log,
                                stderr=log, start_new_session=True)
    state = {'pid': proc.pid, 'platform': platform, 'restoreDpmsOff': restore_off}
    state_path.write_text(json.dumps(state))
    print(json.dumps(state))
elif action == 'stop':
    state = current_browser()
    if state:
        os.killpg(state['pid'], signal.SIGTERM)
    saved_state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if saved_state.get('restoreDpmsOff'):
        command(['xset', 'dpms', 'force', 'off'])
        saved_state['restoreDpmsOff'] = False
        state_path.write_text(json.dumps(saved_state))
    print(json.dumps({'stopped': bool(state)}))
elif action == 'sample' or action == 'probe':
    memory = {k: int(v.strip().split()[0]) for k, v in (line.split(':', 1) for line in read('/proc/meminfo').splitlines())}
    state = current_browser()
    pids = set([state['pid']]) if state else set()
    parents = {}
    for proc in pathlib.Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        stat = read(proc / 'stat')
        if stat:
            parents[int(proc.name)] = int(stat.rsplit(')', 1)[1].split()[1])
    for _ in range(8):
        pids.update(pid for pid, parent in parents.items() if parent in pids)
    pss = 0
    for pid in pids:
        for line in (read('/proc/%s/smaps_rollup' % pid) or '').splitlines():
            if line.startswith('Pss:'):
                pss += int(line.split()[1])
    power = command(['xset', 'q']) if env.get('DISPLAY') else command(['wlopm'])
    power = re.search(r'Monitor is (On|Off|Standby|Suspend)', power or '')
    print(json.dumps({'model': read('/proc/device-tree/model'), 'kernel': command(['uname', '-r']),
                      'browser': command(['chromium', '--version']), 'memTotalKiB': memory['MemTotal'],
                      'memAvailableKiB': memory['MemAvailable'], 'browserPssKiB': pss, 'browserProcessCount': len(pids),
                      'temperatureMilliC': read('/sys/class/thermal/thermal_zone0/temp'),
                      'frequencyKHz': read('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq'),
                      'throttled': throttled_status,
                      'load': os.getloadavg(), 'platform': state['platform'] if state else None,
                      'monitorPower': power.group(1) if power else 'unavailable'}))
elif action == 'log':
    print(json.dumps({'tail': (directory / 'browser.log').read_text(errors='replace').splitlines()[-35:]}))
elif action == 'http':
    with urllib.request.urlopen('http://127.0.0.1:5178/development/verification/render-fixture.html', timeout=8) as response:
        print(json.dumps({'status': response.status, 'bytes': len(response.read())}))
elif action == 'keep-awake':
    state = current_browser()
    if state and state['platform'] == 'x11':
        command(['xset', 'dpms', 'force', 'on'])
        command(['xset', 's', 'reset'])
    print(json.dumps({'active': bool(state)}))
else:
    raise RuntimeError('Unknown action')
