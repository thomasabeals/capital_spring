/**
 * User Interface Controller
 * Manages all DOM interactions, events, and UI updates
 */

class UIController {
    constructor() {
        this.isInitialized = false;
        this.currentData = [];
        this.isLoading = false;
        
        // Element references (will be populated on init)
        this.elements = {};
        
        console.log('UI Controller initialized');
    }

    /**
     * Initialize the UI Controller and set up event listeners
     */
    initialize() {
        console.log('Setting up UI Controller...');
        
        this.cacheElements();
        this.setupEventListeners();
        this.initializePresets();
        this.loadSavedPreferences();
        
        this.isInitialized = true;
        console.log('UI Controller setup complete');
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            // Search elements
            apiKeyInput: document.getElementById('apiKey'),
            searchQuery: document.getElementById('searchQuery'),
            searchLocation: document.getElementById('searchLocation'),
            searchRadius: document.getElementById('searchRadius'),
            searchBtn: document.getElementById('searchBtn'),
            
            // Filter elements
            nameFilter: document.getElementById('nameFilter'),
            minRating: document.getElementById('minRating'),
            minReviews: document.getElementById('minReviews'),
            priceLevel: document.getElementById('priceLevel'),
            businessStatus: document.getElementById('businessStatus'),
            applyFiltersBtn: document.getElementById('applyFilters'),
            resetFiltersBtn: document.getElementById('resetFilters'),
            exportExcelBtn: document.getElementById('exportExcel'),
            
            // Status elements
            searchStatus: document.getElementById('searchStatus'),
            
            // Dashboard elements
            totalTargets: document.getElementById('totalTargets'),
            avgRating: document.getElementById('avgRating'),
            totalReviews: document.getElementById('totalReviews'),
            avgPrice: document.getElementById('avgPrice'),
            
            // Table elements
            targetsTable: document.getElementById('targetsTable'),
            targetsTableBody: document.getElementById('targetsTableBody'),
            
            // Preset buttons
            presetButtons: document.querySelectorAll('.preset-btn')
        };
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // API Key handling
        if (this.elements.apiKeyInput) {
            this.elements.apiKeyInput.addEventListener('change', (e) => {
                this.handleApiKeyChange(e.target.value);
            });
        }

        // Search functionality
        if (this.elements.searchBtn) {
            this.elements.searchBtn.addEventListener('click', () => {
                this.handleSearch();
            });
        }

        // Search on Enter key
        [this.elements.searchQuery, this.elements.searchLocation].forEach(element => {
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSearch();
                    }
                });
            }
        });
        
        // Name filter on Enter key
        if (this.elements.nameFilter) {
            this.elements.nameFilter.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyNameFilter();
                }
            });
            
            // Real-time filtering as user types (with debouncing)
            let debounceTimer;
            this.elements.nameFilter.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.applyNameFilter();
                }, 300);
            });
        }

        // Filter functionality
        if (this.elements.applyFiltersBtn) {
            this.elements.applyFiltersBtn.addEventListener('click', () => {
                this.handleFilters();
            });
        }

        if (this.elements.resetFiltersBtn) {
            this.elements.resetFiltersBtn.addEventListener('click', () => {
                this.handleResetFilters();
            });
        }

        // Export functionality
        if (this.elements.exportExcelBtn) {
            this.elements.exportExcelBtn.addEventListener('click', () => {
                this.handleExport();
            });
        }

        // Preset buttons
        this.elements.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handlePresetClick(button.dataset.query);
            });
        });

        console.log('Event listeners setup complete');
    }

    /**
     * Initialize search preset buttons
     */
    initializePresets() {
        const container = document.querySelector('.search-presets');
        if (!container) return;

        // Clear existing presets
        container.innerHTML = '';

        // Add presets from config
        CONFIG.SEARCH_PRESETS.forEach(preset => {
            const button = document.createElement('div');
            button.className = 'preset-btn';
            button.dataset.query = preset.query;
            button.textContent = preset.name;
            
            button.addEventListener('click', () => {
                this.handlePresetClick(preset.query);
            });
            
            container.appendChild(button);
        });

        console.log(`Initialized ${CONFIG.SEARCH_PRESETS.length} search presets`);
    }

    /**
     * Load saved user preferences
     */
    loadSavedPreferences() {
        // No API key loading needed - Flask backend handles API key
        
        // Load saved preferences
        const savedPrefs = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
        if (savedPrefs) {
            try {
                const prefs = JSON.parse(savedPrefs);
                this.applyPreferences(prefs);
            } catch (error) {
                console.warn('Failed to load saved preferences:', error);
            }
        }
    }

    /**
     * Apply user preferences to form elements
     * @param {Object} preferences - User preferences object
     */
    applyPreferences(preferences) {
        if (preferences.searchRadius && this.elements.searchRadius) {
            this.elements.searchRadius.value = preferences.searchRadius;
        }
        if (preferences.minRating && this.elements.minRating) {
            this.elements.minRating.value = preferences.minRating;
        }
        if (preferences.minReviews && this.elements.minReviews) {
            this.elements.minReviews.value = preferences.minReviews;
        }
        if (preferences.priceLevel && this.elements.priceLevel) {
            this.elements.priceLevel.value = preferences.priceLevel;
        }
    }

    /**
     * Save current preferences
     */
    savePreferences() {
        const preferences = {
            searchRadius: this.elements.searchRadius?.value,
            minRating: this.elements.minRating?.value,
            minReviews: this.elements.minReviews?.value,
            priceLevel: this.elements.priceLevel?.value,
            businessStatus: this.elements.businessStatus?.value
        };

        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    }

    /**
     * Handle API key changes - Not needed for Flask backend
     * @param {string} apiKey - New API key value
     */
    handleApiKeyChange(apiKey) {
        // No API key handling needed - Flask backend manages API key
        console.log('API key input ignored - Flask backend handles authentication');
    }

    /**
     * Handle search button click
     */
    async handleSearch() {
        if (this.isLoading) {
            console.log('Search already in progress');
            return;
        }

        const searchData = this.getSearchFormData();
        
        // Validate search data
        const validation = this.validateSearchData(searchData);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        try {
            this.setLoadingState(true);
            
            // Notify parent app to perform search
            if (window.app && window.app.performSearch) {
                await window.app.performSearch(searchData);
            } else {
                throw new Error('Application not fully loaded');
            }
            
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed: ' + error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Get search form data
     * @returns {Object} Search parameters
     */
    getSearchFormData() {
        return {
            query: this.elements.searchQuery?.value?.trim() || '',
            location: this.elements.searchLocation?.value?.trim() || '',
            radius: parseInt(this.elements.searchRadius?.value) || CONFIG.DEFAULTS.SEARCH_RADIUS
            // No apiKey needed - Flask backend handles API key
        };
    }

    /**
     * Validate search form data
     * @param {Object} searchData - Search parameters
     * @returns {Object} Validation result
     */
    validateSearchData(searchData) {
        // No API key validation needed - Flask backend handles API key
        
        if (!searchData.query || searchData.query.length < CONFIG.VALIDATION.MIN_QUERY_LENGTH) {
            return { valid: false, message: CONFIG.MESSAGES.NO_SEARCH_QUERY };
        }
        
        if (searchData.query.length > CONFIG.VALIDATION.MAX_QUERY_LENGTH) {
            return { valid: false, message: 'Search query too long (max 100 characters)' };
        }
        
        if (!searchData.location) {
            return { valid: false, message: 'Please enter a location or zip code' };
        }
        
        return { valid: true, message: '' };
    }

    /**
     * Handle preset button click
     * @param {string} query - Preset query string
     */
    handlePresetClick(query) {
        if (this.elements.searchQuery) {
            this.elements.searchQuery.value = query;
            this.elements.searchQuery.focus();
        }
        
        console.log('Preset selected:', query);
    }

    /**
     * Handle filter application
     */
    handleFilters() {
        const filterData = this.getFilterFormData();
        
        // Save preferences
        this.savePreferences();
        
        // Notify parent app to apply filters
        if (window.app && window.app.applyFilters) {
            window.app.applyFilters(filterData);
        }
        
        console.log('Filters applied:', filterData);
    }

    /**
     * Get filter form data
     * @returns {Object} Filter parameters
     */
    getFilterFormData() {
        return {
            nameFilter: this.elements.nameFilter?.value?.trim() || '',
            minRating: parseFloat(this.elements.minRating?.value) || 0,
            minReviews: parseInt(this.elements.minReviews?.value) || 0,
            priceLevel: this.elements.priceLevel?.value || 'all',
            businessStatus: this.elements.businessStatus?.value || 'all'
        };
    }

    /**
     * Handle filter reset
     */
    handleResetFilters() {
        // Reset form elements to defaults
        if (this.elements.nameFilter) this.elements.nameFilter.value = '';
        if (this.elements.minRating) this.elements.minRating.value = '0';
        if (this.elements.minReviews) this.elements.minReviews.value = '0';
        if (this.elements.priceLevel) this.elements.priceLevel.value = 'all';
        if (this.elements.businessStatus) this.elements.businessStatus.value = 'all';
        
        // Apply reset filters
        this.handleFilters();
        
        console.log('Filters reset to defaults');
    }

    /**
     * Handle Excel export
     */
    handleExport() {
        try {
            if (window.app && window.app.exportToExcel) {
                window.app.exportToExcel();
            } else {
                this.showError('Export functionality not available');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Export failed: ' + error.message);
        }
    }
    
    /**
     * Apply name filter to current results
     */
    applyNameFilter() {
        const nameFilter = this.elements.nameFilter?.value?.trim().toLowerCase() || '';
        
        if (!this.currentData || this.currentData.length === 0) {
            console.log('No data to filter');
            return;
        }
        
        let filteredResults;
        
        if (nameFilter === '') {
            // Show all results if no filter
            filteredResults = this.currentData;
        } else {
            // Filter results by name
            filteredResults = this.currentData.filter(restaurant => 
                restaurant.name && restaurant.name.toLowerCase().includes(nameFilter)
            );
        }
        
        // Update table with filtered results
        this.updateResultsTable(filteredResults);
        
        // Update status
        this.updateFilterStatus(filteredResults.length, this.currentData.length);
        
        console.log(`Name filter applied: ${filteredResults.length}/${this.currentData.length} results`);
    }
    
    /**
     * Update filter status display
     * @param {number} filteredCount - Number of filtered results
     * @param {number} totalCount - Total number of results
     */
    updateFilterStatus(filteredCount, totalCount) {
        if (this.elements.searchStatus) {
            if (filteredCount === totalCount) {
                this.elements.searchStatus.textContent = `Showing all ${totalCount} results`;
            } else {
                this.elements.searchStatus.textContent = `Showing ${filteredCount} of ${totalCount} results`;
            }
            this.elements.searchStatus.style.display = 'block';
        }
    }

    /**
     * Update dashboard metrics
     * @param {Object} analytics - Analytics data
     */
    updateDashboardMetrics(analytics) {
        if (!analytics) return;

        // Update metric cards
        if (this.elements.totalTargets) {
            this.elements.totalTargets.textContent = analytics.totalTargets || 0;
        }
        
        if (this.elements.avgRating) {
            this.elements.avgRating.textContent = analytics.averageRating || '0.0';
        }
        
        if (this.elements.totalReviews) {
            this.elements.totalReviews.textContent = (analytics.totalReviews || 0).toLocaleString();
        }
        
        if (this.elements.avgPrice) {
            const priceDisplay = CONFIG.PRICE_LEVELS[analytics.averagePrice] || 'N/A';
            this.elements.avgPrice.textContent = priceDisplay;
        }

        console.log('Dashboard metrics updated');
    }

    /**
     * Update results table
     * @param {Array} restaurants - Restaurant data
     */
    updateResultsTable(restaurants) {
        if (!this.elements.targetsTableBody) return;

        if (!restaurants || restaurants.length === 0) {
            this.elements.targetsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: #6c757d; padding: 20px;">
                        ${CONFIG.MESSAGES.NO_RESULTS}
                    </td>
                </tr>
            `;
            return;
        }

        // Sort restaurants alphabetically by name before display
        console.log('📊 Frontend: Sorting restaurants alphabetically');
        const sortedRestaurants = restaurants.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Generate table rows - REMOVED .slice(0, 50) limit to show all results
        console.log('📊 Frontend: Received', restaurants.length, 'results for table display');
        console.log('📊 Frontend: First result after sorting:', sortedRestaurants[0]?.name);
        console.log('📊 Frontend: Last result after sorting:', sortedRestaurants[sortedRestaurants.length - 1]?.name);
        
        // Check for coordinates in frontend results
        const coordCount = sortedRestaurants.filter(r => r.lat && r.lng).length;
        console.log('📍 Frontend: Results with coordinates:', coordCount, '/', sortedRestaurants.length);
        
        const rows = sortedRestaurants.map((restaurant, index) => {
            return this.createTableRow(restaurant, index + 1);
        }).join('');

        this.elements.targetsTableBody.innerHTML = rows;
        
        console.log(`Table updated with ${sortedRestaurants.length} restaurants (showing all results, alphabetically sorted)`);
    }

    /**
     * Create a table row for a restaurant
     * @param {Object} restaurant - Restaurant data
     * @param {number} rank - Display rank
     * @returns {string} HTML table row
     */
    // createTableRow(restaurant, rank) {
    //     const name = restaurant.name || 'Unknown';
    //     const rating = (restaurant.rating || 0).toFixed(1);
    //     const reviews = (restaurant.user_ratings_total || 0).toLocaleString();
    //     const priceLevel = restaurant.price_level_display || 'N/A';
    //     const status = restaurant.business_status || 'Unknown';
    //     const maScore = restaurant.ma_score || 0;
    //     const address = restaurant.formatted_address || 'Address not available';
    //     const placeId = restaurant.place_id || '';

    //     // Status color
    //     const statusColor = status === 'OPERATIONAL' ? '#28a745' : '#dc3545';
        
    //     // M&A Score color
    //     let scoreColor = '#6c757d';
    //     if (maScore >= 80) scoreColor = '#28a745';
    //     else if (maScore >= 65) scoreColor = '#17a2b8';
    //     else if (maScore >= 50) scoreColor = '#ffc107';
    //     else if (maScore >= 35) scoreColor = '#fd7e14';
    //     else scoreColor = '#dc3545';

    //     return `
    //         <tr>
    //             <td>${rank}</td>
    //             <td><strong>${name}</strong></td>
    //             <td>${rating} ⭐</td>
    //             <td>${reviews}</td>
    //             <td>${priceLevel}</td>
    //             <td>
    //                 <span style="color: ${statusColor}">
    //                     ${status}
    //                 </span>
    //             </td>
    //             <td>
    //                 <strong style="color: ${scoreColor}">
    //                     ${maScore}/100
    //                 </strong>
    //             </td>
    //             <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
    //                 title="${address}">
    //                 ${address}
    //             </td>
    //             <td>
    //                 <button class="action-btn" onclick="window.viewRestaurantDetails('${placeId}')">
    //                     Details
    //                 </button>
    //             </td>
    //         </tr>
    //     `;
    // }


    createTableRow(restaurant, rank) {
    const name = restaurant.name || 'Unknown';
    const rating = (restaurant.rating || 0).toFixed(1);
    const reviews = (restaurant.user_ratings_total || 0).toLocaleString();
    const priceLevel = restaurant.price_level_display || 'N/A';
    const status = restaurant.business_status || 'Unknown';
    const maScore = restaurant.ma_score || 0;
    const address = restaurant.formatted_address || 'Address not available';
    const placeId = restaurant.place_id || '';
    
    // Status color
    const statusColor = status === 'OPERATIONAL' ? '#28a745' : '#dc3545';
    
    // M&A Score color
    let scoreColor = '#6c757d';
    if (maScore >= 80) scoreColor = '#28a745';
    else if (maScore >= 65) scoreColor = '#17a2b8';
    else if (maScore >= 50) scoreColor = '#ffc107';
    else if (maScore >= 35) scoreColor = '#fd7e14';
    else scoreColor = '#dc3545';

    return `
        <tr>
            <td>${rank}</td>
            <td><strong>${name}</strong></td>
            <td>${rating} ⭐</td>
            <td>${reviews}</td>
            <td>${priceLevel}</td>
            <td>
                <span style="color: ${statusColor}">
                    ${status}
                </span>
            </td>
            <td>
                <strong style="color: ${scoreColor}">
                    ${maScore}/100
                </strong>
            </td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                title="${address}">
                ${address}
            </td>
            <td id="details-${placeId}" style="min-width: 150px;">
                <a href="https://www.google.com/maps/place/?q=place_id:${placeId}" target="_blank" class="details-link">
                    📍 View Details
                </a>
            </td>
        </tr>
    `   ;
        }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     */
    setLoadingState(loading) {
        this.isLoading = loading;

        // Update search button
        if (this.elements.searchBtn) {
            this.elements.searchBtn.disabled = loading;
            this.elements.searchBtn.textContent = loading ? 'Searching...' : 'Search Targets';
        }

        // Update table with loading message
        if (loading && this.elements.targetsTableBody) {
            this.elements.targetsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading">
                        ${CONFIG.MESSAGES.SEARCH_IN_PROGRESS}
                    </td>
                </tr>
            `;
        }

        console.log('Loading state:', loading);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error('UI Error:', message);
        
        // Show browser alert for now (can be enhanced with custom modal)
        alert(message);
        
        // Update table with error message
        if (this.elements.targetsTableBody) {
            this.elements.targetsTableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: #dc3545; padding: 20px;">
                        Error: ${message}
                    </td>
                </tr>
            `;
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log('Success:', message);
        // Can be enhanced with toast notifications
    }

    /**
     * Update data and refresh UI
     * @param {Array} restaurants - Restaurant data
     * @param {Object} analytics - Analytics data
     */
    updateUI(restaurants, analytics) {
        this.currentData = restaurants;
        this.updateDashboardMetrics(analytics);
        this.updateResultsTable(restaurants);
    }

    /**
     * Get current UI state
     * @returns {Object} Current UI state
     */
    getUIState() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            currentDataCount: this.currentData.length,
            searchFormData: this.getSearchFormData(),
            filterFormData: this.getFilterFormData()
        };
    }

    /**
     * Cleanup and destroy UI controller
     */
    destroy() {
        console.log('Destroying UI Controller');
        
        // Remove event listeners (if needed)
        // Clear cached elements
        this.elements = {};
        this.currentData = [];
        this.isInitialized = false;
    }
}

// Make UIController available globally
if (typeof window !== 'undefined') {
    window.UIController = UIController;
}

// Also export for Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}

console.log('UI Controller loaded successfully');