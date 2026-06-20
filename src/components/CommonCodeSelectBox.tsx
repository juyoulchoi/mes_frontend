import * as React from 'react';

import { SelectBox, type SelectBoxProps } from '@/components/ui/selectbox';
import { fetchCommonCodes, type CommonCodeItem } from '@/services/common/commonCode';

type CommonCodeSelectBoxProps = Omit<
  SelectBoxProps<CommonCodeItem>,
  'dataSource' | 'valueExpr' | 'displayExpr' | 'groupExpr'
> & {
  codeGroup?: string;
  apiPath?: string;
  extraParams?: Record<string, string>;
  fallbackItems?: CommonCodeItem[];
  autoLoad?: boolean;
};

const EMPTY_ITEMS: CommonCodeItem[] = [];

function CommonCodeSelectBox({
  codeGroup,
  apiPath,
  extraParams,
  fallbackItems,
  autoLoad = true,
  noDataText = '공통코드 데이터가 없습니다.',
  label,
  className,
  ...props
}: CommonCodeSelectBoxProps) {
  const resolvedFallbackItems = fallbackItems ?? EMPTY_ITEMS;
  const extraParamsKey = React.useMemo(() => JSON.stringify(extraParams ?? {}), [extraParams]);

  const [items, setItems] = React.useState<CommonCodeItem[]>(resolvedFallbackItems);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!autoLoad) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const rows = await fetchCommonCodes({
          apiPath,
          groupCode: codeGroup,
          extraParams,
        });

        if (!cancelled) {
          setItems(rows.length > 0 ? rows : resolvedFallbackItems);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setItems(resolvedFallbackItems);
          setLoaded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [apiPath, autoLoad, codeGroup, extraParamsKey, resolvedFallbackItems]);

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[100px_minmax(0,1fr)] sm:items-center">
      {label ? <div className="text-sm text-gray-600">{label}</div> : null}
      <SelectBox
        dataSource={items}
        valueExpr="code"
        displayExpr="name"
        groupExpr="groupCode"
        searchEnabled
        {...props}
        className={className ?? 'w-full'}
        labelMode="hidden"
        disabled={props.disabled || loading}
        noDataText={loaded ? noDataText : '불러오는 중...'}
      />
    </div>
  );
}

export default CommonCodeSelectBox;
export { CommonCodeSelectBox };
