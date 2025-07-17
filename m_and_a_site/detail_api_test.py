import requests
import json

# Your existing Google Places API key
GOOGLE_PLACES_API_KEY = "AIzaSyAOEyXCaYMjwd2-y81wrHThZ_Sp8dJ4KuQ"

def search_restaurants(query, location=""):
    """First step: Search for restaurants and get place_ids"""
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        'query': f"{query} restaurant {location}",
        'key': GOOGLE_PLACES_API_KEY,
        'type': 'restaurant'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    results = []
    for place in data.get('results', [])[:5]:  # Get first 5 results
        results.append({
            'name': place.get('name'),
            'place_id': place.get('place_id'),
            'rating': place.get('rating'),
            'address': place.get('formatted_address'),
            'price_level': place.get('price_level')
        })
    
    return results

def get_restaurant_details(place_id):
    """Second step: Get detailed info including website"""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'key': GOOGLE_PLACES_API_KEY,
        'fields': 'name,website,formatted_phone_number,formatted_address,rating,price_level,opening_hours,reviews,photos,types'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if 'result' in data:
        result = data['result']
        return {
            'name': result.get('name'),
            'website': result.get('website'),  # This is the key field!
            'phone': result.get('formatted_phone_number'),
            'address': result.get('formatted_address'),
            'rating': result.get('rating'),
            'price_level': result.get('price_level'),
            'hours': result.get('opening_hours', {}).get('weekday_text', []),
            'reviews': [review.get('text') for review in result.get('reviews', [])][:3],  # First 3 reviews
            'types': result.get('types', [])
        }
    
    return None

# Add these routes to your existing Flask app:

# @app.route('/search_detailed_restaurants', methods=['POST'])
# def search_detailed_restaurants():
#     """Combined endpoint: Search + get details for each restaurant"""
#     data = request.json
#     query = data.get('query', '')
#     location = data.get('location', '')
#     
#     try:
#         # Step 1: Search for restaurants
#         basic_results = search_restaurants(query, location)
#         
#         # Step 2: Get detailed info for each restaurant
#         detailed_results = []
#         for restaurant in basic_results:
#             details = get_restaurant_details(restaurant['place_id'])
#             if details:
#                 detailed_results.append(details)
#         
#         return jsonify({
#             'status': 'success',
#             'results': detailed_results,
#             'count': len(detailed_results)
#         })
#     
#     except Exception as e:
#         return jsonify({
#             'status': 'error',
#             'message': str(e)
#         }), 500

# SIMPLE TEST - Run this directly to test the API
def test_places_details():
    """Quick test function - run this directly"""
    print("Testing Places Details API...")
    print("=" * 50)
    
    # Search for a restaurant
    print("1. Searching for restaurants...")
    results = search_restaurants("Italian restaurant", "New York")
    
    if results:
        print(f"✅ Found {len(results)} restaurants")
        
        # Get details for first restaurant
        first_restaurant = results[0]
        print(f"\n2. Getting details for: {first_restaurant['name']}")
        print("-" * 30)
        
        details = get_restaurant_details(first_restaurant['place_id'])
        
        if details:
            print(f"📍 Name: {details.get('name', 'N/A')}")
            print(f"🌐 Website: {details.get('website', 'NOT FOUND')}")
            print(f"📞 Phone: {details.get('phone', 'N/A')}")
            print(f"⭐ Rating: {details.get('rating', 'N/A')}")
            print(f"💰 Price Level: {details.get('price_level', 'N/A')}")
            
            hours = details.get('hours', [])
            if hours:
                print(f"🕐 Hours: {hours[0]}")  # Just show first day
            
            # This is the key - do we get website URLs?
            if details.get('website'):
                print(f"\n✅ SUCCESS! Got website URL: {details['website']}")
            else:
                print(f"\n❌ No website URL found for this restaurant")
                
            return details
        else:
            print("❌ Failed to get details")
            return None
    else:
        print("❌ No restaurants found")
        return None

# Run the test
if __name__ == "__main__":
    test_places_details()