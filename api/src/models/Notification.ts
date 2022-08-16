export enum INotificationType {
    CONSOLE = 'console',
    EMAIL = 'email',
    TEXT_MESSAGE = 'text_message',
    WHATSAPP = 'whatsapp',
}

export type INotification = {
    contactUserId: string;
    createdAt: string;
    eventId: string;
    id: string;
    plwdId: string;
    type: INotificationType;
};

export type ICreateNotificationBody = Omit<INotification, 'createdAt' | 'id'>;
