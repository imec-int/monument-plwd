exports.up = async function (knex) {
    await knex.raw("" +
        "CREATE EXTENSION IF NOT EXISTS \"postgis\";\n" +
        "CREATE TABLE IF NOT EXISTS locations (\n" +
        "    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,\n" +
        "    user_id character varying NOT NULL,\n" +
        "    \"timestamp\" timestamp with time zone NOT NULL,\n" +
        "    location geography(POINT,4326)\n" +
        ");\n" +
        "\n" +
        "ALTER TABLE locations\n" +
        "    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL;")
};

exports.down = async function (knex) {
    await knex.schema.dropTable('locations');
};