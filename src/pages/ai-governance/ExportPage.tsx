// ============================================================
// PAGES — AI Governance Export (Multi-Format)
// ============================================================

import { useState } from 'react';
import { useAIGovernance } from '../../ai-governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { getConfig } from '../../app/config';
import { Card, Button } from '../../components/ui';
import { 
  buildCanonicalExport, 
  generateExportFilename,
  generateXLSXBuffer,
  generatePDFBlob
} from '../../ai-governance/export';

export function AIGovernanceExportPage() {
  const { services } = useCatalog();
  const { 
    aiGovernanceService, 
    trainingDataService, 
    modelService,
    ragService,
    driftService,
    sensitiveDataService,
    humanReviewService
  } = useAIGovernance();

  const [exportedData, setExportedData] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [canonicalExport, setCanonicalExport] = useState<any>(null);

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Build canonical export object (single source of truth)
      const config = getConfig();
      const canonical = buildCanonicalExport({
        aiGovernanceService,
        trainingDataService,
        modelService,
        ragService,
        sensitiveDataService,
        driftService,
        humanReviewService,
        evidenceRepo: services.evidenceRepo,
        auditRepo: services.auditRepo,
        applicationMode: config.mode,
      });

      setCanonicalExport(canonical);

      // Convert to JSON for preview
      const jsonString = JSON.stringify(canonical, null, 2);
      setExportedData(jsonString);
    } catch (error) {
      console.error('Export failed:', error);
      setExportedData(JSON.stringify({ error: 'Export failed' }, null, 2));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!exportedData) return;
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateExportFilename('json');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadXLSX = () => {
    if (!canonicalExport) return;
    try {
      const buffer = generateXLSXBuffer(canonicalExport);
      const arrayBuffer = buffer.buffer as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateExportFilename('xlsx');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('XLSX export failed:', error);
    }
  };

  const handleDownloadPDF = () => {
    if (!canonicalExport) return;
    try {
      const blob = generatePDFBlob(canonicalExport);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateExportFilename('pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Governance Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Export AI governance data for compliance reporting and auditing.
        </p>
      </div>

      {/* Export Controls */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Contents</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">AI Use Cases</span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">Training Data</span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">Models</span>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded text-xs">RAG Resources</span>
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs">Drift Assessments</span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-xs">Sensitive Data</span>
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded text-xs">Evidence</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">Audit</span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              <strong>Security Note:</strong> Export does not include passwords, tokens, DATABASE_URL, 
              secret references, or sensitive source data. Only governance metadata and references are exported.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Generate Export'}
            </Button>
            {exportedData && (
              <>
                <Button variant="secondary" onClick={handleDownloadJSON}>
                  Download JSON
                </Button>
                <Button variant="secondary" onClick={handleDownloadXLSX}>
                  Download XLSX
                </Button>
                <Button variant="secondary" onClick={handleDownloadPDF}>
                  Download PDF
                </Button>
                <Button variant="secondary" onClick={handleCopy}>
                  Copy to Clipboard
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Export Preview */}
      {exportedData && (
        <Card title="Export Preview">
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {exportedData}
            </pre>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Size: {(exportedData.length / 1024).toFixed(2)} KB</span>
            <span>Format: JSON (preview)</span>
          </div>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card title="Export Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">AI Use Cases</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {aiGovernanceService.listAIUseCases().length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Training Datasets</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {trainingDataService.listTrainingDatasets().length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Models</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {modelService.listModelProfiles().length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">RAG Resources</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {ragService.listRAGResourceProfiles().length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
