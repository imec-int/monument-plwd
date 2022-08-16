import { randomBytes } from 'crypto';

export const generatePassword = (length: number) =>
    randomBytes(length).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
