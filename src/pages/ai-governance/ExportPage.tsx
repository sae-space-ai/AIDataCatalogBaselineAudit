// ============================================================
// PAGES — AI Governance Export
// ============================================================

import { useState } from 'react';
import { useAIGovernance } from '../../ai-governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { Card, Button } from '../../components/ui';

export function AIGovernanceExportPage() {
  const { services } = useCatalog();
  const { 
    aiGovernanceService, 
    trainingDataService, 
    modelService,
    ragService,
    driftService,
    sensitiveDataService
  } = useAIGovernance();

  const [exportedData, setExportedData] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Build export data
      const exportData = {
        exportTimestamp: new Date().toISOString(),
        version: '1.0.0',
        
        // AI Use Cases
        aiUseCases: aiGovernanceService.listAIUseCases().map(uc => ({
          id: uc.id,
          name: uc.name,
          description: uc.description,
          purpose: uc.purpose,
          businessDomain: uc.businessDomain,
          status: uc.status,
          modelReferences: uc.modelReferences,
          datasetReferences: uc.datasetReferences,
          ragResourceReferences: uc.ragResourceReferences,
          createdAt: uc.createdAt,
          updatedAt: uc.updatedAt,
        })),

        // Training Data
        trainingData: trainingDataService.listTrainingDatasets().map(td => ({
          id: td.id,
          datasetAssetId: td.datasetAssetId,
          datasetVersionId: td.datasetVersionId,
          purpose: td.purpose,
          intendedUse: td.intendedUse,
          lineageStatus: td.lineageStatus,
          classificationStatus: td.classificationStatus,
          qualityStatus: td.qualityStatus,
          approvalStatus: td.approvalStatus,
          createdAt: td.createdAt,
          updatedAt: td.updatedAt,
        })),

        // Models
        models: modelService.listModelProfiles().map(model => ({
          assetId: model.assetId,
          modelName: model.modelName,
          modelVersion: model.modelVersion,
          modelType: model.modelType,
          purpose: model.purpose,
          intendedUse: model.intendedUse,
          governanceStatus: model.governanceStatus,
          inputFields: model.inputSpecification.fields.length,
          trainingDatasets: model.trainingDatasetReferences.length,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
        })),

        // RAG Resources
        ragResources: ragService.listRAGResourceProfiles().map(rag => ({
          assetId: rag.assetId,
          resourceType: rag.resourceType,
          sourceReference: rag.sourceReference,
          eligibilityStatus: rag.eligibilityStatus,
          createdAt: rag.createdAt,
          updatedAt: rag.updatedAt,
        })),

        // Drift Assessments
        driftAssessments: driftService.listDriftAssessments().map(drift => ({
          id: drift.id,
          subjectType: drift.subjectType,
          subjectId: drift.subjectId,
          driftType: drift.driftType,
          severity: drift.severity,
          reason: drift.reason,
          assessedAt: drift.assessedAt,
        })),

        // Sensitive Data Assessments
        sensitiveDataAssessments: sensitiveDataService.listSensitiveDataAssessments().map(sda => ({
          id: sda.id,
          subjectType: sda.subjectType,
          subjectId: sda.subjectId,
          status: sda.status,
          piiDetected: sda.piiDetected,
          financialDataDetected: sda.financialDataDetected,
          confidentialDataDetected: sda.confidentialDataDetected,
          assessedAt: sda.assessedAt,
        })),

        // AI Governance Assessments
        aiGovernanceAssessments: aiGovernanceService.listAIGovernanceAssessments().map(assessment => ({
          id: assessment.id,
          subjectType: assessment.subjectType,
          subjectId: assessment.subjectId,
          status: assessment.status,
          datasetAssessments: assessment.datasetAssessments.length,
          ragAssessments: assessment.ragAssessments.length,
          evidenceCoverage: assessment.evidenceCoverage,
          createdAt: assessment.createdAt,
          completedAt: assessment.completedAt,
        })),

        // Evidence Summary
        evidenceSummary: {
          totalRecords: services.evidenceRepo.getAll().length,
          aiRelated: services.evidenceRepo.getAll().filter(e => 
            e.source.includes('ai-governance') || 
            e.source.includes('training-data') ||
            e.source.includes('model-governance') ||
            e.source.includes('rag-governance') ||
            e.source.includes('data-drift') ||
            e.source.includes('sensitive-data')
          ).length,
        },

        // Audit Summary
        auditSummary: {
          totalEvents: services.auditRepo.getAll().length,
          aiRelated: services.auditRepo.getAll().filter(e => 
            e.resourceType.includes('AI') ||
            e.resourceType.includes('Training') ||
            e.resourceType.includes('Model') ||
            e.resourceType.includes('RAG') ||
            e.resourceType.includes('Drift') ||
            e.resourceType.includes('Sensitive')
          ).length,
        },

        // Metadata
        metadata: {
          totalUseCases: aiGovernanceService.listAIUseCases().length,
          totalTrainingDatasets: trainingDataService.listTrainingDatasets().length,
          totalModels: modelService.listModelProfiles().length,
          totalRAGResources: ragService.listRAGResourceProfiles().length,
          totalDriftAssessments: driftService.listDriftAssessments().length,
          totalSensitiveAssessments: sensitiveDataService.listSensitiveDataAssessments().length,
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
    a.download = `ai-governance-export-${new Date().toISOString().split('T')[0]}.json`;
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
