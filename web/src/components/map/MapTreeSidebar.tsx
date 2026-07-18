import { useMemo, useState } from "react";
import type { MapSummary } from "@dnd-manager/shared";

interface MapTreeSidebarProps {
  maps: MapSummary[];
  selectedMapId: string | null;
  onSelect: (mapId: string) => void;
  isMaster: boolean;
  onAddMap: () => void;
}

const SIN_SECCION = "__sin_seccion__";

function groupByContinent(maps: MapSummary[]): Map<string, MapSummary[]> {
  const groups = new Map<string, MapSummary[]>();
  for (const map of maps) {
    const key = map.continent ?? SIN_SECCION;
    const list = groups.get(key) ?? [];
    list.push(map);
    groups.set(key, list);
  }
  return groups;
}

export function MapTreeSidebar({
  maps,
  selectedMapId,
  onSelect,
  isMaster,
  onAddMap,
}: MapTreeSidebarProps) {
  const world = maps.find((m) => m.isWorld) ?? null;
  const sections = useMemo(() => {
    const grouped = groupByContinent(maps.filter((m) => !m.isWorld));
    const continents = [...grouped.keys()].filter((k) => k !== SIN_SECCION).sort();
    if (grouped.has(SIN_SECCION)) continents.push(SIN_SECCION);
    return continents.map((key) => ({
      key,
      label: key === SIN_SECCION ? "Sin sección" : key,
      maps: [...(grouped.get(key) ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }, [maps]);

  return (
    <div className="w-full shrink-0 rounded-sm border border-rule bg-parchment-panel p-3 sm:w-48">
      <h2 className="mb-2 font-display text-sm tracking-wide text-oxblood">Mapas</h2>

      {world && (
        <button
          type="button"
          onClick={() => onSelect(world.id)}
          className={`mb-1 flex w-full items-center gap-1.5 truncate rounded-sm px-1.5 py-1 text-left text-sm ${
            world.id === selectedMapId
              ? "bg-parchment-deep text-oxblood"
              : "text-ink hover:bg-parchment-deep/60"
          }`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          {world.title}
        </button>
      )}

      <ul className="space-y-0.5">
        {sections.map((section) => (
          <ContinentSection
            key={section.key}
            label={section.label}
            maps={section.maps}
            selectedMapId={selectedMapId}
            onSelect={onSelect}
          />
        ))}
      </ul>

      {isMaster && (
        <button
          type="button"
          onClick={onAddMap}
          className="mt-2 w-full rounded-sm border-t border-rule px-1.5 pt-2 text-left text-xs text-oxblood hover:text-oxblood-dark"
        >
          + Añadir mapa
        </button>
      )}
    </div>
  );
}

function ContinentSection({
  label,
  maps,
  selectedMapId,
  onSelect,
}: {
  label: string;
  maps: MapSummary[];
  selectedMapId: string | null;
  onSelect: (mapId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <div className="flex items-center gap-1 px-1.5 py-1 text-sm font-semibold text-ink-muted">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-gold hover:text-oxblood"
          aria-label={open ? "Colapsar" : "Expandir"}
        >
          {open ? "▾" : "▸"}
        </button>
        <span className="truncate">{label}</span>
      </div>
      {open && (
        <ul className="ml-2 border-l border-rule pl-2">
          {maps.map((map) => (
            <li key={map.id}>
              <button
                type="button"
                onClick={() => onSelect(map.id)}
                className={`w-full truncate rounded-sm px-1.5 py-1 text-left text-sm ${
                  map.id === selectedMapId
                    ? "bg-parchment-deep text-oxblood"
                    : "text-ink hover:bg-parchment-deep/60"
                }`}
              >
                {map.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
