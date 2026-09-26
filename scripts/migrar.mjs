// Aplica las migraciones de supabase/migrations que todavia no se corrieron.
// Uso: node --env-file=.env.local scripts/migrar.mjs
// Registra cada archivo aplicado en private.migraciones_aplicadas.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const DIR = path.resolve("supabase/migrations");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(`
    create schema if not exists private;
    create table if not exists private.migraciones_aplicadas (
      archivo text primary key,
      aplicada_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query(
    "select archivo from private.migraciones_aplicadas",
  );
  const aplicadas = new Set(rows.map((r) => r.archivo));
  const archivos = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();
  const pendientes = archivos.filter((f) => !aplicadas.has(f));

  if (pendientes.length === 0) console.log("No hay migraciones pendientes.");

  for (const archivo of pendientes) {
    const sql = await readFile(path.join(DIR, archivo), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into private.migraciones_aplicadas (archivo) values ($1)",
        [archivo],
      );
      await client.query("commit");
      console.log("Aplicada:", archivo);
    } catch (e) {
      await client.query("rollback");
      console.error(`Error en ${archivo}:`, e.message);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
