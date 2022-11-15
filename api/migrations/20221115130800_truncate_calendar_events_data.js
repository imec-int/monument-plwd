/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.table('notifications').del();
    await knex.table('external_contacts').del();
    await knex.table('calendar_events_external_contacts').del();
    await knex.table('calendar_events_carecircle_members').del();
    await knex.table('calendar_events').del();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function () {
    /* empty function */
};
