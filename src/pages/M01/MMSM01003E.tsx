import CodeNameField from '@/components/CodeNameField';
import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import DateEdit from '@/components/DateEdit';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { patchCheckedRow } from '@/lib/gridRows';
import { http } from '@/lib/http';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { formatNumber } from '@/lib/utils';
import { updateCheckedRows } from '@/lib/gridRows';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  buildMmsm01003SavePayload,
  type AuthMeResponse,
  type DetailRow,
  type SearchForm,
} from '@/services/m01/mmsm01003';
import { useEffect, useState } from 'react';

type PurchaseRow = Record<string, unknown> & {
  CHECK?: boolean;
  poYmd?: string;
  poSeq?: number | string;
  poSubSeq?: number | string;
  rcptStat?: string;
  rcptStatNm?: string;
  preIvQty?: number | string;
  ivQty?: number | string;
  remQty?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
};

type ReceivableDetailRow = DetailRow & {
  rcptStat?: string;
  rcptStatNm?: string;
  orderQty?: number | string;
  preIvQty?: number | string;
  ivQty?: number | string;
  remQty?: number | string;
};

const receiptRegisterSearchGridClass =
  'grid min-w-[920px] grid-cols-[296px_150px_minmax(0,1fr)_max-content] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[296px_446px_minmax(0,1fr)_max-content] xl:gap-x-[30px]';

const PURCHASE_SEARCH_START_DATE = '19000101';

function pickValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  const value = pickValue(source, keys);
  return value === undefined ? undefined : String(value);
}

function pickNumberLike(source: Record<string, unknown>, keys: string[]) {
  const value = pickValue(source, keys);
  return value === undefined ? undefined : String(value);
}

function toNumber(value: number | string | undefined) {
  if (value === undefined || value === '') return 0;

  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function getOrderQty(row: PurchaseRow | ReceivableDetailRow) {
  const qty = toNumber(row.qty);
  if (qty > 0) return qty;

  return toNumber(row.preIvQty) + toNumber(row.ivQty) + toNumber(row.remQty);
}

function getReceivedQty(row: PurchaseRow | ReceivableDetailRow) {
  return toNumber(row.preIvQty) + toNumber(row.ivQty);
}

function formatQty(value: number | string | undefined) {
  return formatNumber(toNumber(value));
}

function isReceivablePurchase(row: PurchaseRow) {
  const rcptStat = row.rcptStat ?? '';
  return toNumber(row.remQty) > 0 || rcptStat === 'NONE' || rcptStat === 'PART';
}

function normalizePurchaseRow(row: PurchaseRow): PurchaseRow {
  return {
    ...row,
    poYmd: pickString(row, ['poYmd', 'PO_YMD']) ?? row.poYmd,
    poSeq: pickString(row, ['poSeq', 'PO_SEQ']) ?? row.poSeq,
    poSubSeq: pickString(row, ['poSubSeq', 'PO_SUB_SEQ']) ?? row.poSubSeq,
    rcptStat: pickString(row, ['rcptStat', 'RCPT_STAT']) ?? row.rcptStat,
    rcptStatNm: pickString(row, ['rcptStatNm', 'RCPT_STAT_NM']) ?? row.rcptStatNm,
    preIvQty:
      pickNumberLike(row, [
        'preIvQty',
        'PRE_IV_QTY',
        'prevIvQty',
        'PREV_IV_QTY',
        'preInQty',
        'PRE_IN_QTY',
      ]) ?? row.preIvQty,
    ivQty: pickNumberLike(row, ['ivQty', 'IV_QTY']) ?? row.ivQty,
    remQty:
      pickNumberLike(row, ['remQty', 'REM_QTY', 'remainQty', 'REMAIN_QTY', 'balQty', 'BAL_QTY']) ??
      row.remQty,
    itemCd: pickString(row, ['itemCd', 'ITEM_CD']) ?? row.itemCd,
    itemNm: pickString(row, ['itemNm', 'ITEM_NM']) ?? row.itemNm,
    unitCd: pickString(row, ['unitCd', 'UNIT_CD']) ?? row.unitCd,
    qty: pickNumberLike(row, ['qty', 'QTY', 'poQty', 'PO_QTY']) ?? row.qty,
    price:
      pickNumberLike(row, ['price', 'poPrice', 'unitPrice', 'PRICE', 'PO_PRICE', 'UNIT_PRICE']) ??
      row.price,
    amt: pickNumberLike(row, ['amt', 'poAmt', 'totAmt', 'AMT', 'PO_AMT', 'TOT_AMT']) ?? row.amt,
  };
}

function formatPurchaseDate(row: PurchaseRow | ReceivableDetailRow) {
  const ymd = String(row.poYmd ?? '');
  const date = /^\d{8}$/.test(ymd)
    ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
    : ymd;
  const seq = [row.poSeq, row.poSubSeq].filter(Boolean).join('-');

  return { date, seq };
}

export default function MMSM01003E() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [detailRows, setDetailRows] = useState<ReceivableDetailRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SearchForm>(() => ({
    ivDate: getTodayYmd(),
    cstCd: '',
  }));

  const {
    result: masterResult,
    loading: masterLoading,
    error: masterError,
    fetchList: fetchMasterList,
  } = usePageApiFetch<SearchForm, PurchaseRow>({
    apiPath: '/api/v1/material/pomst/search',
    form,
    pageSize: 100,
    mapParams: ({ form: currentForm }) => ({
      poYmdS: PURCHASE_SEARCH_START_DATE,
      poYmdE: currentForm.ivDate.split('-').join(''),
      cstCd: currentForm.cstCd || '',
      itemCd: '',
      itemGb: '',
    }),
  });

  async function onSearch() {
    if (!form.cstCd) {
      window.alert('거래처는 조회 필수값입니다.');
      return;
    }

    setSaveError(null);
    await fetchMasterList(0);
  }

  const isSearch = masterLoading || saving;
  const isSave = masterLoading || saving;

  useEffect(() => {
    setDetailRows(
      masterResult.content
        .map((row) => normalizePurchaseRow(row))
        .filter((row) => isReceivablePurchase(row))
        .map((row, index) => ({
          CHECK: false,
          method: 'I' as const,
          ivSubSeq: index + 1,
          poYmd: row.poYmd ?? '',
          poSeq: row.poSeq ?? '',
          poSubSeq: row.poSubSeq ?? '',
          rcptStat: row.rcptStat,
          rcptStatNm: row.rcptStatNm,
          orderQty: getOrderQty(row),
          preIvQty: row.preIvQty,
          ivQty: row.ivQty,
          remQty: row.remQty,
          itemCd: row.itemCd ?? '',
          itemNm: row.itemNm ?? '',
          unitCd: row.unitCd ?? '',
          qty: row.remQty ?? row.qty ?? '',
          price: row.price ?? '',
          amt: row.amt ?? '',
          description: '',
        }))
    );
  }, [masterResult.content]);

  function toggleDetail(rowIndex: number, checked: boolean) {
    updateCheckedRows(setDetailRows, rowIndex, checked);
  }

  function onDetailChange(rowIndex: number, patch: Partial<DetailRow>) {
    setDetailRows((prev) =>
      patchCheckedRow(prev, rowIndex, {
        ...patch,
        method: prev[rowIndex]?.method === 'I' ? 'I' : 'U',
      })
    );
  }

  async function onSave() {
    const selectedRows = detailRows.filter((row) => row.CHECK);

    if (selectedRows.length === 0) {
      setSaveError('저장할 데이터가 없습니다.');
      return;
    }

    if (!form.cstCd) {
      setSaveError('거래처를 선택하세요.');
      return;
    }

    if (!window.confirm('저장 하시겠습니까?')) return;

    setSaving(true);
    setSaveError(null);

    try {
      const me = await http<AuthMeResponse>('/api/v1/auth/me');
      const userId = (
        me.user?.userid ??
        me.user?.userId ??
        me.data?.user?.userid ??
        me.data?.user?.userId ??
        ''
      ).trim();

      if (!userId) {
        setSaveError('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 시도하세요.');
        return;
      }

      const payload = buildMmsm01003SavePayload({
        form,
        detailRows: selectedRows,
        deletedDetailRows: [],
        userId,
      });

      await http('/api/v1/material/ivmst/savePayload', { method: 'POST', body: payload });
      await fetchMasterList(0);
      window.alert('저장되었습니다.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={receiptRegisterSearchGridClass}>
              <DateEdit
                label="입고일자"
                value={form.ivDate}
                onChange={(value) => setForm((prev) => ({ ...prev, ivDate: value }))}
              />
              <div className="col-span-2 col-start-1 row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
                <CodeNameField
                  label="거래처"
                  id="cust"
                  code={form.cstCd}
                  name={cstNm}
                  codePlaceholder="코드"
                  namePlaceholder="거래처명"
                  onSearch={() => setCustomerOpen(true)}
                  onClear={() => {
                    setCstNm('');
                    setForm((prev) => ({ ...prev, cstCd: '' }));
                  }}
                />
              </div>
              <div className="col-start-4 row-start-1">
                <ActionButtonGroup
                  onSearch={onSearch}
                  onSave={() => onSave()}
                  onUpload={() => undefined}
                  onExport={() => undefined}
                  searchDisabled={isSearch}
                  saveDisabled={isSave}
                  showUpload={false}
                  showExport={false}
                  compact
                  className="flex flex-wrap content-end items-end justify-end gap-2 self-end"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {(masterError || saveError) && <AlertBox tone="error">{masterError ?? saveError}</AlertBox>}

        <div className="grid grid-cols-12 gap-4">
          <SectionCard span="full" width="full">
            <SectionHeader title="입고 등록" />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) =>
                  `${row.poYmd ?? 'po'}-${row.poSeq ?? 'seq'}-${row.poSubSeq ?? 'sub'}-${row.itemCd ?? 'item'}-${index}`
                }
                emptyText="입고 등록 가능한 미입고 원자재가 없습니다."
                classNames={{
                  table: 'min-w-[1040px] w-full text-sm',
                }}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
                />
                <Column
                  dataField="poYmd"
                  caption="발주일자"
                  width={120}
                  alignment="center"
                  cellRender={(row: ReceivableDetailRow) => {
                    const purchase = formatPurchaseDate(row);
                    return (
                      <div className="leading-tight">
                        <div className="font-medium text-slate-800">{purchase.date}</div>
                        {purchase.seq ? (
                          <div className="text-xs text-slate-500">#{purchase.seq}</div>
                        ) : null}
                      </div>
                    );
                  }}
                />
                <Column dataField="itemCd" caption="원자재코드" width={90} alignment="center" />
                <Column dataField="itemNm" caption="원자재명" width={220} />
                <Column dataField="unitCd" caption="단위" width={60} alignment="center" />
                <Column
                  dataField="qty"
                  caption="발주수량"
                  width={90}
                  alignment="right"
                  cellRender={(row: ReceivableDetailRow) => formatQty(row.orderQty)}
                />
                <Column
                  dataField="preIvQty"
                  caption="기입고"
                  width={80}
                  alignment="right"
                  cellRender={(row: ReceivableDetailRow) => formatNumber(getReceivedQty(row))}
                />
                <Column
                  dataField="remQty"
                  caption="잔량"
                  width={80}
                  alignment="right"
                  cellRender={(row: ReceivableDetailRow) => (
                    <span className="font-semibold text-emerald-700">{formatQty(row.remQty)}</span>
                  )}
                />
                <Column
                  dataField="qty"
                  caption="입고수량"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2 text-right"
                      value={row.qty ?? ''}
                      onChange={(e) => onDetailChange(rowIndex, { qty: e.target.value })}
                    />
                  )}
                />
              </DataGrid>
            </div>
          </SectionCard>
        </div>

        <SearchCodePickers
          customer={{
            open: customerOpen,
            title: '거래처 정보',
            custGb: 'SUPPLIER',
            cstCd: form.cstCd,
            cstNm,
            onClose: () => setCustomerOpen(false),
            onSelect: (value) => {
              setCstNm(value.cstNm);
              setForm((prev) => ({ ...prev, cstCd: value.cstCd }));
            },
          }}
        />
      </div>
    </div>
  );
}
