import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useNavigate, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from 'react-resizable-panels';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import PageRenderer from '@/routes/PageRenderer';
import type { UserPayload, TreeNode } from '@/lib/menuInfo';
import { sanitizeNavPayload, sanitizeUserPayload, toSafeTree } from '@/lib/guards';
import { filterTreeByRole } from '@/lib/acl';
import { ensureMaskedPage, setMaskedPage, getMaskedPage } from '@/app/routeMask';
import { clearAuthStorage } from '@/lib/authSession';
import { EmptyPageResult, PAGE_SIZE, toPageResult, type PageResult } from '@/lib/pagination';
import { getApiDataFetch, type FetchRequest } from '@/services/common/getApiFetch';
import TreeMenu from './TreeMenu';

type AuthFetchForm = Record<string, never>;

type RowItem = {
  dspSeq: string;
  lvl: string;
  menuGb: string;
  menuId: string;
  menuNm: string;
  pgmId: string;
  pgmUrl: string;
  topMenu: string;
};

type ResultList = PageResult<RowItem>;

type PageTab = {
  pageId: string;
  title: string;
  path?: string;
};

const fetchMe = getApiDataFetch<AuthFetchForm, UserPayload>({
  apiPath: '/api/v1/auth/me',
  mapParams: () => ({}),
});

const fetchMenuPgmInfoList = getApiDataFetch<AuthFetchForm, RowItem[]>({
  apiPath: '/api/v1/auth/menu/searchMenuPgmInfoList',
  mapParams: () => ({}),
});

function getPageIdFromPath(path?: string) {
  return (path ?? '')
    .replace(/^.*\//, '')
    .replace(/\.tsx?$/i, '')
    .trim();
}

export const LoadingBlock = ({ text = '불러오는 중...' }) => (
  <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
    <div className="animate-spin h-4 w-4 rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
    <span>{text}</span>
  </div>
);
export const ErrorBlock = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <div className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-md p-3">
    <div className="flex items-center gap-2 text-destructive text-sm">
      <span>⚠️</span>
      <span>{error instanceof Error ? error.message : String(error)}</span>
    </div>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    )}
  </div>
);

export function useSmartNav() {
  const navigate = useNavigate();
  return (url?: string | null) => {
    if (!url) return;
    if (url.startsWith('/app/')) {
      navigate(url);
    } else if (/^(https?:)?\/\//i.test(url) || url.startsWith('/')) {
      window.open(url, '_self');
    } else {
      window.open(url, '_self');
    }
  };
}

type MenuToggleButtonProps = {
  panelRef: React.RefObject<ImperativePanelHandle | null>;
};

const MenuToggleButton = memo(function MenuToggleButton({ panelRef }: MenuToggleButtonProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const panel = panelRef.current;
      if (!panel) return;

      if (panel.isCollapsed()) {
        panel.expand();
        setCollapsed(false);
        return;
      }

      panel.collapse();
      setCollapsed(true);
    },
    [panelRef]
  );

  const stopPointer = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const stopMouse = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <button
      type="button"
      onPointerDown={stopPointer}
      onMouseDown={stopMouse}
      onClick={handleToggle}
      className="z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
      aria-label={collapsed ? '좌측 메뉴 펼치기' : '좌측 메뉴 접기'}
    >
      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
});

export default function LayoutSPA() {
  const location = useLocation();
  const [maskVersion, setMaskVersion] = useState(0);
  const lastMaskedRef = useRef<string | undefined>(undefined);
  const recentlyClosedTabRef = useRef<string | undefined>(undefined);
  const initLoadedRef = useRef(false);
  const leftPanelRef = useRef<ImperativePanelHandle | null>(null);
  const [user, setUser] = useState<UserPayload['user'] | null>(null);
  const [menuResult, setMenuResult] = useState<ResultList>(() => EmptyPageResult(0, PAGE_SIZE));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tabs, setTabs] = useState<PageTab[]>([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const request: FetchRequest<AuthFetchForm> = { form: {} };
      const [me, menuRows] = await Promise.all([fetchMe(request), fetchMenuPgmInfoList(request)]);

      setUser(sanitizeUserPayload(me));
      setMenuResult(toPageResult<RowItem>(menuRows, 0, menuRows.length || PAGE_SIZE));
    } catch (e) {
      if (e instanceof Error && /\b(401|403)\b/.test(e.message)) {
        clearAuthStorage();
        navigate('/login', { replace: true });
        return;
      }

      setError(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (initLoadedRef.current) return;

    initLoadedRef.current = true;
    void load();
  }, [load]);

  const nav = useMemo(() => sanitizeNavPayload({ data: menuResult.content }), [menuResult]);

  const menuData = useMemo<TreeNode[]>(() => {
    const tree = nav.tree ?? [];
    const roles = user?.roles?.filter(Boolean) ?? [];
    if (roles.length === 0) return tree;
    return filterTreeByRole(tree, roles);
  }, [nav, user]);

  const onOpenMenu = (node: TreeNode) => {
    const pageId = getPageIdFromPath(node.path);
    if (!pageId) return;

    setTabs((prev) => {
      if (prev.some((tab) => tab.pageId === pageId)) return prev;
      return [
        ...prev,
        {
          pageId,
          title: String(node.menunm || pageId),
          path: node.path,
        },
      ];
    });
    setMaskedPage(pageId, navigate, { replace: false });
  };

  const openTab = (tab: PageTab) => {
    setMaskedPage(tab.pageId, navigate, { replace: false });
  };

  const closeTab = (pageId: string) => {
    const index = tabs.findIndex((tab) => tab.pageId === pageId);
    if (index < 0) return;

    const next = tabs.filter((tab) => tab.pageId !== pageId);
    const fallback = next[index] ?? next[index - 1];
    const nextPageId = maskedPage === pageId ? (fallback?.pageId ?? 'default') : maskedPage;

    recentlyClosedTabRef.current = pageId;
    setTabs(next);

    if (maskedPage === pageId && nextPageId) {
      setMaskedPage(nextPageId, navigate, { replace: false });
    }
  };

  useEffect(() => {
    const p = location.pathname;
    if (p === '/app' || p === '/app/') {
      ensureMaskedPage(navigate, 'default', true);
      return;
    }
    if (p.startsWith('/app/') && /\.tsx?$/i.test(p) && !/^\/app\/default\.tsx?$/i.test(p)) {
      const pageId = p.replace(/^.*\//, '').replace(/\.tsx?$/i, '');
      setMaskedPage(pageId, navigate, { replace: true });
      return;
    }
    if (p === '/app/default.ts') {
      const masked = (location.state as any)?.maskedPage || getMaskedPage();
      if (!masked) {
        ensureMaskedPage(navigate, 'default', true);
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const masked = (location.state as any)?.maskedPage as string | undefined;
    if (masked !== undefined && masked !== lastMaskedRef.current) {
      lastMaskedRef.current = masked;
      setMaskVersion((v) => v + 1);
    }
  }, [location.state]);

  useEffect(() => {
    const onMaskedChange = (e: Event) => {
      const pageId = (e as CustomEvent).detail?.pageId as string | undefined;
      if (pageId && pageId !== lastMaskedRef.current) {
        lastMaskedRef.current = pageId;
        setMaskVersion((v) => v + 1);
      }
    };
    window.addEventListener('maskedpagechange', onMaskedChange as EventListener);
    return () => window.removeEventListener('maskedpagechange', onMaskedChange as EventListener);
  }, []);

  const maskedPage = useMemo(() => {
    return ((location.state as any)?.maskedPage as string | undefined) || getMaskedPage();
  }, [location.state, maskVersion]);

  useEffect(() => {
    if (!maskedPage || maskedPage === 'default' || tabs.some((tab) => tab.pageId === maskedPage)) {
      return;
    }
    if (recentlyClosedTabRef.current === maskedPage) {
      return;
    }

    const matched = nav.menu.find((item) => getPageIdFromPath(item.path) === maskedPage);
    if (!matched) return;

    setTabs((prev) => [
      ...prev,
      {
        pageId: maskedPage,
        title: matched.menunm || maskedPage,
        path: matched.path,
      },
    ]);
  }, [maskedPage, nav.menu, tabs]);

  return (
    <div className="h-[100vh] w-full overflow-hidden bg-background text-foreground">
      <header className="border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <NavLink to="/app/default.ts" className="font-semibold tracking-tight">
            SSMH
          </NavLink>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="font-semibold">{String(user.usrNm)} 님</span>
            ) : (
              <span className="text-muted-foreground">게스트</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearAuthStorage();
                navigate('/login', { replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        </div>
        {loading ? (
          <LoadingBlock text="메뉴 불러오는 중..." />
        ) : error ? (
          <div className="px-3">
            <ErrorBlock error={error} onRetry={load} />
          </div>
        ) : null}
      </header>

      <PanelGroup direction="horizontal" className="h-[calc(100vh-48px)] min-w-0">
        <Panel ref={leftPanelRef} defaultSize={18} minSize={12} collapsible collapsedSize={0}>
          <div className="h-full bg-muted/30">
            <div className="p-1 h-full flex flex-col">
              <Separator />
              {loading ? (
                <LoadingBlock text="트리 불러오는 중..." />
              ) : error ? (
                <div className="p-2">
                  <ErrorBlock error={error} onRetry={load} />
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <TreeMenu
                    nodes={toSafeTree(menuData)}
                    onOpen={onOpenMenu}
                    masked={maskedPage ?? undefined}
                  />
                </ScrollArea>
              )}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="relative flex w-3 items-center justify-center bg-border/70 transition hover:bg-border">
          <MenuToggleButton panelRef={leftPanelRef} />
        </PanelResizeHandle>
        <Panel minSize={45} defaultSize={82}>
          <div className="flex h-full min-w-0 flex-col overflow-hidden bg-slate-50/50">
            {tabs.length > 0 ? (
              <div className="flex min-h-10 items-end gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 pt-2 sm:px-3">
                {tabs.map((tab) => {
                  const active = maskedPage === tab.pageId;
                  return (
                    <button
                      key={tab.pageId}
                      type="button"
                      onClick={() => openTab(tab)}
                      className={[
                        'group inline-flex h-9 max-w-[220px] shrink-0 items-center gap-2 rounded-t-md border px-3 text-sm transition',
                        active
                          ? 'border-slate-200 border-b-white bg-white font-semibold text-slate-900'
                          : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200',
                      ].join(' ')}
                    >
                      <span className="truncate">{tab.title}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`${tab.title} 닫기`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeTab(tab.pageId);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            closeTab(tab.pageId);
                          }
                        }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background">
              <Routes>
                <Route index element={<Navigate to="default.ts" replace />} />
                <Route
                  path="*"
                  element={
                    <PageRenderer
                      key={location.pathname.toLowerCase()}
                      base="/app"
                      pagesDir="/app/Default"
                      fallback="default"
                      maskVersion={maskVersion}
                    />
                  }
                />
              </Routes>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}
