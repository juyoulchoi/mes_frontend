import { formatNumber } from '@/lib/utils';

export interface ApiRow {
  prdPlnYmd?: string;
  prdPlnSeq?: number;
  prdSchdYmd?: string;
  workYmd?: string;
  procCd?: string;
  procNm?: string;
  itemCd?: string;
  itemNm?: string;
  cstCd?: string;
  cstNm?: string;
  planQty?: number | string;
  prdQty?: number | string;
}

export interface RowItem {
  prdPlnYmd: string;
  prdSchdYmd: string;
  prdPlnSeq: number | string;
  procCd: string;
  procNm: string;
  itemCd: string;
  itemNm: string;
  cstCd: string;
  cstNm: string;
  planQty: number;
  prdQty: number;
  remainQty: number;
  achievementRate: string;
}

export interface Column {
  dataField: keyof RowItem;
  caption: string;
  headerClassName: string;
  cellClassName: string;
  format?: (value: RowItem[keyof RowItem]) => string;
}

const centerHeaderClassName = 'whitespace-nowrap p-2 text-center';
const centerCellClassName = 'whitespace-nowrap p-2 text-center';
const leftHeaderClassName = 'whitespace-nowrap p-2 text-left';
const leftCellClassName = 'whitespace-nowrap p-2 text-left';
const rightHeaderClassName = 'whitespace-nowrap p-2 text-right';
const rightCellClassName = 'whitespace-nowrap p-2 text-right';

export const columns: Column[] = [
  {
    dataField: 'prdPlnYmd',
    caption: '생산계획일자',
    headerClassName: centerHeaderClassName,
    cellClassName: centerCellClassName,
  },
  {
    dataField: 'prdSchdYmd',
    caption: '생산예정일',
    headerClassName: centerHeaderClassName,
    cellClassName: centerCellClassName,
  },
  {
    dataField: 'prdPlnSeq',
    caption: '계획순번',
    headerClassName: centerHeaderClassName,
    cellClassName: centerCellClassName,
  },
  {
    dataField: 'procCd',
    caption: '공정코드',
    headerClassName: centerHeaderClassName,
    cellClassName: centerCellClassName,
  },
  {
    dataField: 'procNm',
    caption: '공정명',
    headerClassName: leftHeaderClassName,
    cellClassName: leftCellClassName,
  },
  {
    dataField: 'itemCd',
    caption: '제품코드',
    headerClassName: centerHeaderClassName,
    cellClassName: centerCellClassName,
  },
  {
    dataField: 'itemNm',
    caption: '제품명',
    headerClassName: leftHeaderClassName,
    cellClassName: leftCellClassName,
  },
  {
    dataField: 'cstCd',
    caption: '거래처코드',
    headerClassName: centerHeaderClassName,
    cellClassName: centerCellClassName,
  },
  {
    dataField: 'cstNm',
    caption: '거래처명',
    headerClassName: leftHeaderClassName,
    cellClassName: leftCellClassName,
  },
  {
    dataField: 'planQty',
    caption: '계획수량',
    headerClassName: rightHeaderClassName,
    cellClassName: rightCellClassName,
    format: formatQuantity,
  },
  {
    dataField: 'prdQty',
    caption: '생산수량',
    headerClassName: rightHeaderClassName,
    cellClassName: rightCellClassName,
    format: formatQuantity,
  },
  {
    dataField: 'remainQty',
    caption: '잔량',
    headerClassName: rightHeaderClassName,
    cellClassName: rightCellClassName,
    format: formatQuantity,
  },
  {
    dataField: 'achievementRate',
    caption: '달성률',
    headerClassName: rightHeaderClassName,
    cellClassName: rightCellClassName,
  },
];

export const exportHeaders = columns.map((column) => column.caption);

export function normalizeRows(source: ApiRow[]): RowItem[] {
  return source.map((item, index) => {
    const planQty = toNumber(item.planQty);
    const prdQty = toNumber(item.prdQty);
    const remainQty = Math.max(planQty - prdQty, 0);
    const achievementRate = planQty > 0 ? (prdQty / planQty) * 100 : 0;

    return {
      prdPlnYmd: item.prdPlnYmd ?? item.workYmd ?? '',
      prdSchdYmd: item.prdSchdYmd ?? '',
      prdPlnSeq: item.prdPlnSeq ?? index + 1,
      procCd: item.procCd ?? '',
      procNm: item.procNm ?? '',
      itemCd: item.itemCd ?? '',
      itemNm: item.itemNm ?? '',
      cstCd: item.cstCd ?? '',
      cstNm: item.cstNm ?? '',
      planQty,
      prdQty,
      remainQty,
      achievementRate: `${achievementRate.toLocaleString('ko-KR', {
        maximumFractionDigits: 1,
      })}%`,
    };
  });
}

export function formatCellValue(row: RowItem, column: Column) {
  const value = row[column.dataField];
  return column.format ? column.format(value) : String(value ?? '');
}

export function mapExportRow(row: RowItem) {
  return columns.map((column) => formatCellValue(row, column));
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = typeof value === 'number' ? value : Number(value.replace(/,/g, ''));
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function formatQuantity(value: RowItem[keyof RowItem]) {
  return formatNumber(typeof value === 'number' ? value : toNumber(String(value ?? '')));
}
