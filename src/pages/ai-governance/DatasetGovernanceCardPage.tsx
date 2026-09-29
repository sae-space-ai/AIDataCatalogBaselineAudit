// ============================================================
// PAGES — Dataset Governance Card
// ============================================================

import { useState } from 'react';
import { useAIGovernance } from '../../ai-governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';

export function DatasetGovernanceCardPage() {
  const { datasetService, trainingDataService, sensitiveDataService, driftService, aiGovernanceService } = useAIGovernance();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');

  const datasets = datasetService.listDatasetProfiles();
  const selectedDataset = selectedDatasetId ? datasetService.getDatasetProfile(selectedDatasetId) : null;

  // Get related data
  const trainingData = selectedDatasetId ? trainingDataService.getTrainingDatasetByAsset(selectedDatasetId) : null;
  const sensitiveAssessment = selectedDatasetId ? sensitiveDataService.getLatestSensitiveDataAssessment('Dataset', selectedDatasetId) : null;
  const driftAssessments = selectedDatasetId ? driftService.getDriftAssessmentsForSubject('Dataset', selectedDatasetId) : [];
  const governanceAssessment = selectedDatasetId ? aiGovernanceService.getLatestAIGovernanceAssessment(selectedDatasetId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dataset Governance Card</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Comprehensive view of dataset governance status and history.
        </p>
      </div>

      {/* Dataset Selector */}
      <Card>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Dataset:</label>
          <select
            value={selectedDatasetId}
            onChange={e => setSelectedDatasetId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">-- Select a dataset --</option>
            {datasets.map(dataset => (
              <option key={dataset.assetId} value={dataset.assetId}>
                {dataset.datasetPurpose} ({dataset.datasetRole})
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!selectedDataset ? (
        <Card>
          <EmptyState
            title="No dataset selected"
            description="Select a dataset from the dropdown above to view its governance card."
          />
        </Card>
      ) : (
        <>
          {/* Dataset Identity */}
          <Card title="Dataset Identity">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Asset ID</label>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">{selectedDataset.assetId}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Purpose</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedDataset.datasetPurpose}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Role</label>
                <Badge variant="info">{selectedDataset.datasetRole}</Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Version</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{selectedDataset.versionReference || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Classification & Quality */}
          <Card title="Classification & Quality">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Classification Summary</label>
                {selectedDataset.classificationSummary ? (
                  <div className="mt-1 space-y-1">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Total: {selectedDataset.classificationSummary.totalClassifications}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      PII: {selectedDataset.classificationSummary.piiCount}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Sensitive: {selectedDataset.classificationSummary.sensitiveCount}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Not evaluated</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Quality Summary</label>
                {selectedDataset.qualitySummary ? (
                  <div className="mt-1 space-y-1">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Overall: {selectedDataset.qualitySummary.overallScore}%
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Completeness: {selectedDataset.qualitySummary.completeness}%
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Validity: {selectedDataset.qualitySummary.validity}%
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Not evaluated</p>
                )}
              </div>
            </div>
          </Card>

          {/* Lineage */}
          <Card title="Lineage">
            {selectedDataset.lineageSummary ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Upstream</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {selectedDataset.lineageSummary.upstreamCount} dependencies
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Downstream</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {selectedDataset.lineageSummary.downstreamCount} dependents
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Lineage not evaluated</p>
            )}
          </Card>

          {/* Training Data Usage */}
          <Card title="Training Data Usage">
            {trainingData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Purpose</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{trainingData.purpose}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Intended Use</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{trainingData.intendedUse}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Lineage Status</label>
                    <Badge variant={
                      trainingData.lineageStatus === 'COMPLETE' ? 'success' :
                      trainingData.lineageStatus === 'PARTIAL' ? 'warning' : 'danger'
                    }>
                      {trainingData.lineageStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Approval Status</label>
                    <Badge variant={
                      trainingData.approvalStatus === 'APPROVED' ? 'success' :
                      trainingData.approvalStatus === 'PENDING_REVIEW' ? 'warning' :
                      trainingData.approvalStatus === 'REJECTED' ? 'danger' : 'default'
                    }>
                      {trainingData.approvalStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Not registered as training data</p>
            )}
          </Card>

          {/* Sensitive Data State */}
          <Card title="Sensitive Data State">
            {sensitiveAssessment ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    sensitiveAssessment.status === 'CLEAR' ? 'success' :
                    sensitiveAssessment.status === 'RESTRICTED' ? 'warning' :
                    sensitiveAssessment.status === 'BLOCKED' ? 'danger' : 'default'
                  }>
                    {sensitiveAssessment.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">PII Detected</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {sensitiveAssessment.piiDetected ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Financial Data</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {sensitiveAssessment.financialDataDetected ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Confidential Data</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {sensitiveAssessment.confidentialDataDetected ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
                {sensitiveAssessment.reasons.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reasons</label>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {sensitiveAssessment.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Sensitive data not evaluated</p>
            )}
          </Card>

          {/* Drift State */}
          <Card title="Drift State">
            {driftAssessments.length > 0 ? (
              <div className="space-y-3">
                {driftAssessments.slice(0, 3).map(drift => (
                  <div key={drift.id} className="border-l-4 border-orange-500 pl-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant={
                          drift.severity === 'CRITICAL_DRIFT' ? 'danger' :
                          drift.severity === 'MATERIAL_DRIFT' ? 'warning' : 'default'
                        }>
                          {drift.severity}
                        </Badge>
                        <span className="text-sm text-gray-700 dark:text-gray-300 ml-2">
                          {drift.driftType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(drift.assessedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{drift.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No drift detected</p>
            )}
          </Card>

          {/* Latest Governance Assessment */}
          <Card title="Latest Governance Assessment">
            {governanceAssessment ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    governanceAssessment.status === 'APPROVED_INTERNAL' ? 'success' :
                    governanceAssessment.status === 'REQUIRES_REVIEW' ? 'warning' :
                    governanceAssessment.status === 'NOT_APPROVED' ? 'danger' : 'default'
                  }>
                    {governanceAssessment.status}
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(governanceAssessment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence Coverage</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={
                      governanceAssessment.evidenceCoverage.status === 'FULL' ? 'success' :
                      governanceAssessment.evidenceCoverage.status === 'PARTIAL' ? 'warning' : 'danger'
                    }>
                      {governanceAssessment.evidenceCoverage.status}
                    </Badge>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {governanceAssessment.evidenceCoverage.available} / {governanceAssessment.evidenceCoverage.required}
                    </span>
                  </div>
                </div>
                {governanceAssessment.reasons.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reasons</label>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {governanceAssessment.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No governance assessment performed</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
