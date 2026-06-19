import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
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
  buildMmsm06007Csv,
  createNewMmsm06007Row,
  deleteMmsm06007Rows,
  fetchMmsm06007Rows,
  normalizeLineCode,
  onlyDigits,
  saveMmsm06007Rows,
  type Row,
} from '@/services/m06/mmsm06007';

// 작업장 관리 (MMSM06007E)
// 단일 그리드: 조회/추가/저장/삭제/엑셀
// 필터: 작업장명(line_nm)

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

function showWarning(message: string) {
  window.alert(message);
}

export default function MMSM06007E() {
  const permissions = usePagePermissions();

  // Filters
  const [lineNm, setLineNm] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMmsm06007Rows(lineNm);
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
    setEditIndex((prev) => {
      if (prev === i && !rows[i]?.ISNEW) return null;
      return i;
    });
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
      return [...prev, createNewMmsm06007Row(prev.length)];
    });
    setError(null);
  }

  async function onDelete() {
    const checkedRows = rows.filter((r) => r.CHECK);
    const targets = rows
      .filter((r) => r.CHECK && !r.ISNEW)
      .map((r) => r.LINE_CD)
      .filter(Boolean) as string[];

    if (checkedRows.length === 0) {
      setError(null);
      showWarning('삭제할 작업장을 선택하세요.');
      return;
    }

    if (
      targets.length > 0 &&
      !window.confirm(`선택한 ${checkedRows.length}건의 작업장을 삭제하시겠습니까?`)
    ) {
      return;
    }

    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await deleteMmsm06007Rows(targets);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    setRows((prev) => prev.filter((r) => !r.CHECK));
    setEditIndex(null);
  }

  async function onSave() {
    const targets = rows.filter((r) => r.CHECK || r.ISNEW);
    if (targets.length === 0) {
      setError(null);
      showWarning('저장할 대상이 없습니다.');
      return;
    }
    if (targets.some((r) => !r.LINE_CD?.trim())) {
      setError(null);
      showWarning('작업장코드는 필수입니다.');
      return;
    }
    if (targets.some((r) => !r.LINE_NM?.trim())) {
      setError(null);
      showWarning('작업장명은 필수입니다.');
      return;
    }

    const existingCodes = new Set(
      rows
        .filter((r) => !r.ISNEW)
        .map((r) => normalizeLineCode(r.LINE_CD))
        .filter(Boolean)
    );
    const newCodes = targets.filter((r) => r.ISNEW).map((r) => normalizeLineCode(r.LINE_CD));
    const duplicatedExistingCode = newCodes.find((code) => existingCodes.has(code));
    const duplicatedNewCode = newCodes.find((code, index) => newCodes.indexOf(code) !== index);

    if (duplicatedExistingCode || duplicatedNewCode) {
      const duplicatedCode = duplicatedExistingCode || duplicatedNewCode;
      setError(null);
      showWarning(`작업장코드 ${duplicatedCode}는 이미 존재합니다.`);
      return;
    }

    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      await saveMmsm06007Rows(targets);
      await onSearch();
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm06007Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM06007E.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={pageShellClass}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className={registerSearchGridClass}>
            <div className={searchFieldClass}>
              <span className={searchLabelTextClass}>작업장명</span>
              <input
                className={searchInputClass}
                value={lineNm}
                onChange={(event) => setLineNm(event.target.value)}
              />
            </div>
            <div />
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
          <SectionCard span="full" width="full">
            <SectionHeader
              title="작업장"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${rows.length}건`}
                </span>
              }
            />
            <CrudActionButtons
              onAdd={onAdd}
              onSave={onSave}
              onDelete={onDelete}
              onExport={onExportCsv}
              disabled={loading}
            />
            <div className={gridScrollClass}>
              <DataGrid<Row>
                dataSource={rows}
                rowKey={(row, index) =>
                  row.ISNEW ? `new-${index}` : `${row.LINE_CD || 'line'}-${index}`
                }
                showBorders
                emptyText="작업장 목록이 없습니다. 조건을 입력하고 조회하세요."
                classNames={{
                  table: 'min-w-[920px] w-full text-sm',
                }}
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
                  dataField="DSP_SEQ"
                  caption="표시순서"
                  width={90}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.DSP_SEQ ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableNumberInputClass}
                        inputMode="numeric"
                        value={row.DSP_SEQ ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          patch(index, { DSP_SEQ: onlyDigits(event.target.value) })
                        }
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="LINE_CD"
                  caption="작업장코드"
                  width={140}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.LINE_CD ?? ''}</span>;
                    }

                    return (
                      <input
                        className={row.ISNEW ? editableInputClass : readonlyInputClass}
                        value={row.LINE_CD ?? ''}
                        readOnly={!row.ISNEW}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { LINE_CD: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="LINE_NM"
                  caption="작업장명"
                  width={240}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.LINE_NM ?? ''}</span>;
                    }

                    return (
                      <input
                        className={`${editableInputClass} ${!row.LINE_NM ? 'border-rose-300' : ''}`}
                        value={row.LINE_NM ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { LINE_NM: event.target.value })}
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
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.DESCRIPTION ?? ''}</span>;
                    }

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
                <Column<Row>
                  dataField="USE_YN"
                  caption="사용여부"
                  width={100}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.USE_YN ?? 'Y'}</span>;
                    }

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
