import datetime
import uuid
from typing import Optional


from pydantic import BaseModel, ConfigDict


class IncidentCreate(BaseModel):
    title: str
    description: str
    incident_type: str
    severity: str
    province: str
    municipality: Optional[str] = None
    incident_date: datetime.date
    incident_time: datetime.time
    reported_by: Optional[str] = None
    organization: Optional[str] = None
    contact_info: Optional[str] = None

    # report approx location
    reporter_latitude: Optional[float] = None
    reporter_longitude: Optional[float] = None
    reporter_location_accuracy: Optional[float] = None


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    incident_type: str
    severity: str
    status: str
    province: str
    municipality: Optional[str] = None
    incident_date: datetime.date
    reported_by: Optional[str] = None
    contact_info: Optional[str] = None
    sentiment_score: float
    sentiment_label: str
    created_at: datetime.datetime
    
class IncidentCategoryOut(BaseModel):
    name: str
    created_at: datetime.datetime
    
class IncidentStatusUpdate(BaseModel):
    status: str


class NewsArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    summary: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    published_date: Optional[datetime.datetime] = None
    province: Optional[str] = None
    keywords: Optional[list[str]] = None
    sentiment_score: float
    sentiment_label: str

class NewsSourceCreate(BaseModel):
    name: str
    url: str

class NewsSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    name: str
    url: str
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

class ScrapeResult(BaseModel):
    scraped: int
    skipped: int
    errors: list[str] = []


class SentimentAnalyzeRequest(BaseModel):
    text: str


class SentimentPreview(BaseModel):
    score: float
    label: str


class DashboardSummary(BaseModel):
    total_articles: int
    total_incidents: int
    avg_sentiment: float
    critical_incidents: int
    sentiment_counts: dict[str, int]
    incident_type_counts: dict[str, int]
    province_counts: dict[str, int]
    severity_counts: dict[str, int]
    recent_articles: list[NewsArticleOut]
    recent_incidents: list[IncidentOut]
