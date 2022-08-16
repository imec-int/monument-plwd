exports.up = async function (knex) {
    return await knex.schema.createTable('carecircles', (table) => {
        table.string('plwd_user_id').references('users.id');
        table.string('contact_id').references('users.id');

        // Make sure that these fields together are a unique composite field
        table.unique(['plwd_user_id', 'contact_id']);
    });
};

exports.down = async function (knex) {
    return knex.schema.dropTable('carecircles');
};
