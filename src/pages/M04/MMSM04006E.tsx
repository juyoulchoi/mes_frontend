import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import DateEdit from '@/components/DateEdit';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE, type PageableResponse } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';

type Row = {
  CHECK?: boolean;
  RNUM?: string | number;
  GI_YMD?: string;
  GI_SEQ?: number;
  GI_SUB_SEQ?: number;
  SO_YMD?: string;
  SO_SEQ?: number;
  SO_SUB_SEQ?: number;
  ITEM_CD?: string;
  ITEM_NM?: string;
  UNIT_CD?: string;
  QTY?: string | number;
  GI_PLAN_QTY?: string | number;
  PLAN_QTY?: string | number;
  GI_QTY?: string | number;
  REM_QTY?: string | number;
  BAL_QTY?: string | number;
  DESC?: string;
  STATUS?: string;
};

type ApiRow = {
  giYmd?: string;
  giSeq?: number;
  giSubSeq?: number;
  soYmd?: string;
  soSeq?: number;
  soSubSeq?: number;
  itemCd?: string;
  itemNm?: string;
  qty?: string | number;
  unitCd?: string;
  description?: string;
  status?: string;
};

type SoStatusRow = {
  soNo?: string;
  qty?: string | number;
  outQty?: string | number;
};

const exportHeaders = [
  '순번',
  '품목코드',
  '품목명',
  '단위',
  '수량',
  '출고지시량',
  '기출고량',
  '잔량',
  '비고',
];

function mapExportRow(row: Row) {
  return [
    row.RNUM ?? '',
    row.ITEM_CD ?? '',
    row.ITEM_NM ?? '',
    row.UNIT_CD ?? '',
    row.QTY ?? '',
    row.GI_PLAN_QTY ?? row.PLAN_QTY ?? '',
    row.GI_QTY ?? '',
    row.REM_QTY ?? row.BAL_QTY ?? '',
    row.DESC ?? '',
  ];
}

function toYmd(value: string) {
  return value.split('-').join('');
}

function toNumber(value: string | number | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function GridInput({
  value,
  type = 'text',
  align = 'left',
  onChange,
}: {
  value?: string | number;
  type?: 'text' | 'number';
  align?: 'left' | 'right';
  onChange: (value: string) => void;
}) {
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
  const tableHeight = useAutoTableHeight(containerRef);

  const busy = loading || saving;
  const gridHeight = Math.max(tableHeight - 58, 360);

  async function loadRows() {
    const qs = new URLSearchParams({
      giYmdS: toYmd(inDate),
      giYmdE: toYmd(inDate),
      cstCd,
      page: '0',
      size: '200',
    }).toString();
    const data = await http<PageableResponse<ApiRow>>(`/api/v1/material/gidet/search?${qs}`);
    const content = Array.isArray(data) ? data : (data.content ?? []);
    const soDates = content.map((row) => row.soYmd).filter((value): value is string => !!value);
    const soStatusRows =
      soDates.length > 0
        ? await http<SoStatusRow[]>(
            `/api/v1/sales/findSoStatusList?${new URLSearchParams({
              startDate: soDates.reduce((min, value) => (value < min ? value : min)),
              endDate: soDates.reduce((max, value) => (value > max ? value : max)),
              cstNm: '',
              itemNm: '',
            }).toString()}`
          )
        : [];
    const soStatusMap = new Map(
      (Array.isArray(soStatusRows) ? soStatusRows : []).map((row) => [row.soNo ?? '', row])
    );

    return content
      .filter((row) => !seq || String(row.giSeq ?? '') === seq.trim())
      .map((row, index) => {
        const soNo =
          row.soYmd && row.soSeq !== undefined && row.soSubSeq !== undefined
            ? `${row.soYmd}-${row.soSeq}-${row.soSubSeq}`
            : '';
        const status = soStatusMap.get(soNo);
        const currentQty = toNumber(row.qty);
        const totalIssuedQty = status ? toNumber(status.outQty) : currentQty;
        const orderQty = status ? toNumber(status.qty) : currentQty;

        return {
          CHECK: false,
          RNUM: index + 1,
          GI_YMD: row.giYmd,
          GI_SEQ: row.giSeq,
          GI_SUB_SEQ: row.giSubSeq,
          SO_YMD: row.soYmd,
          SO_SEQ: row.soSeq,
          SO_SUB_SEQ: row.soSubSeq,
          ITEM_CD: row.itemCd,
          ITEM_NM: row.itemNm,
          UNIT_CD: row.unitCd,
          QTY: row.qty,
          GI_PLAN_QTY: currentQty,
          GI_QTY: Math.max(totalIssuedQty - currentQty, 0),
          REM_QTY: Math.max(orderQty - totalIssuedQty, 0),
          DESC: row.description ?? '',
          STATUS: row.status,
        };
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
    setRows((currentRows) =>
      currentRows.map((row, index) => (index === rowIndex ? { ...row, CHECK: checked } : row))
    );
  }

  function updateRow(rowIndex: number, patch: Partial<Row>) {
    setRows((currentRows) =>
      currentRows.map((row, index) => {
        if (index !== rowIndex) return row;

        if (Object.prototype.hasOwnProperty.call(patch, 'QTY')) {
          const nextQty = toNumber(patch.QTY);
          const availableQty = toNumber(row.GI_PLAN_QTY) + toNumber(row.REM_QTY);
          return {
            ...row,
            ...patch,
            GI_PLAN_QTY: nextQty,
            REM_QTY: Math.max(availableQty - nextQty, 0),
            CHECK: true,
          };
        }

        return { ...row, ...patch, CHECK: true };
      })
    );
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
      await Promise.all(
        targets.map((row) =>
          http('/api/v1/material/gidet', {
            method: 'POST',
            body: {
              method: 'U',
              isNew: 'N',
              giYmd: row.GI_YMD,
              giSeq: row.GI_SEQ,
              giSubSeq: row.GI_SUB_SEQ,
              soYmd: row.SO_YMD,
              soSeq: row.SO_SEQ,
              soSubSeq: row.SO_SUB_SEQ,
              itemCd: row.ITEM_CD,
              unitCd: row.UNIT_CD,
              qty: row.QTY,
              description: row.DESC,
              status: row.STATUS,
            },
          })
        )
      );
      setRows(await loadRows());
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
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <DateEdit label="입고일자" value={inDate} onChange={setInDate} />

            <label className="grid w-[240px] grid-cols-[80px_150px] items-center gap-3">
              <span className="text-sm text-gray-600">순번</span>
              <input
                value={seq}
                onChange={(event) => setSeq(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
              />
            </label>

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

            <div className="ml-auto">
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
