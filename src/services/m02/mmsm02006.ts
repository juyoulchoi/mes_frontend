import { http } from '@/lib/http';

export interface OutsourceIoRow {
  check?: boolean;
  rnum?: number | string;
  itemNm?: string;
  cstNm?: string;
  outCd?: string;
  outGb?: string;
  busNm?: string;
  outDt?: string;
  outQty?: number | string;
  inPrdDt?: string;
  inDt?: string;
  inQty?: number | string;
  outDirYn?: 'Y' | 'N' | '';
  description?: string;
}

export interface ApiRow {
  rnum?: number | string;
  itemNm?: string;
  cstNm?: string;
  outCd?: string;
  outGb?: string;
  busNm?: string;
  outDt?: string;
  outQty?: number | string;
  inPrdDt?: string;
  inDt?: string;
  inQty?: number | string;
  outDirYn?: 'Y' | 'N' | '';
  description?: string;
  CHECK?: boolean;
  RNUM?: number | string;
  ITEM_NM?: string;
  CST_NM?: string;
  OUT_CD?: string;
  OUT_GB?: string;
  Out_GB?: string;
  BUS_NM?: string;
  OUT_DT?: string;
  OUT_QTY?: number | string;
  IN_PRD_DT?: string;
  IN_DT?: string;
  IN_QTY?: number | string;
  OUT_DIR_YN?: 'Y' | 'N' | '';
  DESC?: string;
}

export interface SearchParams {
  startDate: string;
  endDate: string;
  outGb: string;
}

export interface DetailInputProps {
  label: string;
  value?: string | number;
  type?: 'text' | 'date' | 'number';
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export const OUTSOURCE_IO_LIST_URL = '/api/v1/planning/outsource-io';
export const OUTSOURCE_IO_SAVE_URL = '/api/v1/planning/outsource-io';

export const exportHeaders = [
  '순번',
  '품명',
  '거래처명',
  '외주코드',
  '외주구분',
  '업체명',
  '출고일자',
  '출고수량',
  '입고요청일자',
  '입고일자',
  '입고수량',
  '외주직접출고여부',
  '비고',
];

export function toYmd(value: string) {
  return value.replace(/-/g, '');
}

export function toInputDate(value?: string) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\./g, '-');
  if (/^\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

export function normalizeRow(row: ApiRow, index: number): OutsourceIoRow {
  return {
    check: false,
    rnum: row.rnum ?? row.RNUM ?? index + 1,
    itemNm: row.itemNm ?? row.ITEM_NM ?? '',
    cstNm: row.cstNm ?? row.CST_NM ?? '',
    outCd: row.outCd ?? row.OUT_CD ?? '',
    outGb: row.outGb ?? row.OUT_GB ?? row.Out_GB ?? '',
    busNm: row.busNm ?? row.BUS_NM ?? '',
    outDt: toInputDate(row.outDt ?? row.OUT_DT),
    outQty: row.outQty ?? row.OUT_QTY ?? '',
    inPrdDt: toInputDate(row.inPrdDt ?? row.IN_PRD_DT),
    inDt: toInputDate(row.inDt ?? row.IN_DT),
    inQty: row.inQty ?? row.IN_QTY ?? '',
    outDirYn: row.outDirYn ?? row.OUT_DIR_YN ?? '',
    description: row.description ?? row.DESC ?? '',
  };
}

export async function fetchRows(params: SearchParams): Promise<OutsourceIoRow[]> {
  const query = new URLSearchParams({
    start: toYmd(params.startDate),
    end: toYmd(params.endDate),
    outGb: params.outGb,
  }).toString();
  const data = await http<ApiRow[]>(`${OUTSOURCE_IO_LIST_URL}?${query}`);
  return (Array.isArray(data) ? data : []).map(normalizeRow);
}

export function patchRow(row: OutsourceIoRow, patch: Partial<OutsourceIoRow>): OutsourceIoRow {
  return { ...row, ...patch, check: true };
}

export function toggleRow(
  rows: OutsourceIoRow[],
  rowIndex: number,
  checked: boolean
): OutsourceIoRow[] {
  return rows.map((row, index) => (index === rowIndex ? { ...row, check: checked } : row));
}

export function toSavePayload(row: OutsourceIoRow) {
  return {
    outCd: row.outCd ?? '',
    inPrdDt: toYmd(row.inPrdDt ?? ''),
    inDt: toYmd(row.inDt ?? ''),
    inQty: row.inQty === '' ? null : row.inQty,
    outDirYn: row.outDirYn ?? '',
    description: row.description ?? '',
  };
}

export async function saveRows(rows: OutsourceIoRow[]): Promise<void> {
  await http(OUTSOURCE_IO_SAVE_URL, {
    method: 'POST',
    body: rows.map(toSavePayload),
  });
}

export const mapExportRow = (row: OutsourceIoRow, index: number) => [
  row.rnum ?? index + 1,
  row.itemNm ?? '',
  row.cstNm ?? '',
  row.outCd ?? '',
  row.outGb ?? '',
  row.busNm ?? '',
  toYmd(row.outDt ?? ''),
  row.outQty ?? '',
  toYmd(row.inPrdDt ?? ''),
  toYmd(row.inDt ?? ''),
  row.inQty ?? '',
  row.outDirYn ?? '',
  row.description ?? '',
];
