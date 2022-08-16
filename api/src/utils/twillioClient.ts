import { IConfig } from './config';
import twilio from 'twilio';

let twilioClient: twilio.Twilio;

export const getTwilioClient = (config: IConfig) => {
    if (twilioClient) {
        return twilioClient;
    }

    twilioClient = twilio(config.notification.twilio.accountSid, config.notification.twilio.authToken);
    return twilioClient;
};
