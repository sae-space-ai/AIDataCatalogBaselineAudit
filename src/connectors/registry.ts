// ============================================================
// CONNECTORS — Connector Registry
// ============================================================

import type {
  ConnectorDefinition,
  ConnectorCapability,
  ConnectorCategory,
  ConnectorImplementationLevel,
} from './types';

export class ConnectorRegistry {
  private connectors: Map<string, ConnectorDefinition> = new Map();

  register(definition: ConnectorDefinition): void {
    if (this.connectors.has(definition.id)) {
      throw new Error(`Connector ${definition.id} already registered`);
    }
    this.connectors.set(definition.id, definition);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }

  get(id: string): ConnectorDefinition | undefined {
    return this.connectors.get(id);
  }

  list(): ConnectorDefinition[] {
    return Array.from(this.connectors.values());
  }

  listByCategory(category: ConnectorCategory): ConnectorDefinition[] {
    return this.list().filter(c => c.category === category);
  }

  listByImplementationLevel(level: ConnectorImplementationLevel): ConnectorDefinition[] {
    return this.list().filter(c => c.implementationLevel === level);
  }

  listByCapability(capability: ConnectorCapability): ConnectorDefinition[] {
    return this.list().filter(c => c.capabilities.includes(capability));
  }

  hasCapability(id: string, capability: ConnectorCapability): boolean {
    const connector = this.get(id);
    if (!connector) return false;
    return connector.capabilities.includes(capability);
  }

  getCapabilities(id: string): ConnectorCapability[] {
    const connector = this.get(id);
    if (!connector) return [];
    return connector.capabilities;
  }

  validate(id: string): { valid: boolean; errors: string[] } {
    const connector = this.get(id);
    if (!connector) {
      return { valid: false, errors: ['Connector not found'] };
    }

    const errors: string[] = [];

    if (!connector.id) errors.push('ID is required');
    if (!connector.name) errors.push('Name is required');
    if (!connector.version) errors.push('Version is required');
    if (!connector.category) errors.push('Category is required');

    if (connector.implementationLevel === 'IMPLEMENTED' && connector.capabilities.length === 0) {
      errors.push('IMPLEMENTED connector must declare at least one capability');
    }

    return { valid: errors.length === 0, errors };
  }
}
