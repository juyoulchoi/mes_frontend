import { http } from '@/lib/http';

export type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  CST_CD?: string;
  CST_NM?: string;
  REG_NO?: string;
  CST_GB?: string;
  CEO_NM?: string;
  MGR_NM?: string;
  MGR_TEL?: string;
  TEL_NO?: string;
  FAX_NO?: string;
  EMAIL?: string;
  POST_NO?: string;
  ADDR?: string;
  USE_YN?: string;
  [k: string]: unknown;
};

type ApiPage<T> = {
  content?: T[];
};

type CustInfoResponse = {
  cstCd?: string;
  cstNm?: string;
  regNo?: string;
  custGb?: string;
  ceoNm?: string;
  mgrNm?: string;
  mgrTel?: string;
  telNo?: string;
  faxNo?: string;
  email?: string;
  postNo?: string;
  addr?: string;
  status?: unknown;
  CST_CD?: string;
  CST_NM?: string;
  REG_NO?: string;
  CUST_GB?: string;
  CST_GB?: string;
  CEO_NM?: string;
  MGR_NM?: string;
  MGR_TEL?: string;
  TEL_NO?: string;
  FAX_NO?: string;
  EMAIL?: string;
  POST_NO?: string;
  ADDR?: string;
  USE_YN?: string;
  ISNEW?: boolean;
  SERL?: number | string;
};

export type FetchMmsm06004Params = {
  cstNm?: string;
  useYn?: string;
};

const DEFAULT_CUST_GBS = ['CUSTOMER', 'SUPPLIER'];

function statusToUseYn(status: unknown) {
  if (!status) return 'Y';
  const value =
    typeof status === 'object' && status !== null && 'code' in status
      ? String((status as { code?: unknown }).code ?? '')
      : String(status);
  return value.toUpperCase() === 'INACTIVE' ? 'N' : 'Y';
}

function mapUseYnToStatus(useYn: string | undefined) {
  return useYn === 'N' ? 'INACTIVE' : 'ACTIVE';
}

function normalizeRow(row: CustInfoResponse, index: number): Row {
  return {
    CHECK: false,
    ISNEW: !!row.ISNEW,
    SERL: row.SERL ?? index + 1,
    CST_CD: row.cstCd ?? row.CST_CD ?? '',
    CST_NM: row.cstNm ?? row.CST_NM ?? '',
    REG_NO: row.regNo ?? row.REG_NO ?? '',
    CST_GB: row.custGb ?? row.CUST_GB ?? row.CST_GB ?? '',
    CEO_NM: row.ceoNm ?? row.CEO_NM ?? '',
    MGR_NM: row.mgrNm ?? row.MGR_NM ?? '',
    MGR_TEL: row.mgrTel ?? row.MGR_TEL ?? '',
    TEL_NO: row.telNo ?? row.TEL_NO ?? '',
    FAX_NO: row.faxNo ?? row.FAX_NO ?? '',
    EMAIL: row.email ?? row.EMAIL ?? '',
    POST_NO: row.postNo ?? row.POST_NO ?? '',
    ADDR: row.addr ?? row.ADDR ?? '',
    USE_YN: row.USE_YN ?? statusToUseYn(row.status),
  };
}

export function createNewMmsm06004Row(index: number): Row {
  return {
    CHECK: true,
    ISNEW: true,
    SERL: index + 1,
    CST_CD: '',
    CST_NM: '',
    REG_NO: '',
    CST_GB: 'CUSTOMER',
    CEO_NM: '',
    MGR_NM: '',
    MGR_TEL: '',
    TEL_NO: '',
    FAX_NO: '',
    EMAIL: '',
    POST_NO: '',
    ADDR: '',
    USE_YN: 'Y',
  };
}

export async function fetchMmsm06004Rows({ cstNm = '', useYn = '' }: FetchMmsm06004Params) {
  const cstNmValue = cstNm.trim();
  const status = mapUseYnToStatus(useYn);
  const pages = await Promise.all(
    DEFAULT_CUST_GBS.map((custGbValue) => {
      const params = new URLSearchParams({ custGb: custGbValue, size: '1000' });
      if (cstNmValue) params.set('cstNm', cstNmValue);
      if (useYn) params.set('status', status);
      return http<ApiPage<CustInfoResponse>>(`/api/v1/mdm/cust/search?${params}`);
    })
  );

  return pages
    .flatMap((page) => (Array.isArray(page.content) ? page.content : []))
    .map(normalizeRow);
}

export async function deleteMmsm06004Rows(cstCds: string[]) {
  if (cstCds.length === 0) return;
  for (const cstCd of cstCds) {
    await http('/api/v1/mdm/cust', {
      method: 'POST',
      body: { method: 'D', cstCd },
    });
  }
}

export async function saveMmsm06004Rows(rows: Row[]) {
  for (const row of rows) {
    await http('/api/v1/mdm/cust', {
      method: 'POST',
      body: {
        method: row.ISNEW ? 'I' : 'U',
        isNew: row.ISNEW ? 'I' : 'U',
        cstCd: row.CST_CD ?? '',
        cstNm: row.CST_NM ?? '',
        regNo: row.REG_NO ?? '',
        custGb: row.CST_GB ?? '',
        ceoNm: row.CEO_NM ?? '',
        mgrNm: row.MGR_NM ?? '',
        mgrTel: row.MGR_TEL ?? '',
        telNo: row.TEL_NO ?? '',
        faxNo: row.FAX_NO ?? '',
        email: row.EMAIL ?? '',
        postNo: row.POST_NO ?? '',
        addr: row.ADDR ?? '',
        status: mapUseYnToStatus(row.USE_YN),
      },
    });
  }
}

export function buildMmsm06004Csv(rows: Row[]) {
  const headers = [
    'No.',
    '거래처코드',
    '거래처명',
    '거래처구분',
    '대표자명',
    '담당자명',
    '담당자연락처',
    '전화번호',
    '사용여부',
  ];
  const lines = rows.map((row, index) =>
    [
      row.SERL ?? index + 1,
      row.CST_CD ?? '',
      row.CST_NM ?? '',
      row.CST_GB ?? '',
      row.CEO_NM ?? '',
      row.MGR_NM ?? '',
      row.MGR_TEL ?? '',
      row.TEL_NO ?? '',
      row.USE_YN ?? '',
    ]
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
