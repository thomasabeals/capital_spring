/**
 * Google Maps Management
 * Handles map initialization, markers, and restaurant visualization
 */

class MapManager {
    constructor(mapElementId) {
        this.mapElementId = mapElementId;
        this.map = null;
        this.markers = [];
        this.infoWindows = [];
        this.markerCluster = null;
        this.isInitialized = false;
        
        // Map state
        this.currentBounds = null;
        this.currentCenter = CONFIG.DEFAULTS.MAP_CENTER;
        this.currentZoom = CONFIG.DEFAULTS.MAP_ZOOM;
        
        console.log('Map Manager initialized for element:', mapElementId);
    }

    /**
     * Initialize Google Map
     * @param {Object} options - Map initialization options
     */
    initializeMap(options = {}) {
        console.log('Initializing Google Map...');
        
        const mapElement = document.getElementById(this.mapElementId);
        if (!mapElement) {
            console.error('Map element not found:', this.mapElementId);
            return false;
        }

        // Check if Google Maps is loaded
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded yet. Map will initialize when API loads.');
            return false;
        }

        const mapOptions = {
            zoom: options.zoom || this.currentZoom,
            center: options.center || this.currentCenter,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: CONFIG.MAP_CONFIG.DEFAULT_STYLE,
            
            // UI Controls
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true,
            
            // Interaction options
            gestureHandling: 'cooperative',
            clickableIcons: false
        };

        try {
            this.map = new google.maps.Map(mapElement, mapOptions);
            this.isInitialized = true;
            
            // Add map event listeners
            this.setupMapEventListeners();
            
            console.log('Google Map initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Google Map:', error);
            return false;
        }
    }

    /**
     * Setup map event listeners
     */
    setupMapEventListeners() {
        if (!this.map) return;

        // Track map changes
        this.map.addListener('center_changed', () => {
            this.currentCenter = this.map.getCenter().toJSON();
        });

        this.map.addListener('zoom_changed', () => {
            this.currentZoom = this.map.getZoom();
        });

        this.map.addListener('bounds_changed', () => {
            this.currentBounds = this.map.getBounds();
        });

        // Handle map clicks (close info windows)
        this.map.addListener('click', () => {
            this.closeAllInfoWindows();
        });
    }

    /**
     * Add restaurant markers to the map
     * @param {Array} restaurants - Array of restaurant data
     */
    addRestaurantMarkers(restaurants) {
        if (!this.isInitialized || !this.map) {
            console.warn('Map not initialized. Cannot add markers.');
            return;
        }

        console.log(`🗺️ Frontend: Adding ${restaurants.length} restaurant markers to map`);

        // Clear existing markers
        this.clearMarkers();

        // Debug: Check first few restaurants for coordinates
        console.log('🗺️ Frontend: Checking coordinates for first 5 restaurants:');
        restaurants.slice(0, 5).forEach((restaurant, index) => {
            const lat = restaurant.lat;
            const lng = restaurant.lng;
            console.log(`   ${index + 1}. ${restaurant.name}: lat=${lat}, lng=${lng}`);
            
            if (lat && lng) {
                console.log('✅ Valid coordinates for map marker');
            } else {
                console.log('❌ Missing coordinates - no marker will be created');
            }
        });

        // Add new markers
        const validRestaurants = restaurants.filter(restaurant => 
            restaurant.lat && restaurant.lng
        );

        console.log(`🗺️ Frontend: ${validRestaurants.length} of ${restaurants.length} restaurants have valid coordinates`);

        if (validRestaurants.length === 0) {
            console.warn('⚠️ No restaurants have valid coordinates for mapping');
            console.log('🔍 Sample restaurant data:', restaurants[0]);
            return;
        }

        const bounds = new google.maps.LatLngBounds();
        let markersAdded = 0;
        let markersFailed = 0;

        console.log('🗺️ Frontend: Starting marker creation process...');
        console.log('🗺️ Frontend: Google Maps API available:', typeof google !== 'undefined' && !!google.maps);
        console.log('🗺️ Frontend: Map object exists:', !!this.map);

        // Check if we should use batch processing for large datasets
        if (validRestaurants.length > 20) {
            console.log('🗺️ Frontend: Large dataset detected - using batch processing');
            this.addMarkersInBatches(validRestaurants, bounds, (added, failed) => {
                markersAdded = added;
                markersFailed = failed;
                this.finalizeBounds(bounds, markersAdded);
            });
            return; // Exit early - batch processing will handle the rest
        }

        // Process markers with detailed logging for smaller datasets
        validRestaurants.forEach((restaurant, index) => {
            try {
                console.log(`🗺️ Frontend: Creating marker ${index + 1}/${validRestaurants.length} for ${restaurant.name}`);
                
                const marker = this.createRestaurantMarker(restaurant, index);
                if (marker) {
                    this.markers.push(marker);
                    bounds.extend(marker.getPosition());
                    markersAdded++;
                    
                    // Log every 10th marker to track progress
                    if (markersAdded % 10 === 0 || markersAdded === validRestaurants.length) {
                        console.log(`🗺️ Frontend: Progress - ${markersAdded} markers created`);
                    }
                } else {
                    console.error('❌ Frontend: Failed to create marker for:', restaurant.name);
                    markersFailed++;
                }
            } catch (error) {
                console.error('❌ Frontend: Error creating marker for restaurant:', restaurant.name, error);
                markersFailed++;
            }
        });

        console.log(`🗺️ Frontend: Marker creation complete - ${markersAdded} successful, ${markersFailed} failed`);

        this.finalizeBounds(bounds, markersAdded);
    }

    /**
     * Add markers in batches to prevent performance issues
     * @param {Array} restaurants - Array of restaurant data
     * @param {google.maps.LatLngBounds} bounds - Bounds object to extend
     * @param {Function} callback - Callback with (markersAdded, markersFailed)
     */
    addMarkersInBatches(restaurants, bounds, callback) {
        const batchSize = 10;
        const delay = 100; // 100ms delay between batches
        let markersAdded = 0;
        let markersFailed = 0;
        let currentBatch = 0;
        
        const processBatch = () => {
            const start = currentBatch * batchSize;
            const end = Math.min(start + batchSize, restaurants.length);
            const batch = restaurants.slice(start, end);
            
            console.log(`🗺️ Frontend: Processing batch ${currentBatch + 1}/${Math.ceil(restaurants.length / batchSize)} (${batch.length} restaurants)`);
            
            batch.forEach((restaurant, index) => {
                try {
                    const marker = this.createRestaurantMarker(restaurant, start + index);
                    if (marker) {
                        this.markers.push(marker);
                        bounds.extend(marker.getPosition());
                        markersAdded++;
                    } else {
                        markersFailed++;
                    }
                } catch (error) {
                    console.error('❌ Frontend: Error in batch processing:', restaurant.name, error);
                    markersFailed++;
                }
            });
            
            currentBatch++;
            
            if (currentBatch * batchSize < restaurants.length) {
                // Process next batch
                setTimeout(processBatch, delay);
            } else {
                // All batches processed
                console.log(`🗺️ Frontend: Batch processing complete - ${markersAdded} successful, ${markersFailed} failed`);
                callback(markersAdded, markersFailed);
            }
        };
        
        processBatch();
    }

    /**
     * Finalize map bounds after all markers are created
     * @param {google.maps.LatLngBounds} bounds - Bounds object
     * @param {number} markersAdded - Number of markers successfully added
     */
    finalizeBounds(bounds, markersAdded) {
        // Fit map to show all markers
        if (markersAdded > 0) {
            try {
                console.log('🗺️ Frontend: Fitting map to show all markers...');
                
                if (markersAdded === 1) {
                    // Single marker - center and zoom appropriately
                    this.map.setCenter(bounds.getCenter());
                    this.map.setZoom(15);
                    console.log('🗺️ Frontend: Map centered on single marker');
                } else {
                    // Multiple markers - fit bounds with padding
                    this.map.fitBounds(bounds, { padding: 50 });
                    console.log('🗺️ Frontend: Map bounds fitted to all markers');
                }
                
                // Force map to refresh
                google.maps.event.trigger(this.map, 'resize');
                console.log('🗺️ Frontend: Map resize triggered');
                
            } catch (error) {
                console.error('❌ Frontend: Error fitting map bounds:', error);
            }
        } else {
            console.warn('⚠️ Frontend: No markers created - map bounds not updated');
        }

        console.log(`✅ Frontend: Successfully added ${markersAdded} markers to map (${this.markers.length} total markers stored)`);
    }

    /**
     * Create a marker for a single restaurant
     * @param {Object} restaurant - Restaurant data
     * @param {number} index - Restaurant index for styling
     * @returns {google.maps.Marker} Google Maps marker
     */
    createRestaurantMarker(restaurant, index) {
        try {
            const position = { lat: restaurant.lat, lng: restaurant.lng };
            
            // Validate position
            if (!position.lat || !position.lng || 
                isNaN(position.lat) || isNaN(position.lng)) {
                console.error('❌ Invalid position for', restaurant.name, ':', position);
                return null;
            }
            
            console.log(`🗺️ Creating marker for ${restaurant.name} at (${position.lat}, ${position.lng})`);
            
            // Test with simplified marker first (no custom icon)
            const useSimpleMarker = true; // Change to false for custom icons
            
            let marker;
            if (useSimpleMarker) {
                // Simple marker without custom icon
                marker = new google.maps.Marker({
                    position: position,
                    map: this.map,
                    title: restaurant.name || 'Unknown Restaurant',
                    animation: null,
                    zIndex: restaurant.ma_score || 0
                });
                console.log('🗺️ Using simple marker (no custom icon)');
            } else {
                // Create custom marker icon based on M&A score
                const markerIcon = this.createMarkerIcon(restaurant);
                
                marker = new google.maps.Marker({
                    position: position,
                    map: this.map,
                    title: restaurant.name || 'Unknown Restaurant',
                    icon: markerIcon,
                    animation: null,
                    zIndex: restaurant.ma_score || 0
                });
                console.log('🗺️ Using custom marker icon');
            }

            // Verify marker was created successfully
            if (!marker) {
                console.error('❌ Failed to create Google Maps marker for:', restaurant.name);
                return null;
            }

            console.log(`✅ Marker created successfully for ${restaurant.name}`);

            // Create info window for this marker
            const infoWindow = this.createInfoWindow(restaurant);
            
            // Add click listener to show info window
            marker.addListener('click', () => {
                this.closeAllInfoWindows();
                infoWindow.open(this.map, marker);
                
                // Add bounce animation
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => {
                    marker.setAnimation(null);
                }, 1500);
            });

            // Store reference to info window
            this.infoWindows.push(infoWindow);

            return marker;
            
        } catch (error) {
            console.error('❌ Exception creating marker for', restaurant.name, ':', error);
            return null;
        }
    }

    /**
     * Create custom marker icon based on restaurant M&A score
     * @param {Object} restaurant - Restaurant data
     * @returns {Object} Google Maps icon configuration
     */
    createMarkerIcon(restaurant) {
        const score = restaurant.ma_score || 0;
        let color = '#6c757d'; // Default gray
        let size = 25; // Default size

        // Color based on M&A score
        if (score >= 80) {
            color = '#28a745'; // Green - Premium target
            size = 35;
        } else if (score >= 65) {
            color = '#17a2b8'; // Blue - Strong target  
            size = 32;
        } else if (score >= 50) {
            color = '#ffc107'; // Yellow - Good target
            size = 29;
        } else if (score >= 35) {
            color = '#fd7e14'; // Orange - Potential target
            size = 26;
        } else {
            color = '#dc3545'; // Red - Low priority
            size = 23;
        }

        // Create SVG marker
        const svgMarker = `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
                <text x="12" y="16" font-family="Arial" font-size="10" fill="white" text-anchor="middle">🍽️</text>
            </svg>
        `;

        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarker),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(size / 2, size / 2)
        };
    }

    /**
     * Create info window content for a restaurant
     * @param {Object} restaurant - Restaurant data
     * @returns {google.maps.InfoWindow} Configured info window
     */
    createInfoWindow(restaurant) {
        const content = this.generateInfoWindowContent(restaurant);
        
        return new google.maps.InfoWindow({
            content: content,
            maxWidth: 400,
            pixelOffset: new google.maps.Size(0, -10)
        });
    }

    /**
     * Generate HTML content for restaurant info window
     * @param {Object} restaurant - Restaurant data
     * @returns {string} HTML content
     */
    generateInfoWindowContent(restaurant) {
        const name = restaurant.name || 'Unknown Restaurant';
        const rating = (restaurant.rating || 0).toFixed(1);
        const reviews = (restaurant.user_ratings_total || 0).toLocaleString();
        const priceLevel = restaurant.price_level_display || 'N/A';
        const maScore = restaurant.ma_score || 0;
        const maTier = restaurant.ma_tier || 'Not Rated';
        const address = restaurant.formatted_address || 'Address not available';
        const phone = restaurant.formatted_phone_number || '';
        const website = restaurant.website || '';
        const status = restaurant.business_status || 'Unknown';

        // Score color
        let scoreColor = '#6c757d';
        if (maScore >= 80) scoreColor = '#28a745';
        else if (maScore >= 65) scoreColor = '#17a2b8';
        else if (maScore >= 50) scoreColor = '#ffc107';
        else if (maScore >= 35) scoreColor = '#fd7e14';
        else scoreColor = '#dc3545';

        return `
            <div style="padding: 15px; max-width: 350px; font-family: 'Segoe UI', sans-serif;">
                <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 1.2em;">${name}</h3>
                
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600;">M&A Score:</span>
                        <span style="background: ${scoreColor}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                            ${maScore}/100
                        </span>
                    </div>
                    <div style="font-size: 0.9em; color: #6c757d; margin-bottom: 8px;">${maTier}</div>
                </div>

                <div style="margin-bottom: 12px;">
                    <div style="margin-bottom: 4px;">
                        <strong>Rating:</strong> ${rating} ⭐ (${reviews} reviews)
                    </div>
                    <div style="margin-bottom: 4px;">
                        <strong>Price:</strong> ${priceLevel}
                    </div>
                    <div style="margin-bottom: 4px;">
                        <strong>Status:</strong> 
                        <span style="color: ${status === 'OPERATIONAL' ? '#28a745' : '#dc3545'}">
                            ${status}
                        </span>
                    </div>
                </div>

                ${restaurant.investment_category ? `
                    <div style="margin-bottom: 10px; padding: 6px; background: #f8f9fa; border-radius: 4px; font-size: 0.9em;">
                        <strong>Investment Type:</strong> ${restaurant.investment_category}
                    </div>
                ` : ''}

                <div style="font-size: 0.9em; color: #6c757d; margin-bottom: 10px;">
                    ${address}
                </div>

                ${phone ? `<div style="margin-bottom: 6px; font-size: 0.9em;"><strong>Phone:</strong> ${phone}</div>` : ''}
                
                <div style="text-align: center; margin-top: 12px;">
                    <button onclick="window.open('${restaurant.website || `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`}', '_blank')" 
                            style="background: #1a73e8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        📍 View on Google Maps
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Close all open info windows
     */
    closeAllInfoWindows() {
        this.infoWindows.forEach(infoWindow => {
            infoWindow.close();
        });
    }

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        console.log('Clearing existing markers');
        
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        
        this.closeAllInfoWindows();
        
        this.markers = [];
        this.infoWindows = [];
    }

    /**
     * Update markers based on filtered data
     * @param {Array} restaurants - Filtered restaurant data
     */
    updateMarkers(restaurants) {
        console.log(`Updating map with ${restaurants.length} filtered restaurants`);
        this.addRestaurantMarkers(restaurants);
    }

    /**
     * Center map on specific coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {number} zoom - Zoom level (optional)
     */
    centerMap(lat, lng, zoom = null) {
        if (!this.isInitialized || !this.map) return;

        const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
        this.map.setCenter(center);
        
        if (zoom !== null) {
            this.map.setZoom(zoom);
        }
        
        console.log('Map centered on:', center);
    }

    /**
     * Fit map to show all current markers
     */
    fitToMarkers() {
        if (!this.isInitialized || !this.map || this.markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        this.map.fitBounds(bounds, { padding: 50 });
        console.log('Map fitted to all markers');
    }

    /**
     * Set map style
     * @param {Array} style - Google Maps style array
     */
    setMapStyle(style) {
        if (!this.isInitialized || !this.map) return;
        
        this.map.setOptions({ styles: style });
        console.log('Map style updated');
    }

    /**
     * Get current map state
     * @returns {Object} Current map state
     */
    getMapState() {
        if (!this.isInitialized || !this.map) {
            return {
                initialized: false,
                center: this.currentCenter,
                zoom: this.currentZoom,
                markerCount: 0
            };
        }

        return {
            initialized: true,
            center: this.map.getCenter()?.toJSON() || this.currentCenter,
            zoom: this.map.getZoom() || this.currentZoom,
            markerCount: this.markers.length,
            bounds: this.map.getBounds()?.toJSON() || null
        };
    }

    /**
     * Resize map (call after container size changes)
     */
    resize() {
        if (!this.isInitialized || !this.map) return;
        
        google.maps.event.trigger(this.map, 'resize');
        console.log('Map resized');
    }

    /**
     * Destroy map and clean up resources
     */
    destroy() {
        console.log('Destroying map manager');
        
        this.clearMarkers();
        
        if (this.map) {
            // Remove all listeners
            google.maps.event.clearInstanceListeners(this.map);
        }
        
        this.map = null;
        this.isInitialized = false;
        this.markers = [];
        this.infoWindows = [];
    }

    /**
     * Static method to check if Google Maps API is ready
     * @returns {boolean} True if Google Maps API is loaded
     */
    static isGoogleMapsReady() {
        return typeof google !== 'undefined' && 
               typeof google.maps !== 'undefined' && 
               typeof google.maps.Map !== 'undefined';
    }
}

// Global callback for Google Maps API initialization
window.initMap = function() {
    console.log('Google Maps API loaded and ready');
    
    // Initialize map if app is ready
    if (window.app && window.app.mapManager) {
        window.app.mapManager.initializeMap();
    }
    
    // Also reinitialize API client services if needed
    if (window.app && window.app.apiClient) {
        window.app.apiClient.initializeServices();
    }
};

// Global function for restaurant details (called from info windows)
window.viewRestaurantDetails = function(placeId) {
    console.log('Viewing details for place:', placeId);
    
    if (window.app && window.app.viewRestaurantDetails) {
        window.app.viewRestaurantDetails(placeId);
    } else {
        alert('Restaurant details feature will be available when the full app is loaded.');
    }
};

// Make MapManager available globally
if (typeof window !== 'undefined') {
    window.MapManager = MapManager;
}

// Also export for Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
}

console.log('Map Manager loaded successfully');