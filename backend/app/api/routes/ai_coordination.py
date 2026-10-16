"""AI Coordination Routes — Dev 3 deliverable.

Exposes:
    POST /api/v1/ai/triage           — full triage: classify symptoms + match doctors + slots
    POST /api/v1/ai/recommend-slots  — alias with identical logic (per API contract)
"""
from fastapi import APIRouter, Depends
from supabase import Client

from app.db.supabase_client import get_supabase_client
from app.schemas.triage import (
    TriageRecommendation,
    TriageRequest,
    AutoScheduleRequest,
    AutoScheduleResponse,
)
from app.services import ai_triage_service

router = APIRouter(prefix="/ai", tags=["AI Coordination"])


@router.post(
    "/triage",
    response_model=TriageRecommendation,
    summary="AI-powered symptom triage",
    description=(
        "Accepts a free-text patient symptom description and returns an AI-generated "
        "triage assessment including recommended medical specialization, urgency level, "
        "matched available doctors, and up to three suggested appointment slots."
    ),
)
def triage(
    payload: TriageRequest,
    client: Client = Depends(get_supabase_client),
) -> TriageRecommendation:
    """Full triage pipeline powered by Gemini 2.0 Flash."""
    return ai_triage_service.triage_symptoms(client=client, request=payload)


@router.post(
    "/recommend-slots",
    response_model=TriageRecommendation,
    summary="AI slot recommendation",
    description=(
        "Same as /triage — analyzes symptoms and returns recommended doctors and "
        "appointment slots. Exposed as a separate endpoint per the team API contract "
        "so Dev 4 can call it independently for the slot-picker widget."
    ),
)
def recommend_slots(
    payload: TriageRequest,
    client: Client = Depends(get_supabase_client),
) -> TriageRecommendation:
    """Slot recommendation endpoint (mirrors /triage per integration contract)."""
    return ai_triage_service.recommend_slots(client=client, request=payload)


@router.post(
    "/auto-schedule",
    response_model=AutoScheduleResponse,
    summary="AI-powered automatic doctor appointment scheduling",
    description=(
        "Performs end-to-end intelligent scheduling: interprets patient symptoms, "
        "identifies medical specialization, matches eligible available doctors, "
        "evaluates 30-minute conflict-free slots, and atomically confirms the appointment in Supabase."
    ),
)
def auto_schedule(
    payload: AutoScheduleRequest,
    client: Client = Depends(get_supabase_client),
) -> AutoScheduleResponse:
    """Full automatic scheduling pipeline."""
    return ai_triage_service.auto_schedule(client=client, request=payload)

