"""
Behavior Profiles API Routes
"""
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from ..models.database import BehaviorProfile, BehaviorProfileCreate, BehaviorProfileUpdate
from ..services.supabase_service import SupabaseService

router = APIRouter(prefix="/api/behaviors", tags=["Behavior Profiles"])
supabase_service = SupabaseService()


@router.get("/", response_model=List[BehaviorProfile])
async def get_behavior_profiles(
    skip: int = 0,
    limit: int = 100
):
    """Get all behavior profiles with pagination"""
    try:
        profiles = await supabase_service.get_behavior_profiles(
            skip=skip,
            limit=limit
        )
        return profiles
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch behavior profiles: {str(e)}"
        )


@router.get("/{profile_id}", response_model=BehaviorProfile)
async def get_behavior_profile(profile_id: str):
    """Get a specific behavior profile by ID"""
    try:
        profile = await supabase_service.get_behavior_profile(profile_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Behavior profile with ID {profile_id} not found"
            )
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch behavior profile: {str(e)}"
        )


@router.post("/", response_model=BehaviorProfile, status_code=status.HTTP_201_CREATED)
async def create_behavior_profile(profile: BehaviorProfileCreate):
    """Create a new behavior profile"""
    try:
        new_profile = await supabase_service.create_behavior_profile(profile)
        return new_profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create behavior profile: {str(e)}"
        )


@router.put("/{profile_id}", response_model=BehaviorProfile)
async def update_behavior_profile(profile_id: str, profile: BehaviorProfileUpdate):
    """Update a behavior profile"""
    try:
        updated_profile = await supabase_service.update_behavior_profile(profile_id, profile)
        if not updated_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Behavior profile with ID {profile_id} not found"
            )
        return updated_profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update behavior profile: {str(e)}"
        )


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_behavior_profile(profile_id: str):
    """Delete a behavior profile"""
    try:
        success = await supabase_service.delete_behavior_profile(profile_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Behavior profile with ID {profile_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete behavior profile: {str(e)}"
        )
