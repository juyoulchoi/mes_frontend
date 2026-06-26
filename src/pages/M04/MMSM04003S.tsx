import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import FromToDateField from '@/components/FromToDateField';
import SearchCodePickers from '@/components/SearchCodePickers';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import {
  getResponsiveSearchLayoutMode,
  responsiveSearchActionsClass,
  responsiveSearchCustomerFieldClass,
  responsiveSearchDateFieldClass,
  responsiveSearchFieldGridClass,
  responsiveSearchGridClass,
  responsiveSearchItemFieldClass,
} from '@/lib/pageStyles';
import {
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m04/mmsm04001';
import { usePageApiFetch } from '@/services/common/getApiFetch';

export default function MMSM04003S() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);
  const [searchWidth, setSearchWidth] = useState(0);
  const [form, setForm] = useState<SearchForm>({
    startDate: first.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
  });

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/material/gidet/search',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form: currentForm }) => ({
      giYmdS: currentForm.startDate.split('-').join(''),
      giYmdE: currentForm.endDate.split('-').join(''),
      cstCd: currentForm.cstCd,
      itemCd: currentForm.itemCd,
    }),
  });

  useEffect(() => {
    const searchElement = searchRef.current;
    if (!searchElement) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSearchWidth(entry.contentRect.width);
    });
    setSearchWidth(searchElement.clientWidth);
    resizeObserver.observe(searchElement);

    return () => resizeObserver.disconnect();
  }, []);

  const searchLayoutMode = getResponsiveSearchLayoutMode(searchWidth);

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div ref={searchRef} className="overflow-x-auto pb-1">
            <div className={responsiveSearchGridClass}>
              <div className={responsiveSearchFieldGridClass[searchLayoutMode]}>
                <div className={responsiveSearchDateFieldClass[searchLayoutMode]}>
                  <FromToDateField
                    label="출고일자"
                    fromValue={form.startDate}
                    toValue={form.endDate}
                    onFromChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
                    onToChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
                  />
                </div>

                <div className={responsiveSearchCustomerFieldClass[searchLayoutMode]}>
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
                </div>

                <div className={responsiveSearchItemFieldClass[searchLayoutMode]}>
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
              </div>

              <div className={responsiveSearchActionsClass}>
                <StatusActionButtons
                  loading={loading}
                  onSearch={() => void fetchList(0)}
                  onSave={() => navigate('/app/m04/MMSM04002E')}
                  saveLabel="출고지시"
                  exportProps={{
                    rows: result.content,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `제품출고현황_${form.endDate.split('-').join('')}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="제품출고 현황" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={result.content}
              pageResult={result}
              rowKey={(row, index) =>
                `${row.giYmd ?? 'gi'}-${row.giSeq ?? 'seq'}-${row.giSubSeq ?? 'sub'}-${index}`
              }
              showBorders={true}
              loading={loading}
              remoteOperations={true}
              onPageChange={(page) => void fetchList(page)}
              emptyText="제품출고 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{
                table: 'min-w-[1520px] w-full text-sm',
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
              setForm((prev) => ({
                ...prev,
                cstCd: value.cstCd,
                cstNm: value.cstNm,
              }));
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
