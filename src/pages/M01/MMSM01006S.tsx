import React, { useEffect, useMemo, useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
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
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  buildIssueCancelPayload,
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01006';
import { updateCheckedRows } from '@/lib/gridRows';
import type { AuthMeResponse } from '@/services/m01/mmsm01003';

const MMSM01006S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [canceling, setCanceling] = useState(false);
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
      cstCd: currentForm.cstCd || '',
      itemCd: currentForm.itemCd || '',
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

  useEffect(() => {
    setRows(result.content.map((row) => ({ ...row, CHECK: false })));
  }, [result.content]);

  const displayResult = useMemo(
    () => ({
      ...result,
      content: rows,
    }),
    [result, rows]
  );

  function toggleRow(rowIndex: number, checked: boolean) {
    updateCheckedRows(setRows, rowIndex, checked);
  }

  async function onCancelIssue() {
    const selectedRows = rows.filter((row) => row.CHECK);

    if (selectedRows.length === 0) {
      window.alert('출고 취소할 데이터를 선택하세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedRows.length}건의 출고를 취소하시겠습니까?`)) return;

    setCanceling(true);

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
        window.alert('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 시도하세요.');
        return;
      }

      const payloads = buildIssueCancelPayload(selectedRows, userId);
      await Promise.all(
        payloads.map((payload) =>
          http('/api/v1/material/gimst/savePayload', { method: 'POST', body: payload })
        )
      );

      await fetchList(result.page);
      window.alert('출고 취소되었습니다.');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCanceling(false);
    }
  }

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
                    onFromChange={(value) => setForm({ ...form, startDate: value })}
                    onToChange={(value) => setForm({ ...form, endDate: value })}
                  />
                </div>

                <div className={responsiveSearchCustomerFieldClass[searchLayoutMode]}>
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

                <div className={responsiveSearchItemFieldClass[searchLayoutMode]}>
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

              <div className={responsiveSearchActionsClass}>
                <StatusActionButtons
                  loading={loading}
                  canceling={canceling}
                  onSearch={() => void fetchList(0)}
                  onCancel={() => void onCancelIssue()}
                  cancelLabel="출고취소"
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () =>
                      `원자재재고현황_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="출고 현황" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              pageResult={displayResult}
              rowKey={(row, index) =>
                `${row.giYmd ?? 'gi'}-${row.giSeq ?? 'seq'}-${row.giSubSeq ?? 'sub'}-${row.itemCd ?? 'item'}-${index}`
              }
              showBorders={true}
              loading={loading}
              remoteOperations={true}
              onPageChange={(page) => void fetchList(page)}
              classNames={{
                table: 'min-w-[1260px] w-full text-sm',
              }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => toggleRow(rowIndex, checked)}
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

export default MMSM01006S;
