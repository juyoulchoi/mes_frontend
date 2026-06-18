import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import {
  countBadgeClass,
  exportCsvButtonClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  searchButtonClass,
} from '@/lib/pageStyles';
import { buildMmsm07005Csv, fetchMmsm07005Rows, type Row } from '@/services/m07/mmsm07005';

// 시스템 사용현황 조회 (MMSM07005S)
// MMSM06007E 패턴 기반 조회/엑셀 화면

const searchGridClass = 'grid grid-cols-1 gap-3 md:grid-cols-[320px_320px_260px_1fr]';
const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

export default function MMSM07005S() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupCd, setGroupCd] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchMmsm07005Rows({ startDate, endDate, groupCd }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm07005Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM07005S_usage.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className={searchGridClass}>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>시작일</span>
              <input
                type="date"
                className={searchInputClass}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>종료일</span>
              <input
                type="date"
                className={searchInputClass}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>사용자그룹</span>
              <input
                className={searchInputClass}
                value={groupCd}
                onChange={(event) => setGroupCd(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                조회
              </button>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="full" width="full">
            <SectionHeader
              title="시스템 사용현황"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${rows.length}건`}
                </span>
              }
            />
            <div className="flex justify-end gap-2 px-4 py-3">
              <button onClick={onExportCsv} disabled={loading} className={exportCsvButtonClass}>
                엑셀
              </button>
            </div>
            <div className={gridScrollClass}>
              <DataGrid<Row>
                dataSource={rows}
                rowKey={(row, index) => `${row.USER_ID || 'access'}-${row.LOGIN_DT || index}`}
                showBorders
                emptyText="사용현황 데이터가 없습니다. 조건을 입력하고 조회하세요."
                classNames={{ table: 'min-w-[980px] w-full text-sm' }}
              >
                <Paging enabled={false} />
                <Column<Row>
                  dataField="LOGIN_DT"
                  caption="접속일시"
                  width={210}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.LOGIN_DT ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="USER_ID"
                  caption="사용자ID"
                  width={140}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.USER_ID ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="LOGIN_IP"
                  caption="접속IP"
                  width={160}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.LOGIN_IP ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="USER_AGENT"
                  caption="User-Agent"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.USER_AGENT ?? ''}</span>
                  )}
                />
              </DataGrid>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
