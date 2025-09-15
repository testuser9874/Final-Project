import requests
import re
from urllib.parse import urljoin, urlparse
from collections import deque
import time

class GermanPhoneNumberScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.visited_urls = set()
        self.phone_numbers = set()
        self.max_urls = 50  # Limit for demonstration purposes
        
    def is_valid_url(self, url):
        """Check if the URL is valid and has a supported scheme."""
        parsed = urlparse(url)
        return bool(parsed.netloc) and bool(parsed.scheme) and parsed.scheme in ['http', 'https']
    
    def extract_phone_numbers(self, text):
        """Extract German phone numbers from text using regex patterns."""
        # Comprehensive patterns for German phone numbers
        patterns = [
            r'\+49[-\s]?\(?\d{2,5}\)?[-\s]?\d{3,7}[-\s]?\d{3,5}',  # +49 international format
            r'0049[-\s]?\(?\d{2,5}\)?[-\s]?\d{3,7}[-\s]?\d{3,5}',   # 0049 international format
            r'0\d{2,5}[-\s]?\(?\d{3,7}\)?[-\s]?\d{3,5}',            # National format
            r'\(0\d{2,5}\)[-\s]?\d{3,7}[-\s]?\d{3,5}',              # National format with parentheses
        ]
        
        found_numbers = set()
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                # Clean up the number
                cleaned = re.sub(r'[^\d+]', '', match)
                # Ensure it starts correctly
                if cleaned.startswith('0049'):
                    cleaned = '+49' + cleaned[4:]
                elif cleaned.startswith('0') and len(cleaned) >= 10:
                    cleaned = '+49' + cleaned[1:]
                # Validate the length
                if len(cleaned) >= 11 and len(cleaned) <= 16:  # German numbers are typically 11-16 digits with country code
                    found_numbers.add(cleaned)
        
        return found_numbers
    
    def extract_links(self, html, base_url):
        """Extract all links from the HTML content."""
        # Simple regex for href attributes
        pattern = r'href="([^"]*)"'
        links = re.findall(pattern, html)
        
        # Convert relative URLs to absolute URLs
        absolute_links = set()
        for link in links:
            absolute_link = urljoin(base_url, link)
            if self.is_valid_url(absolute_link):
                absolute_links.add(absolute_link)
        
        return absolute_links
    
    def scrape_website(self, start_url, max_numbers=100):
        """Scrape the website starting from the given URL."""
        queue = deque([start_url])
        self.visited_urls.add(start_url)
        
        while queue and len(self.phone_numbers) < max_numbers:
            url = queue.popleft()
            
            try:
                print(f"Scraping: {url}")
                response = self.session.get(url, timeout=5)
                response.raise_for_status()
                
                # Extract phone numbers from the page content
                new_numbers = self.extract_phone_numbers(response.text)
                if new_numbers:
                    print(f"Found {len(new_numbers)} phone numbers on {url}")
                    self.phone_numbers.update(new_numbers)
                
                # If we haven't reached our limit, continue to extract links
                if len(self.visited_urls) < self.max_urls:
                    links = self.extract_links(response.text, url)
                    for link in links:
                        if link not in self.visited_urls:
                            self.visited_urls.add(link)
                            queue.append(link)
                
                # Be polite with a delay between requests
                time.sleep(1)
                
            except requests.RequestException as e:
                print(f"Error scraping {url}: {e}")
                continue
        
        return list(self.phone_numbers)[:max_numbers]

def main():
    """Main function to run the scraper."""
    print("German Phone Number Scraper")
    print("=" * 30)
    
    # Get website URL from user
    url = input("Enter the website URL to scrape: ").strip()
    
    if not url:
        print("Please provide a valid URL.")
        return
    
    # Validate URL format
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    # Initialize and run the scraper
    scraper = GermanPhoneNumberScraper()
    
    try:
        print(f"\nStarting scrape of {url}...")
        phone_numbers = scraper.scrape_website(url)
        
        print(f"\nScraping completed. Found {len(phone_numbers)} phone numbers:")
        print("=" * 50)
        
        for i, number in enumerate(phone_numbers, 1):
            print(f"{i}. {number}")
            
    except KeyboardInterrupt:
        print("\nScraping interrupted by user.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()