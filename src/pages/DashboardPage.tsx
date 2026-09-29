// ============================================================
// PAGES — Dashboard
// ============================================================

import { useCatalog } from '../app/CatalogContext';
import { Card, StatCard, DemoBanner } from '../components/ui';
import { timeAgo } from '../lib/utils';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { assets, sources, scanRuns, classifications, qualityResults, evidence, auditEvents, relationships } = useCatalog();

  const totalAssets = assets.length;
  const totalSources = sources.length;
  const latestScan = scanRuns[0];
  const classifiedAssets = new Set(classifications.map(c => c.assetId)).size;
  const assetsNeedingReview = new Set(
    classifications
      .filter(c => c.reviewStatus === 'SUGGESTED' || c.reviewStatus === 'PENDING' || c.reviewStatus === 'NEEDS_REVIEW')
      .map(c => c.assetId)
  ).size;
  const qualityIssues = qualityResults.filter(r => r.status === 'FAIL' || r.status === 'WARN' || r.status === 'WARNING').length;
  const assetsWithLineage = new Set(
    relationships.map(r => r.sourceAssetId).concat(relationships.map(r => r.targetAssetId))
  ).size;
  const totalEvidence = evidence.length;
  const totalAuditEvents = auditEvents.length;

  return (
    <div className="space-y-6">
      <DemoBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label="Total Assets" value={totalAssets} />
        <StatCard label="Sources" value={totalSources} />
        <StatCard label="Latest Scan" value={latestScan ? timeAgo(latestScan.startedAt) : '—'} />
        <StatCard label="Classified" value={classifiedAssets} />
        <StatCard label="Needs Review" value={assetsNeedingReview} />
        <StatCard label="Quality Issues" value={qualityIssues} />
        <StatCard label="With Lineage" value={assetsWithLineage} />
        <StatCard label="Evidence" value={totalEvidence} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Scans */}
        <Card title="Latest Scans">
          {scanRuns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No scans executed yet. Create a source and run a scan.</p>
          ) : (
            <div className="space-y-3">
              {scanRuns.slice(0, 5).map(scan => (
                <div key={scan.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      scan.status === 'SUCCESS' ? 'bg-green-500' :
                      scan.status === 'FAILED' ? 'bg-red-500' :
                      scan.status === 'RUNNING' ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-gray-700 dark:text-gray-300">{scan.status}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500 dark:text-gray-400">{scan.assetsDiscovered} assets</span>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(scan.startedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Evidence */}
        <Card title="Recent Evidence">
          {evidence.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No evidence records yet.</p>
          ) : (
            <div className="space-y-3">
              {evidence.slice(0, 5).map(ev => (
                <div key={ev.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{ev.type}</span>
                    <span className="text-gray-400 ml-2 text-xs">{ev.source}</span>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(ev.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Audit */}
      <Card title="Recent Audit Events">
        {auditEvents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No audit events yet.</p>
        ) : (
          <div className="space-y-2">
            {auditEvents.slice(0, 8).map(event => (
              <div key={event.id} className="flex items-center gap-3 text-sm py-1">
                <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {event.action}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{event.resourceType}</span>
                <span className="text-gray-400 text-xs">by {event.actor}</span>
                <span className="ml-auto text-xs text-gray-400">{timeAgo(event.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="flex gap-3">
          <Link
            to="/sources"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Demo Source
          </Link>
          <Link
            to="/catalog"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Browse Catalog
          </Link>
        </div>
      </Card>
    </div>
  );
}
