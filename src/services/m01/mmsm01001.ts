import { getApi } from '@/lib/axiosClient';
import { toYmd } from '@/lib/excel';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';
import { calculateAmount } from '@/lib/registerDetailUtils';
import { RAW_MATERIAL_ITEM_GB } from '@/services/m01/constants';

export { RAW_MATERIAL_ITEM_GB } from '@/services/m01/constants';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

function normalizeDateInputValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return trimmed;
}

export function normalizeDetailRow(row: DetailRow | Record<string, unknown>): DetailRow {
  const detailRow = row as DetailRow;

  return {
    ...detailRow,
    reqYmd: normalizeDateInputValue(detailRow.reqYmd),
  };
}

export interface SearchForm {
  poYmd: string;
  cstCd: string;
  cstNm?: string;
  itemGb: string;
  poSeq?: string;
}

export interface MasterRow {
  CHECK?: boolean;
  cstNm?: string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
}

export interface DetailRow {
  CHECK?: boolean;
  poYmd?: string;
  poSeq?: number | string;
  poSubSeq?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
  reqYmd?: string;
  emGb?: string;
  itemTp?: string;
  description?: string;
  method?: 'I' | 'U' | 'D';
}

export interface SaveDetailRow {
  method: 'I' | 'U' | 'D';
  poYmd: string;
  poSeq: string;
  poSubSeq: number | string;
  reqYmd: string;
  emGb: string;
  desc: string;
  itemCd: string;
  itemNm?: string;
  unitCd: string;
  qty: number | string;
  price?: number | string;
  amt?: number | string;
}

export interface SaveMasterRow {
  method: 'I' | 'D';
  userId: string;
  cstCd: string;
  cstNm?: string;
  poYmd: string;
  poSeq: string;
  desc: string;
}

export interface SavePayload {
  masterData: SaveMasterRow[];
  detailData: SaveDetailRow[];
}

export interface AuthMeResponse {
  user?: {
    userid?: string;
    userId?: string;
  };
  data?: {
    user?: {
      userid?: string;
      userId?: string;
    };
  };
}

export interface ExcelUploadRow {
  itemCd: string;
  itemNm?: string;
  unitCd?: string;
  qty: number | string;
  price?: number | string;
  amt?: number | string;
  desc?: string;
}

export interface ExcelValidateResponse {
  validRows?: ExcelUploadRow[];
  errors?: Array<{
    rowNo: number;
    field?: string;
    message: string;
  }>;
}

interface FetchDetailRequest {
  form: SearchForm;
  page?: number;
  pageSize?: number;
}

interface BuildSavePayloadRequest {
  form: SearchForm;
  detailRows: DetailRow[];
  deletedDetailRows: DetailRow[];
  userId: string;
}

function toApiParams(params: QueryParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export async function fetchMmsm01001Detail({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: FetchDetailRequest): Promise<PageResult<DetailRow>> {
  const data = await getApi<PageableResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    '/api/v1/material/podet/search',
    toApiParams({
      poYmdS: form.poYmd.split('-').join(''),
      poYmdE: form.poYmd.split('-').join(''),
      cstCd: form.cstCd || '',
      itemGb: form.itemGb || RAW_MATERIAL_ITEM_GB,
      page,
      size: pageSize,
    })
  );

  const pageResult = toPageResult<Record<string, unknown>>(data, page, pageSize);

  return {
    ...pageResult,
    content: pageResult.content.map((row) => normalizeDetailRow(row)),
  };
}

export function getDetailRowKey(row: DetailRow) {
  const normalized = normalizeDetailRow(row);
  return [normalized.poYmd ?? '', normalized.poSeq ?? '', normalized.poSubSeq ?? ''].join('|');
}

export function dedupeDetailRows(rows: DetailRow[]) {
  const map = new Map<string, DetailRow>();

  rows.forEach((row) => {
    map.set(getDetailRowKey(row), normalizeDetailRow(row));
  });

  return Array.from(map.values());
}

export function getNextDetailSubSeq(rows: DetailRow[]) {
  return rows.reduce((max, row) => {
    const seq = Number(row.poSubSeq) || 0;
    return Math.max(max, seq);
  }, 0);
}

export function buildMmsm01001SavePayload({
  form,
  detailRows,
  deletedDetailRows,
  userId,
}: BuildSavePayloadRequest): SavePayload {
  const deletedRows = dedupeDetailRows(deletedDetailRows);
  const deletedRowKeySet = new Set(
    deletedRows.map((row) => getDetailRowKey(row)).filter((key) => key !== '||')
  );

  const insertedDetailData: SaveDetailRow[] = detailRows
    .map((row) => normalizeDetailRow(row))
    .filter((row) => (row.method ?? (row.poYmd && row.poSeq !== undefined ? 'U' : 'I')) === 'I')
    .map((row) => ({
      method: 'I',
      poYmd: row.poYmd ?? '',
      poSeq: row.poSeq === undefined || row.poSeq === null ? '' : String(row.poSeq),
      poSubSeq: '',
      reqYmd: toYmd(row.reqYmd ?? ''),
      emGb: row.emGb ?? '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      itemNm: row.itemNm ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
    }));

  const updatedDetailData: SaveDetailRow[] = detailRows
    .map((row) => normalizeDetailRow(row))
    .filter((row) => !deletedRowKeySet.has(getDetailRowKey(row)))
    .filter((row) => (row.method ?? (row.poYmd && row.poSeq !== undefined ? 'U' : 'I')) === 'U')
    .map((row, index) => ({
      method: 'U',
      poYmd: row.poYmd ?? '',
      poSeq: row.poSeq === undefined || row.poSeq === null ? '' : String(row.poSeq),
      poSubSeq: row.poSubSeq ?? index + 1,
      reqYmd: toYmd(row.reqYmd ?? ''),
      emGb: row.emGb ?? '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      itemNm: row.itemNm ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
    }));

  const deletedData: SaveDetailRow[] = deletedRows.map((currentRow, index) => {
    const row = normalizeDetailRow(currentRow);

    return {
      method: 'D',
      poYmd: row.poYmd ?? '',
      poSeq: row.poSeq === undefined || row.poSeq === null ? '' : String(row.poSeq),
      poSubSeq: row.poSubSeq ?? index + 1,
      reqYmd: toYmd(row.reqYmd ?? ''),
      emGb: row.emGb ?? '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      itemNm: row.itemNm ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
    };
  });

  const deleteTarget = deletedRows.find(
    (row) => row.poYmd && row.poSeq !== undefined && row.poSeq !== null
  );
  const shouldDeleteMaster = detailRows.length === 0 && !!deleteTarget;

  const masterData: SaveMasterRow[] = [
    {
      method: shouldDeleteMaster ? 'D' : 'I',
      userId,
      cstCd: form.cstCd,
      cstNm: form.cstNm ?? '',
      poYmd: shouldDeleteMaster ? String(deleteTarget?.poYmd ?? '') : toYmd(form.poYmd),
      poSeq:
        shouldDeleteMaster && deleteTarget?.poSeq !== undefined && deleteTarget.poSeq !== null
          ? String(deleteTarget.poSeq)
          : '',
      desc: '',
    },
  ];

  return {
    masterData,
    detailData: [...insertedDetailData, ...updatedDetailData, ...deletedData],
  };
}
