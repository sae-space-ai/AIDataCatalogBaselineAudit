// ============================================================
// PAGES — Governance Assessments
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { ComplianceAssessment, ComplianceStatus } from '../../governance/types';

export function GovernanceAssessmentsPage() {
  const { complianceService } = useGovernance();
  const [selectedAssessment, setSelectedAssessment] = useState<ComplianceAssessment | null>(null);
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | ''>('');

  const assessments = complianceService.listAssessments(statusFilter || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Compliance Assessments</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View compliance assessments and their results.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ComplianceStatus | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="COMPLIANT">Compliant</option>
            <option value="NON_COMPLIANT">Non-Compliant</option>
            <option value="PARTIALLY_COMPLIANT">Partially Compliant</option>
            <option value="REQUIRES_REVIEW">Requires Review</option>
            <option value="NOT_EVALUATED">Not Evaluated</option>
            <option value="NOT_APPLICABLE">Not Applicable</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {assessments.length} assessments
          </span>
        </div>
      </Card>

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <Card>
          <EmptyState
            title="No assessments found"
            description="No compliance assessments have been created yet."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Policies</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Controls</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Evidence Coverage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Open Reviews</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
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
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{assessment.subjectId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        assessment.status === 'COMPLIANT' ? 'success' :
                        assessment.status === 'NON_COMPLIANT' ? 'danger' :
                        assessment.status === 'PARTIALLY_COMPLIANT' ? 'warning' :
                        assessment.status === 'REQUIRES_REVIEW' ? 'warning' : 'default'
                      }>
                        {assessment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assessment.policyEvaluations.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assessment.controlExecutions.length}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        assessment.evidenceCoverage.coverageStatus === 'FULL' ? 'success' :
                        assessment.evidenceCoverage.coverageStatus === 'PARTIAL' ? 'warning' : 'danger'
                      }>
                        {assessment.evidenceCoverage.coverageStatus}
                      </Badge>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {assessment.evidenceCoverage.available}/{assessment.evidenceCoverage.required}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {assessment.openReviews}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(assessment.startedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAssessment(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Assessment Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedAssessment.subjectType}: {selectedAssessment.subjectId}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAssessment(null)}>✕</Button>
              </div>

              <div className="space-y-6">
                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedAssessment.status === 'COMPLIANT' ? 'success' :
                        selectedAssessment.status === 'NON_COMPLIANT' ? 'danger' :
                        selectedAssessment.status === 'PARTIALLY_COMPLIANT' ? 'warning' : 'default'
                      }>
                        {selectedAssessment.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Policies Evaluated</label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {selectedAssessment.policyEvaluations.length}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Controls Executed</label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {selectedAssessment.controlExecutions.length}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Open Reviews</label>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {selectedAssessment.openReviews}
                    </p>
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Scope</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedAssessment.scope.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No scope restrictions</span>
                    ) : (
                      selectedAssessment.scope.map((scope, idx) => (
                        <Badge key={idx} variant="info">{scope.type}: {scope.value}</Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Evidence Coverage */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence Coverage</label>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-800 p-4 rounded">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Required</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {selectedAssessment.evidenceCoverage.required}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Available</div>
                        <div className="text-lg font-bold text-green-600">
                          {selectedAssessment.evidenceCoverage.available}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Missing</div>
                        <div className="text-lg font-bold text-red-600">
                          {selectedAssessment.evidenceCoverage.missing}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Expired</div>
                        <div className="text-lg font-bold text-orange-600">
                          {selectedAssessment.evidenceCoverage.expired}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Invalid</div>
                        <div className="text-lg font-bold text-red-600">
                          {selectedAssessment.evidenceCoverage.invalid}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Badge variant={
                        selectedAssessment.evidenceCoverage.coverageStatus === 'FULL' ? 'success' :
                        selectedAssessment.evidenceCoverage.coverageStatus === 'PARTIAL' ? 'warning' : 'danger'
                      }>
                        Coverage: {selectedAssessment.evidenceCoverage.coverageStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Policy Evaluations */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Policy Evaluations</label>
                  <div className="mt-2 space-y-2">
                    {selectedAssessment.policyEvaluations.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No policy evaluations</span>
                    ) : (
                      selectedAssessment.policyEvaluations.map(evalId => (
                        <div key={evalId} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm">
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{evalId}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Control Executions */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Control Executions</label>
                  <div className="mt-2 space-y-2">
                    {selectedAssessment.controlExecutions.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No control executions</span>
                    ) : (
                      selectedAssessment.controlExecutions.map(execId => (
                        <div key={execId} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm">
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{execId}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Timeline</label>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <div>Started: {new Date(selectedAssessment.startedAt).toLocaleString()}</div>
                    {selectedAssessment.completedAt && (
                      <div>Completed: {new Date(selectedAssessment.completedAt).toLocaleString()}</div>
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
