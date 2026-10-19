import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildKitArchive } from './archive';
import { kitArchive, setKitArchive } from './archive-source';
import { KIT } from './product';

describe('kitArchive', () => {
  it('falls back to zipping the folder', () => {
    const names = Object.keys(unzipSync(kitArchive())).sort();
    expect(names).toEqual(Object.keys(unzipSync(buildKitArchive(join(process.cwd(), 'products', KIT.archive)))).sort());
    expect(names.length).toBeGreaterThan(0);
    expect(names.some((n) => n.endsWith('SALES-PAGE.md'))).toBe(false);
  });

  it('returns injected bytes', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    setKitArchive(bytes);
    expect(kitArchive()).toBe(bytes);
  });
});
