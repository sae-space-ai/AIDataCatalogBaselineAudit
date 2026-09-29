# Security Boundary

## Current State

**Authentication**: NOT IMPLEMENTED  
**Authorization**: NOT IMPLEMENTED  
**Secret Management**: NOT IMPLEMENTED (credential references only)  
**Current Mode**: Client-side demo, no real secrets

## Security Principles

### 1. Secrets Never in Frontend

**Rule**: Never store actual credentials in frontend code or browser storage.

**Current Implementation**:
- DataSource configuration stores `credentialRef` (reference only)
- Actual credentials stored in external secret manager (future)
- Frontend never sees actual passwords/tokens

**Example**:
```typescript
// CORRECT: Reference only
interface PostgresConfiguration {
  kind: 'POSTGRESQL';
  host: string;
  port: number;
  database: string;
  credentialRef: string; // Reference to secret store
}

// WRONG: Never do this
interface PostgresConfiguration {
  kind: 'POSTGRESQL';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string; // NEVER store in frontend
}
```

### 2. Least Privilege

**Rule**: Each component operates with minimum required permissions.

**Future Implementation**:
- Service accounts with specific permissions
- API keys scoped to specific operations
- User roles with granular permissions
- Connector isolation (each connector has own credentials)

### 3. Auditability

**Rule**: All security-relevant operations must be auditable.

**Current Implementation**:
- AuditEvent records all operations
- EvidenceRecord provides proof of operations
- Classification reviews are tracked
- Scan operations are logged

**Future Implementation**:
- Authentication events logged
- Authorization decisions logged
- Secret access logged
- Failed attempts logged

### 4. Connector Isolation

**Rule**: Each data source connector operates independently.

**Current Implementation**:
- DemoConnector has no real credentials
- Connectors are isolated by design
- Each source has own configuration

**Future Implementation**:
- Each connector has own credentials
- Credentials scoped to specific database/schema
- Connector failures don't affect others
- Credential rotation per connector

## Sensitive Data Handling

### Classification Results

**Sensitivity**: HIGH (contains PII detection)

**Current Implementation**:
- Classification stored in InMemoryRepository
- Lost on page reload
- No access control

**Future Implementation**:
- Encrypted at rest
- Access-controlled by role
- Audit all access
- Retention policy

### Audit Events

**Sensitivity**: MEDIUM (contains actor information)

**Current Implementation**:
- Stored in InMemoryRepository
- Actor is hardcoded or "user"
- No tamper protection

**Future Implementation**:
- Append-only (immutable)
- Tamper-evident (hash chain)
- Access-controlled
- Long-term retention

### DataSource Configuration

**Sensitivity**: HIGH (contains credential references)

**Current Implementation**:
- Configuration stored in InMemoryRepository
- Only credential references (not actual credentials)
- No encryption

**Future Implementation**:
- Credential references encrypted
- Actual credentials in secret manager
- Access-controlled
- Audit all access

## Authentication Boundary (Future)

### Authentication Methods

1. **Email/Password**
   - Standard user authentication
   - Password hashing (bcrypt/argon2)
   - Email verification

2. **OAuth/OIDC**
   - Google, GitHub, Microsoft
   - Enterprise SSO (SAML)
   - Social login

3. **API Keys**
   - Service account authentication
   - Programmatic access
   - Scoped permissions

4. **JWT Tokens**
   - Stateless authentication
   - Short-lived access tokens
   - Refresh token rotation

### Session Management

```typescript
interface Session {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
  expiresAt: string;
  createdAt: string;
}
```

## Authorization Boundary (Future)

### Role-Based Access Control (RBAC)

```typescript
type UserRole = 'admin' | 'steward' | 'analyst' | 'viewer';

interface RolePermissions {
  admin: ['*']; // All permissions
  steward: ['assets:*', 'classifications:*', 'policies:*', 'sources:read'];
  analyst: ['assets:read', 'classifications:read', 'sources:read'];
  viewer: ['assets:read'];
}
```

### Permission Checks

```typescript
// Example: Check if user can edit asset
function canEditAsset(user: User, asset: Asset): boolean {
  return user.permissions.includes('assets:write') ||
         user.id === asset.owner;
}
```

### Resource-Level Permissions

**Future Implementation**:
- Asset ownership
- Domain-based access
- Classification-based restrictions
- Row-level security in database

## Secret Management (Future)

### Secret Storage Options

1. **Cloud Secret Managers**
   - AWS Secrets Manager
   - GCP Secret Manager
   - Azure Key Vault
   - Supabase Vault

2. **Self-Hosted**
   - HashiCorp Vault
   - SOPS
   - Encrypted environment variables

### Secret Lifecycle

```
CREATE → STORE → ROTATE → REVOKE → DELETE
```

### Secret Rotation

**Automated Rotation**:
- Database passwords (every 90 days)
- API keys (every 30 days)
- Service account tokens (every 7 days)

**Manual Rotation**:
- Emergency rotation on breach
- Scheduled maintenance rotation

## Input Validation

### Current Implementation

- TypeScript type checking
- Runtime validation in services
- No SQL injection (no SQL yet)

### Future Implementation

- Input sanitization
- Parameterized queries
- ORM validation
- Rate limiting
- CSRF protection

## Data Encryption

### At Rest (Future)

- Database encryption (TDE)
- Field-level encryption for sensitive data
- Encrypted backups
- Encrypted logs

### In Transit (Future)

- HTTPS only
- TLS 1.3
- Certificate pinning
- HSTS headers

## Security Monitoring (Future)

### Logging

- Authentication attempts (success/failure)
- Authorization decisions
- Secret access
- API calls
- Error rates
- Anomaly detection

### Alerting

- Failed login attempts (brute force)
- Unauthorized access attempts
- Secret access anomalies
- Unusual API patterns
- Configuration changes

### Incident Response

1. **Detection**: Monitor logs and alerts
2. **Containment**: Revoke compromised credentials
3. **Investigation**: Analyze audit logs
4. **Remediation**: Fix vulnerabilities
5. **Recovery**: Restore from backup if needed
6. **Post-mortem**: Document and improve

## Current Limitations

1. **No Authentication**: Anyone can access the application
2. **No Authorization**: No permission checks
3. **No Encryption**: Data stored in plaintext (InMemory)
4. **No Audit Protection**: Audit logs can be modified
5. **No Secret Management**: No real credentials yet

## Migration Path

1. Implement authentication (start with email/password)
2. Add basic RBAC (admin/viewer)
3. Implement secret management
4. Add encryption at rest
5. Implement audit log protection
6. Add OAuth/OIDC support
7. Implement fine-grained permissions
8. Add security monitoring

## No Provider Selected

This document intentionally does not select specific security providers. The security patterns allow implementation with any authentication/authorization system that supports the required operations.
