// File-only configuration. Importing this module never starts or probes services.
import {readFileSync} from 'node:fs';

export function readDeploymentConfiguration(file = new URL('../../.env', import.meta.url)) {
  try {
    const values = Object.create(null);
    const keys = ['MADRASI_PORT', 'MADRASI_PATH', 'MADRASI_REFERENCE_PORT', 'MADRASI_REFERENCE_PATH', 'MADRASI_PUBLIC_ORIGIN'];
    for (const raw of readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const match = /^([A-Z][A-Z0-9_]*)=([^\r\n]+)$/.exec(line);
      if (!match || !keys.includes(match[1]) || Object.hasOwn(values, match[1])) throw Error();
      values[match[1]] = match[2].trim();
    }
    if (keys.some(key => !values[key])) throw Error();
    const port = key => {
      if (!/^90(?:0[0-9]|1[0-9])$/.test(values[key])) throw Error();
      return Number(values[key]);
    };
    const path = key => {
      if (!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/.test(values[key])) throw Error();
      return values[key];
    };
    const game = {port: port('MADRASI_PORT'), path: path('MADRASI_PATH')};
    const reference = {port: port('MADRASI_REFERENCE_PORT'), path: path('MADRASI_REFERENCE_PATH')};
    // One project segment and one reference segment; never a flattened name.
    if (game.port === reference.port || game.path.split('/').length !== 3 || reference.path !== game.path + 'reference/') throw Error();
    const origin = new URL(values.MADRASI_PUBLIC_ORIGIN);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== values.MADRASI_PUBLIC_ORIGIN || origin.username || origin.password) throw Error();
    for (const component of [game, reference]) {
      component.origin = `http://127.0.0.1:${component.port}`;
      component.url = component.origin + component.path;
    }
    return {game, reference, publicOrigin: origin.origin};
  } catch {
    throw new Error('Missing or invalid application .env configuration. See .env.example.');
  }
}

export const deployment = readDeploymentConfiguration();
export const gameUrl = (relative = '') => new URL(relative, deployment.game.url).href;
