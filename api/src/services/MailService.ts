import { getSendgridClient } from '../utils/sendgridClient';
import { IConfig } from '../utils/config';
import { MailService as SendGridMailService } from '@sendgrid/mail';
import { IUser } from '../models/User';
import { IPlwd } from '../models/Plwd';

export interface MailServiceInterface {
    sendCarecircleInvite({ user, plwd }: { user: IUser; plwd: IPlwd }): Promise<void>;
}

export class MailService implements MailServiceInterface {
    private mailClient: SendGridMailService;

    constructor(private readonly config: IConfig) {
        this.mailClient = getSendgridClient(config);
    }

    async sendCarecircleInvite({ user, plwd }: { user: IUser; plwd: IPlwd }) {
        await this.mailClient.send({
            to: user.email,
            subject: 'Monument carecircle invitation',
            from: this.config.notification.sendgrid.from,
            text: `
                Hi ${user.firstName}, you have been invited to the carecircle of ${plwd.firstName} ${plwd.lastName}.
                You can access the web application via this link: ${this.config.notification.baseUrl}.
            `,
        });
    }
}
