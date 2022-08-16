'use strict';

exports.up = function (knex) {
    return knex.schema.alterTable('users', (table) => {
        table.string('address', 10000);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('address');
    });
};
