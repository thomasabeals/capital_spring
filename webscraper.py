try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
    print("✅ Playwright ready for webscraper!")
    print(sync_playwright)
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("❌ Playwright not available")

class WebScraper:
    def __init__(self):
        self.keywords = [
            'reservations', 'reserve', 'franchise', 'franchising',
            'opening soon', 'coming soon', 'new location', 'grand opening',
            'reserve a table', 'call for reservations'
        ]
    
    def scrape_website(self, url):
        if not PLAYWRIGHT_AVAILABLE:
            return {'success': False, 'error': 'Playwright not available'}
            
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, timeout=10000)
                text_content = page.inner_text('body').lower()
                browser.close()
                
                found_keywords = [kw for kw in self.keywords if kw in text_content]
                
                return {
                    'success': True,
                    'url': url,
                    'found_keywords': found_keywords,
                    'keyword_count': len(found_keywords)
                }
        except Exception as e:
            return {
                'success': False,
                'url': url,
                'error': str(e)
            }

if __name__ == "__main__":
    scraper = WebScraper()

    # Test with multiple sites
    test_sites = [
        'https://www.opentable.com',  # Should find "reservations"
        'https://www.mcdonalds.com',  # Might find "franchise"
        'https://example.com'         # Should find nothing
    ]

    for site in test_sites:
        print(f"\n Testing: {site}")
        result = scraper.scrape_website(site)
        if result['success']:
            print(f"Found {result['keyword_count']} keywords: {result['found_keywords']}")
        else:
            print(f"Error: {result['error']}")