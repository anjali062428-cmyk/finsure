"""
FinSure Financial Document Verification Platform API Routes
Provides endpoints for secure document upload, IDOR-safe retrieval,
content-addressed file downloading, audit trail inspection, and authorized ledger operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse

from backend.models.auth import User
from backend.models.document import (
    DocumentRecord, DocumentType, DocumentStatus,
    DocumentUploadResponse, DocumentAuditEntry, AuthorizedTransaction
)
from backend.services.document_service import DocumentService, MAX_DOCUMENT_SIZE
from backend.api.dependencies.auth import get_current_user, require_role
from backend.api.dependencies.document import get_document_service

router = APIRouter(prefix="/api/v1/documents", tags=["Financial Document Verification"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload financial document for verification",
    description="Uploads bank statement, invoice, or receipt (PDF, PNG, JPG, TIFF <= 25MB). Validates magic bytes, enforces content-addressed SHA-256 deduplication, and records immutable audit event."
)
async def upload_document(
    file: UploadFile = File(..., description="Document binary (PDF, PNG, JPG/JPEG, TIFF)"),
    document_type: str = Form(..., description="Document type: bank_statement, invoice, payment_receipt, other"),
    notes: Optional[str] = Form(None, description="Optional analyst or customer notes"),
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service)
) -> DocumentUploadResponse:
    # 1. Validate document type
    try:
        doc_type_enum = DocumentType(document_type.lower().strip())
    except ValueError:
        valid_types = [t.value for t in DocumentType]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document_type '{document_type}'. Permitted types are: {valid_types}."
        )

    # 2. Read content with 25MB ceiling guard
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file payload: {str(e)}"
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    if len(content) > MAX_DOCUMENT_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Document payload exceeds maximum permissible limit of {MAX_DOCUMENT_SIZE} bytes (25 MB)."
        )

    # 3. Ingest and validate document signature
    try:
        upload_resp = service.upload_document(
            user=current_user,
            filename=file.filename or "uploaded_document",
            content=content,
            document_type=doc_type_enum,
            notes=notes
        )
        return upload_resp
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while storing the document: {str(e)}"
        )


@router.get(
    "",
    response_model=List[DocumentRecord],
    summary="List financial documents",
    description="Returns list of uploaded documents. Scoped strictly: customers only see their own documents; analysts, compliance officers, and admins see all documents."
)
async def list_documents(
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by processing status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service)
) -> List[DocumentRecord]:
    return service.list_documents(
        requesting_user=current_user,
        document_type=document_type,
        status=status_filter,
        limit=limit,
        offset=offset
    )


@router.get(
    "/ocr/status",
    summary="Host OCR Capability Status",
    description="Inspects whether host system has local Tesseract OCR binaries installed for scanned image character extraction."
)
async def get_ocr_status(
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service)
):
    return service.check_ocr_status()


@router.get(
    "/{document_id}",
    response_model=DocumentRecord,
    summary="Get financial document details",
    description="Retrieves document metadata. Protected by IDOR guard: Customers cannot access documents belonging to other users."
)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service)
) -> DocumentRecord:
    try:
        return service.get_document(document_id, requesting_user=current_user)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get(
    "/{document_id}/download",
    summary="Download original document file",
    description="Securely streams document binary. Protected by IDOR guard: Customer cannot download another user's file. Never exposed via public static directory."
)
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service)
):
    try:
        file_path, filename, mime_type = service.get_document_file(document_id, requesting_user=current_user)
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=mime_type,
            headers={
                "X-Content-Type-Options": "nosniff",
                "Content-Disposition": f'inline; filename="{filename}"'
            }
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{document_id}/audit",
    response_model=List[DocumentAuditEntry],
    summary="Get document audit trail",
    description="Returns chronological immutable audit log for the document (uploads, views, downloads, duplicate detections)."
)
async def get_document_audit(
    document_id: str,
    current_user: User = Depends(get_current_user),
    service: DocumentService = Depends(get_document_service)
) -> List[DocumentAuditEntry]:
    # Enforce IDOR on view rights first
    try:
        service.get_document(document_id, requesting_user=current_user)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    return service.repo.list_audit_entries(document_id)


# ------------------------------------------------------------------
# Authorized Transaction Ledger Routes (Record Matching Data Store)
# ------------------------------------------------------------------

@router.post(
    "/ledger/import",
    summary="Import authorized bank records CSV",
    description="Imports trusted bank transactions / general ledger records for record matching. Restricted to fraud analysts, compliance officers, and admins."
)
async def import_authorized_ledger_csv(
    file: UploadFile = File(..., description="CSV file with columns: reference_id, amount, transaction_date, payer_vpa, payee_vpa, account_number"),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: DocumentService = Depends(get_document_service)
):
    try:
        raw_bytes = await file.read()
        csv_text = raw_bytes.decode("utf-8")
        count = service.import_authorized_records_csv(user=current_user, csv_content=csv_text)
        return {
            "status": "success",
            "imported_count": count,
            "message": f"Successfully imported {count} authorized records into the trusted ledger."
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is not valid UTF-8 text.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/ledger/transactions",
    response_model=List[AuthorizedTransaction],
    summary="Query authorized transaction ledger",
    description="Queries trusted ledger records. Analysts, compliance officers, and admins only."
)
async def list_authorized_transactions(
    reference_id: Optional[str] = Query(None),
    amount: Optional[float] = Query(None),
    account_number: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role(["fraud_analyst", "analyst", "compliance_officer", "admin"])),
    service: DocumentService = Depends(get_document_service)
) -> List[AuthorizedTransaction]:
    return service.repo.find_authorized_transactions(
        reference_id=reference_id,
        amount=amount,
        account_number=account_number,
        limit=limit
    )
