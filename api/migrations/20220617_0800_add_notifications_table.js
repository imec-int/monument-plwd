exports.up = async function (knex) {
    await knex.schema.createTable('notifications', function (table) {
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('plwd_user_id').references('users.id').comment('Id of the plwd');
        table.string('contact_user_id').references('users.id').comment('Id of the contact person');
        table.string('event_id').references('events.id').comment('The id of the related calendar event');
        table.string('type').comment('The type of notification that was sent to the contact person');
        table.timestamp('created_at').comment('The time the notification was created');
    });
};

exports.down = async function (knex) {
    await knex.dropTableIfExists('notifications');
};
