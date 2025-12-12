"""
Proxy Chains API Routes
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from ..models.database import ProxyChain, ProxyChainCreate, ProxyChainUpdate
from ..services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/proxy-chains", tags=["Proxy Chains"])
supabase_service = SupabaseService()


@router.get("/", response_model=List[ProxyChain])
async def get_proxy_chains(
    skip: int = 0,
    limit: int = 100,
    chain_status: Optional[str] = None
):
    """Get all proxy chains with optional filtering. Note: filtering by status is not yet supported."""
    try:
        chains = await supabase_service.get_proxy_chains(
            skip=skip,
            limit=limit
        )
        # If a status filter is provided, apply it client-side when model supports it in the future
        return chains
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch proxy chains: {str(e)}"
        )


@router.get("/{chain_id}", response_model=ProxyChain)
async def get_proxy_chain(chain_id: str):
    """Get a specific proxy chain by ID"""
    try:
        chain = await supabase_service.get_proxy_chain(chain_id)
        if not chain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proxy chain with ID {chain_id} not found"
            )
        return chain
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch proxy chain: {str(e)}"
        )


@router.post("/", response_model=ProxyChain, status_code=status.HTTP_201_CREATED)
async def create_proxy_chain(chain: ProxyChainCreate):
    """Create a new proxy chain"""
    try:
        new_chain = await supabase_service.create_proxy_chain(chain)
        return new_chain
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create proxy chain: {str(e)}"
        )


@router.put("/{chain_id}", response_model=ProxyChain)
async def update_proxy_chain(chain_id: str, chain: ProxyChainUpdate):
    """Update a proxy chain"""
    try:
        updated_chain = await supabase_service.update_proxy_chain(chain_id, chain)
        if not updated_chain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proxy chain with ID {chain_id} not found"
            )
        return updated_chain
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update proxy chain: {str(e)}"
        )


@router.delete("/{chain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proxy_chain(chain_id: str):
    """Delete a proxy chain"""
    try:
        success = await supabase_service.delete_proxy_chain(chain_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proxy chain with ID {chain_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete proxy chain: {str(e)}"
        )


@router.post("/{chain_id}/test", response_model=dict)
async def test_proxy_chain(chain_id: str):
    """Test a proxy chain"""
    try:
        # Testing proxy chains is not implemented in the service layer yet
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Testing proxy chains is not implemented yet"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test proxy chain: {str(e)}"
        )
