import { http } from '@/lib/http';
import type { PageableResponse } from '@/lib/pagination';

export interface Row {
  CHECK?: boolean;
  RNUM?: string | number;
  GI_YMD?: string;
  GI_SEQ?: number;
  GI_SUB_SEQ?: number;
  SO_YMD?: string;
  SO_SEQ?: number;
  SO_SUB_SEQ?: number;
  ITEM_CD?: string;
  ITEM_NM?: string;
  UNIT_CD?: string;
  QTY?: string | number;
  GI_PLAN_QTY?: string | number;
  PLAN_QTY?: string | number;
  GI_QTY?: string | number;
  REM_QTY?: string | number;
  BAL_QTY?: string | number;
  DESC?: string;
  STATUS?: string;
}

export interface ApiRow {
  giYmd?: string;
  giSeq?: number;
  giSubSeq?: number;
  soYmd?: string;
  soSeq?: number;
  soSubSeq?: number;
  itemCd?: string;
  itemNm?: string;
  qty?: string | number;
  unitCd?: string;
  description?: string;
  status?: string;
}

export interface SoStatusRow {
  soNo?: string;
  qty?: string | number;
  outQty?: string | number;
}

export interface GridInputProps {
  value?: string | number;
  type?: 'text' | 'number';
  align?: 'left' | 'right';
  onChange: (value: string) => void;
}

export interface SearchParams {
  inDate: string;
  seq: string;
  cstCd: string;
}

export const exportHeaders = [
  '순번',
  '품목코드',
  '품목명',
  '단위',
  '수량',
  '출고지시량',
  '기출고량',
  '잔량',
  '비고',
];

export function mapExportRow(row: Row) {
  return [
    row.RNUM ?? '',
    row.ITEM_CD ?? '',
    row.ITEM_NM ?? '',
    row.UNIT_CD ?? '',
    row.QTY ?? '',
    row.GI_PLAN_QTY ?? row.PLAN_QTY ?? '',
    row.GI_QTY ?? '',
    row.REM_QTY ?? row.BAL_QTY ?? '',
    row.DESC ?? '',
  ];
}

export function toYmd(value: string) {
  return value.split('-').join('');
}

export function toNumber(value: string | number | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export async function fetchRows({ inDate, seq, cstCd }: SearchParams): Promise<Row[]> {
  const qs = new URLSearchParams({
    giYmdS: toYmd(inDate),
    giYmdE: toYmd(inDate),
    cstCd,
    page: '0',
    size: '200',
  }).toString();
  const data = await http<PageableResponse<ApiRow>>(`/api/v1/material/gidet/search?${qs}`);
  const content = Array.isArray(data) ? data : (data.content ?? []);
  const soDates = content.map((row) => row.soYmd).filter((value): value is string => !!value);
  const soStatusRows =
    soDates.length > 0
      ? await http<SoStatusRow[]>(
          `/api/v1/sales/findSoStatusList?${new URLSearchParams({
            startDate: soDates.reduce((min, value) => (value < min ? value : min)),
            endDate: soDates.reduce((max, value) => (value > max ? value : max)),
            cstNm: '',
            itemNm: '',
          }).toString()}`
        )
      : [];
  const soStatusMap = new Map(
    (Array.isArray(soStatusRows) ? soStatusRows : []).map((row) => [row.soNo ?? '', row])
  );

  return content
    .filter((row) => !seq || String(row.giSeq ?? '') === seq.trim())
    .map((row, index) => {
      const soNo =
        row.soYmd && row.soSeq !== undefined && row.soSubSeq !== undefined
          ? `${row.soYmd}-${row.soSeq}-${row.soSubSeq}`
          : '';
      const status = soStatusMap.get(soNo);
      const currentQty = toNumber(row.qty);
      const totalIssuedQty = status ? toNumber(status.outQty) : currentQty;
      const orderQty = status ? toNumber(status.qty) : currentQty;

      return {
        CHECK: false,
        RNUM: index + 1,
        GI_YMD: row.giYmd,
        GI_SEQ: row.giSeq,
        GI_SUB_SEQ: row.giSubSeq,
        SO_YMD: row.soYmd,
        SO_SEQ: row.soSeq,
        SO_SUB_SEQ: row.soSubSeq,
        ITEM_CD: row.itemCd,
        ITEM_NM: row.itemNm,
        UNIT_CD: row.unitCd,
        QTY: row.qty,
        GI_PLAN_QTY: currentQty,
        GI_QTY: Math.max(totalIssuedQty - currentQty, 0),
        REM_QTY: Math.max(orderQty - totalIssuedQty, 0),
        DESC: row.description ?? '',
        STATUS: row.status,
      };
    });
}

export function toggleRow(rows: Row[], rowIndex: number, checked: boolean): Row[] {
  return rows.map((row, index) => (index === rowIndex ? { ...row, CHECK: checked } : row));
}

export function patchRow(rows: Row[], rowIndex: number, patch: Partial<Row>): Row[] {
  return rows.map((row, index) => {
    if (index !== rowIndex) return row;

    if (Object.prototype.hasOwnProperty.call(patch, 'QTY')) {
      const nextQty = toNumber(patch.QTY);
      const availableQty = toNumber(row.GI_PLAN_QTY) + toNumber(row.REM_QTY);
      return {
        ...row,
        ...patch,
        GI_PLAN_QTY: nextQty,
        REM_QTY: Math.max(availableQty - nextQty, 0),
        CHECK: true,
      };
    }

    return { ...row, ...patch, CHECK: true };
  });
}

export function toSavePayload(row: Row) {
  return {
    method: 'U',
    isNew: 'N',
    giYmd: row.GI_YMD,
    giSeq: row.GI_SEQ,
    giSubSeq: row.GI_SUB_SEQ,
    soYmd: row.SO_YMD,
    soSeq: row.SO_SEQ,
    soSubSeq: row.SO_SUB_SEQ,
    itemCd: row.ITEM_CD,
    unitCd: row.UNIT_CD,
    qty: row.QTY,
    description: row.DESC,
    status: row.STATUS,
  };
}

export async function saveRows(rows: Row[]): Promise<void> {
  await Promise.all(
    rows.map((row) =>
      http('/api/v1/material/gidet', {
        method: 'POST',
        body: toSavePayload(row),
      })
    )
  );
}
