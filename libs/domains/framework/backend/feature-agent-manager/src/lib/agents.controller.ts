import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';

@Controller('agents')
export class AgentsController {
  @Get()
  getAgents(@Query('limit') limit: number, @Query('offset') offset: number) {
    return {
      statusCode: 501,
      message: 'Not Implemented',
    };
  }

  @Post()
  createAgent() {
    return {
      statusCode: 501,
      message: 'Not Implemented',
    };
  }

  @Delete(':id')
  deleteAgent(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return {
      statusCode: 501,
      message: 'Not Implemented',
    };
  }

  @Get(':id/chat')
  getAgentChat(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return {
      statusCode: 501,
      message: 'Not Implemented',
    };
  }
}
