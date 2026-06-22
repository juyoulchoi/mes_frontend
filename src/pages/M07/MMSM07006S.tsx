import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  countBadgeClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  searchButtonClass,
  systemInlineSearchGridClass,
} from '@/lib/pageStyles';
import { buildMmsm07006Csv, fetchMmsm07006Rows, type Row } from '@/services/m07/mmsm07006';

// 시스템 LOG 조회 (MMSM07006S)
// MMSM06007E 패턴 기반 조회/엑셀 화면

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

export default function MMSM07006S() {
  const permissions = usePagePermissions();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [evtTp, setEvtTp] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchMmsm07006Rows({ startDate, endDate, evtTp }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm07006Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM07006S_log.csv';
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
            <div className={systemInlineSearchGridClass}>
              <div className={searchFieldClass}>
                <span className={searchLabelTextClass}>시작일</span>
                <input
                  type="date"
                  className={searchInputClass}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className={`${searchFieldClass} col-start-2 row-start-1`}>
                <span className={searchLabelTextClass}>종료일</span>
                <input
                  type="date"
                  className={searchInputClass}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
              <div
                className={`${searchFieldClass} col-start-1 row-start-2 xl:col-start-3 xl:row-start-1`}
              >
                <span className={searchLabelTextClass}>구분</span>
                <input
                  className={searchInputClass}
                  value={evtTp}
                  onChange={(event) => setEvtTp(event.target.value)}
                />
              </div>
              <div className="col-start-4 row-start-1 flex flex-wrap items-end justify-end gap-2 xl:col-start-5">
                {permissions.canSearch ? (
                  <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                    조회
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="full" width="full">
            <SectionHeader
              title="시스템 LOG"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${rows.length}건`}
                </span>
              }
            />
            <CrudActionButtons onExport={onExportCsv} disabled={loading} />
            <div className={gridScrollClass}>
              <DataGrid<Row>
                dataSource={rows}
                rowKey={(row, index) => `${row.EVT_DT || 'log'}-${index}`}
                showBorders
                emptyText="로그 데이터가 없습니다. 조건을 입력하고 조회하세요."
                classNames={{ table: 'min-w-[1040px] w-full text-sm' }}
              >
                <Paging enabled={false} />
                <Column<Row>
                  dataField="EVT_DT"
                  caption="발생일시"
                  width={210}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.EVT_DT ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="EVT_TP"
                  caption="구분"
                  width={120}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.EVT_TP ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="PROC_NM"
                  caption="PROCEDURE 명"
                  width={240}
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.PROC_NM ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="CLT_NM"
                  caption="내용"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.CLT_NM ?? ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="MSG"
                  caption="비고"
                  width={220}
                  cellRender={(row) => <span className={readOnlyCellClass}>{row.MSG ?? ''}</span>}
                />
              </DataGrid>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
