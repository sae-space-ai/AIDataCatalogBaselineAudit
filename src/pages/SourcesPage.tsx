// ============================================================
// PAGES — Sources
// ============================================================

import { useState } from 'react';
import { useCatalog } from '../app/CatalogContext';
import { Card, Badge, Button, EmptyState, DemoBanner } from '../components/ui';
import { formatDate, timeAgo } from '../lib/utils';
import type { DataSource } from '../types';
import type { ConnectionTestResult } from '../domain/contracts';

export function SourcesPage() {
  const { sources, scanRuns, createDemoSource, testConnection, runScan } = useCatalog();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDesc, setNewSourceDesc] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newSourceName.trim()) return;
    createDemoSource(newSourceName.trim(), newSourceDesc.trim() || undefined);
    setNewSourceName('');
    setNewSourceDesc('');
    setShowCreateForm(false);
  };

  const handleTestConnection = async (sourceId: string) => {
    setTestingId(sourceId);
    setConnectionResult(null);
    try {
      const result = await testConnection(sourceId);
      setConnectionResult(result);
    } catch (err) {
      setConnectionResult({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setTestingId(null);
    }
  };

  const handleScan = async (sourceId: string) => {
    setScanningId(sourceId);
    setScanMessage(null);
    try {
      const result = await runScan(sourceId);
      if (result.scanRun.status === 'SUCCESS') {
        setScanMessage(
          `Scan complete: ${result.assetsCreated} assets created, ${result.relationshipsCreated} relationships, ${result.classificationsCreated} classifications, ${result.qualityChecksCreated} quality checks.`
        );
      } else {
        setScanMessage(`Scan failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setScanMessage(`Scan error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setScanningId(null);
    }
  };

  const getSourceScans = (sourceId: string) => {
    return scanRuns.filter(s => s.sourceId === sourceId);
  };

  return (
    <div className="space-y-6">
      <DemoBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Sources</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage connections to your data infrastructure.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          + New Demo Source
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card title="Create Demo Source">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newSourceName}
                onChange={e => setNewSourceName(e.target.value)}
                placeholder="e.g., Demo Customers DB"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newSourceDesc}
                onChange={e => setNewSourceDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!newSourceName.trim()}>
                Create Source
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Connection Test Result */}
      {connectionResult && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          connectionResult.success
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <p className="font-medium">{connectionResult.success ? '✓ Connection Successful' : '✗ Connection Failed'}</p>
          <p className="mt-1 text-xs opacity-80">{connectionResult.message}</p>
          {connectionResult.latencyMs && (
            <p className="mt-1 text-xs opacity-60">Latency: {connectionResult.latencyMs}ms</p>
          )}
        </div>
      )}

      {/* Scan Message */}
      {scanMessage && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          scanMessage.startsWith('Scan complete')
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {scanMessage}
        </div>
      )}

      {/* Sources List */}
      {sources.length === 0 ? (
        <Card>
          <EmptyState
            title="No data sources"
            description="Create a demo source to start discovering assets and building your catalog."
            action={
              <Button onClick={() => setShowCreateForm(true)}>
                + Create Demo Source
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {sources.map(source => (
            <SourceCard
              key={source.id}
              source={source}
              scans={getSourceScans(source.id)}
              onTestConnection={() => handleTestConnection(source.id)}
              onScan={() => handleScan(source.id)}
              testing={testingId === source.id}
              scanning={scanningId === source.id}
            />
          ))}
        </div>
      )}

      {/* PostgreSQL Status */}
      <Card title="PostgreSQL Connector">
        <div className="flex items-center gap-3">
          <Badge variant="warning">ADAPTER_READY</Badge>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            PostgreSQL connector is architecturally ready but requires a live database connection (DATABASE_URL) to operate.
            No credentials are currently configured.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ---- Source Card ----

interface SourceCardProps {
  source: DataSource;
  scans: Array<{ id: string; status: string; startedAt: string; assetsDiscovered: number; error?: string }>;
  onTestConnection: () => void;
  onScan: () => void;
  testing: boolean;
  scanning: boolean;
}

function SourceCard({ source, scans, onTestConnection, onScan, testing, scanning }: SourceCardProps) {
  const statusVariant = source.status === 'ACTIVE' ? 'success' :
                        source.status === 'ERROR' ? 'danger' :
                        source.status === 'NOT_CONNECTED' ? 'warning' : 'default';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{source.name}</h3>
            <Badge variant="demo">DEMO</Badge>
            <Badge variant={statusVariant}>{source.status}</Badge>
          </div>
          {source.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{source.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Type: {source.type}</span>
            <span>Created: {formatDate(source.createdAt)}</span>
            {source.lastScanAt && <span>Last scan: {timeAgo(source.lastScanAt)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTestConnection}
            loading={testing}
          >
            Test Connection
          </Button>
          <Button
            size="sm"
            onClick={onScan}
            loading={scanning}
          >
            Run Scan
          </Button>
        </div>
      </div>

      {/* Scan History */}
      {scans.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Scan History</p>
          <div className="space-y-1">
            {scans.slice(0, 3).map(scan => (
              <div key={scan.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    scan.status === 'SUCCESS' ? 'bg-green-500' :
                    scan.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-gray-600 dark:text-gray-400">{scan.status}</span>
                  <span className="text-gray-400">{scan.assetsDiscovered} assets</span>
                </div>
                <span className="text-gray-400">{timeAgo(scan.startedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
