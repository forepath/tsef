import { AgentsController, AgentsGateway } from '@forepath/framework/backend';
import { Module } from '@nestjs/common';

@Module({
  controllers: [AgentsController],
  providers: [AgentsGateway],
})
export class AppModule {}
