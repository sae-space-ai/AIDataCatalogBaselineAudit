// ============================================================
// PAGES — AI Governance Use Cases
// ============================================================

import { useAIGovernance } from '../../ai-governance/context';
import { Card, Badge, EmptyState } from '../../components/ui';

export function AIGovernanceUseCasesPage() {
  const { aiGovernanceService } = useAIGovernance();
  const useCases = aiGovernanceService.listAIUseCases();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Use Cases</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage and monitor AI use cases and their governance status.
        </p>
      </div>

      {useCases.length === 0 ? (
        <Card>
          <EmptyState
            title="No AI use cases"
            description="No AI use cases have been registered yet."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {useCases.map(useCase => {
            const assessment = aiGovernanceService.getLatestAIGovernanceAssessment(useCase.id);
            
            return (
              <Card key={useCase.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {useCase.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {useCase.description}
                      </p>
                    </div>
                    <Badge variant={
                      useCase.status === 'APPROVED_INTERNAL' ? 'success' :
                      useCase.status === 'UNDER_REVIEW' ? 'warning' :
                      useCase.status === 'SUSPENDED' ? 'danger' : 'default'
                    }>
                      {useCase.status}
                    </Badge>
                  </div>

                  <div className="text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Purpose:</span>
                      <span>{useCase.purpose}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">Domain:</span>
                      <span>{useCase.businessDomain}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{useCase.modelReferences.length} models</Badge>
                    <Badge variant="info">{useCase.datasetReferences.length} datasets</Badge>
                    <Badge variant="info">{useCase.ragResourceReferences.length} RAG resources</Badge>
                  </div>

                  {assessment && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Governance Status:</span>
                        <Badge variant={
                          assessment.status === 'APPROVED_INTERNAL' ? 'success' :
                          assessment.status === 'REQUIRES_REVIEW' ? 'warning' :
                          assessment.status === 'NOT_APPROVED' ? 'danger' : 'default'
                        }>
                          {assessment.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
