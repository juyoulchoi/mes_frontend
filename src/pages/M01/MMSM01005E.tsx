import CodeNameField from '@/components/CodeNameField';
import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import DateEdit from '@/components/DateEdit';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import {
  exportExcelTemplate,
  parseExcelUploadFile,
  validateExcelUploadRows,
} from '@/lib/excelUpload';
import { patchCheckedRow, removeCheckedRows, updateCheckedRows } from '@/lib/gridRows';
import { http } from '@/lib/http';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import {
  addTransferButtonClass,
  countBadgeClass,
  deleteTransferButtonClass,
  editableInputClass,
  editableNumberInputClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSearchGridClass,
  registerSplitGridClass,
  transferButtonGroupClass,
  transferColumnClass,
} from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  RAW_MATERIAL_ITEM_GB,
  buildMmsm01005SavePayload,
  createUploadedDetailRows,
  dedupeDetailRows,
  fetchMmsm01005Detail,
  getDetailRowKey,
  getNextDetailSubSeq,
  normalizeDetailRow,
  type AuthMeResponse,
  type DetailRow,
  type ExcelUploadRow,
  type ExcelValidateResponse,
  type SearchForm,
} from '@/services/m01/mmsm01005';
import { useEffect, useRef, useState } from 'react';

type MasterRow = {
  CHECK?: boolean;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
};

export default function MMSM01005E() {
  const { canSave, canDelete } = usePagePermissions();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [deletedDetailRows, setDeletedDetailRows] = useState<DetailRow[]>([]);
  const [detailResult, setDetailResult] = useState(() => EmptyPageResult<DetailRow>(0, PAGE_SIZE));
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  const [form, setForm] = useState<SearchForm>(() => ({
    giDate: getTodayYmd(),
    cstCd: '',
  }));

  const {
    result: masterResult,
    loading: masterLoading,
    error: masterError,
    fetchList: fetchMasterList,
  } = usePageApiFetch<SearchForm, MasterRow>({
    apiPath: '/api/v1/mdm/item/searchItemCustList',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form: currentForm }) => ({
      itemGb: RAW_MATERIAL_ITEM_GB,
      cstCd: currentForm.cstCd || '',
    }),
  });

  async function fetchDetailList(nextPage = 0) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setDetailResult(
        await fetchMmsm01005Detail({
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

    await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
  }

  const isSearch = masterLoading || detailLoading || saving || uploading;
  const isSave = masterLoading || detailLoading || saving || uploading;
  const isUpload = saving || uploading;

  useEffect(() => {
    setMasterRows(masterResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [masterResult.content]);

  useEffect(() => {
    setDeletedDetailRows([]);
    setDetailRows(
      detailResult.content.map((row) => ({
        ...normalizeDetailRow(row),
        CHECK: false,
      }))
    );
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
    const selected = masterRows.filter((row) => row.CHECK);
    if (selected.length === 0) return;

    setDetailRows((prev) => {
      const nextDetailSubSeq = getNextDetailSubSeq(prev);
      const additions = selected.map((row, index) => ({
        CHECK: true,
        method: 'I' as const,
        giSubSeq: nextDetailSubSeq + index + 1,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
        price: row.price ?? '',
        amt: row.amt ?? '',
        description: '',
      }));

      return [...prev, ...additions];
    });

    setMasterRows((prev) => prev.map((row) => ({ ...row, CHECK: false })));
  }

  function onDeleteDetail() {
    setDetailRows((prev) => {
      const rowsToDelete = prev.filter((row) => row.CHECK);
      if (rowsToDelete.length === 0) {
        return prev;
      }

      setDeletedDetailRows((current) =>
        dedupeDetailRows([
          ...current,
          ...rowsToDelete
            .map((row) => normalizeDetailRow(row))
            .filter((row) => row.method !== 'I' && row.giYmd && row.giSeq !== undefined)
            .map((row) => ({
              ...row,
              CHECK: false,
              method: 'D' as const,
            })),
        ])
      );

      return removeCheckedRows(prev);
    });
  }

  function onUploadCsv() {
    if (!form.giDate) {
      setUploadError('출고일자를 먼저 선택하세요.');
      return;
    }

    if (!form.cstCd) {
      setUploadError('거래처를 먼저 선택하세요.');
      return;
    }

    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadWarnings([]);

    try {
      const rows = await parseExcelFile(file);
      const result = await validateExcelRows(rows);
      const validRows = result.validRows ?? [];
      const errors = result.errors ?? [];

      if (errors.length > 0) {
        setUploadWarnings(
          errors.map((error) => `${error.rowNo}행 ${error.field ?? ''} ${error.message}`.trim())
        );
      }

      if (validRows.length === 0) {
        setUploadError('업로드 가능한 데이터가 없습니다.');
        return;
      }

      applyUploadedRows(validRows);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function parseExcelFile(file: File): Promise<ExcelUploadRow[]> {
    return parseExcelUploadFile(file);
  }

  async function validateExcelRows(rows: ExcelUploadRow[]): Promise<ExcelValidateResponse> {
    return validateExcelUploadRows(rows);
  }

  function applyUploadedRows(rows: ExcelUploadRow[]) {
    setDeletedDetailRows([]);
    setDetailRows(createUploadedDetailRows(rows));
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

      const payload = buildMmsm01005SavePayload({
        form,
        detailRows,
        deletedDetailRows,
        userId,
      });

      await http('/api/v1/material/gimst/savePayload', { method: 'POST', body: payload });
      setDeletedDetailRows([]);
      await fetchDetailList(0);
      window.alert('저장되었습니다.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function onExportCsv() {
    exportExcelTemplate(
      '원자재출고등록양식.xlsx',
      [
        {
          원자재코드: 'RM001',
          원자재명: '원자재명',
          단위: 'EA',
          수량: 100,
          비고: '비고',
        },
      ],
      ['원자재코드', '원자재명', '단위', '수량', '비고']
    );
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        <SectionCard span="full" padding="md">
          <div className={registerSearchGridClass}>
            <DateEdit
              label="출고일자"
              value={form.giDate}
              onChange={(value) => setForm((prev) => ({ ...prev, giDate: value }))}
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
            <ActionButtonGroup
              onSearch={onSearch}
              onSave={() => onSave()}
              onUpload={onUploadCsv}
              onExport={onExportCsv}
              searchDisabled={isSearch}
              saveDisabled={isSave}
              uploadDisabled={isUpload}
            />
          </div>
        </SectionCard>

        {(masterError || detailError || saveError || uploadError) && (
          <AlertBox tone="error">{masterError ?? detailError ?? saveError ?? uploadError}</AlertBox>
        )}

        {uploadWarnings.length > 0 && (
          <AlertBox tone="warning">
            {uploadWarnings.map((warning, index) => (
              <div key={`${warning}-${index}`}>{warning}</div>
            ))}
          </AlertBox>
        )}

        <div className={registerSplitGridClass}>
          <SectionCard span="left" width="full">
            <SectionHeader
              title="원자재"
              right={<span className={countBadgeClass}>{masterRows.length}건</span>}
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={masterRows}
                showBorders={true}
                rowKey={(row, index) => row.itemCd || index}
                emptyText="원자재가 없습니다."
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
                />
                <Column dataField="itemCd" caption="원자재코드" width={80} alignment="center" />
                <Column dataField="itemNm" caption="원자재명" width={120} />
                <Column dataField="unitCd" caption="단위" width={60} alignment="center" />
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
              title="등록 상세"
              right={<span className={countBadgeClass}>{detailRows.length}건</span>}
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) => {
                  const key = getDetailRowKey(row);
                  return key === '||' ? `${row.itemCd ?? 'item'}-${index}` : `${key}-${index}`;
                }}
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
                <Column dataField="unitCd" caption="단위" width={90} alignment="center" />
                <Column
                  dataField="qty"
                  caption="출고수량"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className={editableNumberInputClass}
                      value={row.qty ?? ''}
                      onChange={(e) => onDetailChange(rowIndex, { qty: e.target.value })}
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
                      onChange={(e) => onDetailChange(rowIndex, { price: e.target.value })}
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
