exports.up = async function (knex) {
    await knex.schema.alterTable('locations', (table) => {
        // rename user_id to watch_id
        table.renameColumn('user_id', 'watch_id');
    });
};

exports.down = async function (knex) {
    // Revert changes
    await knex.schema.alterTable('locations', (table) => {
        table.renameColumn('watch_id', 'user_id');
    });
};
