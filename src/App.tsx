// ============================================================
// APP — Root Composition Layer
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CatalogProvider, useCatalog } from './app/CatalogContext';
import { BlueprintProvider } from './blueprints/context';
import { GovernanceProvider } from './governance/context';
import { AIGovernanceProvider } from './ai-governance/context';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogPage } from './pages/CatalogPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { SourcesPage } from './pages/SourcesPage';
import { LineagePage } from './pages/LineagePage';
import { QualityPage } from './pages/QualityPage';
import { EvidencePage } from './pages/EvidencePage';
import { AuditPage } from './pages/AuditPage';
import { SolutionsPage } from './pages/SolutionsPage';
import { GovernanceDashboardPage } from './pages/GovernanceDashboardPage';
import { GovernancePoliciesPage } from './pages/governance/PoliciesPage';
import { GovernanceControlsPage } from './pages/governance/ControlsPage';
import { GovernanceAssessmentsPage } from './pages/governance/AssessmentsPage';
import { GovernanceReviewsPage } from './pages/governance/ReviewsPage';
import { GovernanceAuditorViewPage } from './pages/governance/AuditorViewPage';
import { GovernanceTimelinePage } from './pages/governance/TimelinePage';
import { ComplianceExportPage } from './pages/governance/ComplianceExportPage';
import { AIGovernanceDashboardPage } from './pages/ai-governance/DashboardPage';
import { AIGovernanceTrainingDataPage } from './pages/ai-governance/TrainingDataPage';
import { AIGovernanceRAGResourcesPage } from './pages/ai-governance/RAGResourcesPage';
import { AIGovernanceDriftPage } from './pages/ai-governance/DriftPage';
import { AIGovernanceUseCasesPage } from './pages/ai-governance/UseCasesPage';
import { AIGovernanceModelsPage } from './pages/ai-governance/ModelsPage';
import { AIGovernanceAuditorViewPage } from './pages/ai-governance/AuditorViewPage';
import { AIGovernanceExportPage } from './pages/ai-governance/ExportPage';
import { AgentRegistry } from './agents/registry';
import { useState } from 'react';

function AppContent() {
  const { services } = useCatalog();
  const [agentRegistry] = useState(() => {
    const registry = new AgentRegistry();
    // Register agents from services
    // This would be populated with actual agent instances
    return registry;
  });

  return (
    <BlueprintProvider agentRegistry={agentRegistry}>
      <GovernanceProvider>
        <AIGovernanceProvider>
          <Layout>
            <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:id" element={<AssetDetailPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/lineage" element={<LineagePage />} />
            <Route path="/quality" element={<QualityPage />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/governance" element={<GovernanceDashboardPage />} />
            <Route path="/governance/policies" element={<GovernancePoliciesPage />} />
            <Route path="/governance/controls" element={<GovernanceControlsPage />} />
            <Route path="/governance/assessments" element={<GovernanceAssessmentsPage />} />
            <Route path="/governance/reviews" element={<GovernanceReviewsPage />} />
            <Route path="/governance/auditor" element={<GovernanceAuditorViewPage />} />
            <Route path="/governance/timeline" element={<GovernanceTimelinePage />} />
            <Route path="/governance/export" element={<ComplianceExportPage />} />
            <Route path="/ai-governance" element={<AIGovernanceDashboardPage />} />
            <Route path="/ai-governance/use-cases" element={<AIGovernanceUseCasesPage />} />
            <Route path="/ai-governance/training-data" element={<AIGovernanceTrainingDataPage />} />
            <Route path="/ai-governance/models" element={<AIGovernanceModelsPage />} />
            <Route path="/ai-governance/rag-resources" element={<AIGovernanceRAGResourcesPage />} />
            <Route path="/ai-governance/drift" element={<AIGovernanceDriftPage />} />
            <Route path="/ai-governance/auditor" element={<AIGovernanceAuditorViewPage />} />
            <Route path="/ai-governance/export" element={<AIGovernanceExportPage />} />
          </Routes>
        </Layout>
        </AIGovernanceProvider>
      </GovernanceProvider>
    </BlueprintProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CatalogProvider>
        <AppContent />
      </CatalogProvider>
    </BrowserRouter>
  );
}
