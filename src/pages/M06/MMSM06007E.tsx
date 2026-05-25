import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { http } from '@/lib/http';
import {
  countBadgeClass,
  editableInputClass,
  editableNumberInputClass,
  editableSelectClass,
  exportCsvButtonClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSearchGridClass,
  registerSplitGridClass,
  saveButtonClass,
  searchButtonClass,
} from '@/lib/pageStyles';

// 작업장 관리 (MMSM06007E)
// 단일 그리드: 조회/추가/저장/삭제/엑셀
// 필터: 작업장명(line_nm)

type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  DSP_SEQ?: string | number;
  LINE_CD?: string;
  LINE_NM?: string;
  DESCRIPTION?: string;
  USE_YN?: string; // 'Y' | 'N'
  [k: string]: unknown;
};

type LineInfoResponse = {
  lineCd?: string;
  lineNm?: string;
  dspSeq?: number;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE' | string;
};

type LineInfoRequest = {
  method?: string;
  lineCd: string;
  lineNm?: string;
  dspSeq?: number | null;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const panelActionClass =
  'h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';
const deleteButtonClass =
  'h-9 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50';
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function toNumberOrNull(value: string | number | undefined) {
  if (value === undefined || value === '') return null;
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
}

function mapLineInfoRow(row: LineInfoResponse, index: number): Row {
  return {
    CHECK: false,
    ISNEW: false,
    DSP_SEQ: row.dspSeq ?? index + 1,
    LINE_CD: row.lineCd ?? '',
    LINE_NM: row.lineNm ?? '',
    DESCRIPTION: row.description ?? '',
    USE_YN: row.status === 'INACTIVE' ? 'N' : 'Y',
  };
}

export default function MMSM06007E() {
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
      const data = await http<LineInfoResponse[]>(`/api/v1/mdm/line`);
      const keyword = lineNm.trim();
      const list = (Array.isArray(data) ? data : [])
        .filter((row) => !keyword || (row.lineNm ?? '').includes(keyword))
        .map(mapLineInfoRow);

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
      return [
        ...prev,
        {
          CHECK: true,
          ISNEW: true,
          DSP_SEQ: prev.length + 1,
          LINE_CD: '',
          LINE_NM: '',
          DESCRIPTION: '',
          USE_YN: 'Y',
        },
      ];
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
      setError('삭제할 작업장을 선택하세요.');
      return;
    }

    if (targets.length > 0 && !window.confirm(`선택한 ${checkedRows.length}건의 작업장을 삭제하시겠습니까?`)) {
      return;
    }

    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await Promise.all(
          targets.map((lineCd) =>
            http(`/api/v1/mdm/line`, {
              method: 'POST',
              body: { method: 'D', lineCd },
            })
          )
        );
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
      setError('저장할 대상이 없습니다.');
      return;
    }
    if (targets.some((r) => !r.LINE_CD?.trim())) {
      setError('작업장코드는 필수입니다.');
      return;
    }
    if (targets.some((r) => !r.LINE_NM?.trim())) {
      setError('작업장명은 필수입니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all(
        targets.map((r) => {
          const payload: LineInfoRequest = {
            method: r.ISNEW ? 'I' : 'U',
            lineCd: r.LINE_CD?.trim() ?? '',
            lineNm: r.LINE_NM?.trim() ?? '',
            dspSeq: toNumberOrNull(r.DSP_SEQ),
            description: r.DESCRIPTION ?? '',
            status: r.USE_YN === 'N' ? 'INACTIVE' : 'ACTIVE',
          };

          return http(`/api/v1/mdm/line`, { method: 'POST', body: payload });
        })
      );
      await onSearch();
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = ['표시순서', '작업장코드', '작업장명', '설명', '사용여부'];
    const lines = rows.map((r) =>
      [r.DSP_SEQ ?? '', r.LINE_CD ?? '', r.LINE_NM ?? '', r.DESCRIPTION ?? '', r.USE_YN ?? '']
        .map((v) => (v ?? '').toString().replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
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
              title="작업장"
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
