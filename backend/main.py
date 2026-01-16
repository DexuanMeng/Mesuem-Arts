"""
FastAPI Backend for Museum Art Scanner MVP
Main endpoint: POST /scan - Analyzes artwork images and returns matches or AI analysis
"""

import os
from typing import Optional
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
SIMILARITY_THRESHOLD = 0.85
EMBEDDING_DIMENSION = 512


def get_image_embedding(image_bytes: bytes) -> list[float]:
    """
    Generate embedding for an image using OpenAI's CLIP model.
    Note: OpenAI doesn't have a direct CLIP API, so we'll use GPT-4 Vision
    or a workaround. For MVP, we'll use a placeholder that you can replace
    with actual CLIP embedding generation.
    
    TODO: Replace this with actual CLIP embedding:
    - Option 1: Use OpenAI's image embeddings (if available)
    - Option 2: Use a local CLIP model via transformers library
    - Option 3: Use a third-party CLIP API
    """
    # Placeholder: Generate a random embedding for MVP
    # In production, replace with actual CLIP embedding
    embedding = np.random.rand(EMBEDDING_DIMENSION).tolist()
    
    # Normalize the embedding vector
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = (np.array(embedding) / norm).tolist()
    
    return embedding


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
    Perform vector similarity search in artworks table.
    Returns the best match if similarity > threshold, None otherwise.
    """
    try:
        # Build query based on scope
        query = supabase.table("artworks").select("*")
        
        if museum_id:
            query = query.eq("museum_id", museum_id)
        
        # Execute query and calculate cosine similarity
        # Note: Supabase with pgvector supports similarity search, but we'll do it client-side for MVP
        # In production, use Supabase's vector similarity functions
        response = query.execute()
        
        if not response.data:
            return None
        
        best_match = None
        best_similarity = 0
        
        embedding_array = np.array(embedding)
        
        for artwork in response.data:
            if artwork.get("embedding"):
                artwork_embedding = np.array(artwork["embedding"])
                # Cosine similarity
                similarity = np.dot(embedding_array, artwork_embedding) / (
                    np.linalg.norm(embedding_array) * np.linalg.norm(artwork_embedding)
                )
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = artwork
        
        if best_similarity >= SIMILARITY_THRESHOLD:
            return {
                "artwork": best_match,
                "similarity": float(best_similarity)
            }
        
        return None
    
    except Exception as e:
        print(f"Error in vector search: {e}")
        return None


def analyze_artwork_with_ai(image_bytes: bytes) -> dict:
    """
    Use GPT-4o-mini Vision to analyze artwork when no match is found.
    """
    try:
        # Convert image to base64 for OpenAI API
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a friendly art historian. Analyze artworks and provide insights about style, era, and medium. Do not make up specific names if you don't know them. If the image is not an artwork, politely indicate that."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyze this artwork. Estimate the style, era, and medium. Act as a friendly art historian. Do not make up a specific name if you don't know it."
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
            max_tokens=500
        )
        
        analysis_text = response.choices[0].message.content
        
        # Check if it's not art
        if "not an artwork" in analysis_text.lower() or "not artwork" in analysis_text.lower():
            return {
                "is_art": False,
                "message": analysis_text
            }
        
        return {
            "is_art": True,
            "analysis": analysis_text,
            "ai_generated": True
        }
    
    except Exception as e:
        print(f"Error in AI analysis: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


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
async def scan_artwork(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    user_id: str = Form(default="anonymous")  # In production, get from auth token
):
    """
    Main scan endpoint.
    
    Flow:
    1. Receive image + location
    2. Check if user is in museum geofence
    3. Generate embedding
    4. Search for similar artworks
    5. Return match or AI analysis
    6. Log the scan
    """
    try:
        # Read image
        image_bytes = await image.read()
        
        # Step 1: Check museum location
        museum_id = check_museum_location(latitude, longitude)
        search_scope = museum_id if museum_id else "global"
        
        # Step 2: Generate embedding
        embedding = get_image_embedding(image_bytes)
        
        # Step 3: Vector similarity search
        match_result = vector_similarity_search(embedding, museum_id)
        
        # Step 4: Decision tree
        if match_result and match_result["similarity"] >= SIMILARITY_THRESHOLD:
            # Case A: Match found
            artwork = match_result["artwork"]
            
            # Upload image to storage (placeholder - implement actual storage)
            image_url = "placeholder_url"  # TODO: Upload to Supabase Storage
            
            # Log scan
            save_user_scan(user_id, artwork["id"], image_url)
            
            return JSONResponse({
                "status": "match_found",
                "artwork": {
                    "id": artwork["id"],
                    "title": artwork["title"],
                    "artist": artwork["artist"],
                    "description": artwork["description_json"],
                    "image_url": artwork["image_url"],
                    "similarity": match_result["similarity"]
                },
                "ai_generated": False
            })
        
        else:
            # Case B/C: No match - use AI analysis
            ai_result = analyze_artwork_with_ai(image_bytes)
            
            if not ai_result["is_art"]:
                # Case C: Not art
                return JSONResponse({
                    "status": "not_art",
                    "message": ai_result["message"],
                    "ai_generated": False
                })
            
            # Case B: Unknown artwork - AI analysis
            image_url = "placeholder_url"  # TODO: Upload to Supabase Storage
            
            # Log scan (no artwork_id since it's unknown)
            save_user_scan(user_id, None, image_url)
            
            return JSONResponse({
                "status": "ai_analysis",
                "analysis": ai_result["analysis"],
                "ai_generated": True
            })
    
    except Exception as e:
        print(f"Error in scan endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {"message": "Museum Art Scanner API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
