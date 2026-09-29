// ============================================================
// PAGES — Lineage
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useCatalog } from '../app/CatalogContext';
import { Card, Badge, EmptyState, DemoBanner } from '../components/ui';

export function LineagePage() {
  const { relationships, assets } = useCatalog();
  const navigate = useNavigate();

  if (relationships.length === 0) {
    return (
      <div className="space-y-4">
        <DemoBanner />
        <Card>
          <EmptyState
            title="No lineage data"
            description="Lineage relationships are created during scan operations. Create a source and run a scan to see the lineage graph."
          />
        </Card>
      </div>
    );
  }

  // Build a tree structure from relationships
  // Find root nodes (assets that are sources but not targets of CONTAINS)
  const targetIds = new Set(relationships.filter(r => r.type === 'CONTAINS').map(r => r.targetAssetId));
  const sourceIds = new Set(relationships.filter(r => r.type === 'CONTAINS').map(r => r.sourceAssetId));
  const rootIds = [...sourceIds].filter(id => !targetIds.has(id));

  const getAsset = (id: string) => assets.find(a => a.id === id);
  const getChildren = (id: string) => relationships
    .filter(r => r.sourceAssetId === id && r.type === 'CONTAINS')
    .map(r => getAsset(r.targetAssetId))
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <DemoBanner />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Asset Lineage</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {relationships.length} relationships across {assets.length} assets
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="info">CONTAINS: {relationships.filter(r => r.type === 'CONTAINS').length}</Badge>
          <Badge variant="default">DERIVED_FROM: {relationships.filter(r => r.type === 'DERIVED_FROM').length}</Badge>
          <Badge variant="default">DEPENDS_ON: {relationships.filter(r => r.type === 'DEPENDS_ON').length}</Badge>
        </div>
      </div>

      {/* Visual Tree */}
      <Card title="Asset Hierarchy">
        <div className="space-y-1">
          {rootIds.map(rootId => (
            <TreeNode
              key={rootId}
              assetId={rootId}
              depth={0}
              getAsset={getAsset}
              getChildren={getChildren}
              onNavigate={(id) => navigate(`/catalog/${id}`)}
            />
          ))}
        </div>
      </Card>

      {/* All Relationships Table */}
      <Card title="All Relationships">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {relationships.map(rel => {
                const source = getAsset(rel.sourceAssetId);
                const target = getAsset(rel.targetAssetId);
                return (
                  <tr key={rel.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => source && navigate(`/catalog/${source.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {source?.name ?? rel.sourceAssetId}
                      </button>
                      <span className="text-xs text-gray-400 ml-1">({source?.type})</span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="info">{rel.type}</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => target && navigate(`/catalog/${target.id}`)}
                        className="text-blue-600 hover:underline"
                      >
                        {target?.name ?? rel.targetAssetId}
                      </button>
                      <span className="text-xs text-gray-400 ml-1">({target?.type})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---- Tree Node ----

interface TreeNodeProps {
  assetId: string;
  depth: number;
  getAsset: (id: string) => ReturnType<typeof useCatalog>['assets'][0] | undefined;
  getChildren: (id: string) => Array<ReturnType<typeof useCatalog>['assets'][0] | undefined>;
  onNavigate: (id: string) => void;
}

function TreeNode({ assetId, depth, getAsset, getChildren, onNavigate }: TreeNodeProps) {
  const asset = getAsset(assetId);
  const children = getChildren(assetId).filter(Boolean);

  if (!asset) return null;

  const typeColors: Record<string, string> = {
    DATABASE: 'border-l-blue-500',
    SCHEMA: 'border-l-purple-500',
    TABLE: 'border-l-green-500',
    COLUMN: 'border-l-gray-400',
    DATASET: 'border-l-orange-500',
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 border-l-2 ${typeColors[asset.type] ?? 'border-l-gray-300'} hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer rounded-r transition-colors`}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => onNavigate(asset.id)}
      >
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</span>
        <Badge variant={
          asset.type === 'DATABASE' ? 'info' :
          asset.type === 'SCHEMA' ? 'demo' :
          asset.type === 'TABLE' ? 'success' : 'default'
        }>
          {asset.type}
        </Badge>
        {children.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{children.length} children</span>
        )}
      </div>
      {children.map(child => child && (
        <TreeNode
          key={child.id}
          assetId={child.id}
          depth={depth + 1}
          getAsset={getAsset}
          getChildren={getChildren}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
