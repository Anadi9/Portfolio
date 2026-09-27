import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FREE_KIT, LATEST } from './index';

const file = join(process.cwd(), 'public', FREE_KIT.href);

describe('FREE_KIT', () => {
  it('points at the latest release', () => {
    expect(FREE_KIT.version).toBe(LATEST.version);
    expect(FREE_KIT.href).toBe(`/downloads/production-kit-full-v${LATEST.version}.zip`);
  });

  it('is published byte for byte as the manifest describes it', () => {
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.length).toBe(FREE_KIT.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(FREE_KIT.sha256);
  });
});
