# Capital Spring Restaurant API Testing Guide

## API Base URL
```
https://capitalspring-production.up.railway.app
```

## Endpoints Overview

### 1. Health Check Endpoints

#### GET / (Root Health Check)
**Purpose**: Basic health check
**Parameters**: None

**Curl Command**:
```bash
curl https://capitalspring-production.up.railway.app/
```

**Expected Response**:
```
Capital Spring API is running!
```

#### GET /health (Detailed Health Check)
**Purpose**: Detailed health status
**Parameters**: None

**Curl Command**:
```bash
curl https://capitalspring-production.up.railway.app/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "capital_spring_api"
}
```

### 2. Restaurant Search Endpoint

#### POST /search_restaurants (Main Restaurant Search)
**Purpose**: Search for restaurants with detailed information including coordinates, ratings, and M&A analysis
**Method**: POST
**Content-Type**: application/json

**Parameters**:
- `query` (required): Restaurant type/cuisine to search for
- `location` (optional): Location (address, coordinates, or city)
- `max_results` (optional): Maximum number of results (default: 60)

**Curl Command**:
```bash
curl -X POST https://capitalspring-production.up.railway.app/search_restaurants \
  -H "Content-Type: application/json" \
  -d '{
    "query": "italian restaurant",
    "location": "New York, NY",
    "max_results": 10
  }'
```

**Sample JSON Payloads**:

*Basic Search*:
```json
{
  "query": "pizza restaurant"
}
```

*Location-Specific Search*:
```json
{
  "query": "sushi restaurant",
  "location": "San Francisco, CA",
  "max_results": 20
}
```

*Coordinates Search*:
```json
{
  "query": "mexican restaurant",
  "location": "40.7128,-74.0060",
  "max_results": 15
}
```

**Expected Response Structure**:
```json
{
  "status": "success",
  "results": [
    {
      "name": "Restaurant Name",
      "place_id": "ChIJxxxxxx",
      "rating": 4.5,
      "user_ratings_total": 1234,
      "address": "123 Main St, City, State",
      "price_level": 2,
      "price_level_display": "$$",
      "lat": 40.7128,
      "lng": -74.0060,
      "coordinates": {"lat": 40.7128, "lng": -74.0060},
      "photo_reference": "photo_ref_string",
      "ma_score": 75,
      "business_status": "OPERATIONAL",
      "keywords_found": "No website",
      "website": null
    }
  ],
  "total_found": 10,
  "pages_fetched": 1,
  "summary": {
    "total_found": 10,
    "with_websites": 0,
    "average_rating": 4.2
  }
}
```

### 3. Geocoding Endpoint

#### GET /geocode (Address to Coordinates)
**Purpose**: Convert addresses to latitude/longitude coordinates
**Method**: GET
**Parameters**: 
- `address` (required): Address to geocode

**Curl Command**:
```bash
curl "https://capitalspring-production.up.railway.app/geocode?address=Times%20Square%20New%20York"
```

**URL-encoded Examples**:
```bash
# Simple address
curl "https://capitalspring-production.up.railway.app/geocode?address=123%20Main%20St%20New%20York"

# City only
curl "https://capitalspring-production.up.railway.app/geocode?address=San%20Francisco%20CA"

# Full address
curl "https://capitalspring-production.up.railway.app/geocode?address=1600%20Amphitheatre%20Parkway%20Mountain%20View%20CA"
```

### 4. Places Search Endpoint

#### GET /places (Google Places Search)
**Purpose**: Direct Google Places API search with location and radius
**Method**: GET
**Parameters**: 
- `query` (required): Search query
- `location` (required): Location (coordinates or address)
- `radius` (optional): Search radius in meters (default: 50000)

**Curl Commands**:
```bash
# Basic places search
curl "https://capitalspring-production.up.railway.app/places?query=restaurant&location=40.7128,-74.0060"

# With custom radius
curl "https://capitalspring-production.up.railway.app/places?query=italian%20restaurant&location=40.7128,-74.0060&radius=10000"

# Using address instead of coordinates
curl "https://capitalspring-production.up.railway.app/places?query=sushi&location=Manhattan%20NY&radius=25000"
```

## Python Testing Examples

### Basic Health Check Test
```python
import requests

# Test health endpoints
response = requests.get('https://capitalspring-production.up.railway.app/')
print(f"Root health: {response.status_code} - {response.text}")

response = requests.get('https://capitalspring-production.up.railway.app/health')
print(f"Health endpoint: {response.status_code} - {response.json()}")
```

### Restaurant Search Test
```python
import requests
import json

def test_restaurant_search():
    url = "https://capitalspring-production.up.railway.app/search_restaurants"
    
    # Test payload
    payload = {
        "query": "italian restaurant",
        "location": "New York, NY",
        "max_results": 5
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['total_found']} restaurants")
        
        # Print first restaurant details
        if data['results']:
            restaurant = data['results'][0]
            print(f"First restaurant: {restaurant['name']}")
            print(f"Rating: {restaurant['rating']}")
            print(f"Address: {restaurant['address']}")
            print(f"Coordinates: {restaurant['coordinates']}")
    else:
        print(f"Error: {response.text}")

test_restaurant_search()
```

### Geocoding Test
```python
import requests
from urllib.parse import quote

def test_geocoding():
    address = "Times Square New York"
    url = f"https://capitalspring-production.up.railway.app/geocode?address={quote(address)}"
    
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        if data['status'] == 'OK' and data['results']:
            location = data['results'][0]['geometry']['location']
            print(f"Address: {address}")
            print(f"Coordinates: {location['lat']}, {location['lng']}")
    else:
        print(f"Error: {response.text}")

test_geocoding()
```

## Google Places API Key Verification

### Method 1: Direct API Test
```python
import requests

def verify_google_places_api():
    # Test direct Google Places API
    api_key = "YOUR_API_KEY"  # Replace with your actual key
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    
    params = {
        'query': 'restaurant',
        'key': api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data['status'] == 'OK':
        print("✅ Google Places API key is working")
        print(f"Found {len(data['results'])} results")
    else:
        print(f"❌ API Error: {data['status']}")
        print(f"Error message: {data.get('error_message', 'Unknown error')}")
```

### Method 2: Test Through Your API
```python
import requests

def test_api_key_through_app():
    # Test through your deployed app
    url = "https://capitalspring-production.up.railway.app/search_restaurants"
    
    payload = {
        "query": "restaurant",
        "location": "New York",
        "max_results": 1
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        if data['status'] == 'success' and data['results']:
            print("✅ API key is working through your app")
            print(f"Found {data['total_found']} restaurants")
        else:
            print("❌ API key issue - no results returned")
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)

test_api_key_through_app()
```

## Error Handling

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `500`: Internal Server Error (API key issues, server errors)

### Common Error Responses
```json
{
  "error": "Query parameter required"
}
```

```json
{
  "error": "Address parameter required"
}
```

```json
{
  "error": "Query and location parameters required"
}
```

## Rate Limiting and Best Practices

1. **Google Places API Limits**: Be aware of your Google Places API quotas
2. **Reasonable Request Sizes**: Use `max_results` parameter to limit response size
3. **Error Handling**: Always check response status codes
4. **Caching**: Consider caching results for repeated queries

## Troubleshooting

### If endpoints return 500 errors:
1. Check Railway logs for detailed error messages
2. Verify `GOOGLE_PLACES_API_KEY` is set in Railway environment
3. Test Google Places API key directly

### If no results are returned:
1. Try broader search terms
2. Check if location is valid
3. Verify API key has Places API enabled

### If coordinates are missing:
1. Check Google Places API response format
2. Verify geometry data is present in API response