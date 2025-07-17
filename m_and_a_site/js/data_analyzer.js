/**
 * M&A Target Analysis Engine
 * Calculates acquisition scores and processes restaurant data for M&A evaluation
 */

class MATargetAnalyzer {
    constructor() {
        this.api = null;
        this.rawData = [];
        this.processedData = [];
        this.filteredData = [];
        
        console.log('M&A Target Analyzer initialized');
    }

    /**
     * Set the API client for fetching additional data
     * @param {GooglePlacesAPI} apiClient - Initialized API client
     */
    setApiClient(apiClient) {
        this.api = apiClient;
        console.log('API client connected to analyzer');
    }

    /**
     * Set API key and create API client
     * @param {string} apiKey - Google Places API key
     */
    setApiKey(apiKey) {
        this.api = new GooglePlacesAPI(apiKey);
        console.log('API key set for analyzer');
    }

    /**
     * Calculate M&A attractiveness score for a restaurant (0-100 scale)
     * @param {Object} restaurant - Restaurant data from Google Places
     * @returns {number} M&A score (0-100)
     */
    calculateMAScore(restaurant) {
        let score = 0;
        
        // Rating Factor (0-40 points) - Higher ratings indicate quality
        const rating = restaurant.rating || 0;
        const ratingScore = (rating / 5) * CONFIG.SCORING.RATING_WEIGHT;
        score += ratingScore;
        
        // Review Count Factor (0-30 points) - More reviews indicate establishment
        const reviews = restaurant.user_ratings_total || 0;
        let reviewScore = 0;
        
        if (reviews >= CONFIG.REVIEW_THRESHOLDS.EXCELLENT) {
            reviewScore = 30; // 1000+ reviews
        } else if (reviews >= CONFIG.REVIEW_THRESHOLDS.GOOD) {
            reviewScore = 25; // 500+ reviews
        } else if (reviews >= CONFIG.REVIEW_THRESHOLDS.FAIR) {
            reviewScore = 15; // 100+ reviews
        } else if (reviews >= CONFIG.REVIEW_THRESHOLDS.POOR) {
            reviewScore = 10; // 50+ reviews
        }
        
        score += reviewScore;
        
        // Price Level Factor (0-20 points) - $$ is ideal for M&A
        const priceLevel = restaurant.price_level || 0;
        let priceScore = 0;
        
        if (priceLevel === 2) {
            priceScore = CONFIG.SCORING.PRICE_WEIGHT; // $$ - ideal for M&A
        } else if (priceLevel === 1 || priceLevel === 3) {
            priceScore = 15; // $ or $$$ - still good
        } else if (priceLevel === 4) {
            priceScore = 5; // $$$$ - high-end, harder to scale
        }
        
        score += priceScore;
        
        // Business Status Factor (0-10 points)
        if (restaurant.business_status === CONFIG.BUSINESS_STATUS.OPERATIONAL) {
            score += CONFIG.SCORING.STATUS_WEIGHT;
        }
        
        // Bonus factors for M&A attractiveness
        
        // Chain/Franchise Bonus (0-5 points) - Look for franchise indicators
        const name = (restaurant.name || '').toLowerCase();
        const types = restaurant.types || [];
        
        if (this.hasChainIndicators(name, types)) {
            score += 5;
        }
        
        // Location Quality Bonus (0-5 points) - High traffic areas
        if (this.hasLocationQualityIndicators(restaurant)) {
            score += 5;
        }
        
        return Math.round(Math.min(score, 100)); // Cap at 100
    }

    /**
     * Check if restaurant has chain/franchise indicators
     * @param {string} name - Restaurant name
     * @param {Array} types - Google Places types
     * @returns {boolean} True if chain indicators found
     */
    hasChainIndicators(name, types) {
        const chainKeywords = [
            'pizza', 'burger', 'chicken', 'taco', 'subway', 'mcdonald', 
            'kfc', 'domino', 'papa', 'sonic', 'dairy queen', 'wendy',
            'franchise', 'chain', 'corporate', 'inc', 'llc'
        ];
        
        const franchiseTypes = [
            'meal_takeaway', 'fast_food', 'restaurant'
        ];
        
        // Check name for chain keywords
        const hasNameIndicator = chainKeywords.some(keyword => 
            name.includes(keyword)
        );
        
        // Check types for franchise-friendly categories
        const hasTypeIndicator = franchiseTypes.some(type => 
            types.includes(type)
        );
        
        return hasNameIndicator || hasTypeIndicator;
    }

    /**
     * Check if restaurant has high-quality location indicators
     * @param {Object} restaurant - Restaurant data
     * @returns {boolean} True if quality location indicators found
     */
    hasLocationQualityIndicators(restaurant) {
        const types = restaurant.types || [];
        const qualityLocationTypes = [
            'shopping_mall', 'tourist_attraction', 'transit_station',
            'university', 'school', 'hospital', 'airport'
        ];
        
        return qualityLocationTypes.some(type => types.includes(type));
    }

    /**
     * Process raw restaurant data and add M&A analysis
     * @param {Array} restaurants - Raw restaurant data from Google Places
     * @returns {Array} Processed restaurants with M&A scores and additional data
     */
    processRestaurantData(restaurants) {
        console.log(`Processing ${restaurants.length} restaurants for M&A analysis`);
        
        // Debug: Check coordinates in raw data
        const rawCoordCount = restaurants.filter(r => r.lat && r.lng).length;
        console.log('🔄 Analyzer: Raw data with coordinates:', rawCoordCount, '/', restaurants.length);
        if (restaurants.length > 0) {
            console.log('🔄 Analyzer: Sample raw restaurant:', restaurants[0].name, 'lat:', restaurants[0].lat, 'lng:', restaurants[0].lng);
        }
        
        this.rawData = restaurants;
        
        this.processedData = restaurants.map((restaurant, index) => {
            const maScore = this.calculateMAScore(restaurant);
            
            return {
                ...restaurant,
                // M&A Analysis Fields
                rank: index + 1,
                ma_score: maScore,
                ma_tier: this.getMAScoreTier(maScore),
                
                // Formatted Display Fields
                formatted_address: restaurant.formatted_address || 'Address not available',
                price_level_display: this.formatPriceLevel(restaurant.price_level),
                rating_display: (restaurant.rating || 0).toFixed(1),
                reviews_display: (restaurant.user_ratings_total || 0).toLocaleString(),
                
                // Coordinate Fields - Direct from API response
                lat: restaurant.lat,
                lng: restaurant.lng,
                
                // Business Intelligence Fields
                is_chain_candidate: this.hasChainIndicators(
                    (restaurant.name || '').toLowerCase(), 
                    restaurant.types || []
                ),
                location_quality: this.hasLocationQualityIndicators(restaurant),
                
                // Risk Assessment
                risk_level: this.assessRiskLevel(restaurant),
                
                // Investment Attractiveness
                investment_category: this.categorizeInvestment(maScore, restaurant)
            };
        });
        
        // Sort by M&A score (highest first)
        this.processedData.sort((a, b) => b.ma_score - a.ma_score);
        
        // Update ranks after sorting
        this.processedData.forEach((restaurant, index) => {
            restaurant.rank = index + 1;
        });
        
        // Debug: Check coordinates in processed data
        const processedCoordCount = this.processedData.filter(r => r.lat && r.lng).length;
        console.log('🔄 Analyzer: Processed data with coordinates:', processedCoordCount, '/', this.processedData.length);
        if (this.processedData.length > 0) {
            console.log('🔄 Analyzer: Sample processed restaurant:', this.processedData[0].name, 'lat:', this.processedData[0].lat, 'lng:', this.processedData[0].lng);
        }
        
        console.log(`Processing complete. Top score: ${this.processedData[0]?.ma_score || 0}`);
        
        return this.processedData;
    }

    /**
     * Get M&A score tier classification
     * @param {number} score - M&A score (0-100)
     * @returns {string} Tier classification
     */
    getMAScoreTier(score) {
        if (score >= 80) return 'Premium Target';
        if (score >= 65) return 'Strong Target';
        if (score >= 50) return 'Good Target';
        if (score >= 35) return 'Potential Target';
        return 'Low Priority';
    }

    /**
     * Format price level for display
     * @param {number} level - Price level (1-4)
     * @returns {string} Formatted price level
     */
    formatPriceLevel(level) {
        return CONFIG.PRICE_LEVELS[level] || 'N/A';
    }

    /**
     * Assess risk level for M&A target
     * @param {Object} restaurant - Restaurant data
     * @returns {string} Risk level assessment
     */
    assessRiskLevel(restaurant) {
        const rating = restaurant.rating || 0;
        const reviews = restaurant.user_ratings_total || 0;
        const status = restaurant.business_status;
        
        // High risk factors
        if (status !== CONFIG.BUSINESS_STATUS.OPERATIONAL) return 'High Risk';
        if (rating < 3.0) return 'High Risk';
        if (reviews < 50) return 'High Risk';
        
        // Medium risk factors
        if (rating < 3.5 || reviews < 200) return 'Medium Risk';
        
        // Low risk
        return 'Low Risk';
    }

    /**
     * Categorize investment opportunity
     * @param {number} score - M&A score
     * @param {Object} restaurant - Restaurant data
     * @returns {string} Investment category
     */
    categorizeInvestment(score, restaurant) {
        const priceLevel = restaurant.price_level || 0;
        const reviews = restaurant.user_ratings_total || 0;
        
        if (score >= 80) {
            return reviews > 1000 ? 'Established Franchise' : 'High Growth Potential';
        }
        
        if (score >= 65) {
            return priceLevel === 2 ? 'Scalable Concept' : 'Solid Investment';
        }
        
        if (score >= 50) {
            return 'Growth Opportunity';
        }
        
        return 'Speculative';
    }

    /**
     * Apply filters to processed restaurant data
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered restaurant data
     */
    applyFilters(filters) {
        console.log('Applying filters:', filters);
        
        let data = [...this.processedData];
        
        // Rating filter
        if (filters.minRating && filters.minRating > 0) {
            data = data.filter(restaurant => {
                const rating = restaurant.rating || 0;
                return rating >= filters.minRating;
            });
        }
        
        // Review count filter
        if (filters.minReviews && filters.minReviews > 0) {
            data = data.filter(restaurant => {
                const reviews = restaurant.user_ratings_total || 0;
                return reviews >= filters.minReviews;
            });
        }
        
        // Price level filter
        if (filters.priceLevel && filters.priceLevel !== 'all') {
            const targetPriceLevel = parseInt(filters.priceLevel);
            data = data.filter(restaurant => {
                return restaurant.price_level === targetPriceLevel;
            });
        }
        
        // Business status filter
        if (filters.businessStatus && filters.businessStatus !== 'all') {
            data = data.filter(restaurant => {
                return restaurant.business_status === filters.businessStatus;
            });
        }
        
        // M&A Score filter (if provided)
        if (filters.minMAScore && filters.minMAScore > 0) {
            data = data.filter(restaurant => {
                return restaurant.ma_score >= filters.minMAScore;
            });
        }
        
        // Investment category filter (if provided)
        if (filters.investmentCategory && filters.investmentCategory !== 'all') {
            data = data.filter(restaurant => {
                return restaurant.investment_category === filters.investmentCategory;
            });
        }
        
        // Risk level filter (if provided)
        if (filters.riskLevel && filters.riskLevel !== 'all') {
            data = data.filter(restaurant => {
                return restaurant.risk_level === filters.riskLevel;
            });
        }
        
        this.filteredData = data;
        
        // Debug: Check coordinates in filtered data
        const filteredCoordCount = data.filter(r => r.lat && r.lng).length;
        console.log('🔄 Analyzer: Filtered data with coordinates:', filteredCoordCount, '/', data.length);
        
        console.log(`Filters applied. ${data.length} restaurants match criteria`);
        
        return this.filteredData;
    }

    /**
     * Get analytics summary of current data
     * @param {Array} data - Restaurant data to analyze (defaults to filtered data)
     * @returns {Object} Analytics summary
     */
    getAnalytics(data = null) {
        const analysisData = data || this.filteredData || this.processedData;
        
        if (!analysisData.length) {
            return {
                totalTargets: 0,
                averageRating: 0,
                totalReviews: 0,
                averagePrice: 0,
                averageMAScore: 0,
                topTier: 0,
                chainCandidates: 0,
                lowRisk: 0
            };
        }
        
        // Calculate metrics
        const totalTargets = analysisData.length;
        
        const avgRating = analysisData.reduce((sum, r) => sum + (r.rating || 0), 0) / totalTargets;
        
        const totalReviews = analysisData.reduce((sum, r) => sum + (r.user_ratings_total || 0), 0);
        
        const validPriceLevels = analysisData.filter(r => r.price_level > 0);
        const avgPrice = validPriceLevels.length > 0 ?
            validPriceLevels.reduce((sum, r) => sum + r.price_level, 0) / validPriceLevels.length : 0;
        
        const avgMAScore = analysisData.reduce((sum, r) => sum + (r.ma_score || 0), 0) / totalTargets;
        
        const topTier = analysisData.filter(r => r.ma_score >= 80).length;
        const chainCandidates = analysisData.filter(r => r.is_chain_candidate).length;
        const lowRisk = analysisData.filter(r => r.risk_level === 'Low Risk').length;
        
        return {
            totalTargets,
            averageRating: Number(avgRating.toFixed(1)),
            totalReviews,
            averagePrice: Math.round(avgPrice),
            averageMAScore: Math.round(avgMAScore),
            topTier,
            chainCandidates,
            lowRisk,
            // Additional insights
            premiumTargets: analysisData.filter(r => r.ma_tier === 'Premium Target').length,
            establishedFranchises: analysisData.filter(r => r.investment_category === 'Established Franchise').length,
            highGrowthPotential: analysisData.filter(r => r.investment_category === 'High Growth Potential').length
        };
    }

    /**
     * Export filtered data to Excel-compatible format
     * @returns {Array} Data formatted for Excel export
     */
    prepareExportData() {
        const data = this.filteredData.length > 0 ? this.filteredData : this.processedData;
        
        return data.map(restaurant => ({
            'Rank': restaurant.rank,
            'Restaurant Name': restaurant.name || 'Unknown',
            'M&A Score': restaurant.ma_score,
            'M&A Tier': restaurant.ma_tier,
            'Rating': restaurant.rating_display,
            'Reviews': restaurant.reviews_display,
            'Price Level': restaurant.price_level_display,
            'Business Status': restaurant.business_status || 'Unknown',
            'Investment Category': restaurant.investment_category,
            'Risk Level': restaurant.risk_level,
            'Chain Candidate': restaurant.is_chain_candidate ? 'Yes' : 'No',
            'High Quality Location': restaurant.location_quality ? 'Yes' : 'No',
            'Address': restaurant.formatted_address,
            'Phone': restaurant.formatted_phone_number || 'N/A',
            'Website': restaurant.website || 'N/A',
            'Keywords Found': restaurant.keywords_found || 'Not scanned',
            'Keyword Count': restaurant.keyword_count || 0,
            'Place ID': restaurant.place_id
        }));
    }

    /**
     * Reset all data
     */
    reset() {
        this.rawData = [];
        this.processedData = [];
        this.filteredData = [];
        console.log('Analyzer data reset');
    }

    /**
     * Get current data summary
     * @returns {Object} Data summary
     */
    getDataSummary() {
        return {
            rawCount: this.rawData.length,
            processedCount: this.processedData.length,
            filteredCount: this.filteredData.length,
            hasApiClient: !!this.api
        };
    }
}

// Make MATargetAnalyzer available globally
if (typeof window !== 'undefined') {
    window.MATargetAnalyzer = MATargetAnalyzer;
}

// Also export for Node.js environments (if needed for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MATargetAnalyzer;
}

console.log('M&A Target Analyzer loaded successfully');