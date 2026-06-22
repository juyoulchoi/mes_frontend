import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import { exportCsvButtonClass, saveButtonClass } from '@/lib/pageStyles';

type CrudAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type CrudActionButtonsProps = {
  addActions?: CrudAction[];
  onAdd?: () => void;
  addLabel?: string;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteDisabled?: boolean;
  onExport?: () => void;
  exportLabel?: string;
  exportDisabled?: boolean;
  disabled?: boolean;
  className?: string;
};

const addButtonClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto';

const deleteButtonClass =
  'h-10 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 sm:w-auto';

export default function CrudActionButtons({
  addActions,
  onAdd,
  addLabel = '추가',
  onSave,
  saveLabel = '저장',
  saveDisabled = false,
  onDelete,
  deleteLabel = '삭제',
  deleteDisabled = false,
  onExport,
  exportLabel = '엑셀',
  exportDisabled = false,
  disabled = false,
  className = 'grid grid-cols-2 gap-2 px-3 py-3 sm:flex sm:flex-wrap sm:justify-end sm:px-4',
}: CrudActionButtonsProps) {
  const permissions = usePagePermissions();
  const resolvedAddActions = addActions ?? (onAdd ? [{ label: addLabel, onClick: onAdd }] : []);

  return (
    <div className={className}>
      {permissions.canSave
        ? resolvedAddActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={disabled || action.disabled}
              className={addButtonClass}
            >
              {action.label}
            </button>
          ))
        : null}
      {permissions.canSave && onSave ? (
        <button onClick={onSave} disabled={disabled || saveDisabled} className={saveButtonClass}>
          {saveLabel}
        </button>
      ) : null}
      {permissions.canDelete && onDelete ? (
        <button
          onClick={onDelete}
          disabled={disabled || deleteDisabled}
          className={deleteButtonClass}
        >
          {deleteLabel}
        </button>
      ) : null}
      {permissions.canExport && onExport ? (
        <button
          onClick={onExport}
          disabled={disabled || exportDisabled}
          className={exportCsvButtonClass}
        >
          {exportLabel}
        </button>
      ) : null}
    </div>
  );
}
