import type { ReactNode } from "react";

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  rowKey,
}: {
  columns: { key: string; label: string; render?: (r: T) => ReactNode }[];
  rows: T[];
  rowKey?: (r: T, i: number) => string | number;
}) {
  return (
    <div className="dashboard-card p-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-widest text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className="pb-3 text-left font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : (r.id ?? i)}>
              {columns.map((c) => (
                <td key={c.key} className="py-3">
                  {c.render ? c.render(r) : ((r as Record<string, unknown>)[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}