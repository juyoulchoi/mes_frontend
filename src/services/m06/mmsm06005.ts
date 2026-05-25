import { http } from '@/lib/http';

export type GroupRow = {
  check?: boolean;
  procGrpCd?: string;
  procGrpNm?: string;
  [k: string]: unknown;
};

export type ProcRow = {
  check?: boolean;
  procCd?: string;
  procNm?: string;
  [k: string]: unknown;
};

type ProcGrpInfoResponse = {
  procGrpCd?: string;
  procGrpNm?: string;
};

type ProcCodeResponse = {
  procCd?: string;
  procNm?: string;
};

function resolveGroupCode(row: ProcGrpInfoResponse) {
  return row.procGrpCd ?? '';
}

function mapGroupRow(row: ProcGrpInfoResponse): GroupRow {
  return {
    check: false,
    procGrpCd: resolveGroupCode(row),
    procGrpNm: row.procGrpNm ?? '',
  };
}

function mapProcRow(row: ProcCodeResponse): ProcRow {
  return {
    check: false,
    procCd: row.procCd ?? '',
    procNm: row.procNm ?? '',
  };
}

export async function fetchMmsm06005Groups() {
  const data = await http<ProcGrpInfoResponse[]>(`/api/v1/mdm/procGrpRouting/groups`);
  return (Array.isArray(data) ? data : []).map(mapGroupRow);
}

export async function fetchMmsm06005Procs(procGb = '') {
  const url = procGb
    ? `/api/v1/mdm/procGrpRouting/available-procs?${new URLSearchParams({ procGb })}`
    : `/api/v1/mdm/procInfo/searchCodeList?${new URLSearchParams({ status: 'ACTIVE' })}`;
  const data = await http<ProcCodeResponse[]>(url);
  return (Array.isArray(data) ? data : []).map(mapProcRow);
}

export async function fetchMmsm06005GroupProcs(grpCd: string) {
  if (!grpCd) return [] as ProcRow[];

  const qs = new URLSearchParams({ procGb: grpCd }).toString();
  const data = await http<ProcCodeResponse[]>(`/api/v1/mdm/procGrpRouting/registered-procs?${qs}`);
  return (Array.isArray(data) ? data : []).map(mapProcRow);
}

export async function addMmsm06005GroupProcs(grpCd: string, procCds: string[]) {
  await http(`/api/v1/mdm/procGrpRouting/register`, {
    method: 'POST',
    body: { procGb: grpCd, procCds },
  });
}

export async function deleteMmsm06005GroupProcs(grpCd: string, procCds: string[]) {
  await http(`/api/v1/mdm/procGrpRouting/unregister`, {
    method: 'POST',
    body: { procGb: grpCd, procCds },
  });
}

export function buildMmsm06005Csv(grpCd: string, rows: ProcRow[]) {
  const headers = ['공정그룹', '라우팅공정코드', '라우팅공정명'];
  const lines = rows.map((row) =>
    [grpCd, row.procCd ?? '', row.procNm ?? '']
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );

  return [headers.join(','), ...lines].join('\n');
}
