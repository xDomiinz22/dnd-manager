import { useMemo, useState } from "react";
import type { JournalTreeNode } from "@dnd-manager/shared";
import { EmptyState } from "../ui/EmptyState";
import { normalizeSearch } from "../../lib/text";

interface JournalTreeSidebarProps {
  title: string;
  nodes: JournalTreeNode[];
  selectedId: string | null;
  onSelect: (pageId: string) => void;
}

// Mantiene una sección si su título coincide, o si alguna descendiente
// coincide (en cuyo caso solo se conservan las descendientes que coinciden,
// a modo de "camino" hasta el resultado). Si la propia sección coincide, se
// conservan todas sus hijas tal cual para poder seguir navegando por ella.
function filterTree(nodes: JournalTreeNode[], query: string): JournalTreeNode[] {
  if (!query) return nodes;
  const result: JournalTreeNode[] = [];
  for (const node of nodes) {
    const selfMatch = normalizeSearch(node.title).includes(query);
    const filteredChildren = filterTree(node.children, query);
    if (selfMatch || filteredChildren.length > 0) {
      result.push({ ...node, children: selfMatch ? node.children : filteredChildren });
    }
  }
  return result;
}

export function JournalTreeSidebar({
  title,
  nodes,
  selectedId,
  onSelect,
}: JournalTreeSidebarProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query.trim());
  const filteredNodes = useMemo(() => filterTree(nodes, normalizedQuery), [nodes, normalizedQuery]);

  return (
    <div className="w-full shrink-0 rounded-sm border border-rule bg-parchment-panel p-3 sm:w-64">
      <h2 className="mb-2 truncate font-display text-sm tracking-wide text-oxblood" title={title}>
        {title}
      </h2>

      {nodes.length > 0 && (
        <div className="relative mb-2">
          <label htmlFor="journal-tree-search" className="sr-only">
            Buscar sección
          </label>
          <input
            id="journal-tree-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar sección..."
            className="w-full rounded-sm border border-rule-strong bg-parchment px-3 py-1.5 pr-7 text-sm text-ink outline-none focus:border-oxblood"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-parchment-deep/60 hover:text-ink"
            >
              ×
            </button>
          )}
        </div>
      )}

      {nodes.length === 0 ? (
        <EmptyState title="Sin páginas todavía." />
      ) : filteredNodes.length === 0 ? (
        <p className="px-1.5 py-2 text-sm text-ink-muted">Sin resultados para «{query.trim()}».</p>
      ) : (
        <ul className="space-y-0.5">
          {filteredNodes.map((node) => (
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
            className="text-ink-muted hover:text-ink"
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
