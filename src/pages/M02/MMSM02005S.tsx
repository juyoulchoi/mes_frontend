import { useCallback, useEffect, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { http } from '@/lib/http';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  exportCsvButtonClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  searchButtonClass,
  statusActionGroupClass,
} from '@/lib/pageStyles';
import {
  columns,
  exportHeaders,
  formatCellValue,
  mapExportRow,
  normalizeRows,
  type ApiRow,
  type RowItem,
} from '@/services/m02/mmsm02005';

const monitoringSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)]';

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
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={monitoringSearchGridClass}>
              <div className={`${statusActionGroupClass} col-start-3 row-start-1`}>
                {canSearch && (
                  <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                    {loading ? '조회중...' : '조회'}
                  </button>
                )}
                {canExport && (
                  <button onClick={onExportCsv} className={exportCsvButtonClass}>
                    엑셀
                  </button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="모니터링" />
          <div className={gridScrollClass}>
            <table className="w-full min-w-[1280px] text-sm">
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
        </SectionCard>
      </div>
    </div>
  );
}
