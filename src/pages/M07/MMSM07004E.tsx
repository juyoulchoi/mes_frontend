import { useEffect, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { clearPagePermissionCache, usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  countBadgeClass,
  editableInputClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  searchButtonClass,
} from '@/lib/pageStyles';
import {
  fetchMmsm07004Groups,
  fetchMmsm07004Rights,
  saveMmsm07004Rights,
  type AuthColumnKey,
  type GroupRow,
  type RightRow,
} from '@/services/m07/mmsm07004';

// 권한 관리 (MMSM07004E)
// MMSM06007E 패턴 기반: 좌측 사용자그룹 + 우측 메뉴 권한 그리드

const searchGridClass = 'grid grid-cols-1 gap-3 md:grid-cols-[340px_340px_1fr]';
const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const panelActionClass =
  'h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

function showWarning(message: string) {
  window.alert(message);
}

export default function MMSM07004E() {
  const permissions = usePagePermissions();

  const [groupKeyword, setGroupKeyword] = useState('');
  const [menuKeyword, setMenuKeyword] = useState('');

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [rights, setRights] = useState<RightRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSearchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearchGroups() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMmsm07004Groups(groupKeyword);
      setGroups(list);
      const nextGroup =
        list.find((row) => row.USR_GRP_CD === selectedGroup)?.USR_GRP_CD ??
        list[0]?.USR_GRP_CD ??
        '';
      setSelectedGroup(nextGroup);
      if (nextGroup) {
        await loadRights(nextGroup);
      } else {
        setRights([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadRights(groupCd: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMmsm07004Rights(groupCd, menuKeyword);
      setRights(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRights([]);
    } finally {
      setLoading(false);
    }
  }

  function onSelectGroup(groupCd: string) {
    setSelectedGroup(groupCd);
    loadRights(groupCd);
  }

  function toggleCell(index: number, key: AuthColumnKey, checked: boolean) {
    setRights((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: checked, DIRTY: true };
      return next;
    });
  }

  function toggleColumn(key: AuthColumnKey, checked: boolean) {
    setRights((prev) => prev.map((row) => ({ ...row, [key]: checked, DIRTY: true })));
  }

  async function onSearchRights() {
    if (!selectedGroup) {
      setError(null);
      showWarning('좌측에서 사용자그룹을 선택하세요.');
      return;
    }
    await loadRights(selectedGroup);
  }

  async function onSave() {
    if (!selectedGroup) {
      setError(null);
      showWarning('좌측에서 사용자그룹을 선택하세요.');
      return;
    }
    const targets = rights.filter((row) => row.DIRTY);
    if (targets.length === 0) {
      setError(null);
      showWarning('저장할 변경사항이 없습니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;

    setLoading(true);
    setError(null);
    try {
      await saveMmsm07004Rights(selectedGroup, targets);
      clearPagePermissionCache(selectedGroup);
      await loadRights(selectedGroup);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const authColumns = [
    ['SER_AUTH', '조회'],
    ['CLE_AUTH', '초기화'],
    ['SAV_AUTH', '저장'],
    ['DEL_AUTH', '삭제'],
    ['PRT_AUTH', '출력'],
    ['EXL_AUTH', 'EXCEL'],
  ] as const;

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className={searchGridClass}>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>사용자그룹</span>
              <input
                className={searchInputClass}
                value={groupKeyword}
                onChange={(event) => setGroupKeyword(event.target.value)}
              />
            </div>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>메뉴</span>
              <input
                className={searchInputClass}
                value={menuKeyword}
                onChange={(event) => setMenuKeyword(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              {permissions.canSearch ? (
                <>
                  <button onClick={onSearchGroups} disabled={loading} className={panelActionClass}>
                    그룹조회
                  </button>
                  <button onClick={onSearchRights} disabled={loading} className={searchButtonClass}>
                    조회
                  </button>
                </>
              ) : null}
              <CrudActionButtons
                onSave={onSave}
                disabled={loading}
                addActions={[]}
                className="flex flex-wrap items-end justify-end gap-2"
              />
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="left" width="full">
            <SectionHeader
              title="사용자그룹"
              right={<span className={countBadgeClass}>{groups.length}건</span>}
            />
            <div className={gridScrollClass}>
              <DataGrid<GroupRow>
                dataSource={groups}
                rowKey={(row) => row.USR_GRP_CD}
                showBorders
                emptyText="사용자그룹이 없습니다."
                classNames={{ table: 'min-w-[260px] w-full text-sm' }}
                getRowProps={(row) => ({
                  onClick: () => onSelectGroup(row.USR_GRP_CD),
                  className:
                    selectedGroup === row.USR_GRP_CD
                      ? 'cursor-pointer bg-slate-100'
                      : 'cursor-pointer',
                })}
              >
                <Paging enabled={false} />
                <Column<GroupRow> dataField="SERL" caption="No." width={56} alignment="center" />
                <Column<GroupRow> dataField="USR_GRP_NM" caption="사용자그룹" />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="right" width="full">
            <SectionHeader
              title={selectedGroup ? `권한 - ${selectedGroup}` : '권한'}
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${rights.length}건`}
                </span>
              }
            />
            <div className={gridScrollClass}>
              <DataGrid<RightRow>
                dataSource={rights}
                rowKey={(row, index) => `${row.MENU_ID}-${index}`}
                showBorders
                emptyText="권한 목록이 없습니다. 사용자그룹을 선택하고 조회하세요."
                classNames={{ table: 'min-w-[920px] w-full text-sm' }}
              >
                <Paging enabled={false} />
                <Column<RightRow> dataField="MENU_ID" caption="메뉴ID" width={150} />
                <Column<RightRow> dataField="PGM_ID" caption="프로그램ID" width={150} />
                <Column<RightRow> dataField="MENU_NM" caption="메뉴명" width={220} />
                {authColumns.map(([field, caption]) => (
                  <Column<RightRow>
                    key={field}
                    dataField={field}
                    caption={
                      <span className="inline-flex items-center gap-1">
                        {caption}
                        <input
                          type="checkbox"
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleColumn(field, event.target.checked)}
                        />
                      </span>
                    }
                    width={92}
                    alignment="center"
                    cellRender={(row, index) => (
                      <input
                        type="checkbox"
                        checked={!!row[field]}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => toggleCell(index, field, event.target.checked)}
                      />
                    )}
                  />
                ))}
              </DataGrid>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
