import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Primitive = string | number;
type SearchMode = 'contains' | 'startswith' | 'endswith';
type LabelMode = 'static' | 'floating' | 'hidden' | 'outside';
type Expr<T, R> = keyof T | string | ((item: T) => R);

type BaseProps<T> = {
  dataSource?: T[];
  value?: Primitive | null | undefined;
  defaultValue?: Primitive | null | undefined;
  onValueChange?: (value: Primitive, item?: T) => void;
  valueExpr?: Expr<T, Primitive>;
  displayExpr?: Expr<T, React.ReactNode>;
  groupExpr?: Expr<T, React.ReactNode>;
  searchEnabled?: boolean;
  searchMode?: SearchMode;
  searchPlaceholder?: string;
  label?: React.ReactNode;
  labelMode?: LabelMode;
  grouped?: boolean;
  placeholder?: string;
  noDataText?: React.ReactNode;
  dropdownClassName?: string;
  triggerClassName?: string;
  name?: string;
  disabled?: boolean;
  showAllOption?: boolean;
  allOptionLabel?: React.ReactNode;
  allOptionValue?: Primitive;
};

export type SelectBoxProps<T extends Record<string, unknown>> = BaseProps<T> &
  Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'>;

type Group<T> = {
  key: string;
  label: React.ReactNode;
  items: NormalizedOption<T>[];
};

type NormalizedOption<T> = {
  key: string;
  item?: T;
  value: Primitive;
  label: React.ReactNode;
  group?: React.ReactNode;
  searchText: string;
};

function getByExpr<T, R>(item: T, expr: Expr<T, R> | undefined, fallback?: R): R | undefined {
  if (!expr) return fallback;
  if (typeof expr === 'function') return expr(item);
  return (item as Record<string, unknown>)[String(expr)] as R;
}

function normalizeText(value: React.ReactNode): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).toLowerCase();
  return '';
}

function matchesSearch(text: string, query: string, mode: SearchMode): boolean {
  if (!query) return true;
  if (mode === 'startswith') return text.startsWith(query);
  if (mode === 'endswith') return text.endsWith(query);
  return text.includes(query);
}

function useControllableValue<T extends Primitive>(
  controlledValue: T | null | undefined,
  defaultValue: T | null | undefined
) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<T | null | undefined>(
    defaultValue
  );
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = React.useCallback(
    (nextValue: T) => {
      if (!isControlled) setUncontrolledValue(nextValue);
    },
    [isControlled]
  );

  return [value, setValue] as const;
}

function SelectBoxInner<T extends Record<string, unknown>>(
  {
    className = 'w-full',
    dataSource = [],
    value,
    defaultValue,
    onValueChange,
    valueExpr = 'value' as Expr<T, Primitive>,
    displayExpr = 'label' as Expr<T, React.ReactNode>,
    groupExpr = 'group' as Expr<T, React.ReactNode>,
    searchEnabled = false,
    searchMode = 'contains',
    searchPlaceholder = 'Search',
    label,
    labelMode = 'outside',
    grouped = false,
    placeholder = 'Select',
    noDataText = 'No data',
    dropdownClassName,
    triggerClassName = 'h-9 w-full rounded-lg',
    name,
    disabled = false,
    showAllOption = false,
    allOptionLabel = '전체',
    allOptionValue = '',
    id,
    ...props
  }: SelectBoxProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const generatedId = React.useId();
  const selectId = id ?? generatedId;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const deferredSearchText = React.useDeferredValue(searchText.trim().toLowerCase());
  const [selectedValue, setSelectedValue] = useControllableValue<Primitive>(value, defaultValue);

  React.useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, []);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  React.useEffect(() => {
    if (open && searchEnabled) {
      searchInputRef.current?.focus();
    }
  }, [open, searchEnabled]);

  const allOption = React.useMemo<NormalizedOption<T> | null>(() => {
    if (!showAllOption) return null;
    return {
      key: '__all__',
      value: allOptionValue,
      label: allOptionLabel,
      searchText: normalizeText(allOptionLabel),
    };
  }, [allOptionLabel, allOptionValue, showAllOption]);

  const normalizedOptions = React.useMemo<NormalizedOption<T>[]>(() => {
    return dataSource.map((item, index) => {
      const itemValue = getByExpr(item, valueExpr);
      const itemLabel = getByExpr(item, displayExpr, '') ?? '';
      const itemGroup = getByExpr(item, groupExpr);
      return {
        key: `${String(itemValue)}_${index}`,
        item,
        value: itemValue ?? index,
        label: itemLabel,
        group: itemGroup,
        searchText: normalizeText(itemLabel),
      };
    });
  }, [dataSource, displayExpr, groupExpr, valueExpr]);

  const filteredOptions = React.useMemo(() => {
    return normalizedOptions.filter((option) =>
      matchesSearch(option.searchText, deferredSearchText, searchMode)
    );
  }, [deferredSearchText, normalizedOptions, searchMode]);

  const groupedOptions = React.useMemo(() => {
    if (!grouped) return [] as Group<T>[];

    const groups = new Map<string, Group<T>>();
    filteredOptions.forEach((option) => {
      const groupLabel = option.group ?? 'Ungrouped';
      const key = String(groupLabel);
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(option);
        return;
      }
      groups.set(key, {
        key,
        label: groupLabel,
        items: [option],
      });
    });

    return Array.from(groups.values());
  }, [filteredOptions, grouped]);

  const selectedOption = React.useMemo(() => {
    if (allOption && selectedValue === allOption.value) return allOption;
    return normalizedOptions.find((option) => option.value === selectedValue) ?? null;
  }, [allOption, normalizedOptions, selectedValue]);

  const showFloatingLabel =
    labelMode === 'floating' && (open || Boolean(selectedOption) || searchText.length > 0);

  const selectOption = (option: NormalizedOption<T>) => {
    setSelectedValue(option.value);
    onValueChange?.(option.value, option.item);
    setOpen(false);
    setSearchText('');
  };

  const renderOption = (option: NormalizedOption<T>) => {
    const selected = option.value === selectedValue;

    return (
      <button
        key={option.key}
        type="button"
        className={cn(
          'flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
          selected && 'bg-accent text-accent-foreground'
        )}
        onClick={() => selectOption(option)}
      >
        {option.label}
      </button>
    );
  };

  const hasVisibleOptions = Boolean(allOption) || filteredOptions.length > 0;

  return (
    <div className={cn('relative w-full', className)} ref={rootRef} {...props}>
      {labelMode === 'outside' && label ? (
        <Label htmlFor={selectId} className="mb-2 text-sm text-gray-600">
          {label}
        </Label>
      ) : null}

      <div className="relative">
        {labelMode === 'static' && label ? (
          <Label
            htmlFor={selectId}
            className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 bg-white px-1 text-xs text-gray-600"
          >
            {label}
          </Label>
        ) : null}

        {labelMode === 'floating' && label ? (
          <Label
            htmlFor={selectId}
            className={cn(
              'pointer-events-none absolute left-3 z-10 bg-white px-1 text-sm text-gray-500 transition-all',
              showFloatingLabel
                ? 'top-0 -translate-y-1/2 text-xs text-gray-600'
                : 'top-1/2 -translate-y-1/2'
            )}
          >
            {label}
          </Label>
        ) : null}

        <button
          id={selectId}
          type="button"
          disabled={disabled}
          className={cn(
            'border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow]',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            (labelMode === 'static' || labelMode === 'floating') && 'pt-2',
            triggerClassName
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {name ? <input type="hidden" name={name} value={selectedValue ?? ''} /> : null}

        {open ? (
          <div
            className={cn(
              'absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-white py-1 shadow-lg',
              dropdownClassName
            )}
          >
            {searchEnabled ? (
              <div className="sticky top-0 border-b bg-white p-2">
                <input
                  ref={searchInputRef}
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="border-input h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
              </div>
            ) : null}

            {allOption ? renderOption(allOption) : null}

            {grouped
              ? groupedOptions.map((group) => (
                  <div key={group.key} className="py-1">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </div>
                    {group.items.map((option) => renderOption(option))}
                  </div>
                ))
              : filteredOptions.map((option) => renderOption(option))}

            {!hasVisibleOptions ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {noDataText}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ForwardedSelectBox = React.forwardRef(SelectBoxInner) as <T extends Record<string, unknown>>(
  props: SelectBoxProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

const SelectBox = ForwardedSelectBox;

export { SelectBox };
