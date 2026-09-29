// ============================================================
// PAGES — Asset Detail
// ============================================================

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../app/CatalogContext';
import { Card, Badge, Tabs, Button, EmptyState, ProgressBar, DemoBanner } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';
import type { Asset, AssetRelationship, Classification, QualityResult, TrustScore, ImpactAnalysis } from '../types';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getAssetById,
    getAssetVersions,
    getRelationshipsForAsset,
    getClassificationsForAsset,
    getQualityForAsset,
    getTrustScore,
    getEvidenceForSubject,
    analyzeImpact,
    assets,
    reviewClassification,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState('overview');

  const asset = id ? getAssetById(id) : undefined;
  const versions = id ? getAssetVersions(id) : [];
  const relationships = id ? getRelationshipsForAsset(id) : [];
  const classifications = id ? getClassificationsForAsset(id) : [];
  const qualityResults = id ? getQualityForAsset(id) : [];
  const trustScore = id ? getTrustScore(id) : undefined;
  const evidenceRecords = id ? getEvidenceForSubject(id) : [];

  if (!asset) {
    return (
      <div className="space-y-4">
        <Link to="/catalog" className="text-sm text-blue-600 hover:underline">← Back to Catalog</Link>
        <Card>
          <EmptyState title="Asset not found" description="The requested asset does not exist or has been removed." />
        </Card>
      </div>
    );
  }

  const impact = id ? analyzeImpact(id) : null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'metadata', label: 'Metadata' },
    { id: 'quality', label: 'Quality', count: qualityResults.length },
    { id: 'lineage', label: 'Lineage', count: relationships.length },
    { id: 'impact', label: 'Impact', count: impact ? impact.potentiallyAffected.length : 0 },
    { id: 'classification', label: 'Classification', count: classifications.length },
    { id: 'evidence', label: 'Evidence', count: evidenceRecords.length },
    { id: 'history', label: 'History', count: versions.length },
  ];

  return (
    <div className="space-y-4">
      <DemoBanner />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/catalog" className="text-blue-600 hover:underline">Catalog</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 dark:text-gray-300">{asset.name}</span>
      </div>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{asset.name}</h2>
              <Badge variant="info">{asset.type}</Badge>
              <Badge variant={asset.status === 'ACTIVE' ? 'success' : 'default'}>{asset.status}</Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{asset.qualifiedName}</p>
            {asset.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{asset.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>Source: {asset.sourceId.slice(0, 8)}...</span>
              <span>Created: {formatDate(asset.createdAt)}</span>
              <span>Updated: {timeAgo(asset.updatedAt)}</span>
            </div>
          </div>
          {trustScore && (
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                trustScore.score >= 70 ? 'text-green-600' :
                trustScore.score >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {trustScore.score}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trust Score</p>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'overview' && <OverviewTab asset={asset} trustScore={trustScore} />}
        {activeTab === 'metadata' && <MetadataTab asset={asset} />}
        {activeTab === 'quality' && <QualityTab results={qualityResults} />}
        {activeTab === 'lineage' && <LineageTab relationships={relationships} assets={assets} assetId={asset.id} />}
        {activeTab === 'impact' && <ImpactTab impact={impact} assets={assets} onNavigate={(id) => navigate(`/catalog/${id}`)} />}
        {activeTab === 'classification' && <ClassificationTab classifications={classifications} onReview={reviewClassification} />}
        {activeTab === 'evidence' && <EvidenceTab evidence={evidenceRecords} />}
        {activeTab === 'history' && <HistoryTab versions={versions} />}
      </div>
    </div>
  );
}

// ---- Overview Tab ----

function OverviewTab({ asset, trustScore }: { asset: Asset; trustScore?: TrustScore }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Asset Information">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Type</dt>
            <dd className="text-gray-900 dark:text-gray-100">{asset.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="text-gray-900 dark:text-gray-100">{asset.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Sensitivity</dt>
            <dd className="text-gray-900 dark:text-gray-100">{asset.sensitivity}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Certification</dt>
            <dd className="text-gray-900 dark:text-gray-100">{asset.certificationStatus}</dd>
          </div>
          {asset.owner && (
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Owner</dt>
              <dd className="text-gray-900 dark:text-gray-100">{asset.owner}</dd>
            </div>
          )}
          {asset.domain && (
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Domain</dt>
              <dd className="text-gray-900 dark:text-gray-100">{asset.domain}</dd>
            </div>
          )}
        </dl>
      </Card>

      {trustScore && (
        <Card title="Trust Score Breakdown">
          <div className="space-y-3">
            {trustScore.components.map(comp => (
              <ProgressBar
                key={comp.factor}
                label={comp.factor}
                value={comp.value}
                max={100}
                color={comp.value >= 70 ? 'green' : comp.value >= 40 ? 'yellow' : 'red'}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
            {trustScore.explanation}
          </p>
        </Card>
      )}
    </div>
  );
}

// ---- Metadata Tab ----

function MetadataTab({ asset }: { asset: Asset }) {
  const metadata = asset.metadata as unknown as Record<string, unknown>;

  return (
    <Card title="Technical Metadata">
      <div className="space-y-2">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{key}</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Impact Tab ----

interface ImpactTabProps {
  impact: ImpactAnalysis | null;
  assets: Asset[];
  onNavigate: (id: string) => void;
}

function ImpactTab({ impact, assets, onNavigate }: ImpactTabProps) {
  if (!impact) {
    return <EmptyState title="No impact data" description="Impact analysis is not available." />;
  }

  if (impact.potentiallyAffected.length === 0 && impact.upstreamCount === 0 && impact.downstreamCount === 0) {
    return (
      <Card title="Impact Analysis">
        <EmptyState
          title="No dependencies detected"
          description="This asset has no upstream or downstream relationships. Changes to this asset will not affect other assets."
        />
      </Card>
    );
  }

  const affectedAssets = impact.potentiallyAffected
    .map(assetId => assets.find(a => a.id === assetId))
    .filter((a): a is Asset => a !== undefined);

  return (
    <div className="space-y-4">
      <Card title="Impact Summary">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{impact.upstreamCount}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upstream Dependencies</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{impact.downstreamCount}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Downstream Dependencies</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{impact.potentiallyAffected.length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Potentially Affected</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Analysis date: {formatDate(impact.analysisDate)}
        </p>
      </Card>

      {affectedAssets.length > 0 && (
        <Card title="Potentially Affected Assets">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            These assets have downstream dependencies and may be affected by changes to this asset.
          </p>
          <div className="space-y-2">
            {affectedAssets.map(asset => (
              <div
                key={asset.id}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => onNavigate(asset.id)}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={
                    asset.type === 'TABLE' ? 'success' :
                    asset.type === 'COLUMN' ? 'default' : 'info'
                  }>
                    {asset.type}
                  </Badge>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{asset.name}</span>
                </div>
                <span className="text-xs text-gray-400">{asset.qualifiedName}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- Quality Tab ----

function QualityTab({ results }: { results: QualityResult[] }) {
  if (results.length === 0) {
    return <EmptyState title="No quality checks" description="Quality checks are run during scan for tables and columns." />;
  }

  return (
    <Card title="Quality Check Results">
      <div className="space-y-3">
        {results.map(result => (
          <div key={result.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.ruleType}</span>
              {result.details && <span className="text-xs text-gray-400 ml-2">{result.details}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Value: {result.measuredValue} / Threshold: {result.threshold}
              </span>
              <Badge variant={result.status === 'PASS' ? 'success' : result.status === 'WARNING' ? 'warning' : 'danger'}>
                {result.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Lineage Tab ----

function LineageTab({ relationships, assets, assetId }: { relationships: AssetRelationship[]; assets: Asset[]; assetId: string }) {
  if (relationships.length === 0) {
    return <EmptyState title="No relationships" description="This asset has no upstream or downstream relationships." />;
  }

  const upstream = relationships.filter(r => r.targetAssetId === assetId);
  const downstream = relationships.filter(r => r.sourceAssetId === assetId);

  const getAssetName = (id: string) => {
    const a = assets.find(x => x.id === id);
    return a ? `${a.name} (${a.type})` : id;
  };

  return (
    <div className="space-y-4">
      <Card title={`Upstream (${upstream.length})`}>
        {upstream.length === 0 ? (
          <p className="text-sm text-gray-400">No upstream dependencies.</p>
        ) : (
          <div className="space-y-2">
            {upstream.map(rel => (
              <div key={rel.id} className="flex items-center gap-2 text-sm py-1">
                <Badge variant="info">{rel.type}</Badge>
                <span className="text-gray-700 dark:text-gray-300">{getAssetName(rel.sourceAssetId)}</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-500">this asset</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Downstream (${downstream.length})`}>
        {downstream.length === 0 ? (
          <p className="text-sm text-gray-400">No downstream dependencies.</p>
        ) : (
          <div className="space-y-2">
            {downstream.map(rel => (
              <div key={rel.id} className="flex items-center gap-2 text-sm py-1">
                <span className="text-gray-500">this asset</span>
                <span className="text-gray-400">→</span>
                <Badge variant="info">{rel.type}</Badge>
                <span className="text-gray-700 dark:text-gray-300">{getAssetName(rel.targetAssetId)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---- Classification Tab ----

function ClassificationTab({ classifications, onReview }: { classifications: Classification[]; onReview: (id: string, status: 'CONFIRMED' | 'REJECTED') => void }) {
  if (classifications.length === 0) {
    return <EmptyState title="No classifications" description="Classifications are generated by the rules engine during scan." />;
  }

  return (
    <Card title="Classifications">
      <div className="space-y-3">
        {classifications.map(cls => (
          <div key={cls.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={cls.classificationType === 'NONE' ? 'default' : 'danger'}>
                  {cls.classificationType}
                </Badge>
                <span className="text-xs text-gray-400">{Math.round(cls.confidence * 100)}% confidence</span>
                <Badge variant={cls.reviewStatus === 'CONFIRMED' ? 'success' : cls.reviewStatus === 'REJECTED' ? 'danger' : 'warning'}>
                  {cls.reviewStatus}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cls.reason}</p>
              <p className="text-xs text-gray-400 mt-0.5">Method: {cls.method}</p>
            </div>
            {cls.reviewStatus === 'PENDING' && (
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => onReview(cls.id, 'CONFIRMED')}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onReview(cls.id, 'REJECTED')}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Evidence Tab ----

function EvidenceTab({ evidence }: { evidence: Array<{ id: string; type: string; actor: string; timestamp: string; source: string; metadata?: Record<string, unknown> }> }) {
  if (evidence.length === 0) {
    return <EmptyState title="No evidence records" description="Evidence is generated during scan operations." />;
  }

  return (
    <Card title="Evidence Records">
      <div className="space-y-3">
        {evidence.map(ev => (
          <div key={ev.id} className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="flex items-center justify-between">
              <Badge variant="info">{ev.type}</Badge>
              <span className="text-xs text-gray-400">{timeAgo(ev.timestamp)}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Actor: {ev.actor} • Source: {ev.source}
            </p>
            {ev.metadata && Object.keys(ev.metadata).length > 0 && (
              <pre className="text-xs text-gray-400 mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                {JSON.stringify(ev.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- History Tab ----

function HistoryTab({ versions }: { versions: Array<{ id: string; version: number; changedAt: string; changedBy: string; reason: string }> }) {
  if (versions.length === 0) {
    return <EmptyState title="No version history" description="Versions are created when assets are discovered or updated." />;
  }

  return (
    <Card title="Version History">
      <div className="space-y-3">
        {versions.map(v => (
          <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">v{v.version}</span>
              <span className="text-xs text-gray-400 ml-2">{v.reason}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400">{timeAgo(v.changedAt)}</span>
              <span className="block text-xs text-gray-500">{v.changedBy}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
