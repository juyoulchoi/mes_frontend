import React, { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import DateEdit from '@/components/DateEdit';
import ItemCodePicker from '@/components/ItemCodePicker';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { getApi } from '@/lib/axiosClient';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { formatNumber } from '@/lib/utils';
import { updateCheckedRows } from '@/lib/gridRows';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import {
  buildStockAdjustPayload,
  calculateAdjustQty,
  exportHeaders,
  groupStockAdjustRowsByItem,
  mapExportRow,
  readOnlyColumns,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01008';

const stockAdjustSearchGridClass =
  'grid min-w-[920px] grid-cols-[296px_150px_minmax(0,1fr)_max-content] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[296px_446px_minmax(0,1fr)_max-content] xl:gap-x-[30px]';

export default function MMSM01008E() {
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const [form, setForm] = useState<SearchForm>({
    adjustDate: getTodayYmd(),
    itemCd: '',
    itemNm: '',
  });

  const busy = loading || saving;

  function mapEditableRows(items: RowItem[]) {
    return groupStockAdjustRowsByItem(items).map((row) => ({
      ...row,
      CHECK: false,
      realQty: row.realQty ?? '',
      adjustQty: row.adjustQty ?? '',
      description: row.description ?? '',
    }));
  }

  async function fetchList() {
    setLoading(true);
    setError(null);

    try {
      const data = await getApi<RowItem[]>('/api/v1/mdm/stkmst/searchStkMstDetList', {
        ...(form.itemCd ? { itemCd: form.itemCd } : {}),
      });
      setRows(mapEditableRows(Array.isArray(data) ? data : []));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(rowIndex: number, checked: boolean) {
    updateCheckedRows(setRows, rowIndex, checked);
  }

  function updateRow(rowIndex: number, patch: Partial<RowItem>) {
    setRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;

        const next = { ...row, ...patch, CHECK: true };
        if (Object.prototype.hasOwnProperty.call(patch, 'realQty')) {
          next.adjustQty = calculateAdjustQty(row.qty, patch.realQty);
        }
        return next;
      })
    );
  }

  async function onSave() {
    const targets = rows.filter((row) => row.CHECK);

    if (targets.length === 0) {
      window.alert('저장할 재고 조정 데이터가 없습니다.');
      return;
    }

    const invalidRowIndex = targets.findIndex(
      (row) => row.realQty === undefined || row.realQty === ''
    );
    if (invalidRowIndex >= 0) {
      window.alert('실사량을 입력하세요.');
      return;
    }

    if (!window.confirm(`선택한 ${targets.length}건의 재고를 조정하시겠습니까?`)) return;

    setSaving(true);
    try {
      await http('/api/v1/mdm/stkmst/adjust', {
        method: 'POST',
        body: buildStockAdjustPayload(targets, form.adjustDate),
      });
      await fetchList();
      window.alert('저장되었습니다.');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={stockAdjustSearchGridClass}>
              <DateEdit
                label="조정일자"
                value={form.adjustDate}
                onChange={(value) => setForm((prev) => ({ ...prev, adjustDate: value }))}
              />

              <div className="col-span-2 col-start-1 row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
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

              <div className="col-start-4 row-start-1">
                <StatusActionButtons
                  loading={loading}
                  saving={saving}
                  disabled={busy}
                  onSearch={() => void fetchList()}
                  onSave={() => void onSave()}
                  exportProps={{
                    rows,
                    headers: exportHeaders,
                    mapRow: mapExportRow,
                    filename: () => `원자재재고조정_${form.adjustDate.split('-').join('')}.csv`,
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="재고 조정" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.itemCd ?? 'item'}-${row.ymd ?? 'ymd'}-${index}`}
              showBorders={true}
              loading={busy}
              classNames={{
                table: 'min-w-[1420px] w-full text-sm',
              }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => toggleRow(rowIndex, checked)}
              />
              {readOnlyColumns.map((column, index) => (
                <Column
                  key={`${String(column.dataField)}-${index}`}
                  dataField={column.dataField}
                  caption={column.caption}
                  width={column.width}
                  alignment={column.alignment}
                  cellRender={column.cellRender}
                />
              ))}
              <Column
                dataField="realQty"
                caption="실사량"
                width={120}
                alignment="right"
                cellRender={(row, rowIndex) => (
                  <input
                    value={row.realQty ?? ''}
                    onChange={(event) => updateRow(rowIndex, { realQty: event.target.value })}
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-right text-sm outline-none focus:border-slate-400"
                  />
                )}
              />
              <Column
                dataField="adjustQty"
                caption="조정량"
                width={120}
                alignment="right"
                cellRender={(row) => (
                  <span className="block text-right text-sm text-slate-700">
                    {row.adjustQty === undefined || row.adjustQty === ''
                      ? ''
                      : formatNumber(row.adjustQty)}
                  </span>
                )}
              />
              <Column
                dataField="description"
                caption="조정사유"
                width={280}
                cellRender={(row, rowIndex) => (
                  <input
                    value={row.description ?? ''}
                    onChange={(event) => updateRow(rowIndex, { description: event.target.value })}
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-slate-400"
                  />
                )}
              />
            </DataGrid>
          </div>
        </SectionCard>

        {itemPickerOpen ? (
          <ItemCodePicker
            title="원자재 정보"
            itemGb="RAW,SUB"
            itemNm={form.itemNm}
            onClose={() => setItemPickerOpen(false)}
            onSelect={(value) => {
              setForm((prev) => ({
                ...prev,
                itemCd: value.itemCd,
                itemNm: value.itemNm,
              }));
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
