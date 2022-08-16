exports.up = async function (knex) {
    await knex.raw(`
        INSERT INTO locations (user_id, timestamp, location, created_at)
        SELECT user_id,
            timestamp,
            ST_GeomFromText(format('Point(%s %s)', payload -> 'longitude', payload -> 'latitude')),
            created_at
        from logs
        where "type" = 'AndroidWear_Location'
    `);
};

exports.down = async function (knex) {
    await knex.dropTableIfExists('locations');
};
