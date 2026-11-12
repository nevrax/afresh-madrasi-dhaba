"""Stream Chrome's line-oriented trace export; omit event args and process paths.

Durations are inclusive host trace spans, not additive CPU percentages or GPU timers.
Usage: python tools/summarize-render-trace.py .local-setup/logs/<run>
"""
import collections
import json
import sys
from pathlib import Path

directory = Path(sys.argv[1])
names, totals, stacks = {}, collections.defaultdict(lambda: [0, 0, 0]), collections.defaultdict(list)
phases = collections.Counter()
with (directory / 'trace.json').open(encoding='utf8') as source:
    for line in source:
        try:
            event = json.loads(line.rstrip().rstrip(','))
        except json.JSONDecodeError:
            continue
        if not isinstance(event, dict) or 'ph' not in event:
            continue
        phase, name = event['ph'], event.get('name')
        key = (event.get('pid'), event.get('tid'))
        phases[phase] += 1
        if name == 'thread_name':
            names[key] = event['args']['name']
        duration = event.get('dur')
        if phase == 'B':
            stacks[key].append(event)
        elif phase == 'E' and stacks[key]:
            begin = stacks[key].pop()
            duration, name = event['ts'] - begin['ts'], begin['name']
        if duration is not None:
            total = totals[(key, name)]
            total[0] += 1
            total[1] += duration
            total[2] = max(total[2], duration)
events = [dict(thread=names.get(key, 'unnamed'), name=name, count=value[0], totalMs=value[1] / 1000,
               maximumMs=value[2] / 1000, meanMs=value[1] / value[0] / 1000)
          for (key, name), value in totals.items()]
events.sort(key=lambda event: -event['totalMs'])
cpu = json.loads((directory / 'process-cpu.json').read_text())
before = {entry['id']: entry for entry in cpu['before']['processInfo']}
cpu_seconds = collections.defaultdict(float)
for entry in cpu['after']['processInfo']:
    if entry['id'] in before:
        cpu_seconds[entry['type']] += entry['cpuTime'] - before[entry['id']]['cpuTime']
result = dict(eventPhases=dict(phases), topInclusiveHostSpans=events[:50], processCpuSeconds=dict(cpu_seconds),
              meaning='Inclusive host spans overlap/nest; do not add them or call them GPU execution time. Process CPU deltas include browser profiling overhead.')
(directory / 'trace-summary.json').write_text(json.dumps(result, indent=2), encoding='utf8')
print(json.dumps(result, indent=2))
