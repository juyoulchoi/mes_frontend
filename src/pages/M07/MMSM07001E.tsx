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
  editableSelectClass,
  pageContentClass,
  pageShellClass,
  registerSplitGridClass,
  searchButtonClass,
  systemWideSearchGridClass,
} from '@/lib/pageStyles';
import {
  buildMmsm07001Csv,
  createNewMmsm07001Row,
  deleteMmsm07001Rows,
  fetchMmsm07001Rows,
  normalizeUserId,
  saveMmsm07001Rows,
  type Row,
} from '@/services/m07/mmsm07001';

// 사용자 관리 (MMSM07001E)
// MMSM06007E와 동일한 단일 그리드 패턴: 조회/추가/저장/삭제/엑셀
// 필터: 사용자 이름, 사용자그룹, 부서, 사용여부

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const searchSelectClass = `${searchInputClass} bg-white`;
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';
const panelScrollClass = 'min-h-0 flex-1 overflow-auto';

function showWarning(message: string) {
  window.alert(message);
}

export default function MMSM07001E() {
  const permissions = usePagePermissions();

  const [usrNm, setUsrNm] = useState('');
  const [usrGrpCd, setUsrGrpCd] = useState('');
  const [deptCd, setDeptCd] = useState('');
  const [useYn, setUseYn] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMmsm07001Rows({ usrNm, usrGrpCd, deptCd, useYn });
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
      return [...prev, createNewMmsm07001Row(prev.length)];
    });
    setError(null);
  }

  async function onDelete() {
    const checkedRows = rows.filter((r) => r.CHECK);
    const targets = checkedRows
      .filter((r) => !r.ISNEW)
      .map((r) => normalizeUserId(r.USR_ID))
      .filter(Boolean);

    if (checkedRows.length === 0) {
      setError(null);
      showWarning('삭제할 사용자를 선택하세요.');
      return;
    }

    if (
      targets.length > 0 &&
      !window.confirm(`선택한 ${checkedRows.length}건의 사용자를 삭제하시겠습니까?`)
    ) {
      return;
    }

    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await deleteMmsm07001Rows(targets);
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
    if (targets.some((r) => !r.USR_ID?.trim())) {
      setError(null);
      showWarning('사용자 ID는 필수입니다.');
      return;
    }
    if (targets.some((r) => !r.USR_NM?.trim())) {
      setError(null);
      showWarning('사용자 이름은 필수입니다.');
      return;
    }
    if (targets.some((r) => !r.DEPT_CD?.trim())) {
      setError(null);
      showWarning('부서코드는 필수입니다.');
      return;
    }

    const existingIds = new Set(
      rows
        .filter((r) => !r.ISNEW)
        .map((r) => normalizeUserId(r.USR_ID))
        .filter(Boolean)
    );
    const newIds = targets.filter((r) => r.ISNEW).map((r) => normalizeUserId(r.USR_ID));
    const duplicatedExistingId = newIds.find((id) => existingIds.has(id));
    const duplicatedNewId = newIds.find((id, index) => newIds.indexOf(id) !== index);

    if (duplicatedExistingId || duplicatedNewId) {
      const duplicatedId = duplicatedExistingId || duplicatedNewId;
      setError(null);
      showWarning(`사용자 ID ${duplicatedId}는 이미 존재합니다.`);
      return;
    }

    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      await saveMmsm07001Rows(targets);
      await onSearch();
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm07001Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM07001E_users.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`${pageShellClass} h-full`}>
      <div className={`${pageContentClass} h-full overflow-hidden`}>
        <SectionCard span="full" padding="md">
          <div className="overflow-x-auto pb-1">
            <div className={systemWideSearchGridClass}>
              <div className={searchFieldClass}>
                <span className={searchLabelTextClass}>사용자 이름</span>
                <input
                  className={searchInputClass}
                  value={usrNm}
                  onChange={(event) => setUsrNm(event.target.value)}
                />
              </div>
              <div className={`${searchFieldClass} col-start-2 row-start-1`}>
                <span className={searchLabelTextClass}>사용자그룹</span>
                <input
                  className={searchInputClass}
                  value={usrGrpCd}
                  onChange={(event) => setUsrGrpCd(event.target.value)}
                />
              </div>
              <div
                className={`${searchFieldClass} col-start-1 row-start-2 xl:col-start-3 xl:row-start-1`}
              >
                <span className={searchLabelTextClass}>부서</span>
                <input
                  className={searchInputClass}
                  value={deptCd}
                  onChange={(event) => setDeptCd(event.target.value)}
                />
              </div>
              <div
                className={`${searchFieldClass} col-start-2 row-start-2 xl:col-start-4 xl:row-start-1`}
              >
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
              <div className="col-start-4 row-start-1 flex flex-wrap items-end justify-end gap-2 xl:col-start-6">
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

        <div className={`${registerSplitGridClass} min-h-0 flex-1`}>
          <SectionCard span="full" width="full" className="flex min-h-0 flex-col">
            <SectionHeader
              title="사용자"
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
            <div className={panelScrollClass}>
              <DataGrid<Row>
                dataSource={rows}
                rowKey={(row, index) =>
                  row.ISNEW ? `new-${index}` : `${row.USR_ID || 'user'}-${index}`
                }
                showBorders
                emptyText="사용자 목록이 없습니다. 조건을 입력하고 조회하세요."
                classNames={{
                  table: 'min-w-[1320px] w-full text-sm',
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
                  dataField="SERL"
                  caption="No."
                  width={60}
                  alignment="center"
                  cellRender={(row, index) => (
                    <span className={readOnlyCellClass}>{row.SERL ?? index + 1}</span>
                  )}
                />
                <Column<Row>
                  dataField="USR_ID"
                  caption="사용자 ID"
                  width={150}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.USR_ID ?? ''}</span>;
                    }

                    return (
                      <input
                        className={row.ISNEW ? editableInputClass : readonlyInputClass}
                        value={row.USR_ID ?? ''}
                        readOnly={!row.ISNEW}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { USR_ID: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="USR_NM"
                  caption="사용자 이름"
                  width={180}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.USR_NM ?? ''}</span>;
                    }

                    return (
                      <input
                        className={`${editableInputClass} ${!row.USR_NM ? 'border-rose-300' : ''}`}
                        value={row.USR_NM ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { USR_NM: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="PWD"
                  caption="패스워드"
                  width={170}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.PWD ? '********' : ''}</span>;
                    }

                    return (
                      <input
                        type="password"
                        className={editableInputClass}
                        value={row.PWD ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { PWD: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="DEPT_CD"
                  caption="부서코드"
                  width={130}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.DEPT_CD ?? ''}</span>;
                    }

                    return (
                      <input
                        className={`${editableInputClass} ${!row.DEPT_CD ? 'border-rose-300' : ''}`}
                        value={row.DEPT_CD ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { DEPT_CD: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="DEPT_NM"
                  caption="부서명"
                  width={160}
                  cellRender={(row) => (
                    <span className={readOnlyCellClass}>{row.DEPT_NM || row.DEPT_CD || ''}</span>
                  )}
                />
                <Column<Row>
                  dataField="USR_GRP_CD"
                  caption="사용자그룹"
                  width={150}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.USR_GRP_CD ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.USR_GRP_CD ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { USR_GRP_CD: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="PHONE"
                  caption="전화번호"
                  width={150}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.PHONE ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.PHONE ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { PHONE: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="EMAIL"
                  caption="이메일"
                  width={210}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.EMAIL ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.EMAIL ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { EMAIL: event.target.value })}
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
