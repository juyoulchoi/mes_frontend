import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import StatusActionButtons from '@/components/StatusActionButtons';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { PAGE_SIZE } from '@/lib/pagination';
import {
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  statusSearchGridClass,
} from '@/lib/pageStyles';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m02/mmsm02007';

export default function MMSM02007S() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);
  const [form, setForm] = useState<SearchForm>({
    startDate: first.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
  });

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/sales/findSoStatusList',
    form,
    pageSize: PAGE_SIZE,
    includePageParam: false,
    includeSizeParam: false,
    mapParams: ({ form }) => ({
      startDate: form.startDate.split('-').join(''),
      endDate: form.endDate.split('-').join(''),
      cstNm: form.cstNm,
      itemNm: form.itemNm,
    }),
  });

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className={statusSearchGridClass}>
            <FromToDateField
              label="수주일자"
              fromValue={form.startDate}
              toValue={form.endDate}
              onFromChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
              onToChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
            />

            <CodeNameField
              label="거래처"
              id="customer"
              code={form.cstCd}
              name={form.cstNm}
              codePlaceholder="코드"
              namePlaceholder="거래처명"
              onSearch={() => setCustomerOpen(true)}
              onClear={() => setForm((prev) => ({ ...prev, cstCd: '', cstNm: '' }))}
            />

            <StatusActionButtons
              loading={loading}
              onSearch={() => void fetchList(0)}
              onSave={() => navigate('/app/m02/MMSM02001E')}
              saveLabel="수주등록"
              exportProps={{
                rows: result.content,
                headers: exportHeaders,
                mapRow: mapExportRow,
                filename: () => `수주현황_${form.endDate.split('-').join('')}.csv`,
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[546px_1fr]">
            <CodeNameField
              label="제품"
              id="item"
              code={form.itemCd}
              name={form.itemNm}
              codePlaceholder="코드"
              namePlaceholder="제품명"
              onSearch={() => setItemPickerOpen(true)}
              onClear={() => setForm((prev) => ({ ...prev, itemCd: '', itemNm: '' }))}
            />
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="수주 현황" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={result.content}
              rowKey={(row, index) =>
                `${row.soNo ?? 'so'}-${row.itemCd ?? 'item'}-${row.reqYmd ?? 'date'}-${index}`
              }
              showBorders={true}
              loading={loading}
              emptyText="수주 현황 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{
                table: 'min-w-[1540px] w-full text-sm',
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
          customer={{
            open: customerOpen,
            title: '거래처 정보',
            cstCd: form.cstCd,
            cstNm: form.cstNm,
            onClose: () => setCustomerOpen(false),
            onSelect: (value) => {
              setForm((prev) => ({ ...prev, cstCd: value.cstCd, cstNm: value.cstNm }));
            },
          }}
          item={{
            open: itemPickerOpen,
            title: '제품 정보',
            itemGb: 'FG,SFG',
            itemNm: form.itemNm,
            onClose: () => setItemPickerOpen(false),
            onSelect: (value) => {
              setForm((prev) => ({
                ...prev,
                itemCd: value.itemCd,
                itemNm: value.itemNm,
              }));
            },
          }}
        />
      </div>
    </div>
  );
}
