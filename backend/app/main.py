from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, managers, employees
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(managers.router, prefix=f"{settings.API_V1_STR}/managers", tags=["managers"])
app.include_router(employees.router, prefix=f"{settings.API_V1_STR}/employees", tags=["employees"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Employee Tracking & Management API"}
