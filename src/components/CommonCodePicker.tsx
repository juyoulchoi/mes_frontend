import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { LabeledInput } from '@/components/ui/labeled-input';
import { EmptyPageResult, PAGE_SIZE, type PageResult } from '@/lib/pagination';
import { usePageApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';
import type { TableColumn } from '@/components/table/BaseTable';
import PopupGrid from '@/components/PopupGrid';

type RowItem = { codeCd: string; codeNm: string };

type SearchForm = {
  grpCd: string;
  codeCd?: string;
  codeNm?: string;
  status?: string;
};

export interface CommonCodePickerProps {
  title: string;
  onSelect: (v: RowItem) => void;
  onClose: () => void;
  grpCd: string;
  codeCd: string;
  codeNm: string;
}

export default function CommonCodePicker({
  title,
  grpCd,
  codeCd,
  codeNm,
  onSelect,
  onClose,
}: CommonCodePickerProps) {
  const [searchCd, setSearchCd] = useState(codeCd ?? '');
  const [searchNm, setSearchNm] = useState(codeNm ?? '');
  const lastSearchKeyRef = useRef<string>('');

  const form = useMemo<SearchForm>(
    () => ({
      grpCd,
      codeCd: searchCd,
      codeNm: searchNm,
    }),
    [grpCd, searchCd, searchNm]
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
      { key: 'cstCd', header: '코드' },
      { key: 'cstNm', header: '코드명' },
    ],
    []
  );

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/mdm/code/comcode',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form }: PageFetchRequest<SearchForm>) => ({
      grpCd: form.grpCd,
      codeCd: form.codeCd,
      codeNm: form.codeNm,
      status: 'ACTIVE',
    }),
  });

  useEffect(() => {
    const initialCode = codeCd ?? '';
    const initialName = codeNm ?? '';
    const searchKey = `${grpCd ?? ''}_${searchCd ?? ''}_${searchNm ?? ''}`;

    setSearchCd(initialCode);
    setSearchNm(initialName);

    if (lastSearchKeyRef.current === searchKey) return;
    lastSearchKeyRef.current = searchKey;

    void fetchList(0);
  }, [grpCd, searchCd, searchNm, fetchList]);

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
              id="txtCode"
              label="검색코드"
              value={searchCd}
              wrapperClassName="grid grid-cols-1 gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setSearchCd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void fetchList(0);
              }}
            />
            <LabeledInput
              id="txtName"
              label="검색명"
              value={searchNm}
              wrapperClassName="grid grid-cols-1 gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center sm:gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setSearchNm(e.target.value)}
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
          rowKey={(row) => `${row.codeCd}`}
          emptyText={emptyMessage}
          loading={loading}
          onPageChange={(page) => void fetchList(page)}
        />
      </div>
    </div>
  );
}
