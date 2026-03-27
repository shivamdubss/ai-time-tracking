from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..database import (
    create_client, get_client, get_all_clients, update_client, delete_client,
)

router = APIRouter(prefix="/api/clients", tags=["clients"])


class CreateClientRequest(BaseModel):
    name: str
    contact_info: Optional[str] = None
    billing_address: Optional[str] = None
    default_rate: Optional[float] = None
    notes: Optional[str] = None


class UpdateClientRequest(BaseModel):
    name: Optional[str] = None
    contact_info: Optional[str] = None
    billing_address: Optional[str] = None
    default_rate: Optional[float] = None
    notes: Optional[str] = None


@router.get("")
async def list_clients():
    return get_all_clients()


@router.post("", status_code=201)
async def create_client_endpoint(req: CreateClientRequest):
    return create_client(
        name=req.name,
        contact_info=req.contact_info,
        billing_address=req.billing_address,
        default_rate=req.default_rate,
        notes=req.notes,
    )


@router.get("/{client_id}")
async def get_client_endpoint(client_id: str):
    client = get_client(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}")
async def update_client_endpoint(client_id: str, req: UpdateClientRequest):
    existing = get_client(client_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        return existing
    return update_client(client_id, **updates)


@router.delete("/{client_id}")
async def delete_client_endpoint(client_id: str):
    success, err = delete_client(client_id)
    if not success and err:
        raise HTTPException(status_code=409, detail=err)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"deleted": True}
