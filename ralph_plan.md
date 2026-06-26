# Ralph Plan: Implement Favorites Feature

- [x] **Database:** Update `user_job_status` table in `src/server/db.ts` (add `is_favorite` column and migration).
- [x] **Backend:** Implement logic in `src/server/app.ts` for `GET /api/jobs` and `PATCH /api/jobs/:id/favorite`.
- [x] **Frontend:** Update `src/client/App.tsx` to include the star icon, toggle handler, and favorites filter.
- [x] **Testing:** Add unit tests for the new favorite API endpoints and UI behavior.
- [x] **Finalization:** Ensure all artifacts are in sync and output <promise>COMPLETE</promise>.