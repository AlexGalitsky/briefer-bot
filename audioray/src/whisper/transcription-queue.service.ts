import { Injectable } from '@nestjs/common';

@Injectable()
export class TranscriptionQueueService {
  private chain: Promise<unknown> = Promise.resolve();
  private pendingCount = 0;

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    this.pendingCount++;

    const result = this.chain.then(() => task());
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );

    return result.finally(() => {
      this.pendingCount--;
    });
  }

  getDepth(): number {
    return this.pendingCount;
  }
}
