"""Build tag-preserving probes or a separately identified controlled-RNG derivative."""
from pathlib import Path
import argparse, hashlib, json, os, struct, subprocess, zlib

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--constant-random', action='store_true', help='Separate controlled fixture: change validated RNG bounds to1 without changing instruction sizes')
args = parser.parse_args()

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = '9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a'
work = ROOT / '.local-setup/reference'
folder = work / 'compile-scripts/frame_3'
folder.mkdir(parents=True, exist_ok=True)
canonical_path = ROOT / 'reference/swf/extended.swf'
canonical = canonical_path.read_bytes()
assert hashlib.sha256(canonical).hexdigest() == EXPECTED, 'Canonical SWF checksum mismatch'
probe = (ROOT / 'tests/reference/probe.as').read_bytes()
(folder / 'DoAction.as').write_bytes(probe)
profile = ROOT / '.local-setup/logs/ffdec-profile'
profile.mkdir(parents=True, exist_ok=True)
compiled = work / 'compiled-probe.swf'
result = subprocess.run(
    ['java', '-Duser.home=' + str(profile), '-jar', str(ROOT / '.local-setup/ffdec/ffdec.jar'),
     '-onerror', 'abort', '-importScript', str(canonical_path), str(compiled), str(folder.parent)],
    env={**os.environ, 'APPDATA': str(profile)}, capture_output=True, text=True, timeout=180,
)
if result.returncode or not compiled.exists():
    (profile / 'probe-error.txt').write_text(result.stdout + result.stderr, encoding='utf-8')
    raise SystemExit('Probe compilation failed; diagnostics remain under .local-setup/logs.')

def decode(data):
    assert data[:3] in (b'CWS', b'FWS'), 'Unsupported SWF compression'
    body = zlib.decompress(data[8:]) if data[:3] == b'CWS' else data[8:]
    rect_bits = 5 + 4 * (body[0] >> 3)
    return body, (rect_bits + 7) // 8 + 4

def tags(data):
    body, offset = decode(data)
    frame = 1
    while offset < len(body):
        start = offset
        header = struct.unpack_from('<H', body, offset)[0]
        code, size = header >> 6, header & 63
        offset += 2
        if size == 63:
            size = struct.unpack_from('<I', body, offset)[0]
            offset += 4
        payload = body[offset:offset + size]
        offset += size
        yield frame, code, payload, start, offset
        if code == 1: frame += 1
        if code == 0: break

def constant_random_body(body):
    """Validate the ten source RNG bounds, including obfuscated code carried in tag253."""
    expected = {(0, 3): [2], (0, 5): [5, 5, 2, 2], **{(sprite, 1): [4] for sprite in (371, 385, 399, 400, 413)}}
    found = {}
    patches = []

    def last_push_integer(start, end):
        last = None
        while start < end:
            kind = body[start]; start += 1; last = None
            if kind == 0:
                zero = body.find(b'\0', start, end)
                if zero < 0: return None
                start = zero + 1
            elif kind in (2, 3): pass
            elif kind in (4, 5, 8): start += 1
            elif kind == 9: start += 2
            elif kind in (1, 7):
                if start + 4 > end: return None
                if kind == 7: last = (start, struct.unpack_from('<i', body, start)[0])
                start += 4
            elif kind == 6: start += 8
            else: return None
        return last if start == end else None

    def visit(start, end, sprite=0):
        frame = 1
        while start < end:
            header = struct.unpack_from('<H', body, start)[0]; start += 2
            code, size = header >> 6, header & 63
            if size == 63: size = struct.unpack_from('<I', body, start)[0]; start += 4
            stop = start + size
            if stop > end: raise ValueError('Invalid tag boundary')
            if code == 39:
                visit(start + 4, stop, struct.unpack_from('<H', body, start)[0])
            if code in (12, 59, 253):
                cursor = start
                while (cursor := body.find(b'\x96', cursor, stop)) >= 0:
                    push = cursor; cursor += 1
                    if push + 3 > stop: continue
                    length = struct.unpack_from('<H', body, push + 1)[0]
                    after = push + 3 + length
                    if after >= stop or body[after] != 0x30: continue
                    operand = last_push_integer(push + 3, after)
                    if operand is None or operand[1] not in (2, 4, 5): continue
                    key = (sprite, frame)
                    if key not in expected: raise ValueError('Unexpected RNG literal site: ' + str(key))
                    offset, value = operand
                    found.setdefault(key, []).append(value)
                    patches.append({'spriteId': sprite, 'frame': frame, 'tagCode': code,
                                    'pushOffsetInUncompressedBody': push, 'integerOffsetInUncompressedBody': offset,
                                    'originalBound': value, 'replacementBound': 1})
            start = stop
            if code == 1: frame += 1
            if code == 0: break

    rect_bits = 5 + 4 * (body[0] >> 3)
    visit((rect_bits + 7) // 8 + 4, len(body))
    if found != expected: raise ValueError('RNG site inventory differs from checked p-code: ' + str(found))
    result = bytearray(body)
    for patch in patches: struct.pack_into('<i', result, patch['integerOffsetInUncompressedBody'], 1)
    changed = [index for index, (old, new) in enumerate(zip(body, result)) if old != new]
    if changed != sorted(patch['integerOffsetInUncompressedBody'] for patch in patches):
        raise ValueError('Changes escaped the ten integer low bytes')
    return bytes(result), patches, changed

compiled_actions = [payload for frame, code, payload, _, _ in tags(compiled.read_bytes()) if frame == 3 and code == 12]
if len(compiled_actions) != 1: raise SystemExit('Expected exactly one compiled frame3 instrumentation action')
payload = compiled_actions[0]
added = struct.pack('<HI', (12 << 6) | 63, len(payload)) + payload
body, _ = decode(canonical)
insert_at = next(start for frame, code, _, start, _ in tags(canonical) if frame == 3 and code == 1)
source_body, rng_patches, changed_offsets = constant_random_body(body) if args.constant_random else (body, [], [])
new_body = source_body[:insert_at] + added + source_body[insert_at:]
derivative = b'CWS' + canonical[3:4] + struct.pack('<I', 8 + len(new_body)) + zlib.compress(new_body)
stem = 'matched-day' if args.constant_random else 'probe'
(work / (stem + '.swf')).write_bytes(derivative)
assert new_body[:insert_at] + new_body[insert_at + len(added):] == source_body
assert canonical_path.read_bytes() == canonical, 'Canonical SWF was modified'
metadata = {
    'canonicalSha256': EXPECTED, 'probeSource': 'tests/reference/probe.as',
    'probeSourceSha256': hashlib.sha256(probe).hexdigest(),
    'probeSha256': hashlib.sha256(derivative).hexdigest(), 'bytes': len(derivative),
    'instrumentation': 'One appended frame3 action plus ten size-preserving RNG-bound byte changes' if args.constant_random else 'One new DoAction tag before ShowFrame3; all canonical tags unchanged',
    'originalUncompressedPayloadPreserved': not args.constant_random,
    'sourceInstructionLengthsPreserved': True,
    'rngLiteralPatches': rng_patches,
    'changedOriginalBodyBytes': changed_offsets,
    'cases': ['matched-day'] if args.constant_random else ['observe', 'timers', 'timing', 'template', 'orphan-controls', 'orphan-removed', 'patience', 'cook', 'day-boundary', 'day', 'tutorial'],
    'controls': 'Gameplay cases disable random arrivals and invoke source handlers; order and optional clock overrides are traced. Tutorial invokes original menu/HowToPlay/Skip handlers without clock or arrival overrides.',
}
if args.constant_random:
    metadata['controls'] = 'Ten validated ActionPush integer bounds before active ActionRandomNumber operations changed from2/4/5 to1; all return0. Source callbacks/intervals/day clock retained. Fixed public input schedule.'
    metadata['excludedObfuscatorCode'] = 'Unreachable RandomNumber in sprite472 frame295 has no literal operand; retained unchanged, absent from clean executable rule export.'
(work / (stem + '-manifest.json')).write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print(json.dumps(metadata))
