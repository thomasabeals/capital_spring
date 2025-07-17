from flask import Flask, request, jsonify
from flask_cors import CORS  # Need to install: pip install flask-cors
import requests
import time
import os
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Your Google API Key here (keep it secret!)
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY')

# Check if API key is set
if not GOOGLE_PLACES_API_KEY:
    print("⚠️  WARNING: GOOGLE_PLACES_API_KEY environment variable not set!")
    print("   Set it in Railway dashboard or your local environment")

# Price level configuration
PRICE_LEVELS = {
    1: '$',
    2: '$$', 
    3: '$$$',
    4: '$$$$'
}

def search_restaurants(query, location="", max_results=60):
    """Enhanced search with pagination support for up to 60 results"""
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    
    all_results = []
    next_page_token = None
    pages_fetched = 0
    max_pages = 3
    
    print(f"🔍 STARTING SEARCH: query='{query}', location='{location}', max_results={max_results}")
    
    # Extract lat/lng from location if it's in coordinate format
    lat, lng = None, None
    if location and ',' in location:
        try:
            lat, lng = map(float, location.split(','))
            print(f"📍 Using coordinates: lat={lat}, lng={lng}")
        except ValueError:
            print(f"⚠️ Invalid coordinate format: {location}")
    
    while pages_fetched < max_pages and len(all_results) < max_results:
        # Use proper location parameters to force Google to search the specified area
        if lat and lng:
            params = {
                'query': f"{query} restaurant",
                'location': f"{lat},{lng}",
                'radius': 50000,  # 50km radius from the location
                'locationbias': f"circle:50000@{lat},{lng}",  # Force search in this area
                'type': 'restaurant',
                'key': GOOGLE_PLACES_API_KEY
            }
            print(f"🎯 LOCATION-BASED SEARCH: Using lat={lat}, lng={lng} with 50km radius")
        else:
            # Fallback for non-coordinate locations
            params = {
                'query': f"{query} restaurant {location}",
                'key': GOOGLE_PLACES_API_KEY
            }
            print(f"🔍 TEXT-BASED SEARCH: Using query with location text")
        
        if next_page_token:
            params['pagetoken'] = next_page_token
            print(f"📄 Using next_page_token: {next_page_token[:50]}...")
        else:
            print(f"📄 No page token - this is page 1")
        
        print(f"🌐 Making API call #{pages_fetched + 1}")
        print(f"🔍 Query params: {params.get('query', 'No query')}")
        if 'location' in params:
            print(f"📍 Location param: {params['location']}")
        if 'radius' in params:
            print(f"🎯 Radius param: {params['radius']}")
        if 'locationbias' in params:
            print(f"🧭 LocationBias param: {params['locationbias']}")
        print(f"🔑 API Key: {GOOGLE_PLACES_API_KEY[:10] if GOOGLE_PLACES_API_KEY else 'NOT SET'}...{GOOGLE_PLACES_API_KEY[-5:] if GOOGLE_PLACES_API_KEY else ''}")
        print(f"📡 Full URL: {url}")
        print(f"📋 All params: {params}")
        
        response = requests.get(url, params=params)
        
        print(f"📊 HTTP Status Code: {response.status_code}")
        print(f"🌐 Actual request URL: {response.request.url[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📊 API Response Status: {data.get('status')}")
            
            if data.get('status') == 'OK':
                results = data.get('results', [])
                print(f"📈 Results this page: {len(results)}")
                print(f"📈 Total results so far: {len(all_results)} + {len(results)} = {len(all_results) + len(results)}")
                
                # Debug: Check location of first few results
                if results:
                    sample_results = results[:3]
                    print(f"🏪 Sample results for location verification:")
                    for i, restaurant in enumerate(sample_results):
                        name = restaurant.get('name', 'Unknown')
                        address = restaurant.get('formatted_address', 'No address')
                        print(f"   {i+1}. {name} - {address}")
                    
                    # Debug: Check geometry data for coordinate extraction
                    print(f"🗺️ Geometry data inspection:")
                    for i, place in enumerate(sample_results):
                        geometry = place.get('geometry', {})
                        location = geometry.get('location', {})
                        print(f"   Place {i+1} ({place.get('name', 'Unknown')}):")
                        print(f"     Geometry: {geometry}")
                        print(f"     Location: {location}")
                        if location:
                            lat = location.get('lat')
                            lng = location.get('lng')
                            print(f"     Coordinates: lat={lat}, lng={lng}")
                
                all_results.extend(results)
                
                next_page_token = data.get('next_page_token')
                print(f"🔄 Next page token: {'EXISTS (' + str(len(next_page_token)) + ' chars)' if next_page_token else 'NONE'}")
                
                pages_fetched += 1
                
                # Check loop conditions
                print(f"📋 Loop conditions check:")
                print(f"   - pages_fetched ({pages_fetched}) < max_pages ({max_pages}): {pages_fetched < max_pages}")
                print(f"   - len(all_results) ({len(all_results)}) < max_results ({max_results}): {len(all_results) < max_results}")
                print(f"   - next_page_token exists: {bool(next_page_token)}")
                
                # Google requires 2-second delay between page requests
                if next_page_token and pages_fetched < max_pages and len(all_results) < max_results:
                    print(f"⏱️ Waiting 2 seconds before next page...")
                    time.sleep(2)
                else:
                    print(f"🛑 Stopping pagination reason:")
                    print(f"   - No next_page_token: {not next_page_token}")
                    print(f"   - Max pages reached: {pages_fetched >= max_pages}")
                    print(f"   - Max results reached: {len(all_results) >= max_results}")
                    break
            else:
                print(f"❌ API Error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
                print(f"❌ Full API response: {data}")
                break
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"❌ Response text: {response.text}")
            break
    
    print(f"✅ SEARCH COMPLETE: {len(all_results)} results from {pages_fetched} pages")
    
    # Limit to max_results and format results
    final_results = all_results[:max_results]
    formatted_results = []
    
    print(f"🗺️ COORDINATE EXTRACTION: Processing {len(final_results)} results for map markers")
    
    for place in final_results:
        # Extract coordinates from geometry data
        geometry = place.get('geometry', {})
        location = geometry.get('location', {})
        lat = location.get('lat')
        lng = location.get('lng')
        
        # Debug logging for coordinate extraction and data validation
        place_name = place.get('name', 'Unknown')
        rating = place.get('rating')
        user_ratings_total = place.get('user_ratings_total')
        
        if lat and lng:
            print(f"📍 Extracted coordinates for {place_name}: {lat}, {lng}")
        else:
            print(f"❌ No coordinates found for {place_name}")
            print(f"   Geometry data: {geometry}")
            
        # Debug rating vs review count data
        print(f"🔍 {place_name}: rating={rating}, user_ratings_total={user_ratings_total}")
        
        formatted_results.append({
            'name': place.get('name'),
            'place_id': place.get('place_id'),
            'rating': place.get('rating'),
            'user_ratings_total': place.get('user_ratings_total'),  # Extract review count from API
            'address': place.get('formatted_address'),
            'price_level': place.get('price_level'),
            'photo_reference': place.get('photos', [{}])[0].get('photo_reference') if place.get('photos') else None,
            'lat': lat,  # ADD coordinates for map markers
            'lng': lng,  # ADD coordinates for map markers
            'coordinates': {'lat': lat, 'lng': lng} if lat and lng else None  # ADD coordinate object
        })
    
    # Validate coordinate extraction for mapping
    coords_found = sum(1 for result in formatted_results if result.get('lat') and result.get('lng'))
    print(f"🗺️ COORDINATE SUMMARY: {coords_found}/{len(formatted_results)} restaurants have coordinates for mapping")
    
    if coords_found == 0:
        print("⚠️ WARNING: No restaurants have coordinates - map will not show markers")
    elif coords_found < len(formatted_results):
        print(f"⚠️ WARNING: {len(formatted_results) - coords_found} restaurants missing coordinates")
    else:
        print("✅ All restaurants have coordinates - map should display all markers")
    
    return {
        'results': formatted_results,
        'total_found': len(formatted_results),
        'pages_fetched': pages_fetched
    }


def get_restaurant_details(place_id):
    """Get detailed restaurant info including website"""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'key': GOOGLE_API_KEY,
        'fields': 'name,website,formatted_phone_number,formatted_address,rating,price_level,opening_hours,reviews,photos,types,user_ratings_total'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if 'result' in data:
        result = data['result']
        return {
            'name': result.get('name'),
            'website': clean_website_url(result.get('website')),
            'phone': result.get('formatted_phone_number'),
            'formatted_address': result.get('formatted_address'),
            'rating': result.get('rating'),
            'price_level': result.get('price_level'),
            'user_ratings_total': result.get('user_ratings_total'),
            'total_ratings': result.get('user_ratings_total'),
            'hours': result.get('opening_hours', {}).get('weekday_text', []),
            'reviews': [
                {
                    'author': review.get('author_name'),
                    'rating': review.get('rating'),
                    'text': review.get('text')[:200] + '...' if len(review.get('text', '')) > 200 else review.get('text'),
                    'time': review.get('relative_time_description')
                }
                for review in result.get('reviews', [])[:5]
            ],
            'types': result.get('types', []),
            'business_status': 'OPERATIONAL',
            'photo_reference': result.get('photos', [{}])[0].get('photo_reference') if result.get('photos') else None
        }
    
    return None

def clean_website_url(url):
    """Remove tracking parameters from website URLs"""
    if not url:
        return None
    
    # Remove tracking parameters
    if '?' in url:
        url = url.split('?')[0]
    
    # Ensure URL has protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    return url

def generate_google_maps_link(restaurant):
    """Generate Google Maps link for restaurant"""
    place_id = restaurant.get('place_id')
    
    if place_id:
        # Best approach - use place_id for exact location
        return f"https://www.google.com/maps/place/?q=place_id:{place_id}"
    else:
        # Fallback - use name and address for search
        name = restaurant.get('name', '').replace(' ', '+')
        address = restaurant.get('formatted_address', '').replace(' ', '+')
        return f"https://www.google.com/maps/search/{name}+{address}"

def estimate_revenue_tier(restaurant_data):
    """Basic revenue estimation based on available data"""
    rating = restaurant_data.get('rating') or 0
    price_level = restaurant_data.get('price_level') or 1
    total_ratings = restaurant_data.get('total_ratings') or 0
    
    # Extra safety check
    if rating is None:
        rating = 0
    if price_level is None:
        price_level = 1
    if total_ratings is None:
        total_ratings = 0
    # Simple scoring algorithm
    score = 0
    
    # Rating factor (0-5 scale)
    if rating >= 4.5:
        score += 40
    elif rating >= 4.0:
        score += 30
    elif rating >= 3.5:
        score += 20
    else:
        score += 10
    
    # Price level factor (1-4 scale)
    score += price_level * 15
    
    # Popularity factor (number of reviews)
    if total_ratings > 1000:
        score += 30
    elif total_ratings > 500:
        score += 20
    elif total_ratings > 100:
        score += 10
    else:
        score += 5
    
    # Convert to revenue tiers
    if score >= 90:
        return {"tier": "High", "estimated_annual": "$2M+", "confidence": "Medium"}
    elif score >= 70:
        return {"tier": "Medium-High", "estimated_annual": "$1M-$2M", "confidence": "Medium"}
    elif score >= 50:
        return {"tier": "Medium", "estimated_annual": "$500K-$1M", "confidence": "Low"}
    else:
        return {"tier": "Low", "estimated_annual": "<$500K", "confidence": "Low"}

# In your Flask app file
from webscraper import WebScraper

# Initialize scraper
scraper = WebScraper()

@app.route('/search_restaurants', methods=['POST'])
def search_restaurants_endpoint():
    """Enhanced restaurant search endpoint with pagination support"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        location = data.get('location', '')
        max_results = data.get('max_results', 60)
        
        if not query:
            return jsonify({'error': 'Query parameter required'}), 400
        
        # Search for restaurants with pagination
        search_result = search_restaurants(query, location, max_results)
        basic_results = search_result['results']
        
        print(f"🔍 ENDPOINT DEBUG: Got {len(basic_results)} results from search_restaurants")
        
        # Process detailed results
        detailed_results = []
        with_websites = 0
        total_rating = 0
        valid_ratings = 0
        
        for restaurant in basic_results:
            # Add fields that frontend expects
            restaurant['keywords_found'] = 'No website'
            restaurant['website'] = None
            # Preserve the actual user_ratings_total from Google Places API (don't overwrite with rating)
            if 'user_ratings_total' not in restaurant or restaurant['user_ratings_total'] is None:
                restaurant['user_ratings_total'] = 0  # Default to 0 if missing
            restaurant['formatted_address'] = restaurant.get('address', '')
            restaurant['business_status'] = 'OPERATIONAL'  # Default status
            restaurant['price_level_display'] = PRICE_LEVELS.get(restaurant.get('price_level', 2), '$$')
            restaurant['ma_score'] = 50  # Default M&A score
            
            # Ensure coordinates are preserved for mapping (should already be there from search_restaurants)
            if restaurant.get('lat') and restaurant.get('lng'):
                print(f"📍 ENDPOINT: Preserving coordinates for {restaurant.get('name', 'Unknown')}: {restaurant.get('lat')}, {restaurant.get('lng')}")
            else:
                print(f"⚠️ ENDPOINT: No coordinates found for {restaurant.get('name', 'Unknown')}")
                
            # Debug: Verify rating vs review count data after processing
            print(f"🔍 ENDPOINT: {restaurant.get('name', 'Unknown')} - rating={restaurant.get('rating')}, user_ratings_total={restaurant.get('user_ratings_total')}")
            
            # Track ratings for summary
            if restaurant.get('rating'):
                total_rating += restaurant['rating']
                valid_ratings += 1
            
            detailed_results.append(restaurant)
        
        # Calculate summary stats
        average_rating = (total_rating / valid_ratings) if valid_ratings > 0 else 0
        
        print(f"📤 ENDPOINT RESPONSE: Returning {len(detailed_results)} results to frontend")
        print(f"📊 Sample result: {detailed_results[0] if detailed_results else 'No results'}")
        
        response_data = {
            'status': 'success',
            'results': detailed_results,
            'total_found': search_result['total_found'],
            'pages_fetched': search_result['pages_fetched'],
            'summary': {
                'total_found': search_result['total_found'],
                'with_websites': with_websites,
                'average_rating': round(average_rating, 1)
            }
        }
        
        print(f"📤 Full response keys: {list(response_data.keys())}")
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/scan_website', methods=['POST'])
def scan_website_endpoint():
    """Scan individual restaurant website for keywords"""
    try:
        data = request.get_json()
        website_url = data.get('website_url')
        restaurant_name = data.get('restaurant_name', 'Unknown')
        
        if not website_url:
            return jsonify({'status': 'error', 'message': 'No website URL provided'}), 400
        
        # Perform website scraping here
        result = scraper.scrape_website(website_url)
        
        return jsonify({
            'status': 'success',
            'restaurant_name': restaurant_name,
            'website_url': website_url,
            'keywords_found': result.get('keywords_found', []),
            'keyword_count': result.get('keyword_count', 0),
            'scrape_status': result.get('status', 'unknown')
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Scraping failed: {str(e)}'
        }), 500

@app.route('/api/scrape-website', methods=['POST'])
def scrape_website():
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL required'}), 400
    
    result = scraper.scrape_website(url)
    return jsonify(result)

@app.route('/geocode')
def geocode():
    try:
        address = request.args.get('address')
        if not address:
            return jsonify({'error': 'Address parameter required'}), 400
            
        response = requests.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            params={'address': address, 'key': GOOGLE_PLACES_API_KEY},
            timeout=10
        )
        response.raise_for_status()  # Raise exception for bad status codes
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/places')
def places():
    try:
        query = request.args.get('query')
        location = request.args.get('location')
        radius = request.args.get('radius', '50000')  # Default radius
        
        if not query or not location:
            return jsonify({'error': 'Query and location parameters required'}), 400
            
        response = requests.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            params={
                'query': f'{query} restaurant',
                'location': location,
                'radius': radius,
                'type': 'restaurant',
                'key': GOOGLE_PLACES_API_KEY
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        # Add Google Maps links to each restaurant
        if 'results' in data:
            for restaurant in data['results']:
                # Generate Google Maps link
                maps_link = generate_google_maps_link(restaurant)
                restaurant['website'] = maps_link
                restaurant['keywords_found'] = 'View on Maps'
        
        return jsonify(data)
        
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API request failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'message': 'M&A Dashboard API is running'})

if __name__ == '__main__':
    print("Starting M&A Dashboard API server...")
    print("Geocoding endpoint: http://localhost:5000/geocode")
    print("Places endpoint: http://localhost:5000/places")
    print("Enhanced search endpoint: http://localhost:5000/search_restaurants")
    print("Web scraping endpoint: http://localhost:5000/api/scrape-website")
    print("Health check: http://localhost:5000/health")
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)