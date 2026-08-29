import { Children, isValidElement, type ReactNode } from 'react';

/** Every string in a React subtree, flattened. Used for labels and for sorting. */
export const nodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
};

const childrenOfType = (node: ReactNode, type: string): ReactNode[] =>
  Children.toArray(node).filter((child) => isValidElement(child) && child.type === type);

const cellsOf = (row: ReactNode): ReactNode[] =>
  Children.toArray(isValidElement<{ children?: ReactNode }>(row) ? row.props.children : null)
    .filter((cell) => isValidElement(cell))
    .map((cell) => (isValidElement<{ children?: ReactNode }>(cell) ? cell.props.children : null));

/**
 * MDX's `<table>` children, as data.
 *
 * The alternative was an opt-in `<Compare columns={} rows={}>` in the MDX,
 * which would have meant rewriting the cheat sheet's eight pipe tables as JSX
 * arrays and losing the readable markdown that made GFM tables the right choice
 * in the first place. Parsing here upgrades every table on every post instead,
 * and the source files never change.
 *
 * Cells come back as React nodes, not strings, so inline links, code and
 * emphasis inside a cell survive a sort intact.
 */
export const parseTable = (
  children: ReactNode,
): { headers: ReactNode[]; rows: ReactNode[][] } | null => {
  const [thead] = childrenOfType(children, 'thead');
  const [tbody] = childrenOfType(children, 'tbody');
  if (!thead || !tbody) return null;

  const [headerRow] = childrenOfType(
    isValidElement<{ children?: ReactNode }>(thead) ? thead.props.children : null,
    'tr',
  );
  if (!headerRow) return null;

  const headers = cellsOf(headerRow);
  const rows = childrenOfType(
    isValidElement<{ children?: ReactNode }>(tbody) ? tbody.props.children : null,
    'tr',
  ).map(cellsOf);

  return headers.length > 0 && rows.length > 0 ? { headers, rows } : null;
};

/** `$15` → 15, `1.2M` → null. A cell is a number only if that is all it is. */
const numeric = (text: string): number | null => {
  const stripped = text.replace(/[\s$£€,%]/g, '');
  return /^-?\d+(\.\d+)?$/.test(stripped) ? Number(stripped) : null;
};

/**
 * Sort by one column, numerically where the whole column is numbers.
 *
 * The pricing tables on the cheat sheet are the reason: a string sort puts $15
 * above $3, which is a worse answer than the order the author chose.
 */
export const sortRows = (
  rows: ReactNode[][],
  column: number,
  direction: 'asc' | 'desc',
): ReactNode[][] => {
  const texts = rows.map((row) => nodeText(row[column] ?? ''));
  const numbers = texts.map(numeric);
  const allNumeric = numbers.length > 0 && numbers.every((n) => n !== null);

  const order = rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const result = allNumeric
        ? (numbers[a.i] as number) - (numbers[b.i] as number)
        : texts[a.i].localeCompare(texts[b.i], 'en');
      return direction === 'asc' ? result : -result;
    });

  return order.map((entry) => entry.row);
};
