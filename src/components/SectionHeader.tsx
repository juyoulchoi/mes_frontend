import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  right?: ReactNode;
};

export default function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {right ? (
        <div className="flex shrink-0 items-center justify-start sm:justify-end">{right}</div>
      ) : null}
    </div>
  );
}
