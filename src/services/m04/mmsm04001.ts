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
  giYmd?: string;
  giSeq?: number;
  giSubSeq?: number;
  cstCd?: string;
  cstNm?: string;
  soYmd?: string;
  soSeq?: number;
  soSubSeq?: number;
  itemCd?: string;
  itemNm?: string;
  qty?: number | string;
  unitCd?: string;
  description?: string;
  status?: string;
}

function getIssueNo(row: RowItem) {
  return [row.giYmd, row.giSeq, row.giSubSeq].filter((value) => value !== undefined).join('-');
}

function getSalesOrderNo(row: RowItem) {
  return [row.soYmd, row.soSeq, row.soSubSeq].filter((value) => value !== undefined).join('-');
}

export const columns: GridColumn<RowItem>[] = [
  {
    dataField: 'giYmd',
    caption: '출고번호',
    width: 180,
    alignment: 'center',
    cellRender: getIssueNo,
  },
  { dataField: 'giYmd', caption: '출고일자', width: 120, alignment: 'center' },
  {
    dataField: 'soYmd',
    caption: '수주번호',
    width: 180,
    alignment: 'center',
    cellRender: getSalesOrderNo,
  },
  { dataField: 'cstCd', caption: '거래처코드', width: 120, alignment: 'center' },
  { dataField: 'cstNm', caption: '거래처명', width: 170 },
  { dataField: 'itemCd', caption: '제품코드', width: 130, alignment: 'center' },
  { dataField: 'itemNm', caption: '제품명', width: 200 },
  {
    dataField: 'qty',
    caption: '출고수량',
    width: 120,
    alignment: 'right',
    headerAlignment: 'center',
    cellRender: (row) => formatNumber(row.qty ?? 0),
  },
  { dataField: 'unitCd', caption: '단위', width: 90, alignment: 'center' },
  {
    dataField: 'status',
    caption: '상태',
    width: 100,
    alignment: 'center',
  },
  { dataField: 'description', caption: '비고', width: 220 },
];

export const exportHeaders = [
  '출고번호',
  '출고일자',
  '수주번호',
  '거래처코드',
  '거래처명',
  '제품코드',
  '제품명',
  '출고수량',
  '단위',
  '상태',
  '비고',
];

export const mapExportRow = (row: RowItem) => [
  getIssueNo(row),
  row.giYmd ?? '',
  getSalesOrderNo(row),
  row.cstCd ?? '',
  row.cstNm ?? '',
  row.itemCd ?? '',
  row.itemNm ?? '',
  row.qty ?? '',
  row.unitCd ?? '',
  row.status ?? '',
  row.description ?? '',
];
