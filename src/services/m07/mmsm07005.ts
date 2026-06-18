import { http } from '@/lib/http';

export type Row = {
  LOGIN_DT?: string;
  USER_ID?: string;
  LOGIN_IP?: string;
  USER_AGENT?: string;
  [k: string]: unknown;
};

type AccessLogResponse = {
  loginDt?: string;
  userId?: string;
  loginIp?: string;
  userAgent?: string;
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

function mapAccessLog(row: AccessLogResponse): Row {
  return {
    LOGIN_DT: row.loginDt ?? '',
    USER_ID: row.userId ?? '',
    LOGIN_IP: row.loginIp ?? '',
    USER_AGENT: row.userAgent ?? '',
  };
}

export async function fetchMmsm07005Rows({
  startDate,
  endDate,
  groupCd,
}: {
  startDate: string;
  endDate: string;
  groupCd: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    grpCd: groupCd.trim() || '*',
    sYmd: toYmd(startDate || today),
    eYmd: toYmd(endDate || startDate || today),
    page: '0',
    size: '1000',
  });
  const data = await http<AccessLogResponse[] | PageResponse<AccessLogResponse>>(
    `/api/v1/auth/pgmacs/search?${params.toString()}`
  );
  return extractRows(data).map(mapAccessLog);
}

export function buildMmsm07005Csv(rows: Row[]) {
  const headers = ['접속일시', '사용자ID', '접속IP', 'User-Agent'];
  const lines = rows.map((row) =>
    [row.LOGIN_DT ?? '', row.USER_ID ?? '', row.LOGIN_IP ?? '', row.USER_AGENT ?? '']
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
