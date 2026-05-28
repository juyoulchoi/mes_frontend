import CodeNameField from '@/components/CodeNameField';
import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import DateEdit from '@/components/DateEdit';
import DateInput from '@/components/DateInput';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { patchCheckedRow, removeCheckedRows, updateCheckedRows } from '@/lib/gridRows';
import { resolveApiUrl } from '@/lib/config';
import { http } from '@/lib/http';
import { EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import {
  addTransferButtonClass,
  countBadgeClass,
  deleteTransferButtonClass,
  editableNumberInputClass,
  editableSelectClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSearchGridClass,
  registerSplitGridClass,
  saveButtonClass,
  transferButtonGroupClass,
  transferColumnClass,
} from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import { useCodes } from '@/lib/hooks/useCodes';
import {
  buildMmsm02001SavePayload,
  buildMmsm02001PlanRequests,
  fetchMmsm02001Detail,
  fetchMmsm02001Master,
  getNextDetailSubSeq,
  type AuthMeResponse,
  type DetailRow,
  type MasterRow,
  type SearchForm,
} from '@/services/m02/mmsm02001';
import { useEffect, useState } from 'react';

const DEFAULT_EM_GB = 'N';
const planDateInputClass =
  'h-10 w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-sm';
const planDateLabelClass = 'flex h-10 items-center gap-2 text-sm';
const planDateTextClass = 'w-[92px] shrink-0 font-medium text-slate-700';

type TokenRefreshResponse = {
  success?: boolean;
  accessToken?: string;
  token?: string;
  data?: {
    accessToken?: string;
    token?: string;
  };
};

function getTokenExpiresAt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return 0;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : Number.MAX_SAFE_INTEGER;
  } catch {
    return 0;
  }
}

function getValidAccessToken() {
  const token = localStorage.getItem('token') ?? '';
  if (!token) return '';
  return getTokenExpiresAt(token) > Date.now() ? token : '';
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken') ?? '';
  if (!refreshToken) return '';

  const res = await fetch(resolveApiUrl('/api/v1/auth/iam/token/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return '';

  const payload = (await res.json()) as TokenRefreshResponse;
  if (payload.success === false) return '';

  const token = payload.data?.accessToken || payload.data?.token || payload.accessToken || payload.token || '';
  if (!token || getTokenExpiresAt(token) <= Date.now()) return '';

  localStorage.setItem('token', token);
  localStorage.setItem('token_expiry', String(getTokenExpiresAt(token)));
  return token;
}

async function resolveAccessToken() {
  return getValidAccessToken() || (await refreshAccessToken());
}

function isDuplicatePlanError(error: unknown) {
  return error instanceof Error && /409|생산계획이 생성|Production Plan Already Exists/.test(error.message);
}

function isMissingPlanProcessError(error: unknown) {
  return error instanceof Error && /Production Plan Process Not Found/.test(error.message);
}

const missingPlanProcessGuide =
  '제품 마스터에서 공정그룹 또는 대표공정을 등록하고, 공정그룹 라우팅에 공정을 매칭하세요.';

export default function MMSM02001E() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [masterResult, setMasterResult] = useState(() => EmptyPageResult<MasterRow>(0, PAGE_SIZE));
  const [detailResult, setDetailResult] = useState(() => EmptyPageResult<DetailRow>(0, PAGE_SIZE));
  const [masterLoading, setMasterLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletedDetailRows, setDeletedDetailRows] = useState<DetailRow[]>([]);
  const [planYmd, setPlanYmd] = useState(getTodayYmd());
  const [prdSchdYmd, setPrdSchdYmd] = useState(getTodayYmd());

  const [form, setForm] = useState<SearchForm>(() => ({
    soYmd: getTodayYmd(),
    seq: '',
    cstCd: '',
  }));

  const { codes: emCodes } = useCodes('1100', []);
  const isSearch = masterLoading || detailLoading || saving;
  const isSave = masterLoading || detailLoading || saving;
  const selectedDetailCount = detailRows.filter((row) => row.CHECK).length;

  async function fetchMasterList(nextPage = 0) {
    setMasterLoading(true);
    setMasterError(null);

    try {
      setMasterResult(
        await fetchMmsm02001Master({
          form,
          page: nextPage,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (e) {
      setMasterResult(EmptyPageResult<MasterRow>(nextPage, PAGE_SIZE));
      setMasterError(e instanceof Error ? e.message : String(e));
    } finally {
      setMasterLoading(false);
    }
  }

  async function fetchDetailList(nextPage = 0) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setDetailResult(
        await fetchMmsm02001Detail({
          form,
          page: nextPage,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (e) {
      setDetailResult(EmptyPageResult<DetailRow>(nextPage, PAGE_SIZE));
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  }

  async function onSearch() {
    if (!form.cstCd) {
      window.alert('거래처는 조회 필수값입니다.');
      return;
    }

    setSaveError(null);
    await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
  }

  useEffect(() => {
    setMasterRows(masterResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [masterResult.content]);

  useEffect(() => {
    setDeletedDetailRows([]);
    setDetailRows(
      detailResult.content.map((row) => ({
        ...row,
        reqYmd: row.reqYmd || form.soYmd,
        emGb: row.emGb || DEFAULT_EM_GB,
        CHECK: false,
      }))
    );
  }, [detailResult.content, form.soYmd]);

  function toggleMaster(rowIndex: number, checked: boolean) {
    updateCheckedRows(setMasterRows, rowIndex, checked);
  }

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

  function onAddFromMaster() {
    const selected = masterRows.filter((row) => row.CHECK);
    if (selected.length === 0) return;

    setDetailRows((prev) => {
      const nextSoSubSeq = getNextDetailSubSeq(prev);
      const additions = selected.map((row, index) => ({
        CHECK: true,
        method: 'I' as const,
        soSubSeq: nextSoSubSeq + index + 1,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: '',
        price: '',
        reqYmd: form.soYmd,
        emGb: DEFAULT_EM_GB,
        description: '',
        endYn: '',
        salTp: '',
      }));

      return [...prev, ...additions];
    });
  }

  function onDeleteDetail() {
    setDetailRows((prev) => {
      const rowsToDelete = prev.filter((row) => row.CHECK);
      if (rowsToDelete.length === 0) {
        return prev;
      }

      setDeletedDetailRows((current) => [
        ...current,
        ...rowsToDelete
          .filter((row) => row.method !== 'I' && row.soYmd && row.soSeq !== undefined)
          .map((row) => ({
            ...row,
            CHECK: false,
            method: 'D' as const,
          })),
      ]);

      return removeCheckedRows(prev);
    });
  }

  async function onSave() {
    if (detailRows.length === 0 && deletedDetailRows.length === 0) {
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
      const token = await resolveAccessToken();
      if (!token) {
        setSaveError('인증 정보가 만료되었습니다. 다시 로그인 후 시도하세요.');
        return;
      }

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

      const invalidReqYmdRowIndex = detailRows.findIndex(
        (row) => !row.reqYmd || row.reqYmd < form.soYmd
      );
      if (invalidReqYmdRowIndex >= 0) {
        setSaveError('상세 ' + (invalidReqYmdRowIndex + 1) + '행의 납기 요청일을 확인하세요.');
        return;
      }

      const invalidEmGbRowIndex = detailRows.findIndex((row) => !row.emGb);
      if (invalidEmGbRowIndex >= 0) {
        setSaveError('상세 ' + (invalidEmGbRowIndex + 1) + '행의 긴급구분을 선택하세요.');
        return;
      }

      const payload = buildMmsm02001SavePayload({
        form,
        detailRows,
        deletedDetailRows,
        userId,
      });

      await http('/api/v1/sales/somst/savePayload', { method: 'POST', body: payload });
      setDeletedDetailRows([]);
      await fetchDetailList(0);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onCreatePlan() {
    const selectedRows = detailRows.filter((row) => row.CHECK);
    if (selectedRows.length === 0) {
      setSaveError('생산계획을 생성할 수주 상세를 선택하세요.');
      return;
    }

    const unsavedRowIndex = selectedRows.findIndex(
      (row) => row.method === 'I' || !row.soYmd || row.soSeq === undefined || row.soSeq === null
    );
    if (unsavedRowIndex >= 0) {
      setSaveError('저장되지 않은 수주 상세가 있습니다. 먼저 저장 후 생산계획을 생성하세요.');
      return;
    }

    const invalidRowIndex = selectedRows.findIndex(
      (row) => !row.itemCd || !row.unitCd || !row.qty || Number(row.qty) <= 0
    );
    if (invalidRowIndex >= 0) {
      setSaveError('선택한 수주 상세의 품목, 단위, 수량을 확인하세요.');
      return;
    }
    if (!planYmd) {
      setSaveError('생산계획일자를 입력하세요.');
      return;
    }
    if (!prdSchdYmd) {
      setSaveError('생산예정일을 입력하세요.');
      return;
    }

    if (!window.confirm('선택된 수주로 생산계획을 생성하시겠습니까?')) return;

    setSaving(true);
    setSaveError(null);

    try {
      const token = await resolveAccessToken();
      if (!token) {
        setSaveError('인증 정보가 만료되었습니다. 다시 로그인 후 시도하세요.');
        return;
      }

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

      const requests = buildMmsm02001PlanRequests({
        form,
        detailRows: selectedRows,
        planYmd,
        prdSchdYmd,
      });

      let createdCount = 0;
      const duplicateRows: string[] = [];
      const missingProcessRows: string[] = [];

      for (let index = 0; index < requests.length; index += 1) {
        const request = requests[index];
        try {
          await http('/api/v1/planning/prdplnmst', {
            method: 'POST',
            authToken: token,
            body: request,
          });
          createdCount += 1;
        } catch (error) {
          const row = selectedRows[index];
          const rowLabel = `${row.itemNm || row.itemCd || index + 1} (${request.soYmd}-${request.soSeq}-${request.soSubSeq})`;

          if (isDuplicatePlanError(error)) {
            duplicateRows.push(rowLabel);
            continue;
          }

          if (isMissingPlanProcessError(error)) {
            missingProcessRows.push(rowLabel);
            continue;
          }

          throw error;
        }
      }

      if (createdCount === 0) {
        const reasons = [
          duplicateRows.length > 0
            ? `이미 생산계획이 생성된 ${duplicateRows.length}건: ${duplicateRows.join(', ')}`
            : '',
          missingProcessRows.length > 0
            ? `공정정보가 없어 생성하지 못한 ${missingProcessRows.length}건: ${missingProcessRows.join(', ')}. ${missingPlanProcessGuide}`
            : '',
        ].filter(Boolean);
        setSaveError(`생산계획을 생성하지 못했습니다. ${reasons.join(' / ')}`);
        return;
      }

      const skippedMessages = [
        duplicateRows.length > 0 ? `이미 생성된 ${duplicateRows.length}건` : '',
        missingProcessRows.length > 0 ? `공정정보가 없는 ${missingProcessRows.length}건` : '',
      ].filter(Boolean);
      window.alert(
        skippedMessages.length > 0
          ? `생산계획 ${createdCount}건을 생성했습니다. ${skippedMessages.join(', ')}은 제외했습니다. ${missingProcessRows.length > 0 ? missingPlanProcessGuide : ''}`
          : '생산계획을 생성했습니다.'
      );
      await fetchDetailList(0);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function onExportCsv() {
    const headers = ['원자재코드', '원자재명', '납기요청일', '단위', '수량', '단가', '긴급구분'];
    const lines = detailRows.map((row) =>
      [
        row.itemCd ?? '',
        row.itemNm ?? '',
        row.reqYmd ?? '',
        row.unitCd ?? '',
        row.qty ?? '',
        row.price ?? '',
        row.emGb ?? '',
      ]
        .map((value) => String(value ?? '').replace(/"/g, '""'))
        .map((value) => `"${value}"`)
        .join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'MMSM02001E_detail.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className={registerSearchGridClass}>
            <DateEdit
              label="수주일자"
              value={form.soYmd}
              onChange={(value) => setForm((prev) => ({ ...prev, soYmd: value }))}
            />
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
            <div className="flex flex-wrap items-end justify-end gap-2">
              <ActionButtonGroup
                onSearch={() => void onSearch()}
                onSave={() => void onSave()}
                onUpload={() => undefined}
                onExport={onExportCsv}
                searchDisabled={isSearch}
                saveDisabled={isSave}
                showUpload={false}
                className="flex flex-wrap items-end justify-end gap-2"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">생산계획 생성</span>
              <span className={countBadgeClass}>{selectedDetailCount}건 선택</span>
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              <label className={planDateLabelClass}>
                <span className={planDateTextClass}>생산계획일자</span>
                <input
                  type="date"
                  className={planDateInputClass}
                  value={planYmd}
                  onChange={(event) => setPlanYmd(event.target.value)}
                />
              </label>
              <label className={planDateLabelClass}>
                <span className={planDateTextClass}>생산예정일</span>
                <input
                  type="date"
                  className={planDateInputClass}
                  value={prdSchdYmd}
                  onChange={(event) => setPrdSchdYmd(event.target.value)}
                />
              </label>
              <button
                onClick={() => void onCreatePlan()}
                disabled={isSave || selectedDetailCount === 0}
                className={saveButtonClass}
              >
                생산계획생성
              </button>
            </div>
          </div>
        </SectionCard>

        {(masterError || detailError || saveError) && (
          <AlertBox tone="error">{masterError ?? detailError ?? saveError}</AlertBox>
        )}

        <div className={registerSplitGridClass}>
          <SectionCard span="left" width="full">
            <SectionHeader
              title="수주 예비 품목"
              right={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {masterRows.length}건
                </span>
              }
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={masterRows}
                showBorders={true}
                rowKey={(row, index) => row.itemCd || index}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
                />
                <Column dataField="itemCd" caption="원자재코드" width={100} alignment="center" />
                <Column dataField="itemNm" caption="원자재명" width={160} />
                <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
              </DataGrid>
            </div>
          </SectionCard>

          <div className={transferColumnClass}>
            <div className={transferButtonGroupClass}>
              <button
                onClick={onAddFromMaster}
                className={addTransferButtonClass}
              >
                추가
              </button>
              <button
                onClick={onDeleteDetail}
                className={deleteTransferButtonClass}
              >
                삭제
              </button>
            </div>
          </div>

          <SectionCard span="right" width="full">
            <SectionHeader title="등록 상세" />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) =>
                  `${form.soYmd}-${form.seq || 'new'}-${row.soSubSeq ?? 'detail'}-${row.itemCd ?? 'item'}-${index}`
                }
                emptyText="원자재에서 선택 후 추가하세요."
                classNames={{
                  table: 'min-w-[980px] w-full text-sm',
                }}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
                />
                <Column dataField="itemCd" caption="원자재코드" width={120} alignment="center" />
                <Column dataField="itemNm" caption="원자재명" width={220} />
                <Column
                  dataField="reqYmd"
                  caption="납기 요청일"
                  width={140}
                  alignment="center"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <DateInput
                      min={form.soYmd}
                      value={row.reqYmd || form.soYmd}
                      onChange={(value) => onDetailChange(rowIndex, { reqYmd: value })}
                    />
                  )}
                />
                <Column
                  dataField="emGb"
                  caption="긴급구분"
                  width={130}
                  alignment="center"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <select
                      className={editableSelectClass}
                      value={row.emGb || ''}
                      onChange={(event) => onDetailChange(rowIndex, { emGb: event.target.value })}
                    >
                      {emCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <Column
                  dataField="unitCd"
                  caption="단위"
                  width={90}
                  alignment="center"
                  cellRender={(row: DetailRow) => row.unitCd ?? ''}
                />
                <Column
                  dataField="qty"
                  caption="수주수량"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className={editableNumberInputClass}
                      value={row.qty ?? ''}
                      onChange={(event) => onDetailChange(rowIndex, { qty: event.target.value })}
                    />
                  )}
                />
                <Column
                  dataField="price"
                  caption="단가"
                  width={120}
                  alignment="right"
                  headerAlignment="center"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className={editableNumberInputClass}
                      value={row.price ?? ''}
                      onChange={(event) => onDetailChange(rowIndex, { price: event.target.value })}
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
            custGb: 'CUSTOMER',
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
