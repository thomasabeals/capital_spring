#!/usr/bin/env python3
"""
Test script for the Restaurant M&A API
Tests the pagination fixes and frontend data compatibility
"""
import requests
import json
import time

def test_search_restaurants():
    """Test the search_restaurants endpoint"""
    url = "http://localhost:5000/search_restaurants"
    
    payload = {
        "query": "pizza",
        "location": "27601",
        "max_results": 60
    }
    
    print("🧪 Testing search_restaurants endpoint...")
    print(f"📤 Sending request to: {url}")
    print(f"📋 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 HTTP Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Response Status: {data.get('status')}")
            print(f"📈 Results Found: {data.get('total_found', 0)}")
            print(f"📄 Pages Fetched: {data.get('pages_fetched', 0)}")
            
            results = data.get('results', [])
            if results:
                print(f"📋 Sample Result Fields: {list(results[0].keys())}")
                print(f"🔍 First Result: {results[0].get('name', 'No name')}")
                print(f"⭐ Rating: {results[0].get('rating', 'No rating')}")
                print(f"📍 Address: {results[0].get('formatted_address', 'No address')}")
                print(f"🏪 Business Status: {results[0].get('business_status', 'No status')}")
                print(f"💰 Price Level: {results[0].get('price_level_display', 'No price')}")
                print(f"📊 M&A Score: {results[0].get('ma_score', 'No score')}")
                print(f"📍 Coordinates: lat={results[0].get('lat')}, lng={results[0].get('lng')}")
                print(f"🗺️ Coordinates Object: {results[0].get('coordinates')}")
                
                # Check coordinate availability for map markers
                print(f"\n🗺️ COORDINATE VALIDATION:")
                coord_count = sum(1 for r in results if r.get('lat') and r.get('lng'))
                print(f"📍 Results with coordinates: {coord_count}/{len(results)}")
                
                if coord_count == len(results):
                    print("✅ COORDINATE TEST PASSED: All results have coordinates for map markers")
                elif coord_count > 0:
                    print(f"⚠️ COORDINATE TEST PARTIAL: {coord_count} results have coordinates, {len(results) - coord_count} missing")
                else:
                    print("❌ COORDINATE TEST FAILED: No results have coordinates - map will not show markers")
                
                # Check if results are in North Carolina (location validation)
                print(f"\n🌍 LOCATION VALIDATION:")
                nc_keywords = ['NC', 'North Carolina', 'Raleigh', 'Durham', 'Cary', 'Wake County']
                cr_keywords = ['Costa Rica', 'Puntarenas', 'CR']
                
                addresses = [r.get('formatted_address', '') for r in results[:5]]
                print(f"📍 Sample addresses: {addresses}")
                
                nc_matches = sum(1 for addr in addresses if any(keyword in addr for keyword in nc_keywords))
                cr_matches = sum(1 for addr in addresses if any(keyword in addr for keyword in cr_keywords))
                
                print(f"🎯 NC matches: {nc_matches}/{len(addresses)}")
                print(f"🌴 CR matches: {cr_matches}/{len(addresses)}")
                
                if nc_matches > 0 and cr_matches == 0:
                    print("✅ LOCATION TEST PASSED: Results are in North Carolina")
                elif cr_matches > 0:
                    print("❌ LOCATION TEST FAILED: Results are in Costa Rica (wrong location)")
                else:
                    print("⚠️ LOCATION TEST UNCLEAR: Cannot determine location from addresses")
            
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - make sure Flask server is running on localhost:5000")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_health_endpoint():
    """Test the health endpoint"""
    url = "http://localhost:5000/health"
    
    print("\n🏥 Testing health endpoint...")
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except:
        print("❌ Health check failed - server not responding")
        return False

if __name__ == "__main__":
    print("🔧 Restaurant M&A API Test Suite")
    print("=" * 50)
    
    # Test health first
    if not test_health_endpoint():
        print("\n❌ Server not running. Start with: python3 api_proxy.py")
        exit(1)
    
    # Test search
    if test_search_restaurants():
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")