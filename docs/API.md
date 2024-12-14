# SolFlu Translator API Documentation

## Overview

The SolFlu Translator API converts cryptocurrency market metrics into virus simulation parameters. It provides real-time translation of market conditions into parameters that control virus behavior in the simulation.

## Base URL

```
http://localhost:8002
```

## Authentication

Currently, the API does not require authentication. CORS is enabled for all origins.

## Endpoints

### Translate Market Metrics

Converts market metrics into simulation parameters.

```
POST /translate
```

#### Request Body

```json
{
    "price": float,
    "volume_24h": float,
    "price_change_24h": float,
    "market_cap": float,
    "timestamp": float
}
```

| Field | Type | Description |
|-------|------|-------------|
| price | float | Current price of the asset |
| volume_24h | float | 24-hour trading volume |
| price_change_24h | float | 24-hour price change percentage |
| market_cap | float | Current market capitalization |
| timestamp | float | Unix timestamp of the metrics |

#### Response

```json
{
    "infection_rate": float,
    "mutation_rate": float,
    "transmission_speed": float,
    "cure_progress": float
}
```

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| infection_rate | float | 0.1 - 0.8 | Rate at which the virus spreads |
| mutation_rate | float | 0.01 - 0.2 | Probability of virus mutation |
| transmission_speed | float | 0.5 - 2.0 | Speed of virus transmission |
| cure_progress | float | 0.0 - 0.3 | Progress towards cure development |

#### Example

Request:
```json
POST /translate
{
    "price": 100.0,
    "volume_24h": 5000000000,
    "price_change_24h": 10.0,
    "market_cap": 10000000000,
    "timestamp": 1677721600
}
```

Response:
```json
{
    "infection_rate": 0.4,
    "mutation_rate": 0.05,
    "transmission_speed": 1.2,
    "cure_progress": 0.1
}
```

### Health Check

Get API health status and cache statistics.

```
GET /health
```

#### Response

```json
{
    "status": "healthy",
    "timestamp": float,
    "cache_stats": {
        "total_requests": int,
        "cache_hits": int,
        "cache_misses": int,
        "hit_rate": float
    }
}
```

### Metrics

Get detailed API metrics and performance statistics.

```
GET /metrics
```

#### Response

```json
{
    "cache_stats": {
        "total_requests": int,
        "cache_hits": int,
        "cache_misses": int,
        "hit_rate": float
    },
    "uptime": float
}
```

## Parameter Translation Rules

### Infection Rate
- Base rate influenced by market cap (0.1 to 0.4)
- Increased by positive price momentum
- Range: 0.1 to 0.8

### Mutation Rate
- Based on trading volume and volatility
- Higher volume = more mutations
- Range: 0.01 to 0.2

### Transmission Speed
- Primarily volume-based
- Modified by market cap
- Range: 0.5 to 2.0

### Cure Progress
- Inversely related to price change
- Accelerates in bear markets
- Range: 0.0 to 0.3

## Performance

- Average response time: < 50ms
- 95th percentile: < 100ms
- Cache hit rate: > 80%
- Concurrent requests: Up to 100/second

## Error Handling

All errors follow this format:

```json
{
    "detail": "Error message"
}
```

Common HTTP status codes:
- 200: Success
- 400: Invalid request body
- 422: Validation error
- 500: Server error

## Rate Limiting

Currently no rate limiting is implemented, but clients should:
- Cache responses when possible
- Implement exponential backoff on errors
- Limit concurrent requests to 100/second

## Monitoring

The API provides detailed logs in the `logs` directory:
- `translator.log`: General application logs
- `error.log`: Error logs
- `performance.log`: Performance metrics

Each log entry includes:
- Timestamp
- Request ID
- Input parameters
- Response time
- Cache status
- Error details (if any)

## Best Practices

1. Cache responses when possible
2. Use appropriate error handling
3. Monitor response times
4. Check health endpoint regularly
5. Implement circuit breakers for production use 