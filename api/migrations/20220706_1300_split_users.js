exports.up = async function (knex) {
    await knex.schema.alterTable('users', function (table) {
        // Modify Users Table
        table.dropColumn('caretaker_id');
        table.dropColumn('plwd_user_id');
    });

    // Create a table for PLWD
    await knex.schema.createTable('plwd', function (table) {
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('first_name');
        table.string('last_name');
        table.string('phone');
        table.string('email');
        table.text('address');
        table.string('picture');
        table.string('caretaker_id');
        table.timestamp('created_at');
        table.timestamp('updated_at');
    });

    // Create a table external contacts
    await knex.schema.createTable('external_contacts', function (table) {
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('first_name');
        table.string('last_name');
        table.string('phone');
        table.string('plwd_user_id').references('plwd.id');
        table.string('email');
        table.string('affiliation');
        table.timestamp('created_at');
        table.timestamp('updated_at');
    });

    await knex.schema.alterTable('events', (table) => {
        table.dropForeign('user_id');
    });

    // Rename table events to calendar events
    await knex.schema.renameTable('events', 'calendar_events');

    // remove column contact_user_id from calendar_events
    await knex.schema.alterTable('calendar_events', function (table) {
        table.dropColumn('contact_user_id');
        table.foreign('plwd_user_id').references('plwd.id');
    });

    // remove column permissions from users
    await knex.schema.alterTable('users', function (table) {
        table.dropColumn('permissions');
    });

    // Create a table calendar events external contacts
    await knex.schema.createTable('calendar_events_external_contacts', function (table) {
        table.string('external_contact_id').references('external_contacts.id');
        table.string('calendar_event_id').references('calendar_events.id');
        table.unique(['external_contact_id', 'calendar_event_id']);
    });

    // Drop carecircles table
    await knex.schema.dropTable('carecircles');

    // Create carecircle_members table
    await knex.schema.createTable('carecircle_members', function (table) {
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('user_id').references('users.id');
        table.string('plwd_user_id').references('plwd.id');
        table.string('affiliation');
        table.jsonb('permissions');
        table.timestamp('created_at');
        table.timestamp('updated_at');
    });

    // Create a table calendar events carecircle members
    await knex.schema.createTable('calendar_events_carecircle_members', function (table) {
        table.string('carecircle_member_id').references('carecircle_members.id');
        table.string('calendar_event_id').references('calendar_events.id');
        table.unique(['carecircle_member_id', 'calendar_event_id']);
    });

    await knex.schema.alterTable('notifications', (table) => {
        table.dropForeign('plwd_user_id');
        table.dropForeign('contact_user_id');

        table.foreign('plwd_user_id').references('plwd.id');
    });
};

exports.down = async function (knex) {
    // Drop carecircle_members table
    await knex.schema.dropTable('carecircle_members');
    // Re add column permissions to users
    await knex.schema.alterTable('users', function (table) {
        table.jsonb('permissions');
    });
    // Re add column contact_user_id to calendar_events
    await knex.schema.alterTable('calendar_events', function (table) {
        table.string('contact_user_id').references('users.id');
    });
    // Rename table calendar events to events
    await knex.schema.renameTable('calendar_events', 'events');
    // Create carecircles table
    await knex.schema.createTable('carecircles', function (table) {
        table.string('plwd_user_id').references('users.id');
        table.string('contact_id').references('users.id');
        table.unique(['plwd_user_id', 'contact_id']);
    });
    // Drop external_contacts table
    await knex.schema.dropTable('external_contacts');
    // Drop calendar_events_external_contacts table
    await knex.schema.dropTable('calendar_events_external_contacts');
    // Modify Users Table
    await knex.schema.alterTable('users', function (table) {
        table.string('caretaker_id').references('users.id');
        table.string('plwd_user_id').references('plwd.id');
    });
    // Drop plwd table
    await knex.schema.dropTable('plwd');
    // Drop calendar_events_carecircle_members table
    await knex.schema.dropTable('calendar_events_carecircle_members');
    // Alter back the notifications table
    await knex.schema.alterTable('notifications', (table) => {
        table.foreign('plwd_user_id').references('users.id');
        table.foreign('contact_user_id').references('users.id');
    });
};
