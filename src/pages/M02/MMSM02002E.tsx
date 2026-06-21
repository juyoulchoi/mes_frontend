import { useEffect, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { toYmd } from '@/lib/excel';
import { http } from '@/lib/http';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  countBadgeClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  searchButtonClass,
  statusActionGroupClass,
} from '@/lib/pageStyles';
import { useCodes } from '@/lib/hooks/useCodes';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import { exportMmsm02002PlanCsv, normalizeMmsm02002MasterRow } from '@/services/m02/mmsm02002';
import type {
  Mmsm02002BomMaterialRow,
  Mmsm02002MasterRow,
  Mmsm02002PlanReviewResponse,
  Mmsm02002PlanStatus,
  Mmsm02002ProcessRow,
  Mmsm02002SalesLinkRow,
  Mmsm02002SearchForm,
} from '@/services/m02/mmsm02002';

const searchLabelClass = 'font-medium text-slate-700';
const searchControlClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm';
const productionPlanSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,446px)] items-end gap-2 xl:min-w-[1560px] xl:grid-cols-[minmax(300px,446px)_minmax(300px,446px)_minmax(300px,446px)_minmax(260px,360px)_minmax(300px,420px)] xl:gap-x-[30px]';

export default function MMSM02002E() {
  const { canSearch, canExport } = usePagePermissions();
  const [form, setForm] = useState<Mmsm02002SearchForm>(() => {
    const today = getTodayYmd();

    return {
      dateType: 'PLAN',
      dateFrom: today,
      dateTo: today,
      cstCd: '',
      cstNm: '',
      itemCd: '',
      itemNm: '',
      planStatus: '',
      procCd: '',
    };
  });
  const [master, setMaster] = useState<Mmsm02002MasterRow[]>([]);
  const [bomMaterials, setBomMaterials] = useState<Mmsm02002BomMaterialRow[]>([]);
  const [processRows, setProcessRows] = useState<Mmsm02002ProcessRow[]>([]);
  const [salesLinks, setSalesLinks] = useState<Mmsm02002SalesLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { codes: dateTypeCodes } = useCodes('PLAN_DATE');
  const { codes: planStatusCodes } = useCodes('PLAN_STAT');

  useEffect(() => {
    const selected = master.find((row) => row.CHECK);
    const prdPlnYmd = selected?.prdPlnYmd ?? selected?.planYmd;
    const prdPlnSeq = Number(selected?.prdPlnSeq ?? selected?.planNo);

    if (!selected || !prdPlnYmd || !Number.isFinite(prdPlnSeq)) {
      setBomMaterials([]);
      setProcessRows([]);
      setSalesLinks([]);
      return;
    }

    let ignore = false;

    async function fetchReview() {
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
        setError(e instanceof Error ? e.message : String(e));
        setBomMaterials([]);
        setProcessRows([]);
        setSalesLinks([]);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    void fetchReview();

    return () => {
      ignore = true;
    };
  }, [master]);

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
      setMaster((Array.isArray(data) ? data : []).map(normalizeMmsm02002MasterRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleMaster(rowIndex: number, checked: boolean) {
    setMaster((prev) =>
      prev.map((row, index) => ({
        ...row,
        CHECK: checked && index === rowIndex,
      }))
    );
  }

  function onExportCsv() {
    exportMmsm02002PlanCsv(master);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={productionPlanSearchGridClass}>
              <div className="flex max-w-[446px] flex-wrap items-end gap-2">
                <span className={`${searchLabelClass} flex h-10 w-[96px] items-center text-sm`}>
                  검색일자
                </span>
                <select
                  className={`${searchControlClass} w-full max-w-[150px]`}
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
                  className={`${searchControlClass} w-full max-w-[150px]`}
                  value={form.dateFrom}
                  max={form.dateTo || undefined}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dateFrom: event.target.value }))
                  }
                />
                <span className="flex h-10 items-center text-sm text-slate-500">~</span>
                <input
                  type="date"
                  className={`${searchControlClass} w-full max-w-[150px]`}
                  value={form.dateTo}
                  min={form.dateFrom || undefined}
                  onChange={(event) => setForm((prev) => ({ ...prev, dateTo: event.target.value }))}
                />
              </div>
              <div className="col-start-1 row-start-2 xl:col-start-2 xl:row-start-1">
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
              <div className="col-start-3 row-start-1 xl:col-start-5">
                <div className={statusActionGroupClass}>
                  {canSearch && (
                    <button
                      onClick={() => void onSearch()}
                      className={searchButtonClass}
                      disabled={loading}
                    >
                      {loading ? '조회중...' : '조회'}
                    </button>
                  )}
                  {canExport && (
                    <button onClick={onExportCsv} className={searchButtonClass}>
                      엑셀
                    </button>
                  )}
                </div>
              </div>
              <div className="col-start-3 row-start-2 xl:col-start-3 xl:row-start-1">
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
              <div className="col-start-2 row-start-2 flex flex-wrap items-end gap-2 xl:col-start-4 xl:row-start-1">
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
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="생산계획 목록"
            right={<span className={countBadgeClass}>{master.length}건</span>}
          />
          <div className={gridScrollClass}>
            <DataGrid
              dataSource={master}
              showBorders={true}
              rowKey={(row, index) =>
                `${row.planYmd ?? row.soYmd ?? 'plan'}-${row.planNo ?? row.soNo ?? 'no'}-${row.itemCd ?? 'item'}-${index}`
              }
              emptyText="생산계획 목록 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{
                table: 'min-w-[1680px] w-full text-sm',
              }}
            >
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
              />
              <Column dataField="planYmd" caption="생산계획일자" width={130} alignment="center" />
              <Column dataField="planNo" caption="계획번호" width={110} alignment="center" />
              <Column dataField="soYmd" caption="수주일자" width={120} alignment="center" />
              <Column dataField="soNo" caption="수주번호" width={110} alignment="center" />
              <Column dataField="cstNm" caption="거래처" width={170} />
              <Column dataField="itemCd" caption="제품코드" width={120} alignment="center" />
              <Column dataField="itemNm" caption="제품명" width={200} />
              <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
              <Column dataField="soQty" caption="수주수량" width={110} alignment="right" />
              <Column dataField="planQty" caption="계획수량" width={110} alignment="right" />
              <Column dataField="reqYmd" caption="납기요청일" width={120} alignment="center" />
              <Column dataField="prdSchdYmd" caption="생산예정일" width={120} alignment="center" />
              <Column dataField="procNm" caption="공정" width={130} />
              <Column dataField="planStatusNm" caption="계획상태" width={100} alignment="center" />
            </DataGrid>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SectionCard span="full" width="full">
            <SectionHeader
              title="BOM 기준 필요 자재"
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
                rowKey={(_row, index) => `bom-${index}`}
                emptyText="BOM 기준 필요 자재 데이터가 없습니다."
                classNames={{ table: 'min-w-[640px] w-full text-sm' }}
              >
                <Column dataField="matCd" caption="원자재코드" width={120} alignment="center" />
                <Column dataField="matNm" caption="원자재명" width={180} />
                <Column dataField="reqQty" caption="소요량" width={100} alignment="right" />
                <Column dataField="stockQty" caption="재고" width={100} alignment="right" />
                <Column dataField="shortageQty" caption="부족수량" width={110} alignment="right" />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="full" width="full">
            <SectionHeader
              title="공정/작업 순서"
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
                rowKey={(_row, index) => `proc-${index}`}
                emptyText="공정/작업 순서 데이터가 없습니다."
                classNames={{ table: 'min-w-[520px] w-full text-sm' }}
              >
                <Column dataField="procCd" caption="공정코드" width={120} alignment="center" />
                <Column dataField="procNm" caption="공정명" width={160} />
                <Column dataField="procSeq" caption="순서" width={100} alignment="right" />
                <Column dataField="unitCd" caption="기준단위" width={140} />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="full" width="full">
            <SectionHeader
              title="수주 연결 정보"
              right={
                <span className={countBadgeClass}>
                  {detailLoading ? '조회중...' : `${salesLinks.length}건`}
                </span>
              }
            />
            <div className={gridScrollClass}>
              <DataGrid
                dataSource={salesLinks}
                showBorders={true}
                rowKey={(_row, index) => `sales-${index}`}
                emptyText="수주 연결 정보 데이터가 없습니다."
                classNames={{ table: 'min-w-[560px] w-full text-sm' }}
              >
                <Column
                  dataField="originSoNo"
                  caption="원 수주번호"
                  width={130}
                  alignment="center"
                />
                <Column dataField="custDueYmd" caption="고객 납기" width={120} alignment="center" />
                <Column dataField="cstNm" caption="거래처" width={140} />
                <Column dataField="soQty" caption="수주수량" width={100} alignment="right" />
                <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
                <Column dataField="priority" caption="긴급" width={80} alignment="center" />
              </DataGrid>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
