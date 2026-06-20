type DateEditProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
};

export default function DateEdit({ label, value, onChange, min, max }: DateEditProps) {
  const inputBaseClass = 'h-9 w-full rounded-lg border px-2';

  return (
    <div className="w-full min-w-0 max-w-[450px]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center">
        <label className="text-sm text-gray-600 sm:whitespace-nowrap">{label}</label>
        <input
          type="date"
          className={`${inputBaseClass}`}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    </div>
  );
}
