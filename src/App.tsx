// ============================================================
// APP — Root Composition Layer
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CatalogProvider, useCatalog } from './app/CatalogContext';
import { BlueprintProvider } from './blueprints/context';
import { GovernanceProvider } from './governance/context';
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
          </Routes>
        </Layout>
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
