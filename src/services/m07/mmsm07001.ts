import { http } from '@/lib/http';

export type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  USR_ID?: string;
  USR_NM?: string;
  PWD?: string;
  DEPT_CD?: string;
  DEPT_NM?: string;
  USR_GRP_CD?: string;
  PHONE?: string;
  EMAIL?: string;
  USE_YN?: string;
  [k: string]: unknown;
};

type Status = 'ACTIVE' | 'INACTIVE';

type UserInfoResponse = {
  userId?: string;
  userNm?: string;
  userPwd?: string;
  deptCd?: string;
  deptNm?: string;
  userGrpCd?: string;
  phone?: string;
  email?: string;
  status?: Status | string;
};

type UserListResponse = {
  content?: UserInfoResponse[];
  page?: {
    totalElements?: number;
  };
};

type UserInfoRequest = {
  userId: string;
  userNm?: string;
  userPwd?: string;
  deptCd?: string;
  userGrpCd?: string;
  phone?: string;
  email?: string;
  status?: Status;
};

function toUseYn(status: UserInfoResponse['status']) {
  return status === 'INACTIVE' ? 'N' : 'Y';
}

function toStatus(useYn: Row['USE_YN']): Status {
  return useYn === 'N' ? 'INACTIVE' : 'ACTIVE';
}

export function normalizeUserId(value: string | undefined) {
  return (value ?? '').trim();
}

function mapUserRow(row: UserInfoResponse, index: number): Row {
  return {
    CHECK: false,
    ISNEW: false,
    SERL: index + 1,
    USR_ID: row.userId ?? '',
    USR_NM: row.userNm ?? '',
    PWD: '',
    DEPT_CD: row.deptCd ?? '',
    DEPT_NM: row.deptNm ?? '',
    USR_GRP_CD: row.userGrpCd ?? '',
    PHONE: row.phone ?? '',
    EMAIL: row.email ?? '',
    USE_YN: toUseYn(row.status),
  };
}

function extractUsers(response: UserInfoResponse[] | UserListResponse | null | undefined) {
  if (Array.isArray(response)) return response;
  return response?.content ?? [];
}

async function fetchUsers(status: Status) {
  const params = new URLSearchParams({
    page: '0',
    size: '1000',
    sort: 'userId',
    direction: 'asc',
    status,
  });

  const data = await http<UserInfoResponse[] | UserListResponse>(
    `/api/v1/auth/iam/users?${params.toString()}`,
    { unwrapEnvelope: false }
  );

  return extractUsers(data).map((row) => ({ ...row, status }));
}

export function createNewMmsm07001Row(index: number): Row {
  return {
    CHECK: true,
    ISNEW: true,
    SERL: index + 1,
    USR_ID: '',
    USR_NM: '',
    PWD: '',
    DEPT_CD: '',
    DEPT_NM: '',
    USR_GRP_CD: '',
    PHONE: '',
    EMAIL: '',
    USE_YN: 'Y',
  };
}

export async function fetchMmsm07001Rows({
  usrNm,
  usrGrpCd,
  deptCd,
  useYn,
}: {
  usrNm: string;
  usrGrpCd: string;
  deptCd: string;
  useYn: string;
}) {
  const statuses: Status[] =
    useYn === 'N' ? ['INACTIVE'] : useYn === 'Y' ? ['ACTIVE'] : ['ACTIVE', 'INACTIVE'];
  const data = (await Promise.all(statuses.map(fetchUsers))).flat();
  const userKeyword = usrNm.trim().toLowerCase();
  const groupKeyword = usrGrpCd.trim().toLowerCase();
  const deptKeyword = deptCd.trim().toLowerCase();

  return data
    .filter((row) => !userKeyword || (row.userNm ?? '').toLowerCase().includes(userKeyword))
    .filter((row) => !groupKeyword || (row.userGrpCd ?? '').toLowerCase().includes(groupKeyword))
    .filter((row) => !deptKeyword || (row.deptCd ?? '').toLowerCase().includes(deptKeyword))
    .map(mapUserRow);
}

export async function deleteMmsm07001Rows(userIds: string[]) {
  await Promise.all(
    userIds.map((userId) =>
      http(`/api/v1/auth/iam/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        unwrapEnvelope: false,
      })
    )
  );
}

export async function saveMmsm07001Rows(rows: Row[]) {
  await Promise.all(
    rows.map((row) => {
      const userId = normalizeUserId(row.USR_ID);
      const payload: UserInfoRequest = {
        userId,
        userNm: row.USR_NM?.trim() ?? '',
        userPwd: row.PWD?.trim() ?? '',
        deptCd: row.DEPT_CD?.trim() ?? '',
        userGrpCd: row.USR_GRP_CD?.trim() ?? '',
        phone: row.PHONE?.trim() ?? '',
        email: row.EMAIL?.trim() ?? '',
        status: toStatus(row.USE_YN),
      };

      return http(
        row.ISNEW
          ? '/api/v1/auth/iam/users'
          : `/api/v1/auth/iam/users/${encodeURIComponent(userId)}`,
        {
          method: row.ISNEW ? 'POST' : 'PUT',
          body: payload,
          unwrapEnvelope: false,
        }
      );
    })
  );
}

export function buildMmsm07001Csv(rows: Row[]) {
  const headers = [
    'No.',
    '사용자ID',
    '사용자이름',
    '부서코드',
    '부서명',
    '사용자그룹',
    '전화번호',
    '이메일',
    '사용여부',
  ];
  const lines = rows.map((row, index) =>
    [
      row.SERL ?? index + 1,
      row.USR_ID ?? '',
      row.USR_NM ?? '',
      row.DEPT_CD ?? '',
      row.DEPT_NM ?? '',
      row.USR_GRP_CD ?? '',
      row.PHONE ?? '',
      row.EMAIL ?? '',
      row.USE_YN ?? '',
    ]
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
