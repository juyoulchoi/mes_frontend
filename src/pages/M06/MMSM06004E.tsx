import { useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CrudActionButtons from '@/components/CrudActionButtons';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Paging } from '@/components/table/DataGrid';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  basicInfoInlineSearchGridClass,
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
  buildMmsm06004Csv,
  createNewMmsm06004Row,
  deleteMmsm06004Rows,
  fetchMmsm06004Rows,
  saveMmsm06004Rows,
  type Row,
} from '@/services/m06/mmsm06004';

const searchLabelClass = 'font-medium text-slate-700';
const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';
const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;
const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';
const searchUseYnSelectClass = 'h-10 w-[120px] rounded-lg border border-slate-200 px-3 text-sm';
const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;
const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';
const custGbOptions = [
  { value: 'CUSTOMER', label: '고객' },
  { value: 'SUPPLIER', label: '공급처' },
];

export default function MMSM06004E() {
  const permissions = usePagePermissions();

  const [cstNm, setCstNm] = useState('');
  const [useYn, setUseYn] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedCstCd, setSelectedCstCd] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRows() {
    return fetchMmsm06004Rows({ cstNm, useYn });
  }

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const nextRows = await fetchRows();
      const nextCstCd =
        nextRows.find((row) => row.CST_CD && row.CST_CD === selectedCstCd)?.CST_CD ||
        nextRows.find((row) => row.CST_CD)?.CST_CD ||
        '';

      setRows(nextRows);
      setSelectedCstCd(nextCstCd);
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onSelectRow(index: number) {
    const row = rows[index];
    if (!row) return;

    if (editIndex !== null && editIndex !== index && !rows[editIndex]?.ISNEW) {
      setEditIndex(null);
    }

    setSelectedCstCd(row.CST_CD || '');
    setError(null);
  }

  function toggle(index: number, checked: boolean) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], CHECK: checked };
      return next;
    });
  }

  function markEditing(index: number) {
    const shouldClose = editIndex === index && !rows[index]?.ISNEW;
    setRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], CHECK: !shouldClose };
      return next;
    });
    setEditIndex((prev) => {
      if (prev === index && !rows[index]?.ISNEW) return null;
      return index;
    });
  }

  function patch(index: number, patchValue: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patchValue, CHECK: true };
      return next;
    });
  }

  function onAdd() {
    setRows((prev) => {
      setEditIndex(prev.length);
      return [...prev, createNewMmsm06004Row(prev.length)];
    });
    setSelectedCstCd('');
    setError(null);
  }

  async function onDelete() {
    const checkedRows = rows.filter((row) => row.CHECK);
    const targets = checkedRows
      .filter((row) => !row.ISNEW)
      .map((row) => row.CST_CD)
      .filter(Boolean) as string[];

    if (checkedRows.length === 0) {
      setError('삭제할 거래처를 선택하세요.');
      return;
    }

    if (targets.length > 0 && !window.confirm('선택한 거래처를 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await deleteMmsm06004Rows(targets);

      const nextRows = targets.length > 0 ? await fetchRows() : rows.filter((row) => !row.CHECK);
      const deletedSelected = checkedRows.some((row) => row.CST_CD === selectedCstCd);
      const nextCstCd = deletedSelected
        ? nextRows.find((row) => row.CST_CD)?.CST_CD || ''
        : selectedCstCd;

      setRows(nextRows);
      setSelectedCstCd(nextCstCd);
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    const targets = rows.filter((row) => row.CHECK || row.ISNEW);

    if (targets.length === 0) {
      setError('저장할 거래처를 선택하세요.');
      return;
    }

    if (targets.some((row) => !row.CST_NM?.trim())) {
      setError('거래처명은 필수입니다.');
      return;
    }

    if (!window.confirm('거래처 정보를 저장하시겠습니까?')) return;

    setLoading(true);
    setError(null);

    try {
      await saveMmsm06004Rows(targets);

      const nextSelectedCstCd =
        targets.find((row) => row.CST_CD)?.CST_CD ||
        selectedCstCd ||
        rows.find((row) => row.CST_CD)?.CST_CD ||
        '';
      const nextRows = await fetchRows();
      const resolvedCstCd =
        nextRows.find((row) => row.CST_CD === nextSelectedCstCd)?.CST_CD ||
        nextRows.find((row) => row.CST_CD)?.CST_CD ||
        '';

      setRows(nextRows);
      setSelectedCstCd(resolvedCstCd);
      setEditIndex(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const csv = buildMmsm06004Csv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM06004E.csv';
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
            <div className={basicInfoInlineSearchGridClass}>
              <div className={searchFieldClass}>
                <span className={searchLabelTextClass}>거래처명</span>
                <input
                  className={searchInputClass}
                  value={cstNm}
                  onChange={(event) => setCstNm(event.target.value)}
                />
              </div>
              <div className={`${searchFieldClass} col-start-2 row-start-1`}>
                <span className={searchLabelTextClass}>사용여부</span>
                <select
                  className={searchUseYnSelectClass}
                  value={useYn}
                  onChange={(event) => setUseYn(event.target.value)}
                >
                  <option value="">전체</option>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
              <div className="col-start-4 row-start-1 flex flex-wrap items-end justify-end gap-2">
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
              title="거래처"
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
                rowKey={(row, index) => (row.ISNEW ? `new-${index}` : `${row.CST_CD}-${index}`)}
                showBorders
                emptyText="거래처 목록이 없습니다. 조건을 입력하고 조회하세요."
                classNames={{
                  table: 'min-w-[960px] w-full text-sm',
                }}
                getRowProps={(row, index) => ({
                  onClick: () => onSelectRow(index),
                  onDoubleClick: () => markEditing(index),
                  className: `cursor-pointer ${
                    row.CST_CD && row.CST_CD === selectedCstCd ? 'bg-sky-50' : ''
                  }`,
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
                  cellRender={(row) => <span className={readOnlyCellClass}>{row.SERL ?? ''}</span>}
                />
                <Column<Row>
                  dataField="CST_CD"
                  caption="거래처코드"
                  width={120}
                  alignment="center"
                  cellRender={(row) => (
                    <input
                      className={readonlyInputClass}
                      value={row.CST_CD ?? ''}
                      readOnly
                      onClick={(event) => event.stopPropagation()}
                    />
                  )}
                />
                <Column<Row>
                  dataField="CST_NM"
                  caption="거래처명"
                  width={180}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.CST_NM ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.CST_NM ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { CST_NM: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="CST_GB"
                  caption="거래처구분"
                  width={120}
                  alignment="center"
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    const value = row.CST_GB || 'CUSTOMER';
                    if (!isEditing) {
                      return (
                        <span className={readOnlyCellClass}>
                          {custGbOptions.find((option) => option.value === value)?.label || value}
                        </span>
                      );
                    }

                    return (
                      <select
                        className={editableSelectClass}
                        value={value}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { CST_GB: event.target.value })}
                      >
                        {custGbOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    );
                  }}
                />
                <Column<Row>
                  dataField="CEO_NM"
                  caption="대표자명"
                  width={120}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.CEO_NM ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.CEO_NM ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { CEO_NM: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="MGR_NM"
                  caption="담당자명"
                  width={120}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.MGR_NM ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.MGR_NM ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { MGR_NM: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="MGR_TEL"
                  caption="담당자연락처"
                  width={140}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.MGR_TEL ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.MGR_TEL ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { MGR_TEL: event.target.value })}
                      />
                    );
                  }}
                />
                <Column<Row>
                  dataField="TEL_NO"
                  caption="전화번호"
                  width={140}
                  cellRender={(row, index) => {
                    const isEditing = row.ISNEW || editIndex === index;
                    if (!isEditing) {
                      return <span className={readOnlyCellClass}>{row.TEL_NO ?? ''}</span>;
                    }

                    return (
                      <input
                        className={editableInputClass}
                        value={row.TEL_NO ?? ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => patch(index, { TEL_NO: event.target.value })}
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
