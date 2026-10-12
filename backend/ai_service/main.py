
from fastapi import FastAPI

app = FastAPI(
    title="AI Resume Creator - AI Service",
    description="AI processing service for the AI Resume Creator project.",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "message": "AI Resume Creator AI Service is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai_service",
    }
