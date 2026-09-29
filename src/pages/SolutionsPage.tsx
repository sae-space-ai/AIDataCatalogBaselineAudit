// ============================================================
// PAGES — Solutions (Blueprints)
// ============================================================

import { useState } from 'react';
import { useBlueprints } from '../blueprints/context';
import { Card, Badge, Button, EmptyState, ProgressBar } from '../components/ui';
import type { SolutionBlueprint } from '../blueprints/types';

export function SolutionsPage() {
  const { availableBlueprints, activeBlueprint, activateBlueprint, deactivateBlueprint, readiness, gaps } = useBlueprints();
  const [selectedBlueprint, setSelectedBlueprint] = useState<SolutionBlueprint | null>(null);

  const sectorBlueprints = availableBlueprints.filter(b => b.id !== 'base');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Solution Blueprints</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Specialized configurations for different sectors and organization types.
        </p>
      </div>

      {/* Active Blueprint */}
      {activeBlueprint && activeBlueprint.id !== 'base' && (
        <Card title="Active Blueprint">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{activeBlueprint.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activeBlueprint.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="info">{activeBlueprint.sector}</Badge>
                <Badge variant={activeBlueprint.implementationLevel === 'IMPLEMENTED' ? 'success' : 'warning'}>
                  {activeBlueprint.implementationLevel}
                </Badge>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={deactivateBlueprint}>
              Deactivate
            </Button>
          </div>

          {readiness && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Readiness Score</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{readiness.overallScore}%</span>
              </div>
              <ProgressBar value={readiness.overallScore} max={100} showValue={false} color={readiness.overallScore >= 70 ? 'green' : readiness.overallScore >= 40 ? 'yellow' : 'red'} />
              <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Implemented:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">{readiness.implemented}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Partial:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">{readiness.partial}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Adapter Ready:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">{readiness.adapterReady}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Not Implemented:</span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">{readiness.notImplemented}</span>
                </div>
              </div>
            </div>
          )}

          {gaps && gaps.gaps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gaps ({gaps.blockingGaps} blocking, {gaps.nonBlockingGaps} non-blocking)</h4>
              <div className="space-y-2">
                {gaps.gaps.slice(0, 3).map((gap, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={gap.severity === 'BLOCKING' ? 'danger' : 'warning'}>{gap.severity}</Badge>
                      <span className="text-gray-700 dark:text-gray-300">{gap.capability}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{gap.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Blueprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectorBlueprints.map(blueprint => (
          <Card key={blueprint.id} className="cursor-pointer hover:shadow-md transition-shadow" >
            <div onClick={() => setSelectedBlueprint(blueprint)}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{blueprint.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{blueprint.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="info">{blueprint.sector}</Badge>
                <Badge variant={blueprint.implementationLevel === 'IMPLEMENTED' ? 'success' : blueprint.implementationLevel === 'PARTIAL' ? 'warning' : 'default'}>
                  {blueprint.implementationLevel}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                <div>Agents: {blueprint.enabledAgents.length} enabled, {blueprint.requiredAgents.length} required</div>
                <div>Oversight: {blueprint.humanOversightProfile.level}</div>
              </div>
            </div>
            {activeBlueprint?.id !== blueprint.id && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); activateBlueprint(blueprint.id); }}>
                  Activate
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Blueprint Detail Modal */}
      {selectedBlueprint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBlueprint(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedBlueprint.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedBlueprint.description}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedBlueprint(null)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Objectives</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {selectedBlueprint.objectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Enabled Agents ({selectedBlueprint.enabledAgents.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBlueprint.enabledAgents.map(agentId => (
                      <Badge key={agentId} variant="default">{agentId}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quality Profile</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>Dimensions: {selectedBlueprint.qualityProfile.requiredDimensions.join(', ')}</div>
                    <div>Severity: {selectedBlueprint.qualityProfile.severity}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Human Oversight</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>Level: {selectedBlueprint.humanOversightProfile.level}</div>
                    <div>Priority: {selectedBlueprint.humanOversightProfile.priority}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button onClick={() => { activateBlueprint(selectedBlueprint.id); setSelectedBlueprint(null); }}>
                    Activate Blueprint
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
