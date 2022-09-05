import { IConfig } from '../utils/config';
import { IPlwd } from '../models/Plwd';
import { IUser } from '../models/User';
import { MailServiceInterface } from '../services/MailService';

export class MockMailService implements MailServiceInterface {
    private readonly mailClient: any;

    constructor(private readonly config: IConfig) {
        this.mailClient = {
            send: (params: any) => {
                console.warn(params);
            },
        };
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
