"""
FastAPI Backend for Museum Art Scanner MVP
Main endpoint: POST /scan - Analyzes artwork images and returns matches or AI analysis
"""

import os
from typing import Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import base64
from io import BytesIO
from PIL import Image
import numpy as np
from supabase import create_client, Client
from openai import OpenAI
from dotenv import load_dotenv
import json
from datetime import datetime
import logging

from app.utils.vision import ImageEmbedder

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
# TODO: Create a .env file with the following keys:
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_service_role_key
# OPENAI_API_KEY=your_openai_api_key
load_dotenv()

app = FastAPI(title="Museum Art Scanner API")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not all([supabase_url, supabase_key, openai_api_key]):
    raise ValueError("Missing required environment variables. Check SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY")

supabase: Client = create_client(supabase_url, supabase_key)
openai_client = OpenAI(api_key=openai_api_key)

# Constants
COSINE_DISTANCE_THRESHOLD = 0.15  # Stricter threshold for matching (lower = more strict)
EMBEDDING_DIMENSION = 512

# Pre-load the CLIP model on startup
logger.info("Pre-loading CLIP model on startup...")
try:
    ImageEmbedder.generate_vector(b"dummy")  # Trigger model loading
    logger.info("CLIP model loaded successfully")
except Exception as e:
    logger.warning(f"Could not pre-load CLIP model: {e}. It will load on first use.")


def check_museum_location(latitude: float, longitude: float) -> Optional[int]:
    """
    Check if user is within geofence of any museum.
    Returns museum_id if found, None otherwise.
    """
    try:
        # Query all museums
        response = supabase.table("museums").select("*").execute()
        
        if not response.data:
            return None
        
        # Check each museum's geofence
        for museum in response.data:
            # Handle different location formats from Supabase
            location = museum.get("location")
            if isinstance(location, dict) and "coordinates" in location:
                # GeoJSON format: [longitude, latitude]
                museum_lng = location["coordinates"][0]
                museum_lat = location["coordinates"][1]
            elif isinstance(location, str):
                # PostGIS POINT string format: "(lng, lat)"
                coords = location.strip("()").split(",")
                museum_lng = float(coords[0].strip())
                museum_lat = float(coords[1].strip())
            else:
                continue  # Skip if format is unexpected
            
            radius = museum["geofence_radius_meters"]
            
            # Calculate distance using Haversine formula
            from math import radians, cos, sin, asin, sqrt
            
            def haversine(lat1, lon1, lat2, lon2):
                """Calculate distance between two points in meters"""
                R = 6371000  # Earth radius in meters
                dlat = radians(lat2 - lat1)
                dlon = radians(lon2 - lon1)
                a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
                c = 2 * asin(sqrt(a))
                return R * c
            
            distance = haversine(museum_lat, museum_lng, latitude, longitude)
            
            if distance <= radius:
                return museum["id"]
        
        return None
    
    except Exception as e:
        print(f"Error checking museum location: {e}")
        return None


def vector_similarity_search(embedding: list[float], museum_id: Optional[int] = None) -> Optional[dict]:
    """
    Perform vector similarity search in artworks table using pgvector.
    Uses cosine distance < 0.15 threshold.
    Returns the best match if found, None otherwise.
    """
    try:
        # Convert embedding to string format for Supabase
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"
        
        # Build query - use pgvector's cosine distance operator
        # Cosine distance = 1 - cosine similarity
        # So distance < 0.15 means similarity > 0.85
        query = supabase.rpc(
            "match_artworks",
            {
                "query_embedding": embedding_str,
                "match_threshold": COSINE_DISTANCE_THRESHOLD,
                "match_count": 1,
                "museum_id": museum_id
            }
        ).execute()
        
        # If RPC doesn't exist, fall back to client-side search
        if not hasattr(query, 'data') or not query.data:
            # Fallback: client-side search
            db_query = supabase.table("artworks").select("*")
            if museum_id:
                db_query = db_query.eq("museum_id", museum_id)
            
            response = db_query.execute()
            
            if not response.data:
                return None
            
            best_match = None
            best_distance = float('inf')
            
            embedding_array = np.array(embedding)
            
            for artwork in response.data:
                if artwork.get("embedding"):
                    artwork_embedding = np.array(artwork["embedding"])
                    # Cosine distance = 1 - cosine similarity
                    cosine_sim = np.dot(embedding_array, artwork_embedding) / (
                        np.linalg.norm(embedding_array) * np.linalg.norm(artwork_embedding)
                    )
                    cosine_distance = 1 - cosine_sim
                    
                    if cosine_distance < best_distance:
                        best_distance = cosine_distance
                        best_match = artwork
            
            if best_distance < COSINE_DISTANCE_THRESHOLD:
                return {
                    "artwork": best_match,
                    "distance": float(best_distance),
                    "similarity": float(1 - best_distance)
                }
            
            return None
        
        # If RPC worked, use its result
        if query.data and len(query.data) > 0:
            return {
                "artwork": query.data[0],
                "distance": query.data[0].get("distance", 0),
                "similarity": float(1 - query.data[0].get("distance", 0))
            }
        
        return None
    
    except Exception as e:
        logger.error(f"Error in vector search: {e}")
        # Fallback to client-side search
        try:
            db_query = supabase.table("artworks").select("*")
            if museum_id:
                db_query = db_query.eq("museum_id", museum_id)
            
            response = db_query.execute()
            
            if not response.data:
                return None
            
            best_match = None
            best_distance = float('inf')
            
            embedding_array = np.array(embedding)
            
            for artwork in response.data:
                if artwork.get("embedding"):
                    artwork_embedding = np.array(artwork["embedding"])
                    cosine_sim = np.dot(embedding_array, artwork_embedding) / (
                        np.linalg.norm(embedding_array) * np.linalg.norm(artwork_embedding)
                    )
                    cosine_distance = 1 - cosine_sim
                    
                    if cosine_distance < best_distance:
                        best_distance = cosine_distance
                        best_match = artwork
            
            if best_distance < COSINE_DISTANCE_THRESHOLD:
                return {
                    "artwork": best_match,
                    "distance": float(best_distance),
                    "similarity": float(1 - best_distance)
                }
        except Exception as e2:
            logger.error(f"Fallback search also failed: {e2}")
        
        return None


def analyze_artwork_with_ai(image_bytes: bytes) -> Dict[str, Any]:
    """
    Use GPT-4o-mini Vision to analyze artwork and return structured JSON with confidence.
    Returns a dict with: title, artist, description, year, style, confidence
    """
    try:
        # Convert image to base64 for OpenAI API
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an art historian. Analyze artworks and return ONLY valid JSON. Do not make up specific names if you don't know them. If uncertain, explicitly label as 'Unknown Art' and describe the style instead."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this artwork. Return a JSON object with these exact fields:
{
  "title": "artwork title. If you are not 100% sure of the specific title, use 'Unknown Art' and describe the style instead",
  "artist": "artist name or 'Unknown' if uncertain",
  "description": "detailed description of the artwork, style, and context",
  "year": "estimated year or null if uncertain",
  "style": "art movement or style (e.g., Impressionism, Renaissance, etc.)",
  "confidence": "low, medium, or high - based on how certain you are about the title and artist"
}
If this is not an artwork, return: {"error": "This does not appear to be an artwork"}
Return ONLY the JSON, no other text."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=500
        )
        
        analysis_text = response.choices[0].message.content
        
        # Parse JSON response
        try:
            analysis_data = json.loads(analysis_text)
            
            # Check if it's not art
            if "error" in analysis_data:
                return {
                    "is_art": False,
                    "message": analysis_data["error"]
                }
            
            # Convert confidence string to numeric score
            confidence_str = analysis_data.get("confidence", "low").lower()
            confidence_map = {"high": 0.8, "medium": 0.5, "low": 0.3}
            confidence_score = confidence_map.get(confidence_str, 0.3)
            
            # Return structured data
            return {
                "is_art": True,
                "title": analysis_data.get("title", "Unknown Art"),
                "artist": analysis_data.get("artist", "Unknown"),
                "description": analysis_data.get("description", ""),
                "year": analysis_data.get("year"),
                "style": analysis_data.get("style", "Unknown"),
                "confidence": confidence_str,
                "confidence_score": confidence_score,
                "ai_generated": True
            }
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails - assume low confidence
            return {
                "is_art": True,
                "title": "Unknown Art",
                "artist": "Unknown",
                "description": analysis_text,
                "year": None,
                "style": "Unknown",
                "confidence": "low",
                "confidence_score": 0.3,
                "ai_generated": True
            }
    
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


def save_artwork_to_db(
    title: str,
    artist: str,
    description: str,
    year: Optional[int],
    style: str,
    embedding: list[float],
    confidence_score: Optional[float] = None,
    museum_id: Optional[int] = None,
    image_url: Optional[str] = None,
    is_verified: bool = False,
    source: str = "ai_generated"
) -> Optional[int]:
    """
    Save a new artwork to the database with its embedding.
    Sets is_verified=false and source='ai_generated' for AI-generated entries.
    Returns the artwork ID if successful, None otherwise.
    """
    try:
        # Prepare description_json
        description_json = {
            "description": description,
            "year": year,
            "style": style,
            "ai_generated": True
        }
        
        # Insert artwork with embedding and verification flags
        response = supabase.table("artworks").insert({
            "museum_id": museum_id,
            "title": title,
            "artist": artist,
            "description_json": description_json,
            "image_url": image_url or "placeholder_url",
            "embedding": embedding,  # pgvector will handle this
            "is_verified": is_verified,  # Always false for AI-generated
            "source": source,  # 'ai_generated' for AI entries
            "confidence_score": confidence_score  # 0.0-1.0 confidence level
        }).execute()
        
        if response.data and len(response.data) > 0:
            artwork_id = response.data[0]["id"]
            logger.info(
                f"Saved new artwork to DB: {title} by {artist} "
                f"(ID: {artwork_id}, verified={is_verified}, source={source})"
            )
            return artwork_id
        
        return None
    
    except Exception as e:
        logger.error(f"Error saving artwork to DB: {e}")
        return None


def save_user_scan(user_id: str, artwork_id: Optional[int], image_url: str):
    """
    Log the scan interaction to user_scans table.
    """
    try:
        supabase.table("user_scans").insert({
            "user_id": user_id,
            "artwork_id": artwork_id,
            "image_url": image_url,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print(f"Error saving user scan: {e}")
        # Don't fail the request if logging fails


@app.post("/scan")
@app.post("/identify")  # Support both endpoints
async def scan_artwork(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: str = Form(default="anonymous")  # In production, get from auth token
):
    """
    Main scan/identify endpoint with auto-cataloging.
    
    Strict logic flow:
    1. Generate embedding for uploaded image
    2. Vector search in artworks table (cosine distance < 0.15)
    3. Condition A (Match Found): Return database record immediately
    4. Condition B (No Match): 
       - Call GPT-4o-mini for analysis
       - Save new artwork + vector to database (auto-cataloging)
       - Return new artwork data
    """
    try:
        # Read image
        image_bytes = await image.read()
        
        # Step 1: Check museum location
        museum_id = check_museum_location(latitude, longitude)
        
        # Step 2: Generate embedding using CLIP model
        logger.info("Generating image embedding...")
        embedding = ImageEmbedder.generate_vector(image_bytes)
        logger.info(f"Generated embedding: {len(embedding)} dimensions")
        
        # Step 3: Vector similarity search (cosine distance < 0.15)
        logger.info("Searching for matching artwork...")
        match_result = vector_similarity_search(embedding, museum_id)
        
        # Step 4: Decision tree
        if match_result:
            # Condition A: Match found
            artwork = match_result["artwork"]
            is_verified = artwork.get("is_verified", False)
            
            logger.info(
                f"Match found: {artwork.get('title')} by {artwork.get('artist')} "
                f"(verified={is_verified})"
            )
            
            image_url = "placeholder_url"  # TODO: Upload to Supabase Storage
            
            # Log scan
            save_user_scan(user_id, artwork["id"], image_url)
            
            # Determine status based on verification
            if is_verified:
                status = "verified_result"
                badge = "Official Museum Data"
            else:
                status = "community_result"
                badge = "AI Analysis"
            
            return JSONResponse({
                "status": status,
                "artwork": {
                    "id": artwork["id"],
                    "title": artwork["title"],
                    "artist": artwork["artist"],
                    "description": artwork.get("description_json", {}),
                    "image_url": artwork.get("image_url"),
                    "similarity": match_result.get("similarity", 0),
                    "distance": match_result.get("distance", 0),
                    "is_verified": is_verified,
                    "source": artwork.get("source", "unknown"),
                    "confidence_score": artwork.get("confidence_score")
                },
                "badge": badge,
                "ai_generated": not is_verified
            })
        
        else:
            # Condition B: No match - Auto-cataloging
            logger.info("No match found. Analyzing with GPT-4o-mini and auto-cataloging...")
            
            # Call GPT-4o-mini for structured analysis
            ai_result = analyze_artwork_with_ai(image_bytes)
            
            if not ai_result["is_art"]:
                # Not an artwork
                return JSONResponse({
                    "status": "not_art",
                    "message": ai_result.get("message", "This does not appear to be an artwork."),
                    "ai_generated": False
                })
            
            # Step 3: Save new artwork to database with embedding (AUTO-CATALOGING)
            # MUST SET: is_verified=false, source='ai_generated'
            logger.info(f"Auto-cataloging: {ai_result['title']} by {ai_result['artist']}")
            artwork_id = save_artwork_to_db(
                title=ai_result["title"],
                artist=ai_result["artist"],
                description=ai_result["description"],
                year=ai_result.get("year"),
                style=ai_result.get("style", "Unknown"),
                embedding=embedding,  # Save the vector!
                confidence_score=ai_result.get("confidence_score"),
                museum_id=museum_id,
                image_url="placeholder_url",
                is_verified=False,  # CRITICAL: Always false for AI-generated
                source="ai_generated"  # CRITICAL: Mark as AI-generated
            )
            
            if artwork_id:
                logger.info(f"Successfully cataloged artwork with ID: {artwork_id}")
            else:
                logger.warning("Failed to save artwork to database, but continuing...")
            
            # Log scan
            save_user_scan(user_id, artwork_id, "placeholder_url")
            
            # Step 4: Return the new artwork data with badge flag
            return JSONResponse({
                "status": "ai_analysis",
                "artwork": {
                    "id": artwork_id,
                    "title": ai_result["title"],
                    "artist": ai_result["artist"],
                    "description": {
                        "description": ai_result["description"],
                        "year": ai_result.get("year"),
                        "style": ai_result.get("style"),
                        "ai_generated": True
                    },
                    "image_url": "placeholder_url",
                    "is_verified": False,  # Always false for AI-generated
                    "source": "ai_generated",
                    "confidence_score": ai_result.get("confidence_score"),
                    "confidence": ai_result.get("confidence", "low")
                },
                "badge": "AI Estimate",  # Frontend will show this
                "ai_generated": True,
                "cataloged": artwork_id is not None
            })
    
    except Exception as e:
        logger.error(f"Error in scan endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "Museum Art Scanner API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/report-issue")
async def report_issue(
    artwork_id: int = Form(...),
    user_id: str = Form(...),
    issue_type: str = Form(...),  # e.g., "wrong_title", "wrong_artist", "not_artwork"
    description: str = Form(default="")
):
    """
    Endpoint for users to report issues with AI-generated artwork data.
    This helps identify hallucinations and improve data quality.
    """
    try:
        # In production, save to a reports/issues table
        # For now, just log it
        logger.warning(
            f"User {user_id} reported issue with artwork {artwork_id}: "
            f"{issue_type} - {description}"
        )
        
        # TODO: Create a reports table and save this
        # For MVP, we'll just log it
        
        return JSONResponse({
            "status": "success",
            "message": "Thank you for reporting. We'll review this issue."
        })
    
    except Exception as e:
        logger.error(f"Error reporting issue: {e}")
        raise HTTPException(status_code=500, detail=str(e))
