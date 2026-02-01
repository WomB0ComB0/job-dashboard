import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import bcrypt from 'bcrypt';
import { Elysia } from 'elysia';
import db from './db';
import { scrapeJobs } from './services/scraper';
import { extractRoleKeywords } from './utils/keywords';

export const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'super-secret-key-change-this',
    })
  )
  .group('/auth', (app) =>
    app
      .post('/signup', async ({ body, set }) => {
        const { username, password } = body as any;
        const hash = await bcrypt.hash(password, 10);
        try {
          db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
          const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username) as any;
          // Create default preferences
          db.prepare('INSERT INTO user_preferences (user_id, accepted_titles, rejected_titles) VALUES (?, ?, ?)')
            .run(user.id, JSON.stringify([]), JSON.stringify([]));
          return { success: true };
        } catch (e) {
          console.error(e);
          set.status = 400;
          return { error: 'Username already exists' };
        }
      })
      .post('/login', async ({ body, jwt, set }) => {
        const { username, password } = body as any;
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
          set.status = 401;
          return { error: 'Invalid credentials' };
        }
        const token = await jwt.sign({ id: user.id, username: user.username });
        return { token, user: { id: user.id, username: user.username } };
      })
  )
  .derive(async ({ jwt, headers }) => {
    const auth = headers['authorization'];
    if (!auth?.startsWith('Bearer ')) return { user: null };
    const user = await jwt.verify(auth.slice(7));
    return { user };
  })
  .group('/api', (app) =>
    app
      .onBeforeHandle(({ user, set }) => {
        if (!user) {
          set.status = 401;
          return { error: 'Unauthorized' };
        }
      })
      .get('/jobs', ({ user, query }) => {
        const userId = (user as any).id;
        const page = Number.parseInt(query.page as string || '1', 10);
        const limit = Number.parseInt(query.limit as string || '20', 10);
        const statusFilter = query.status as string || 'all';
        const search = query.search as string || '';
        const offset = (page - 1) * limit;

        // Get user preferences
        const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
        const accepted = JSON.parse(prefs?.accepted_titles || '[]');
        const rejected = JSON.parse(prefs?.rejected_titles || '[]');
        const acceptedLoc = JSON.parse(prefs?.accepted_locations || '[]');
        const rejectedLoc = JSON.parse(prefs?.rejected_locations || '[]');

        // Get all jobs with status for this user
        // We filter by search and status in SQL for performance
        let sql = `
          SELECT j.*, IFNULL(ujs.status, 'unprocessed') as status, IFNULL(ujs.is_favorite, 0) as is_favorite
          FROM jobs j
          LEFT JOIN user_job_status ujs ON j.id = ujs.job_id AND ujs.user_id = ?
          WHERE (j.company LIKE ? OR j.role LIKE ? OR j.location LIKE ?)
        `;
        const params: any[] = [userId, `%${search}%`, `%${search}%`, `%${search}%` ];

        if (statusFilter !== 'all') {
          if (statusFilter === 'favorites') {
            sql += ` AND IFNULL(ujs.is_favorite, 0) = 1`;
          } else {
            sql += ` AND IFNULL(ujs.status, 'unprocessed') = ?`;
            params.push(statusFilter);
          }
        }

        // We'll sort by preferential order (unprocessed first) and then date
        sql += ` ORDER BY 
          CASE WHEN IFNULL(ujs.status, 'unprocessed') = 'unprocessed' THEN 0 ELSE 1 END,
          j.date_added DESC`;

        const allMatchingJobs = db.prepare(sql).all(...params) as any[];

        // Filter based on preferences in JS (easier than complex SQL for JSON arrays)
        // Filter based on preferences in JS (easier than complex SQL for JSON arrays)
        const filteredJobs = allMatchingJobs.filter(job => {
          const role = job.role.toLowerCase();
          
          // Helper to check if a keyword matches the role using word boundaries
          const matchesKeyword = (keyword: string) => {
            // Escape special chars but allow spaces to match hyphens/spaces
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = escaped.replace(/ /g, '[\\s-]');
            // Use word boundaries for letters/numbers, but be careful with symbols
            return new RegExp(`\\b${pattern}\\b`, 'i').test(role);
          };

          if (rejected.some((r: string) => matchesKeyword(r))) return false;
          if (accepted.length > 0 && !accepted.some((a: string) => matchesKeyword(a))) return false;

          // Location filtering
          const location = job.location.toLowerCase();
          const matchesLocation = (keyword: string) => location.includes(keyword.toLowerCase());

          if (rejectedLoc.some((r: string) => matchesLocation(r))) return false;
          if (acceptedLoc.length > 0 && !acceptedLoc.some((a: string) => matchesLocation(a))) return false;

          return true;
        });

        const total = filteredJobs.length;
        const paginatedJobs = filteredJobs.slice(offset, offset + limit);

        return {
          jobs: paginatedJobs.map(j => ({ ...j, is_favorite: j.is_favorite === 1 })),
          total,
          page,
          totalPages: Math.ceil(total / limit)
        };
      })
      .post('/jobs/scrape', async () => {
        const count = await scrapeJobs();
        return { success: true, count };
      })
      .patch('/jobs/:id/favorite', ({ params, body, user }) => {
        const userId = (user as any).id;
        const jobId = Number(params.id);
        const { is_favorite } = body as { is_favorite: boolean };
        
        // Use 1 for true, 0 for false
        const favoriteValue = is_favorite ? 1 : 0;

        db.prepare(`
          INSERT INTO user_job_status (user_id, job_id, status, is_favorite)
          VALUES (?, ?, 'unprocessed', ?)
          ON CONFLICT(user_id, job_id) DO UPDATE SET is_favorite = excluded.is_favorite, updated_at = CURRENT_TIMESTAMP
        `).run(userId, jobId, favoriteValue);
        
        return { success: true };
      })
      .patch('/jobs/:id/status', ({ params, body, user }) => {
        const userId = (user as any).id;
        const jobId = params.id;
        const { status } = body as any;
        db.prepare(`
          INSERT INTO user_job_status (user_id, job_id, status)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, job_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
        `).run(userId, jobId, status);
        return { success: true };
      })
      .get('/preferences', ({ user }) => {
        const userId = (user as any).id;
        const prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any;
        return {
          accepted_titles: JSON.parse(prefs?.accepted_titles || '[]'),
          rejected_titles: JSON.parse(prefs?.rejected_titles || '[]'),
          accepted_locations: JSON.parse(prefs?.accepted_locations || '[]'),
          rejected_locations: JSON.parse(prefs?.rejected_locations || '[]'),
        };
      })
      .patch('/preferences', ({ body, user }) => {
        const userId = (user as any).id;
        const { accepted_titles, rejected_titles, accepted_locations, rejected_locations } = body as any;
        db.prepare(`
          UPDATE user_preferences 
          SET accepted_titles = ?, rejected_titles = ?, accepted_locations = ?, rejected_locations = ?
          WHERE user_id = ?
        `).run(
          JSON.stringify(accepted_titles), 
          JSON.stringify(rejected_titles), 
          JSON.stringify(accepted_locations || []), 
          JSON.stringify(rejected_locations || []), 
          userId
        );
        return { success: true };
      })
      .get('/stats', ({ user }) => {
        const userId = (user as any).id;
        const totalProcessed = db.prepare('SELECT COUNT(*) as count FROM user_job_status WHERE user_id = ? AND status != "unprocessed"').get(userId) as any;
        const topCompanies = db.prepare(`
          SELECT company, COUNT(*) as count 
          FROM jobs 
          GROUP BY company 
          ORDER BY count DESC 
          LIMIT 5
        `).all() as any[];
        return {
          totalProcessed: totalProcessed.count,
          topCompanies
        };
      })
      .get('/keywords', () => {
        const jobs = db.prepare('SELECT role FROM jobs').all() as { role: string }[];
        const keywordCounts = new Map<string, number>();
        
        for (const job of jobs) {
          const keywords = extractRoleKeywords(job.role);
          for (const keyword of keywords) {
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
          }
        }
        
        // Sort by frequency and take top 25
        const sortedKeywords = Array.from(keywordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 25)
          .map(([keyword, count]) => ({ keyword, count }));
          
        return { keywords: sortedKeywords };
      })
      .get('/locations', () => {
        const jobs = db.prepare('SELECT location FROM jobs').all() as { location: string }[];
        const locationCounts = new Map<string, number>();
        
        for (const job of jobs) {
          // Simple normalization: trim
          const loc = job.location.trim();
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
        }
        
        // Sort by frequency and take top 25
        const sortedLocations = Array.from(locationCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 25)
          .map(([location, count]) => ({ location, count }));
          
        return { locations: sortedLocations };
      })
  );
