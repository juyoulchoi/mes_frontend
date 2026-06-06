import { getApi } from '@/lib/axiosClient';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';

type ApiRow = Record<string, unknown>;

export interface SearchForm {
  soYmd: string;
  giYmd: string;
  cstCd: string;
}

export interface MasterRow {
  CHECK?: boolean;
  reqYmd?: string;
  soNo?: string;
  soYmd?: string;
  soSeq?: string;
  soSubSeq?: number;
  cstCd?: string;
  cstNm?: string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  unitNm?: string;
  emGb?: string;
  emNm?: string;
  qty?: number;
  outQty?: number;
  remainingQty?: number;
}

export interface DetailRow {
  CHECK?: boolean;
  method?: 'I' | 'U' | 'D';
  giYmd?: string;
  giSeq?: string | number;
  giSubSeq?: string | number;
  soYmd?: string;
  soSeq?: string | number;
  soSubSeq?: string | number;
  soNo?: string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  unitNm?: string;
  qty?: string | number;
  remainingQty?: number;
  description?: string;
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

interface PageFetchRequest {
  form: SearchForm;
  cstNm?: string;
  page?: number;
  pageSize?: number;
}

interface BuildSavePayloadRequest {
  form: SearchForm;
  detailRows: DetailRow[];
  deletedDetailRows: DetailRow[];
  userId: string;
}

export interface SaveMasterRow {
  method: 'I' | 'U' | 'D';
  userId: string;
  cstCd: string;
  giYmd: string;
  giSeq: string;
  totamt: number;
  desc: string;
}

export interface SaveDetailRow {
  method: 'I' | 'U' | 'D';
  giYmd: string;
  giSeq: string;
  giSubSeq: string | number;
  soYmd: string;
  soSeq: string;
  soSubSeq: string | number;
  itemCd: string;
  unitCd: string;
  qty: string | number;
  price: number;
  amt: number;
  desc: string;
}

export interface SavePayload {
  masterData: SaveMasterRow[];
  detailData: SaveDetailRow[];
}

function toStringValue(value: unknown) {
  return value === undefined || value === null ? '' : String(value);
}

function toNumberValue(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function toApiYmd(value: string) {
  return value.split('-').join('');
}

function parseSoNo(soNo: string) {
  const [soYmd = '', soSeq = '', soSubSeq = ''] = soNo.split('-');
  return {
    soYmd,
    soSeq,
    soSubSeq: toNumberValue(soSubSeq),
  };
}

function formatSoNo(row: DetailRow) {
  if (row.soNo) return row.soNo;
  if (!row.soYmd || row.soSeq === undefined || row.soSubSeq === undefined) return '';
  return `${row.soYmd}-${row.soSeq}-${row.soSubSeq}`;
}

export function normalizeMasterRow(row: ApiRow): MasterRow {
  const soNo = toStringValue(row.soNo);
  const orderQty = toNumberValue(row.qty);
  const outQty = toNumberValue(row.outQty);

  return {
    ...parseSoNo(soNo),
    reqYmd: toStringValue(row.reqYmd),
    soNo,
    cstCd: toStringValue(row.cstCd),
    cstNm: toStringValue(row.cstNm),
    itemCd: toStringValue(row.itemCd),
    itemNm: toStringValue(row.itemNm),
    unitCd: toStringValue(row.unitCd),
    unitNm: toStringValue(row.unitNm) || toStringValue(row.unitCd),
    emGb: toStringValue(row.emGb),
    emNm: toStringValue(row.emNm) || toStringValue(row.emGb),
    qty: orderQty,
    outQty,
    remainingQty: Math.max(orderQty - outQty, 0),
  };
}

export function normalizeDetailRow(row: ApiRow): DetailRow {
  const normalized: DetailRow = {
    giYmd: toStringValue(row.giYmd),
    giSeq: toStringValue(row.giSeq),
    giSubSeq: toStringValue(row.giSubSeq),
    soYmd: toStringValue(row.soYmd),
    soSeq: toStringValue(row.soSeq),
    soSubSeq: toStringValue(row.soSubSeq),
    itemCd: toStringValue(row.itemCd),
    itemNm: toStringValue(row.itemNm),
    unitCd: toStringValue(row.unitCd),
    unitNm: toStringValue(row.unitNm) || toStringValue(row.unitCd),
    qty: toStringValue(row.qty),
    description: toStringValue(row.description),
    method: 'U',
  };

  return {
    ...normalized,
    soNo: formatSoNo(normalized),
  };
}

export function getDetailRowKey(row: DetailRow) {
  return [row.giYmd ?? '', row.giSeq ?? '', row.giSubSeq ?? ''].join('|');
}

export async function fetchMmsm04002Master({
  form,
  cstNm = '',
  page = 0,
  pageSize = PAGE_SIZE,
}: PageFetchRequest): Promise<PageResult<MasterRow>> {
  const data = await getApi<ApiRow[]>('/api/v1/sales/findSoStatusList', {
    startDate: toApiYmd(form.soYmd),
    endDate: toApiYmd(form.soYmd),
    cstNm,
    itemNm: '',
  });
  const rows = (Array.isArray(data) ? data : [])
    .map(normalizeMasterRow)
    .filter((row) => (row.remainingQty ?? 0) > 0);

  return toPageResult(rows, page, pageSize);
}

export async function fetchMmsm04002Detail({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: PageFetchRequest): Promise<PageResult<DetailRow>> {
  const data = await getApi<PageableResponse<ApiRow> | ApiRow[]>(
    '/api/v1/material/gidet/search',
    {
      giYmdS: toApiYmd(form.giYmd),
      giYmdE: toApiYmd(form.giYmd),
      cstCd: form.cstCd,
      page: String(page),
      size: String(pageSize),
    }
  );
  const result = toPageResult<ApiRow>(data, page, pageSize);

  return {
    ...result,
    content: result.content.map(normalizeDetailRow),
  };
}

export function buildMmsm04002SavePayload({
  form,
  detailRows,
  deletedDetailRows,
  userId,
}: BuildSavePayloadRequest): SavePayload {
  const deletedRowKeys = new Set(
    deletedDetailRows.map(getDetailRowKey).filter((key) => key !== '||')
  );

  const mapDetail = (row: DetailRow, method: 'I' | 'U' | 'D'): SaveDetailRow => ({
    method,
    giYmd: method === 'I' ? '' : String(row.giYmd ?? ''),
    giSeq: method === 'I' ? '' : String(row.giSeq ?? ''),
    giSubSeq: method === 'I' ? '' : (row.giSubSeq ?? ''),
    soYmd: String(row.soYmd ?? ''),
    soSeq: String(row.soSeq ?? ''),
    soSubSeq: row.soSubSeq ?? '',
    itemCd: row.itemCd ?? '',
    unitCd: row.unitCd ?? '',
    qty: row.qty ?? '',
    price: 0,
    amt: 0,
    desc: row.description ?? '',
  });

  const insertedRows = detailRows
    .filter((row) => row.method === 'I' || !row.giYmd || row.giSeq === undefined)
    .map((row) => mapDetail(row, 'I'));
  const updatedRows = detailRows
    .filter((row) => !deletedRowKeys.has(getDetailRowKey(row)))
    .filter((row) => row.method !== 'I' && row.giYmd && row.giSeq !== undefined)
    .map((row) => mapDetail(row, 'U'));
  const deletedRows = deletedDetailRows.map((row) => mapDetail(row, 'D'));
  const deleteTarget = deletedDetailRows.find(
    (row) => row.giYmd && row.giSeq !== undefined && row.giSeq !== null
  );
  const updateTarget = detailRows.find(
    (row) => row.method !== 'I' && row.giYmd && row.giSeq !== undefined && row.giSeq !== null
  );
  const shouldDeleteMaster = detailRows.length === 0 && !!deleteTarget;
  const shouldUpdateMaster = insertedRows.length === 0 && !!updateTarget;

  return {
    masterData: [
      {
        method: shouldDeleteMaster ? 'D' : shouldUpdateMaster ? 'U' : 'I',
        userId,
        cstCd: form.cstCd,
        giYmd: shouldDeleteMaster
          ? String(deleteTarget?.giYmd ?? '')
          : shouldUpdateMaster
            ? String(updateTarget?.giYmd ?? '')
            : toApiYmd(form.giYmd),
        giSeq: shouldDeleteMaster
          ? String(deleteTarget?.giSeq ?? '')
          : shouldUpdateMaster
            ? String(updateTarget?.giSeq ?? '')
            : '',
        totamt: 0,
        desc: '',
      },
    ],
    detailData: [...insertedRows, ...updatedRows, ...deletedRows],
  };
}
