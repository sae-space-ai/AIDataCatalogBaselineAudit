// ============================================================
// PAGES — AI Governance RAG Resources
// ============================================================

import { useState } from 'react';
import { useAIGovernance } from '../../ai-governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { RAGResourceProfile, RAGEligibilityStatus } from '../../ai-governance/types';

export function AIGovernanceRAGResourcesPage() {
  const { ragService } = useAIGovernance();
  const [selectedResource, setSelectedResource] = useState<RAGResourceProfile | null>(null);
  const [eligibilityFilter, setEligibilityFilter] = useState<RAGEligibilityStatus | ''>('');

  const resources = ragService.listRAGResourceProfiles();
  const filteredResources = eligibilityFilter
    ? resources.filter(r => r.eligibilityStatus === eligibilityFilter)
    : resources;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">RAG Resources</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage RAG resources and their eligibility for retrieval-augmented generation.
          </p>
        </div>
        <Badge variant="demo">GOVERNANCE ONLY — NO RAG RUNTIME</Badge>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={eligibilityFilter}
            onChange={e => setEligibilityFilter(e.target.value as RAGEligibilityStatus | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Eligibility Statuses</option>
            <option value="ELIGIBLE">Eligible</option>
            <option value="NOT_ELIGIBLE">Not Eligible</option>
            <option value="REQUIRES_REVIEW">Requires Review</option>
            <option value="NOT_EVALUATED">Not Evaluated</option>
            <option value="STALE">Stale</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredResources.length} RAG resources
          </span>
        </div>
      </Card>

      {/* RAG Resources List */}
      {filteredResources.length === 0 ? (
        <Card>
          <EmptyState
            title="No RAG resources"
            description="No RAG resources have been registered yet."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Eligibility</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Evidence</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredResources.map(resource => (
                  <tr
                    key={resource.assetId}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedResource(resource)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium">RAG Resource</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {resource.assetId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{resource.resourceType}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {resource.sourceReference}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        resource.eligibilityStatus === 'ELIGIBLE' ? 'success' :
                        resource.eligibilityStatus === 'NOT_ELIGIBLE' ? 'danger' :
                        resource.eligibilityStatus === 'REQUIRES_REVIEW' ? 'warning' :
                        resource.eligibilityStatus === 'STALE' ? 'demo' : 'default'
                      }>
                        {resource.eligibilityStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {resource.evidenceIds.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* RAG Resource Detail Modal */}
      {selectedResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedResource(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">RAG Resource Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Resource: {selectedResource.assetId}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedResource(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Resource Type</label>
                    <div className="mt-1">
                      <Badge variant="info">{selectedResource.resourceType}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Eligibility Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedResource.eligibilityStatus === 'ELIGIBLE' ? 'success' :
                        selectedResource.eligibilityStatus === 'NOT_ELIGIBLE' ? 'danger' :
                        selectedResource.eligibilityStatus === 'REQUIRES_REVIEW' ? 'warning' :
                        selectedResource.eligibilityStatus === 'STALE' ? 'demo' : 'default'
                      }>
                        {selectedResource.eligibilityStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Source Reference</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedResource.sourceReference}</p>
                  </div>
                  {selectedResource.versionReference && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Version Reference</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedResource.versionReference}</p>
                    </div>
                  )}
                </div>

                {selectedResource.classificationSummary && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Classification Summary</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Classifications</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {selectedResource.classificationSummary.totalClassifications}
                        </div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                        <div className="text-xs text-yellow-700 dark:text-yellow-400">Sensitive Classifications</div>
                        <div className="text-lg font-bold text-yellow-900 dark:text-yellow-200">
                          {selectedResource.classificationSummary.sensitiveClassifications}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedResource.qualitySummary && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Quality Summary</label>
                    <div className="mt-1">
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Overall Score</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {selectedResource.qualitySummary.overallScore}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedResource.lineageSummary && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Lineage Summary</label>
                    <div className="mt-1">
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Upstream Dependencies</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {selectedResource.lineageSummary.upstreamCount}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedResource.freshness && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Freshness</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedResource.freshness}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Usage Restrictions</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {!selectedResource.usageRestrictions || selectedResource.usageRestrictions.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No usage restrictions</span>
                    ) : (
                      selectedResource.usageRestrictions.map((restriction, idx) => (
                        <Badge key={idx} variant="warning">{restriction}</Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Policy Assessments</label>
                  <div className="mt-1">
                    {selectedResource.policyAssessmentIds.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No policy assessments</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedResource.policyAssessmentIds.map(id => (
                          <div key={id} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-1 rounded">
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
                    {selectedResource.evidenceIds.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No evidence attached</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedResource.evidenceIds.map(id => (
                          <div key={id} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-1 rounded">
                            {id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Timeline</label>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    <div>Created: {new Date(selectedResource.createdAt).toLocaleString()}</div>
                    <div>Updated: {new Date(selectedResource.updatedAt).toLocaleString()}</div>
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
