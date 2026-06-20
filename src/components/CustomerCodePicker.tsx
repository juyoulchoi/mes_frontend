import PopupGrid from '@/components/PopupGrid';
import type { TableColumn } from '@/components/table/BaseTable';
import { LabeledInput } from '@/components/ui/labeled-input';
import { PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type RowItem = {
  ceoNm: string;
  cstCd: string;
  cstNm: string;
  regNo: string;
};

export type CustomerCodePickerItem = RowItem;

type SearchForm = {
  custGb?: string;
  cstNm?: string;
};

interface CustomerCodePickerProps {
  title: string;
  onSelect: (value: RowItem) => void;
  onClose: () => void;
  custGb?: string;
  cstCd?: string;
  cstNm?: string;
}

export default function CustomerCodePicker({
  title,
  custGb,
  cstNm,
  onSelect,
  onClose,
}: CustomerCodePickerProps) {
  const [customerName, setCustomerName] = useState(cstNm ?? '');
  const lastSearchKeyRef = useRef<string>('');

  const form = useMemo<SearchForm>(
    () => ({
      custGb,
      cstNm: customerName,
    }),
    [custGb, customerName]
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
      { key: 'ceoNm', header: '대표자명', accessor: 'ceoNm' },
      { key: 'cstCd', header: '거래처코드', accessor: 'cstCd' },
      { key: 'cstNm', header: '거래처명', accessor: 'cstNm' },
      { key: 'regNo', header: '사업자번호', accessor: 'regNo' },
    ],
    []
  );

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/mdm/cust/search',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form }: PageFetchRequest<SearchForm>) => ({
      custGb: form.custGb,
      cstNm: form.cstNm,
    }),
  });

  useEffect(() => {
    const searchKey = `${custGb ?? ''}_${customerName}`;

    if (lastSearchKeyRef.current === searchKey) return;
    lastSearchKeyRef.current = searchKey;

    void fetchList(0);
  }, [custGb, customerName, fetchList]);

  const emptyMessage = loading ? '거래처 목록을 불러오는 중...' : '조회된 거래처가 없습니다.';

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
              id="txtCustNm"
              label="거래처명"
              value={customerName}
              wrapperClassName="grid grid-cols-1 gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setCustomerName(e.target.value)}
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
          rowKey={(row) => `${row.cstCd}_${row.cstNm}_${row.regNo}`}
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
