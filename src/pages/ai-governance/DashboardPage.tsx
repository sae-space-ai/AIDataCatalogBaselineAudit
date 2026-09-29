// ============================================================
// PAGES — AI Governance Dashboard
// ============================================================

import { useAIGovernance } from '../../ai-governance/context';
import { Card, StatCard, Badge } from '../../components/ui';

export function AIGovernanceDashboardPage() {
  const { 
    aiGovernanceService, 
    trainingDataService, 
    ragService, 
    sensitiveDataService,
    driftService 
  } = useAIGovernance();

  const aiSummary = aiGovernanceService.getAIGovernanceSummary();
  const trainingSummary = trainingDataService.listTrainingDatasets().length;
  const ragSummary = ragService.getRAGGovernanceSummary();
  const sensitiveSummary = sensitiveDataService.getSensitiveDataSummary();
  const driftSummary = driftService.getDriftSummary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Governance Dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Overview of AI/ML governance status across datasets, models, and use cases.
        </p>
      </div>

      {/* AI Use Cases Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="AI Use Cases" value={aiSummary.totalUseCases} />
        <StatCard label="Approved" value={aiSummary.approved} />
        <StatCard label="Under Review" value={aiSummary.underReview} />
        <StatCard label="Draft" value={aiSummary.draft} />
        <StatCard label="Suspended" value={aiSummary.suspended} />
        <StatCard label="Retired" value={aiSummary.retired} />
      </div>

      {/* Governance Assessments */}
      <Card title="AI Governance Assessments">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Assessments</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {aiSummary.totalAssessments}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <label className="text-xs font-medium text-green-700 dark:text-green-400">Approved</label>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">
              {aiSummary.approvedAssessments}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
            <label className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Requires Review</label>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">
              {aiSummary.requiresReview}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
            <label className="text-xs font-medium text-red-700 dark:text-red-400">Not Approved</label>
            <p className="text-2xl font-bold text-red-900 dark:text-red-200 mt-1">
              {aiSummary.notApproved}
            </p>
          </div>
        </div>
      </Card>

      {/* Training Data */}
      <Card title="Training Data">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Datasets</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {trainingSummary}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <label className="text-xs font-medium text-green-700 dark:text-green-400">Approved</label>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">
              {trainingDataService.listTrainingDatasets('APPROVED').length}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
            <label className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Pending Review</label>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">
              {trainingDataService.listTrainingDatasets('PENDING_REVIEW').length}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
            <label className="text-xs font-medium text-orange-700 dark:text-orange-400">Stale</label>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">
              {trainingDataService.listTrainingDatasets('STALE').length}
            </p>
          </div>
        </div>
      </Card>

      {/* RAG Resources */}
      <Card title="RAG Resources">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {ragSummary.total}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <label className="text-xs font-medium text-green-700 dark:text-green-400">Eligible</label>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">
              {ragSummary.eligible}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
            <label className="text-xs font-medium text-red-700 dark:text-red-400">Not Eligible</label>
            <p className="text-2xl font-bold text-red-900 dark:text-red-200 mt-1">
              {ragSummary.notEligible}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
            <label className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Requires Review</label>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">
              {ragSummary.requiresReview}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
            <label className="text-xs font-medium text-orange-700 dark:text-orange-400">Stale</label>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">
              {ragSummary.stale}
            </p>
          </div>
        </div>
      </Card>

      {/* Sensitive Data */}
      <Card title="Sensitive Data Findings">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Assessments</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {sensitiveSummary.total}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <label className="text-xs font-medium text-green-700 dark:text-green-400">Clear</label>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">
              {sensitiveSummary.clear}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
            <label className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Restricted</label>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">
              {sensitiveSummary.restricted}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
            <label className="text-xs font-medium text-red-700 dark:text-red-400">Blocked</label>
            <p className="text-2xl font-bold text-red-900 dark:text-red-200 mt-1">
              {sensitiveSummary.blocked}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
            <label className="text-xs font-medium text-orange-700 dark:text-orange-400">Requires Review</label>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">
              {sensitiveSummary.requiresReview}
            </p>
          </div>
        </div>
      </Card>

      {/* Data Drift */}
      <Card title="Data Drift">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Assessments</label>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {driftSummary.total}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <label className="text-xs font-medium text-green-700 dark:text-green-400">No Drift</label>
            <p className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">
              {driftSummary.noDrift}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
            <label className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Minor Drift</label>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">
              {driftSummary.minorDrift}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
            <label className="text-xs font-medium text-orange-700 dark:text-orange-400">Material Drift</label>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-200 mt-1">
              {driftSummary.materialDrift}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
            <label className="text-xs font-medium text-red-700 dark:text-red-400">Critical Drift</label>
            <p className="text-2xl font-bold text-red-900 dark:text-red-200 mt-1">
              {driftSummary.criticalDrift}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
