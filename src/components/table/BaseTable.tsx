/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { PageResult } from '@/lib/pagination';

type Align = 'left' | 'center' | 'right';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  accessor?: keyof T | ((row: T, rowIndex: number) => ReactNode);
  render?: (row: T, rowIndex: number) => ReactNode;
  align?: Align;
  width?: string | number;
  headerClassName?: string;
  cellClassName?: string | ((row: T, rowIndex: number) => string | undefined);
  headerStyle?: CSSProperties;
  cellStyle?: CSSProperties | ((row: T, rowIndex: number) => CSSProperties | undefined);
}

export interface BaseTableClassNames {
  wrapper?: string;
  table?: string;
  thead?: string;
  headerRow?: string;
  headerCell?: string;
  tbody?: string;
  bodyRow?: string | ((rowIndex: number) => string | undefined);
  bodyCell?: string;
  emptyRow?: string;
  emptyCell?: string;
  paginationBar?: string;
  paginationInfo?: string;
  paginationStatus?: string;
  paginationControls?: string;
  paginationButton?: string;
  paginationSelect?: string;
}

export const tableClassNames: BaseTableClassNames = {
  wrapper: 'w-full overflow-auto',
  table: 'min-w-[760px] w-full text-sm sm:min-w-[900px]',
  thead: 'sticky top-0 bg-gray-100 z-10',
  headerCell:
    'py-2 px-2 text-gray-700 text-xs font-semibold border-b border-r border-slate-200 last:border-r-0',
  bodyRow: 'border-b last:border-b-0 hover:bg-gray-50',
  bodyCell: 'py-2 px-2',
  emptyCell: 'py-10 text-center text-gray-400',
};

export interface TablePagination<T> {
  result: PageResult<T>;
  onPageChange: (page: number) => void;
  loading?: boolean;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export interface BaseTableCheckboxColumn<T> {
  key?: string;
  header?: ReactNode;
  width?: string | number;
  align?: Align;
  headerClassName?: string;
  cellClassName?: string | ((row: T, rowIndex: number) => string | undefined);
  headerStyle?: CSSProperties;
  cellStyle?: CSSProperties | ((row: T, rowIndex: number) => CSSProperties | undefined);
  checked: (row: T, rowIndex: number) => boolean;
  onChange: (row: T, rowIndex: number, checked: boolean) => void;
  disabled?: (row: T, rowIndex: number) => boolean;
}

export interface BaseTableProps<T> {
  rows?: T[];
  pageResult?: PageResult<T>;
  columns: TableColumn<T>[];
  checkboxColumn?: BaseTableCheckboxColumn<T>;
  rowKey?: keyof T | ((row: T, rowIndex: number) => string | number);
  getRowProps?: (row: T, rowIndex: number) => HTMLAttributes<HTMLTableRowElement>;
  emptyText?: ReactNode;
  emptyColSpan?: number;
  classNames?: BaseTableClassNames;
  pagination?: TablePagination<T>;
}

function toClassName(value?: string | null) {
  return value ?? '';
}

function resolveRowKey<T>(row: T, rowIndex: number, rowKey?: BaseTableProps<T>['rowKey']) {
  if (typeof rowKey === 'function') return rowKey(row, rowIndex);
  if (rowKey) return row[rowKey] as string | number;
  return rowIndex;
}

function resolveCellValue<T>(column: TableColumn<T>, row: T, rowIndex: number) {
  if (column.render) return column.render(row, rowIndex);
  if (typeof column.accessor === 'function') return column.accessor(row, rowIndex);
  if (column.accessor) return row[column.accessor] as ReactNode;
  return null;
}

function resolveWidthStyle(width?: string | number): CSSProperties | undefined {
  if (width === undefined) return undefined;
  return { width: typeof width === 'number' ? `${width}px` : width };
}

function TablePaginationBar<T>({
  pagination,
  classNames,
}: {
  pagination: TablePagination<T>;
  classNames?: BaseTableClassNames;
}) {
  const { result } = pagination;
  const currentPage = result.totalPages > 0 ? result.page + 1 : 0;
  const canGoPrev = !pagination.loading && result.page > 0;
  const canGoNext =
    !pagination.loading && result.totalPages > 0 && result.page < result.totalPages - 1;

  return (
    <div
      className={
        toClassName(classNames?.paginationBar) ||
        'flex flex-col gap-2 border-t px-3 py-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:px-4'
      }
    >
      <span className={toClassName(classNames?.paginationInfo) || ''}>
        총 {result.totalElements.toLocaleString()}건
      </span>
      <div
        className={
          toClassName(classNames?.paginationControls) ||
          'flex flex-wrap items-center justify-between gap-2 sm:justify-end'
        }
      >
        {pagination.showPageSizeSelector && pagination.onPageSizeChange && (
          <select
            value={String(result.size)}
            onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
            className={
              toClassName(classNames?.paginationSelect) ||
              'h-8 rounded border px-2 text-sm outline-none'
            }
          >
            {(pagination.pageSizeOptions ?? []).map((size) => (
              <option key={size} value={size}>
                {size}개씩
              </option>
            ))}
          </select>
        )}
        <span className={toClassName(classNames?.paginationStatus) || ''}>
          {result.totalPages > 0 ? `${currentPage} / ${result.totalPages} 페이지` : '0 / 0 페이지'}
        </span>
        <button
          type="button"
          onClick={() => pagination.onPageChange(result.page - 1)}
          disabled={!canGoPrev}
          className={
            toClassName(classNames?.paginationButton) ||
            'min-w-14 rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50'
          }
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => pagination.onPageChange(result.page + 1)}
          disabled={!canGoNext}
          className={
            toClassName(classNames?.paginationButton) ||
            'min-w-14 rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50'
          }
        >
          다음
        </button>
      </div>
    </div>
  );
}

export function BaseTable<T>({
  rows,
  pageResult,
  columns,
  checkboxColumn,
  rowKey,
  getRowProps,
  emptyText = '데이터가 없습니다.',
  emptyColSpan,
  classNames,
  pagination,
}: BaseTableProps<T>) {
  const resolvedRows = pageResult?.content ?? rows ?? [];
  const colSpan = emptyColSpan ?? columns.length + (checkboxColumn ? 1 : 0);

  return (
    <>
      <div className={classNames?.wrapper}>
        <table className={classNames?.table}>
          <thead className={classNames?.thead}>
            <tr className={classNames?.headerRow}>
              {checkboxColumn && (
                <th
                  key={checkboxColumn.key ?? '__checkbox__'}
                  className={`${toClassName(classNames?.headerCell)} ${toClassName(checkboxColumn.headerClassName)}`.trim()}
                  style={{
                    textAlign: checkboxColumn.align ?? 'center',
                    ...resolveWidthStyle(checkboxColumn.width ?? 48),
                    ...(checkboxColumn.headerStyle ?? {}),
                  }}
                >
                  {checkboxColumn.header ?? '선택'}
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${toClassName(classNames?.headerCell)} ${toClassName(column.headerClassName)}`.trim()}
                  style={{
                    textAlign: column.align ?? 'center',
                    ...resolveWidthStyle(column.width),
                    ...(column.headerStyle ?? {}),
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={classNames?.tbody}>
            {resolvedRows.map((row, rowIndex) => {
              const rowProps = getRowProps?.(row, rowIndex);
              const rowClassName =
                typeof classNames?.bodyRow === 'function'
                  ? classNames.bodyRow(rowIndex)
                  : classNames?.bodyRow;

              return (
                <tr
                  key={resolveRowKey(row, rowIndex, rowKey)}
                  {...rowProps}
                  className={`${toClassName(rowClassName)} ${toClassName(rowProps?.className)}`.trim()}
                >
                  {checkboxColumn && (
                    <td
                      className={`${toClassName(classNames?.bodyCell)} ${toClassName(
                        typeof checkboxColumn.cellClassName === 'function'
                          ? checkboxColumn.cellClassName(row, rowIndex)
                          : checkboxColumn.cellClassName
                      )}`.trim()}
                      style={{
                        textAlign: checkboxColumn.align ?? 'center',
                        ...(typeof checkboxColumn.cellStyle === 'function'
                          ? checkboxColumn.cellStyle(row, rowIndex)
                          : (checkboxColumn.cellStyle ?? {})),
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checkboxColumn.checked(row, rowIndex)}
                        disabled={checkboxColumn.disabled?.(row, rowIndex)}
                        onChange={(event) =>
                          checkboxColumn.onChange(row, rowIndex, event.target.checked)
                        }
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const cellClassName =
                      typeof column.cellClassName === 'function'
                        ? column.cellClassName(row, rowIndex)
                        : column.cellClassName;
                    const cellStyle =
                      typeof column.cellStyle === 'function'
                        ? column.cellStyle(row, rowIndex)
                        : column.cellStyle;

                    return (
                      <td
                        key={column.key}
                        className={`${toClassName(classNames?.bodyCell)} ${toClassName(cellClassName)}`.trim()}
                        style={{ textAlign: column.align ?? 'left', ...(cellStyle ?? {}) }}
                      >
                        {resolveCellValue(column, row, rowIndex)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {resolvedRows.length === 0 && (
              <tr className={classNames?.emptyRow}>
                <td colSpan={colSpan} className={classNames?.emptyCell}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && <TablePaginationBar pagination={pagination} classNames={classNames} />}
    </>
  );
}

export function Th({
  children,
  w,
  align = 'center',
  className,
}: {
  children: ReactNode;
  w?: string | number;
  align?: Align;
  className?: string;
}) {
  return (
    <th
      className={'py-2 px-2 text-gray-700 text-xs font-semibold border-b ' + (className ?? '')}
      style={{ width: typeof w === 'number' ? `${w}px` : w, textAlign: align }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  colSpan,
  align = 'left',
  className,
}: {
  children: ReactNode;
  colSpan?: number;
  align?: Align;
  className?: string;
}) {
  return (
    <td className={'py-2 px-2 ' + (className ?? '')} colSpan={colSpan} style={{ textAlign: align }}>
      {children}
    </td>
  );
}
