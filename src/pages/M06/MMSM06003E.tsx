import { useEffect, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  basicInfoSearchGridClass,
  countBadgeClass,
  editableInputClass,
  editableSelectClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  searchButtonClass,
} from '@/lib/pageStyles';
import {
  deleteMmsm06003Master,
  fetchMmsm06003Master,
  saveMmsm06003Master,
  type MasterRow,
} from '@/services/m06/mmsm06003';
import {
  fetchMmsm06005Groups,
  fetchMmsm06005Procs,
  type GroupRow,
  type ProcRow,
} from '@/services/m06/mmsm06005';

// 제품 마스터 관리 (MMSM06003E)
// 제품 마스터를 등록/수정/삭제한다.

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';
const itemGbOptions = [
  { value: 'FG', label: '제품' },
  { value: 'SFG', label: '반제품' },
  { value: 'RAW', label: '원재료' },
  { value: 'SUB', label: '부자재' },
];
const statusOptions = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'PENDING', label: '대기' },
  { value: 'DISABLED', label: '사용불가' },
];

export default function MMSM06003E() {
  const permissions = usePagePermissions();

  const [itemNm, setItemNm] = useState('');
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [selectedItemCd, setSelectedItemCd] = useState('');
  const [procGroups, setProcGroups] = useState<GroupRow[]>([]);
  const [procs, setProcs] = useState<ProcRow[]>([]);
  const [masterEditIndex, setMasterEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMaster() {
    return fetchMmsm06003Master({ itemNm });
  }

  async function fetchRoutingOptions() {
    const [nextGroups, nextProcs] = await Promise.all([
      fetchMmsm06005Groups(),
      fetchMmsm06005Procs(),
    ]);
    setProcGroups(nextGroups);
    setProcs(nextProcs);
  }

  useEffect(() => {
    void fetchRoutingOptions().catch((e) => {
      setError(e instanceof Error ? e.message : String(e));
    });
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      await fetchRoutingOptions();
      const nextMaster = await fetchMaster();
      const nextItemCd =
        nextMaster.find((row) => row.itemCd && row.itemCd === selectedItemCd)?.itemCd ||
        nextMaster.find((row) => row.itemCd)?.itemCd ||
        '';

      setMaster(nextMaster);
      setMasterEditIndex(null);
      setSelectedItemCd(nextItemCd);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSelectMaster(i: number) {
    const row = master[i];
    if (!row) return;

    if (masterEditIndex !== null && masterEditIndex !== i && !master[masterEditIndex]?.isNew) {
      setMasterEditIndex(null);
    }

    const itemCd = row.itemCd || '';
    setSelectedItemCd(itemCd);
    setError(null);
  }

  function toggleMaster(i: number, checked: boolean) {
    setMaster((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function markMasterEditing(i: number) {
    const shouldClose = masterEditIndex === i && !master[i]?.isNew;
    setMaster((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], CHECK: !shouldClose };
      return next;
    });
    setMasterEditIndex((prev) => {
      if (prev === i && !master[i]?.isNew) return null;
      return i;
    });
  }

  function patchMaster(i: number, patch: Partial<MasterRow>) {
    setMaster((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  function onMasterAdd() {
    setMaster((prev) => [
      ...prev,
      {
        CHECK: true,
        isNew: true,
        itemCd: '',
        itemNm: '',
        itemGb: 'FG',
        itemSpec: '',
        unitCd: 'EA',
        procGb: '',
        procCd: '',
        status: 'ACTIVE',
      },
    ]);
    setMasterEditIndex(master.length);
    setSelectedItemCd('');
    setError(null);
  }

  async function onMasterDelete() {
    const checkedRows = master.filter((row) => row.CHECK);
    const targets = checkedRows
      .filter((row) => !row.isNew)
      .map((row) => row.itemCd)
      .filter(Boolean) as string[];

    if (checkedRows.length === 0) {
      setError('삭제할 제품을 선택하세요.');
      return;
    }

    if (targets.length > 0 && !window.confirm('선택한 제품을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const itemCd of targets) {
        await deleteMmsm06003Master(itemCd);
      }

      const nextMaster =
        targets.length > 0 ? await fetchMaster() : master.filter((row) => !row.CHECK);
      const deletedSelected = checkedRows.some((row) => row.itemCd === selectedItemCd);
      const nextItemCd = deletedSelected
        ? nextMaster.find((row) => row.itemCd)?.itemCd || ''
        : selectedItemCd;

      setMaster(nextMaster);
      setMasterEditIndex(null);
      setSelectedItemCd(nextItemCd);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onMasterSave() {
    const targets = master.filter((row) => row.CHECK || row.isNew);

    if (targets.length === 0) {
      setError('저장할 제품을 선택하세요.');
      return;
    }

    if (targets.some((row) => !row.itemCd?.trim() || !row.itemNm?.trim())) {
      setError('제품코드와 제품명은 필수입니다.');
      return;
    }

    if (targets.some((row) => !row.procGb?.trim() && !row.procCd?.trim())) {
      setError('생산계획 생성을 위해 공정그룹 또는 대표공정을 입력하세요.');
      return;
    }

    if (!window.confirm('제품 마스터를 저장하시겠습니까?')) return;

    setLoading(true);
    setError(null);

    try {
      const nextSelectedItemCd =
        targets.find((row) => row.itemCd)?.itemCd ||
        selectedItemCd ||
        master.find((row) => row.itemCd)?.itemCd ||
        '';

      for (const row of targets) {
        await saveMmsm06003Master(row);
      }

      const nextMaster = await fetchMaster();
      const resolvedItemCd =
        nextMaster.find((row) => row.itemCd === nextSelectedItemCd)?.itemCd ||
        nextMaster.find((row) => row.itemCd)?.itemCd ||
        '';

      setMaster(nextMaster);
      setMasterEditIndex(null);
      setSelectedItemCd(resolvedItemCd);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={basicInfoSearchGridClass}>
              <div className={searchFieldClass}>
                <span className={searchLabelTextClass}>제품명</span>
                <input
                  className={searchInputClass}
                  value={itemNm}
                  onChange={(event) => setItemNm(event.target.value)}
                />
              </div>
              <div className="col-start-3 row-start-1 flex flex-wrap items-end justify-end gap-2 xl:col-start-4">
                {permissions.canSearch ? (
                  <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                    조회
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="full" width="full">
            <SectionHeader
              title="제품 마스터"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${master.length}건`}
                </span>
              }
            />
            <CrudActionButtons
              onAdd={onMasterAdd}
              onSave={onMasterSave}
              onDelete={onMasterDelete}
              disabled={loading}
            />
            <div className={gridScrollClass}>
              <DataGrid<MasterRow>
                dataSource={master}
                rowKey={(row, index) => (row.isNew ? `new-${index}` : `${row.itemCd}-${index}`)}
                showBorders
                emptyText="제품 목록이 없습니다. 조건을 입력하고 조회하세요."
                getRowProps={(row, index) => ({
                  onClick: () => onSelectMaster(index),
                  onDoubleClick: () => markMasterEditing(index),
                  className: `cursor-pointer ${
                    row.itemCd && row.itemCd === selectedItemCd ? 'bg-sky-50' : ''
                  }`,
                })}
              >
                <Paging enabled={false} />
                <Column<MasterRow>
                  dataField="CHECK"
                  caption="선택"
                  width={48}
                  alignment="center"
                  cellRender={(row, index) => (
                    <input
                      type="checkbox"
                      checked={!!row.CHECK}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => toggleMaster(index, event.target.checked)}
                    />
                  )}
                />
                <Column<MasterRow>
                  dataField="itemGb"
                  caption="품목구분"
                  width={110}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    const value = row.itemGb || 'FG';
                    if (!isEditing) {
                      return (
                        <span className={readOnlyCellClass}>
                          {itemGbOptions.find((option) => option.value === value)?.label || value}
                        </span>
                      );
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { itemGb: event.target.value })}
                      >
                        {itemGbOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="itemCd"
                  caption="제품코드"
                  width={130}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.itemCd ?? ''}</span>;
                    }

                    return (
                      <input
                        className={row.isNew ? editableInputClass : readonlyInputClass}
                        value={row.itemCd ?? ''}
                        readOnly={!row.isNew}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { itemCd: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="itemNm"
                  caption="제품명"
                  width={260}
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.itemNm ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.itemNm ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { itemNm: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="itemSpec"
                  caption="규격"
                  width={300}
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.itemSpec || '미등록'}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.itemSpec ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { itemSpec: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="unitCd"
                  caption="단위"
                  width={90}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.unitCd || '-'}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.unitCd ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { unitCd: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="procGb"
                  caption="공정그룹"
                  width={150}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    const value = row.procGb ?? '';
                    if (!isEditing) {
                      const label =
                        procGroups.find((group) => group.procGrpCd === value)?.procGrpNm || value;
                      return <span className={readOnlyCellClass}>{label || '-'}</span>;
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          patchMaster(index, { procGb: event.target.value, procCd: '' })
                        }
                      >
                        <option value="">선택</option>
                        {procGroups.map((group) => (
                          <option key={group.procGrpCd} value={group.procGrpCd}>
                            {group.procGrpNm || group.procGrpCd}
                          </option>
                        ))}
                      </select>
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="procCd"
                  caption="대표공정"
                  width={150}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    const value = row.procCd ?? '';
                    if (!isEditing) {
                      const label = procs.find((proc) => proc.procCd === value)?.procNm || value;
                      return <span className={readOnlyCellClass}>{label || '-'}</span>;
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { procCd: event.target.value })}
                      >
                        <option value="">선택</option>
                        {procs.map((proc) => (
                          <option key={proc.procCd} value={proc.procCd}>
                            {proc.procNm || proc.procCd}
                          </option>
                        ))}
                      </select>
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="status"
                  caption="상태"
                  width={110}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    const value = row.status || 'ACTIVE';
                    if (!isEditing) {
                      return (
                        <span className={readOnlyCellClass}>
                          {statusOptions.find((option) => option.value === value)?.label || value}
                        </span>
                      );
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { status: event.target.value })}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    );
                  }}
                />
              </DataGrid>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
