import { ScraperAction, ScraperParamsDto } from 'src/scraper/dto/flows.dto';
import { JobStatus } from 'src/scraper/entity/job.entity';

export interface Flow {
  name: string;
  action: ScraperAction;
  params: ScraperParamsDto;
}

export type Flows = Flow[];

export type flowResult = {
  status: JobStatus;
  action: ScraperAction;
  data: any;
};
