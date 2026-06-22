import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  addTransferButtonClass,
  basicInfoSearchGridClass,
  countBadgeClass,
  deleteTransferButtonClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  searchButtonClass,
  transferButtonGroupClass,
  transferColumnClass,
} from '@/lib/pageStyles';
import {
  addMmsm06005GroupProcs,
  buildMmsm06005Csv,
  deleteMmsm06005GroupProcs,
  fetchMmsm06005GroupProcs,
  fetchMmsm06005Groups,
  fetchMmsm06005Procs,
  type GroupRow,
  type ProcRow,
} from '@/services/m06/mmsm06005';

// 공정그룹 라우팅 관리 (MMSM06005E)
// 좌: 공정그룹 목록 | 중간 버튼(등록/해제) | 우: 상단 전체공정 목록, 하단 등록공정 목록
// 기능: 그룹 선택 시 우측 두 목록 로드, 선택 후 등록/해제, CSV 내보내기

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

export default function MMSM06005E() {
  const permissions = usePagePermissions();

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [procs, setProcs] = useState<ProcRow[]>([]);
  const [grpProcs, setGrpProcs] = useState<ProcRow[]>([]);
  const [selectedGrp, setSelectedGrp] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const nextGroups = await fetchMmsm06005Groups();
      const nextSelected =
        nextGroups.find((row) => row.procGrpCd && row.procGrpCd === selectedGrp) ||
        nextGroups.find((row) => row.procGrpCd);
      const nextGrp = nextSelected?.procGrpCd || '';
      const [nextProcs, nextGrpProcs] = await Promise.all([
        fetchMmsm06005Procs(nextGrp),
        fetchMmsm06005GroupProcs(nextGrp),
      ]);

      setGroups(nextGroups);
      setProcs(nextProcs);
      setSelectedGrp(nextGrp);
      setGrpProcs(nextGrpProcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSelectGroup(index: number) {
    const row = groups[index];
    if (!row) return;

    const grp = row.procGrpCd || '';
    setSelectedGrp(grp);
    setLoading(true);
    setError(null);

    try {
      const [nextProcs, nextGrpProcs] = await Promise.all([
        fetchMmsm06005Procs(grp),
        fetchMmsm06005GroupProcs(grp),
      ]);
      setProcs(nextProcs);
      setGrpProcs(nextGrpProcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleProcs(
    listSetter: (updater: (prev: ProcRow[]) => ProcRow[]) => void,
    index: number,
    checked: boolean
  ) {
    listSetter((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], check: checked };
      return next;
    });
  }

  async function onAddProcsToGroup() {
    if (!selectedGrp) {
      setError('좌측에서 공정그룹을 선택하세요.');
      return;
    }

    if (procs.length === 0) {
      setError(
        '등록 가능한 공정이 없습니다. 공정정보를 먼저 등록했거나 이미 모두 등록된 상태인지 확인하세요.'
      );
      return;
    }

    const targets = procs
      .filter((row) => row.check)
      .map((row) => row.procCd)
      .filter(Boolean) as string[];

    if (targets.length === 0) {
      setError('등록가능공정에서 등록할 공정을 선택하세요.');
      return;
    }

    if (!window.confirm(`선택한 ${targets.length}건의 공정을 등록하시겠습니까?`)) return;

    setLoading(true);
    setError(null);

    try {
      await addMmsm06005GroupProcs(selectedGrp, targets);
      const [nextProcs, nextGrpProcs] = await Promise.all([
        fetchMmsm06005Procs(selectedGrp),
        fetchMmsm06005GroupProcs(selectedGrp),
      ]);
      setProcs(nextProcs);
      setGrpProcs(nextGrpProcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onRemoveProcsFromGroup() {
    if (!selectedGrp) {
      setError('좌측에서 공정그룹을 선택하세요.');
      return;
    }

    const targets = grpProcs
      .filter((row) => row.check)
      .map((row) => row.procCd)
      .filter(Boolean) as string[];

    if (targets.length === 0) {
      setError('등록공정에서 해제할 공정을 선택하세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteMmsm06005GroupProcs(selectedGrp, targets);
      const [nextProcs, nextGrpProcs] = await Promise.all([
        fetchMmsm06005Procs(selectedGrp),
        fetchMmsm06005GroupProcs(selectedGrp),
      ]);
      setProcs(nextProcs);
      setGrpProcs(nextGrpProcs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm06005Csv(selectedGrp, grpProcs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM06005E_routing_procs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={basicInfoSearchGridClass}>
              <div className={searchFieldClass}>
                <span className={searchLabelTextClass}>조회대상</span>
                <span className="flex h-10 items-center text-sm text-slate-600">
                  공정그룹 및 라우팅공정
                </span>
              </div>
              <div className="col-start-3 row-start-1 flex flex-wrap items-end justify-end gap-2 xl:col-start-4">
                {permissions.canSearch ? (
                  <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                    조회
                  </button>
                ) : null}
                <CrudActionButtons
                  onExport={onExportCsv}
                  disabled={loading}
                  className="flex flex-wrap items-end justify-end gap-2"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="left" width="full">
            <SectionHeader
              title="공정그룹"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${groups.length}건`}
                </span>
              }
            />
            <div className={gridScrollClass}>
              <DataGrid<GroupRow>
                dataSource={groups}
                rowKey={(row, index) => `${row.procGrpCd ?? 'group'}-${index}`}
                showBorders
                emptyText="공정그룹이 없습니다. 조회를 눌러 로드하세요."
                getRowProps={(row, index) => ({
                  onClick: () => onSelectGroup(index),
                  className: `cursor-pointer ${
                    row.procGrpCd && row.procGrpCd === selectedGrp ? 'bg-sky-50' : ''
                  }`,
                })}
              >
                <Paging enabled={false} />
                <Column<GroupRow>
                  dataField="procGrpCd"
                  caption="공정그룹코드"
                  width={130}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.procGrpCd ?? ''}</span>
                  )}
                />
                <Column<GroupRow>
                  dataField="procGrpNm"
                  caption="공정그룹명"
                  width={180}
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.procGrpNm ?? ''}</span>
                  )}
                />
              </DataGrid>
            </div>
          </SectionCard>

          <div className={transferColumnClass}>
            <div className={transferButtonGroupClass}>
              {permissions.canDelete ? (
                <button
                  onClick={onRemoveProcsFromGroup}
                  disabled={loading || !selectedGrp}
                  className={deleteTransferButtonClass}
                >
                  해제
                </button>
              ) : null}
              {permissions.canSave ? (
                <button
                  onClick={onAddProcsToGroup}
                  disabled={loading || !selectedGrp || procs.length === 0}
                  className={addTransferButtonClass}
                >
                  등록
                </button>
              ) : null}
            </div>
          </div>

          <SectionCard span="wideRight" width="full">
            <SectionHeader
              title="공정그룹 라우팅"
              right={
                <span className={countBadgeClass}>
                  {loading
                    ? '조회중...'
                    : `등록가능공정 ${procs.length}건 / 등록공정 ${grpProcs.length}건`}
                </span>
              }
            />
            <div className="grid gap-4 p-4 xl:grid-cols-2">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">등록가능공정</span>
                  <span className={countBadgeClass}>{procs.length}건</span>
                </div>
                <div className="max-h-[64vh] overflow-auto">
                  <DataGrid<ProcRow>
                    dataSource={procs}
                    rowKey={(row, index) => `all-${row.procCd ?? 'proc'}-${index}`}
                    showBorders
                    emptyText="등록 가능한 공정이 없습니다. 공정정보를 등록했거나 이미 모두 등록된 상태인지 확인하세요."
                    getRowProps={(row, index) => ({
                      onClick: () => toggleProcs(setProcs, index, !row.check),
                      className: `cursor-pointer ${row.check ? 'bg-sky-50' : ''}`,
                    })}
                  >
                    <Paging enabled={false} />
                    <Column<ProcRow>
                      dataField="check"
                      caption="선택"
                      width={48}
                      alignment="center"
                      cellRender={(row, index) => (
                        <input
                          type="checkbox"
                          checked={!!row.check}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleProcs(setProcs, index, event.target.checked)}
                        />
                      )}
                    />
                    <Column<ProcRow>
                      dataField="procCd"
                      caption="공정코드"
                      width={120}
                      alignment="center"
                      cellRender={(row) => (
                        <span className={readOnlyCellClass}>{row.procCd ?? ''}</span>
                      )}
                    />
                    <Column<ProcRow>
                      dataField="procNm"
                      caption="공정명"
                      width={200}
                      cellRender={(row) => (
                        <span className={readOnlyCellClass}>{row.procNm ?? ''}</span>
                      )}
                    />
                  </DataGrid>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">등록공정</span>
                  <span className={countBadgeClass}>{grpProcs.length}건</span>
                </div>
                <div className="max-h-[64vh] overflow-auto">
                  <DataGrid<ProcRow>
                    dataSource={grpProcs}
                    rowKey={(row, index) => `group-${row.procCd ?? 'proc'}-${index}`}
                    showBorders
                    emptyText="공정그룹에 등록된 라우팅공정이 없습니다."
                    getRowProps={(row, index) => ({
                      onClick: () => toggleProcs(setGrpProcs, index, !row.check),
                      className: `cursor-pointer ${row.check ? 'bg-sky-50' : ''}`,
                    })}
                  >
                    <Paging enabled={false} />
                    <Column<ProcRow>
                      dataField="check"
                      caption="선택"
                      width={48}
                      alignment="center"
                      cellRender={(row, index) => (
                        <input
                          type="checkbox"
                          checked={!!row.check}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            toggleProcs(setGrpProcs, index, event.target.checked)
                          }
                        />
                      )}
                    />
                    <Column<ProcRow>
                      dataField="procCd"
                      caption="공정코드"
                      width={120}
                      alignment="center"
                      cellRender={(row) => (
                        <span className={readOnlyCellClass}>{row.procCd ?? ''}</span>
                      )}
                    />
                    <Column<ProcRow>
                      dataField="procNm"
                      caption="공정명"
                      width={200}
                      cellRender={(row) => (
                        <span className={readOnlyCellClass}>{row.procNm ?? ''}</span>
                      )}
                    />
                  </DataGrid>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
