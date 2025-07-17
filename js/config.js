/**
 * Restaurant M&A Dashboard Configuration
 * Contains all constants, API endpoints, and default settings
 */

const CONFIG = {
    // API Configuration - No direct Google API key needed in frontend
    
    // Flask API Endpoints (your backend proxy)
    ENDPOINTS: {
        SEARCH_RESTAURANTS: '/search_restaurants',
        GEOCODE: '/geocode',
        PLACES: '/places',
        HEALTH: '/health',
        API_KEY: '/api-key'
    },
    
    // Default Settings
    DEFAULTS: {
        SEARCH_RADIUS: 50000, // 50km in meters
        MIN_RATING: 4.0,
        MIN_REVIEWS: 500,
        RESULTS_LIMIT: 50,
        MAP_CENTER: { lat: 35.7796, lng: -78.6382 }, // Raleigh, NC
        MAP_ZOOM: 10
    },
    
    // Price Level Mappings
    PRICE_LEVELS: {
        1: '$',
        2: '$$',
        3: '$$$',
        4: '$$$$'
    },
    
    // Price Level Names
    PRICE_LEVEL_NAMES: {
        1: 'Budget',
        2: 'Moderate', 
        3: 'Expensive',
        4: 'Very Expensive'
    },
    
    // Business Status Options
    BUSINESS_STATUS: {
        OPERATIONAL: 'OPERATIONAL',
        CLOSED_TEMPORARILY: 'CLOSED_TEMPORARILY', 
        CLOSED_PERMANENTLY: 'CLOSED_PERMANENTLY'
    },
    
    // Search Presets - the buttons users can click
    SEARCH_PRESETS: [
        { name: 'Italian Franchises', query: 'Italian restaurant franchise' },
        { name: 'Fast Casual Burgers', query: 'Fast casual burger' },
        { name: 'Pizza Chains', query: 'Pizza restaurant chain' },
        { name: 'Mexican Fast Food', query: 'Mexican fast food' },
        { name: 'Asian Franchises', query: 'Asian restaurant franchise' },
        { name: 'Coffee Franchises', query: 'Coffee shop franchise' },
        { name: 'Sandwich Shops', query: 'Sandwich shop franchise' },
        { name: 'Family Dining', query: 'Family restaurant chain' }
    ],
    
    // M&A Scoring Weights (how important each factor is)
    SCORING: {
        RATING_WEIGHT: 40,      // Out of 100 total points
        REVIEWS_WEIGHT: 30,     // More reviews = more established
        PRICE_WEIGHT: 20,       // $$ is ideal for M&A
        STATUS_WEIGHT: 10       // Must be operational
    },
    
    // Review Count Scoring Thresholds
    REVIEW_THRESHOLDS: {
        EXCELLENT: 1000,  // 30 points
        GOOD: 500,        // 25 points  
        FAIR: 100,        // 15 points
        POOR: 50          // 10 points
    },
    
    // Radius Options (for the dropdown)
    RADIUS_OPTIONS: [
        { value: 5000, label: '5km' },
        { value: 25000, label: '25km' },
        { value: 50000, label: '50km' },
        { value: 100000, label: '100km' }
    ],
    
    // Rating Options (for the filter dropdown)
    RATING_OPTIONS: [
        { value: 0, label: 'Any Rating' },
        { value: 3.5, label: '3.5+ Stars' },
        { value: 4.0, label: '4.0+ Stars' },
        { value: 4.5, label: '4.5+ Stars' }
    ],
    
    // Review Count Options (for the filter dropdown)
    REVIEW_OPTIONS: [
        { value: 0, label: 'Any Count' },
        { value: 100, label: '100+ Reviews' },
        { value: 500, label: '500+ Reviews' },
        { value: 1000, label: '1000+ Reviews' }
    ],
    
    // Local Storage Keys
    STORAGE_KEYS: {
        SEARCH_HISTORY: 'searchHistory',
        USER_PREFERENCES: 'userPreferences'
    },
    
    // UI Messages
    MESSAGES: {
        NO_SEARCH_QUERY: 'Please enter a search query',
        SEARCH_IN_PROGRESS: 'Searching for restaurants...',
        NO_RESULTS: 'No restaurants match the current filters',
        SEARCH_FAILED: 'Search failed. Please try again.',
        DETAILS_FAILED: 'Failed to load restaurant details',
        NO_API_KEY: 'API key not configured (handled by Flask backend)'
    },
    
    // Map Configuration
    MAP_CONFIG: {
        DEFAULT_STYLE: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ],
        MARKER_ICON: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" fill="#667eea" stroke="white" stroke-width="2"/>
                    <text x="10" y="14" font-family="Arial" font-size="10" fill="white" text-anchor="middle">🍽️</text>
                </svg>
            `),
            scaledSize: { width: 30, height: 30 }
        }
    },
    
    // Validation Rules
    VALIDATION: {
        ZIP_CODE_PATTERN: /^\d{5}(-\d{4})?$/, // US zip codes
        MIN_QUERY_LENGTH: 3,
        MAX_QUERY_LENGTH: 100
    }
};

// Make CONFIG available globally for other modules
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Also export for Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Log that config is loaded (for debugging)
console.log(' Configuration loaded successfully');
console.log(' Default map center:', CONFIG.DEFAULTS.MAP_CENTER);
console.log(' Available search presets:', CONFIG.SEARCH_PRESETS.length);