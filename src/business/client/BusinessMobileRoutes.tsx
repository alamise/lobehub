import { type RouteObject } from 'react-router';

import { dynamicElement } from '@/utils/router';

export const BusinessMobileRoutesWithMainLayout: RouteObject[] = [
  {
    element: dynamicElement(
      () => import('@/features/BusinessWaterQualityPage'),
      'Mobile > Business > Water Quality',
    ),
    path: 'decision/water-quality',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessAirQualityPage'),
      'Mobile > Business > Air Quality',
    ),
    path: 'decision/air-quality',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessStatisticsPage'),
      'Mobile > Business > Statistics',
    ),
    path: 'decision/statistics',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessMinisterInterpretationPage'),
      'Mobile > Business > Minister Interpretation',
    ),
    path: 'decision/minister-interpretation',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessArchivePage'),
      'Mobile > Business > Archive',
    ),
    path: 'enforcement/archive',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessArchiveDetailPage'),
      'Mobile > Business > Archive Detail',
    ),
    path: 'enforcement/archive/:id',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessEnterprisePage'),
      'Mobile > Business > Enterprise',
    ),
    path: 'enforcement/company',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessEnterpriseDetailPage'),
      'Mobile > Business > Enterprise Detail',
    ),
    path: 'enforcement/company/:id',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessCasePage'),
      'Mobile > Business > Case',
    ),
    path: 'enforcement/case',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessCaseDetailPage'),
      'Mobile > Business > Case Detail',
    ),
    path: 'enforcement/case/:id',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessEmergencyPage'),
      'Mobile > Business > Emergency',
    ),
    path: 'enforcement/emergency',
  },
  {
    element: dynamicElement(() => import('@/features/BusinessEiaPage'), 'Mobile > Business > EIA'),
    path: 'approval/eia',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessEiaWizardPage'),
      'Mobile > Business > EIA Wizard',
    ),
    path: 'approval/eia/new',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessEiaWizardPage'),
      'Mobile > Business > EIA Edit',
    ),
    path: 'approval/eia/:recordId/edit/:stepId',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessAIMapPage'),
      'Mobile > Business > AI Map',
    ),
    path: 'approval/map',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessMonitoringPage'),
      'Mobile > Business > Monitoring',
    ),
    path: 'monitoring',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessKnowledgeBasePage'),
      'Mobile > Business > Knowledge Base',
    ),
    path: 'office/knowledge-base',
  },
  {
    element: dynamicElement(
      () => import('@/features/BusinessDocumentFormatPage'),
      'Mobile > Business > Document Format',
    ),
    path: 'office/document-format',
  },
];
export const BusinessMobileRoutesWithSettingsLayout: RouteObject[] = [];
export const BusinessMobileRoutesWithoutMainLayout: RouteObject[] = [];
