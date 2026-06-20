/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Children,
  isValidElement,
  type HTMLAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
} from 'react';
import {
  BaseTable,
  tableClassNames,
  type BaseTableCheckboxColumn,
  type BaseTableClassNames,
  type TableColumn,
} from '@/components/table/BaseTable';
import { cn } from '@/lib/utils';
import type { PageResult } from '@/lib/pagination';

type DataType = 'string' | 'number' | 'date';
type DataFormat = 'currency' | ((value: unknown, row: unknown, rowIndex: number) => ReactNode);
type EditMode = 'row' | 'batch' | 'cell' | 'form' | 'popup';

type DataGridColumnProps<T> = {
  dataField: keyof T | string;
  caption?: ReactNode;
  dataType?: DataType;
  format?: DataFormat;
  width?: string | number;
  alignment?: 'left' | 'center' | 'right';
  headerAlignment?: 'left' | 'center' | 'right';
  headerClassName?: string;
  headerStyle?: CSSProperties;
  cellRender?: (row: T, rowIndex: number) => ReactNode;
};

export type GridColumn<T> = DataGridColumnProps<T>;

// 제네릭 없는 <CheckColumn /> 문법을 위해 row 타입을 느슨하게 받습니다.
type CheckColumnProps = BaseTableCheckboxColumn<any>;

type PagingProps = {
  enabled?: boolean;
  defaultPageSize?: number;
};

type PagerProps = {
  visible?: boolean;
  showPageSizeSelector?: boolean;
  allowedPageSizes?: number[];
};

type EditingProps = {
  mode?: EditMode;
  allowUpdating?: boolean;
  allowAdding?: boolean;
  allowDeleting?: boolean;
  selectTextOnEditStart?: boolean;
  startEditAction?: 'click' | 'dblClick';
};

type DataGridProps<T> = {
  dataSource?: T[];
  pageResult?: PageResult<T>;
  rowKey?: keyof T | ((row: T, rowIndex: number) => string | number);
  keyExpr?: keyof T | string;
  remoteOperations?: boolean;
  showBorders?: boolean;
  loading?: boolean;
  emptyText?: ReactNode;
  classNames?: BaseTableClassNames;
  children: ReactNode;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  getRowProps?: (row: T, rowIndex: number) => HTMLAttributes<HTMLTableRowElement>;
};

const dataGridClassNames: BaseTableClassNames = {
  ...tableClassNames,
  wrapper: 'w-full overflow-auto',
  table: 'min-w-[760px] w-full text-sm sm:min-w-[900px]',
  thead: 'sticky top-0 bg-background z-10',
  headerRow: 'border-b',
  headerCell: 'p-2 border-r border-slate-200 last:border-r-0',
  bodyRow: 'border-b hover:bg-muted/30',
  bodyCell: 'p-2',
  emptyCell: 'p-3 text-center text-muted-foreground',
  paginationBar:
    'flex flex-col gap-2 border-t px-3 py-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:px-4',
  paginationControls: 'flex flex-wrap items-center justify-between gap-2 sm:justify-end',
  paginationButton:
    'min-w-14 rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50',
  paginationSelect: 'h-8 rounded border px-2 text-sm outline-none',
};

export function Column<T>(props: DataGridColumnProps<T>) {
  void props;
  return null;
}

export function CheckColumn(props: CheckColumnProps) {
  void props;
  return null;
}

export function Paging(props: PagingProps) {
  void props;
  return null;
}

export function Pager(props: PagerProps) {
  void props;
  return null;
}

export function Editing(props: EditingProps) {
  void props;
  return null;
}

function resolveFieldValue<T>(row: T, dataField: keyof T | string) {
  return (row as Record<string, unknown>)[String(dataField)];
}

function formatCellValue<T>(
  value: unknown,
  row: T,
  rowIndex: number,
  dataType?: DataType,
  format?: DataFormat
) {
  if (format === 'currency') {
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isNaN(amount)
      ? String(value ?? '')
      : new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  }

  if (typeof format === 'function') {
    return format(value, row, rowIndex);
  }

  if (dataType === 'date') {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }

  return String(value ?? '');
}

function toTableColumn<T>(
  element: ReactElement<DataGridColumnProps<T>>,
  index: number
): TableColumn<T> {
  const {
    dataField,
    caption,
    dataType,
    format,
    width,
    alignment,
    headerAlignment,
    headerClassName,
    headerStyle,
    cellRender,
  } = element.props;
  const resolvedHeaderStyle = { textAlign: headerAlignment ?? 'center', ...(headerStyle ?? {}) };

  return {
    key: element.key ? String(element.key) : `${String(dataField)}-${index}`,
    header: caption ?? String(dataField),
    width,
    align: alignment ?? (dataType === 'number' ? 'right' : 'left'),
    headerClassName,
    headerStyle: resolvedHeaderStyle,
    accessor: cellRender
      ? undefined
      : (row, rowIndex) =>
          formatCellValue(resolveFieldValue(row, dataField), row, rowIndex, dataType, format),
    render: cellRender,
  };
}

function buildLocalPageResult<T>(rows: T[], page: number, size: number): PageResult<T> {
  const safeSize = Math.max(size, 1);
  const totalElements = rows.length;
  const totalPages = totalElements > 0 ? Math.ceil(totalElements / safeSize) : 0;
  const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;
  const start = safePage * safeSize;
  const content = rows.slice(start, start + safeSize);

  return {
    content,
    totalElements,
    totalPages,
    page: safePage,
    size: safeSize,
    first: safePage <= 0,
    last: totalPages === 0 || safePage >= totalPages - 1,
    numberOfElements: content.length,
  };
}

function resolveRowKey<T>(
  rowKey: DataGridProps<T>['rowKey'],
  keyExpr: DataGridProps<T>['keyExpr']
): DataGridProps<T>['rowKey'] {
  if (rowKey) return rowKey;
  if (!keyExpr) return undefined;
  return keyExpr as keyof T;
}

export function DataGrid<T>({
  dataSource = [],
  pageResult,
  rowKey,
  keyExpr,
  remoteOperations = false,
  showBorders = false,
  loading,
  emptyText = '데이터가 없습니다.',
  classNames = dataGridClassNames,
  children,
  onPageChange,
  onPageSizeChange,
  getRowProps,
}: DataGridProps<T>) {
  const childArray = Children.toArray(children);

  const columnElements = childArray.filter(
    (child): child is ReactElement<DataGridColumnProps<T>> =>
      isValidElement(child) && child.type === Column
  );
  const checkColumnElement = childArray.find(
    (child): child is ReactElement<CheckColumnProps> =>
      isValidElement(child) && child.type === CheckColumn
  );
  const pagingElement = childArray.find(
    (child): child is ReactElement<PagingProps> => isValidElement(child) && child.type === Paging
  );
  const pagerElement = childArray.find(
    (child): child is ReactElement<PagerProps> => isValidElement(child) && child.type === Pager
  );
  const editingElement = childArray.find(
    (child): child is ReactElement<EditingProps> => isValidElement(child) && child.type === Editing
  );

  const defaultPageSize = pagingElement?.props.defaultPageSize ?? 10;
  const pagingEnabled = pagingElement?.props.enabled ?? true;
  const allowedPageSizes = pagerElement?.props.allowedPageSizes ?? [10, 20, 50];
  const [localPage, setLocalPage] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);

  const columns = useMemo(
    () => columnElements.map((column, index) => toTableColumn(column, index)),
    [columnElements]
  );

  const localResult = useMemo(
    () => buildLocalPageResult(dataSource, localPage, localPageSize),
    [dataSource, localPage, localPageSize]
  );

  const resolvedResult = remoteOperations && pageResult ? pageResult : localResult;
  const showPager =
    pagingEnabled && (pagerElement?.props.visible ?? Boolean(pagingElement || pagerElement));
  const resolvedRowKey = resolveRowKey(rowKey, keyExpr);

  const mergedClassNames: BaseTableClassNames = {
    ...dataGridClassNames,
    ...classNames,
    wrapper: cn(dataGridClassNames.wrapper, showBorders && 'border rounded', classNames?.wrapper),
  };

  const resolvedGetRowProps = editingElement
    ? (row: T, rowIndex: number) => ({
        ...getRowProps?.(row, rowIndex),
        'data-edit-mode': editingElement.props.mode ?? 'row',
        'data-allow-updating': String(Boolean(editingElement.props.allowUpdating)),
        'data-allow-adding': String(Boolean(editingElement.props.allowAdding)),
        'data-allow-deleting': String(Boolean(editingElement.props.allowDeleting)),
        'data-start-edit-action': editingElement.props.startEditAction ?? 'click',
        'data-select-text-on-edit-start': String(
          Boolean(editingElement.props.selectTextOnEditStart)
        ),
      })
    : getRowProps;

  return (
    <BaseTable
      pageResult={pagingEnabled ? resolvedResult : undefined}
      rows={
        pagingEnabled ? undefined : remoteOperations && pageResult ? pageResult.content : dataSource
      }
      columns={columns}
      checkboxColumn={checkColumnElement?.props}
      rowKey={resolvedRowKey}
      getRowProps={resolvedGetRowProps}
      emptyText={emptyText}
      classNames={mergedClassNames}
      pagination={
        showPager
          ? {
              result: resolvedResult,
              loading,
              onPageChange: (page) => {
                if (remoteOperations && onPageChange) {
                  onPageChange(page);
                  return;
                }
                setLocalPage(page);
              },
              showPageSizeSelector: pagerElement?.props.showPageSizeSelector,
              pageSizeOptions: allowedPageSizes,
              onPageSizeChange: (size) => {
                if (remoteOperations && onPageSizeChange) {
                  onPageSizeChange(size);
                  return;
                }
                setLocalPage(0);
                setLocalPageSize(size);
              },
            }
          : undefined
      }
    />
  );
}
