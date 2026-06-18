import { http } from '@/lib/http';

export type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  PGM_ID?: string;
  PGM_NM?: string;
  PRJ_ID?: string;
  DESCRIPTION?: string;
  SER_AUTH?: string;
  CLE_AUTH?: string;
  SAV_AUTH?: string;
  DEL_AUTH?: string;
  PRT_AUTH?: string;
  EXL_AUTH?: string;
  USE_YN?: string;
  [k: string]: unknown;
};

type Status = 'ACTIVE' | 'INACTIVE';

type ProgramResponse = {
  pgmId?: string;
  pgmNm?: string;
  prjId?: string;
  description?: string;
  serAuth?: string;
  cleAuth?: string;
  savAuth?: string;
  delAuth?: string;
  prtAuth?: string;
  exlAuth?: string;
  status?: Status | string;
};

type PageResponse<T> = {
  content?: T[];
};

type ProgramRequest = {
  method?: string;
  pgmId: string;
  pgmNm?: string;
  serAuth?: string;
  cleAuth?: string;
  savAuth?: string;
  delAuth?: string;
  prtAuth?: string;
  exlAuth?: string;
  prjId?: string;
  description?: string;
  status?: Status;
};

export function yesNo(value: unknown) {
  return value === 'N' ? 'N' : 'Y';
}

function toUseYn(status: ProgramResponse['status']) {
  return status === 'INACTIVE' ? 'N' : 'Y';
}

function toStatus(useYn: Row['USE_YN']): Status {
  return useYn === 'N' ? 'INACTIVE' : 'ACTIVE';
}

function extractRows<T>(response: T[] | PageResponse<T> | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.content ?? [];
}

function mapProgramRow(row: ProgramResponse, index: number): Row {
  return {
    CHECK: false,
    ISNEW: false,
    SERL: index + 1,
    PGM_ID: row.pgmId ?? '',
    PGM_NM: row.pgmNm ?? '',
    PRJ_ID: row.prjId ?? '',
    DESCRIPTION: row.description ?? '',
    SER_AUTH: yesNo(row.serAuth),
    CLE_AUTH: yesNo(row.cleAuth),
    SAV_AUTH: yesNo(row.savAuth),
    DEL_AUTH: yesNo(row.delAuth),
    PRT_AUTH: yesNo(row.prtAuth),
    EXL_AUTH: yesNo(row.exlAuth),
    USE_YN: toUseYn(row.status),
  };
}

export function normalizeProgramId(value: string | undefined) {
  return (value ?? '').trim();
}

export function createNewMmsm07002Row(index: number): Row {
  return {
    CHECK: true,
    ISNEW: true,
    SERL: index + 1,
    PGM_ID: '',
    PGM_NM: '',
    PRJ_ID: 'WEB',
    DESCRIPTION: '',
    SER_AUTH: 'Y',
    CLE_AUTH: 'N',
    SAV_AUTH: 'Y',
    DEL_AUTH: 'Y',
    PRT_AUTH: 'N',
    EXL_AUTH: 'Y',
    USE_YN: 'Y',
  };
}

export async function fetchMmsm07002Rows({
  pgmId,
  pgmNm,
  useYn,
}: {
  pgmId: string;
  pgmNm: string;
  useYn: string;
}) {
  const data = await http<ProgramResponse[] | PageResponse<ProgramResponse>>(
    '/api/v1/auth/pgminfo?page=0&size=1000'
  );
  const idKeyword = pgmId.trim().toLowerCase();
  const nameKeyword = pgmNm.trim().toLowerCase();
  return extractRows(data)
    .filter((row) => !idKeyword || (row.pgmId ?? '').toLowerCase().includes(idKeyword))
    .filter((row) => !nameKeyword || (row.pgmNm ?? '').toLowerCase().includes(nameKeyword))
    .filter((row) => !useYn || toUseYn(row.status) === useYn)
    .map(mapProgramRow);
}

export async function deleteMmsm07002Rows(rows: Row[]) {
  await Promise.all(
    rows.map((row) =>
      http('/api/v1/auth/pgminfo', {
        method: 'POST',
        body: { method: 'D', pgmId: normalizeProgramId(row.PGM_ID) },
      })
    )
  );
}

export async function saveMmsm07002Rows(rows: Row[]) {
  await Promise.all(
    rows.map((row) => {
      const payload: ProgramRequest = {
        method: row.ISNEW ? 'I' : 'U',
        pgmId: normalizeProgramId(row.PGM_ID),
        pgmNm: row.PGM_NM?.trim() ?? '',
        prjId: row.PRJ_ID?.trim() ?? 'WEB',
        description: row.DESCRIPTION?.trim() ?? '',
        serAuth: yesNo(row.SER_AUTH),
        cleAuth: yesNo(row.CLE_AUTH),
        savAuth: yesNo(row.SAV_AUTH),
        delAuth: yesNo(row.DEL_AUTH),
        prtAuth: yesNo(row.PRT_AUTH),
        exlAuth: yesNo(row.EXL_AUTH),
        status: toStatus(row.USE_YN),
      };
      return http('/api/v1/auth/pgminfo', { method: 'POST', body: payload });
    })
  );
}

export function buildMmsm07002Csv(rows: Row[]) {
  const headers = [
    'No.',
    '프로그램ID',
    '프로그램명',
    '프로젝트',
    '설명',
    '조회',
    '초기화',
    '저장',
    '삭제',
    '출력',
    'EXCEL',
    '사용여부',
  ];
  const lines = rows.map((row, index) =>
    [
      row.SERL ?? index + 1,
      row.PGM_ID ?? '',
      row.PGM_NM ?? '',
      row.PRJ_ID ?? '',
      row.DESCRIPTION ?? '',
      row.SER_AUTH ?? '',
      row.CLE_AUTH ?? '',
      row.SAV_AUTH ?? '',
      row.DEL_AUTH ?? '',
      row.PRT_AUTH ?? '',
      row.EXL_AUTH ?? '',
      row.USE_YN ?? '',
    ]
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
