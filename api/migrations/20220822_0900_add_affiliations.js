exports.up = async function (knex) {
    // Add table affiliation
    await knex.schema.createTable('affiliations', (table) => {
        // Add column id
        table.string('id').primary().comment('Primary (id) entails an index.');
        table.string('affiliation').comment('The type of affiliation for a contact.');
        table.string('plwd_id').references('plwd.id').comment('Id of the plwd.');
    });
};

exports.down = async function (knex) {
    // Revert changes
    await knex.schema.dropTableIfExists('affiliations');
};
