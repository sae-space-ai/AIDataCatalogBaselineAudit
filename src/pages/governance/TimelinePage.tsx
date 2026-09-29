// ============================================================
// PAGES — Governance Timeline
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { Card, Badge, EmptyState } from '../../components/ui';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'CLASSIFICATION' | 'QUALITY' | 'POLICY' | 'CONTROL' | 'REVIEW' | 'EXCEPTION' | 'CERTIFICATION' | 'EVIDENCE' | 'AUDIT';
  title: string;
  description: string;
  subjectType: string;
  subjectId: string;
  actor: string;
  metadata?: Record<string, unknown>;
}

export function GovernanceTimelinePage() {
  const { services } = useCatalog();
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Build timeline from evidence and audit events
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Add evidence events
    services.evidenceRepo.getAll().forEach(evidence => {
      events.push({
        id: evidence.id,
        timestamp: evidence.timestamp,
        type: mapEvidenceType(evidence.type),
        title: evidence.type,
        description: `Evidence recorded for ${evidence.subjectType}`,
        subjectType: evidence.subjectType,
        subjectId: evidence.subjectId,
        actor: evidence.actor,
        metadata: evidence.metadata,
      });
    });

    // Add audit events
    services.auditRepo.getAll().forEach(audit => {
      events.push({
        id: audit.id,
        timestamp: audit.timestamp,
        type: 'AUDIT',
        title: audit.action,
        description: `${audit.action} on ${audit.resourceType}`,
        subjectType: audit.resourceType,
        subjectId: audit.resourceId,
        actor: audit.actor,
        metadata: audit.details,
      });
    });

    // Sort by timestamp (newest first)
    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const mapEvidenceType = (type: string): TimelineEvent['type'] => {
    if (type.includes('CLASSIFICATION')) return 'CLASSIFICATION';
    if (type.includes('QUALITY')) return 'QUALITY';
    if (type.includes('POLICY')) return 'POLICY';
    if (type.includes('CONTROL')) return 'CONTROL';
    if (type.includes('REVIEW')) return 'REVIEW';
    if (type.includes('EXCEPTION')) return 'EXCEPTION';
    if (type.includes('CERTIFICATION')) return 'CERTIFICATION';
    return 'EVIDENCE';
  };

  const timeline = buildTimeline();
  const filteredTimeline = typeFilter
    ? timeline.filter(e => e.type === typeFilter)
    : timeline;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Governance Timeline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consolidated timeline of all governance activities.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="CLASSIFICATION">Classification</option>
            <option value="QUALITY">Quality</option>
            <option value="POLICY">Policy</option>
            <option value="CONTROL">Control</option>
            <option value="REVIEW">Review</option>
            <option value="EXCEPTION">Exception</option>
            <option value="CERTIFICATION">Certification</option>
            <option value="EVIDENCE">Evidence</option>
            <option value="AUDIT">Audit</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTimeline.length} events
          </span>
        </div>
      </Card>

      {/* Timeline */}
      {filteredTimeline.length === 0 ? (
        <Card>
          <EmptyState
            title="No timeline events"
            description="No governance events have been recorded yet."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTimeline.slice(0, 100).map(event => (
            <Card key={event.id}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    event.type === 'CLASSIFICATION' ? 'bg-purple-100 dark:bg-purple-900' :
                    event.type === 'QUALITY' ? 'bg-blue-100 dark:bg-blue-900' :
                    event.type === 'POLICY' ? 'bg-green-100 dark:bg-green-900' :
                    event.type === 'CONTROL' ? 'bg-yellow-100 dark:bg-yellow-900' :
                    event.type === 'REVIEW' ? 'bg-orange-100 dark:bg-orange-900' :
                    event.type === 'CERTIFICATION' ? 'bg-indigo-100 dark:bg-indigo-900' :
                    'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Badge variant={
                      event.type === 'CLASSIFICATION' ? 'demo' :
                      event.type === 'QUALITY' ? 'info' :
                      event.type === 'POLICY' ? 'success' :
                      event.type === 'CONTROL' ? 'warning' :
                      event.type === 'REVIEW' ? 'warning' :
                      event.type === 'CERTIFICATION' ? 'info' : 'default'
                    }>
                      {event.type.charAt(0)}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      <span className="font-medium">Subject:</span> {event.subjectType}
                    </span>
                    <span className="font-mono">{event.subjectId.slice(0, 8)}...</span>
                    <span>
                      <span className="font-medium">Actor:</span> {event.actor}
                    </span>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                        View details
                      </summary>
                      <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {filteredTimeline.length > 100 && (
            <Card>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Showing 100 of {filteredTimeline.length} events
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
