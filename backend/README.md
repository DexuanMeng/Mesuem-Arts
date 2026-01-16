# Museum Art Scanner Backend

FastAPI backend with computer vision and auto-cataloging capabilities.

## Features

- **Local Vision Embeddings**: Uses CLIP (ViT-B-32) model for image embeddings
- **Auto-Cataloging**: Automatically saves new artworks to database when first scanned
- **Vector Search**: Fast similarity search using pgvector (cosine distance < 0.15)
- **AI Analysis**: GPT-4o-mini for artwork analysis when no match is found

## Setup

1. Install dependencies:
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

2. Create `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

3. Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Seeding the Database

To seed the database with famous artworks for testing:

```bash
python scripts/seed_db.py
```

This will:
- Download 3 famous artworks (Starry Night, Mona Lisa, The Scream)
- Generate CLIP embeddings
- Insert into Supabase

After seeding, you can test by scanning the images on your laptop screen!

## API Endpoints

### POST `/scan` or `/identify`

Scans an artwork image and returns identification or analysis.

**Request:**
- `image`: Image file (multipart/form-data)
- `latitude`: Float
- `longitude`: Float
- `user_id`: String (optional)

**Response:**
```json
{
  "status": "match_found" | "ai_analysis" | "not_art",
  "artwork": { ... },
  "ai_generated": boolean,
  "cataloged": boolean
}
```

## Architecture

- **Vision Embeddings**: `app/utils/vision.py` - CLIP model wrapper
- **Auto-Cataloging**: New artworks are automatically saved to DB with embeddings
- **Vector Search**: Uses pgvector cosine distance for fast matching

## Notes

- CLIP model loads once on startup (cached globally)
- Cosine distance threshold: 0.15 (strict matching)
- Auto-cataloging ensures first user "teaches" the system for subsequent users
