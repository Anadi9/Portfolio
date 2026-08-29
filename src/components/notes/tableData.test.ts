import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { nodeText, parseTable, sortRows } from './tableData';

/** What MDX hands `prose.table` as `children`: the thead and tbody elements. */
const table = [
  h('thead', { key: 'h' }, h('tr', null, h('th', null, 'Model'), h('th', null, 'Price'))),
  h(
    'tbody',
    { key: 'b' },
    h('tr', { key: '0' }, h('td', null, 'Gemini'), h('td', null, '$3')),
    h('tr', { key: '1' }, h('td', null, 'Claude'), h('td', null, '$15')),
  ),
];

describe('nodeText', () => {
  it('flattens strings, numbers and nested elements', () => {
    expect(nodeText('plain')).toBe('plain');
    expect(nodeText(42)).toBe('42');
    expect(nodeText(h('strong', null, 'bold ', h('em', null, 'inner')))).toBe('bold inner');
  });

  it('returns empty for null and undefined', () => {
    expect(nodeText(null)).toBe('');
    expect(nodeText(undefined)).toBe('');
  });
});

describe('parseTable', () => {
  it('pulls headers and rows out of an MDX table', () => {
    const parsed = parseTable(table);
    expect(parsed).not.toBeNull();
    expect(parsed!.headers.map(nodeText)).toEqual(['Model', 'Price']);
    expect(parsed!.rows.map((r) => r.map(nodeText))).toEqual([
      ['Gemini', '$3'],
      ['Claude', '$15'],
    ]);
  });

  it('returns null for something that is not a table', () => {
    expect(parseTable(h('p', null, 'no'))).toBeNull();
  });
});

describe('sortRows', () => {
  it('sorts ascending by a column, comparing text', () => {
    const parsed = parseTable(table)!;
    expect(sortRows(parsed.rows, 0, 'asc').map((r) => nodeText(r[0]))).toEqual(['Claude', 'Gemini']);
  });

  it('sorts descending', () => {
    const parsed = parseTable(table)!;
    expect(sortRows(parsed.rows, 0, 'desc').map((r) => nodeText(r[0]))).toEqual(['Gemini', 'Claude']);
  });

  it('sorts numerically when every cell in the column parses as a number', () => {
    const parsed = parseTable(table)!;
    expect(sortRows(parsed.rows, 1, 'asc').map((r) => nodeText(r[1]))).toEqual(['$3', '$15']);
  });

  it('does not mutate the input', () => {
    const parsed = parseTable(table)!;
    const before = parsed.rows.map((r) => nodeText(r[0]));
    sortRows(parsed.rows, 0, 'asc');
    expect(parsed.rows.map((r) => nodeText(r[0]))).toEqual(before);
  });
});
