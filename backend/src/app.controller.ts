import { Controller, Get, NotFoundException } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  notFound() {
    throw new NotFoundException();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
