import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import {
  countBadgeClass,
  editableInputClass,
  editableSelectClass,
  exportCsvButtonClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  saveButtonClass,
  searchButtonClass,
} from '@/lib/pageStyles';
import {
  buildMmsm07002Csv,
  createNewMmsm07002Row,
  deleteMmsm07002Rows,
  fetchMmsm07002Rows,
  normalizeProgramId,
  saveMmsm07002Rows,
  type Row,
} from '@/services/m07/mmsm07002';

// 프로그램 관리 (MMSM07002E)
// MMSM06007E와 동일한 단일 그리드 패턴: 조회/추가/저장/삭제/엑셀

const searchGridClass =
  'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[320px_360px_180px_1fr]';
const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const searchSelectClass = `${searchInputClass} bg-white`;
const panelActionClass =
  'h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';
const deleteButtonClass =
  'h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50';
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

function showWarning(message: string) {
  window.alert(message);
}

export default function MMSM07002E() {
  const [pgmId, setPgmId] = useState('');
  const [pgmNm, setPgmNm] = useState('');
  const [useYn, setUseYn] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMmsm07002Rows({ pgmId, pgmNm, useYn });
      setRows(list);
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number, checked: boolean) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function markEditing(i: number) {
    const shouldClose = editIndex === i && !rows[i]?.ISNEW;
    setRows((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], CHECK: !shouldClose };
      return next;
    });
    setEditIndex((prev) => (prev === i && !rows[i]?.ISNEW ? null : i));
  }

  function patch(i: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  function onAdd() {
    setRows((prev) => {
      setEditIndex(prev.length);
      return [...prev, createNewMmsm07002Row(prev.length)];
    });
    setError(null);
  }

  async function onDelete() {
    const checkedRows = rows.filter((r) => r.CHECK);
    const targets = checkedRows.filter((r) => !r.ISNEW);

    if (checkedRows.length === 0) {
      setError(null);
      showWarning('삭제할 프로그램을 선택하세요.');
      return;
    }
    if (
      targets.length > 0 &&
      !window.confirm(`선택한 ${checkedRows.length}건의 프로그램을 삭제하시겠습니까?`)
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteMmsm07002Rows(targets);
      setRows((prev) => prev.filter((r) => !r.CHECK));
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    const targets = rows.filter((r) => r.CHECK || r.ISNEW);
    if (targets.length === 0) {
      setError(null);
      showWarning('저장할 대상이 없습니다.');
      return;
    }
    if (targets.some((r) => !r.PGM_ID?.trim())) {
      setError(null);
      showWarning('프로그램ID는 필수입니다.');
      return;
    }
    if (targets.some((r) => !r.PGM_NM?.trim())) {
      setError(null);
      showWarning('프로그램명은 필수입니다.');
      return;
    }

    const existingIds = new Set(
      rows
        .filter((r) => !r.ISNEW)
        .map((r) => normalizeProgramId(r.PGM_ID))
        .filter(Boolean)
    );
    const newIds = targets.filter((r) => r.ISNEW).map((r) => normalizeProgramId(r.PGM_ID));
    const duplicatedId =
      newIds.find((id) => existingIds.has(id)) ||
      newIds.find((id, index) => newIds.indexOf(id) !== index);
    if (duplicatedId) {
      setError(null);
      showWarning(`프로그램ID ${duplicatedId}는 이미 존재합니다.`);
      return;
    }

    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      await saveMmsm07002Rows(targets);
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm07002Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM07002E_programs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className={searchGridClass}>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>프로그램ID</span>
              <input
                className={searchInputClass}
                value={pgmId}
                onChange={(event) => setPgmId(event.target.value)}
              />
            </div>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>프로그램명</span>
              <input
                className={searchInputClass}
                value={pgmNm}
                onChange={(event) => setPgmNm(event.target.value)}
              />
            </div>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>사용여부</span>
              <select
                className={searchSelectClass}
                value={useYn}
                onChange={(event) => setUseYn(event.target.value)}
              >
                <option value="">전체</option>
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
            <div className="flex flex-wrap items-end justify-end gap-2">
              <button onClick={onSearch} disabled={loading} className={searchButtonClass}>
                조회
              </button>
            </div>
          </div>
        </SectionCard>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className={registerSplitGridClass}>
          <SectionCard span="full" width="full">
            <SectionHeader
              title="프로그램"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${rows.length}건`}
                </span>
              }
            />
            <div className="flex justify-end gap-2 px-4 py-3">
              <button onClick={onAdd} disabled={loading} className={panelActionClass}>
                추가
              </button>
              <button onClick={onSave} disabled={loading} className={saveButtonClass}>
                저장
              </button>
              <button onClick={onDelete} disabled={loading} className={deleteButtonClass}>
                삭제
              </button>
              <button onClick={onExportCsv} disabled={loading} className={exportCsvButtonClass}>
                엑셀
              </button>
            </div>
            <div className={gridScrollClass}>
              <DataGrid<Row>
                dataSource={rows}
                rowKey={(row, index) =>
                  row.ISNEW ? `new-${index}` : `${row.PGM_ID || 'program'}-${index}`
                }
                showBorders
                emptyText="프로그램 목록이 없습니다. 조건을 입력하고 조회하세요."
                classNames={{ table: 'min-w-[1400px] w-full text-sm' }}
                getRowProps={(_, index) => ({
                  onDoubleClick: () => markEditing(index),
                  className: 'cursor-pointer',
                })}
              >
                <Paging enabled={false} />
                <Column<Row>
                  dataField="CHECK"
                  caption="선택"
                  width={48}
                  alignment="center"
                  cellRender={(row, index) => (
                    <input
                      type="checkbox"
                      checked={!!row.CHECK}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => toggle(index, event.target.checked)}
                    />
                  )}
                />
                <Column<Row>
                  dataField="SERL"
                  caption="No."
                  width={60}
                  alignment="center"
                  cellRender={(row, index) => (
                    <span className={readOnlyCellClass}>{row.SERL ?? index + 1}</span>
                  )}
                />
                <Column<Row>
                  dataField="PGM_ID"
                  caption="프로그램ID"
                  width={150}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing)
                      return <span className={readOnlyCellClass}>{row.PGM_ID ?? ''}</span>;
                    return (
                      <input
                        className={row.ISNEW ? editableInputClass : readonlyInputClass}
                        value={row.PGM_ID ?? ''}
                        readOnly={!row.ISNEW}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { PGM_ID: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="PGM_NM"
                  caption="프로그램명"
                  width={220}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing)
                      return <span className={readOnlyCellClass}>{row.PGM_NM ?? ''}</span>;
                    return (
                      <input
                        className={`${editableInputClass} ${!row.PGM_NM ? 'border-rose-300' : ''}`}
                        value={row.PGM_NM ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { PGM_NM: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="PRJ_ID"
                  caption="프로젝트"
                  width={120}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing)
                      return <span className={readOnlyCellClass}>{row.PRJ_ID ?? ''}</span>;
                    return (
                      <input
                        className={editableInputClass}
                        value={row.PRJ_ID ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { PRJ_ID: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="DESCRIPTION"
                  caption="설명"
                  width={260}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing)
                      return <span className={readOnlyCellClass}>{row.DESCRIPTION ?? ''}</span>;
                    return (
                      <input
                        className={editableInputClass}
                        value={row.DESCRIPTION ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { DESCRIPTION: event.target.value })}
                      />
                    );
                  }}
                />
                {(
                  ['SER_AUTH', 'CLE_AUTH', 'SAV_AUTH', 'DEL_AUTH', 'PRT_AUTH', 'EXL_AUTH'] as const
                ).map((field) => (
                  <Column<Row>
                    key={field}
                    dataField={field}
                    caption={
                      {
                        SER_AUTH: '조회',
                        CLE_AUTH: '초기화',
                        SAV_AUTH: '저장',
                        DEL_AUTH: '삭제',
                        PRT_AUTH: '출력',
                        EXL_AUTH: 'EXCEL',
                      }[field]
                    }
                    width={84}
                    alignment="center"
                    cellRender={(row, index) => {
                      const isEditing = row.ISNEW || editIndex === index;
                      if (!isEditing)
                        return <span className={readOnlyCellClass}>{row[field] ?? 'N'}</span>;
                      return (
                        <select
                          className={editableSelectClass}
                          value={row[field] ?? 'N'}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => patch(index, { [field]: event.target.value })}
                        >
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      );
                    }}
                  />
                ))}
                <Column<Row>
                  dataField="USE_YN"
                  caption="사용여부"
                  width={100}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing)
                      return <span className={readOnlyCellClass}>{row.USE_YN ?? 'Y'}</span>;
                    return (
                      <select
                        className={editableSelectClass}
                        value={row.USE_YN ?? 'Y'}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { USE_YN: event.target.value })}
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
