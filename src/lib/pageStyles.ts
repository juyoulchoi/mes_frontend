export const pageShellClass = 'min-h-full min-w-0 overflow-hidden bg-slate-50/60 p-2 sm:p-3 lg:p-4';

export const pageContentClass = 'mx-auto flex min-w-0 w-full flex-col gap-3 lg:gap-4';

export type ResponsiveSearchLayoutMode = 'compact' | 'twoRow' | 'wide';

export const responsiveSearchGridClass =
  'grid min-w-[892px] grid-cols-[minmax(0,1fr)_max-content] items-start gap-2 xl:gap-x-[30px]';

export const responsiveSearchFieldGridClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact:
    'col-start-1 row-start-1 grid min-w-[892px] grid-cols-[repeat(2,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
  twoRow:
    'col-start-1 row-start-1 grid min-w-[892px] grid-cols-[repeat(2,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
  wide: 'col-start-1 row-start-1 grid min-w-[1338px] grid-cols-[repeat(3,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
};

export const responsiveSearchDateFieldClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact: 'col-start-1 row-start-1 min-w-0',
  twoRow: 'col-start-1 row-start-1 min-w-0',
  wide: 'col-start-1 row-start-1 min-w-0',
};

export const responsiveSearchCustomerFieldClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact: 'col-start-1 row-start-2 min-w-0',
  twoRow: 'col-start-2 row-start-1 min-w-0',
  wide: 'col-start-2 row-start-1 min-w-0',
};

export const responsiveSearchItemFieldClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact: 'col-start-2 row-start-2 min-w-0',
  twoRow: 'col-start-1 row-start-2 min-w-0',
  wide: 'col-start-3 row-start-1 min-w-0',
};

export const responsiveSearchInlineInputFieldClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact:
    'col-start-2 row-start-2 grid w-full min-w-0 max-w-[446px] grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center sm:gap-2',
  twoRow:
    'col-start-1 row-start-2 grid w-full min-w-0 max-w-[446px] grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center sm:gap-2',
  wide: 'col-start-3 row-start-1 grid w-full min-w-0 max-w-[446px] grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(130px,150px)] sm:items-center sm:gap-2',
};

export const responsiveSearchInlineInputClass =
  'h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400';

export const responsiveSearchActionsClass = 'col-start-2 row-start-1 flex min-w-max justify-end';

export const responsiveSearchTwoRowMinWidth = 1280;

export const responsiveSearchWideMinWidth = 1640;

export function getResponsiveSearchLayoutMode(width: number): ResponsiveSearchLayoutMode {
  if (width >= responsiveSearchWideMinWidth) {
    return 'wide';
  }

  if (width >= responsiveSearchTwoRowMinWidth) {
    return 'twoRow';
  }

  return 'compact';
}

export const planningResponsiveSearchGridClass =
  'grid min-w-[1032px] grid-cols-[minmax(0,1fr)_max-content] items-start gap-2 xl:gap-x-[30px]';

export const planningResponsiveSearchFieldGridClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact:
    'col-start-1 row-start-1 grid min-w-[1032px] grid-cols-[586px_minmax(446px,1fr)] items-end gap-2 xl:gap-x-[30px]',
  twoRow:
    'col-start-1 row-start-1 grid min-w-[1032px] grid-cols-[586px_minmax(446px,1fr)] items-end gap-2 xl:gap-x-[30px]',
  wide: 'col-start-1 row-start-1 grid min-w-[1478px] grid-cols-[586px_repeat(2,minmax(446px,1fr))] items-end gap-2 xl:gap-x-[30px]',
};

export const planningResponsiveSearchDateFieldClass = responsiveSearchDateFieldClass;

export const planningResponsiveSearchCustomerFieldClass = responsiveSearchCustomerFieldClass;

export const planningResponsiveSearchItemFieldClass = responsiveSearchItemFieldClass;

export const planningResponsiveSearchExtraFieldClass: Record<ResponsiveSearchLayoutMode, string> = {
  compact: 'col-span-2 col-start-1 row-start-3 flex flex-wrap items-end gap-2',
  twoRow: 'col-start-2 row-start-2 flex flex-wrap items-end gap-2',
  wide: 'col-span-2 col-start-1 row-start-2 flex flex-wrap items-end gap-2',
};

export const planningResponsiveSearchActionsClass = responsiveSearchActionsClass;

export const planningResponsiveSearchTwoRowMinWidth = 1360;

export const planningResponsiveSearchWideMinWidth = 1720;

export function getPlanningResponsiveSearchLayoutMode(width: number): ResponsiveSearchLayoutMode {
  if (width >= planningResponsiveSearchWideMinWidth) {
    return 'wide';
  }

  if (width >= planningResponsiveSearchTwoRowMinWidth) {
    return 'twoRow';
  }

  return 'compact';
}

export const responsiveStaticSearchGridClass =
  'grid min-w-[446px] grid-cols-[minmax(0,1fr)_max-content] items-start gap-2 xl:gap-x-[30px]';

export const responsiveStaticSearchFieldsClass =
  'col-start-1 row-start-1 grid min-w-[892px] grid-cols-[repeat(2,minmax(446px,1fr))] items-end gap-2 2xl:min-w-0 2xl:grid-cols-[repeat(3,minmax(446px,1fr))] xl:gap-x-[30px]';

export const responsiveStaticSearchDateFieldClass = 'col-start-1 row-start-1 min-w-0';

export const responsiveStaticSearchCustomerFieldClass =
  'col-start-1 row-start-2 min-w-0 2xl:col-start-2 2xl:row-start-1';

export const responsiveStaticSearchItemFieldClass =
  'col-start-2 row-start-2 min-w-0 2xl:col-start-3 2xl:row-start-1';

export const responsiveStaticSearchActionsClass = responsiveSearchActionsClass;

export const registerSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(320px,420px)_1fr_minmax(300px,360px)] items-end gap-2';

export const materialRegisterSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(320px,420px)_1fr_minmax(300px,360px)] items-end gap-2';

export const statusSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(320px,446px)_1fr_minmax(300px,360px)] items-end gap-2';

export const materialStatusSearchGridClass =
  'grid min-w-[1240px] grid-cols-[minmax(300px,420px)_minmax(260px,360px)_minmax(260px,360px)_minmax(16px,1fr)_minmax(260px,300px)] items-end gap-2';

export const basicInfoSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(300px,446px)_minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] xl:gap-x-[30px]';

export const basicInfoInlineSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(260px,300px)_minmax(260px,300px)_minmax(16px,1fr)_minmax(120px,220px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(300px,446px)_minmax(300px,446px)_minmax(16px,1fr)_minmax(300px,420px)] xl:gap-x-[30px]';

export const systemInlineSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(260px,300px)_minmax(260px,300px)_minmax(16px,1fr)_minmax(120px,220px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(300px,360px)_minmax(300px,360px)_minmax(260px,320px)_minmax(16px,1fr)_minmax(220px,320px)] xl:gap-x-[30px]';

export const systemWideSearchGridClass =
  'grid min-w-[920px] grid-cols-[minmax(260px,300px)_minmax(260px,300px)_minmax(16px,1fr)_minmax(120px,220px)] items-end gap-2 xl:min-w-[1240px] xl:grid-cols-[minmax(240px,300px)_minmax(240px,300px)_minmax(240px,300px)_minmax(180px,220px)_minmax(16px,1fr)_minmax(180px,260px)] xl:gap-x-[24px]';

export const registerSplitGridClass = 'grid min-w-0 grid-cols-12 gap-4';

export const transferColumnClass = 'col-span-12 flex items-center justify-center xl:col-span-1';

export const transferButtonGroupClass =
  'flex w-full flex-row gap-2 xl:w-[64px] xl:min-w-[64px] xl:flex-col';

export const addTransferButtonClass =
  'min-h-10 flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50';

export const deleteTransferButtonClass =
  'min-h-10 flex-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50';

export const gridScrollClass = 'min-w-0 max-w-full overflow-auto max-h-[60vh] lg:max-h-[68vh]';

export const countBadgeClass =
  'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600';

export const editableInputClass = 'h-8 w-full rounded border border-slate-200 px-2';

export const editableNumberInputClass = `${editableInputClass} text-right`;

export const editableSelectClass =
  'h-8 w-full rounded border border-slate-200 bg-white px-2 text-center';

export const searchLabelClass = 'font-medium text-slate-700';

export const searchFieldClass = 'flex flex-col gap-2 sm:flex-row sm:items-center';

export const searchLabelTextClass = `${searchLabelClass} flex h-10 w-[96px] shrink-0 items-center text-sm`;

export const searchInputClass = 'h-10 w-full rounded-lg border border-slate-200 px-3 text-sm';

export const searchSelectClass = `${searchInputClass} bg-white`;

export const searchControlClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm';

export const readonlyInputClass = `${editableInputClass} bg-slate-100 text-slate-500`;

export const readOnlyCellClass = 'block min-h-8 px-2 py-1.5 text-sm text-slate-700';

export const panelScrollClass = 'min-h-0 flex-1 overflow-auto';

export const exportCsvButtonClass =
  'h-10 w-auto min-w-20 justify-self-end rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100 disabled:opacity-50 sm:px-4';

export const statusActionGroupClass =
  'flex w-full flex-wrap content-end items-end justify-end gap-2 self-end';

export const searchButtonClass =
  'h-10 w-auto min-w-20 justify-self-end rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 sm:px-4';

export const cancelButtonClass =
  'h-10 w-auto min-w-20 justify-self-end rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 sm:px-4';

export const saveButtonClass =
  'h-10 w-auto min-w-20 justify-self-end rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50 sm:px-4';
