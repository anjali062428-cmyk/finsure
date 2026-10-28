"""
FinSure Transaction Scoring Route
Implements the canonical POST /api/v1/transactions/score endpoint.
"""

from fastapi import APIRouter, Depends, Response, status
from backend.api.schemas.transaction import TransactionScoreRequest, CanonicalTransactionScoreResponse
from backend.services.inference_service import InferenceService
from backend.api.dependencies.services import get_inference_service

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions"])


@router.post(
    "/score",
    response_model=CanonicalTransactionScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Real-time transaction risk scoring & explainability",
    description="Evaluates a live transaction across multi-modal models, returns calibrated risk score, deterministic decision, and dual customer/analyst explanations."
)
def score_transaction(
    request: TransactionScoreRequest,
    response: Response,
    service: InferenceService = Depends(get_inference_service)
) -> CanonicalTransactionScoreResponse:
    """
    Primary FinSure scoring endpoint.
    """
    res, latencies = service.score_transaction(request)

    # Attach performance timings to response headers
    if "total_inference_ms" in latencies:
        response.headers["X-Response-Time-Ms"] = str(latencies["total_inference_ms"])
    if "explainability_ms" in latencies:
        response.headers["X-Explainability-Time-Ms"] = str(latencies["explainability_ms"])

    return res
