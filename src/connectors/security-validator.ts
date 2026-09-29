// ============================================================
// CONNECTORS — Security Validator
// ============================================================

import type { ConnectorDefinition, ConfigurationSchema } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ConnectorSecurityValidator ensures that connector configurations
 * are safe and comply with security policies.
 */
export class ConnectorSecurityValidator {
  /**
   * Validate a connector configuration against its schema.
   */
  validateConfiguration(
    definition: ConnectorDefinition,
    configuration: Record<string, unknown>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of definition.configurationSchema.fields) {
      if (field.required && (configuration[field.name] === undefined || configuration[field.name] === null || configuration[field.name] === '')) {
        errors.push(`Required field missing: ${field.name}`);
      }
    }

    // Check for sensitive data in non-sensitive fields
    for (const field of definition.configurationSchema.fields) {
      if (!field.sensitive) {
        const value = configuration[field.name];
        if (typeof value === 'string' && this.looksLikeSecret(value)) {
          errors.push(`Field ${field.name} appears to contain sensitive data but is not marked as sensitive`);
        }
      }
    }

    // Check for dangerous configurations
    if (this.hasDangerousOptions(configuration)) {
      errors.push('Configuration contains dangerous options');
    }

    // Check read-only enforcement
    if (definition.readOnlySupport && this.hasWriteOperations(configuration)) {
      errors.push('Connector is read-only but configuration includes write operations');
    }

    // Check for SSRF risks in REST API connectors
    if (definition.category === 'REST_API') {
      const url = configuration['baseUrl'] as string;
      if (url && this.isDangerousUrl(url)) {
        errors.push('REST API URL points to dangerous destination');
      }
    }

    // Check for file path traversal
    if (definition.category === 'FILE') {
      const path = configuration['path'] as string;
      if (path && this.hasPathTraversal(path)) {
        errors.push('File path contains traversal sequences');
      }
    }

    // Warnings for missing optional security features
    if (!definition.secretRequirements.length && definition.category !== 'FILE') {
      warnings.push('Connector has no secret requirements - ensure this is intentional');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a value looks like a secret (password, token, key).
   */
  private looksLikeSecret(value: string): boolean {
    const secretPatterns = [
      /^sk-[a-zA-Z0-9]{20,}/, // OpenAI-style keys
      /^ghp_[a-zA-Z0-9]{36}/, // GitHub tokens
      /^AKIA[0-9A-Z]{16}/, // AWS access keys
      /^password/i,
      /^token/i,
      /^secret/i,
      /^key/i,
    ];

    return secretPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if configuration has dangerous options.
   */
  private hasDangerousOptions(configuration: Record<string, unknown>): boolean {
    const dangerousKeys = ['allowDrop', 'allowDelete', 'allowAlter', 'allowCreate', 'unsafeMode'];
    return dangerousKeys.some(key => configuration[key] === true);
  }

  /**
   * Check if configuration includes write operations.
   */
  private hasWriteOperations(configuration: Record<string, unknown>): boolean {
    const writeOps = ['insert', 'update', 'delete', 'drop', 'alter', 'create'];
    const operations = configuration['operations'] as string[] | undefined;
    
    if (!operations) return false;
    
    return operations.some(op => writeOps.includes(op.toLowerCase()));
  }

  /**
   * Check if a URL is dangerous (localhost, metadata services, private IPs).
   */
  private isDangerousUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return true;
      }

      // Block cloud metadata services
      if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
        return true;
      }

      // Block private IP ranges
      if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
        return true;
      }

      return false;
    } catch {
      return true; // Invalid URL is dangerous
    }
  }

  /**
   * Check if a file path contains traversal sequences.
   */
  private hasPathTraversal(path: string): boolean {
    return path.includes('..') || path.includes('~') || path.startsWith('/etc/') || path.startsWith('/proc/');
  }

  /**
   * Redact sensitive information from configuration for logging.
   */
  redactConfiguration(
    definition: ConnectorDefinition,
    configuration: Record<string, unknown>
  ): Record<string, unknown> {
    const redacted = { ...configuration };

    for (const field of definition.configurationSchema.fields) {
      if (field.sensitive && redacted[field.name] !== undefined) {
        redacted[field.name] = '[REDACTED]';
      }
    }

    // Also redact known secret fields
    const secretFields = ['password', 'token', 'secret', 'apiKey', 'accessKey', 'secretKey'];
    for (const field of secretFields) {
      if (redacted[field] !== undefined) {
        redacted[field] = '[REDACTED]';
      }
    }

    return redacted;
  }

  /**
   * Validate that a connector respects read-only constraints.
   */
  validateReadOnlyEnforcement(definition: ConnectorDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!definition.readOnlySupport) {
      warnings.push('Connector does not declare read-only support');
    }

    if (definition.supportedOperations.includes('WRITE')) {
      errors.push('Connector declares WRITE operations but should be read-only');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
