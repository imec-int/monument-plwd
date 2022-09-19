process.env.MONUMENT_ACTIVITY_BASE_URL = 'http://localhost/';

// Notification trigger config
process.env.GEOFENCE_RADIUS = 150; // in meters
process.env.NOTIFICATION_TRIGGER_DELAY = 10; // in minutes
process.env.MAX_TIME_BETWEEN_LAST_LOCATION_TIMESTAMP_AND_EVENT_START = 60; // in minutes

// SENDGRID config (used for emails notifications)
process.env.SENDGRID_API_KEY = 'SG.dummykey';
process.env.SENDGRID_FROM = 'dummy+monument@gmail.com';

// TWILIO config (used for text messages and WhatsApp notifications)
// These are the twilio test credentials.
process.env.TWILIO_ACCOUNT_SID = 'AC3e1e878f10f60171bf1e458e2379695f';
process.env.TWILIO_AUTH_TOKEN = 'ad2bc45224a038c0f8a5e78b833d9cf8';
process.env.TWILIO_SMS_FROM = '+15005550006';
process.env.TWILIO_WHATSAPP_FROM = '+15005550006';

// Kompy Client API
process.env.KOMPY_AUTH_USER = 'user';
process.env.KOMPY_AUTH_PASSWORD = 'password';
