import { http } from '@/lib/http';

export type GroupRow = {
  SERL?: number | string;
  USR_GRP_CD: string;
  USR_GRP_NM: string;
};

export type RightRow = {
  USR_GRP_CD: string;
  MENU_ID: string;
  PGM_ID?: string;
  MENU_NM?: string;
  SER_AUTH?: boolean;
  CLE_AUTH?: boolean;
  SAV_AUTH?: boolean;
  DEL_AUTH?: boolean;
  PRT_AUTH?: boolean;
  EXL_AUTH?: boolean;
  DIRTY?: boolean;
};

type UserResponse = {
  userGrpCd?: string;
};

type RightResponse = {
  userGrpCd?: string;
  menuId?: string;
  pgmId?: string;
  menuNm?: string;
  serAuth?: string;
  cleAuth?: string;
  savAuth?: string;
  delAuth?: string;
  prtAuth?: string;
  exlAuth?: string;
};

type PageResponse<T> = {
  content?: T[];
};

export type AuthColumnKey =
  | 'SER_AUTH'
  | 'CLE_AUTH'
  | 'SAV_AUTH'
  | 'DEL_AUTH'
  | 'PRT_AUTH'
  | 'EXL_AUTH';

function extractRows<T>(response: T[] | PageResponse<T> | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.content ?? [];
}

function isYes(value: unknown) {
  return value === true || value === 'Y';
}

function toYn(value: boolean | undefined) {
  return value ? 'Y' : 'N';
}

export async function fetchMmsm07004Groups(groupKeyword: string) {
  const data = await http<UserResponse[] | PageResponse<UserResponse>>(
    '/api/v1/auth/iam/users?page=0&size=1000&status=ACTIVE',
    { unwrapEnvelope: false }
  );
  const codes = Array.from(
    new Set(
      extractRows(data)
        .map((row) => row.userGrpCd ?? '')
        .filter(Boolean)
    )
  );

  return codes
    .filter(
      (code) =>
        !groupKeyword.trim() || code.toLowerCase().includes(groupKeyword.trim().toLowerCase())
    )
    .map((code, index) => ({
      SERL: index + 1,
      USR_GRP_CD: code,
      USR_GRP_NM: code,
    }));
}

export async function fetchMmsm07004Rights(groupCd: string, menuKeyword: string) {
  const params = new URLSearchParams({ userGrpCd: groupCd, page: '0', size: '1000' });
  const data = await http<RightResponse[] | PageResponse<RightResponse>>(
    `/api/v1/auth/usergrpauth?${params.toString()}`
  );
  const keyword = menuKeyword.trim().toLowerCase();
  return extractRows(data)
    .filter(
      (row) =>
        !keyword ||
        (row.menuId ?? '').toLowerCase().includes(keyword) ||
        (row.menuNm ?? '').toLowerCase().includes(keyword) ||
        (row.pgmId ?? '').toLowerCase().includes(keyword)
    )
    .map((row) => ({
      USR_GRP_CD: row.userGrpCd ?? groupCd,
      MENU_ID: row.menuId ?? '',
      PGM_ID: row.pgmId ?? '',
      MENU_NM: row.menuNm ?? '',
      SER_AUTH: isYes(row.serAuth),
      CLE_AUTH: isYes(row.cleAuth),
      SAV_AUTH: isYes(row.savAuth),
      DEL_AUTH: isYes(row.delAuth),
      PRT_AUTH: isYes(row.prtAuth),
      EXL_AUTH: isYes(row.exlAuth),
      DIRTY: false,
    }));
}

export async function saveMmsm07004Rights(groupCd: string, rows: RightRow[]) {
  await Promise.all(
    rows.map((row) =>
      http('/api/v1/auth/usergrpauth', {
        method: 'POST',
        body: {
          userGrpCd: groupCd,
          menuId: row.MENU_ID,
          serAuth: toYn(row.SER_AUTH),
          cleAuth: toYn(row.CLE_AUTH),
          savAuth: toYn(row.SAV_AUTH),
          delAuth: toYn(row.DEL_AUTH),
          prtAuth: toYn(row.PRT_AUTH),
          exlAuth: toYn(row.EXL_AUTH),
          status: 'ACTIVE',
        },
      })
    )
  );
}
