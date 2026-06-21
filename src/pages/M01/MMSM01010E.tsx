import { useRef, useState, type ReactNode } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import StatusActionButtons from '@/components/StatusActionButtons';
import { http } from '@/lib/http';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { PAGE_SIZE, type PageableResponse } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import {
  formatRegNo,
  formatStatus,
  getContent,
  normalizeCustomerRow,
  normalizeMasterRow,
  onlyDigits,
  patchCustomerRow,
  toCustInfoPayload,
  exportHeaders,
  mapExportRow,
  type CustomerApiRow,
  type DetailRow,
  type MasterRow,
} from '@/services/m01/mmsm01010';

const customerOnlySearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,420px)_minmax(16px,1fr)_minmax(300px,420px)] items-end gap-2';

function DetailInput({
  label,
  value,
  readOnly = false,
  maxLength,
  onChange,
}: {
  label: string;
  value?: string;
  readOnly?: boolean;
  maxLength?: number;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-slate-500">{label}</span>
      <input
        value={value ?? ''}
        readOnly={readOnly}
        maxLength={maxLength}
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

function DetailTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
      <span className="pt-2 text-slate-500">{label}</span>
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[76px] resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
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
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-slate-500">{label}</span>
      <select
        value={value || 'ACTIVE'}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
      >
        <option value="ACTIVE">활성</option>
        <option value="INACTIVE">비활성화</option>
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
      className={`group inline-flex min-h-7 w-full items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-sky-700 transition hover:text-sky-800 focus:outline-none ${
        align === 'center' ? 'justify-center text-center' : 'justify-start text-left'
      }`}
      title="더블클릭하여 거래처 상세 보기"
    >
      <span className="truncate underline decoration-sky-300 underline-offset-4 group-hover:decoration-sky-500">
        {children}
      </span>
    </button>
  );
}

export default function MMSM01010E() {
  const { canSave } = usePagePermissions();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detailPopupRow, setDetailPopupRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const busy = loading || saving;
  const gridHeight = Math.max(tableHeight - 58, 360);

  async function loadMaster() {
    const qs = new URLSearchParams({
      custGb: 'CUSTOMER',
      cstNm: cstNm || '',
      page: '0',
      size: '200',
    }).toString();
    const data = await http<PageableResponse<CustomerApiRow>>(`/api/v1/mdm/cust/search?${qs}`);
    return getContent(data).map((row) => normalizeMasterRow(row));
  }

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      setMaster(await loadMaster());
    } catch (e) {
      setMaster([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function openCustomerDetail(row: MasterRow | DetailRow) {
    setDetailPopupRow(normalizeCustomerRow(row));
  }

  function updateDetailPopup(patch: Partial<DetailRow>) {
    setDetailPopupRow((prev) => (prev ? patchCustomerRow(prev, patch) : prev));
  }

  function openRegisterPopup() {
    setError(null);
    setDetailPopupRow({
      isRegister: true,
      cstCd: '',
      cstNm: '',
      custGb: 'CUSTOMER',
      ceoNm: '',
      mgrNm: '',
      telNo: '',
      mgrTel: '',
      email: '',
      faxNo: '',
      regNo: '',
      postNo: '',
      addr: '',
      status: 'ACTIVE',
    });
  }

  async function onSaveCustomerDetail() {
    if (!detailPopupRow) {
      setError('저장할 거래처 정보가 없습니다.');
      return;
    }

    if (!detailPopupRow.isRegister && !detailPopupRow.cstCd) {
      setError('거래처 코드가 없는 상세 정보는 저장할 수 없습니다.');
      return;
    }

    if (!detailPopupRow.cstNm) {
      setError('거래처명은 필수입니다.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await http('/api/v1/mdm/cust', {
        method: 'POST',
        body: toCustInfoPayload(detailPopupRow),
      });

      if (detailPopupRow.isRegister) {
        await onSearch();
        window.alert('거래처가 등록되었습니다.');
        setDetailPopupRow(null);
        return;
      }

      setMaster((prev) =>
        prev.map((row) =>
          row.cstCd === detailPopupRow.cstCd ? patchCustomerRow(row, detailPopupRow) : row
        )
      );
      if (cstCd === detailPopupRow.cstCd) {
        setCstNm(detailPopupRow.cstNm ?? '');
      }

      window.alert('거래처 상세 정보가 저장되었습니다.');
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
            <div className={customerOnlySearchGridClass}>
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

              <div className="col-start-3 row-start-1 min-w-[300px]">
                <StatusActionButtons
                  loading={loading}
                  onSearch={() => void onSearch()}
                  onSave={() => void openRegisterPopup()}
                  saveLabel="등록"
                  exportProps={{
                    rows: master,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `거래처관리.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox tone="error">{error}</AlertBox> : null}

        <SectionCard span="full" width="full">
          <SectionHeader title="거래처 목록" />
          <div className={gridScrollClass} style={{ height: gridHeight }}>
            <DataGrid
              dataSource={master}
              rowKey={(row, index) => `${row.cstCd ?? row.itemCd ?? 'master'}-${index}`}
              showBorders={true}
              loading={busy}
              classNames={{ table: 'min-w-[1120px] w-full text-sm' }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <Column
                dataField="cstCd"
                caption="거래처코드"
                width={140}
                alignment="center"
                cellRender={(row) => (
                  <ClickableCell onDoubleClick={() => openCustomerDetail(row)} align="center">
                    {row.cstCd ?? ''}
                  </ClickableCell>
                )}
              />
              <Column
                dataField="cstNm"
                caption="거래처명"
                width={220}
                cellRender={(row) => (
                  <ClickableCell onDoubleClick={() => openCustomerDetail(row)}>
                    {row.cstNm ?? ''}
                  </ClickableCell>
                )}
              />
              <Column dataField="custGb" caption="구분" width={100} alignment="center" />
              <Column dataField="ceoNm" caption="대표자명" width={120} />
              <Column dataField="mgrNm" caption="담당자" width={120} />
              <Column dataField="telNo" caption="전화번호" width={140} />
              <Column
                dataField="status"
                caption="상태"
                width={100}
                alignment="center"
                cellRender={(row) => formatStatus(row.status)}
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

        {detailPopupRow ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[88vh] w-full max-w-[930px] flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {detailPopupRow.isRegister ? '거래처 등록' : '거래처 상세'}
                  </h3>
                  {detailPopupRow.isRegister ? (
                    <p className="text-sm text-slate-500">거래처 코드는 저장 시 자동 생성됩니다.</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {canSave && (
                    <button
                      type="button"
                      onClick={() => void onSaveCustomerDetail()}
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
                <DetailInput
                  label="거래처"
                  value={detailPopupRow.isRegister ? '자동 생성' : detailPopupRow.cstCd}
                  readOnly
                />
                <DetailInput
                  label="거래처"
                  value={detailPopupRow.cstNm}
                  onChange={(value) => updateDetailPopup({ cstNm: value })}
                />
                <DetailInput label="거래처구분" value={detailPopupRow.custGb} readOnly />
                <DetailInput
                  label="사업자번호"
                  value={detailPopupRow.regNo}
                  maxLength={12}
                  onChange={(value) => updateDetailPopup({ regNo: formatRegNo(value) })}
                />
                <DetailInput
                  label="대표자명"
                  value={detailPopupRow.ceoNm}
                  onChange={(value) => updateDetailPopup({ ceoNm: value })}
                />
                <DetailInput
                  label="담당자"
                  value={detailPopupRow.mgrNm}
                  onChange={(value) => updateDetailPopup({ mgrNm: value })}
                />
                <DetailInput
                  label="전화번호"
                  value={detailPopupRow.telNo}
                  onChange={(value) => updateDetailPopup({ telNo: onlyDigits(value, 12) })}
                />
                <DetailInput
                  label="담당자연락처"
                  value={detailPopupRow.mgrTel}
                  onChange={(value) => updateDetailPopup({ mgrTel: onlyDigits(value, 12) })}
                />
                <DetailInput
                  label="이메일"
                  value={detailPopupRow.email}
                  onChange={(value) => updateDetailPopup({ email: value })}
                />
                <DetailInput
                  label="팩스번호"
                  value={detailPopupRow.faxNo}
                  onChange={(value) => updateDetailPopup({ faxNo: onlyDigits(value, 12) })}
                />
                <DetailInput
                  label="우편번호"
                  value={detailPopupRow.postNo}
                  onChange={(value) => updateDetailPopup({ postNo: onlyDigits(value, 5) })}
                />
                <DetailSelect
                  label="상태"
                  value={detailPopupRow.status}
                  onChange={(value) => updateDetailPopup({ status: value })}
                />
                <div className="md:col-span-2">
                  <DetailTextarea
                    label="주소"
                    value={detailPopupRow.addr}
                    onChange={(value) => updateDetailPopup({ addr: value })}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
