exports.up = async function (knex) {
    await knex.schema.alterTable('plwd', (table) => {
        table.text('picture').alter();
    });
    // Remove address column from user table
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('address');
        table.dropColumn('affiliation');
    });
};

exports.down = async function (knex) {
    // reverse plwd picture
    await knex.schema.alterTable('plwd', (table) => {
        table.string('picture').alter();
    });
    // Add address column from users table
    await knex.schema.alterTable('users', (table) => {
        table.text('address');
        table.string('affiliation');
    });
};
