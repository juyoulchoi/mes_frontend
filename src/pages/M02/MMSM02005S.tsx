import { useCallback, useEffect, useState } from 'react';
import { http } from '@/lib/http';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  columns,
  exportHeaders,
  formatCellValue,
  mapExportRow,
  normalizeRows,
  type ApiRow,
  type RowItem,
} from '@/services/m02/mmsm02005';

// 모니터링 (MMSM02005S)
// 필터 없음. 기능: 조회, 엑셀(CSV)

export default function MMSM02005S() {
  const { canSearch, canExport } = usePagePermissions();
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await http<ApiRow[]>(`/api/v1/planning/productionStatus/search`);
      setRows(normalizeRows(Array.isArray(data) ? data : []));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void onSearch();
  }, [onSearch]);

  function onExportCsv() {
    const lines = rows.map((r) =>
      mapExportRow(r)
        .map((v) => (v ?? '').toString().replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csv = [exportHeaders.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM02005S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">모니터링</div>
        <div className="flex gap-2">
          {canSearch && (
            <button
              onClick={onSearch}
              disabled={loading}
              className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50"
            >
              조회
            </button>
          )}
          {canExport && (
            <button onClick={onExportCsv} className="h-8 px-3 border rounded">
              엑셀
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded p-2">
          {error}
        </div>
      )}

      <div className="border rounded overflow-auto max-h-[75vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              {columns.map((column) => (
                <th key={column.dataField} className={column.headerClassName}>
                  {column.caption}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                {columns.map((column) => (
                  <td key={column.dataField} className={column.cellClassName}>
                    {formatCellValue(r, column)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-3 text-center text-muted-foreground">
                  데이터가 없습니다. 조회 버튼을 눌러 갱신하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
