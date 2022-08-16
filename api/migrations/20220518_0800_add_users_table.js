exports.up = async function (knex) {
    await knex.schema.createTable('users', function (table) {
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('auth0_id').comment('Id of the user within Auth0');
        table.string('caretaker_id').comment('Id of the contact person');
        table.string('role').comment('Role of the user within the application (eg. Admin)');
        table.string('first_name');
        table.string('last_name');
        table.string('email');
        table.string('phone');
        table.string('organization');
        table.string('picture');
        table.string('created_by');
        table.timestamp('created_at');
        table.timestamp('updated_at');
    });
};

exports.down = async function (knex) {
    await knex.dropTableIfExists('users');
};
