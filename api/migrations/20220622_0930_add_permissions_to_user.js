exports.up = async function (knex) {
    return await knex.schema.alterTable('users', (table) => {
        table.renameColumn('organization', 'affiliation');
        table.jsonb('permissions');
        table.text('picture').alter();
        table.string('plwd_user_id').references('users.id');
    });
};

exports.down = async function (knex) {
    return knex.schema.alterTable('events', (table) => {
        table.renameColumn('affiliation', 'organization');
        table.string('picture').alter();
        table.dropColumn('permissions');
        table.dropColumn('plwd_user_id');
    });
};
