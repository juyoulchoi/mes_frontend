import { useEffect, useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import DateEdit from '@/components/DateEdit';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import {
  exportHeaders,
  fetchRows,
  mapExportRow,
  patchRow,
  saveRows,
  toggleRow as toggleGridRow,
  toYmd,
  type GridInputProps,
  type Row,
} from '@/services/m04/mmsm04006';

type productIssueSearchLayoutMode = 'compact' | 'twoRow' | 'wide';

const productIssueSearchGridClass =
  'grid min-w-[892px] grid-cols-[minmax(0,1fr)_max-content] items-start gap-2 xl:gap-x-[30px]';
const productIssueSearchFieldGridClass: Record<productIssueSearchLayoutMode, string> = {
  compact:
    'col-start-1 row-start-1 grid min-w-[892px] grid-cols-[repeat(2,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
  twoRow:
    'col-start-1 row-start-1 grid min-w-[892px] grid-cols-[repeat(2,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
  wide: 'col-start-1 row-start-1 grid min-w-[1338px] grid-cols-[repeat(3,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
};
const productIssueDateFieldClass: Record<productIssueSearchLayoutMode, string> = {
  compact: 'col-start-1 row-start-1 min-w-0',
  twoRow: 'col-start-1 row-start-1 min-w-0',
  wide: 'col-start-1 row-start-1 min-w-0',
};
const productIssueCustomerFieldClass: Record<productIssueSearchLayoutMode, string> = {
  compact: 'col-start-1 row-start-2 min-w-0',
  twoRow: 'col-start-2 row-start-1 min-w-0',
  wide: 'col-start-2 row-start-1 min-w-0',
};
const productIssueSequenceFieldClass: Record<productIssueSearchLayoutMode, string> = {
  compact:
    'col-start-2 row-start-2 grid w-full min-w-0 max-w-[446px] grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center sm:gap-2',
  twoRow:
    'col-start-1 row-start-2 grid w-full min-w-0 max-w-[446px] grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center sm:gap-2',
  wide: 'col-start-3 row-start-1 grid w-full min-w-0 max-w-[446px] grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center sm:gap-2',
};
const productIssueSearchActionsClass = 'col-start-2 row-start-1 flex min-w-max justify-end';
const productIssueTwoRowMinWidth = 1280;
const productIssueWideMinWidth = 1640;
const sequenceInputClass =
  'h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400';

function GridInput({ value, type = 'text', align = 'left', onChange }: GridInputProps) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-slate-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    />
  );
}

export default function MMSM04006E() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [inDate, setInDate] = useState(getTodayYmd());
  const [seq, setSeq] = useState('');
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);
  const [searchWidth, setSearchWidth] = useState(0);

  const busy = loading || saving;
  const gridHeight = Math.max(tableHeight - 58, 360);

  useEffect(() => {
    const searchElement = searchRef.current;
    if (!searchElement) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSearchWidth(entry.contentRect.width);
    });
    setSearchWidth(searchElement.clientWidth);
    resizeObserver.observe(searchElement);

    return () => resizeObserver.disconnect();
  }, []);

  async function loadRows() {
    return fetchRows({
      inDate,
      seq,
      cstCd,
    });
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

  function toggleRow(rowIndex: number, checked: boolean) {
    setRows((currentRows) => toggleGridRow(currentRows, rowIndex, checked));
  }

  function updateRow(rowIndex: number, patch: Partial<Row>) {
    setRows((currentRows) => patchRow(currentRows, rowIndex, patch));
  }

  async function onSave() {
    const targets = rows.filter((row) => row.CHECK);
    if (targets.length === 0) {
      setError('저장할 출고 지시 데이터가 없습니다.');
      return;
    }
    if (!window.confirm(`선택한 ${targets.length}건을 저장하시겠습니까?`)) return;

    setSaving(true);
    setError(null);

    try {
      await saveRows(targets);
      setRows(await loadRows());
      window.alert('저장되었습니다.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  }

  const searchLayoutMode: productIssueSearchLayoutMode =
    searchWidth >= productIssueWideMinWidth
      ? 'wide'
      : searchWidth >= productIssueTwoRowMinWidth
        ? 'twoRow'
        : 'compact';
  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div ref={searchRef} className="overflow-x-auto pb-1">
            <div className={productIssueSearchGridClass}>
              <div className={productIssueSearchFieldGridClass[searchLayoutMode]}>
                <div className={productIssueDateFieldClass[searchLayoutMode]}>
                  <DateEdit label="입고일자" value={inDate} onChange={setInDate} />
                </div>

                <div className={productIssueCustomerFieldClass[searchLayoutMode]}>
                  <CodeNameField
                    label="거래처"
                    id="cust"
                    code={cstCd}
                    name={cstNm}
                    codePlaceholder="코드"
                    namePlaceholder="거래처명"
                    onSearch={() => setCustomerOpen(true)}
                    onClear={() => {
                      setCstCd('');
                      setCstNm('');
                    }}
                  />
                </div>

                <label className={productIssueSequenceFieldClass[searchLayoutMode]}>
                  <span className="text-sm text-gray-600 sm:whitespace-nowrap">순번</span>
                  <input
                    value={seq}
                    onChange={(event) => setSeq(event.target.value)}
                    className={sequenceInputClass}
                  />
                </label>
              </div>

              <div className={productIssueSearchActionsClass}>
                <StatusActionButtons
                  loading={loading}
                  saving={saving}
                  disabled={busy}
                  onSearch={() => void onSearch()}
                  onSave={() => void onSave()}
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `제품출고지시_${toYmd(inDate)}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox tone="error">{error}</AlertBox> : null}

        <SectionCard span="full" width="full">
          <SectionHeader title="제품 출고 지시 목록" />
          <div className={gridScrollClass} style={{ height: gridHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.ITEM_CD ?? 'item'}-${row.RNUM ?? index}-${index}`}
              showBorders={true}
              loading={busy}
              emptyText="제품 출고 지시 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{ table: 'min-w-[1280px] w-full text-sm' }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => toggleRow(rowIndex, checked)}
              />
              <Column dataField="RNUM" caption="순번" width={80} alignment="center" />
              <Column dataField="ITEM_CD" caption="품목코드" width={140} alignment="center" />
              <Column dataField="ITEM_NM" caption="품목명" width={220} />
              <Column
                dataField="UNIT_CD"
                caption="단위"
                width={100}
                alignment="center"
                cellRender={(row, rowIndex) => (
                  <GridInput
                    value={row.UNIT_CD}
                    onChange={(value) => updateRow(rowIndex, { UNIT_CD: value })}
                  />
                )}
              />
              <Column
                dataField="QTY"
                caption="수량"
                width={120}
                alignment="right"
                cellRender={(row, rowIndex) => (
                  <GridInput
                    type="number"
                    align="right"
                    value={row.QTY}
                    onChange={(value) => updateRow(rowIndex, { QTY: value })}
                  />
                )}
              />
              <Column
                dataField="GI_PLAN_QTY"
                caption="출고지시량"
                width={130}
                alignment="right"
                cellRender={(row: Row) => row.GI_PLAN_QTY ?? row.PLAN_QTY ?? ''}
              />
              <Column dataField="GI_QTY" caption="기출고량" width={120} alignment="right" />
              <Column
                dataField="REM_QTY"
                caption="잔량"
                width={120}
                alignment="right"
                cellRender={(row: Row) => row.REM_QTY ?? row.BAL_QTY ?? ''}
              />
              <Column
                dataField="DESC"
                caption="비고"
                width={260}
                cellRender={(row, rowIndex) => (
                  <GridInput
                    value={row.DESC}
                    onChange={(value) => updateRow(rowIndex, { DESC: value })}
                  />
                )}
              />
            </DataGrid>
          </div>
        </SectionCard>

        {customerOpen ? (
          <CustomerCodePicker
            title="거래처 정보"
            custGb="CUSTOMER"
            cstCd={cstCd}
            cstNm={cstNm}
            onClose={() => setCustomerOpen(false)}
            onSelect={(value) => {
              setCstCd(value.cstCd);
              setCstNm(value.cstNm);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
