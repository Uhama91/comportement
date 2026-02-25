import { useWindowSize } from '../hooks/useWindowSize';

type ModuleId = 'classe' | 'individuel' | 'apprentissage' | 'registre' | 'evaluations' | 'lsu';

interface SidebarProps {
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  isTBIMode?: boolean;
}

const EXPAND_THRESHOLD = 1280;

export function Sidebar({
  activeModule,
  onModuleChange,
  onOpenSettings,
  onOpenExport,
  isTBIMode = false
}: SidebarProps) {
  const { width } = useWindowSize();

  // Masquer en mode TBI
  if (isTBIMode) {
    return null;
  }

  const isExpanded = width >= EXPAND_THRESHOLD;

  const modules: Array<{ id: ModuleId; icon: string; label: string }> = [
    { id: 'classe', icon: '👥', label: 'Classe' },
    { id: 'registre', icon: '📋', label: 'Appel' },
    { id: 'evaluations', icon: '📝', label: 'Evaluations' },
    { id: 'lsu', icon: '📄', label: 'LSU Vivant' },
    { id: 'apprentissage', icon: '📚', label: 'Apprentissages' },
    { id: 'individuel', icon: '👤', label: 'Individuel' },
  ];

  return (
    <div
      className={`
        flex-shrink-0 bg-slate-800 text-white flex flex-col
        transition-all duration-200
        ${isExpanded ? 'w-[200px]' : 'w-[64px]'}
      `}
    >
      {/* Navigation modules */}
      <nav className="flex-1 py-4">
        {modules.map((module) => {
          const isActive = activeModule === module.id;
          return (
            <button
              key={module.id}
              onClick={() => onModuleChange(module.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3
                transition-colors relative group
                ${isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }
              `}
              title={!isExpanded ? module.label : undefined}
            >
              {/* Indicateur actif */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              )}

              <span className="text-2xl flex-shrink-0">{module.icon}</span>

              {isExpanded && (
                <span className="text-sm font-medium truncate">
                  {module.label}
                </span>
              )}

              {/* Tooltip pour mode rétracté */}
              {!isExpanded && (
                <div className="
                  absolute left-full ml-2 px-2 py-1 bg-slate-900 rounded
                  text-xs whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity
                  z-50
                ">
                  {module.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="border-t border-slate-700 py-2">
        <button
          onClick={onOpenSettings}
          className="
            w-full flex items-center gap-3 px-4 py-3
            text-slate-300 hover:bg-slate-700/50 hover:text-white
            transition-colors relative group
          "
          title={!isExpanded ? 'Paramètres' : undefined}
        >
          <span className="text-xl flex-shrink-0">⚙️</span>
          {isExpanded && (
            <span className="text-sm font-medium truncate">Paramètres</span>
          )}
          {!isExpanded && (
            <div className="
              absolute left-full ml-2 px-2 py-1 bg-slate-900 rounded
              text-xs whitespace-nowrap pointer-events-none
              opacity-0 group-hover:opacity-100 transition-opacity
              z-50
            ">
              Paramètres
            </div>
          )}
        </button>

        <button
          onClick={onOpenExport}
          className="
            w-full flex items-center gap-3 px-4 py-3
            text-slate-300 hover:bg-slate-700/50 hover:text-white
            transition-colors relative group
          "
          title={!isExpanded ? 'Exporter' : undefined}
        >
          <span className="text-xl flex-shrink-0">💾</span>
          {isExpanded && (
            <span className="text-sm font-medium truncate">Exporter</span>
          )}
          {!isExpanded && (
            <div className="
              absolute left-full ml-2 px-2 py-1 bg-slate-900 rounded
              text-xs whitespace-nowrap pointer-events-none
              opacity-0 group-hover:opacity-100 transition-opacity
              z-50
            ">
              Exporter
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
