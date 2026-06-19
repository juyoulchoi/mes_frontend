import { useEffect, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { CheckColumn, Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  countBadgeClass,
  editableInputClass,
  editableNumberInputClass,
  editableSelectClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSearchGridClass,
  registerSplitGridClass,
  searchButtonClass,
} from '@/lib/pageStyles';
import {
  deleteMmsm06001Detail,
  deleteMmsm06001Master,
  fetchMmsm06001Detail,
  fetchMmsm06001Master,
  saveMmsm06001Detail,
  saveMmsm06001Master,
  type DetailRow,
  type MasterRow,
} from '@/services/m06/mmsm06001';

// 기초코드 관리 (MMSM06001E)
// 좌: 그룹 마스터 | 우: 그룹별 기초코드 상세
// 상단: 그룹코드/그룹명 필터 + 조회
// 좌/우 각각: 추가, 저장(체크 또는 신규), 삭제

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export default function MMSM06001E() {
  const permissions = usePagePermissions();

  // Filters
  const [grpCd, setGrpCd] = useState('');
  const [grpNm, setGrpNm] = useState('');

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [selectedGrp, setSelectedGrp] = useState<string>('');
  const [masterEditIndex, setMasterEditIndex] = useState<number | null>(null);
  const [detailEditIndex, setDetailEditIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedMaster = master.find((row) => row.bscGrpCd === selectedGrp);
  const isSelectedGroupNew = !!selectedMaster?.isNew;
  const canEditDetail = !!selectedGrp && !isSelectedGroupNew;

  // 최초 로드 시 조회 X, 사용자가 조건으로 조회
  useEffect(() => {
    // no-op
  }, []);

  async function fetchMaster() {
    return fetchMmsm06001Master({ grpCd, grpNm });
  }
  async function fetchDetail(grp: string) {
    return fetchMmsm06001Detail(grp);
  }

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const m = await fetchMaster();
      setMaster(m);
      setMasterEditIndex(null);
      const nextGrp =
        m.find((row) => row.bscGrpCd && row.bscGrpCd === selectedGrp)?.bscGrpCd ||
        m.find((row) => row.bscGrpCd)?.bscGrpCd ||
        '';
      setSelectedGrp(nextGrp);
      const d = await fetchDetail(nextGrp);
      setDetail(d);
      setDetailEditIndex(null);
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

    const grp = row.bscGrpCd || '';
    setSelectedGrp(grp);
    setError(null);

    if (row.isNew) {
      setDetail([]);
      setDetailEditIndex(null);
      return;
    }

    setLoading(true);
    try {
      const d = await fetchDetail(grp);
      setDetail(d);
      setDetailEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Master handlers
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
    setMaster((prev) => {
      setMasterEditIndex(prev.length);
      return [
        ...prev,
        { CHECK: true, isNew: true, dspSeq: '', bscGrpCd: '', bscGrpNm: '', useYn: 'Y' },
      ];
    });
    setSelectedGrp('');
    setDetail([]);
    setDetailEditIndex(null);
    setError(null);
  }
  async function onMasterDelete() {
    const checkedRows = master.filter((r) => r.CHECK);
    const targets = checkedRows
      .filter((r) => !r.isNew)
      .map((r) => r.bscGrpCd)
      .filter(Boolean) as string[];

    if (checkedRows.length === 0) {
      setError('삭제할 그룹을 선택하세요.');
      return;
    }

    if (
      targets.length > 0 &&
      !window.confirm(
        '선택한 그룹을 삭제하시겠습니까? 하위 상세 코드가 있으면 함께 삭제되거나 삭제가 제한될 수 있습니다.'
      )
    ) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      for (const cd of targets) {
        await deleteMmsm06001Master(cd);
      }

      const nextMaster =
        targets.length > 0 ? await fetchMaster() : master.filter((row) => !row.CHECK);
      const deletedSelected = checkedRows.some((row) => row.bscGrpCd === selectedGrp);
      const nextGrp = deletedSelected
        ? nextMaster.find((row) => row.bscGrpCd)?.bscGrpCd || ''
        : selectedGrp;

      setMaster(nextMaster);
      setMasterEditIndex(null);
      setSelectedGrp(nextGrp);

      if (nextGrp) {
        setDetail(await fetchDetail(nextGrp));
        setDetailEditIndex(null);
      } else {
        setSelectedGrp('');
        setDetail([]);
        setDetailEditIndex(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }
  async function onMasterSave() {
    const targets = master.filter((r) => r.CHECK || r.isNew);
    if (targets.length === 0) {
      setError('저장할 마스터 대상이 없습니다.');
      return;
    }
    if (!window.confirm('마스터를 저장하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const nextSelectedGrp =
        targets.find((row) => row.bscGrpCd)?.bscGrpCd ||
        selectedGrp ||
        master.find((row) => row.bscGrpCd)?.bscGrpCd ||
        '';
      for (const row of targets) {
        await saveMmsm06001Master(row);
      }
      const nextMaster = await fetchMaster();
      const resolvedSelectedGrp =
        nextMaster.find((row) => row.bscGrpCd === nextSelectedGrp)?.bscGrpCd ||
        nextMaster.find((row) => row.bscGrpCd)?.bscGrpCd ||
        '';

      setMaster(nextMaster);
      setMasterEditIndex(null);
      setSelectedGrp(resolvedSelectedGrp);
      setDetail(await fetchDetail(resolvedSelectedGrp));
      setDetailEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Detail handlers
  function toggleDetail(i: number, checked: boolean) {
    setDetail((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }
  function markDetailEditing(i: number) {
    const shouldClose = detailEditIndex === i && !detail[i]?.isNew;
    setDetail((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], CHECK: !shouldClose };
      return next;
    });
    setDetailEditIndex((prev) => {
      if (prev === i && !detail[i]?.isNew) return null;
      return i;
    });
  }
  function onSelectDetail(i: number) {
    if (detailEditIndex !== null && detailEditIndex !== i && !detail[detailEditIndex]?.isNew) {
      setDetailEditIndex(null);
    }
  }
  function patchDetail(i: number, patch: Partial<DetailRow>) {
    setDetail((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }
  function onDetailAdd() {
    if (!canEditDetail) {
      setError(
        isSelectedGroupNew
          ? '신규 그룹은 먼저 저장한 뒤 상세 코드를 등록하세요.'
          : '좌측에서 그룹을 먼저 선택하세요.'
      );
      return;
    }
    setDetail((prev) => {
      setDetailEditIndex(prev.length);
      return [
        ...prev,
        {
          CHECK: true,
          isNew: true,
          dspSeq: '',
          bscCd: '',
          bscNm: '',
          bscNm2: '',
          desc: '',
          useYn: 'Y',
        },
      ];
    });
  }
  async function onDetailDelete() {
    if (!canEditDetail) {
      setError(
        isSelectedGroupNew
          ? '신규 그룹은 먼저 저장한 뒤 상세 코드를 삭제하세요.'
          : '그룹을 먼저 선택하세요.'
      );
      return;
    }
    const targets = detail
      .filter((r) => r.CHECK && !r.isNew)
      .map((r) => r.bscCd)
      .filter(Boolean) as string[];
    const hasNewOnly =
      detail.every((r) => (r.isNew ? (r.CHECK ? true : true) : true)) && targets.length === 0;
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        for (const cd of targets) {
          await deleteMmsm06001Detail(selectedGrp, cd);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    setDetail((prev) => prev.filter((r) => !r.CHECK));
    setDetailEditIndex(null);
    if (!hasNewOnly) {
      onSelectMaster(master.findIndex((m) => m.bscGrpCd === selectedGrp));
    }
  }
  async function onDetailSave() {
    if (!canEditDetail) {
      setError(
        isSelectedGroupNew
          ? '신규 그룹은 먼저 저장한 뒤 상세 코드를 저장하세요.'
          : '그룹을 먼저 선택하세요.'
      );
      return;
    }
    const targets = detail.filter((r) => r.CHECK || r.isNew);
    if (targets.length === 0) {
      setError('저장할 상세 대상이 없습니다.');
      return;
    }
    if (!window.confirm('상세를 저장하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      for (const row of targets) {
        await saveMmsm06001Detail(selectedGrp, row);
      }
      const d = await fetchDetail(selectedGrp);
      setDetail(d);
      setDetailEditIndex(null);
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
          <div className={registerSearchGridClass}>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>그룹코드</span>
              <input
                className={searchInputClass}
                value={grpCd}
                onChange={(e) => setGrpCd(e.target.value)}
              />
            </div>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>그룹명</span>
              <input
                className={searchInputClass}
                value={grpNm}
                onChange={(e) => setGrpNm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              {permissions.canSearch ? (
                <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                  조회
                </button>
              ) : null}
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="wideLeft" width="full">
            <SectionHeader
              title="기초코드 그룹"
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
                rowKey={(row, index) => `${row.bscGrpCd ?? 'new'}-${index}`}
                showBorders
                emptyText="그룹 목록이 없습니다. 조건을 입력하고 조회하세요."
                getRowProps={(row, index) => ({
                  onClick: () => onSelectMaster(index),
                  onDoubleClick: () => markMasterEditing(index),
                  className: `cursor-pointer ${
                    row.bscGrpCd && row.bscGrpCd === selectedGrp ? 'bg-sky-50' : ''
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
                  dataField="dspSeq"
                  caption="표시순서"
                  width={90}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.dspSeq ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableNumberInputClass}
                        inputMode="numeric"
                        value={row.dspSeq ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          patchMaster(index, { dspSeq: onlyDigits(event.target.value) })
                        }
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="bscGrpCd"
                  caption="그룹코드"
                  width={130}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.bscGrpCd ?? ''}</span>;
                    }

                    return (
                      <input
                        className={row.isNew ? editableInputClass : readonlyInputClass}
                        value={row.bscGrpCd ?? ''}
                        readOnly={!row.isNew}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { bscGrpCd: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="bscGrpNm"
                  caption="그룹코드명"
                  width={180}
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.bscGrpNm ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.bscGrpNm ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { bscGrpNm: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<MasterRow>
                  dataField="useYn"
                  caption="사용여부"
                  width={90}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || masterEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.useYn ?? 'Y'}</span>;
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={row.useYn ?? 'Y'}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patchMaster(index, { useYn: event.target.value })}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    );
                  }}
                />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="wideRight" width="full">
            <SectionHeader
              title="기초코드 상세"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${detail.length}건`}
                </span>
              }
            />
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-600">
                  선택그룹: {selectedGrp || '-'}
                </span>
                {isSelectedGroupNew ? (
                  <span className="text-xs text-amber-700">
                    신규 그룹은 저장 후 상세 코드를 등록할 수 있습니다.
                  </span>
                ) : null}
              </div>
              <CrudActionButtons
                onAdd={onDetailAdd}
                onSave={onDetailSave}
                onDelete={onDetailDelete}
                disabled={loading || !canEditDetail}
                className="flex gap-2"
              />
            </div>
            <div className={gridScrollClass}>
              <DataGrid<DetailRow>
                dataSource={detail}
                rowKey={(row, index) => `${selectedGrp}-${row.bscCd ?? 'new'}-${index}`}
                showBorders
                emptyText="상세 목록이 없습니다. 좌측 그룹을 선택하고 추가 또는 조회하세요."
                getRowProps={(_, index) => ({
                  onClick: () => onSelectDetail(index),
                  onDoubleClick: () => markDetailEditing(index),
                  className: 'cursor-pointer',
                })}
              >
                <Paging enabled={false} />
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_, index, checked) => toggleDetail(index, checked)}
                />
                <Column<DetailRow>
                  dataField="dspSeq"
                  caption="표시순서"
                  width={90}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || detailEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.dspSeq ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableNumberInputClass}
                        inputMode="numeric"
                        value={row.dspSeq ?? ''}
                        onChange={(event) =>
                          patchDetail(index, { dspSeq: onlyDigits(event.target.value) })
                        }
                      />
                    );
                  }}
                />
                <Column<DetailRow>
                  dataField="bscCd"
                  caption="기초코드"
                  width={120}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || detailEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.bscCd ?? ''}</span>;
                    }

                    return (
                      <input
                        className={row.isNew ? editableInputClass : readonlyInputClass}
                        value={row.bscCd ?? ''}
                        readOnly={!row.isNew}
                        onChange={(event) => patchDetail(index, { bscCd: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<DetailRow>
                  dataField="bscNm"
                  caption="기초코드명"
                  width={160}
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || detailEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.bscNm ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.bscNm ?? ''}
                        onChange={(event) => patchDetail(index, { bscNm: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<DetailRow>
                  dataField="bscNm2"
                  caption="기초코드명약어"
                  width={150}
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || detailEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.bscNm2 ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.bscNm2 ?? ''}
                        onChange={(event) => patchDetail(index, { bscNm2: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<DetailRow>
                  dataField="desc"
                  caption="설명"
                  width={190}
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || detailEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.desc ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.desc ?? ''}
                        onChange={(event) => patchDetail(index, { desc: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<DetailRow>
                  dataField="useYn"
                  caption="사용여부"
                  width={90}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.isNew || detailEditIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.useYn ?? 'Y'}</span>;
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={row.useYn ?? 'Y'}
                        onChange={(event) => patchDetail(index, { useYn: event.target.value })}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
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
