import { http } from '@/lib/http';

export type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  DSP_SEQ?: string | number;
  LINE_CD?: string;
  LINE_NM?: string;
  DESCRIPTION?: string;
  USE_YN?: string;
  [k: string]: unknown;
};

type Status = 'ACTIVE' | 'INACTIVE';

type LineInfoResponse = {
  lineCd?: string;
  lineNm?: string;
  dspSeq?: number;
  description?: string;
  status?: Status | string;
};

type LineInfoRequest = {
  method?: string;
  lineCd: string;
  lineNm?: string;
  dspSeq?: number | null;
  description?: string;
  status?: Status;
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function toNumberOrNull(value: string | number | undefined) {
  if (value === undefined || value === '') return null;
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

function mapLineInfoRow(row: LineInfoResponse, index: number): Row {
  return {
    CHECK: false,
    ISNEW: false,
    DSP_SEQ: row.dspSeq ?? index + 1,
    LINE_CD: row.lineCd ?? '',
    LINE_NM: row.lineNm ?? '',
    DESCRIPTION: row.description ?? '',
    USE_YN: row.status === 'INACTIVE' ? 'N' : 'Y',
  };
}

export function normalizeLineCode(value: string | undefined) {
  return (value ?? '').trim().toUpperCase();
}

export function createNewMmsm06007Row(index: number): Row {
  return {
    CHECK: true,
    ISNEW: true,
    DSP_SEQ: index + 1,
    LINE_CD: '',
    LINE_NM: '',
    DESCRIPTION: '',
    USE_YN: 'Y',
  };
}

export async function fetchMmsm06007Rows(lineNm: string) {
  const data = await http<LineInfoResponse[]>(`/api/v1/mdm/line`);
  const keyword = lineNm.trim();
  return (Array.isArray(data) ? data : [])
    .filter((row) => !keyword || (row.lineNm ?? '').includes(keyword))
    .map(mapLineInfoRow);
}

export async function deleteMmsm06007Rows(lineCds: string[]) {
  await Promise.all(
    lineCds.map((lineCd) =>
      http(`/api/v1/mdm/line`, {
        method: 'POST',
        body: { method: 'D', lineCd },
      })
    )
  );
}

export async function saveMmsm06007Rows(rows: Row[]) {
  await Promise.all(
    rows.map((row) => {
      const payload: LineInfoRequest = {
        method: row.ISNEW ? 'I' : 'U',
        lineCd: row.LINE_CD?.trim() ?? '',
        lineNm: row.LINE_NM?.trim() ?? '',
        dspSeq: toNumberOrNull(row.DSP_SEQ),
        description: row.DESCRIPTION ?? '',
        status: row.USE_YN === 'N' ? 'INACTIVE' : 'ACTIVE',
      };

      return http(`/api/v1/mdm/line`, { method: 'POST', body: payload });
    })
  );
}

export function buildMmsm06007Csv(rows: Row[]) {
  const headers = ['표시순서', '작업장코드', '작업장명', '설명', '사용여부'];
  const lines = rows.map((row) =>
    [
      row.DSP_SEQ ?? '',
      row.LINE_CD ?? '',
      row.LINE_NM ?? '',
      row.DESCRIPTION ?? '',
      row.USE_YN ?? '',
    ]
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
