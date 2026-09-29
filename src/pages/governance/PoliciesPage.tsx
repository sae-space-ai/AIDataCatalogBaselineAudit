// ============================================================
// PAGES — Governance Policies Library
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { PolicyDefinition, PolicyStatus } from '../../governance/types';

export function GovernancePoliciesPage() {
  const { policyService } = useGovernance();
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyDefinition | null>(null);
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const policies = policyService.listPolicies(statusFilter || undefined);
  const filteredPolicies = categoryFilter
    ? policies.filter(p => p.category === categoryFilter)
    : policies;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Policy Library</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage governance policies and their versions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as PolicyStatus | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEPRECATED">Deprecated</option>
            <option value="RETIRED">Retired</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            <option value="DATA_GOVERNANCE">Data Governance</option>
            <option value="PRIVACY">Privacy</option>
            <option value="DATA_QUALITY">Data Quality</option>
            <option value="SECURITY">Security</option>
            <option value="AI_GOVERNANCE">AI Governance</option>
            <option value="ACCESS">Access</option>
            <option value="RETENTION">Retention</option>
            <option value="LINEAGE">Lineage</option>
            <option value="CERTIFICATION">Certification</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
            {filteredPolicies.length} policies
          </span>
        </div>
      </Card>

      {/* Policies List */}
      {filteredPolicies.length === 0 ? (
        <Card>
          <EmptyState
            title="No policies found"
            description="No policies match the current filters."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Controls</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPolicies.map(policy => (
                  <tr
                    key={policy.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedPolicy(policy)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium">{policy.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{policy.description}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">v{policy.version}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{policy.category}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        policy.status === 'ACTIVE' ? 'success' :
                        policy.status === 'DRAFT' ? 'default' :
                        policy.status === 'SUSPENDED' ? 'warning' :
                        'danger'
                      }>
                        {policy.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        policy.severity === 'CRITICAL' ? 'danger' :
                        policy.severity === 'HIGH' ? 'warning' :
                        policy.severity === 'MEDIUM' ? 'info' : 'default'
                      }>
                        {policy.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {policy.controls.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Policy Detail Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPolicy(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedPolicy.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedPolicy.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPolicy(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Version</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">v{selectedPolicy.version}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedPolicy.status === 'ACTIVE' ? 'success' :
                        selectedPolicy.status === 'DRAFT' ? 'default' : 'warning'
                      }>
                        {selectedPolicy.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedPolicy.category}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Severity</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedPolicy.severity === 'CRITICAL' ? 'danger' :
                        selectedPolicy.severity === 'HIGH' ? 'warning' : 'info'
                      }>
                        {selectedPolicy.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Effective From</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{new Date(selectedPolicy.effectiveFrom).toLocaleDateString()}</p>
                  </div>
                  {selectedPolicy.effectiveUntil && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Effective Until</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{new Date(selectedPolicy.effectiveUntil).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Scope</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedPolicy.scope.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No scope restrictions (applies to all)</span>
                    ) : (
                      selectedPolicy.scope.map((scope, idx) => (
                        <Badge key={idx} variant="default">{scope.type}: {scope.value}</Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Conditions</label>
                  <div className="mt-1 space-y-2">
                    {selectedPolicy.conditions.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No conditions (always applies)</span>
                    ) : (
                      selectedPolicy.conditions.map((condition, idx) => (
                        <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <code>{condition.field} {condition.operator} {JSON.stringify(condition.value)}</code>
                          {condition.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{condition.description}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Controls</label>
                  <div className="mt-1">
                    {selectedPolicy.controls.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No controls assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedPolicy.controls.map(controlId => (
                          <Badge key={controlId} variant="info">{controlId}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Human Oversight</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {selectedPolicy.humanOversight ? 'Required' : 'Not required'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
