import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import {
  columns,
  exportHeaders,
  fetchRows,
  mapExportRow,
  toggleRow,
  type Row,
} from '@/services/m04/mmsm04007';

export default function MMSM04007S() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);
  const gridHeight = Math.max(tableHeight - 58, 360);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      setRows(await fetchRows());
    } catch (searchError) {
      setRows([]);
      setError(searchError instanceof Error ? searchError.message : String(searchError));
    } finally {
      setLoading(false);
    }
  }

  function onToggleRow(rowIndex: number, checked: boolean) {
    setRows((currentRows) => toggleRow(currentRows, rowIndex, checked));
  }

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="flex justify-end">
            <StatusActionButtons
              loading={loading}
              onSearch={() => void onSearch()}
              exportProps={{
                rows,
                headers: exportHeaders,
                mapRow: mapExportRow,
                filename: 'MMSM04007S.csv',
              }}
            />
          </div>
        </SectionCard>

        {error ? <AlertBox tone="error">{error}</AlertBox> : null}

        <SectionCard span="full" width="full">
          <SectionHeader title="제품 투입품목 목록" />
          <div className={gridScrollClass} style={{ height: gridHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.ITEM_CD ?? 'item'}-${row.PO_YMD ?? 'date'}-${index}`}
              showBorders={true}
              loading={loading}
              emptyText="제품 투입품목 데이터가 없습니다. 조회를 눌러 가져오세요."
              classNames={{ table: 'min-w-[760px] w-full text-sm' }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => onToggleRow(rowIndex, checked)}
              />
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
