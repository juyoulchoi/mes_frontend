import { useRef, useState, type ReactNode } from 'react';

import AlertBox from '@/components/AlertBox';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import {
  exportHeaders,
  fetchRows,
  mapExportRow,
  patchRow,
  saveRows,
  toggleRow,
  type DetailInputProps,
  type OutsourceIoRow,
} from '@/services/m02/mmsm02006';

const outsourceIoSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(300px,446px)_minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] xl:gap-x-[30px]';

function DetailInput({
  label,
  value,
  type = 'text',
  readOnly = false,
  onChange,
}: DetailInputProps) {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-slate-500">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={`h-9 rounded-md border px-3 text-sm outline-none transition ${
          readOnly
            ? 'border-slate-100 bg-slate-50 text-slate-500'
            : 'border-slate-200 bg-white text-slate-800 focus:border-slate-400'
        } ${type === 'number' ? 'text-right' : ''}`}
      />
    </label>
  );
}

function ClickableCell({
  children,
  onDoubleClick,
  align = 'left',
}: {
  children: ReactNode;
  onDoubleClick: () => void;
  align?: 'left' | 'center';
}) {
  return (
    <button
      type="button"
      onDoubleClick={onDoubleClick}
      className={`group inline-flex min-h-7 w-full items-center rounded-md border border-transparent px-2 py-1 text-sm font-medium text-sky-700 transition hover:text-sky-800 focus:outline-none ${
        align === 'center' ? 'justify-center text-center' : 'justify-start text-left'
      }`}
      title="더블클릭하여 외주 입출고 상세 보기"
    >
      <span className="truncate underline decoration-sky-300 underline-offset-4 group-hover:decoration-sky-500">
        {children}
      </span>
    </button>
  );
}

export default function MMSM02006E() {
  const { canSave } = usePagePermissions();
  const today = getTodayYmd();
  const [startDate, setStartDate] = useState(`${today.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(today);
  const [outGb, setOutGb] = useState('');
  const [rows, setRows] = useState<OutsourceIoRow[]>([]);
  const [detailRow, setDetailRow] = useState<OutsourceIoRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const busy = loading || saving;
  const gridHeight = Math.max(tableHeight - 58, 360);

  async function loadRows() {
    return fetchRows({ startDate, endDate, outGb });
  }

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      setRows(await loadRows());
    } catch (searchError) {
      setRows([]);
      setError(searchError instanceof Error ? searchError.message : String(searchError));
    } finally {
      setLoading(false);
    }
  }

  function updateDetail(patch: Partial<OutsourceIoRow>) {
    setDetailRow((current) => (current ? patchRow(current, patch) : current));
  }

  async function onSaveDetail() {
    if (!detailRow) {
      setError('저장할 외주 입출고 정보가 없습니다.');
      return;
    }
    if (!detailRow.outCd) {
      setError('외주코드가 없는 데이터는 저장할 수 없습니다.');
      return;
    }
    if (!window.confirm('외주 입출고 정보를 저장하시겠습니까?')) return;

    setSaving(true);
    setError(null);

    try {
      await saveRows([detailRow]);
      setRows(await loadRows());
      setDetailRow(null);
      window.alert('저장되었습니다.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={outsourceIoSearchGridClass}>
              <FromToDateField
                label="수주일자"
                fromValue={startDate}
                toValue={endDate}
                onFromChange={setStartDate}
                onToChange={setEndDate}
              />

              <label className="col-start-1 row-start-2 grid max-w-[260px] grid-cols-1 gap-2 sm:grid-cols-[100px_140px] sm:items-center sm:gap-2 xl:col-start-2 xl:row-start-1">
                <span className="text-sm text-gray-600 sm:whitespace-nowrap">외주구분</span>
                <select
                  value={outGb}
                  onChange={(event) => setOutGb(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                >
                  <option value="">전체</option>
                  <option value="Y">외주출고</option>
                  <option value="N">입고출고</option>
                </select>
              </label>

              <div className="col-start-3 row-start-1 xl:col-start-4">
                <StatusActionButtons
                  loading={loading}
                  saving={saving}
                  disabled={busy}
                  onSearch={() => void onSearch()}
                  onSave={() => {
                    const selected = rows.find((row) => row.check);
                    if (!selected) {
                      setError('저장할 외주 입출고 데이터를 선택하세요.');
                      return;
                    }
                    setDetailRow({ ...selected });
                  }}
                  saveLabel="상세"
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: '외주입출고관리.csv',
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox tone="error">{error}</AlertBox> : null}

        <SectionCard span="full" width="full">
          <SectionHeader title="외주 입출고 목록" />
          <div className={gridScrollClass} style={{ height: gridHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.outCd ?? 'out'}-${row.rnum ?? index}-${index}`}
              showBorders={true}
              loading={busy}
              emptyText="외주 입출고 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{ table: 'min-w-[1580px] w-full text-sm' }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => Boolean(row.check)}
                onChange={(_row, rowIndex, checked) =>
                  setRows((current) => toggleRow(current, rowIndex, checked))
                }
              />
              <Column dataField="rnum" caption="순번" width={70} alignment="center" />
              <Column
                dataField="itemNm"
                caption="품명"
                width={180}
                cellRender={(row) => (
                  <ClickableCell onDoubleClick={() => setDetailRow({ ...row })}>
                    {row.itemNm ?? ''}
                  </ClickableCell>
                )}
              />
              <Column dataField="cstNm" caption="거래처명" width={160} />
              <Column
                dataField="outCd"
                caption="외주코드"
                width={130}
                alignment="center"
                cellRender={(row) => (
                  <ClickableCell onDoubleClick={() => setDetailRow({ ...row })} align="center">
                    {row.outCd ?? ''}
                  </ClickableCell>
                )}
              />
              <Column dataField="outGb" caption="외주구분" width={100} alignment="center" />
              <Column dataField="busNm" caption="업체명" width={160} />
              <Column dataField="outDt" caption="출고일자" width={120} alignment="center" />
              <Column dataField="outQty" caption="출고수량" width={110} alignment="right" />
              <Column dataField="inPrdDt" caption="입고요청일자" width={130} alignment="center" />
              <Column dataField="inDt" caption="입고일자" width={120} alignment="center" />
              <Column dataField="inQty" caption="입고수량" width={110} alignment="right" />
              <Column
                dataField="outDirYn"
                caption="외주직접출고여부"
                width={150}
                alignment="center"
                cellRender={(row) =>
                  row.outDirYn === 'Y' ? '외주출고' : row.outDirYn === 'N' ? '입고출고' : ''
                }
              />
              <Column dataField="description" caption="비고" width={240} />
            </DataGrid>
          </div>
        </SectionCard>

        {detailRow ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[88vh] w-full max-w-[860px] flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">외주 입출고 상세</h3>
                  <p className="text-sm text-slate-500">
                    외주 출고 및 입고 일정과 수량을 관리합니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canSave && (
                    <button
                      type="button"
                      onClick={() => void onSaveDetail()}
                      disabled={saving}
                      className="h-9 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    >
                      {saving ? '저장중...' : '저장'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDetailRow(null)}
                    className="h-9 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    닫기
                  </button>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-4 overflow-auto p-6 md:grid-cols-2">
                <DetailInput label="품명" value={detailRow.itemNm} readOnly />
                <DetailInput label="거래처명" value={detailRow.cstNm} readOnly />
                <DetailInput label="외주코드" value={detailRow.outCd} readOnly />
                <DetailInput label="외주구분" value={detailRow.outGb} readOnly />
                <DetailInput label="업체명" value={detailRow.busNm} readOnly />
                <DetailInput label="출고수량" value={detailRow.outQty} type="number" readOnly />
                <DetailInput
                  label="출고일자"
                  value={detailRow.outDt}
                  type="date"
                  onChange={(value) => updateDetail({ outDt: value })}
                />
                <DetailInput
                  label="입고요청일자"
                  value={detailRow.inPrdDt}
                  type="date"
                  onChange={(value) => updateDetail({ inPrdDt: value })}
                />
                <DetailInput
                  label="입고일자"
                  value={detailRow.inDt}
                  type="date"
                  onChange={(value) => updateDetail({ inDt: value })}
                />
                <DetailInput
                  label="입고수량"
                  value={detailRow.inQty}
                  type="number"
                  onChange={(value) => updateDetail({ inQty: value })}
                />

                <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:gap-3">
                  <span className="text-slate-500">직접출고여부</span>
                  <select
                    value={detailRow.outDirYn ?? ''}
                    onChange={(event) =>
                      updateDetail({ outDirYn: event.target.value as 'Y' | 'N' | '' })
                    }
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                  >
                    <option value="">선택</option>
                    <option value="Y">외주출고</option>
                    <option value="N">입고출고</option>
                  </select>
                </label>

                <DetailInput
                  label="비고"
                  value={detailRow.description}
                  onChange={(value) => updateDetail({ description: value })}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
