/**
 * SVG API TypeScript SDK - Batch Request Optimization
 *
 * Provides intelligent batching of icon requests to minimize
 * API calls through request deduplication and automatic batching.
 */

import type { BatchIconOptions, BatchResponse, BatchItemResult } from "./types";

export interface BatcherConfig {
  maxBatchSize?: number;      // Maximum icons per batch request
  maxWaitMs?: number;         // Maximum time to wait before sending batch
  deduplicate?: boolean;      // Whether to deduplicate identical requests
  autoBatch?: boolean;        // Whether to automatically batch requests
}

export interface PendingRequest {
  options: BatchIconOptions;
  resolve: (value: BatchItemResult) => void;
  reject: (reason: Error) => void;
  addedAt: number;
}

export type BatchExecutor = (options: BatchIconOptions[]) => Promise<BatchResponse>;

/**
 * Smart batcher for icon requests
 */
export class IconBatcher {
  private config: Required<BatcherConfig>;
  private pending: Map<string, PendingRequest>;
  private timeoutId: ReturnType<typeof setTimeout> | null;
  private executor: BatchExecutor;
  private isProcessing: boolean;

  constructor(executor: BatchExecutor, config: BatcherConfig = {}) {
    this.executor = executor;
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 50,
      maxWaitMs: config.maxWaitMs ?? 10,
      deduplicate: config.deduplicate ?? true,
      autoBatch: config.autoBatch ?? true,
    };
    this.pending = new Map();
    this.timeoutId = null;
    this.isProcessing = false;
  }

  /**
   * Generate unique key for request deduplication
   */
  private generateKey(options: BatchIconOptions): string {
    return JSON.stringify({
      name: options.name,
      source: options.source,
      size: options.size,
      color: options.color,
      stroke: options.stroke,
    });
  }

  /**
   * Add a request to the batch queue
   */
  async request(options: BatchIconOptions): Promise<BatchItemResult> {
    if (!this.config.autoBatch) {
      // Execute immediately if auto-batching is disabled
      const response = await this.executor([options]);
      return response.data[0];
    }

    const key = this.generateKey(options);

    // Check for duplicate pending request
    if (this.config.deduplicate && this.pending.has(key)) {
      const existing = this.pending.get(key)!;
      return new Promise((resolve, reject) => {
        existing.resolve.then(
          (result) => resolve(result),
          (err) => reject(err)
        );
      });
    }

    return new Promise((resolve, reject) => {
      this.pending.set(key, {
        options,
        resolve,
        reject,
        addedAt: Date.now(),
      });

      this.scheduleBatch();
    });
  }

  /**
   * Add multiple requests to the batch queue
   */
  async requestMany(optionsArray: BatchIconOptions[]): Promise<BatchItemResult[]> {
    return Promise.all(optionsArray.map((opt) => this.request(opt)));
  }

  /**
   * Flush pending requests immediately
   */
  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    await this.processBatch();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    for (const [, request] of this.pending) {
      request.reject(new Error("Batch request cancelled"));
    }
    this.pending.clear();
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.isProcessing) return;
    
    if (this.pending.size >= this.config.maxBatchSize) {
      // Flush immediately if batch is full
      this.flush();
    } else if (!this.timeoutId) {
      // Schedule flush after maxWaitMs
      this.timeoutId = setTimeout(() => {
        this.timeoutId = null;
        this.processBatch();
      }, this.config.maxWaitMs);
    }
  }

  /**
   * Process the current batch of pending requests
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.pending.size === 0) return;
    
    this.isProcessing = true;
    
    // Collect pending requests
    const batch: PendingRequest[] = [];
    for (const [, request] of this.pending) {
      batch.push(request);
      if (batch.length >= this.config.maxBatchSize) break;
    }

    // Remove from pending
    for (const request of batch) {
      this.pending.delete(this.generateKey(request.options));
    }

    try {
      const options = batch.map((r) => r.options);
      const response = await this.executor(options);

      // Resolve each request with its result
      for (let i = 0; i < batch.length; i++) {
        const result = response.data[i];
        if (result) {
          batch[i].resolve(result);
        } else {
          batch[i].reject(new Error("No result returned for request"));
        }
      }
    } catch (error) {
      // Reject all requests on batch failure
      const err = error instanceof Error ? error : new Error(String(error));
      for (const request of batch) {
        request.reject(err);
      }
    } finally {
      this.isProcessing = false;
      
      // Process remaining pending requests
      if (this.pending.size > 0) {
        this.scheduleBatch();
      }
    }
  }
}

/**
 * Chunk an array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deduplicate batch icon options
 */
export function deduplicateBatchOptions(
  options: BatchIconOptions[]
): { unique: BatchIconOptions[]; indices: number[] } {
  const seen = new Map<string, number>();
  const unique: BatchIconOptions[] = [];
  const indices: number[] = [];

  for (const opt of options) {
    const key = JSON.stringify({
      name: opt.name,
      source: opt.source,
      size: opt.size,
      color: opt.color,
      stroke: opt.stroke,
    });

    if (seen.has(key)) {
      indices.push(seen.get(key)!);
    } else {
      const index = unique.length;
      seen.set(key, index);
      unique.push(opt);
      indices.push(index);
    }
  }

  return { unique, indices };
}

/**
 * Merge batch responses for deduplicated requests
 */
export function mergeBatchResponses(
  results: BatchItemResult[],
  indices: number[]
): BatchItemResult[] {
  return indices.map((idx) => results[idx]);
}
