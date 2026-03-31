"""
FastAPI application for the Carbon Atlas market data API.

Provides unified access to carbon credit project data across all major
voluntary carbon market registries (Verra, Gold Standard, ACR, CAR, ART TREES).
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.db.database import engine
from api.routers import charts, credits, developers, events, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="Carbon Atlas Market API",
    description="Unified carbon credit registry data — projects, credits, developers, and analytics",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(projects.router)
app.include_router(credits.router)
app.include_router(charts.router)
app.include_router(events.router)
app.include_router(developers.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
