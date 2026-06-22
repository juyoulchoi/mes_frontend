import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getMaskedPage } from '@/app/routeMask';
import { http } from '@/lib/http';

export type PermissionAction = 'SER_AUTH' | 'SAV_AUTH' | 'DEL_AUTH' | 'PRT_AUTH' | 'EXL_AUTH';

type MeResponse = {
  user?: {
    userId?: string;
    userid?: string;
    userNm?: string;
    usrNm?: string;
    userGrpCd?: string;
    usrGrpCd?: string;
  };
  userGrpCd?: string;
  usrGrpCd?: string;
};

type UserMenuAuthResponse = {
  menuId?: string;
  pgmId?: string;
  serAuth?: string;
  savAuth?: string;
  delAuth?: string;
  prtAuth?: string;
  exlAuth?: string;
};

type PagePermission = Record<PermissionAction, boolean>;

const permissionCache = new Map<string, Map<string, PagePermission>>();

function pageIdFromPath(pathname: string) {
  return pathname
    .replace(/^.*\//, '')
    .replace(/\.tsx?$/i, '')
    .replace(/\.js$/i, '')
    .trim();
}

function normalizePageId(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function isYes(value: unknown) {
  return value === true || String(value ?? '').toUpperCase() === 'Y';
}

function toPermission(row: UserMenuAuthResponse): PagePermission {
  return {
    SER_AUTH: isYes(row.serAuth),
    SAV_AUTH: isYes(row.savAuth),
    DEL_AUTH: isYes(row.delAuth),
    PRT_AUTH: isYes(row.prtAuth),
    EXL_AUTH: isYes(row.exlAuth),
  };
}

function getUserGroup(payload: MeResponse | null | undefined) {
  return (
    payload?.user?.userGrpCd ||
    payload?.user?.usrGrpCd ||
    payload?.userGrpCd ||
    payload?.usrGrpCd ||
    ''
  );
}

async function fetchPermissionMap(userGrpCd: string) {
  const cached = permissionCache.get(userGrpCd);
  if (cached) return cached;

  const params = new URLSearchParams({ userGrpCd });
  const rows = await http<UserMenuAuthResponse[]>(
    `/api/v1/auth/users/findUserMenuAuthList?${params.toString()}`
  );

  const map = new Map<string, PagePermission>();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const permission = toPermission(row);
    const menuId = normalizePageId(row.menuId);
    const pgmId = normalizePageId(row.pgmId);
    if (menuId) map.set(menuId, permission);
    if (pgmId) map.set(pgmId, permission);
  });
  permissionCache.set(userGrpCd, map);
  return map;
}

export function clearPagePermissionCache(userGrpCd?: string) {
  if (userGrpCd) {
    permissionCache.delete(userGrpCd);
  } else {
    permissionCache.clear();
  }
  window.dispatchEvent(new Event('pagepermissionschange'));
}

export function usePagePermissions(pageIdArg?: string) {
  const location = useLocation();
  const [permissionMap, setPermissionMap] = useState<Map<string, PagePermission> | null>(null);
  const [loading, setLoading] = useState(false);

  const pageId = useMemo(() => {
    if (pageIdArg) return normalizePageId(pageIdArg);
    const statePage = (location.state as { maskedPage?: string } | null)?.maskedPage;
    return normalizePageId(statePage || getMaskedPage() || pageIdFromPath(location.pathname));
  }, [location.pathname, location.state, pageIdArg]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const me = await http<MeResponse>('/api/v1/auth/me');
        const userGrpCd = getUserGroup(me);
        if (!userGrpCd) {
          if (alive) setPermissionMap(null);
          return;
        }

        const nextMap = await fetchPermissionMap(userGrpCd);
        if (alive) setPermissionMap(nextMap);
      } catch {
        if (alive) setPermissionMap(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    const reload = () => void load();
    window.addEventListener('pagepermissionschange', reload);
    return () => {
      alive = false;
      window.removeEventListener('pagepermissionschange', reload);
    };
  }, []);

  const pagePermission = pageId ? (permissionMap?.get(pageId) ?? null) : null;

  const can = useCallback(
    (action: PermissionAction) => {
      if (loading || !pagePermission) return true;
      return pagePermission[action] !== false;
    },
    [loading, pagePermission]
  );

  return {
    loading,
    pageId,
    can,
    canSearch: can('SER_AUTH'),
    canSave: can('SAV_AUTH'),
    canDelete: can('DEL_AUTH'),
    canPrint: can('PRT_AUTH'),
    canExport: can('EXL_AUTH'),
  };
}
