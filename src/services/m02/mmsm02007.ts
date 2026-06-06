import type { GridColumn } from '@/components/table/DataGrid';
import { formatNumber } from '@/lib/utils';

export interface SearchForm {
  startDate: string;
  endDate: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
}

export interface RowItem {
  reqYmd?: string;
  soNo?: string;
  cstCd?: string;
  cstNm?: string;
  itemCd?: string;
  itemNm?: string;
  qty?: number | string;
  unitCd?: string;
  unitNm?: string;
  emGb?: string;
  emNm?: string;
  endYn?: string;
  outQty?: number | string;
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = typeof value === 'number' ? value : Number(value.replace(/,/g, ''));
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function getRemainingQty(row: RowItem) {
  return Math.max(toNumber(row.qty) - toNumber(row.outQty), 0);
}

export const columns: GridColumn<RowItem>[] = [
  { dataField: 'reqYmd', caption: '납기요청일', width: 120, alignment: 'center' },
  { dataField: 'soNo', caption: '수주번호', width: 170, alignment: 'center' },
  { dataField: 'cstCd', caption: '거래처코드', width: 120, alignment: 'center' },
  { dataField: 'cstNm', caption: '거래처명', width: 170 },
  { dataField: 'itemCd', caption: '제품코드', width: 130, alignment: 'center' },
  { dataField: 'itemNm', caption: '제품명', width: 200 },
  {
    dataField: 'qty',
    caption: '수주수량',
    width: 120,
    alignment: 'right',
    headerAlignment: 'center',
    cellRender: (row) => formatNumber(row.qty ?? 0),
  },
  { dataField: 'unitNm', caption: '단위', width: 90, alignment: 'center' },
  {
    dataField: 'outQty',
    caption: '출고수량',
    width: 120,
    alignment: 'right',
    headerAlignment: 'center',
    cellRender: (row) => formatNumber(row.outQty ?? 0),
  },
  {
    dataField: 'qty',
    caption: '미출고수량',
    width: 130,
    alignment: 'right',
    headerAlignment: 'center',
    cellRender: (row) => formatNumber(getRemainingQty(row)),
  },
  { dataField: 'emNm', caption: '긴급구분', width: 110, alignment: 'center' },
  {
    dataField: 'endYn',
    caption: '마감여부',
    width: 100,
    alignment: 'center',
    cellRender: (row) => (row.endYn === 'Y' ? '마감' : '진행'),
  },
];

export const exportHeaders = [
  '납기요청일',
  '수주번호',
  '거래처코드',
  '거래처명',
  '제품코드',
  '제품명',
  '수주수량',
  '단위',
  '출고수량',
  '미출고수량',
  '긴급구분',
  '마감여부',
];

export const mapExportRow = (row: RowItem) => [
  row.reqYmd ?? '',
  row.soNo ?? '',
  row.cstCd ?? '',
  row.cstNm ?? '',
  row.itemCd ?? '',
  row.itemNm ?? '',
  row.qty ?? '',
  row.unitNm ?? row.unitCd ?? '',
  row.outQty ?? '',
  getRemainingQty(row),
  row.emNm ?? row.emGb ?? '',
  row.endYn === 'Y' ? '마감' : '진행',
];
