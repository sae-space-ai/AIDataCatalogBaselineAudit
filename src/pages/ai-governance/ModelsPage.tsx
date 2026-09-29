// ============================================================
// PAGES — AI Governance Models
// ============================================================

import { useAIGovernance } from '../../ai-governance/context';
import { Card, Badge, EmptyState } from '../../components/ui';

export function AIGovernanceModelsPage() {
  const { modelService } = useAIGovernance();
  const models = modelService.listModelProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Model Governance</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor and govern AI models and their dependencies.
        </p>
      </div>

      {models.length === 0 ? (
        <Card>
          <EmptyState
            title="No models registered"
            description="No AI models have been registered yet."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {models.map(model => (
            <Card key={model.assetId}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {model.modelName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {model.modelType} • Version {model.modelVersion}
                    </p>
                  </div>
                  <Badge variant={
                    model.governanceStatus === 'GOVERNED' ? 'success' :
                    model.governanceStatus === 'PARTIAL' ? 'warning' : 'default'
                  }>
                    {model.governanceStatus}
                  </Badge>
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Purpose:</span>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{model.purpose}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Intended Use:</span>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{model.intendedUse}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Input Fields</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {model.inputSpecification.fields.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Training Datasets</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {model.trainingDatasetReferences.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Validation Datasets</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {model.validationDatasetReferences.length}
                    </div>
                  </div>
                </div>

                {model.inputSpecification.fields.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Input Specification
                    </h4>
                    <div className="space-y-1">
                      {model.inputSpecification.fields.slice(0, 5).map((field, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <Badge variant={field.required ? 'danger' : 'default'}>
                            {field.required ? 'Required' : 'Optional'}
                          </Badge>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {field.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            ({field.type})
                          </span>
                          {field.sensitivity && (
                            <Badge variant={
                              field.sensitivity === 'RESTRICTED' ? 'danger' :
                              field.sensitivity === 'CONFIDENTIAL' ? 'warning' : 'default'
                            }>
                              {field.sensitivity}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {model.inputSpecification.fields.length > 5 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          +{model.inputSpecification.fields.length - 5} more fields
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {model.outputSpecification && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Output Specification
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>Type: {model.outputSpecification.outputType}</div>
                      <div>Human Review Required: {model.outputSpecification.humanReviewRequired ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}

                {model.limitations && model.limitations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Known Limitations
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {model.limitations.map((limitation, idx) => (
                        <li key={idx}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
