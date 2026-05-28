import { http } from '@/lib/http';

export type MasterRow = {
  CHECK?: boolean;
  isNew?: boolean;
  itemCd?: string;
  itemNm?: string;
  itemSpec?: string;
  itemGb?: string;
  unitCd?: string;
  procGb?: string;
  procCd?: string;
  status?: string;
  [k: string]: unknown;
};

export type DetailRow = {
  itemCd?: string;
  itemGb?: string;
  procNm?: string;
  wid?: string | number;
  hgt?: string | number;
  qty?: string | number;
  [k: string]: unknown;
};

type ApiPage<T> = {
  content?: T[];
};

type ProductMasterResponse = {
  itemCd?: string;
  itemNm?: string;
  itemSpec?: string;
  itemGb?: string;
  unitCd?: string;
  procGb?: string;
  procCd?: string;
  status?: unknown;
};

type ProductDetailResponse = {
  itemCd?: string;
  itemGb?: string;
  procNm?: string;
  wid?: string | number;
  hgt?: string | number;
  qty?: string | number;
};

type ItemInfoResponse = {
  itemCd?: string;
  itemNm?: string;
  itemSpec?: string;
  unitCd?: string;
  itemGb?: string;
  procGb?: string;
  procCd?: string;
  status?: unknown;
};

export type FetchProductMasterParams = {
  itemNm?: string;
};

const ALL_ITEM_GB = 'FG,SFG,RAW,SUB';

function statusToString(status: unknown) {
  if (!status) return 'ACTIVE';
  if (typeof status === 'object' && status !== null && 'code' in status) {
    return String((status as { code?: unknown }).code ?? 'ACTIVE');
  }
  return String(status);
}

function mapMasterRow(row: ProductMasterResponse): MasterRow {
  return {
    CHECK: false,
    isNew: false,
    itemCd: row.itemCd ?? '',
    itemNm: row.itemNm ?? '',
    itemSpec: row.itemSpec ?? '',
    itemGb: row.itemGb ?? '',
    unitCd: row.unitCd ?? '',
    procGb: row.procGb ?? '',
    procCd: row.procCd ?? '',
    status: statusToString(row.status),
  };
}

function mapDetailRow(row: ProductDetailResponse): DetailRow {
  return {
    itemCd: row.itemCd ?? '',
    itemGb: row.itemGb ?? '',
    procNm: row.procNm ?? '',
    wid: row.wid ?? '',
    hgt: row.hgt ?? '',
    qty: row.qty ?? '',
  };
}

export async function fetchMmsm06003Master({ itemNm = '' }: FetchProductMasterParams) {
  const qs = new URLSearchParams({ itemGb: ALL_ITEM_GB, size: '1000' });
  if (itemNm.trim()) qs.set('itemNm', itemNm.trim());
  const data = await http<ApiPage<ProductMasterResponse>>(`/api/v1/mdm/item/search?${qs}`);
  return (Array.isArray(data.content) ? data.content : []).map(mapMasterRow);
}

export async function fetchMmsm06003Detail(itemCd: string) {
  if (!itemCd) return [] as DetailRow[];
  const qs = new URLSearchParams({ itemCd }).toString();
  const data = await http<ProductDetailResponse[]>(
    `/api/v1/mdm/item/searchProductDetailList?${qs}`
  );
  return (Array.isArray(data) ? data : []).map(mapDetailRow);
}

async function fetchItemInfo(itemCd: string) {
  return http<ItemInfoResponse>(`/api/v1/mdm/item/${encodeURIComponent(itemCd)}`);
}

export async function saveMmsm06003Master(row: MasterRow) {
  const current = row.isNew || !row.itemCd ? null : await fetchItemInfo(row.itemCd);
  const itemGb = row.itemGb || current?.itemGb || 'FG';
  const unitCd = row.unitCd || current?.unitCd || 'EA';
  const procGb = row.procGb ?? current?.procGb ?? '';
  const procCd = row.procCd ?? current?.procCd ?? '';
  const status = row.status || statusToString(current?.status);

  await http(`/api/v1/mdm/item`, {
    method: 'POST',
    body: {
      method: row.isNew ? 'I' : 'U',
      isNew: row.isNew ? 'I' : 'U',
      itemCd: row.itemCd ?? '',
      itemNm: row.itemNm ?? '',
      itemSpec: row.itemSpec ?? current?.itemSpec ?? '',
      unitCd,
      itemGb,
      procGb,
      procCd,
      status,
    },
  });
}

export async function deleteMmsm06003Master(itemCd: string) {
  await http(`/api/v1/mdm/item`, {
    method: 'POST',
    body: { method: 'D', itemCd },
  });
}
