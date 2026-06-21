import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import {
  columns,
  exportHeaders,
  mapExportRow,
  normalizeRows,
  toYmd,
  type ApiRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01011';

const stockTakingStatusSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,420px)_minmax(16px,1fr)_minmax(300px,420px)] items-end gap-2';

function getFirstDayOfMonthYmd() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

export default function MMSM01011S() {
  const [form, setForm] = useState<SearchForm>({
    startDate: getFirstDayOfMonthYmd(),
    endDate: getTodayYmd(),
  });
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        giYmdS: toYmd(form.startDate),
        giYmdE: toYmd(form.endDate),
      }).toString();
      const data = await http<ApiRow[]>(`/api/v1/mdm/stkmst/searchStkMstDetList?${qs}`);
      setRows(normalizeRows(Array.isArray(data) ? data : []));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={stockTakingStatusSearchGridClass}>
              <FromToDateField
                label="실사일자"
                fromValue={form.startDate}
                toValue={form.endDate}
                onFromChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
                onToChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
              />

              <div className="col-start-3">
                <StatusActionButtons
                  loading={loading}
                  onSearch={() => void onSearch()}
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () =>
                      `재고조정내역_${toYmd(form.startDate)}_${toYmd(form.endDate)}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="재고조정 내역" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.ymd ?? 'date'}-${row.itemCd ?? 'item'}-${index}`}
              showBorders={true}
              loading={loading}
              classNames={{
                table: 'min-w-[1420px] w-full text-sm',
              }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              {columns.map((column, index) => (
                <Column
                  key={`${String(column.dataField)}-${index}`}
                  dataField={column.dataField}
                  caption={column.caption}
                  width={column.width}
                  alignment={column.alignment}
                  headerAlignment={column.headerAlignment}
                  headerClassName={column.headerClassName}
                  cellRender={column.cellRender}
                />
              ))}
            </DataGrid>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
