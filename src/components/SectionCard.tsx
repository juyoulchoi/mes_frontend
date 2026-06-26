import type { ReactNode } from 'react';

type SectionCardSpan = 'full' | 'left' | 'right' | 'wideLeft' | 'wideRight' | 'custom';
type SectionCardWidth = 'auto' | 'full';
type SectionCardPadding = 'none' | 'md';

type SectionCardProps = {
  children: ReactNode;
  span?: SectionCardSpan;
  width?: SectionCardWidth;
  padding?: SectionCardPadding;
  className?: string;
};

const spanClassNames: Record<SectionCardSpan, string> = {
  full: 'col-span-12',
  left: 'col-span-12 xl:col-span-3',
  right: 'col-span-12 xl:col-span-8',
  wideLeft: 'col-span-12 xl:col-span-4',
  wideRight: 'col-span-12 xl:col-span-8',
  custom: '',
};

const widthClassNames: Record<SectionCardWidth, string> = {
  auto: '',
  full: 'w-full',
};

const paddingClassNames: Record<SectionCardPadding, string> = {
  none: '',
  md: 'p-3 sm:p-4',
};

export default function SectionCard({
  children,
  span = 'full',
  width = 'auto',
  padding = 'none',
  className = '',
}: SectionCardProps) {
  const baseClassName =
    'min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm';

  return (
    <div
      className={[
        baseClassName,
        spanClassNames[span],
        widthClassNames[width],
        paddingClassNames[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
