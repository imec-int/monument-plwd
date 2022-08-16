exports.up = async function (knex) {
    await knex.schema.createTable('events', function (table) {
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('user_id').references('users.id').comment('Id of the PLWD');
        table.string('caretaker_id').references('users.id').comment('Id of the contact person');
        table.string('title').comment('Title of the event');
        table.string('address', 10000).comment('Address of the event');
        table.string('repeat').comment('When should the event be repeated');
        table.timestamp('start_time').comment('Start time of the event');
        table.timestamp('end_time').comment('End time of the event');
        table.boolean('picked_up').comment('Should the PLWD be picked up');
        table.string('created_by').references('users.id');
        table.timestamp('created_at');
        table.timestamp('updated_at');
    });
};

exports.down = async function (knex) {
    await knex.dropTableIfExists('events');
};
