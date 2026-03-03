# Migration Guide: Shared Infrastructure

These instructions cover migrating `simple-journal` to a new server where it will connect to **existing centralized services** (Postgres and Redis) running on the `ogdenor` Docker network.

## Target Architecture
- **Database Host:** `central-postgres` (Container Name)
- **Redis Host:** `central-redis` (Container Name)
- **Network:** `ogdenor` (External Docker Network)

---

### Phase 1: Preparation & Backup (Old Server)

1.  **Backup the Database**
    Identify your *old* running database container and dump the data:
    ```bash
    # Check for the old container name
    docker ps | grep postgres

    # Dump the 'journal' database (replace 'journal-db-old' with actual name)
    docker exec -t journal-db-old pg_dump -U journal journal > journal_backup.sql
    ```

2.  **Backup Environment Variables**
    Save a copy of your current `.env` file. You will need the `JWT_SECRET` and `PASSCODE`.

---

### Phase 2: Setup New Server

1.  **Transfer Files**
    Copy the project folder and backup file to the new server.
    ```bash
    scp -r simple-journal/ user@new-server:/home/user/
    scp journal_backup.sql user@new-server:/home/user/simple-journal/
    ```

2.  **Verify Infrastructure**
    Ensure the central services are running and the network exists on the new server:
    ```bash
    docker network ls | grep ogdenor
    docker ps | grep central-postgres
    docker ps | grep central-redis
    ```

3.  **Prepare the Database**
    Ensure the `journal` database and user exist on `central-postgres`.
    *(Skip if you are reusing the exact same database instance, otherwise create them)*:
    ```bash
    # Example: Create DB and User if they don't exist
    docker exec -it central-postgres psql -U postgres -c "CREATE USER journal WITH PASSWORD 'your_secure_password';"
    docker exec -it central-postgres psql -U postgres -c "CREATE DATABASE journal OWNER journal;"
    ```

---

### Phase 3: Configuration

1.  **Create Production Compose File**
    Create `docker-compose.prod.yml` to define the app service and connect it to the external network.

    ```yaml
    services:
      journal-web:
        container_name: journal-web
        build:
          context: ./journal-web
          target: runner
        env_file:
          - .env
        ports:
          - "3001:3001"
        networks:
          - ogdenor
        restart: unless-stopped

    networks:
      ogdenor:
        external: true
    ```

2.  **Update Environment Variables**
    Edit your `.env` file to point to the central services.
    ```bash
    nano .env
    ```
    Update the following keys:
    ```ini
    # Database: points to 'central-postgres' container name
    DATABASE_URL="postgres://journal:your_secure_password@central-postgres:5432/journal"

    # Redis: points to 'central-redis' container name
    REDIS_URL="redis://central-redis:6379/0"

    # Ensure other keys (JWT_SECRET, PASSCODE, OLLAMA_URL) are set correctly.
    ```

---

### Phase 4: Deployment & Restore

1.  **Start the Application**
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

2.  **Restore Data**
    Load your backup into the `central-postgres` container.

    ```bash
    # 1. Copy backup to the database container
    docker cp journal_backup.sql central-postgres:/tmp/backup.sql

    # 2. Restore the data (Connecting as the 'journal' user to 'journal' db)
    # WARNING: This assumes the target DB is empty.
    docker exec -i central-postgres psql -U journal -d journal -f /tmp/backup.sql
    ```

3.  **Run Migrations (Optional/Safety)**
    To ensure the schema is perfectly in sync with the code (in case the backup was slightly older than the code version):
    ```bash
    docker compose -f docker-compose.prod.yml exec journal-web npx prisma migrate deploy
    ```

---

### Phase 5: Verification

1.  **Check Logs**
    ```bash
    docker compose -f docker-compose.prod.yml logs -f journal-web
    ```

2.  **Test Access**
    Access `http://localhost:3001` (or your configured domain). Login and verify your previous journal entries are present.
