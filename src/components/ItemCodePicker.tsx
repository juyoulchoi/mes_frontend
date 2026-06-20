import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';
import PopupGrid from '@/components/PopupGrid';
import type { TableColumn } from '@/components/table/BaseTable';
import { LabeledInput } from '@/components/ui/labeled-input';

type RowItem = {
  itemCd: string;
  itemNm: string;
  itemgb: string;
  itemGbNm: string;
  unitCd: string;
  obtGb: string;
  obtNm: string;
  status: string;
};

export type ItemCodePickerItem = RowItem;

type SearchForm = {
  itemGb?: string;
  itemNm?: string;
};

interface ItemCodePickerProps {
  title: string;
  onSelect: (value: RowItem) => void;
  onClose: () => void;
  itemGb?: 'FG' | 'SFG' | 'RAW' | 'SUB' | 'FG,SFG' | 'RAW,SUB';
  itemNm?: string;
}

export default function ItemInfoCodePicker({
  title,
  itemGb,
  itemNm,
  onSelect,
  onClose,
}: ItemCodePickerProps) {
  const [itemName, setItemName] = useState(itemNm ?? '');
  const lastSearchKeyRef = useRef<string>('');

  const form = useMemo<SearchForm>(
    () => ({
      itemGb,
      itemNm: itemName,
    }),
    [itemGb, itemName]
  );

  const selectRow = useCallback(
    (row: RowItem) => {
      onSelect(row);
      onClose();
    },
    [onClose, onSelect]
  );

  const columns = useMemo<TableColumn<RowItem>[]>(
    () => [
      { key: 'itemCd', header: '자재코드', accessor: 'itemCd' },
      { key: 'itemNm', header: '자재명', accessor: 'itemNm' },
    ],
    []
  );

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/mdm/item/search',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form }: PageFetchRequest<SearchForm>) => ({
      itemGb: form.itemGb,
      itemNm: form.itemNm,
    }),
  });

  useEffect(() => {
    const searchKey = `${itemGb ?? ''}_${itemName}`;

    if (lastSearchKeyRef.current === searchKey) return;
    lastSearchKeyRef.current = searchKey;

    void fetchList(0);
  }, [itemGb, itemName, fetchList]);

  const emptyMessage = loading ? '원자재 목록을 불러오는 중...' : '조회된 원자재가 없습니다.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[min(560px,calc(100vh-24px))] w-full max-w-[760px] flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-full p-1 hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="border-b p-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]">
            <LabeledInput
              id="txtItemNm"
              label={title}
              value={itemName}
              wrapperClassName="grid grid-cols-1 gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void fetchList(0);
              }}
            />
            <button
              type="button"
              className="h-10 w-full rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50 md:w-auto"
              onClick={() => void fetchList(0)}
              disabled={loading}
            >
              {loading ? '조회중...' : '조회'}
            </button>
          </div>
        </div>

        {error ? <div className="px-4 pt-4 text-sm text-red-600">{error}</div> : null}

        <PopupGrid
          result={result}
          columns={columns}
          rowKey={(row) => `${row.itemCd}`}
          emptyText={emptyMessage}
          loading={loading}
          onPageChange={(page) => void fetchList(page)}
          getRowProps={(row) => ({
            onDoubleClick: () => selectRow(row),
            className: 'cursor-pointer',
          })}
        />
      </div>
    </div>
  );
}
