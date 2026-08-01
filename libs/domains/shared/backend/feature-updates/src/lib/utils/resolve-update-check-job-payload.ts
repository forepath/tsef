import type { Job } from 'bullmq';

import type { UpdateCheckJobPayload } from '../interfaces/updates.interfaces';

export function resolveUpdateCheckJobPayload(job: Job<UpdateCheckJobPayload>): UpdateCheckJobPayload {
  return {
    ...job.data,
  };
}
