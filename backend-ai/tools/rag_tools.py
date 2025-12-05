"""
RAG Tools - Retrieval Augmented Generation usando embeddings vetoriais

Ferramentas para busca semântica usando VEC_COSINE_DISTANCE no MySQL/TiDB.
"""

import json
import logging
from typing import Dict, Any

# Importar do SDK (SEM API KEY - usa Claude Code CLI local)
from claude_agent_sdk import tool

logger = logging.getLogger(__name__)


@tool(
    "search_similar_waste_images",
    "Search for waste reports with visually similar images using embeddings",
    {
        "query_report_id": int,
        "limit": int,
        "min_similarity": float
    }
)
async def search_similar_waste_images(args: Dict[str, Any]) -> Dict:
    """
    Busca relatórios com imagens similares usando VEC_COSINE_DISTANCE

    Esta ferramenta usa embeddings vetoriais (VECTOR 1024-d) para encontrar
    imagens de resíduos visualmente similares.

    Args:
        query_report_id: ID do relatório de referência
        limit: Número máximo de resultados (default: 5)
        min_similarity: Similaridade mínima (0.0-1.0, default: 0.1)

    Returns:
        {
            "content": [{"type": "text", "text": "JSON com resultados"}]
        }
    """
    # Importar função de conexão do módulo pai
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app import get_db_connection

    report_id = args["query_report_id"]
    limit = args.get("limit", 5)
    min_similarity = args.get("min_similarity", 0.1)

    try:
        conn = get_db_connection()
        if not conn:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Database connection failed"
                }],
                "is_error": True
            }

        cursor = conn.cursor(dictionary=True)

        # Query usando embeddings vetoriais
        query = """
            SELECT
                r.report_id,
                r.latitude,
                r.longitude,
                r.description,
                r.status,
                r.created_at,
                ar.waste_type,
                ar.severity_score,
                ar.priority_level,
                ar.description as analysis_description,
                VEC_COSINE_DISTANCE(
                    ar.image_embedding,
                    (SELECT image_embedding
                     FROM analysis_results
                     WHERE report_id = %s)
                ) as similarity
            FROM reports r
            JOIN analysis_results ar ON r.report_id = ar.report_id
            WHERE r.report_id != %s
              AND ar.image_embedding IS NOT NULL
            ORDER BY similarity ASC
            LIMIT %s
        """

        cursor.execute(query, (report_id, report_id, limit))
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        # Filtrar por similaridade mínima
        filtered = [
            r for r in results
            if r['similarity'] is not None and r['similarity'] < min_similarity
        ]

        # Formatar resultado
        response_data = {
            "query_report_id": report_id,
            "found": len(filtered),
            "limit": limit,
            "min_similarity": min_similarity,
            "similar_reports": [
                {
                    "report_id": r["report_id"],
                    "similarity_score": round(float(r["similarity"]), 4),
                    "waste_type": r["waste_type"],
                    "severity_score": r["severity_score"],
                    "priority_level": r["priority_level"],
                    "location": {
                        "latitude": float(r["latitude"]),
                        "longitude": float(r["longitude"])
                    },
                    "description": r["description"],
                    "analysis": r["analysis_description"],
                    "status": r["status"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None
                }
                for r in filtered
            ]
        }

        logger.info(f"Found {len(filtered)} similar images for report {report_id}")

        return {
            "content": [{
                "type": "text",
                "text": json.dumps(response_data, indent=2, ensure_ascii=False)
            }]
        }

    except Exception as e:
        logger.error(f"Error in search_similar_waste_images: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }],
            "is_error": True
        }


@tool(
    "search_reports_by_location",
    "Search for reports near a geographic location using location embeddings",
    {
        "latitude": float,
        "longitude": float,
        "radius_km": float,
        "limit": int
    }
)
async def search_reports_by_location(args: Dict[str, Any]) -> Dict:
    """
    Busca relatórios próximos usando location_embedding

    Combina busca vetorial (similaridade semântica de localização)
    com cálculo de distância real (fórmula Haversine).

    Args:
        latitude: Latitude do ponto de busca
        longitude: Longitude do ponto de busca
        radius_km: Raio de busca em quilômetros (default: 5.0)
        limit: Número máximo de resultados (default: 10)

    Returns:
        {
            "content": [{"type": "text", "text": "JSON com resultados"}]
        }
    """
    # Importar funções do módulo pai
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app import get_db_connection, invoke_titan_embed_text

    lat = args["latitude"]
    lon = args["longitude"]
    radius = args.get("radius_km", 5.0)
    limit = args.get("limit", 10)

    try:
        # 1. Gerar embedding para localização de busca
        location_text = f"Geographic location at latitude {lat} longitude {lon}"
        query_embedding = invoke_titan_embed_text(location_text)

        if not query_embedding:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Failed to generate location embedding"
                }],
                "is_error": True
            }

        # 2. Buscar usando VEC_COSINE_DISTANCE + distância real
        conn = get_db_connection()
        if not conn:
            return {
                "content": [{
                    "type": "text",
                    "text": "Error: Database connection failed"
                }],
                "is_error": True
            }

        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT
                r.report_id,
                r.latitude,
                r.longitude,
                r.description,
                r.status,
                r.created_at,
                ar.waste_type,
                ar.severity_score,
                ar.priority_level,
                VEC_COSINE_DISTANCE(
                    ar.location_embedding,
                    %s
                ) as location_similarity,
                (6371 * acos(
                    cos(radians(%s)) * cos(radians(r.latitude)) *
                    cos(radians(r.longitude) - radians(%s)) +
                    sin(radians(%s)) * sin(radians(r.latitude))
                )) as distance_km
            FROM reports r
            JOIN analysis_results ar ON r.report_id = ar.report_id
            WHERE ar.location_embedding IS NOT NULL
            HAVING distance_km < %s
            ORDER BY location_similarity ASC
            LIMIT %s
        """

        cursor.execute(query, (
            json.dumps(query_embedding),
            lat, lon, lat,
            radius,
            limit
        ))
        results = cursor.fetchall()
        cursor.close()
        conn.close()

        # Formatar resultado
        response_data = {
            "search_location": {
                "latitude": lat,
                "longitude": lon
            },
            "radius_km": radius,
            "found": len(results),
            "limit": limit,
            "nearby_reports": [
                {
                    "report_id": r["report_id"],
                    "distance_km": round(float(r["distance_km"]), 2),
                    "location_similarity": round(float(r["location_similarity"]), 4),
                    "waste_type": r["waste_type"],
                    "severity_score": r["severity_score"],
                    "priority_level": r["priority_level"],
                    "location": {
                        "latitude": float(r["latitude"]),
                        "longitude": float(r["longitude"])
                    },
                    "description": r["description"],
                    "status": r["status"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None
                }
                for r in results
            ]
        }

        logger.info(f"Found {len(results)} reports near ({lat}, {lon}) within {radius}km")

        return {
            "content": [{
                "type": "text",
                "text": json.dumps(response_data, indent=2, ensure_ascii=False)
            }]
        }

    except Exception as e:
        logger.error(f"Error in search_reports_by_location: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Error: {str(e)}"
            }],
            "is_error": True
        }
