import { useEffect, useMemo, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import {
  countBadgeClass,
  editableInputClass,
  editableNumberInputClass,
  exportCsvButtonClass,
  gridScrollClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  saveButtonClass,
  searchButtonClass,
} from '@/lib/pageStyles';
import {
  buildMmsm07003Csv,
  createChildMenuRow,
  createSameLevelMenuRow,
  deleteMmsm07003Row,
  fetchMmsm07003Rows,
  normalizeId,
  onlyDigits,
  saveMmsm07003Rows,
  type MenuRow,
} from '@/services/m07/mmsm07003';

// 프로그램 메뉴 관리 (MMSM07003E)
// MMSM06007E 패턴 기반: 좌측 목록 선택 + 우측 상세 편집

const searchGridClass = 'grid grid-cols-1 gap-3 md:grid-cols-[360px_1fr]';
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

function showWarning(message: string) {
  window.alert(message);
}

export default function MMSM07003E() {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return rows;
    return rows.filter(
      (row) =>
        (row.MENU_ID ?? '').toLowerCase().includes(key) ||
        (row.MENU_NM ?? '').toLowerCase().includes(key) ||
        (row.PGM_ID ?? '').toLowerCase().includes(key)
    );
  }, [keyword, rows]);

  const selected = selectedIndex === null ? null : (rows[selectedIndex] ?? null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMmsm07003Rows();
      setRows(list);
      setSelectedIndex(list.length ? 0 : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function patchSelected(patch: Partial<MenuRow>) {
    if (selectedIndex === null) return;
    setRows((prev) => {
      const next = [...prev];
      next[selectedIndex] = { ...next[selectedIndex], ...patch, CHECK: true };
      return next;
    });
  }

  function onAddSame() {
    const current = selected;
    setRows((prev) => {
      const nextIndex = prev.length;
      setSelectedIndex(nextIndex);
      return [...prev, createSameLevelMenuRow(current)];
    });
    setError(null);
  }

  function onAddChild() {
    const current = selected;
    if (!current?.MENU_ID) {
      setError(null);
      showWarning('좌측에서 기준 메뉴를 선택하세요.');
      return;
    }

    setRows((prev) => {
      const nextIndex = prev.length;
      setSelectedIndex(nextIndex);
      return [...prev, createChildMenuRow(current)];
    });
    setError(null);
  }

  async function onDelete() {
    if (!selected) {
      setError(null);
      showWarning('삭제할 메뉴를 선택하세요.');
      return;
    }
    if (!window.confirm('삭제 하시겠습니까?')) return;

    setLoading(true);
    setError(null);
    try {
      await deleteMmsm07003Row(selected);
      setRows((prev) => prev.filter((_, index) => index !== selectedIndex));
      setSelectedIndex(null);
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    const targets = rows.filter((row) => row.CHECK || row.ISNEW);
    if (targets.length === 0) {
      setError(null);
      showWarning('저장할 대상이 없습니다.');
      return;
    }
    if (targets.some((row) => !row.MENU_ID?.trim())) {
      setError(null);
      showWarning('메뉴ID는 필수입니다.');
      return;
    }
    if (targets.some((row) => !row.MENU_NM?.trim())) {
      setError(null);
      showWarning('메뉴명은 필수입니다.');
      return;
    }

    const existingIds = new Set(
      rows
        .filter((row) => !row.ISNEW)
        .map((row) => normalizeId(row.MENU_ID))
        .filter(Boolean)
    );
    const newIds = targets.filter((row) => row.ISNEW).map((row) => normalizeId(row.MENU_ID));
    const duplicatedId =
      newIds.find((id) => existingIds.has(id)) ||
      newIds.find((id, index) => newIds.indexOf(id) !== index);
    if (duplicatedId) {
      setError(null);
      showWarning(`메뉴ID ${duplicatedId}는 이미 존재합니다.`);
      return;
    }

    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      await saveMmsm07003Rows(targets);
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm07003Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM07003E_menu.csv';
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
              <span className={searchLabelTextClass}>메뉴/프로그램</span>
              <input
                className={searchInputClass}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
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
          <SectionCard span="wideLeft" width="full">
            <SectionHeader
              title="메뉴"
              right={
                <span className={countBadgeClass}>
                  {loading ? '조회중...' : `${filteredRows.length}건`}
                </span>
              }
            />
            <div className="flex justify-end gap-2 px-4 py-3">
              <button onClick={onAddSame} disabled={loading} className={panelActionClass}>
                동일행추가
              </button>
              <button onClick={onAddChild} disabled={loading} className={panelActionClass}>
                하위행추가
              </button>
            </div>
            <div className={gridScrollClass}>
              <DataGrid<MenuRow>
                dataSource={filteredRows}
                rowKey={(row, index) => `${row.MENU_ID || 'menu'}-${index}`}
                showBorders
                emptyText="메뉴 목록이 없습니다."
                classNames={{ table: 'min-w-[520px] w-full text-sm' }}
                getRowProps={(row) => {
                  const realIndex = rows.indexOf(row);
                  return {
                    onClick: () => setSelectedIndex(realIndex),
                    className:
                      selectedIndex === realIndex
                        ? 'cursor-pointer bg-slate-100'
                        : 'cursor-pointer',
                  };
                }}
              >
                <Paging enabled={false} />
                <Column<MenuRow>
                  dataField="MENU_ID"
                  caption="메뉴ID"
                  width={150}
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.MENU_ID ?? ''}</span>
                  )}
                />
                <Column<MenuRow>
                  dataField="MENU_NM"
                  caption="메뉴명"
                  width={220}
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.MENU_NM ?? ''}</span>
                  )}
                />
                <Column<MenuRow>
                  dataField="DSP_SEQ"
                  caption="순서"
                  width={80}
                  alignment="center"
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.DSP_SEQ ?? ''}</span>
                  )}
                />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="wideRight" width="full">
            <SectionHeader
              title="메뉴 상세"
              right={
                selected ? (
                  <span className={countBadgeClass}>{selected.ISNEW ? '신규' : '편집'}</span>
                ) : null
              }
            />
            <div className="flex justify-end gap-2 px-4 py-3">
              <button onClick={onSave} disabled={loading} className={saveButtonClass}>
                저장
              </button>
              <button
                onClick={onDelete}
                disabled={loading || !selected}
                className={deleteButtonClass}
              >
                삭제
              </button>
              <button onClick={onExportCsv} disabled={loading} className={exportCsvButtonClass}>
                엑셀
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 px-4 pb-4 text-sm md:grid-cols-2">
              {!selected ? (
                <div className="col-span-full rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500">
                  좌측에서 메뉴를 선택하세요.
                </div>
              ) : (
                <>
                  <label className="flex flex-col gap-2">
                    <span className={searchLabelClass}>메뉴ID</span>
                    <input
                      className={selected.ISNEW ? editableInputClass : readonlyInputClass}
                      value={selected.MENU_ID ?? ''}
                      readOnly={!selected.ISNEW}
                      onChange={(event) => patchSelected({ MENU_ID: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={searchLabelClass}>상위메뉴</span>
                    <input
                      className={editableInputClass}
                      value={selected.TOP_MENU ?? ''}
                      onChange={(event) => patchSelected({ TOP_MENU: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={searchLabelClass}>메뉴명</span>
                    <input
                      className={`${editableInputClass} ${!selected.MENU_NM ? 'border-rose-300' : ''}`}
                      value={selected.MENU_NM ?? ''}
                      onChange={(event) => patchSelected({ MENU_NM: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={searchLabelClass}>메뉴레벨</span>
                    <input
                      className={editableNumberInputClass}
                      inputMode="numeric"
                      value={selected.LVL ?? ''}
                      onChange={(event) => patchSelected({ LVL: onlyDigits(event.target.value) })}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={searchLabelClass}>순서</span>
                    <input
                      className={editableNumberInputClass}
                      inputMode="numeric"
                      value={selected.DSP_SEQ ?? ''}
                      onChange={(event) =>
                        patchSelected({ DSP_SEQ: onlyDigits(event.target.value) })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={searchLabelClass}>프로그램ID</span>
                    <input
                      className={editableInputClass}
                      value={selected.PGM_ID ?? ''}
                      onChange={(event) => patchSelected({ PGM_ID: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className={searchLabelClass}>프로그램명</span>
                    <input className={readonlyInputClass} value={selected.PGM_NM ?? ''} readOnly />
                  </label>
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
