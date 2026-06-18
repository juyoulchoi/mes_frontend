import { http } from '@/lib/http';

export type Row = {
  EVT_DT?: string;
  EVT_TP?: string;
  PROC_NM?: string;
  CLT_NM?: string;
  MSG?: string;
  [k: string]: unknown;
};

type ErrorLogResponse = {
  evtDt?: string;
  evtTp?: string;
  procNm?: string;
  clientNm?: string;
  msg?: string;
};

type PageResponse<T> = {
  content?: T[];
};

function toYmd(value: string) {
  return value.replace(/-/g, '');
}

function extractRows<T>(response: T[] | PageResponse<T> | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.content ?? [];
}

function normalizeRow(row: ErrorLogResponse): Row {
  return {
    EVT_DT: row.evtDt ?? '',
    EVT_TP: row.evtTp ?? '',
    PROC_NM: row.procNm ?? '',
    CLT_NM: row.clientNm ?? '',
    MSG: row.msg ?? '',
  };
}

export async function fetchMmsm07006Rows({
  startDate,
  endDate,
  evtTp,
}: {
  startDate: string;
  endDate: string;
  evtTp: string;
}) {
  const params = new URLSearchParams({
    cdIf: '*',
    page: '0',
    size: '1000',
  });
  if (startDate) params.set('startDt', toYmd(startDate));
  if (endDate) params.set('endDt', toYmd(endDate));
  if (evtTp) params.set('logTp', evtTp);
  const data = await http<ErrorLogResponse[] | PageResponse<ErrorLogResponse>>(
    `/api/v1/monitor/errlog/search?${params.toString()}`
  );
  return extractRows(data).map(normalizeRow);
}

export function buildMmsm07006Csv(rows: Row[]) {
  const headers = ['발생일시', '구분', 'PROCEDURE명', '내용', '비고'];
  const lines = rows.map((row) =>
    [row.EVT_DT ?? '', row.EVT_TP ?? '', row.PROC_NM ?? '', row.CLT_NM ?? '', row.MSG ?? '']
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
