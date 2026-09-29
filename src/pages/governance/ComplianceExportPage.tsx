// ============================================================
// PAGES — Compliance Export
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { Card, Button, Badge } from '../../components/ui';

export function ComplianceExportPage() {
  const { services } = useCatalog();
  const { policyService, controlService, complianceService } = useGovernance();
  const [exportedData, setExportedData] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Build export data
      const exportData = {
        exportTimestamp: new Date().toISOString(),
        version: '1.0.0',
        
        // Policies
        policies: policyService.listPolicies().map(p => ({
          id: p.id,
          name: p.name,
          version: p.version,
          category: p.category,
          status: p.status,
          severity: p.severity,
          scope: p.scope,
          effectiveFrom: p.effectiveFrom,
          effectiveUntil: p.effectiveUntil,
        })),

        // Controls
        controls: controlService.listControls().map(c => ({
          id: c.id,
          name: c.name,
          version: c.version,
          category: c.category,
          controlType: c.controlType,
          executionMode: c.executionMode,
          implementationLevel: c.implementationLevel,
          severity: c.severity,
        })),

        // Assessments
        assessments: complianceService.listAssessments().map(a => ({
          id: a.id,
          subjectType: a.subjectType,
          subjectId: a.subjectId,
          status: a.status,
          scope: a.scope,
          policyEvaluations: a.policyEvaluations,
          controlExecutions: a.controlExecutions,
          evidenceCoverage: a.evidenceCoverage,
          openReviews: a.openReviews,
          exceptions: a.exceptions,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
        })),

        // Evidence (references only, no sensitive data)
        evidenceSummary: {
          totalRecords: services.evidenceRepo.getAll().length,
          types: Array.from(new Set(services.evidenceRepo.getAll().map(e => e.type))),
          subjects: Array.from(new Set(services.evidenceRepo.getAll().map(e => e.subjectType))),
        },

        // Audit (references only, no sensitive data)
        auditSummary: {
          totalEvents: services.auditRepo.getAll().length,
          actions: Array.from(new Set(services.auditRepo.getAll().map(a => a.action))),
          resourceTypes: Array.from(new Set(services.auditRepo.getAll().map(a => a.resourceType))),
        },

        // Metadata
        metadata: {
          totalPolicies: policyService.listPolicies().length,
          activePolicies: policyService.listPolicies('ACTIVE').length,
          totalControls: controlService.listControls().length,
          totalAssessments: complianceService.listAssessments().length,
        },
      };

      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      setExportedData(jsonString);
    } catch (error) {
      console.error('Export failed:', error);
      setExportedData(JSON.stringify({ error: 'Export failed' }, null, 2));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Compliance Export</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Export governance data for compliance reporting.
          </p>
        </div>
      </div>

      {/* Export Controls */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Export Contents</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Policies</Badge>
              <Badge variant="info">Controls</Badge>
              <Badge variant="info">Assessments</Badge>
              <Badge variant="info">Evidence Summary</Badge>
              <Badge variant="info">Audit Summary</Badge>
              <Badge variant="info">Metadata</Badge>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              <strong>Security Note:</strong> Export does not include passwords, tokens, DATABASE_URL, 
              secret references, or sensitive source data. Only governance metadata and references are exported.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Generate Export'}
            </Button>
            {exportedData && (
              <>
                <Button variant="secondary" onClick={handleDownload}>
                  Download JSON
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
            <span>Format: JSON</span>
          </div>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card title="Export Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Policies</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {policyService.listPolicies().length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Controls</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {controlService.listControls().length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Assessments</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {complianceService.listAssessments().length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence Records</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {services.evidenceRepo.getAll().length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
