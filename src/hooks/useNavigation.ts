import { useCallback, useState } from 'react';
import type { SubjectDetailTab } from '../components/subjects/SubjectDetailView';
import type { EntityId } from '../types/academic';

export type AppSection =
  | 'summary'
  | 'cycles'
  | 'subjects'
  | 'simulator'
  | 'settings';

export interface NavigationController {
  activeSection: AppSection;
  selectedSubjectId: EntityId | null;
  selectedSubjectTab: SubjectDetailTab;
  navigateTo: (section: AppSection) => void;
  openSubjectDetail: (subjectId: EntityId, initialTab?: SubjectDetailTab) => void;
  closeSubjectDetail: () => void;
}

export function useNavigation(initialSection: AppSection = 'summary'): NavigationController {
  const [activeSection, setActiveSection] = useState<AppSection>(initialSection);
  const [selectedSubjectId, setSelectedSubjectId] = useState<EntityId | null>(null);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<SubjectDetailTab>('summary');

  const navigateTo = useCallback((section: AppSection) => {
    setActiveSection(section);
    if (section !== 'subjects') {
      setSelectedSubjectId(null);
      setSelectedSubjectTab('summary');
    }
  }, []);

  const openSubjectDetail = useCallback(
    (subjectId: EntityId, initialTab: SubjectDetailTab = 'summary') => {
      setSelectedSubjectId(subjectId);
      setSelectedSubjectTab(initialTab);
      setActiveSection('subjects');
    },
    [],
  );

  const closeSubjectDetail = useCallback(() => {
    setSelectedSubjectId(null);
    setSelectedSubjectTab('summary');
  }, []);

  return {
    activeSection,
    selectedSubjectId,
    selectedSubjectTab,
    navigateTo,
    openSubjectDetail,
    closeSubjectDetail,
  };
}
