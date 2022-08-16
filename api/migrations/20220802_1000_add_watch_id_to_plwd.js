exports.up = async function (knex) {
    await knex.schema.alterTable('plwd', (table) => {
        // Add watch_id column to plwd table
        table.string('watch_id');
    });
};

exports.down = async function (knex) {
    // Remove watch_id column from plwd table
    await knex.schema.alterTable('plwd', (table) => {
        table.dropColumn('watch_id');
    });
};
