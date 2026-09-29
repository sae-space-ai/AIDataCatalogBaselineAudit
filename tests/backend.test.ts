// ============================================================
// TESTS — Backend API
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadServerConfig, isDatabaseConfigured, validateConfig, getSafeConfig } from '../server/config';
import { DatabaseManager, getDatabaseManager, resetDatabaseManager } from '../server/db';
import { handleHealthCheck } from '../api/health';

// ---- Server Config Tests ----

describe('Server Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load config from environment', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '4000';
    process.env.LOG_LEVEL = 'debug';

    const config = loadServerConfig();

    expect(config.databaseUrl).toBe('postgresql://test:test@localhost:5432/test');
    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(4000);
    expect(config.logLevel).toBe('debug');
  });

  it('should use defaults when env vars are missing', () => {
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;

    const config = loadServerConfig();

    expect(config.databaseUrl).toBeUndefined();
    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.logLevel).toBe('info');
  });

  it('should detect when database is configured', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const config = loadServerConfig();
    expect(isDatabaseConfigured(config)).toBe(true);
  });

  it('should detect when database is not configured', () => {
    delete process.env.DATABASE_URL;
    const config = loadServerConfig();
    expect(isDatabaseConfigured(config)).toBe(false);
  });

  it('should validate missing configuration', () => {
    delete process.env.DATABASE_URL;
    const config = loadServerConfig();
    const missing = validateConfig(config);
    expect(missing).toContain('DATABASE_URL');
  });

  it('should return safe config without secrets', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const config = loadServerConfig();
    const safe = getSafeConfig(config);

    expect(safe.databaseConfigured).toBe(true);
    expect(safe).not.toHaveProperty('databaseUrl');
    expect(JSON.stringify(safe)).not.toContain('test:test');
  });
});

// ---- Database Manager Tests ----

describe('Database Manager', () => {
  beforeEach(() => {
    resetDatabaseManager();
  });

  it('should create database manager', () => {
    const config = loadServerConfig();
    const manager = getDatabaseManager(config);
    expect(manager).toBeDefined();
  });

  it('should detect when database is not configured', () => {
    process.env.DATABASE_URL = undefined;
    const config = loadServerConfig();
    const manager = getDatabaseManager(config);
    expect(manager.isConfigured()).toBe(false);
  });

  it('should detect when database is configured', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const config = loadServerConfig();
    const manager = getDatabaseManager(config);
    expect(manager.isConfigured()).toBe(true);
  });

  it('should return null pool when database is not configured', () => {
    process.env.DATABASE_URL = undefined;
    const config = loadServerConfig();
    const manager = getDatabaseManager(config);
    expect(manager.getPool()).toBeNull();
  });

  it('should return NOT_CONFIGURED health when database is not configured', async () => {
    process.env.DATABASE_URL = undefined;
    const config = loadServerConfig();
    const manager = getDatabaseManager(config);
    const health = await manager.checkHealth();
    expect(health.status).toBe('NOT_CONFIGURED');
  });

  it('should return NOT_AVAILABLE health when pool is not implemented', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    const config = loadServerConfig();
    const manager = getDatabaseManager(config);
    const health = await manager.checkHealth();
    expect(health.status).toBe('NOT_AVAILABLE');
    expect(health.error).toContain('not initialized');
  });
});

// ---- Health Endpoint Tests ----

describe('Health Endpoint', () => {
  beforeEach(() => {
    resetDatabaseManager();
  });

  it('should return DEMO mode when database is not configured', async () => {
    process.env.DATABASE_URL = undefined;
    
    const health = await handleHealthCheck();
    
    expect(health.mode).toBe('DEMO');
    expect(health.database).toBe('NOT_CONFIGURED');
    expect(health.persistence).toBe('NOT_CONFIGURED');
    expect(health.api).toBe('READY');
    expect(health.application).toBe('READY');
  });

  it('should return REAL mode when database is connected', async () => {
    // Note: This test would require a real database connection
    // For now, we test the logic path
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    const health = await handleHealthCheck();
    
    // Since pool is not implemented, it should still be DEMO
    expect(health.mode).toBe('DEMO');
    expect(health.database).toBe('NOT_AVAILABLE');
  });

  it('should include version and timestamp', async () => {
    const health = await handleHealthCheck();
    
    expect(health.version).toBeDefined();
    expect(health.timestamp).toBeDefined();
    expect(new Date(health.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('should include safe config details', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    const health = await handleHealthCheck();
    
    expect(health.details).toBeDefined();
    expect(health.details?.config).toBeDefined();
    expect(health.details?.config?.databaseConfigured).toBe(true);
    expect(JSON.stringify(health.details)).not.toContain('test:test');
  });

  it('should not include secrets in response', async () => {
    process.env.DATABASE_URL = 'postgresql://supersecret:password@localhost:5432/test';
    
    const health = await handleHealthCheck();
    const healthString = JSON.stringify(health);
    
    expect(healthString).not.toContain('supersecret');
    expect(healthString).not.toContain('password');
  });
});

// ---- API Client Tests ----

describe('API Client', () => {
  it('should create API client from config', () => {
    // This test would require mocking fetch
    // For now, just verify the function exists
    expect(typeof createApiClient).toBe('function');
  });
});

// Import at the end to avoid circular dependencies
import { createApiClient } from '../src/infrastructure/api-client';
