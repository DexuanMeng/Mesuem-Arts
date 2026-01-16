"""
Seed database with famous artworks for testing.
Downloads images, generates embeddings, and inserts into Supabase.
"""

import os
import sys
import requests
from io import BytesIO
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client, Client

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.utils.vision import ImageEmbedder

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# Famous artworks to seed
FAMOUS_ARTWORKS: List[Dict[str, any]] = [
    {
        "title": "The Starry Night",
        "artist": "Vincent van Gogh",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
        "description": "A famous post-impressionist painting depicting a swirling night sky over a village.",
        "year": 1889,
        "style": "Post-Impressionism"
    },
    {
        "title": "Mona Lisa",
        "artist": "Leonardo da Vinci",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/1200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
        "description": "The world's most famous portrait, known for the subject's enigmatic smile.",
        "year": 1503,
        "style": "Renaissance"
    },
    {
        "title": "The Scream",
        "artist": "Edvard Munch",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/1200px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
        "description": "An iconic expressionist painting depicting a figure in distress against a dramatic sky.",
        "year": 1893,
        "style": "Expressionism"
    }
]


def download_image(url: str) -> bytes:
    """
    Download an image from a URL.
    
    Args:
        url: Image URL
        
    Returns:
        Image bytes
    """
    print(f"Downloading image from: {url}")
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        raise ValueError(f"Failed to download image from {url}: {e}")


def seed_artwork(artwork_data: Dict[str, any]) -> bool:
    """
    Seed a single artwork into the database.
    
    Args:
        artwork_data: Dictionary with artwork metadata
        
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"\nProcessing: {artwork_data['title']} by {artwork_data['artist']}")
        
        # Download image
        image_bytes = download_image(artwork_data['image_url'])
        print(f"Downloaded image: {len(image_bytes)} bytes")
        
        # Generate embedding
        print("Generating embedding...")
        embedding = ImageEmbedder.generate_vector(image_bytes)
        print(f"Generated embedding: {len(embedding)} dimensions")
        
        # Prepare description_json
        description_json = {
            "description": artwork_data["description"],
            "year": artwork_data.get("year"),
            "style": artwork_data.get("style"),
            "ai_generated": False  # This is manually seeded
        }
        
        # Insert into database
        # Mark seeded artworks as verified since they're manually curated
        print("Inserting into database...")
        response = supabase.table("artworks").insert({
            "title": artwork_data["title"],
            "artist": artwork_data["artist"],
            "description_json": description_json,
            "image_url": artwork_data["image_url"],
            "embedding": embedding,
            "museum_id": None,  # Can be set later if needed
            "is_verified": True,  # Manually curated, so verified
            "source": "admin",  # Seeded by admin
            "confidence_score": 1.0  # High confidence for known artworks
        }).execute()
        
        if response.data and len(response.data) > 0:
            artwork_id = response.data[0]["id"]
            print(f"✅ Successfully seeded artwork with ID: {artwork_id}")
            return True
        else:
            print(f"❌ Failed to insert artwork (no data returned)")
            return False
            
    except Exception as e:
        print(f"❌ Error seeding {artwork_data['title']}: {e}")
        return False


def main():
    """
    Main function to seed all artworks.
    """
    print("=" * 60)
    print("Museum Art Scanner - Database Seeding Script")
    print("=" * 60)
    print(f"\nSeeding {len(FAMOUS_ARTWORKS)} famous artworks...")
    print("This will:")
    print("  1. Download images from URLs")
    print("  2. Generate CLIP embeddings")
    print("  3. Insert into Supabase database")
    print()
    
    # Pre-load the CLIP model
    print("Loading CLIP model...")
    try:
        ImageEmbedder.generate_vector(b"dummy")  # Trigger model loading
        print("✅ CLIP model loaded")
    except Exception as e:
        print(f"⚠️  Warning: Could not pre-load model: {e}")
        print("   Model will load on first use (slower)")
    
    # Seed each artwork
    success_count = 0
    for artwork in FAMOUS_ARTWORKS:
        if seed_artwork(artwork):
            success_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Seeding complete: {success_count}/{len(FAMOUS_ARTWORKS)} artworks seeded")
    print("=" * 60)
    
    if success_count == len(FAMOUS_ARTWORKS):
        print("\n✅ All artworks seeded successfully!")
        print("\nYou can now test the system by:")
        print("  1. Opening one of the artwork images on your laptop")
        print("  2. Scanning it with the mobile app")
        print("  3. It should match immediately!")
    else:
        print(f"\n⚠️  {len(FAMOUS_ARTWORKS) - success_count} artworks failed to seed")
        print("   Check the errors above and try again")


if __name__ == "__main__":
    main()
