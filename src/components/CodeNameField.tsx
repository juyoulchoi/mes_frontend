import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type CodeNameFieldProps = {
  label: string;
  id: string;
  code: string;
  name: string;
  onSearch: () => void;
  onClear?: () => void;
  codePlaceholder?: string;
  namePlaceholder?: string;
  searchLabel?: string;
  clearLabel?: string;
  equalInputWidths?: boolean;
  compactCodeFixedName?: boolean;
};

export default function CodeNameField({
  label,
  id,
  code,
  name,
  onSearch,
  onClear,
  codePlaceholder = '',
  namePlaceholder = '',
  searchLabel = '검색',
  clearLabel = '초기화',
  equalInputWidths = false,
  compactCodeFixedName = false,
}: CodeNameFieldProps) {
  const hasValue = Boolean(code || name);
  const fixedNameInputWidths = equalInputWidths || compactCodeFixedName;
  const wrapperClass = fixedNameInputWidths
    ? 'w-full min-w-0 max-w-[446px]'
    : 'w-full min-w-0 max-w-[446px]';
  const gridClass = compactCodeFixedName
    ? 'grid grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(88px,104px)_minmax(130px,150px)] sm:items-center sm:gap-3'
    : equalInputWidths
      ? 'grid grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)_minmax(130px,150px)] sm:items-center sm:gap-3'
      : 'grid grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(88px,104px)_minmax(0,1fr)] sm:items-center sm:gap-2';

  return (
    <div className={wrapperClass}>
      <div className={gridClass}>
        <Label className="text-sm text-gray-600 sm:whitespace-nowrap">{label}</Label>
        <Input
          id={`${id}-code`}
          value={code}
          readOnly
          placeholder={codePlaceholder}
          className="h-9 w-full rounded-lg bg-gray-100 px-2"
        />
        <div className="grid min-w-0 gap-2 sm:relative sm:block">
          <Input
            id={`${id}-name`}
            value={name}
            readOnly
            placeholder={namePlaceholder}
            className="h-9 w-full rounded-lg bg-gray-100 px-3 sm:pr-24"
          />
          <div className="grid grid-cols-2 gap-2 sm:absolute sm:right-1 sm:top-1.5 sm:flex sm:items-center sm:gap-1">
            {onClear && hasValue ? (
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50 sm:py-0.5"
                onClick={onClear}
              >
                {clearLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-sm hover:bg-gray-50 sm:py-0.5"
              onClick={onSearch}
            >
              {searchLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
