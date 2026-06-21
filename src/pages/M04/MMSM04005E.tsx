import { useRef, useState, type ReactNode } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ItemCodePicker from '@/components/ItemCodePicker';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { http } from '@/lib/http';
import { PAGE_SIZE, type PageableResponse } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import {
  PRODUCT_ITEM_GB,
  exportHeaders,
  getContent,
  mapExportRow,
  normalizeDetailRow,
  normalizeRow,
  patchDetailRow,
  toCustItemPayload,
  toDeletePayload,
  type ApiRow,
  type DetailRow,
  type ProductCustomerRow,
} from '@/services/m04/mmsm04005';

const productCustomerSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,446px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(300px,446px)_minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] xl:gap-x-[30px]';

function DetailInput({
  label,
  value,
  readOnly = false,
  onChange,
}: {
  label: string;
  value?: string | number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-slate-500">{label}</span>
      <input
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={`h-9 rounded-md border px-3 text-sm outline-none transition ${
          readOnly
            ? 'border-slate-100 bg-slate-50 text-slate-500'
            : 'border-slate-200 bg-white text-slate-800 focus:border-slate-400'
        }`}
      />
    </label>
  );
}

function DetailSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: 'Y' | 'N') => void;
}) {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-slate-500">{label}</span>
      <select
        value={value || 'N'}
        onChange={(event) => onChange(event.target.value as 'Y' | 'N')}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
      >
        <option value="N">일반</option>
        <option value="Y">대표</option>
      </select>
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
      title="더블클릭하여 제품 거래처 상세 보기"
    >
      <span className="truncate underline decoration-sky-300 underline-offset-4 group-hover:decoration-sky-500">
        {children}
      </span>
    </button>
  );
}

export default function MMSM04005E() {
  const { canSave, canDelete } = usePagePermissions();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [detailItemPickerOpen, setDetailItemPickerOpen] = useState(false);
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');
  const [rows, setRows] = useState<ProductCustomerRow[]>([]);
  const [detailPopupRow, setDetailPopupRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const busy = loading || saving;
  const gridHeight = Math.max(tableHeight - 58, 360);

  async function loadRows() {
    const qs = new URLSearchParams({
      itemGb: PRODUCT_ITEM_GB,
      cstCd,
      itemCd,
      itemNm,
      page: '0',
      size: '200',
    }).toString();
    const data = await http<PageableResponse<ApiRow>>(`/api/v1/mdm/item/searchItemCustList?${qs}`);
    return getContent(data)
      .map((row, index) => ({ ...normalizeRow(row), rnum: index + 1 }))
      .filter((row) => !cstCd || row.cstCd);
  }

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      setRows(await loadRows());
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function openDetail(row: ProductCustomerRow) {
    if (!row.cstCd) {
      setError('거래처가 등록되지 않은 제품입니다. 등록 버튼으로 거래처를 매핑하세요.');
      return;
    }
    setDetailPopupRow(normalizeDetailRow(row));
  }

  function openRegisterPopup() {
    if (!cstCd) {
      setError('거래처를 먼저 선택하세요.');
      return;
    }

    setError(null);
    setDetailPopupRow({
      isRegister: true,
      cstCd,
      cstNm,
      itemCd: '',
      itemNm: '',
      unitCd: '',
      unitPrice: '',
      mainYn: 'N',
    });
  }

  function updateDetailPopup(patch: Partial<DetailRow>) {
    setDetailPopupRow((prev) => (prev ? patchDetailRow(prev, patch) : prev));
  }

  async function onSaveDetail() {
    if (!detailPopupRow) {
      setError('저장할 제품 거래처 정보가 없습니다.');
      return;
    }
    if (!detailPopupRow.cstCd) {
      setError('거래처를 선택하세요.');
      return;
    }
    if (!detailPopupRow.itemCd) {
      setError('제품을 선택하세요.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await http('/api/v1/mdm/custItem', {
        method: 'POST',
        body: toCustItemPayload(detailPopupRow),
      });
      await onSearch();
      window.alert(detailPopupRow.isRegister ? '제품 거래처가 등록되었습니다.' : '저장되었습니다.');
      setDetailPopupRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteDetail() {
    if (!detailPopupRow || detailPopupRow.isRegister) return;
    if (!window.confirm('선택한 제품 거래처 매핑을 삭제하시겠습니까?')) return;

    setSaving(true);
    setError(null);

    try {
      await http('/api/v1/mdm/custItem', {
        method: 'POST',
        body: toDeletePayload(detailPopupRow),
      });
      await onSearch();
      window.alert('삭제되었습니다.');
      setDetailPopupRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={productCustomerSearchGridClass}>
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

              <div className="col-start-3 row-start-1 xl:col-start-4">
                <StatusActionButtons
                  loading={loading}
                  saving={saving}
                  disabled={busy}
                  onSearch={() => void onSearch()}
                  onSave={() => void openRegisterPopup()}
                  saveLabel="등록"
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `제품거래처관리.csv`,
                  }}
                />
              </div>

              <div className="col-start-1 row-start-2 xl:col-start-2 xl:row-start-1">
                <CodeNameField
                  label="제품"
                  id="item"
                  code={itemCd}
                  name={itemNm}
                  codePlaceholder="코드"
                  namePlaceholder="제품명"
                  onSearch={() => setItemPickerOpen(true)}
                  onClear={() => {
                    setItemCd('');
                    setItemNm('');
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox tone="error">{error}</AlertBox> : null}

        <SectionCard span="full" width="full">
          <SectionHeader title="제품 거래처 목록" />
          <div className={gridScrollClass} style={{ height: gridHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.cstCd ?? 'cust'}-${row.itemCd ?? 'item'}-${index}`}
              showBorders={true}
              loading={busy}
              emptyText="제품 거래처 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{ table: 'min-w-[1080px] w-full text-sm' }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <Column
                dataField="itemCd"
                caption="제품코드"
                width={130}
                alignment="center"
                cellRender={(row) => (
                  <ClickableCell onDoubleClick={() => openDetail(row)} align="center">
                    {row.itemCd ?? ''}
                  </ClickableCell>
                )}
              />
              <Column
                dataField="itemNm"
                caption="제품명"
                width={220}
                cellRender={(row) => (
                  <ClickableCell onDoubleClick={() => openDetail(row)}>
                    {row.itemNm ?? ''}
                  </ClickableCell>
                )}
              />
              <Column dataField="unitCd" caption="단위" width={90} alignment="center" />
              <Column dataField="cstCd" caption="거래처코드" width={130} alignment="center" />
              <Column dataField="cstNm" caption="거래처명" width={220} />
              <Column dataField="unitPrice" caption="단가" width={120} alignment="right" />
              <Column
                dataField="mainYn"
                caption="대표여부"
                width={100}
                alignment="center"
                cellRender={(row) => (row.mainYn === 'Y' ? '대표' : '일반')}
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

        {itemPickerOpen ? (
          <ItemCodePicker
            title="제품 정보"
            itemGb={PRODUCT_ITEM_GB}
            itemNm={itemNm}
            onClose={() => setItemPickerOpen(false)}
            onSelect={(value) => {
              setItemCd(value.itemCd);
              setItemNm(value.itemNm);
            }}
          />
        ) : null}

        {detailPopupRow ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[88vh] w-full max-w-[760px] flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {detailPopupRow.isRegister ? '제품 거래처 등록' : '제품 거래처 상세'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    제품과 거래처의 단가 및 대표 여부를 관리합니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!detailPopupRow.isRegister && canDelete ? (
                    <button
                      type="button"
                      onClick={() => void onDeleteDetail()}
                      disabled={saving}
                      className="h-9 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  ) : null}
                  {canSave && (
                    <button
                      type="button"
                      onClick={() => void onSaveDetail()}
                      disabled={saving}
                      className="h-9 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                    >
                      {saving ? '저장중...' : detailPopupRow.isRegister ? '등록' : '저장'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDetailPopupRow(null)}
                    className="h-9 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    닫기
                  </button>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-4 overflow-auto p-6 md:grid-cols-2">
                <DetailInput label="거래처코드" value={detailPopupRow.cstCd} readOnly />
                <DetailInput label="거래처명" value={detailPopupRow.cstNm} readOnly />
                {detailPopupRow.isRegister ? (
                  <div className="md:col-span-2">
                    <CodeNameField
                      label="제품"
                      id="detail-item"
                      code={detailPopupRow.itemCd ?? ''}
                      name={detailPopupRow.itemNm ?? ''}
                      codePlaceholder="코드"
                      namePlaceholder="제품명"
                      onSearch={() => setDetailItemPickerOpen(true)}
                      onClear={() => updateDetailPopup({ itemCd: '', itemNm: '', unitCd: '' })}
                    />
                  </div>
                ) : (
                  <>
                    <DetailInput label="제품코드" value={detailPopupRow.itemCd} readOnly />
                    <DetailInput label="제품명" value={detailPopupRow.itemNm} readOnly />
                  </>
                )}
                <DetailInput label="단위" value={detailPopupRow.unitCd} readOnly />
                <DetailInput
                  label="단가"
                  value={detailPopupRow.unitPrice}
                  onChange={(value) => updateDetailPopup({ unitPrice: value })}
                />
                <DetailSelect
                  label="대표여부"
                  value={detailPopupRow.mainYn}
                  onChange={(value) => updateDetailPopup({ mainYn: value })}
                />
              </div>
            </div>
          </div>
        ) : null}

        {detailItemPickerOpen ? (
          <ItemCodePicker
            title="제품 정보"
            itemGb={PRODUCT_ITEM_GB}
            itemNm={detailPopupRow?.itemNm ?? ''}
            onClose={() => setDetailItemPickerOpen(false)}
            onSelect={(value) => {
              updateDetailPopup({
                itemCd: value.itemCd,
                itemNm: value.itemNm,
                unitCd: value.unitCd,
              });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
