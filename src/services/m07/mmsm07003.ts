import { http } from '@/lib/http';

export type MenuRow = {
  CHECK?: boolean;
  ISNEW?: boolean;
  MENU_ID?: string;
  TOP_MENU?: string;
  MENU_NM?: string;
  LVL?: number | string;
  DSP_SEQ?: number | string;
  PGM_ID?: string;
  PGM_NM?: string;
  MENU_GB?: string;
  [k: string]: unknown;
};

type MenuResponse = {
  menuId?: string;
  topMenu?: string;
  menuNm?: string;
  lvl?: number;
  dspSeq?: number;
  pgmId?: string;
  pgmNm?: string;
  pgmUrl?: string;
  menuGb?: string;
};

type PageResponse<T> = {
  content?: T[];
};

type MenuRequest = {
  method?: string;
  menuId: string;
  topMenu?: string;
  menuNm?: string;
  lvl?: number;
  dspSeq?: number | null;
  pgmId?: string;
};

function extractRows<T>(response: T[] | PageResponse<T> | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.content ?? [];
}

function mapMenuRow(row: MenuResponse): MenuRow {
  return {
    CHECK: false,
    ISNEW: false,
    MENU_ID: row.menuId ?? '',
    TOP_MENU: row.topMenu ?? '',
    MENU_NM: row.menuNm ?? '',
    LVL: row.lvl ?? '',
    DSP_SEQ: row.dspSeq ?? '',
    PGM_ID: row.pgmId ?? '',
    PGM_NM: row.pgmNm ?? row.pgmUrl ?? '',
    MENU_GB: row.menuGb ?? 'WEB',
  };
}

function toNumberOrNull(value: string | number | undefined) {
  if (value === undefined || value === '') return null;
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function normalizeId(value: string | undefined) {
  return (value ?? '').trim();
}

export function createSameLevelMenuRow(current: MenuRow | null | undefined): MenuRow {
  return {
    CHECK: true,
    ISNEW: true,
    MENU_ID: '',
    TOP_MENU: current?.TOP_MENU ?? '',
    MENU_NM: '',
    LVL: current?.LVL ?? 2,
    DSP_SEQ: '',
    PGM_ID: '',
    PGM_NM: '',
    MENU_GB: 'WEB',
  };
}

export function createChildMenuRow(current: MenuRow): MenuRow {
  return {
    CHECK: true,
    ISNEW: true,
    MENU_ID: '',
    TOP_MENU: current.MENU_ID,
    MENU_NM: '',
    LVL: Number(current.LVL ?? 0) + 1,
    DSP_SEQ: '',
    PGM_ID: '',
    PGM_NM: '',
    MENU_GB: 'WEB',
  };
}

export async function fetchMmsm07003Rows() {
  const data = await http<MenuResponse[] | PageResponse<MenuResponse>>(
    '/api/v1/auth/menu/searchMenuPgmInfoList'
  );
  return extractRows(data)
    .map(mapMenuRow)
    .sort((a, b) =>
      `${a.TOP_MENU}-${a.DSP_SEQ}-${a.MENU_ID}`.localeCompare(
        `${b.TOP_MENU}-${b.DSP_SEQ}-${b.MENU_ID}`
      )
    );
}

export async function deleteMmsm07003Row(row: MenuRow) {
  if (row.ISNEW) return;

  const payload: MenuRequest = {
    method: 'D',
    menuId: normalizeId(row.MENU_ID),
    topMenu: row.TOP_MENU ?? '',
  };
  await http('/api/v1/auth/menu', { method: 'POST', body: payload });
}

export async function saveMmsm07003Rows(rows: MenuRow[]) {
  await Promise.all(
    rows.map((row) => {
      const payload: MenuRequest = {
        method: row.ISNEW ? 'I' : 'U',
        menuId: normalizeId(row.MENU_ID),
        topMenu: row.TOP_MENU?.trim() || normalizeId(row.MENU_ID),
        menuNm: row.MENU_NM?.trim() ?? '',
        lvl: Number(row.LVL ?? 0),
        dspSeq: toNumberOrNull(row.DSP_SEQ),
        pgmId: row.PGM_ID?.trim() ?? '',
      };
      return http('/api/v1/auth/menu', { method: 'POST', body: payload });
    })
  );
}

export function buildMmsm07003Csv(rows: MenuRow[]) {
  const headers = ['메뉴ID', '상위메뉴', '메뉴명', '레벨', '순서', '프로그램ID', '프로그램명'];
  const lines = rows.map((row) =>
    [
      row.MENU_ID ?? '',
      row.TOP_MENU ?? '',
      row.MENU_NM ?? '',
      row.LVL ?? '',
      row.DSP_SEQ ?? '',
      row.PGM_ID ?? '',
      row.PGM_NM ?? '',
    ]
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
