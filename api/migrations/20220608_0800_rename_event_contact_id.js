'use strict';

exports.up = function (knex) {
    return knex.schema.alterTable('events', (table) => {
        table.renameColumn('caretaker_id', 'contact_user_id');
        table.renameColumn('user_id', 'plwd_user_id');
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('events', (table) => {
        table.renameColumn('plwd_user_id', 'user_id');
        table.renameColumn('contact_user_id', 'caretaker_id');
    });
};
