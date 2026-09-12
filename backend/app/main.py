from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

from app.routers import auth, articles, incidents, admin, users, news, sources


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="BARMM Election Monitor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(incidents.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(news.router)
app.include_router(sources.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}