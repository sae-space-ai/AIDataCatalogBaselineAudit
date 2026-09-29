// ============================================================
// PAGES — Catalog
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../app/CatalogContext';
import { Card, Badge, Table, EmptyState, DemoBanner } from '../components/ui';
import type { Asset, AssetType, SearchQuery } from '../types';

export function CatalogPage() {
  const { assets, searchAssets, classifications, qualityResults, trustScores } = useCatalog();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [sensitivityFilter, setSensitivityFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');

  const query: SearchQuery = useMemo(() => ({
    text: searchText || undefined,
    type: typeFilter || undefined,
    sensitivity: (sensitivityFilter || undefined) as SearchQuery['sensitivity'],
    pageSize: 100,
  }), [searchText, typeFilter, sensitivityFilter]);

  let result = searchAssets(query);

  // Additional client-side filtering for classification and review status
  if (classificationFilter || reviewStatusFilter) {
    const filtered = result.assets.filter(asset => {
      const assetClassifications = classifications.filter(c => c.assetId === asset.id);
      
      if (classificationFilter) {
        if (!assetClassifications.some(c => c.classificationType === classificationFilter)) {
          return false;
        }
      }
      
      if (reviewStatusFilter) {
        if (!assetClassifications.some(c => c.reviewStatus === reviewStatusFilter)) {
          return false;
        }
      }
      
      return true;
    });
    
    result = {
      ...result,
      assets: filtered,
      total: filtered.length,
    };
  }

  // Helper: get classification for asset
  const getClassification = (assetId: string) => {
    return classifications.find(c => c.assetId === assetId);
  };

  // Helper: get quality score for asset
  const getQualityBadge = (assetId: string) => {
    const results = qualityResults.filter(r => r.assetId === assetId);
    if (results.length === 0) return null;
    const hasFail = results.some(r => r.status === 'FAIL');
    const hasWarn = results.some(r => r.status === 'WARN' || r.status === 'WARNING');
    if (hasFail) return <Badge variant="danger">FAIL</Badge>;
    if (hasWarn) return <Badge variant="warning">WARN</Badge>;
    return <Badge variant="success">PASS</Badge>;
  };

  // Helper: get trust score
  const getTrustScore = (assetId: string) => {
    return trustScores.find(ts => ts.assetId === assetId);
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (asset: Asset) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{asset.name}</span>
          <span className="block text-xs text-gray-400 font-mono">{asset.qualifiedName}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (asset: Asset) => (
        <Badge variant={asset.type === 'DATABASE' ? 'info' : asset.type === 'TABLE' ? 'default' : 'default'}>
          {asset.type}
        </Badge>
      ),
    },
    {
      key: 'classification',
      header: 'Classification',
      render: (asset: Asset) => {
        const cls = getClassification(asset.id);
        if (!cls || cls.classificationType === 'NONE') {
          return <span className="text-xs text-gray-400">—</span>;
        }
        const variant = cls.classificationType.startsWith('PII') ? 'danger' :
                       cls.classificationType === 'FINANCIAL' ? 'warning' : 'info';
        return (
          <div>
            <Badge variant={variant}>{cls.classificationType}</Badge>
            <span className="text-xs text-gray-400 ml-1">{Math.round(cls.confidence * 100)}%</span>
          </div>
        );
      },
    },
    {
      key: 'quality',
      header: 'Quality',
      render: (asset: Asset) => getQualityBadge(asset.id) ?? <span className="text-xs text-gray-400">—</span>,
    },
    {
      key: 'trust',
      header: 'Trust',
      render: (asset: Asset) => {
        const ts = getTrustScore(asset.id);
        if (!ts) return <span className="text-xs text-gray-400">—</span>;
        const color = ts.score >= 70 ? 'text-green-600' : ts.score >= 40 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`text-sm font-semibold ${color}`}>{ts.score}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (asset: Asset) => {
        const variant = asset.status === 'ACTIVE' ? 'success' :
                       asset.status === 'DISCOVERED' ? 'info' :
                       asset.status === 'DEPRECATED' ? 'danger' : 'default';
        return <Badge variant={variant}>{asset.status}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DemoBanner />

      {/* Search & Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search assets by name, qualified name, or description..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as AssetType | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="DATABASE">Database</option>
            <option value="SCHEMA">Schema</option>
            <option value="TABLE">Table</option>
            <option value="COLUMN">Column</option>
            <option value="DATASET">Dataset</option>
          </select>
          <select
            value={sensitivityFilter}
            onChange={e => setSensitivityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Sensitivities</option>
            <option value="PUBLIC">Public</option>
            <option value="INTERNAL">Internal</option>
            <option value="CONFIDENTIAL">Confidential</option>
            <option value="RESTRICTED">Restricted</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <select
            value={classificationFilter}
            onChange={e => setClassificationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Classifications</option>
            <option value="PII_EMAIL">PII Email</option>
            <option value="PII_NAME">PII Name</option>
            <option value="PII_PHONE">PII Phone</option>
            <option value="IDENTIFIER">Identifier</option>
            <option value="TIMESTAMP">Timestamp</option>
            <option value="GEOGRAPHIC">Geographic</option>
            <option value="FINANCIAL">Financial</option>
            <option value="NONE">None</option>
          </select>
          <select
            value={reviewStatusFilter}
            onChange={e => setReviewStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Review Status</option>
            <option value="SUGGESTED">Suggested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
          </select>
          <span className="text-xs text-gray-400">
            {result.total} asset{result.total !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {result.assets.length === 0 ? (
          <EmptyState
            title="No assets found"
            description={assets.length === 0
              ? "Your catalog is empty. Create a demo source and run a scan to discover assets."
              : "No assets match your current filters."
            }
          />
        ) : (
          <Table
            data={result.assets}
            columns={columns}
            onRowClick={(asset) => navigate(`/catalog/${asset.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
