from tavily import TavilyClient

from eden.config import config


def search_web(query: str, limit: int = 5):
    query = query.strip()

    if not query:
        return []

    limit = max(1, min(limit, 10))

    if config.SEARCH_PROVIDER != "tavily" or not config.SEARCH_API_KEY:
        return [
            {
                "title": "Search not configured",
                "url": "",
                "snippet": "Set SEARCH_PROVIDER=tavily and SEARCH_API_KEY in Backend/.env.",
                "source": "config",
            }
        ]

    try:
        client = TavilyClient(api_key=config.SEARCH_API_KEY)

        response = client.search(
            query=query,
            max_results=limit,
            search_depth="basic",
            include_answer=False,
            include_raw_content=False,
        )

        results = []

        for item in response.get("results", []):
            results.append(
                {
                    "title": item.get("title", "Untitled"),
                    "url": item.get("url", ""),
                    "snippet": item.get("content", ""),
                    "source": "tavily",
                }
            )

        return results

    except Exception as error:
        return [
            {
                "title": "Search failed",
                "url": "",
                "snippet": str(error),
                "source": "tavily_error",
            }
        ]
