import { getSendgridClient } from './../utils/sendgridClient';
import { getTwilioClient } from './../utils/twillioClient';
import { format } from 'date-fns';
import { NotificationRepository } from './../repositories/NotificationRepository';
import { INotificationType } from '../models/Notification';
import logger from '../utils/logger';
import { CalendarEventWithContacts } from '../models/CalendarEvent';
import twilio from 'twilio';
import { IConfig } from '../utils/config';
import mailClient from '@sendgrid/mail';
import { IPlwd } from '../models/Plwd';
import { IExternalContact } from 'src/models/ExternalContact';
import { ICarecircleMember } from 'src/models/CarecircleMember';

type Recipient = ICarecircleMember | IExternalContact;

export interface INotifyForEventNotificationService {
    allowResend?: boolean;
    event: CalendarEventWithContacts;
    plwd: IPlwd;
    recipients: Recipient[];
}

export interface INotifyForEventNotificationDelegate {
    allowResend?: boolean;
    event: CalendarEventWithContacts;
    plwd: IPlwd;
    recipients: Recipient[];
}

type LogMessage = {
    contactId: string;
    serviceName: string;
    plwdId: string;
    eventId: string;
};

export const wasAlreadyNotifiedForEventLogMessage = ({ contactId, serviceName, eventId, plwdId }: LogMessage) =>
    `Contact person [${contactId}] was already notified via [${serviceName}] for event [${eventId}] and PLWD [${plwdId}]`;

export const sentNotificationForEventLogMessage = ({ contactId, serviceName, plwdId, eventId }: LogMessage) =>
    `Contact person [${contactId}] was notified via [${serviceName}] that PLWD [${plwdId}] has not arrived yet for event [${eventId}]`;

export const constructNotificationMessage = ({
    baseUrl,
    calendarEvent,
    contactPersons,
    plwd,
    recipient,
}: {
    baseUrl: string;
    calendarEvent: CalendarEventWithContacts;
    contactPersons: (ICarecircleMember | IExternalContact)[];
    plwd: IPlwd;
    recipient: Recipient;
}) => `
Hi ${recipient.user.firstName} ${recipient.user.lastName},
        
${plwd.firstName} ${plwd.lastName} is late for the appointment "${calendarEvent.title}" that was planned today at ${
    calendarEvent.address.description
} (${format(new Date(calendarEvent.startTime), 'HH:mm')} - ${format(new Date(calendarEvent.endTime), 'HH:mm')}).

It is possible that ${plwd.firstName} ${plwd.lastName} got lost.

Via this link ${baseUrl}location/track/${calendarEvent.id} you have access to ${plwd.firstName} ${plwd.lastName}${
    plwd.lastName.endsWith('s') ? "'" : "'s"
} location.

${plwd.phone ? `Via this number ${plwd.phone} you can contact ${plwd.firstName} ${plwd.lastName}.` : ''}

${contactPersons
    .map(
        (contact) => `Via this number ${contact.user.phone} you can contact ${contact.user.firstName} ${
            contact.user.lastName
        } (${contact.user.id === plwd.caretakerId ? 'caretaker' : contact.affiliation}).
`
    )
    .join(',')
    .replace(',', '')}
`;

export interface NotificationService {
    notifyForEvent(params: INotifyForEventNotificationService): Promise<void>;
}

export interface NotificationDelegate {
    notifyForEvent(params: INotifyForEventNotificationDelegate): Promise<void>;
}

class TextMessageService implements NotificationDelegate {
    private readonly twilioClient: twilio.Twilio;

    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {
        this.twilioClient = getTwilioClient(config);
    }

    async notifyForEvent({ recipients, event, plwd, allowResend }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    plwd,
                    recipient: recipient,
                });
                const hasNotified = await this.repository.hasNotificationForEvent({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.TEXT_MESSAGE,
                });
                if (hasNotified) {
                    logger.info(
                        wasAlreadyNotifiedForEventLogMessage({
                            contactId: recipient.user.id,
                            eventId: event.id,
                            plwdId: plwd.id,
                            serviceName: TextMessageService.name,
                        })
                    );
                    if (!allowResend) {
                        continue;
                    }
                }

                await this.twilioClient.messages.create({
                    body: message,
                    from: this.config.notification.twilio.sms.from,
                    to: recipient.user.phone,
                });

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: TextMessageService.name,
                        eventId: event.id,
                        plwdId: plwd.id,
                    })
                );
                await this.repository.insert({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.TEXT_MESSAGE,
                });
            } catch (err) {
                logger.error(err);
            }
        }
    }
}

class WhatsappMessageService implements NotificationDelegate {
    private readonly twilioClient: twilio.Twilio;

    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {
        this.twilioClient = getTwilioClient(config);
    }

    async notifyForEvent({ event, plwd, recipients, allowResend }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    plwd,
                    recipient: recipient,
                });

                const hasNotified = await this.repository.hasNotificationForEvent({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.WHATSAPP,
                });
                if (hasNotified) {
                    logger.info(
                        wasAlreadyNotifiedForEventLogMessage({
                            contactId: recipient.user.id,
                            eventId: event.id,
                            plwdId: plwd.id,
                            serviceName: WhatsappMessageService.name,
                        })
                    );
                    if (!allowResend) {
                        continue;
                    }
                }

                await this.twilioClient.messages.create({
                    body: message,
                    from: `whatsapp:${this.config.notification.twilio.whatsapp.from}`,
                    to: `whatsapp:${recipient.user.phone}`,
                });

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: WhatsappMessageService.name,
                        eventId: event.id,
                        plwdId: plwd.id,
                    })
                );
                await this.repository.insert({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.WHATSAPP,
                });
            } catch (err) {
                logger.error(err);
            }
        }
    }
}

class EmailService implements NotificationDelegate {
    private readonly mailClient: mailClient.MailService;

    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {
        this.mailClient = getSendgridClient(config);
    }

    async notifyForEvent({ event, plwd, recipients, allowResend }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    plwd,
                    recipient: recipient,
                });

                const hasNotified = await this.repository.hasNotificationForEvent({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.EMAIL,
                });
                if (hasNotified) {
                    logger.info(
                        wasAlreadyNotifiedForEventLogMessage({
                            contactId: recipient.user.id,
                            eventId: event.id,
                            plwdId: plwd.id,
                            serviceName: EmailService.name,
                        })
                    );
                    if (!allowResend) {
                        continue;
                    }
                }

                await this.mailClient.send({
                    to: recipient.user.email,
                    from: this.config.notification.sendgrid.from,
                    subject: `Alert: ${plwd.firstName} did not arrive on time at event location!`,
                    text: message,
                });

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: EmailService.name,
                        eventId: event.id,
                        plwdId: plwd.id,
                    })
                );
                await this.repository.insert({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.EMAIL,
                });
            } catch (err) {
                logger.error(err);
            }
        }
    }
}

class ConsoleLogService implements NotificationDelegate {
    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {}

    async notifyForEvent({ event, plwd, recipients }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    plwd,
                    recipient: recipient,
                });

                const hasNotified = await this.repository.hasNotificationForEvent({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.CONSOLE,
                });
                if (hasNotified) {
                    logger.info(
                        wasAlreadyNotifiedForEventLogMessage({
                            contactId: recipient.user.id,
                            eventId: event.id,
                            plwdId: plwd.id,
                            serviceName: ConsoleLogService.name,
                        })
                    );
                    continue;
                }

                console.warn(message);

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: ConsoleLogService.name,
                        eventId: event.id,
                        plwdId: plwd.id,
                    })
                );
                await this.repository.insert({
                    contactUserId: recipient.user.id,
                    eventId: event.id,
                    plwdId: plwd.id,
                    type: INotificationType.CONSOLE,
                });
            } catch (err) {
                logger.error(err);
            }
        }
    }
}

export class CompositeNotificationService implements NotificationService {
    protected delegates = [] as NotificationDelegate[];

    constructor(protected readonly repository: NotificationRepository, protected readonly config: IConfig) {}

    async notifyForEvent(params: INotifyForEventNotificationService) {
        for await (const delegate of this.delegates) {
            await delegate.notifyForEvent(params);
        }
    }

    withTextMessageService() {
        if (this.config.notification.twilio.sms.enabled) {
            this.delegates.push(new TextMessageService(this.repository, this.config));
        }
        return this;
    }

    withWhatsappMessageService() {
        if (this.config.notification.twilio.whatsapp.enabled) {
            this.delegates.push(new WhatsappMessageService(this.repository, this.config));
        }
        return this;
    }

    withEmailService() {
        if (this.config.notification.sendgrid.enabled) {
            this.delegates.push(new EmailService(this.repository, this.config));
        }
        return this;
    }

    withConsoleLogService() {
        this.delegates.push(new ConsoleLogService(this.repository, this.config));
        return this;
    }
}
