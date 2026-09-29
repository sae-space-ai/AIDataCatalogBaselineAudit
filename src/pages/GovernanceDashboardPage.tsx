// ============================================================
// PAGES — Governance Dashboard
// ============================================================

import { useGovernance } from '../governance/context';
import { Card, StatCard, Badge } from '../components/ui';

export function GovernanceDashboardPage() {
  const { policyService, controlService, complianceService, riskService } = useGovernance();

  const activePolicies = policyService.listPolicies('ACTIVE').length;
  const totalControls = controlService.listControls().length;
  const highRisks = riskService.getHighRisks().length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Governance Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Overview of governance policies, controls, and compliance status.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Policies" value={activePolicies} />
        <StatCard label="Controls" value={totalControls} />
        <StatCard label="High Risks" value={highRisks} />
        <StatCard label="Open Reviews" value={0} />
      </div>

      {/* Policies */}
      <Card title="Active Policies">
        {activePolicies === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No active policies configured.</p>
        ) : (
          <div className="space-y-2">
            {policyService.listPolicies('ACTIVE').map(policy => (
              <div key={policy.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{policy.name}</span>
                  <span className="text-xs text-gray-400 ml-2">v{policy.version}</span>
                </div>
                <Badge variant={policy.severity === 'CRITICAL' ? 'danger' : policy.severity === 'HIGH' ? 'warning' : 'default'}>
                  {policy.severity}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* High Risks */}
      {highRisks > 0 && (
        <Card title="High Governance Risks">
          <div className="space-y-2">
            {riskService.getHighRisks().map(risk => (
              <div key={risk.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{risk.subjectType}: {risk.subjectId}</span>
                  <span className="text-xs text-gray-400 ml-2">{risk.reason}</span>
                </div>
                <Badge variant="danger">{risk.severity}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
