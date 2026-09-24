import { existsSync } from "node:fs";
import postgres from "postgres";
import type { TestProject } from "vitest/node";
import { runMigrations } from "../src/db/migrate";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

/**
 * Recreates the test database from scratch and applies every migration, so each run also
 * proves the migrations work on an empty DB. Derived from DATABASE_URL as `<name>_test`
 * unless TEST_DATABASE_URL is set.
 */
export default async function setup(project: TestProject) {
  const envFile = new URL("../../../.env", import.meta.url);
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("DATABASE_URL must be set to run API tests (see .env.example)");

  const testUrl = new URL(process.env.TEST_DATABASE_URL ?? baseUrl);
  if (!process.env.TEST_DATABASE_URL) testUrl.pathname = `${testUrl.pathname}_test`;
  const dbName = decodeURIComponent(testUrl.pathname.slice(1));
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to reset "${dbName}": test database names must end in _test`);
  }

  const admin = postgres(baseUrl, { max: 1, onnotice: () => {} });
  try {
    await admin`drop database if exists ${admin(dbName)} with (force)`;
    await admin`create database ${admin(dbName)}`;
  } catch (err) {
    throw new Error(`Could not prepare test database (is Postgres up? try \`pnpm db:up\`)`, {
      cause: err,
    });
  } finally {
    await admin.end();
  }

  await runMigrations(testUrl.toString());
  project.provide("testDatabaseUrl", testUrl.toString());
}
