// ============================================================
// PAGES — Governance Auditor View (Read-Only)
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { Card, Badge, EmptyState } from '../../components/ui';

export function GovernanceAuditorViewPage() {
  const { services } = useCatalog();
  const { policyService, controlService } = useGovernance();
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Get all evidence and audit events
  const allEvidence = services.evidenceRepo.getAll();
  const allAuditEvents = services.auditRepo.getAll();

  // Filter by subject if selected
  const filteredEvidence = selectedSubject
    ? allEvidence.filter(e => e.subjectId === selectedSubject || e.subjectType === selectedSubject)
    : allEvidence;

  const filteredAudit = selectedSubject
    ? allAuditEvents.filter(e => e.resourceId === selectedSubject || e.resourceType === selectedSubject)
    : allAuditEvents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Auditor View</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Read-only view for auditing governance activities.
          </p>
        </div>
        <Badge variant="info">Read-Only</Badge>
      </div>

      {/* Filter */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            placeholder="Filter by subject ID or type..."
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredEvidence.length} evidence records, {filteredAudit.length} audit events
          </span>
        </div>
      </Card>

      {/* Evidence Timeline */}
      <Card title="Evidence Records">
        {filteredEvidence.length === 0 ? (
          <EmptyState
            title="No evidence records"
            description="No evidence records match the current filter."
          />
        ) : (
          <div className="space-y-3">
            {filteredEvidence.slice(0, 50).map(evidence => (
              <div key={evidence.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{evidence.type}</Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(evidence.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{evidence.subjectType}:</span>{' '}
                      <span className="font-mono text-xs">{evidence.subjectId}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Actor: {evidence.actor} • Source: {evidence.source}
                    </div>
                    {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">
                          View metadata
                        </summary>
                        <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(evidence.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredEvidence.length > 50 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                Showing 50 of {filteredEvidence.length} records
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Audit Timeline */}
      <Card title="Audit Events">
        {filteredAudit.length === 0 ? (
          <EmptyState
            title="No audit events"
            description="No audit events match the current filter."
          />
        ) : (
          <div className="space-y-3">
            {filteredAudit.slice(0, 50).map(event => (
              <div key={event.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        event.action === 'CREATE' ? 'success' :
                        event.action === 'UPDATE' ? 'info' :
                        event.action === 'DELETE' ? 'danger' : 'default'
                      }>
                        {event.action}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{event.resourceType}:</span>{' '}
                      <span className="font-mono text-xs">{event.resourceId}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Actor: {event.actor}
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">
                          View details
                        </summary>
                        <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredAudit.length > 50 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                Showing 50 of {filteredAudit.length} events
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card title="Audit Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Evidence</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {allEvidence.length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Audit Events</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {allAuditEvents.length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Policies</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {policyService.listPolicies('ACTIVE').length}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Controls</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {controlService.listControls().length}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
