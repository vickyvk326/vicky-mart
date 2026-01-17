import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { EventsModule } from 'src/core/events/events.module';
import { BrowserManagerService } from './browser-manager/browser-manager.service';
import { JobEntity } from './entity/job.entity';
import { ScraperEngineService } from './scraper-engine/scraper-engine.service';
import { ScraperController } from './scraper.controller';

@Module({
  imports: [EventsModule, MikroOrmModule.forFeature([JobEntity])],
  providers: [ScraperEngineService, BrowserManagerService],
  controllers: [ScraperController],
  exports: [MikroOrmModule],
})
export class ScraperModule {}
