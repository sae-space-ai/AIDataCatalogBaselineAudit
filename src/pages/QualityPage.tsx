// ============================================================
// PAGES — Quality
// ============================================================

import { useCatalog } from '../app/CatalogContext';
import { Card, Badge, StatCard, EmptyState, DemoBanner } from '../components/ui';
import { timeAgo } from '../lib/utils';


export function QualityPage() {
  const { qualityResults, assets } = useCatalog();

  const totalChecks = qualityResults.length;
  const passed = qualityResults.filter(r => r.status === 'PASS').length;
  const warnings = qualityResults.filter(r => r.status === 'WARN' || r.status === 'WARNING').length;
  const failures = qualityResults.filter(r => r.status === 'FAIL').length;
  const passRate = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0;

  const getAssetName = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? `${asset.name} (${asset.type})` : assetId;
  };

  return (
    <div className="space-y-6">
      <DemoBanner />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Quality</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quality checks computed from actual data statistics during scan operations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Checks" value={totalChecks} />
        <StatCard label="Passed" value={passed} />
        <StatCard label="Warnings" value={warnings} />
        <StatCard label="Failures" value={failures} />
        <StatCard label="Pass Rate" value={`${passRate}%`} />
      </div>

      {/* Results */}
      {qualityResults.length === 0 ? (
        <Card>
          <EmptyState
            title="No quality checks"
            description="Quality checks are generated during scan operations for tables and columns."
          />
        </Card>
      ) : (
        <Card title="Quality Check Results">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Measured</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {qualityResults.map(result => (
                  <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      {getAssetName(result.assetId)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{result.ruleType}</code>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {result.measuredValue}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {result.threshold}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={
                        result.status === 'PASS' ? 'success' :
                        (result.status === 'WARN' || result.status === 'WARNING') ? 'warning' : 'danger'
                      }>
                        {result.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      {timeAgo(result.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Issues */}
      {(warnings > 0 || failures > 0) && (
        <Card title="Quality Issues">
          <div className="space-y-2">
            {qualityResults
              .filter(r => r.status !== 'PASS')
              .map(result => (
                <div key={result.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={(result.status === 'WARN' || result.status === 'WARNING') ? 'warning' : 'danger'}>
                      {result.status}
                    </Badge>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getAssetName(result.assetId)}
                    </span>
                    <span className="text-xs text-gray-400">— {result.ruleType}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {result.details}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
