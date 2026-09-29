// ============================================================
// APP — Root Composition Layer
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CatalogProvider } from './app/CatalogContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { CatalogPage } from './pages/CatalogPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { SourcesPage } from './pages/SourcesPage';
import { LineagePage } from './pages/LineagePage';
import { QualityPage } from './pages/QualityPage';
import { EvidencePage } from './pages/EvidencePage';
import { AuditPage } from './pages/AuditPage';

export default function App() {
  return (
    <BrowserRouter>
      <CatalogProvider>
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
          </Routes>
        </Layout>
      </CatalogProvider>
    </BrowserRouter>
  );
}
