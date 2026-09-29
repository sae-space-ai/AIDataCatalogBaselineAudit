// ============================================================
// INFRASTRUCTURE — In-Memory Repository Implementations
// ============================================================

import type {
  Asset,
  AssetRelationship,
  AssetVersion,
  AuditEvent,
  Classification,
  DataSource,
  EvidenceRecord,
  QualityResult,
  ScanRun,
  SearchQuery,
  SearchResult,
  TrustScore,
} from '../types';
import type {
  AssetRepository,
  AssetVersionRepository,
  AuditRepository,
  ClassificationRepository,
  EvidenceRepository,
  QualityRepository,
  RelationshipRepository,
  ScanRepository,
  SourceRepository,
  TrustScoreRepository,
} from '../domain/contracts';

export class InMemoryAssetRepository implements AssetRepository {
  private items: Map<string, Asset> = new Map();

  getAll(): Asset[] {
    return Array.from(this.items.values());
  }

  getById(id: string): Asset | undefined {
    return this.items.get(id);
  }

  getBySourceId(sourceId: string): Asset[] {
    return this.getAll().filter(a => a.sourceId === sourceId);
  }

  save(asset: Asset): void {
    this.items.set(asset.id, { ...asset });
  }

  saveMany(assets: Asset[]): void {
    for (const asset of assets) {
      this.items.set(asset.id, { ...asset });
    }
  }

  update(id: string, updates: Partial<Asset>): Asset | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  search(query: SearchQuery): SearchResult {
    let results = this.getAll();

    if (query.text) {
      const lower = query.text.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(lower) ||
        a.qualifiedName.toLowerCase().includes(lower) ||
        (a.description?.toLowerCase().includes(lower) ?? false)
      );
    }

    if (query.type) {
      results = results.filter(a => a.type === query.type);
    }

    if (query.sourceId) {
      results = results.filter(a => a.sourceId === query.sourceId);
    }

    if (query.sensitivity) {
      results = results.filter(a => a.sensitivity === query.sensitivity);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return {
      assets: paged,
      total: results.length,
      page,
      pageSize,
    };
  }
}

export class InMemoryAssetVersionRepository implements AssetVersionRepository {
  private items: AssetVersion[] = [];

  getByAssetId(assetId: string): AssetVersion[] {
    return this.items
      .filter(v => v.assetId === assetId)
      .sort((a, b) => b.version - a.version);
  }

  save(version: AssetVersion): void {
    this.items.push({ ...version });
  }
}

export class InMemoryRelationshipRepository implements RelationshipRepository {
  private items: AssetRelationship[] = [];

  getAll(): AssetRelationship[] {
    return [...this.items];
  }

  getByAssetId(assetId: string): AssetRelationship[] {
    return this.items.filter(
      r => r.sourceAssetId === assetId || r.targetAssetId === assetId
    );
  }

  save(relationship: AssetRelationship): void {
    this.items.push({ ...relationship });
  }

  saveMany(relationships: AssetRelationship[]): void {
    for (const r of relationships) {
      this.items.push({ ...r });
    }
  }

  getUpstream(assetId: string): AssetRelationship[] {
    return this.items.filter(r => r.targetAssetId === assetId);
  }

  getDownstream(assetId: string): AssetRelationship[] {
    return this.items.filter(r => r.sourceAssetId === assetId);
  }
}

export class InMemorySourceRepository implements SourceRepository {
  private items: Map<string, DataSource> = new Map();

  getAll(): DataSource[] {
    return Array.from(this.items.values());
  }

  getById(id: string): DataSource | undefined {
    return this.items.get(id);
  }

  save(source: DataSource): void {
    this.items.set(source.id, { ...source });
  }

  update(id: string, updates: Partial<DataSource>): DataSource | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

export class InMemoryScanRepository implements ScanRepository {
  private items: Map<string, ScanRun> = new Map();

  getAll(): ScanRun[] {
    return Array.from(this.items.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  getBySourceId(sourceId: string): ScanRun[] {
    return this.getAll().filter(s => s.sourceId === sourceId);
  }

  getById(id: string): ScanRun | undefined {
    return this.items.get(id);
  }

  save(scan: ScanRun): void {
    this.items.set(scan.id, { ...scan });
  }

  update(id: string, updates: Partial<ScanRun>): ScanRun | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.items.set(id, updated);
    return updated;
  }
}

export class InMemoryClassificationRepository implements ClassificationRepository {
  private items: Map<string, Classification> = new Map();

  getAll(): Classification[] {
    return Array.from(this.items.values());
  }

  getByAssetId(assetId: string): Classification[] {
    return this.getAll().filter(c => c.assetId === assetId);
  }

  save(classification: Classification): void {
    this.items.set(classification.id, { ...classification });
  }

  update(id: string, updates: Partial<Classification>): Classification | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.items.set(id, updated);
    return updated;
  }
}

export class InMemoryQualityRepository implements QualityRepository {
  private items: QualityResult[] = [];

  getAll(): QualityResult[] {
    return [...this.items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getByAssetId(assetId: string): QualityResult[] {
    return this.items.filter(r => r.assetId === assetId);
  }

  save(result: QualityResult): void {
    this.items.push({ ...result });
  }
}

export class InMemoryEvidenceRepository implements EvidenceRepository {
  private items: EvidenceRecord[] = [];

  getAll(): EvidenceRecord[] {
    return [...this.items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getBySubjectId(subjectId: string): EvidenceRecord[] {
    return this.items.filter(e => e.subjectId === subjectId);
  }

  save(record: EvidenceRecord): void {
    this.items.push({ ...record });
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private items: AuditEvent[] = [];

  getAll(): AuditEvent[] {
    return [...this.items].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getByResourceId(resourceId: string): AuditEvent[] {
    return this.items.filter(e => e.resourceId === resourceId);
  }

  save(event: AuditEvent): void {
    this.items.push({ ...event });
  }
}

export class InMemoryTrustScoreRepository implements TrustScoreRepository {
  private items: Map<string, TrustScore> = new Map();

  getByAssetId(assetId: string): TrustScore | undefined {
    return this.items.get(assetId);
  }

  save(score: TrustScore): void {
    this.items.set(score.assetId, { ...score });
  }

  getAll(): TrustScore[] {
    return Array.from(this.items.values());
  }
}
