import { useState } from "react";
import type { JournalTreeNode } from "@dnd-manager/shared";
import { EmptyState } from "../ui/EmptyState";

interface JournalTreeSidebarProps {
  title: string;
  nodes: JournalTreeNode[];
  selectedId: string | null;
  onSelect: (pageId: string) => void;
}

export function JournalTreeSidebar({
  title,
  nodes,
  selectedId,
  onSelect,
}: JournalTreeSidebarProps) {
  return (
    <div className="w-full shrink-0 rounded-sm border border-rule bg-parchment-panel p-3 sm:w-64">
      <h2 className="mb-2 truncate font-display text-sm tracking-wide text-oxblood" title={title}>
        {title}
      </h2>
      {nodes.length === 0 ? (
        <EmptyState title="Sin páginas todavía." />
      ) : (
        <ul className="space-y-0.5">
          {nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: JournalTreeNode;
  selectedId: string | null;
  onSelect: (pageId: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded-sm px-1.5 py-1 text-sm ${
          isSelected ? "bg-parchment-deep text-oxblood" : "text-ink hover:bg-parchment-deep/60"
        }`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-ink-muted hover:text-oxblood"
            aria-label={open ? "Colapsar" : "Expandir"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex-1 truncate text-left"
        >
          {node.title}
        </button>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
