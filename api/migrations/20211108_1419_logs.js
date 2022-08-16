exports.up = async function (knex) {
    await knex.raw("" +
        "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n" +
        "CREATE TABLE IF NOT EXISTS logs (\n" +
        "    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,\n" +
        "    user_id character varying NOT NULL,\n" +
        "    type character varying NOT NULL,\n" +
        "    \"timestamp\" timestamp with time zone NOT NULL,\n" +
        "    payload json NOT NULL\n" +
        ");\n" +
        "ALTER TABLE ONLY logs\n" +
        "    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);\n" +
        "\n" +
        "CREATE INDEX IF NOT EXISTS logs_user_type \n" +
        "    ON logs (user_id, type);\n" +
        "\n" +
        "ALTER TABLE logs\n" +
        "    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL;")
};

exports.down = async function (knex) {
    await knex.schema.dropTable('logs');
    await knex.schema.dropIndex("logs_user_type")
};