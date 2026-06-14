import type { GridColumn } from '@/components/table/DataGrid';
import { http } from '@/lib/http';

export interface Row {
  CHECK?: boolean;
  ITEM_CD?: string;
  ITEM_NM?: string;
  UNIT_CD?: string;
  PO_YMD?: string;
}

export interface ApiRow {
  matCd?: string;
  matNm?: string;
  unitCd?: string;
  reqYmd?: string;
}

export const columns: GridColumn<Row>[] = [
  { dataField: 'ITEM_CD', caption: '투입품목', width: 140, alignment: 'center' },
  { dataField: 'ITEM_NM', caption: '투입품목명', width: 260 },
  { dataField: 'UNIT_CD', caption: '단위', width: 100, alignment: 'center' },
  { dataField: 'PO_YMD', caption: '입고일자', width: 120, alignment: 'center' },
];

export const exportHeaders = ['선택', '투입품목', '투입품목명', '단위', '입고일자'];

export function mapExportRow(row: Row) {
  return [
    row.CHECK ? 'Y' : 'N',
    row.ITEM_CD ?? '',
    row.ITEM_NM ?? '',
    row.UNIT_CD ?? '',
    row.PO_YMD ?? '',
  ];
}

export function normalizeRow(row: ApiRow): Row {
  return {
    CHECK: false,
    ITEM_CD: row.matCd ?? '',
    ITEM_NM: row.matNm ?? '',
    UNIT_CD: row.unitCd ?? '',
    PO_YMD: row.reqYmd ?? '',
  };
}

export async function fetchRows(): Promise<Row[]> {
  const data = await http<ApiRow[]>('/api/v1/planning/prditemuse/searchUseHistory');
  return (Array.isArray(data) ? data : []).map(normalizeRow);
}

export function toggleRow(rows: Row[], rowIndex: number, checked: boolean): Row[] {
  return rows.map((row, index) => (index === rowIndex ? { ...row, CHECK: checked } : row));
}
