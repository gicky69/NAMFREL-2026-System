import uuid

from sqlalchemy import Column, String, Text, Float, Date, DateTime, ARRAY, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db import Base

# NOTE: column names/types below are inferred from the frontend components
# (IncidentsList.tsx, NewsFeed.tsx, ReportIncident.tsx, Dashboard.tsx).
# Once you share @/types.ts, double check these against the real Supabase
# schema (Table Editor in the Supabase dashboard is the source of truth).

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    firebase_uid = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    full_name = Column(String, nullable=True)

    email = Column(
        String,
        unique=True,
        nullable=True,
        index=True
    )

    role = Column(
        String,
        nullable=False,
        default="public"
    )

    is_verified = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    incident_type = Column(String, nullable=False)   # e.g. violence, harassment, vote_buying...
    severity = Column(String, nullable=False)         # low | medium | high | critical
    status = Column(String, nullable=False, default="pending")  # pending | verified | resolved...
    province = Column(String, nullable=False)
    municipality = Column(String, nullable=True)
    incident_date = Column(Date, nullable=False)
    reported_by = Column(String, nullable=True)
    contact_info = Column(String, nullable=True)
    sentiment_score = Column(Float, nullable=False, default=0.0)
    sentiment_label = Column(String, nullable=False, default="neutral")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    source = Column(String, nullable=True)
    published_date = Column(DateTime(timezone=True), nullable=True)
    province = Column(String, nullable=True)
    keywords = Column(ARRAY(String), nullable=True)
    sentiment_score = Column(Float, nullable=False, default=0.0)
    sentiment_label = Column(String, nullable=False, default="neutral")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
