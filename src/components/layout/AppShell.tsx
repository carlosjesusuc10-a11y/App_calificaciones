import type { ReactNode } from 'react';
import { BookOpen, Calculator, CalendarRange, LayoutDashboard, Settings } from 'lucide-react';
import type { AppSection } from '../../hooks/useNavigation';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Button } from '../ui/Button';

interface AppShellProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  children: ReactNode;
}

const SECTION_TITLES: Record<AppSection, string> = {
  summary: 'Mi Control Académico',
  cycles: 'Ciclos y semestres',
  subjects: 'Materias',
  simulator: '¿Cuánto necesito?',
  settings: 'Configuración',
};

const DESKTOP_NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'summary', label: 'Resumen' },
  { id: 'cycles', label: 'Ciclos' },
  { id: 'subjects', label: 'Materias' },
  { id: 'settings', label: 'Configuración' },
];

const MOBILE_BOTTOM_TABS: Array<{
  id: AppSection;
  label: string;
  Icon: typeof LayoutDashboard;
}> = [
  { id: 'summary', label: 'Resumen', Icon: LayoutDashboard },
  { id: 'cycles', label: 'Ciclos', Icon: CalendarRange },
  { id: 'subjects', label: 'Materias', Icon: BookOpen },
  { id: 'simulator', label: 'Simulador', Icon: Calculator },
];

export function AppShell({ activeSection, onNavigate, children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      {/* Desktop Top Navigation Bar: 3-Zone Contract */}
      <header className="hidden md:block sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('summary')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 rounded"
          >
            Mi Control Académico
          </button>

          <nav aria-label="Navegación principal" className="flex items-center gap-6">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={[
                    'min-h-[44px] px-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
                    isActive
                      ? 'border-blue-700 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact />
            <Button
              variant={activeSection === 'simulator' ? 'secondary' : 'primary'}
              onClick={() => onNavigate('simulator')}
            >
              ¿Cuánto necesito?
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Sticky Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 pt-safe">
        <div className="h-12 px-4 flex items-center justify-between gap-2">
          <span className="text-base font-semibold tracking-tight text-slate-900 truncate">
            {SECTION_TITLES[activeSection]}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label="Abrir configuración"
              aria-current={activeSection === 'settings' ? 'page' : undefined}
              className={[
                'min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl transition-colors cursor-pointer',
                activeSection === 'settings'
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
              ].join(' ')}
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:py-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (Natural Thumb Zone) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-4 h-[58px]">
          {MOBILE_BOTTOM_TABS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer active:bg-slate-100/70',
                  'focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-700',
                  isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800',
                ].join(' ')}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-700"
                  />
                ) : null}
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span
                  className={[
                    'text-[11px] tracking-tight whitespace-nowrap',
                    isActive ? 'font-semibold' : 'font-medium',
                  ].join(' ')}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      <OfflineIndicator />
    </div>
  );
}
