/**
 * Restaurant API Client - Uses Flask Backend Proxy
 * All requests go through your Flask API instead of directly to Google
 */

class RestaurantAPIClient {
    constructor() {
        // Track API usage for monitoring
        this.requestCount = {
            search: 0,
            details: 0,
            geocoding: 0
        };
        
        // Use relative URLs - works in both development and production
        this.baseUrl = '';
        
        console.log('Restaurant API client initialized (using Flask backend)');
    }

    /**
     * Initialize services (not needed for Flask backend)
     */
    initializeServices() {
        console.log('Using Flask backend - no initialization needed');
    }

    /**
     * Check if API client is ready
     */
    isReady() {
        return true; // Always ready when using Flask backend
    }

    /**
     * Check if a string looks like a US zip code
     * @param {string} location - Location string to check
     * @returns {boolean} True if it looks like a zip code
     */
    isZipCode(location) {
        return CONFIG.VALIDATION.ZIP_CODE_PATTERN.test(location.trim());
    }

    /**
     * Convert zip code to latitude/longitude coordinates using Flask backend
     * @param {string} zipCode - US zip code (e.g., "27601" or "27601-1234")
     * @returns {Promise<Object>} Coordinates object {lat, lng} or error
     */
    async geocodeZipCode(zipCode) {
        console.log('Geocoding zip code:', zipCode);
        
        try {
            this.requestCount.geocoding++;
            
            const response = await fetch(`${this.baseUrl}${CONFIG.ENDPOINTS.GEOCODE}?address=${encodeURIComponent(zipCode + ', USA')}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Geocoding failed');
            }
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                const result = {
                    success: true,
                    coordinates: {
                        lat: location.lat,
                        lng: location.lng
                    },
                    formatted_address: data.results[0].formatted_address,
                    error: null
                };
                
                console.log('Geocoding successful:', result.coordinates);
                return result;
            } else {
                throw new Error(`No location found for zip code: ${zipCode}`);
            }
            
        } catch (error) {
            console.error('Geocoding error:', error);
            return {
                success: false,
                coordinates: null,
                formatted_address: null,
                error: error.message
            };
        }
    }

    /**
     * Convert location string to coordinates (handles both addresses and zip codes)
     * @param {string} location - Location string (address or zip code)
     * @returns {Promise<string>} Location string for Flask backend
     */
    async processLocation(location) {
        const cleanLocation = location.trim();
        
        // If it's a zip code, convert to coordinates
        if (this.isZipCode(cleanLocation)) {
            const geocodeResult = await this.geocodeZipCode(cleanLocation);
            if (geocodeResult.success) {
                return `${geocodeResult.coordinates.lat},${geocodeResult.coordinates.lng}`;
            } else {
                throw new Error(`Could not find coordinates for zip code ${cleanLocation}: ${geocodeResult.error}`);
            }
        }
        
        // If it's already coordinates (lat,lng format), return as-is
        if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(cleanLocation)) {
            return cleanLocation;
        }
        
        // Otherwise, geocode the address using Flask backend
        try {
            const response = await fetch(`${this.baseUrl}${CONFIG.ENDPOINTS.GEOCODE}?address=${encodeURIComponent(cleanLocation)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Geocoding failed');
            }
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return `${location.lat},${location.lng}`;
            } else {
                throw new Error(`Could not geocode address: ${cleanLocation}`);
            }
        } catch (error) {
            throw new Error(`Location processing failed: ${error.message}`);
        }
    }

    /**
     * Search for restaurants using Flask backend with pagination support
     * @param {string} query - Search query (e.g., "Italian restaurants")
     * @param {string} location - Location (address, zip code, or lat,lng)
     * @param {number} radius - Search radius in meters
     * @param {number} maxResults - Maximum number of results (default 60)
     * @returns {Promise<Object>} Search results with success/error status
     */
    async searchRestaurants(query, location, radius, maxResults = 60) {
        console.log('Searching restaurants:', { query, location, radius, maxResults });
        
        try {
            // Update search status
            this.updateSearchStatus('Starting search...');
            
            // Process the location (convert zip code if needed)
            const processedLocation = await this.processLocation(location);
            
            this.requestCount.search++;
            console.log(`API Cost Tracker - Search calls: ${this.requestCount.search} (~$${(this.requestCount.search * 0.032).toFixed(3)})`);

            // Use the enhanced search endpoint with pagination
            const response = await fetch(`${this.baseUrl}${CONFIG.ENDPOINTS.SEARCH_RESTAURANTS}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    location: processedLocation,
                    max_results: maxResults
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }
            
            if (data.status === 'success') {
                console.log(`📡 API Response: Found ${data.total_found} restaurants (${data.pages_fetched} pages)`);
                console.log('📡 API Response: Results received:', data.results.length);
                
                // Debug: Check coordinates in API response
                const coordCount = data.results.filter(r => r.lat && r.lng).length;
                console.log('📍 API Response: Results with coordinates:', coordCount, '/', data.results.length);
                
                if (data.results.length > 0) {
                    console.log('📍 API Response: First result coordinates:', data.results[0]?.lat, data.results[0]?.lng);
                    console.log('📍 API Response: Sample result:', data.results[0]?.name);
                }
                
                // Update final status
                this.updateSearchStatus(`Found ${data.total_found} restaurants (${data.pages_fetched} pages fetched)`);
                
                return {
                    success: true,
                    data: data.results,
                    total_results: data.total_found,
                    pages_fetched: data.pages_fetched,
                    error: null
                };
            } else {
                throw new Error(data.message || 'Search failed');
            }

        } catch (error) {
            console.error('Restaurant search error:', error);
            this.updateSearchStatus(`Search failed: ${error.message}`);
            return {
                success: false,
                data: [],
                total_results: 0,
                pages_fetched: 0,
                error: error.message
            };
        }
    }

    /**
     * Get detailed information about a specific restaurant
     * @param {string} placeId - Google Place ID
     * @returns {Promise<Object|null>} Detailed place information or null if error
     */
    async getPlaceDetails(placeId) {
        console.log('Getting place details for:', placeId);
        
        try {
            this.requestCount.details++;
            console.log(`API Cost Tracker - Details calls: ${this.requestCount.details} (~$${(this.requestCount.details * 0.017).toFixed(3)})`);
            
            // For now, return basic info since Flask backend doesn't have place details endpoint
            console.log('Place details not implemented in Flask backend yet');
            return null;
            
        } catch (error) {
            console.error('Place details error:', error);
            return null;
        }
    }

    /**
     * Get multiple place details efficiently (batch processing)
     * @param {Array<string>} placeIds - Array of Google Place IDs
     * @param {Function} progressCallback - Optional callback for progress updates
     * @returns {Promise<Array>} Array of detailed place information
     */
    async getMultiplePlaceDetails(placeIds, progressCallback = null) {
        console.log(`Getting details for ${placeIds.length} places...`);
        
        const results = [];
        const delay = 200; // 200ms delay between requests to avoid rate limiting
        
        for (let i = 0; i < placeIds.length; i++) {
            const placeId = placeIds[i];
            
            try {
                const details = await this.getPlaceDetails(placeId);
                if (details) {
                    results.push(details);
                }
                
                // Update progress
                if (progressCallback) {
                    progressCallback(i + 1, placeIds.length);
                }
                
                // Add delay to avoid hitting rate limits
                if (i < placeIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.warn(`Failed to get details for place ${placeId}:`, error);
            }
        }
        
        console.log(`Retrieved details for ${results.length}/${placeIds.length} places`);
        return results;
    }

    /**
     * Get current API usage statistics
     * @returns {Object} Usage statistics and cost estimates
     */
    getUsageStats() {
        const searchCost = this.requestCount.search * 0.032;
        const detailsCost = this.requestCount.details * 0.017;
        const geocodingCost = this.requestCount.geocoding * 0.005;
        const totalCost = searchCost + detailsCost + geocodingCost;
        
        return {
            requests: { ...this.requestCount },
            estimatedCost: {
                search: searchCost,
                details: detailsCost,
                geocoding: geocodingCost,
                total: totalCost
            },
            totalRequests: this.requestCount.search + this.requestCount.details + this.requestCount.geocoding
        };
    }

    /**
     * Reset usage statistics
     */
    resetUsageStats() {
        this.requestCount = { search: 0, details: 0, geocoding: 0 };
        console.log('Usage statistics reset');
    }

    /**
     * Update search status display
     * @param {string} message - Status message to display
     */
    updateSearchStatus(message) {
        const statusElement = document.getElementById('searchStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.display = 'block';
            
            // Auto-hide after 5 seconds for success messages
            if (message.includes('Found')) {
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 5000);
            }
        }
        console.log('Search Status:', message);
    }

    /**
     * Test API connection by making a simple request to health endpoint
     * @returns {Promise<Object>} Test result with success status
     */
    static async testConnection() {
        console.log('Testing API connection...');
        
        try {
            const response = await fetch(`${CONFIG.ENDPOINTS.HEALTH}`);
            const data = await response.json();
            
            if (response.ok && data.status === 'healthy') {
                return { success: true, error: null };
            } else {
                return {
                    success: false,
                    error: 'API health check failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Connection failed: ${error.message}`
            };
        }
    }
}

// Make RestaurantAPIClient available globally
if (typeof window !== 'undefined') {
    window.RestaurantAPIClient = RestaurantAPIClient;
    // Keep backward compatibility
    window.GooglePlacesAPI = RestaurantAPIClient;
}

// Also export for Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RestaurantAPIClient;
}

console.log('Restaurant API client loaded successfully');