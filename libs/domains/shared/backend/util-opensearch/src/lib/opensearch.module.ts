import { Global, Module } from '@nestjs/common';

import { OpenSearchService } from './opensearch.service';

@Global()
@Module({
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
