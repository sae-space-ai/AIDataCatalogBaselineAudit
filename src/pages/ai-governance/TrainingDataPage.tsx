// ============================================================
// PAGES — AI Governance Training Data
// ============================================================

import { useState } from 'react';
import { useAIGovernance } from '../../ai-governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { TrainingDatasetRecord, TrainingDataApprovalStatus } from '../../ai-governance/types';

export function AIGovernanceTrainingDataPage() {
  const { trainingDataService } = useAIGovernance();
  const [selectedRecord, setSelectedRecord] = useState<TrainingDatasetRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrainingDataApprovalStatus | ''>('');

  const records = trainingDataService.listTrainingDatasets(statusFilter || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Training Data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage training datasets, their approval status, and traceability.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as TrainingDataApprovalStatus | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="NOT_EVALUATED">Not Evaluated</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="APPROVED_WITH_CONDITIONS">Approved with Conditions</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="STALE">Stale</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {records.length} training datasets
          </span>
        </div>
      </Card>

      {/* Training Data List */}
      {records.length === 0 ? (
        <Card>
          <EmptyState
            title="No training datasets"
            description="No training datasets have been registered yet."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dataset</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lineage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Classification</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quality</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Approval</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {records.map(record => (
                  <tr
                    key={record.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium">Dataset</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {record.datasetAssetId.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {record.purpose}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        record.lineageStatus === 'COMPLETE' ? 'success' :
                        record.lineageStatus === 'PARTIAL' ? 'warning' :
                        record.lineageStatus === 'MISSING' ? 'danger' : 'default'
                      }>
                        {record.lineageStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        record.classificationStatus === 'REVIEWED' ? 'success' :
                        record.classificationStatus === 'PENDING' ? 'warning' : 'default'
                      }>
                        {record.classificationStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        record.qualityStatus === 'ACCEPTABLE' ? 'success' :
                        record.qualityStatus === 'NEEDS_IMPROVEMENT' ? 'warning' : 'default'
                      }>
                        {record.qualityStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        record.approvalStatus === 'APPROVED' || record.approvalStatus === 'APPROVED_WITH_CONDITIONS' ? 'success' :
                        record.approvalStatus === 'PENDING_REVIEW' ? 'warning' :
                        record.approvalStatus === 'REJECTED' || record.approvalStatus === 'SUSPENDED' ? 'danger' :
                        record.approvalStatus === 'STALE' ? 'demo' : 'default'
                      }>
                        {record.approvalStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Training Dataset Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Training Dataset Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Dataset: {selectedRecord.datasetAssetId}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Purpose</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedRecord.purpose}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Intended Use</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedRecord.intendedUse}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Lineage Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedRecord.lineageStatus === 'COMPLETE' ? 'success' :
                        selectedRecord.lineageStatus === 'PARTIAL' ? 'warning' :
                        selectedRecord.lineageStatus === 'MISSING' ? 'danger' : 'default'
                      }>
                        {selectedRecord.lineageStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Classification Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedRecord.classificationStatus === 'REVIEWED' ? 'success' :
                        selectedRecord.classificationStatus === 'PENDING' ? 'warning' : 'default'
                      }>
                        {selectedRecord.classificationStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Quality Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedRecord.qualityStatus === 'ACCEPTABLE' ? 'success' :
                        selectedRecord.qualityStatus === 'NEEDS_IMPROVEMENT' ? 'warning' : 'default'
                      }>
                        {selectedRecord.qualityStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Approval Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedRecord.approvalStatus === 'APPROVED' || selectedRecord.approvalStatus === 'APPROVED_WITH_CONDITIONS' ? 'success' :
                        selectedRecord.approvalStatus === 'PENDING_REVIEW' ? 'warning' :
                        selectedRecord.approvalStatus === 'REJECTED' || selectedRecord.approvalStatus === 'SUSPENDED' ? 'danger' :
                        selectedRecord.approvalStatus === 'STALE' ? 'demo' : 'default'
                      }>
                        {selectedRecord.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Allowed Uses</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedRecord.allowedUses.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No allowed uses specified</span>
                    ) : (
                      selectedRecord.allowedUses.map((use, idx) => (
                        <Badge key={idx} variant="success">{use}</Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Restricted Uses</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedRecord.restrictedUses.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No restricted uses specified</span>
                    ) : (
                      selectedRecord.restrictedUses.map((use, idx) => (
                        <Badge key={idx} variant="danger">{use}</Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Source References</label>
                  <div className="mt-1">
                    {selectedRecord.sourceReferences.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No source references</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedRecord.sourceReferences.map((ref, idx) => (
                          <div key={idx} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-1 rounded">
                            {ref}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence</label>
                  <div className="mt-1">
                    {selectedRecord.evidenceIds.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No evidence attached</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedRecord.evidenceIds.map(id => (
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
                    <div>Created: {new Date(selectedRecord.createdAt).toLocaleString()}</div>
                    <div>Updated: {new Date(selectedRecord.updatedAt).toLocaleString()}</div>
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
