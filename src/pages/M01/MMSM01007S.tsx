import React, { useMemo, useRef, useState } from 'react';

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
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import {
  responsiveStaticSearchActionsClass,
  responsiveStaticSearchCustomerFieldClass,
  responsiveStaticSearchDateFieldClass,
  responsiveStaticSearchFieldsClass,
  responsiveStaticSearchGridClass,
  responsiveStaticSearchItemFieldClass,
} from '@/lib/pageStyles';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  columns,
  exportHeaders,
  getLatestRowsByItem,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01007';

const MMSM01007S: React.FC = () => {
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
    apiPath: '/api/v1/mdm/stkmst/searchStkMstDetList',
    form,
    pageSize: PAGE_SIZE,
    includeSizeParam: false,
    mapParams: ({ form: currentForm }) => ({
      giYmdS: currentForm.startDate.split('-').join(''),
      giYmdE: currentForm.endDate.split('-').join(''),
      cstCd: currentForm.cstCd || '',
      itemCd: currentForm.itemCd || '',
    }),
  });
  const latestRows = useMemo(() => getLatestRowsByItem(result.content), [result.content]);
  const latestResult = useMemo(
    () => ({
      ...result,
      content: latestRows,
      totalElements: latestRows.length,
      totalPages: latestRows.length > 0 ? 1 : 0,
      numberOfElements: latestRows.length,
    }),
    [latestRows, result]
  );

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={responsiveStaticSearchGridClass}>
              <div className={responsiveStaticSearchFieldsClass}>
                <div className={responsiveStaticSearchDateFieldClass}>
                  <FromToDateField
                    label="출고일자"
                    fromValue={form.startDate}
                    toValue={form.endDate}
                    onFromChange={(value) => setForm({ ...form, startDate: value })}
                    onToChange={(value) => setForm({ ...form, endDate: value })}
                  />
                </div>

                <div className={responsiveStaticSearchCustomerFieldClass}>
                  <CodeNameField
                    label="거래처"
                    id="cust"
                    code={form.cstCd}
                    name={form.cstNm}
                    codePlaceholder="코드"
                    namePlaceholder="거래처명"
                    onSearch={() => setCustomerOpen(true)}
                    onClear={() => setForm((prev) => ({ ...prev, cstCd: '', cstNm: '' }))}
                  />
                </div>
                <div className={responsiveStaticSearchItemFieldClass}>
                  <CodeNameField
                    label="원자재"
                    id="item"
                    code={form.itemCd}
                    name={form.itemNm}
                    codePlaceholder="코드"
                    namePlaceholder="원자재명"
                    onSearch={() => setItemPickerOpen(true)}
                    onClear={() => setForm((prev) => ({ ...prev, itemCd: '', itemNm: '' }))}
                  />
                </div>
              </div>

              <div className={responsiveStaticSearchActionsClass}>
                <StatusActionButtons
                  loading={loading}
                  onSearch={() => void fetchList(0)}
                  exportProps={{
                    rows: latestRows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `원자재재고현황_${form.endDate.split('-').join('')}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="재고 현황" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={latestRows}
              pageResult={latestResult}
              rowKey={(row, index) => `${row.itemCd ?? 'item'}-${row.ymd ?? 'ymd'}-${index}`}
              showBorders={true}
              loading={loading}
              classNames={{
                table: 'min-w-[1260px] w-full text-sm',
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
            custGb: 'CUSTOMER',
            cstCd: form.cstCd,
            cstNm: form.cstNm,
            onClose: () => setCustomerOpen(false),
            onSelect: (value) => {
              setForm((prev) => ({ ...prev, cstCd: value.cstCd, cstNm: value.cstNm }));
            },
          }}
          item={{
            open: itemPickerOpen,
            title: '원자재 정보',
            itemGb: 'RAW,SUB',
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
};

export default MMSM01007S;
