import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import DateEdit from '@/components/DateEdit';
import SearchCodePickers from '@/components/SearchCodePickers';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { patchCheckedRow, removeCheckedRows, updateCheckedRows } from '@/lib/gridRows';
import { http } from '@/lib/http';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import {
  addTransferButtonClass,
  countBadgeClass,
  deleteTransferButtonClass,
  editableNumberInputClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  transferButtonGroupClass,
  transferColumnClass,
} from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import {
  buildMmsm04002SavePayload,
  fetchMmsm04002Detail,
  fetchMmsm04002Master,
  getDetailRowKey,
  type AuthMeResponse,
  type DetailRow,
  type MasterRow,
  type SearchForm,
} from '@/services/m04/mmsm04002';
import { useEffect, useState } from 'react';

const editableTextInputClass =
  'h-9 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const issueDateInputClass =
  'h-10 w-full max-w-[150px] rounded-lg border border-slate-200 bg-white px-3 text-sm';
const issueDateLabelClass = 'flex h-10 items-center gap-2 text-sm';
const issueDateTextClass = 'w-[72px] shrink-0 font-medium text-slate-700';
const productIssueRegisterSearchGridClass =
  'grid min-w-[920px] grid-cols-[296px_150px_minmax(0,1fr)_max-content] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[296px_446px_minmax(0,1fr)_max-content] xl:gap-x-[30px]';

function getSalesRowKey(row: {
  soYmd?: string;
  soSeq?: string | number;
  soSubSeq?: string | number;
}) {
  return [row.soYmd ?? '', row.soSeq ?? '', row.soSubSeq ?? ''].join('|');
}

export default function MMSM04002E() {
  const { canSave, canDelete } = usePagePermissions();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [deletedDetailRows, setDeletedDetailRows] = useState<DetailRow[]>([]);
  const [masterResult, setMasterResult] = useState(() => EmptyPageResult<MasterRow>(0, PAGE_SIZE));
  const [detailResult, setDetailResult] = useState(() => EmptyPageResult<DetailRow>(0, PAGE_SIZE));
  const [masterLoading, setMasterLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<SearchForm>(() => ({
    soYmd: getTodayYmd(),
    giYmd: getTodayYmd(),
    cstCd: '',
  }));

  const isBusy = masterLoading || detailLoading || saving;

  async function fetchMasterList(nextPage = 0) {
    setMasterLoading(true);
    setMasterError(null);

    try {
      setMasterResult(
        await fetchMmsm04002Master({
          form,
          cstNm,
          page: nextPage,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (error) {
      setMasterResult(EmptyPageResult<MasterRow>(nextPage, PAGE_SIZE));
      setMasterError(error instanceof Error ? error.message : String(error));
    } finally {
      setMasterLoading(false);
    }
  }

  async function fetchDetailList(nextPage = 0) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setDetailResult(
        await fetchMmsm04002Detail({
          form,
          page: nextPage,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (error) {
      setDetailResult(EmptyPageResult<DetailRow>(nextPage, PAGE_SIZE));
      setDetailError(error instanceof Error ? error.message : String(error));
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
    setDetailRows(detailResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [detailResult.content]);

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
    const selectedRows = masterRows.filter((row) => row.CHECK);
    if (selectedRows.length === 0) return;

    setDetailRows((currentRows) => {
      const existingKeys = new Set(currentRows.map(getSalesRowKey));
      const additions = selectedRows
        .filter((row) => !existingKeys.has(getSalesRowKey(row)))
        .map((row) => ({
          CHECK: true,
          method: 'I' as const,
          soYmd: row.soYmd ?? '',
          soSeq: row.soSeq ?? '',
          soSubSeq: row.soSubSeq ?? '',
          soNo: row.soNo ?? '',
          itemCd: row.itemCd ?? '',
          itemNm: row.itemNm ?? '',
          unitCd: row.unitCd ?? '',
          unitNm: row.unitNm ?? row.unitCd ?? '',
          qty: row.remainingQty ?? '',
          remainingQty: row.remainingQty ?? 0,
          description: '',
        }));

      return [...currentRows, ...additions];
    });
  }

  function onDeleteDetail() {
    setDetailRows((currentRows) => {
      const rowsToDelete = currentRows.filter((row) => row.CHECK);
      if (rowsToDelete.length === 0) return currentRows;

      setDeletedDetailRows((deletedRows) => [
        ...deletedRows,
        ...rowsToDelete
          .filter((row) => row.method !== 'I' && getDetailRowKey(row) !== '||')
          .map((row) => ({ ...row, CHECK: false, method: 'D' as const })),
      ]);

      return removeCheckedRows(currentRows);
    });
  }

  async function onSave() {
    if (!form.cstCd) {
      setSaveError('거래처를 선택하세요.');
      return;
    }
    if (detailRows.length === 0 && deletedDetailRows.length === 0) {
      setSaveError('저장할 데이터가 없습니다.');
      return;
    }

    const invalidRowIndex = detailRows.findIndex(
      (row) => !row.itemCd || !row.unitCd || !row.qty || Number(row.qty) <= 0
    );
    if (invalidRowIndex >= 0) {
      setSaveError(`상세 ${invalidRowIndex + 1}행의 품목, 단위, 출고수량을 확인하세요.`);
      return;
    }

    const excessRowIndex = detailRows.findIndex(
      (row) =>
        row.method === 'I' && row.remainingQty !== undefined && Number(row.qty) > row.remainingQty
    );
    if (excessRowIndex >= 0) {
      setSaveError(`상세 ${excessRowIndex + 1}행의 출고수량이 출고가능수량을 초과했습니다.`);
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

      const payload = buildMmsm04002SavePayload({
        form,
        detailRows,
        deletedDetailRows,
        userId,
      });
      await http('/api/v1/material/gimst/savePayload', { method: 'POST', body: payload });
      setDeletedDetailRows([]);
      await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
      window.alert('저장되었습니다.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  function onExportCsv() {
    const headers = ['수주번호', '제품코드', '제품명', '단위', '출고수량', '비고'];
    const lines = detailRows.map((row) =>
      [
        row.soNo ?? '',
        row.itemCd ?? '',
        row.itemNm ?? '',
        row.unitNm ?? row.unitCd ?? '',
        row.qty ?? '',
        row.description ?? '',
      ]
        .map((value) => String(value).replace(/"/g, '""'))
        .map((value) => `"${value}"`)
        .join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'MMSM04002E_detail.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={productIssueRegisterSearchGridClass}>
              <DateEdit
                label="수주일자"
                value={form.soYmd}
                onChange={(value) => setForm((prev) => ({ ...prev, soYmd: value }))}
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
              <ActionButtonGroup
                onSearch={() => void onSearch()}
                onSave={() => void onSave()}
                onUpload={() => undefined}
                onExport={onExportCsv}
                searchDisabled={isBusy}
                saveDisabled={isBusy}
                showUpload={false}
                compact
                className="col-start-4 row-start-1 flex flex-wrap content-end items-end justify-end gap-2 self-end"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">출고지시 정보</span>
              <span className={countBadgeClass}>
                {detailRows.filter((row) => row.CHECK).length}건 선택
              </span>
            </div>
            <label className={issueDateLabelClass}>
              <span className={issueDateTextClass}>출고일자</span>
              <input
                type="date"
                className={issueDateInputClass}
                value={form.giYmd}
                onChange={(event) => setForm((prev) => ({ ...prev, giYmd: event.target.value }))}
              />
            </label>
          </div>
        </SectionCard>

        {(masterError || detailError || saveError) && (
          <AlertBox tone="error">{masterError ?? detailError ?? saveError}</AlertBox>
        )}

        <div className={registerSplitGridClass}>
          <SectionCard span="left" width="full">
            <SectionHeader
              title="출고 대상 수주"
              right={<span className={countBadgeClass}>{masterRows.length}건</span>}
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={masterRows}
                showBorders={true}
                rowKey={(row, index) => row.soNo || index}
                emptyText="출고 가능한 수주가 없습니다."
                classNames={{ table: 'min-w-[900px] w-full text-sm' }}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
                />
                <Column dataField="soNo" caption="수주번호" width={150} alignment="center" />
                <Column dataField="itemCd" caption="제품코드" width={110} alignment="center" />
                <Column dataField="itemNm" caption="제품명" width={180} />
                <Column dataField="unitNm" caption="단위" width={80} alignment="center" />
                <Column dataField="emNm" caption="긴급구분" width={100} alignment="center" />
                <Column dataField="qty" caption="수주수량" width={100} alignment="right" />
                <Column dataField="outQty" caption="기출고" width={90} alignment="right" />
                <Column dataField="remainingQty" caption="출고가능" width={100} alignment="right" />
              </DataGrid>
            </div>
          </SectionCard>

          <div className={transferColumnClass}>
            <div className={transferButtonGroupClass}>
              {canSave && (
                <button onClick={onAddFromMaster} className={addTransferButtonClass}>
                  추가
                </button>
              )}
              {canDelete && (
                <button onClick={onDeleteDetail} className={deleteTransferButtonClass}>
                  삭제
                </button>
              )}
            </div>
          </div>

          <SectionCard span="right" width="full">
            <SectionHeader
              title="출고지시 상세"
              right={<span className={countBadgeClass}>{detailRows.length}건</span>}
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) => {
                  const key = getDetailRowKey(row);
                  return key === '||' ? `${getSalesRowKey(row)}-${index}` : `${key}-${index}`;
                }}
                emptyText="좌측 수주에서 선택 후 추가하세요."
                classNames={{ table: 'min-w-[820px] w-full text-sm' }}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
                />
                <Column dataField="soNo" caption="수주번호" width={150} alignment="center" />
                <Column dataField="itemCd" caption="제품코드" width={110} alignment="center" />
                <Column dataField="itemNm" caption="제품명" width={180} />
                <Column dataField="unitNm" caption="단위" width={80} alignment="center" />
                <Column
                  dataField="qty"
                  caption="출고수량"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      type="number"
                      min="0"
                      className={editableNumberInputClass}
                      value={row.qty ?? ''}
                      onChange={(event) => onDetailChange(rowIndex, { qty: event.target.value })}
                    />
                  )}
                />
                <Column
                  dataField="description"
                  caption="비고"
                  width={180}
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className={editableTextInputClass}
                      value={row.description ?? ''}
                      onChange={(event) =>
                        onDetailChange(rowIndex, { description: event.target.value })
                      }
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
