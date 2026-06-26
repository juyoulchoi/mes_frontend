import { useEffect, useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { useCodes } from '@/lib/hooks/useCodes';
import { toYmd } from '@/lib/excel';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import {
  countBadgeClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  saveButtonClass,
} from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import { formatNumber } from '@/lib/utils';
import {
  normalizeMmsm02002MasterRow,
  type Mmsm02002BomMaterialRow,
  type Mmsm02002MasterRow,
  type Mmsm02002PlanReviewResponse,
  type Mmsm02002PlanStatus,
  type Mmsm02002ProcessRow,
  type Mmsm02002SalesLinkRow,
  type Mmsm02002SearchForm,
} from '@/services/m02/mmsm02002';
import {
  exportHeaders,
  getFirstDayOfMonthYmd,
  mapExportRow,
  type WorkOrderCreateResponse,
} from '@/services/m02/mmsm02004';

const searchLabelClass = 'font-medium text-slate-700';
const searchControlClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm';
type workOrderSearchLayoutMode = 'compact' | 'twoRow' | 'wide';

const workOrderSearchGridClass =
  'grid min-w-[1032px] grid-cols-[minmax(0,1fr)_max-content] items-start gap-2 xl:gap-x-[30px]';
const workOrderSearchFieldGridClass: Record<workOrderSearchLayoutMode, string> = {
  compact:
    'col-start-1 row-start-1 grid min-w-[1032px] grid-cols-[586px_minmax(446px,1fr)] items-end gap-2 xl:gap-x-[30px]',
  twoRow:
    'col-start-1 row-start-1 grid min-w-[1032px] grid-cols-[586px_minmax(446px,1fr)] items-end gap-2 xl:gap-x-[30px]',
  wide: 'col-start-1 row-start-1 grid min-w-[1478px] grid-cols-[586px_repeat(2,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
};
const workOrderDateFieldClass: Record<workOrderSearchLayoutMode, string> = {
  compact: 'col-start-1 row-start-1 min-w-0',
  twoRow: 'col-start-1 row-start-1 min-w-0',
  wide: 'col-start-1 row-start-1 min-w-0',
};
const workOrderCustomerFieldClass: Record<workOrderSearchLayoutMode, string> = {
  compact: 'col-start-1 row-start-2 min-w-0',
  twoRow: 'col-start-2 row-start-1 min-w-0',
  wide: 'col-start-2 row-start-1 min-w-0',
};
const workOrderItemFieldClass: Record<workOrderSearchLayoutMode, string> = {
  compact: 'col-start-2 row-start-2 min-w-0',
  twoRow: 'col-start-1 row-start-2 min-w-0',
  wide: 'col-start-3 row-start-1 min-w-0',
};
const workOrderExtraFieldClass: Record<workOrderSearchLayoutMode, string> = {
  compact: 'col-span-2 col-start-1 row-start-3 flex flex-wrap items-end gap-2',
  twoRow: 'col-start-2 row-start-2 flex flex-wrap items-end gap-2',
  wide: 'col-span-2 col-start-1 row-start-2 flex flex-wrap items-end gap-2',
};
const workOrderSearchActionsClass = 'col-start-2 row-start-1 flex min-w-max justify-end';
const workOrderTwoRowMinWidth = 1360;
const workOrderWideMinWidth = 1720;
const detailLabelClass =
  'flex w-28 shrink-0 items-center bg-slate-50 px-3 font-medium text-slate-700';
const detailInputClass = 'h-9 w-full rounded border border-slate-200 bg-white px-2 text-sm';
const detailNumberInputClass = `${detailInputClass} text-right`;

export default function MMSM02004E() {
  const { canSave } = usePagePermissions();
  const [form, setForm] = useState<Mmsm02002SearchForm>(() => {
    const today = getTodayYmd();

    return {
      dateType: 'PLAN',
      dateFrom: getFirstDayOfMonthYmd(),
      dateTo: today,
      cstCd: '',
      cstNm: '',
      itemCd: '',
      itemNm: '',
      planStatus: '',
      procCd: '',
    };
  });
  const [plans, setPlans] = useState<Mmsm02002MasterRow[]>([]);
  const [bomMaterials, setBomMaterials] = useState<Mmsm02002BomMaterialRow[]>([]);
  const [processRows, setProcessRows] = useState<Mmsm02002ProcessRow[]>([]);
  const [salesLinks, setSalesLinks] = useState<Mmsm02002SalesLinkRow[]>([]);
  const [workOrderYmd, setWorkOrderYmd] = useState(getTodayYmd());
  const [orderQty, setOrderQty] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);
  const [searchWidth, setSearchWidth] = useState(0);
  const { codes: dateTypeCodes } = useCodes('PLAN_DATE');
  const { codes: planStatusCodes } = useCodes('PLAN_STAT');

  const selectedPlan = plans.find((row) => row.CHECK);

  useEffect(() => {
    setOrderQty(selectedPlan?.planQty == null ? '' : String(selectedPlan.planQty));
    setRemark('');
  }, [selectedPlan]);

  useEffect(() => {
    const prdPlnYmd = selectedPlan?.prdPlnYmd ?? selectedPlan?.planYmd;
    const prdPlnSeq = Number(selectedPlan?.prdPlnSeq ?? selectedPlan?.planNo);

    if (!selectedPlan || !prdPlnYmd || !Number.isFinite(prdPlnSeq)) {
      setBomMaterials([]);
      setProcessRows([]);
      setSalesLinks([]);
      return;
    }

    let ignore = false;

    async function fetchWorkOrderDetail() {
      setDetailLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams({
          prdPlnYmd: prdPlnYmd ?? '',
          prdPlnSeq: String(prdPlnSeq),
        }).toString();
        const data = await http<Mmsm02002PlanReviewResponse>(
          `/api/v1/planning/prdplnmst/review?${qs}`
        );

        if (ignore) return;

        setBomMaterials(Array.isArray(data.bomMaterials) ? data.bomMaterials : []);
        setProcessRows(Array.isArray(data.processRows) ? data.processRows : []);
        setSalesLinks(Array.isArray(data.salesLinks) ? data.salesLinks : []);
      } catch (e) {
        if (ignore) return;
        setBomMaterials([]);
        setProcessRows([]);
        setSalesLinks([]);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    void fetchWorkOrderDetail();

    return () => {
      ignore = true;
    };
  }, [selectedPlan]);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        dateType: form.dateType,
        dateFrom: toYmd(form.dateFrom),
        dateTo: toYmd(form.dateTo),
        cstCd: form.cstCd,
        itemCd: form.itemCd,
        planStatus: form.planStatus,
        procCd: form.procCd,
      }).toString();
      const data = await http<Mmsm02002MasterRow[]>(
        `/api/v1/planning/prdplnmst/searchPrdPlnList?${qs}`
      );
      setPlans((Array.isArray(data) ? data : []).map(normalizeMmsm02002MasterRow));
    } catch (e) {
      setPlans([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function togglePlan(rowIndex: number, checked: boolean) {
    setPlans((prev) =>
      prev.map((row, index) => ({
        ...row,
        CHECK: checked && index === rowIndex,
      }))
    );
  }

  async function onSaveWorkOrder() {
    const prdPlnYmd = selectedPlan?.prdPlnYmd ?? selectedPlan?.planYmd;
    const prdPlnSeq = Number(selectedPlan?.prdPlnSeq ?? selectedPlan?.planNo);
    const normalizedQty = Number(String(orderQty).replace(/,/g, ''));

    if (!selectedPlan || !prdPlnYmd || !Number.isFinite(prdPlnSeq)) {
      setError('작업지시를 등록할 생산계획을 선택하세요.');
      return;
    }
    if (!workOrderYmd) {
      setError('작업지시일자를 입력하세요.');
      return;
    }
    if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
      setError('지시수량은 0보다 큰 숫자로 입력하세요.');
      return;
    }
    if (processRows.length === 0) {
      setError('공정 순서가 없어 작업지시를 등록할 수 없습니다.');
      return;
    }
    if (!window.confirm('작업지시를 등록하시겠습니까?')) return;

    setSaving(true);
    setError(null);

    try {
      const response = await http<WorkOrderCreateResponse>('/api/v1/planning/workOrders', {
        method: 'POST',
        body: {
          workOrderYmd: toYmd(workOrderYmd),
          prdPlnYmd,
          prdPlnSeq,
          orderQty: normalizedQty,
          remark,
        },
      });
      window.alert(
        `작업지시가 등록되었습니다. (${response.workOrderYmd ?? toYmd(workOrderYmd)}-${response.workOrderSeq ?? ''})`
      );
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const searchLayoutMode: workOrderSearchLayoutMode =
    searchWidth >= workOrderWideMinWidth
      ? 'wide'
      : searchWidth >= workOrderTwoRowMinWidth
        ? 'twoRow'
        : 'compact';

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div ref={searchRef} className="overflow-x-auto pb-1">
            <div className={workOrderSearchGridClass}>
              <div className={workOrderSearchFieldGridClass[searchLayoutMode]}>
                <div className={workOrderDateFieldClass[searchLayoutMode]}>
                  <div className="flex max-w-[586px] flex-nowrap items-end gap-2">
                    <span
                      className={`${searchLabelClass} flex h-10 w-[100px] shrink-0 items-center text-sm`}
                    >
                      검색일자
                    </span>
                    <select
                      className={`${searchControlClass} w-[104px] shrink-0`}
                      value={form.dateType}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          dateType: event.target.value,
                        }))
                      }
                    >
                      {dateTypeCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className={`${searchControlClass} w-[150px] shrink-0`}
                      value={form.dateFrom}
                      max={form.dateTo || undefined}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, dateFrom: event.target.value }))
                      }
                    />
                    <span className="flex h-10 shrink-0 items-center text-sm text-slate-500">
                      ~
                    </span>
                    <input
                      type="date"
                      className={`${searchControlClass} w-[150px] shrink-0`}
                      value={form.dateTo}
                      min={form.dateFrom || undefined}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, dateTo: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className={workOrderCustomerFieldClass[searchLayoutMode]}>
                  <CodeNameField
                    label="거래처"
                    id="cust"
                    code={form.cstCd}
                    name={form.cstNm}
                    codePlaceholder="코드"
                    namePlaceholder="거래처명"
                    onSearch={() => undefined}
                    onClear={() => setForm((prev) => ({ ...prev, cstCd: '', cstNm: '' }))}
                  />
                </div>

                <div className={workOrderItemFieldClass[searchLayoutMode]}>
                  <CodeNameField
                    label="제품"
                    id="item"
                    code={form.itemCd}
                    name={form.itemNm}
                    codePlaceholder="코드"
                    namePlaceholder="제품명"
                    onSearch={() => undefined}
                    onClear={() => setForm((prev) => ({ ...prev, itemCd: '', itemNm: '' }))}
                  />
                </div>

                <div className={workOrderExtraFieldClass[searchLayoutMode]}>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <span className={`${searchLabelClass} w-[100px] shrink-0`}>계획상태</span>
                    <select
                      className={`${searchControlClass} w-full max-w-[110px]`}
                      value={form.planStatus}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          planStatus: event.target.value as Mmsm02002PlanStatus,
                        }))
                      }
                    >
                      <option value="">전체</option>
                      {planStatusCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <span className={`${searchLabelClass} w-[56px] shrink-0`}>공정</span>
                    <input
                      className={`${searchControlClass} w-full max-w-[170px]`}
                      placeholder="공정코드"
                      value={form.procCd}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, procCd: event.target.value }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className={workOrderSearchActionsClass}>
                <StatusActionButtons
                  loading={loading}
                  onSearch={() => void onSearch()}
                  exportProps={{
                    rows: plans,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `작업지시서_${toYmd(form.dateFrom)}_${toYmd(form.dateTo)}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="작업 지시 대상"
            right={<span className={countBadgeClass}>{plans.length}건</span>}
          />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={plans}
              showBorders={true}
              loading={loading}
              rowKey={(row, index) =>
                `${row.planYmd ?? 'plan'}-${row.planNo ?? 'no'}-${row.itemCd ?? 'item'}-${index}`
              }
              emptyText="작업 지시 대상 데이터가 없습니다. 조회기간을 넓히거나 생산계획을 먼저 생성하세요."
              classNames={{
                table: 'min-w-[1580px] w-full text-sm',
              }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => togglePlan(rowIndex, checked)}
              />
              <Column dataField="planYmd" caption="생산계획일자" width={130} alignment="center" />
              <Column dataField="planNo" caption="계획번호" width={110} alignment="center" />
              <Column dataField="soYmd" caption="수주일자" width={120} alignment="center" />
              <Column dataField="soNo" caption="수주번호" width={110} alignment="center" />
              <Column dataField="cstNm" caption="거래처" width={170} />
              <Column dataField="itemCd" caption="제품코드" width={120} alignment="center" />
              <Column dataField="itemNm" caption="제품명" width={200} />
              <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
              <Column
                dataField="planQty"
                caption="지시수량"
                width={110}
                alignment="right"
                cellRender={(row) => formatNumber(row.planQty ?? 0)}
              />
              <Column dataField="reqYmd" caption="납기요청일" width={120} alignment="center" />
              <Column dataField="prdSchdYmd" caption="생산예정일" width={120} alignment="center" />
              <Column dataField="procNm" caption="공정" width={130} />
              <Column dataField="planStatusNm" caption="계획상태" width={100} alignment="center" />
            </DataGrid>
          </div>
        </SectionCard>

        <SectionCard span="full" width="full">
          <SectionHeader
            title="작업 지시서"
            right={
              <div className="flex items-center gap-2">
                <span className={countBadgeClass}>
                  {detailLoading ? '조회중...' : selectedPlan ? '1건 선택' : '미선택'}
                </span>
                {canSave && (
                  <button
                    className={saveButtonClass}
                    disabled={!selectedPlan || saving || detailLoading}
                    onClick={() => void onSaveWorkOrder()}
                  >
                    {saving ? '등록중...' : '작업지시 등록'}
                  </button>
                )}
              </div>
            }
          />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded border border-slate-200 bg-white">
              <div className="grid grid-cols-1 border-b border-slate-200 text-sm md:grid-cols-2">
                <div className="flex min-h-10 border-b border-slate-200 md:border-r">
                  <div className={detailLabelClass}>생산계획번호</div>
                  <div className="flex flex-1 items-center px-3">
                    {selectedPlan
                      ? `${selectedPlan.planYmd ?? ''}-${selectedPlan.planNo ?? ''}`
                      : ''}
                  </div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200">
                  <div className={detailLabelClass}>생산예정일</div>
                  <div className="flex flex-1 items-center px-3">{selectedPlan?.prdSchdYmd}</div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200 md:border-r">
                  <div className={detailLabelClass}>제품</div>
                  <div className="flex flex-1 items-center px-3">
                    {selectedPlan
                      ? `${selectedPlan.itemCd ?? ''} ${selectedPlan.itemNm ?? ''}`.trim()
                      : ''}
                  </div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200">
                  <div className={detailLabelClass}>지시수량</div>
                  <div className="flex flex-1 items-center px-3">
                    <input
                      className={detailNumberInputClass}
                      value={orderQty}
                      disabled={!selectedPlan || saving}
                      onChange={(event) => setOrderQty(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200 md:border-r">
                  <div className={detailLabelClass}>거래처</div>
                  <div className="flex flex-1 items-center px-3">{selectedPlan?.cstNm}</div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200">
                  <div className={detailLabelClass}>공정</div>
                  <div className="flex flex-1 items-center px-3">{selectedPlan?.procNm}</div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200 md:border-r">
                  <div className={detailLabelClass}>지시일자</div>
                  <div className="flex flex-1 items-center px-3">
                    <input
                      type="date"
                      className={detailInputClass}
                      value={workOrderYmd}
                      disabled={!selectedPlan || saving}
                      onChange={(event) => setWorkOrderYmd(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex min-h-10 border-b border-slate-200">
                  <div className={detailLabelClass}>상태</div>
                  <div className="flex flex-1 items-center px-3">지시</div>
                </div>
                <div className="flex min-h-10 md:col-span-2">
                  <div className={detailLabelClass}>비고</div>
                  <div className="flex flex-1 items-center px-3 py-2">
                    <input
                      className={detailInputClass}
                      value={remark}
                      disabled={!selectedPlan || saving}
                      onChange={(event) => setRemark(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded border border-slate-200 bg-white">
              <DataGrid
                dataSource={salesLinks}
                showBorders={false}
                loading={detailLoading}
                rowKey={(_row, index) => `sales-${index}`}
                emptyText="수주 연결 정보가 없습니다."
                classNames={{ table: 'min-w-[620px] w-full text-sm' }}
              >
                <Paging enabled={false} />
                <Column
                  dataField="originSoNo"
                  caption="원 수주번호"
                  width={130}
                  alignment="center"
                />
                <Column dataField="custDueYmd" caption="고객 납기" width={120} alignment="center" />
                <Column dataField="cstNm" caption="거래처" width={150} />
                <Column
                  dataField="soQty"
                  caption="수주수량"
                  width={100}
                  alignment="right"
                  cellRender={(row) => formatNumber(row.soQty ?? 0)}
                />
                <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
              </DataGrid>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard span="full" width="full">
            <SectionHeader
              title="투입 자재"
              right={
                <span className={countBadgeClass}>
                  {detailLoading ? '조회중...' : `${bomMaterials.length}건`}
                </span>
              }
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={bomMaterials}
                showBorders={true}
                loading={detailLoading}
                rowKey={(_row, index) => `bom-${index}`}
                emptyText="투입 자재 데이터가 없습니다."
                classNames={{ table: 'min-w-[640px] w-full text-sm' }}
              >
                <Paging enabled={false} />
                <Column dataField="matCd" caption="원자재코드" width={120} alignment="center" />
                <Column dataField="matNm" caption="원자재명" width={180} />
                <Column
                  dataField="reqQty"
                  caption="소요량"
                  width={100}
                  alignment="right"
                  cellRender={(row) => formatNumber(row.reqQty ?? 0)}
                />
                <Column
                  dataField="stockQty"
                  caption="재고"
                  width={100}
                  alignment="right"
                  cellRender={(row) => formatNumber(row.stockQty ?? 0)}
                />
                <Column
                  dataField="shortageQty"
                  caption="부족수량"
                  width={110}
                  alignment="right"
                  cellRender={(row) => formatNumber(row.shortageQty ?? 0)}
                />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="full" width="full">
            <SectionHeader
              title="공정 순서"
              right={
                <span className={countBadgeClass}>
                  {detailLoading ? '조회중...' : `${processRows.length}건`}
                </span>
              }
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={processRows}
                showBorders={true}
                loading={detailLoading}
                rowKey={(_row, index) => `proc-${index}`}
                emptyText="공정 순서 데이터가 없습니다."
                classNames={{ table: 'min-w-[520px] w-full text-sm' }}
              >
                <Paging enabled={false} />
                <Column dataField="procSeq" caption="순서" width={90} alignment="right" />
                <Column dataField="procCd" caption="공정코드" width={120} alignment="center" />
                <Column dataField="procNm" caption="공정명" width={180} />
                <Column dataField="unitCd" caption="기준단위" width={120} alignment="center" />
              </DataGrid>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
