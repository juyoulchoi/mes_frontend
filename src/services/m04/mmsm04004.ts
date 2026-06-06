import type { GridColumn } from '@/components/table/DataGrid';
import { formatNumber } from '@/lib/utils';

export interface SearchForm {
  adjustDate: string;
  itemCd: string;
  itemNm: string;
}

export interface RowItem {
  CHECK?: boolean;
  itemCd: string;
  itemNm?: string;
  qty?: number | string;
  unitCd?: string;
  ymd?: string;
  stStk?: number | string;
  inStk?: number | string;
  outStk?: number | string;
  realQty?: number | string;
  adjustQty?: number | string;
  description?: string;
}

export interface StockAdjustPayload {
  itemCd: string;
  ymd: string;
  unitCd: string;
  stockQty: number;
  realQty: number;
  adjustQty: number;
  description: string;
}

export const readOnlyColumns: GridColumn<RowItem>[] = [
  { dataField: 'ymd', caption: '기준일자', width: 120, alignment: 'center' },
  { dataField: 'itemCd', caption: '제품코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '제품명', width: 220 },
  {
    dataField: 'qty',
    caption: '현재고',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.qty ?? 0),
  },
  { dataField: 'unitCd', caption: '단위', width: 90, alignment: 'center' },
  {
    dataField: 'stStk',
    caption: '재고증감',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.stStk ?? 0),
  },
  {
    dataField: 'inStk',
    caption: '입고수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.inStk ?? 0),
  },
  {
    dataField: 'outStk',
    caption: '출고수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.outStk ?? 0),
  },
];

export const exportHeaders = [
  '기준일자',
  '제품코드',
  '제품명',
  '현재고',
  '단위',
  '실사량',
  '조정량',
  '조정사유',
];

export const mapExportRow = (row: RowItem) => [
  row.ymd ?? '',
  row.itemCd,
  row.itemNm ?? '',
  row.qty ?? 0,
  row.unitCd ?? '',
  row.realQty ?? '',
  row.adjustQty ?? '',
  row.description ?? '',
];

function toNumber(value: number | string | undefined) {
  const numeric = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function groupStockAdjustRowsByItem(rows: RowItem[]) {
  const grouped = new Map<string, RowItem>();

  rows.forEach((row) => {
    const current = grouped.get(row.itemCd);
    if (!current) {
      grouped.set(row.itemCd, {
        ...row,
        stStk: toNumber(row.stStk),
        inStk: toNumber(row.inStk),
        outStk: toNumber(row.outStk),
      });
      return;
    }

    grouped.set(row.itemCd, {
      ...current,
      itemNm: current.itemNm || row.itemNm,
      qty: row.qty ?? current.qty,
      unitCd: row.unitCd ?? current.unitCd,
      ymd: !current.ymd || (row.ymd && row.ymd > current.ymd) ? row.ymd : current.ymd,
      stStk: toNumber(current.stStk) + toNumber(row.stStk),
      inStk: toNumber(current.inStk) + toNumber(row.inStk),
      outStk: toNumber(current.outStk) + toNumber(row.outStk),
    });
  });

  return Array.from(grouped.values());
}

export function calculateAdjustQty(
  stockQty: number | string | undefined,
  realQty: number | string | undefined
) {
  if (realQty === undefined || realQty === '') return '';
  return toNumber(realQty) - toNumber(stockQty);
}

export function buildStockAdjustPayload(
  rows: RowItem[],
  adjustDate: string
): StockAdjustPayload[] {
  const ymd = adjustDate.split('-').join('');

  return rows.map((row) => ({
    itemCd: row.itemCd,
    ymd,
    unitCd: row.unitCd ?? '',
    stockQty: toNumber(row.qty),
    realQty: toNumber(row.realQty),
    adjustQty: toNumber(row.adjustQty),
    description: row.description ?? '',
  }));
}
