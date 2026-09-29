// ============================================================
// PAGES — AI Governance Auditor View
// ============================================================

import { useAIGovernance } from '../../ai-governance/context';
import { useCatalog } from '../../app/CatalogContext';
import { Card, Badge, EmptyState } from '../../components/ui';

export function AIGovernanceAuditorViewPage() {
  const { services } = useCatalog();
  const { 
    aiGovernanceService, 
    trainingDataService, 
    modelService,
    ragService,
    driftService,
    sensitiveDataService
  } = useAIGovernance();

  // Get all AI governance data
  const useCases = aiGovernanceService.listAIUseCases();
  const models = modelService.listModelProfiles();
  const trainingDatasets = trainingDataService.listTrainingDatasets();
  const ragResources = ragService.listRAGResourceProfiles();
  const driftAssessments = driftService.listDriftAssessments();
  const sensitiveAssessments = sensitiveDataService.listSensitiveDataAssessments();

  // Get evidence and audit events
  const allEvidence = services.evidenceRepo.getAll();
  const allAuditEvents = services.auditRepo.getAll();

  // Filter AI-related evidence
  const aiEvidence = allEvidence.filter(e => 
    e.source.includes('ai-governance') || 
    e.source.includes('training-data') ||
    e.source.includes('model-governance') ||
    e.source.includes('rag-governance') ||
    e.source.includes('data-drift') ||
    e.source.includes('sensitive-data')
  );

  // Filter AI-related audit events
  const aiAuditEvents = allAuditEvents.filter(e => 
    e.resourceType.includes('AI') ||
    e.resourceType.includes('Training') ||
    e.resourceType.includes('Model') ||
    e.resourceType.includes('RAG') ||
    e.resourceType.includes('Drift') ||
    e.resourceType.includes('Sensitive')
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Governance Auditor View</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Read-only view for auditing AI governance activities.
          </p>
        </div>
        <Badge variant="info">Read-Only</Badge>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{useCases.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">AI Use Cases</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{models.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Models</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trainingDatasets.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Training Datasets</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ragResources.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">RAG Resources</div>
          </div>
        </Card>
      </div>

      {/* AI Use Cases */}
      <Card title="AI Use Cases">
        {useCases.length === 0 ? (
          <EmptyState title="No use cases" description="No AI use cases registered." />
        ) : (
          <div className="space-y-3">
            {useCases.map(useCase => (
              <div key={useCase.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{useCase.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{useCase.purpose}</div>
                  </div>
                  <Badge variant={
                    useCase.status === 'APPROVED_INTERNAL' ? 'success' :
                    useCase.status === 'UNDER_REVIEW' ? 'warning' : 'default'
                  }>
                    {useCase.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Models: {useCase.modelReferences.length} | 
                  Datasets: {useCase.datasetReferences.length} | 
                  RAG: {useCase.ragResourceReferences.length}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Models */}
      <Card title="Models">
        {models.length === 0 ? (
          <EmptyState title="No models" description="No models registered." />
        ) : (
          <div className="space-y-3">
            {models.map(model => (
              <div key={model.assetId} className="border-l-4 border-purple-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{model.modelName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {model.modelType} • v{model.modelVersion}
                    </div>
                  </div>
                  <Badge variant={
                    model.governanceStatus === 'GOVERNED' ? 'success' :
                    model.governanceStatus === 'PARTIAL' ? 'warning' : 'default'
                  }>
                    {model.governanceStatus}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Training: {model.trainingDatasetReferences.length} | 
                  Validation: {model.validationDatasetReferences.length}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Training Datasets */}
      <Card title="Training Datasets">
        {trainingDatasets.length === 0 ? (
          <EmptyState title="No training datasets" description="No training datasets registered." />
        ) : (
          <div className="space-y-3">
            {trainingDatasets.map(td => (
              <div key={td.id} className="border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Dataset {td.datasetAssetId.slice(0, 8)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{td.purpose}</div>
                  </div>
                  <Badge variant={
                    td.approvalStatus === 'APPROVED' ? 'success' :
                    td.approvalStatus === 'PENDING_REVIEW' ? 'warning' :
                    td.approvalStatus === 'REJECTED' ? 'danger' : 'default'
                  }>
                    {td.approvalStatus}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Lineage: {td.lineageStatus} | 
                  Classification: {td.classificationStatus} | 
                  Quality: {td.qualityStatus}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* RAG Resources */}
      <Card title="RAG Resources">
        {ragResources.length === 0 ? (
          <EmptyState title="No RAG resources" description="No RAG resources registered." />
        ) : (
          <div className="space-y-3">
            {ragResources.map(rag => (
              <div key={rag.assetId} className="border-l-4 border-orange-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {rag.resourceType}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Source: {rag.sourceReference}
                    </div>
                  </div>
                  <Badge variant={
                    rag.eligibilityStatus === 'ELIGIBLE' ? 'success' :
                    rag.eligibilityStatus === 'REQUIRES_REVIEW' ? 'warning' :
                    rag.eligibilityStatus === 'NOT_ELIGIBLE' ? 'danger' : 'default'
                  }>
                    {rag.eligibilityStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Drift Assessments */}
      <Card title="Drift Assessments">
        {driftAssessments.length === 0 ? (
          <EmptyState title="No drift assessments" description="No drift assessments performed." />
        ) : (
          <div className="space-y-3">
            {driftAssessments.slice(0, 10).map(drift => (
              <div key={drift.id} className="border-l-4 border-red-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {drift.driftType}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {drift.reason}
                    </div>
                  </div>
                  <Badge variant={
                    drift.severity === 'CRITICAL_DRIFT' ? 'danger' :
                    drift.severity === 'MATERIAL_DRIFT' ? 'warning' : 'default'
                  }>
                    {drift.severity}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(drift.assessedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI Evidence */}
      <Card title="AI Governance Evidence">
        {aiEvidence.length === 0 ? (
          <EmptyState title="No evidence" description="No AI governance evidence recorded." />
        ) : (
          <div className="space-y-3">
            {aiEvidence.slice(0, 20).map(evidence => (
              <div key={evidence.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {evidence.type}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {evidence.source}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(evidence.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Subject: {evidence.subjectType} / {evidence.subjectId.slice(0, 8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI Audit Events */}
      <Card title="AI Governance Audit Events">
        {aiAuditEvents.length === 0 ? (
          <EmptyState title="No audit events" description="No AI governance audit events recorded." />
        ) : (
          <div className="space-y-3">
            {aiAuditEvents.slice(0, 20).map(event => (
              <div key={event.id} className="border-l-4 border-gray-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {event.action}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {event.resourceType}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Actor: {event.actor}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
