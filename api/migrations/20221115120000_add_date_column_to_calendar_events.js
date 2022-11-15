exports.up = async function (knex) {
    await knex.schema.alterTable('calendar_events', (table) => {
        table.string('date');
    });
};

exports.down = async function (knex) {
    // Revert changes
    await knex.schema.alterTable('calendar_events', (table) => {
        table.dropColumn('date');
    });
};
