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
}: CodeNameFieldProps) {
  const hasValue = Boolean(code || name);

  return (
    <div className="w-full min-w-0 max-w-[420px]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[80px_minmax(88px,104px)_minmax(0,1fr)] sm:items-center sm:gap-2">
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
