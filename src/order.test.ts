import { describe, expect, it } from 'vitest';
import { parseOrderFile, sortNames } from './order.js';

describe('order helpers', () => {
  it('parses .order files and ignores comments', () => {
    expect(parseOrderFile('# hi\nREADME.md\n guide.mdx\n')).toEqual(['README.md', 'guide.mdx']);
  });

  it('sorts ordered entries first', () => {
    const result = sortNames([{ name: 'b.md' }, { name: 'a.md' }, { name: 'README.md' }], ['b.md']);
    expect(result.map((item) => item.name)).toEqual(['b.md', 'README.md', 'a.md']);
  });
});
