// ============================================================
// PAGES — Governance Controls Library
// ============================================================

import { useState } from 'react';
import { useGovernance } from '../../governance/context';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import type { ControlDefinition, ControlExecutionMode, ControlImplementationLevel } from '../../governance/types';

export function GovernanceControlsPage() {
  const { controlService } = useGovernance();
  const [selectedControl, setSelectedControl] = useState<ControlDefinition | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<ControlExecutionMode | ''>('');
  const [levelFilter, setLevelFilter] = useState<ControlImplementationLevel | ''>('');

  const controls = controlService.listControls();
  const filteredControls = controls.filter(c => {
    if (typeFilter && c.controlType !== typeFilter) return false;
    if (modeFilter && c.executionMode !== modeFilter) return false;
    if (levelFilter && c.implementationLevel !== levelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Control Library</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage governance controls and their execution.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="PREVENTIVE">Preventive</option>
            <option value="DETECTIVE">Detective</option>
            <option value="CORRECTIVE">Corrective</option>
            <option value="GOVERNANCE">Governance</option>
          </select>
          <select
            value={modeFilter}
            onChange={e => setModeFilter(e.target.value as ControlExecutionMode | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Modes</option>
            <option value="AUTOMATED">Automated</option>
            <option value="SEMI_AUTOMATED">Semi-Automated</option>
            <option value="MANUAL">Manual</option>
            <option value="NOT_AVAILABLE">Not Available</option>
          </select>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as ControlImplementationLevel | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Levels</option>
            <option value="IMPLEMENTED">Implemented</option>
            <option value="PARTIAL">Partial</option>
            <option value="MODEL_ONLY">Model Only</option>
            <option value="ADAPTER_READY">Adapter Ready</option>
            <option value="NOT_IMPLEMENTED">Not Implemented</option>
          </select>
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
            {filteredControls.length} controls
          </span>
        </div>
      </Card>

      {/* Controls List */}
      {filteredControls.length === 0 ? (
        <Card>
          <EmptyState
            title="No controls found"
            description="No controls match the current filters."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Human Oversight</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredControls.map(control => (
                  <tr
                    key={control.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setSelectedControl(control)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      <div className="font-medium">{control.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{control.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        control.controlType === 'PREVENTIVE' ? 'danger' :
                        control.controlType === 'DETECTIVE' ? 'warning' :
                        control.controlType === 'CORRECTIVE' ? 'info' : 'default'
                      }>
                        {control.controlType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        control.executionMode === 'AUTOMATED' ? 'success' :
                        control.executionMode === 'SEMI_AUTOMATED' ? 'info' :
                        control.executionMode === 'MANUAL' ? 'warning' : 'default'
                      }>
                        {control.executionMode}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        control.implementationLevel === 'IMPLEMENTED' ? 'success' :
                        control.implementationLevel === 'PARTIAL' ? 'warning' :
                        control.implementationLevel === 'MODEL_ONLY' ? 'info' : 'default'
                      }>
                        {control.implementationLevel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        control.severity === 'CRITICAL' ? 'danger' :
                        control.severity === 'HIGH' ? 'warning' :
                        control.severity === 'MEDIUM' ? 'info' : 'default'
                      }>
                        {control.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {control.humanOversightRequired ? 'Required' : 'Not required'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Control Detail Modal */}
      {selectedControl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedControl(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedControl.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedControl.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedControl(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Version</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">v{selectedControl.version}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedControl.category}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Control Type</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedControl.controlType === 'PREVENTIVE' ? 'danger' :
                        selectedControl.controlType === 'DETECTIVE' ? 'warning' :
                        selectedControl.controlType === 'CORRECTIVE' ? 'info' : 'default'
                      }>
                        {selectedControl.controlType}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Execution Mode</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedControl.executionMode === 'AUTOMATED' ? 'success' :
                        selectedControl.executionMode === 'SEMI_AUTOMATED' ? 'info' :
                        selectedControl.executionMode === 'MANUAL' ? 'warning' : 'default'
                      }>
                        {selectedControl.executionMode}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Implementation Level</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedControl.implementationLevel === 'IMPLEMENTED' ? 'success' :
                        selectedControl.implementationLevel === 'PARTIAL' ? 'warning' :
                        selectedControl.implementationLevel === 'MODEL_ONLY' ? 'info' : 'default'
                      }>
                        {selectedControl.implementationLevel}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Severity</label>
                    <div className="mt-1">
                      <Badge variant={
                        selectedControl.severity === 'CRITICAL' ? 'danger' :
                        selectedControl.severity === 'HIGH' ? 'warning' :
                        selectedControl.severity === 'MEDIUM' ? 'info' : 'default'
                      }>
                        {selectedControl.severity}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Human Oversight</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {selectedControl.humanOversightRequired ? 'Required' : 'Not required'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Evidence Requirements</label>
                  <div className="mt-1">
                    {selectedControl.evidenceRequirements.length === 0 ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No evidence requirements</span>
                    ) : (
                      <div className="space-y-2">
                        {selectedControl.evidenceRequirements.map((req, idx) => (
                          <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <div>Type: {req.type}</div>
                            <div>Minimum: {req.minimumCount}</div>
                            {req.humanConfirmationRequired && (
                              <Badge variant="warning" className="mt-1">Human Confirmation Required</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Execution History</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Execution history will be available when controls are executed against assets.
                    </span>
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
