import { getTwilioClient } from './../utils/twillioClient';
import twilio from 'twilio';
import { IConfig } from './../utils/config';
import { NotificationRepository } from './../repositories/NotificationRepository';
import { INotificationType } from '../models/Notification';
import logger from '../utils/logger';
import {
    CompositeNotificationService,
    constructNotificationMessage,
    INotifyForEventNotificationDelegate,
    NotificationDelegate,
    sentNotificationForEventLogMessage,
    wasAlreadyNotifiedForEventLogMessage,
} from '../services/NotificationService';

class MockTextMessageService implements NotificationDelegate {
    private readonly twilioClient: twilio.Twilio;

    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {
        this.twilioClient = getTwilioClient(config);
    }

    async notifyForEvent({ event, plwd, recipients, location }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    location,
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
                            serviceName: MockTextMessageService.name,
                        })
                    );
                    continue;
                }

                await this.twilioClient.messages.create({
                    body: message,
                    from: this.config.notification.twilio.sms.from,
                    to: recipient.user.phone,
                });

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: MockTextMessageService.name,
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

class MockWhatsappMessageService implements NotificationDelegate {
    private readonly twilioClient: twilio.Twilio;

    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {
        this.twilioClient = getTwilioClient(config);
    }

    async notifyForEvent({ event, plwd, recipients, location }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    location,
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
                            serviceName: MockWhatsappMessageService.name,
                        })
                    );
                    continue;
                }

                await this.twilioClient.messages.create({
                    body: message,
                    from: `whatsapp:${this.config.notification.twilio.whatsapp.from}`,
                    to: `whatsapp:${recipient.user.phone}`,
                });

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: MockWhatsappMessageService.name,
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

class MockEmailService implements NotificationDelegate {
    private readonly mailClient: any;

    constructor(private readonly repository: NotificationRepository, private readonly config: IConfig) {
        this.mailClient = {
            send: (params: any) => {
                console.warn(params);
            },
        };
    }

    async notifyForEvent({ event, plwd, recipients, location }: INotifyForEventNotificationDelegate) {
        for await (const recipient of recipients) {
            try {
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
                            serviceName: MockEmailService.name,
                        })
                    );
                    continue;
                }

                const baseUrl = this.config.notification.baseUrl;
                const otherRecipients = recipients.filter((r) => r.id !== recipient.id);
                const message = constructNotificationMessage({
                    baseUrl,
                    calendarEvent: event,
                    contactPersons: otherRecipients,
                    location,
                    plwd,
                    recipient: recipient,
                });

                await this.mailClient.send({
                    to: recipient.user.email,
                    from: this.config.notification.sendgrid.from,
                    subject: `Alert: ${plwd.firstName} did not arrive on time at event location!`,
                    text: message,
                });

                logger.info(
                    sentNotificationForEventLogMessage({
                        contactId: recipient.user.id,
                        serviceName: MockEmailService.name,
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

export class MockCompositeNotificationService extends CompositeNotificationService {
    constructor(protected readonly repository: NotificationRepository, protected readonly config: IConfig) {
        super(repository, config);
    }

    withTextMessageService() {
        this.delegates.push(new MockTextMessageService(this.repository, this.config));
        return this;
    }

    withWhatsappMessageService() {
        this.delegates.push(new MockWhatsappMessageService(this.repository, this.config));
        return this;
    }

    withEmailService() {
        this.delegates.push(new MockEmailService(this.repository, this.config));
        return this;
    }
}
