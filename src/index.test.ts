import { test, expect } from "bun:test";
import db from "./server/db";

test("database initialization", () => {
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  expect(tableExists).toBeDefined();
});

