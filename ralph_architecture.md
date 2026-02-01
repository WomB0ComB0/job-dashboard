# Architecture Diagram: Job Favorites Feature

graph TD
    subgraph Frontend [Client Application (React)]
        App[App.tsx] -- API Call: Toggle Favorite --> API_PATCH
        App -- API Call: Get Jobs --> API_GET
        App -- Filter: Favorites --> API_GET
        App -- Render Icon --> StarIcon[Star Icon (lucide-react)]
    end

    subgraph Backend [Server Application (Elysia/Bun)]
        API_GET[/api/jobs] --> JobController
        API_PATCH[/api/jobs/:id/favorite] --> FavoriteController
        JobController -- Read Status --> DB_READ
        FavoriteController -- Read/Write Status --> DB_UPSERT
    end

    subgraph Database [SQLite]
        DB_READ[user_job_status Table] -- Select is_favorite --> JobController
        DB_UPSERT[user_job_status Table] -- INSERT/UPDATE is_favorite --> FavoriteController
        DB_MIGRATE[Migration Block] -- ADD COLUMN is_favorite --> DB_UPSERT
    end

    style StarIcon fill:#f97316,stroke:#f97316,stroke-width:2px
