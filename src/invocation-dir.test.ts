import { describe, expect, it } from 'vitest';
import { getInvocationDir } from './invocation-dir.js';

describe('getInvocationDir', () => {
  it('prefers INIT_CWD when present', () => {
    expect(getInvocationDir({ INIT_CWD: '/tmp/caller' }, '/tmp/package')).toBe('/tmp/caller');
  });

  it('falls back to process cwd when INIT_CWD is absent', () => {
    expect(getInvocationDir({}, '/tmp/package')).toBe('/tmp/package');
  });
});
