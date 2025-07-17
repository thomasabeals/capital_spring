/**
 * Restaurant M&A Dashboard - Main Application Controller
 * Coordinates all modules and provides the main application interface
 */

// DISABLE AUTO-SCRAPING TO PREVENT CORS ERRORS
window.DISABLE_AUTO_SCRAPING = true;

class RestaurantMAApp {
    constructor() {
        // Core modules
        this.analyzer = new MATargetAnalyzer();
        this.mapManager = new MapManager('restaurantMap');
        this.uiController = new UIController();
        this.apiClient = null;
        
        // Application state
        this.restaurantData = [];
        this.filteredData = [];
        this.currentAnalytics = {};
        this.isInitialized = false;
        
        console.log('Restaurant M&A Dashboard Application starting...');
    }

    /**
     * Initialize the complete application
     */
    async initialize() {
        console.log('Initializing Restaurant M&A Dashboard...');
        
        try {
            // Initialize UI Controller first (sets up DOM and events)
            this.uiController.initialize();
            
            // Try to initialize map (may fail if Google Maps not loaded yet)
            this.initializeMap();
            
            // Load any saved API key and set up API client
            this.initializeApiClient();
            
            // Show welcome state
            this.showWelcomeState();
            
            this.isInitialized = true;
            console.log('Restaurant M&A Dashboard initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            // Show error but don't prevent basic functionality
            if (this.uiController && this.uiController.showError) {
                this.uiController.showError('Application initialization failed: ' + error.message);
            } else {
                alert('Application initialization failed: ' + error.message);
            }
        }
    }

    /**
     * Initialize the map component
     */
    initializeMap() {
        if (MapManager.isGoogleMapsReady()) {
            const success = this.mapManager.initializeMap();
            if (success) {
                console.log('Map initialized successfully');
                
                // If we have restaurant data, update map markers
                if (this.filteredData && this.filteredData.length > 0) {
                    console.log('🗺️ Updating map with existing restaurant data');
                    this.mapManager.updateMarkers(this.filteredData);
                }
            }
        } else {
            console.log('Google Maps API not ready yet - will initialize when loaded');
        }
    }

    /**
     * Initialize API client - no API key needed for Flask backend
     */
    initializeApiClient() {
        console.log('Initializing API client for Flask backend');
        
        // Initialize API client without API key
        this.apiClient = new RestaurantAPIClient();
        
        // Set API client for analyzer
        this.analyzer.setApiClient(this.apiClient);
        
        console.log('API client initialized for Flask backend');
    }

    /**
     * Perform restaurant search
     * @param {Object} searchParams - Search parameters from UI
     */
    async performSearch(searchParams) {
        console.log('Performing restaurant search:', searchParams);
        
        if (!this.apiClient) {
            throw new Error('API client not initialized.');
        }

        try {
            // Perform the search using API client
            const searchResult = await this.apiClient.searchRestaurants(
                searchParams.query,
                searchParams.location,
                searchParams.radius
            );

            if (!searchResult.success) {
                throw new Error(searchResult.error);
            }

            if (searchResult.data.length === 0) {
                throw new Error('No restaurants found. Try expanding your search radius or changing your query.');
            }

            // Process the raw data through M&A analyzer
            console.log('🔄 Main: Processing', searchResult.data.length, 'raw results through M&A analyzer');
            this.restaurantData = this.analyzer.processRestaurantData(searchResult.data);
            console.log('🔄 Main: Processed data:', this.restaurantData.length, 'restaurants');
            
            // Debug: Check coordinates after processing
            const coordCount = this.restaurantData.filter(r => r.lat && r.lng).length;
            console.log('📍 Main: Processed results with coordinates:', coordCount, '/', this.restaurantData.length);
            
            // Apply current filters
            const currentFilters = this.uiController.getFilterFormData();
            this.filteredData = this.analyzer.applyFilters(currentFilters);
            console.log('🔄 Main: Filtered data:', this.filteredData.length, 'restaurants');
            
            // Update analytics
            this.currentAnalytics = this.analyzer.getAnalytics(this.filteredData);
            
            // Update all UI components
            this.updateAllDisplays();
            
            // Auto-scrape websites for keywords - DISABLED TO PREVENT ERRORS
            // await autoScrapeWebsites(this.filteredData);
            
            console.log(`Search complete: ${this.restaurantData.length} restaurants found, ${this.filteredData.length} after filters`);
            
            this.uiController.showSuccess(`Found ${this.restaurantData.length} restaurants`);
            
        } catch (error) {
            console.error('Search failed:', error);
            throw error; // Re-throw for UI to handle
        }
    }

    /**
     * Apply filters to current data
     * @param {Object} filters - Filter parameters from UI
     */
    applyFilters(filters) {
        console.log('Applying filters:', filters);
        
        if (this.restaurantData.length === 0) {
            console.log('No data to filter');
            return;
        }

        try {
            // Apply filters through analyzer
            this.filteredData = this.analyzer.applyFilters(filters);
            
            // Update analytics
            this.currentAnalytics = this.analyzer.getAnalytics(this.filteredData);
            
            // Update displays
            this.updateAllDisplays();
            
            console.log(`Filters applied: ${this.filteredData.length} restaurants match criteria`);
            
        } catch (error) {
            console.error('Filter application failed:', error);
            this.uiController.showError('Failed to apply filters: ' + error.message);
        }
    }

    /**
     * Update all display components with current data
     */
    updateAllDisplays() {
        console.log('🔄 Main: Updating all displays with', this.filteredData.length, 'filtered restaurants');
        
        // Check coordinates before passing to displays
        const coordCount = this.filteredData.filter(r => r.lat && r.lng).length;
        console.log('📍 Main: Filtered data with coordinates:', coordCount, '/', this.filteredData.length);
        
        // Update UI components
        this.uiController.updateUI(this.filteredData, this.currentAnalytics);
        
        // Update map
        if (this.mapManager.isInitialized) {
            console.log('🗺️ Main: Updating map with', this.filteredData.length, 'restaurants');
            this.mapManager.updateMarkers(this.filteredData);
        } else {
            console.log('⚠️ Main: Map not initialized - will update when Google Maps loads');
            // Try to initialize map again in case Google Maps API loaded recently
            this.initializeMap();
        }
        
        console.log('All displays updated');
    }

    /**
     * Export current data to Excel
     */
    exportToExcel() {
        console.log('Exporting data to Excel...');
        
        if (this.filteredData.length === 0) {
            this.uiController.showError('No data to export. Please perform a search first.');
            return;
        }

        try {
            // Get export data from analyzer
            const exportData = this.analyzer.prepareExportData();
            
            // Create CSV content (simple Excel-compatible format)
            const csvContent = this.convertToCSV(exportData);
            
            // Create and download file
            this.downloadCSV(csvContent, `restaurant-ma-targets-${new Date().toISOString().split('T')[0]}.csv`);
            
            this.uiController.showSuccess(`Exported ${exportData.length} restaurants to Excel`);
            
        } catch (error) {
            console.error('Export failed:', error);
            this.uiController.showError('Export failed: ' + error.message);
        }
    }

    /**
     * Convert data to CSV format
     * @param {Array} data - Array of objects to convert
     * @returns {string} CSV content
     */
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        // Get headers from first object
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        const csvRows = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }

    /**
     * Download CSV file
     * @param {string} csvContent - CSV content
     * @param {string} filename - File name
     */
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * View detailed information for a specific restaurant
     * @param {string} placeId - Google Place ID
     */
    async viewRestaurantDetails(placeId) {
        console.log('Viewing restaurant details:', placeId);
        
        if (!this.apiClient) {
            this.uiController.showError('API client not available');
            return;
        }

        try {
            const details = await this.apiClient.getPlaceDetails(placeId);
            
            if (details) {
                this.showRestaurantDetailsModal(details);
            } else {
                this.uiController.showError('Failed to load restaurant details');
            }
            
        } catch (error) {
            console.error('Failed to get restaurant details:', error);
            this.uiController.showError('Failed to load restaurant details: ' + error.message);
        }
    }

    /**
     * Show restaurant details in a modal (simplified for now)
     * @param {Object} details - Restaurant details
     */
    showRestaurantDetailsModal(details) {
        // For now, use a simple alert. This can be enhanced with a proper modal.
        const info = [
            `Restaurant: ${details.name}`,
            `Rating: ${(details.rating || 0).toFixed(1)} stars (${(details.user_ratings_total || 0).toLocaleString()} reviews)`,
            `Price Level: ${CONFIG.PRICE_LEVELS[details.price_level] || 'N/A'}`,
            `Status: ${details.business_status}`,
            `Address: ${details.formatted_address}`,
            details.formatted_phone_number ? `Phone: ${details.formatted_phone_number}` : '',
            details.website ? `Website: ${details.website}` : '',
            details.opening_hours ? `Currently: ${details.opening_hours.open_now ? 'Open' : 'Closed'}` : ''
        ].filter(line => line).join('\n');
        
        alert(info);
    }

    /**
     * Show welcome state when no data is available
     */
    showWelcomeState() {
        const welcomeAnalytics = {
            totalTargets: 0,
            averageRating: 0,
            totalReviews: 0,
            averagePrice: 0
        };
        
        this.uiController.updateDashboardMetrics(welcomeAnalytics);
        console.log('Welcome state displayed');
    }

    /**
     * Get current application state
     * @returns {Object} Application state summary
     */
    getApplicationState() {
        return {
            isInitialized: this.isInitialized,
            hasApiClient: !!this.apiClient,
            dataCount: this.restaurantData.length,
            filteredCount: this.filteredData.length,
            mapInitialized: this.mapManager.isInitialized,
            uiState: this.uiController.getUIState(),
            analytics: this.currentAnalytics
        };
    }

    /**
     * Reset application to initial state
     */
    reset() {
        console.log('Resetting application state');
        
        this.restaurantData = [];
        this.filteredData = [];
        this.currentAnalytics = {};
        
        // Reset analyzer
        this.analyzer.reset();
        
        // Clear map
        if (this.mapManager.isInitialized) {
            this.mapManager.clearMarkers();
        }
        
        // Show welcome state
        this.showWelcomeState();
        
        console.log('Application reset complete');
    }

    /**
     * Handle application shutdown/cleanup
     */
    destroy() {
        console.log('Shutting down Restaurant M&A Dashboard');
        
        // Cleanup components
        this.analyzer.reset();
        this.mapManager.destroy();
        this.uiController.destroy();
        
        // Clear state
        this.restaurantData = [];
        this.filteredData = [];
        this.currentAnalytics = {};
        this.isInitialized = false;
    }
}

// Global application instance
let app;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing Restaurant M&A Dashboard');
    
    app = new RestaurantMAApp();
    app.initialize();
    
    // Make app globally available for debugging and external access
    window.app = app;
});

// Map functionality disabled - using Flask backend instead of Google Maps API
// The initMap callback has been removed since we're not loading Google Maps API
console.log('Map functionality disabled - using Flask backend proxy instead of direct Google Maps API');

// Global function for restaurant details (called from map info windows)
window.viewRestaurantDetails = function(placeId) {
    if (app) {
        app.viewRestaurantDetails(placeId);
    }
};

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (app) {
        app.destroy();
    }
});

console.log('Restaurant M&A Dashboard Application loaded successfully');

// Auto-scrape websites after search results load
async function autoScrapeWebsites(restaurants) {
    if (window.DISABLE_AUTO_SCRAPING) {
        console.log('Auto-scraping disabled');
        return;
    }
    
    console.log('Auto-scraping websites for keywords...');
    
    // Only scrape restaurants with websites
    const websiteRestaurants = restaurants.filter(r => r.website);
    
    // Process in batches of 5 to avoid overwhelming the server
    for (let i = 0; i < websiteRestaurants.length; i += 5) {
        const batch = websiteRestaurants.slice(i, i + 5);
        
        // Process batch in parallel
        const promises = batch.map(restaurant => scrapeRestaurantWebsite(restaurant));
        await Promise.all(promises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Scrape individual restaurant website
async function scrapeRestaurantWebsite(restaurant) {
    const keywordCell = document.getElementById(`keywords-${restaurant.place_id}`);
    if (!keywordCell) return;
    
    try {
        const response = await fetch('/api/scrape-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: restaurant.website })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.keyword_count > 0) {
                keywordCell.innerHTML = `
                    <span style="color: #28a745; font-weight: bold;">
                        ✅ ${result.keyword_count} found
                    </span>
                    <div style="font-size: 0.8em; color: #666;">
                        ${result.found_keywords.slice(0, 3).join(', ')}
                    </div>
                `;
            } else {
                keywordCell.innerHTML = '<span style="color: #999;">No keywords</span>';
            }
        } else {
            keywordCell.innerHTML = '<span style="color: #dc3545;">❌ Failed</span>';
        }
    } catch (error) {
        keywordCell.innerHTML = '<span style="color: #dc3545;">❌ Error</span>';
    }
}