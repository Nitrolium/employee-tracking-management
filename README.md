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

### 3. Setup and Run the Desktop App (Terminal 3)

The frontend is an Electron desktop app built with React and Vite.

```bash
cd "D:\Employee-tracking&management\desktop"

# Install dependencies (only needed the first time)
npm install

# Start the Electron application
npm run dev
```

---

## Testing the Application

Once everything is running:

1. **Register a Manager Account**:
   - The desktop app defaults to a login screen. We don't have users yet!
   - You can quickly create a manager via the API docs:
     - Open your browser to: `http://localhost:8000/docs`
     - Find the `POST /api/v1/auth/register/manager` endpoint.
     - Click **Try it out**, fill in the JSON body with an email, password, and full name, and hit **Execute**.
2. **Log In**:
   - Go back to the Electron app and log in with the manager credentials you just created.
   - You will see the Manager Dashboard with tabs for Employees, Shifts, Tasks, Review Center, Activity Logs, and Evaluations.
3. **Register an Employee**:
   - Back in the API docs, use `POST /api/v1/auth/register/employee` to create an employee account.
   - You can then log out of the Electron app and log in as the employee to see the Employee Dashboard and try the **Start Tracking** button.
