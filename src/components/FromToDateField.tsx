type FromToDateFieldProps = {
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export default function FromToDateField({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: FromToDateFieldProps) {
  const hasRange = Boolean(fromValue && toValue);
  const isRangeInvalid = hasRange && fromValue > toValue;
  const inputBaseClass = 'h-9 w-full rounded-lg border px-2';
  const inputErrorClass = isRangeInvalid ? 'border-red-500 bg-red-50' : '';

  return (
    <div className="w-full min-w-0 max-w-[446px]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)_30px_minmax(130px,150px)] sm:items-center sm:gap-3">
        <label className="text-sm text-gray-600 sm:whitespace-nowrap">{label}</label>
        <input
          type="date"
          value={fromValue}
          max={toValue || undefined}
          onChange={(e) => onFromChange(e.target.value)}
          className={`${inputBaseClass} ${inputErrorClass}`}
        />
        <div className="hidden text-center text-sm text-gray-600 sm:block">~</div>
        <input
          type="date"
          value={toValue}
          min={fromValue || undefined}
          onChange={(e) => onToChange(e.target.value)}
          className={`${inputBaseClass} ${inputErrorClass}`}
        />
      </div>

      {isRangeInvalid && (
        <p className="mt-1 text-xs text-red-600">시작일은 종료일보다 클 수 없습니다.</p>
      )}
    </div>
  );
}
