import { Module } from '@nestjs/common';
import { EventsGateway } from './events-gateway.service';

@Module({
  imports: [],
  controllers: [],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
