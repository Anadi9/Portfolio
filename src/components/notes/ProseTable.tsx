import { useState, type ReactNode } from 'react';
import { c, display, label, px, rule, s } from '@/components/portfolio/tokens';
import { nodeText, parseTable, sortRows } from './tableData';

type Sort = { column: number; direction: 'asc' | 'desc' } | null;

/**
 * Every table on every post.
 *
 * Two things the markdown version could not do. It scrolled sideways on a
 * phone (`minWidth: 480` inside an `overflow-x: auto` box) which on the cheat
 * sheet meant the payload of the page was the part you had to go looking for;
 * each row is a labelled block under 640px now, using the same DOM and the same
 * real `<table>`, so nothing changes for a crawler. And a comparison table you
 * cannot reorder answers only the question its author happened to sort for.
 *
 * A table it cannot parse renders untouched. Malformed input is not a reason to
 * drop content off the page.
 */
const ProseTable = ({ children }: { children?: ReactNode }) => {
  const parsed = parseTable(children);
  const [sort, setSort] = useState<Sort>(null);

  if (!parsed) {
    return (
      <div className="pf-table-wrap" style={{ margin: px(0, 0, s[6]) }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>{children}</table>
      </div>
    );
  }

  const rows = sort ? sortRows(parsed.rows, sort.column, sort.direction) : parsed.rows;
  const labels = parsed.headers.map(nodeText);

  return (
    <div className="pf-table-wrap" style={{ margin: px(0, 0, s[6]) }}>
      <table
        className="pf-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: `${rule.base}px solid ${c.ink}`,
          font: `400 15px/1.6 ${display}`,
          color: '#1c1c1c',
        }}
      >
        <thead>
          <tr>
            {parsed.headers.map((header, i) => {
              const on = sort?.column === i;
              return (
                <th
                  key={i}
                  scope="col"
                  aria-sort={on ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  style={{
                    textAlign: 'left',
                    padding: 0,
                    background: c.accent,
                    borderBottom: `${rule.base}px solid ${c.ink}`,
                  }}
                >
                  <button
                    type="button"
                    className="pf-table-sort"
                    onClick={() =>
                      setSort(
                        on && sort.direction === 'asc'
                          ? { column: i, direction: 'desc' }
                          : { column: i, direction: 'asc' },
                      )
                    }
                    style={{ ...label(10, 700, 0.1) }}
                  >
                    {header}
                    <span aria-hidden="true">{on ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  data-label={labels[ci]}
                  style={{
                    padding: px(s[3], s[4]),
                    borderTop: `${rule.hair}px solid rgba(10,10,10,.2)`,
                    verticalAlign: 'top',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProseTable;
