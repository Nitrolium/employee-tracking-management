# Employee Work Tracking & Management System

A comprehensive system for tracking employee tasks, shifts, activity (without invasive keylogging or screenshots), and performance evaluations.

## Prerequisites

Before running the application, make sure you have the following installed:
- **Docker & Docker Compose** (Ensure Docker Desktop is running)
- **Python 3.10+**
- **Node.js 18+**

---

## Manual Setup & Run Instructions

To get the entire stack running, you need to open **three separate terminal windows**.

### 1. Start the Database (Terminal 1)

The system uses PostgreSQL, which is containerized using Docker.

```bash
cd "D:\Employee-tracking&management"
docker-compose up -d
```
*(Wait a few seconds for the database to fully initialize).*

### 2. Setup and Run the Backend (Terminal 2)

The backend is a FastAPI application that manages the database, authenticates users, and receives tracking data.

```bash
cd "D:\Employee-tracking&management\backend"

# Create a virtual environment and activate it
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (creates all the tables)
# NOTE: Ensure Docker is running before doing this!
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --reload
```
The backend will be available at `http://localhost:8000`. You can view the interactive API docs at `http://localhost:8000/docs`.

### 3. Run the Manager Application

The Manager Application is located in `manager-desktop/` and allows creating manager accounts, adding employees, managing shifts & tasks, reviewing submissions, viewing activity telemetry, and publishing evaluations.

```bash
cd "D:\Employee-tracking&management\manager-desktop"
node "node_modules\electron-vite\bin\electron-vite.js" dev
```

### 4. Run the Employee Application

The Employee Application is located in `desktop/` and is distributed to staff. It allows employees to log in (using credentials created by their manager), view shifts, work on tasks, submit deliverables for review, toggle the privacy-preserving activity tracker, and view evaluations.

```bash
cd "D:\Employee-tracking&management\desktop"
node "node_modules\electron-vite\bin\electron-vite.js" dev
```

---

## Testing & Verifying Features

1. **Manager Portal (`manager-desktop`)**:
   - Register a manager account directly via the "Register as Manager" tab.
   - Go to the **Employees** tab and click "+ Add New Employee" to provision employee credentials.
   - Go to the **Shifts** tab to define working hours and assign them to employees.
   - Go to the **Tasks** tab to create tasks and assign them to employees.
   - Review incoming deliverables in the **Review Center** tab.
   - Inspect non-invasive 5-minute activity chunks in the **Activity Logs** tab.
   - Compute metrics and publish formal reviews in the **Evaluations** tab.

2. **Employee Portal (`desktop`)**:
   - Log in using the credentials provisioned by the Manager (no self-registration allowed).
   - View assigned shifts and tasks in real-time.
   - Click **▶ Start Tracker** to initiate background activity tracking (5-minute chunk sync).
   - Update task status to "IN_PROGRESS" or submit deliverables for review.
   - View formal performance evaluation feedback under "My Evaluations".

