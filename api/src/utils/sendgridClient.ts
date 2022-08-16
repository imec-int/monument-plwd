import { IConfig } from './config';
import mailClient from '@sendgrid/mail';

let sendgridClient: mailClient.MailService;

export const getSendgridClient = (config: IConfig) => {
    if (sendgridClient) {
        return sendgridClient;
    }

    sendgridClient = mailClient;

    sendgridClient.setApiKey(config.notification.sendgrid.apiKey);
    return sendgridClient;
};
