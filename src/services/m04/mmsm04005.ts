import type { PageableResponse } from '@/lib/pagination';

export interface ProductCustomerRow {
  rnum?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  cstCd?: string;
  cstNm?: string;
  unitPrice?: number | string;
  mainYn?: 'Y' | 'N' | '';
}

export interface DetailRow extends ProductCustomerRow {
  isRegister?: boolean;
}

export interface ApiRow extends ProductCustomerRow {
  [key: string]: unknown;
}

export const PRODUCT_ITEM_GB = 'FG,SFG';

export function getContent<T>(data: PageableResponse<T> | T[] | T | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && 'content' in data) {
    return Array.isArray(data.content) ? data.content : [];
  }
  return [data as T];
}

export function normalizeRow(row: ApiRow): ProductCustomerRow {
  return {
    ...row,
    itemCd: row.itemCd ?? '',
    itemNm: row.itemNm ?? '',
    unitCd: row.unitCd ?? '',
    cstCd: row.cstCd ?? '',
    cstNm: row.cstNm ?? '',
    unitPrice: row.unitPrice ?? '',
    mainYn: row.mainYn || 'N',
  };
}

export function normalizeDetailRow(row: ProductCustomerRow | DetailRow): DetailRow {
  return {
    ...row,
    itemCd: row.itemCd ?? '',
    itemNm: row.itemNm ?? '',
    unitCd: row.unitCd ?? '',
    cstCd: row.cstCd ?? '',
    cstNm: row.cstNm ?? '',
    unitPrice: row.unitPrice ?? '',
    mainYn: row.mainYn || 'N',
  };
}

export function patchDetailRow(row: DetailRow, patch: Partial<DetailRow>): DetailRow {
  return {
    ...row,
    ...patch,
    itemCd: patch.itemCd ?? row.itemCd,
    itemNm: patch.itemNm ?? row.itemNm,
    unitCd: patch.unitCd ?? row.unitCd,
    cstCd: patch.cstCd ?? row.cstCd,
    cstNm: patch.cstNm ?? row.cstNm,
    unitPrice: patch.unitPrice ?? row.unitPrice,
    mainYn: patch.mainYn ?? row.mainYn,
  };
}

function toNumber(value: number | string | undefined) {
  const numeric = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toCustItemPayload(row: DetailRow) {
  return {
    method: row.isRegister ? 'Y' : 'U',
    isNew: row.isRegister ? 'I' : '',
    cstCd: row.cstCd ?? '',
    itemCd: row.itemCd ?? '',
    mainYn: row.mainYn || 'N',
    unitPrice: toNumber(row.unitPrice),
  };
}

export function toDeletePayload(row: DetailRow) {
  return {
    ...toCustItemPayload(row),
    method: 'D',
    isNew: '',
  };
}

export const exportHeaders = [
  '순번',
  '제품코드',
  '제품명',
  '단위',
  '거래처코드',
  '거래처명',
  '단가',
  '대표여부',
];

export const mapExportRow = (row: ProductCustomerRow, index: number) => [
  row.rnum ?? index + 1,
  row.itemCd ?? '',
  row.itemNm ?? '',
  row.unitCd ?? '',
  row.cstCd ?? '',
  row.cstNm ?? '',
  row.unitPrice ?? '',
  row.mainYn ?? 'N',
];
