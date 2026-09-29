// ============================================================
// PAGES — Governance Reviews Queue
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { HumanReviewTask } from '../../agents/types';

export function GovernanceReviewsPage() {
  const { services } = useCatalog();
  const [selectedReview, setSelectedReview] = useState<HumanReviewTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Get all review tasks from the catalog context
  // Note: In a real implementation, this would come from a dedicated review service
  const allReviews: HumanReviewTask[] = []; // Placeholder - would be populated from actual review service

  const filteredReviews = allReviews.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (priorityFilter && r.priority !== priorityFilter) return false;
    return true;
  });

  const handleReviewAction = (taskId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'ESCALATE') => {
    // In DEMO mode, use demo-reviewer
    // In REAL mode without identity, show IDENTITY_REQUIRED_FOR_GOVERNANCE_DECISION
    const isDemoMode = true; // Would check actual mode
    
    if (!isDemoMode) {
      alert('IDENTITY_REQUIRED_FOR_GOVERNANCE_DECISION');
      return;
    }

    // Generate AuditEvent and EvidenceRecord
    services.auditRepo.save({
      id: crypto.randomUUID(),
      actor: 'demo-reviewer',
      action: 'REVIEW',
      resourceType: 'HumanReviewTask',
      resourceId: taskId,
      timestamp: new Date().toISOString(),
      details: { action },
    });

    services.evidenceRepo.save({
      id: crypto.randomUUID(),
      type: 'CLASSIFICATION_REVIEWED',
      subjectType: 'HumanReviewTask',
      subjectId: taskId,
      actor: 'demo-reviewer',
      timestamp: new Date().toISOString(),
      source: 'GovernanceReviewsPage.handleReviewAction',
      metadata: { action },
    });

    alert(`Review action ${action} recorded for task ${taskId}`);
    setSelectedReview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Review Queue</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage human review tasks for governance decisions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredReviews.length} reviews
          </span>
        </div>
      </Card>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card>
          <EmptyState
            title="No review tasks"
            description="No human review tasks are pending at this time."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReviews.map(review => (
                  <tr
                    key={review.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedReview(review)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium">{review.subjectType}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{review.subjectId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {review.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        review.priority === 'CRITICAL' ? 'danger' :
                        review.priority === 'HIGH' ? 'warning' :
                        review.priority === 'MEDIUM' ? 'info' : 'default'
                      }>
                        {review.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        review.status === 'OPEN' ? 'warning' :
                        review.status === 'ASSIGNED' ? 'info' :
                        review.status === 'RESOLVED' ? 'success' : 'default'
                      }>
                        {review.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {review.assignedTo || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReview(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Review Task Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedReview.subjectType}: {selectedReview.subjectId}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReview(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedReview.type}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedReview.priority === 'CRITICAL' ? 'danger' :
                        selectedReview.priority === 'HIGH' ? 'warning' :
                        selectedReview.priority === 'MEDIUM' ? 'info' : 'default'
                      }>
                        {selectedReview.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedReview.status === 'OPEN' ? 'warning' :
                        selectedReview.status === 'ASSIGNED' ? 'info' :
                        selectedReview.status === 'RESOLVED' ? 'success' : 'default'
                      }>
                        {selectedReview.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Assigned To</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {selectedReview.assignedTo || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedReview.reason}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence</label>
                  <div className="mt-1">
                    {selectedReview.evidenceIds.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No evidence attached</span>
                    ) : (
                      <div className="space-y-1">
                        {selectedReview.evidenceIds.map(id => (
                          <div key={id} className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-1 rounded">
                            {id}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Created</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {new Date(selectedReview.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedReview.resolvedAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Resolved</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                      {new Date(selectedReview.resolvedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedReview.decision && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Decision</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{selectedReview.decision}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedReview.status !== 'RESOLVED' && selectedReview.status !== 'CANCELLED' && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Review Actions</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleReviewAction(selectedReview.id, 'APPROVE')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReviewAction(selectedReview.id, 'REJECT')}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReviewAction(selectedReview.id, 'REQUEST_CHANGES')}
                      >
                        Request Changes
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReviewAction(selectedReview.id, 'ESCALATE')}
                      >
                        Escalate
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Actions generate AuditEvent and EvidenceRecord automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
