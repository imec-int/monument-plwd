exports.up = async function (knex) {
    await knex.schema.alterTable('calendar_events', (table) => {
        // alter column address to be a text field
        table.text('address').alter();
    });
};

exports.down = async function (knex) {
    // Revert changes
    await knex.schema.alterTable('calendar_events', (table) => {
        table.string('address').alter();
    });
};
