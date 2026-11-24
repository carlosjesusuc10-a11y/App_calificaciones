import { CyclesView } from './components/cycles/CyclesView';
import { DashboardView } from './components/dashboard/DashboardView';
import { AppShell } from './components/layout/AppShell';
import { SettingsView } from './components/settings/SettingsView';
import { SimulatorOverview } from './components/subjects/SimulatorOverview';
import { SubjectsView } from './components/subjects/SubjectsView';
import { Button } from './components/ui/Button';
import { useAcademicStore } from './hooks/useAcademicStore';
import { useNavigation } from './hooks/useNavigation';

export default function App() {
  const {
    activeSection,
    selectedSubjectId,
    selectedSubjectTab,
    navigateTo,
    openSubjectDetail,
    closeSubjectDetail,
  } = useNavigation('summary');
  const { storageError, clearStorageError } = useAcademicStore();

  return (
    <AppShell activeSection={activeSection} onNavigate={navigateTo}>
      {storageError ? (
        <div
          role="alert"
          className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-4"
        >
          <p className="text-sm text-red-800">{storageError}</p>
          <Button variant="ghost" onClick={clearStorageError}>
            Cerrar
          </Button>
        </div>
      ) : null}

      {activeSection === 'summary' ? (
        <DashboardView
          onOpenSemesters={() => navigateTo('cycles')}
          onOpenSettings={() => navigateTo('settings')}
          onSelectSubject={(id) => openSubjectDetail(id, 'summary')}
        />
      ) : null}

      {activeSection === 'cycles' ? (
        <CyclesView onGoToDashboard={() => navigateTo('summary')} />
      ) : null}

      {activeSection === 'subjects' ? (
        <SubjectsView
          selectedSubjectId={selectedSubjectId}
          selectedSubjectTab={selectedSubjectTab}
          onSelectSubject={(id) => openSubjectDetail(id, 'summary')}
          onCloseSubjectDetail={closeSubjectDetail}
          onOpenSemesters={() => navigateTo('cycles')}
        />
      ) : null}

      {activeSection === 'simulator' ? (
        <SimulatorOverview
          onOpenSubjectProjection={(id) => openSubjectDetail(id, 'projection')}
          onOpenSemesters={() => navigateTo('cycles')}
          onOpenSubjects={() => navigateTo('subjects')}
        />
      ) : null}

      {activeSection === 'settings' ? (
        <SettingsView onAfterDataReplaced={closeSubjectDetail} />
      ) : null}
    </AppShell>
  );
}
