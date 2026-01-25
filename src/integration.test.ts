import { test, expect, describe } from "bun:test";
import db from "./server/db";
import { scrapeJobs } from "./server/services/scraper";

describe("Scraper and DB Integration", () => {
  test("scrapeJobs inserts jobs into database", async () => {
    // Note: This actually makes network requests to GitHub
    const count = await scrapeJobs();
    expect(count).toBeGreaterThan(0);

    const jobCount = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as { count: number };
    expect(jobCount.count).toBeGreaterThan(0);
  }, 30000); // Higher timeout for scraping
});
