import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import StatusActionButtons from '@/components/StatusActionButtons';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import {
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01009';

const itemOnlySearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,420px)_minmax(16px,1fr)_minmax(300px,420px)] items-end gap-2';

export default function MMSM01009S() {
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [form, setForm] = useState<SearchForm>({
    itemCd: '',
    itemNm: '',
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
        itemCd: form.itemCd,
        itemNm: form.itemNm,
      }).toString();
      const data = await http<RowItem[]>(`/api/v1/planning/prditemuse/searchUseHistory?${qs}`);
      setRows(Array.isArray(data) ? data : []);
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
            <div className={itemOnlySearchGridClass}>
              <CodeNameField
                label="원자재"
                id="item"
                code={form.itemCd}
                name={form.itemNm}
                codePlaceholder="코드"
                namePlaceholder="원자재명"
                onSearch={() => setItemPickerOpen(true)}
                onClear={() => setForm({ itemCd: '', itemNm: '' })}
              />

              <div className="col-start-3 row-start-1">
                <StatusActionButtons
                  loading={loading}
                  onSearch={() => void onSearch()}
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: '투입이력현황.csv',
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="투입 이력 현황" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) =>
                `${row.matCd ?? row.matNm ?? 'material'}-${row.reqYmd ?? 'date'}-${index}`
              }
              showBorders={true}
              loading={loading}
              classNames={{
                table: 'min-w-[980px] w-full text-sm',
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

        <SearchCodePickers
          item={{
            open: itemPickerOpen,
            title: '원자재 정보',
            itemGb: 'RAW,SUB',
            itemNm: form.itemNm,
            onClose: () => setItemPickerOpen(false),
            onSelect: (value) => {
              setForm({
                itemCd: value.itemCd,
                itemNm: value.itemNm,
              });
            },
          }}
        />
      </div>
    </div>
  );
}
