import { useState } from "react";
import type { JournalTreeNode } from "@dnd-manager/shared";

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
    <div className="w-64 shrink-0 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <h2 className="mb-2 truncate text-sm font-semibold text-amber-400" title={title}>
        {title}
      </h2>
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
        {nodes.length === 0 && <li className="text-sm text-slate-500">Sin páginas todavía.</li>}
      </ul>
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
        className={`flex items-center gap-1 rounded px-1.5 py-1 text-sm ${
          isSelected ? "bg-slate-800 text-amber-400" : "text-slate-300 hover:bg-slate-800/60"
        }`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-slate-500 hover:text-slate-300"
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
