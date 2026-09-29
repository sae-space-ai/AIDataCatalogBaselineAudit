// ============================================================
// PAGES — AI Governance Drift
// ============================================================

import { useState } from 'react';
import { useAIGovernance } from '../../ai-governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { DataDriftAssessment, DriftSeverity } from '../../ai-governance/types';

export function AIGovernanceDriftPage() {
  const { driftService } = useAIGovernance();
  const [selectedAssessment, setSelectedAssessment] = useState<DataDriftAssessment | null>(null);
  const [severityFilter, setSeverityFilter] = useState<DriftSeverity | ''>('');

  const assessments = driftService.listDriftAssessments(severityFilter || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Drift</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor data drift across datasets, models, and AI resources.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as DriftSeverity | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Severities</option>
            <option value="NO_DRIFT">No Drift</option>
            <option value="MINOR_DRIFT">Minor Drift</option>
            <option value="MATERIAL_DRIFT">Material Drift</option>
            <option value="CRITICAL_DRIFT">Critical Drift</option>
            <option value="NOT_EVALUATED">Not Evaluated</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {assessments.length} drift assessments
          </span>
        </div>
      </Card>

      {/* Drift Assessments List */}
      {assessments.length === 0 ? (
        <Card>
          <EmptyState
            title="No drift assessments"
            description="No drift assessments have been performed yet."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Drift Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Changes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Affected Resources</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assessed</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {assessments.map(assessment => (
                  <tr
                    key={assessment.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium">{assessment.subjectType}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {assessment.subjectId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{assessment.driftType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        assessment.severity === 'NO_DRIFT' ? 'success' :
                        assessment.severity === 'MINOR_DRIFT' ? 'warning' :
                        assessment.severity === 'MATERIAL_DRIFT' ? 'danger' :
                        assessment.severity === 'CRITICAL_DRIFT' ? 'danger' : 'default'
                      }>
                        {assessment.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assessment.changes.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assessment.affectedResources.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(assessment.assessedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drift Assessment Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAssessment(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Drift Assessment Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedAssessment.subjectType}: {selectedAssessment.subjectId}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAssessment(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Drift Type</label>
                    <div className="mt-1">
                      <Badge variant="info">{selectedAssessment.driftType}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Severity</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedAssessment.severity === 'NO_DRIFT' ? 'success' :
                        selectedAssessment.severity === 'MINOR_DRIFT' ? 'warning' :
                        selectedAssessment.severity === 'MATERIAL_DRIFT' ? 'danger' :
                        selectedAssessment.severity === 'CRITICAL_DRIFT' ? 'danger' : 'default'
                      }>
                        {selectedAssessment.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Assessed At</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(selectedAssessment.assessedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    {selectedAssessment.reason}
                  </p>
                </div>

                {selectedAssessment.previousSnapshot && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Previous Snapshot</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                      {selectedAssessment.previousSnapshot}
                    </p>
                  </div>
                )}

                {selectedAssessment.currentSnapshot && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Current Snapshot</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                      {selectedAssessment.currentSnapshot}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Changes Detected ({selectedAssessment.changes.length})</label>
                  <div className="mt-2 space-y-2">
                    {selectedAssessment.changes.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No changes detected</span>
                    ) : (
                      selectedAssessment.changes.map((change, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {change.field}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                change.changeType === 'ADDED' ? 'success' :
                                change.changeType === 'REMOVED' ? 'danger' : 'warning'
                              }>
                                {change.changeType}
                              </Badge>
                              <Badge variant={
                                change.impact === 'HIGH' ? 'danger' :
                                change.impact === 'MEDIUM' ? 'warning' : 'default'
                              }>
                                {change.impact} impact
                              </Badge>
                            </div>
                          </div>
                          {change.previousValue !== undefined && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Previous:</span> {JSON.stringify(change.previousValue)}
                            </div>
                          )}
                          {change.currentValue !== undefined && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Current:</span> {JSON.stringify(change.currentValue)}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Affected Resources ({selectedAssessment.affectedResources.length})</label>
                  <div className="mt-2">
                    {selectedAssessment.affectedResources.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No affected resources identified</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedAssessment.affectedResources.map(id => (
                          <div key={id} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence</label>
                  <div className="mt-1">
                    {selectedAssessment.evidenceIds.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No evidence attached</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedAssessment.evidenceIds.map(id => (
                          <div key={id} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-1 rounded">
                            {id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
