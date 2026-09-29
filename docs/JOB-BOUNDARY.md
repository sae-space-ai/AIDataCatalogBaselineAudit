# Job Boundary

## Current State

**Job System**: NOT IMPLEMENTED  
**Current Mode**: Synchronous client-side execution  
**Future**: Asynchronous job processing

## Tasks Requiring Asynchronous Execution

### High Priority

1. **Source Scanning**
   - Can take minutes for large databases
   - Must not block UI
   - Requires progress tracking
   - Must be cancellable

2. **Metadata Extraction**
   - Extract schema information
   - Sample data for statistics
   - Can be resource-intensive
   - May require external API calls

3. **Classification**
   - Rule-based classification (fast)
   - ML-based classification (slow, future)
   - Batch processing of many assets
   - May require model inference

4. **Quality Evaluation**
   - Calculate statistics
   - Run multiple checks per asset
   - Can be parallelized
   - May require data sampling

### Medium Priority

5. **Lineage Processing**
   - Build relationship graph
   - Detect cycles
   - Calculate impact analysis
   - Update downstream dependencies

6. **Trust Score Calculation**
   - Aggregate multiple factors
   - Recalculate on changes
   - Batch updates

7. **Policy Evaluation**
   - Evaluate rules against assets
   - Generate violations
   - Trigger notifications

### Future (Not Implemented)

8. **AI Inference**
   - LLM-based classification
   - Semantic search indexing
   - Anomaly detection
   - Drift monitoring

9. **Drift Monitoring**
   - Compare current vs historical
   - Detect schema changes
   - Detect quality degradation
   - Generate alerts

## Job Characteristics

### Long-Running Jobs
- Source scanning (minutes to hours)
- Large dataset processing
- ML model inference
- Complex lineage analysis

### Recurring Jobs
- Periodic scans (daily/weekly)
- Quality checks (hourly)
- Trust score recalculation (on change)
- Policy evaluation (on change)

### Event-Driven Jobs
- Classification on asset discovery
- Quality check on data change
- Trust score on classification update
- Lineage update on relationship change

## Job States

```
PENDING    → Job created, waiting to start
QUEUED     → Job in queue, waiting for worker
RUNNING    → Job executing
SUCCESS    → Job completed successfully
FAILED     → Job failed with error
CANCELLED  → Job cancelled by user
TIMEOUT    → Job exceeded time limit
```

## Job Metadata

```typescript
interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: unknown;
  result?: unknown;
  error?: string;
  progress?: number; // 0-100
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
}
```

## Progress Tracking

Long-running jobs must report progress:

```typescript
interface JobProgress {
  jobId: string;
  progress: number; // 0-100
  message: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
}
```

## Cancellation

Jobs must support cancellation:
- Check cancellation flag periodically
- Clean up resources on cancel
- Update job status to CANCELLED
- Rollback partial changes if needed

## Retry Strategy

```typescript
interface RetryStrategy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}
```

## Job Queue Options (Conceptual)

### Redis-based Queue
**Pros:**
- Fast, in-memory
- Pub/sub for progress
- Mature ecosystem (Bull, BullMQ)

**Cons:**
- Requires Redis instance
- Not durable by default
- Scaling complexity

### Database-based Queue
**Pros:**
- Uses existing database
- Durable by default
- Simple to implement

**Cons:**
- Slower than Redis
- Polling overhead
- Database load

### Cloud Queue Services
**Pros:**
- Managed service
- Auto-scaling
- High durability

**Cons:**
- Vendor lock-in
- Cost at scale
- Additional complexity

## Current Implementation Notes

The current application executes all operations synchronously:
- Scan runs in main thread
- Blocks UI during execution
- No progress tracking
- No cancellation support
- No retry logic

## Migration Path

1. Identify long-running operations
2. Extract to job handlers
3. Implement job queue (choose provider)
4. Add progress tracking
5. Add cancellation support
6. Update UI to poll job status
7. Add retry logic
8. Monitor job performance

## No Provider Selected

This document intentionally does not select a specific job queue provider. The job pattern allows implementation with any queue system that supports the required operations.
