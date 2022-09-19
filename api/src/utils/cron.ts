import cron from 'node-cron';
import { LocationHandlerService } from '../services/LocationHandlerService';
import logger from './logger';

export const initializeCronJob = (locationHandlerService: LocationHandlerService) => {
    // Run a cronjob each minute
    cron.schedule('* * * * *', async () => {
        try {
            logger.info('Running cronjob...');
            await locationHandlerService.sendNotifications();
            logger.info('Finished running cronjob!');
        } catch (err) {
            logger.error('Error occurred during cronjob', err);
        }
    });
};
