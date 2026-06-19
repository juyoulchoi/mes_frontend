import ExportCsvButton, { type ExportCsvButtonProps } from '@/components/ExportCsvButton';
import { usePagePermissions } from '@/lib/hooks/usePagePermissions';
import {
  cancelButtonClass,
  exportCsvButtonClass,
  saveButtonClass,
  searchButtonClass,
  statusActionGroupClass,
} from '@/lib/pageStyles';

type CsvProps<T> = Pick<ExportCsvButtonProps<T>, 'rows' | 'headers' | 'mapRow' | 'filename'>;

type StatusActionButtonsProps<T> = {
  loading?: boolean;
  disabled?: boolean;
  onSearch: () => void;
  exportProps: CsvProps<T>;
  onCancel?: () => void;
  canceling?: boolean;
  cancelLabel?: string;
  cancelingLabel?: string;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
};

export default function StatusActionButtons<T>({
  loading = false,
  disabled = false,
  onSearch,
  exportProps,
  onCancel,
  canceling = false,
  cancelLabel = '취소',
  cancelingLabel = '취소중...',
  onSave,
  saving = false,
  saveLabel = '저장',
  savingLabel = '저장중...',
}: StatusActionButtonsProps<T>) {
  const busy = disabled || loading || canceling || saving;
  const permissions = usePagePermissions();

  return (
    <div className={statusActionGroupClass}>
      {permissions.canSearch ? (
        <button onClick={onSearch} className={searchButtonClass} disabled={busy}>
          {loading ? '조회중...' : '조회'}
        </button>
      ) : null}

      {onCancel && permissions.canDelete ? (
        <button onClick={onCancel} className={cancelButtonClass} disabled={busy}>
          {canceling ? cancelingLabel : cancelLabel}
        </button>
      ) : null}

      {onSave && permissions.canSave ? (
        <button onClick={onSave} className={saveButtonClass} disabled={busy}>
          {saving ? savingLabel : saveLabel}
        </button>
      ) : null}

      {permissions.canExport ? (
        <ExportCsvButton
          rows={exportProps.rows}
          headers={exportProps.headers}
          mapRow={exportProps.mapRow}
          filename={exportProps.filename}
          variant="outline"
          className={exportCsvButtonClass}
        />
      ) : null}
    </div>
  );
}
