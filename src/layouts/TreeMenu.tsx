import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UINode } from '@/lib/menuInfo';

type TreeMenuProps = {
  nodes?: UINode[];
  onOpen?: (node: UINode) => void;
  masked?: string;
};

type TreeItemProps = {
  node: UINode;
  onOpen?: (node: UINode) => void;
  masked?: string;
};

const getBaseName = (p?: string) => (p || '').replace(/^.*\//, '').replace(/\.ts$/i, '');

function TreeItem({ node, onOpen, masked }: TreeItemProps) {
  const [open, setOpen] = useState(!!node.defaultExpanded);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isActive = !hasChildren && masked && node.path ? getBaseName(node.path) === masked : false;

  const handleClick = () => {
    if (hasChildren) {
      setOpen((prev) => !prev);
      return;
    }
    if (node.path) onOpen?.(node);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer',
          !hasChildren && 'pl-6',
          isActive ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-muted'
        )}
        onClick={handleClick}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )
        ) : (
          <span className="inline-block w-4" />
        )}
        <span>{String(node.menunm)}</span>
      </div>

      {hasChildren && open && (
        <div className="ml-4 border-l pl-2">
          {node.children.map((child) => (
            <TreeItem key={child.menuid} node={child} onOpen={onOpen} masked={masked} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeMenu({ nodes, onOpen, masked }: TreeMenuProps) {
  const list = Array.isArray(nodes) ? nodes : [];
  return (
    <div className="text-sm">
      {list.map((node) => (
        <TreeItem key={node.menuid} node={node} onOpen={onOpen} masked={masked} />
      ))}
    </div>
  );
}
