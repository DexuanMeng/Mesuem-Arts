"""
Vision embedding utilities using CLIP model.
Loads the model globally on startup for efficient inference.
"""

from typing import List
from io import BytesIO
from PIL import Image
from sentence_transformers import SentenceTransformer
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Global model instance (loaded once on startup)
_model: SentenceTransformer = None


class ImageEmbedder:
    """
    Handles image embedding generation using CLIP model.
    Model is loaded globally to avoid reloading on every request.
    """
    
    MODEL_NAME = "sentence-transformers/clip-ViT-B-32"
    EMBEDDING_DIMENSION = 512
    
    @classmethod
    def _get_model(cls) -> SentenceTransformer:
        """
        Get or load the CLIP model.
        Loads the model on first call and caches it globally.
        """
        global _model
        if _model is None:
            logger.info(f"Loading CLIP model: {cls.MODEL_NAME}")
            _model = SentenceTransformer(cls.MODEL_NAME)
            logger.info("CLIP model loaded successfully")
        return _model
    
    @classmethod
    def generate_vector(cls, image_bytes: bytes) -> List[float]:
        """
        Generate a 512-dimensional embedding vector for an image.
        
        Args:
            image_bytes: Raw image bytes (JPEG, PNG, etc.)
            
        Returns:
            List of 512 floats representing the image embedding
        """
        try:
            # Load model (cached after first call)
            model = cls._get_model()
            
            # Convert bytes to PIL Image
            image = Image.open(BytesIO(image_bytes))
            
            # Convert to RGB if necessary (handles RGBA, L, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Generate embedding using CLIP
            # The model.encode() method handles image preprocessing
            embedding = model.encode(image, convert_to_numpy=True)
            
            # Ensure it's a 512-dim vector
            if len(embedding) != cls.EMBEDDING_DIMENSION:
                raise ValueError(
                    f"Expected embedding dimension {cls.EMBEDDING_DIMENSION}, "
                    f"got {len(embedding)}"
                )
            
            # Normalize the vector (important for cosine similarity)
            embedding_norm = np.linalg.norm(embedding)
            if embedding_norm > 0:
                embedding = embedding / embedding_norm
            
            # Convert to list of floats
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Error generating image embedding: {e}")
            raise ValueError(f"Failed to generate image embedding: {str(e)}")
    
    @classmethod
    def get_embedding_dimension(cls) -> int:
        """Return the expected embedding dimension."""
        return cls.EMBEDDING_DIMENSION
