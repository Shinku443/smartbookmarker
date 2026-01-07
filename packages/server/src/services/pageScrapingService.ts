import { SCRAPFLY_KEY } from "../env";

interface ScrapedContent {
  title?: string;
  description?: string;
  extractedText?: string;
  faviconUrl?: string;
  screenshotUrl?: string;
}

class PageScrapingService {
  /**
   * Scrape a webpage and extract useful content
   */
  async scrapePage(url: string): Promise<ScrapedContent> {
    try {
      // Use Scrapfly for reliable scraping
      if (SCRAPFLY_KEY) {
        return await this.scrapeWithScrapfly(url);
      }

      // Fallback to basic fetch for development
      return await this.scrapeWithFetch(url);
    } catch (error) {
      console.error("Failed to scrape page:", error);
      return {};
    }
  }

  /**
   * Scrape using Scrapfly API (production)
   */
  private async scrapeWithScrapfly(url: string): Promise<ScrapedContent> {
    const response = await fetch(
      `https://api.scrapfly.io/scrape?key=${SCRAPFLY_KEY}&url=${encodeURIComponent(url)}&render_js=true&asp=true`
    );

    if (!response.ok) {
      throw new Error(`Scrapfly API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      title: this.extractTitle(data.content),
      description: this.extractMetaDescription(data.content),
      extractedText: this.extractMainContent(data.content),
      faviconUrl: this.extractFavicon(data.content, url),
      screenshotUrl: data.screenshot_url
    };
  }

  /**
   * Basic scraping using fetch (development fallback)
   */
  private async scrapeWithFetch(url: string): Promise<ScrapedContent> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EmperorBookmarking/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      return {
        title: this.extractTitle(html),
        description: this.extractMetaDescription(html),
        extractedText: this.extractMainContent(html),
        faviconUrl: this.extractFavicon(html, url)
      };
    } catch (error) {
      console.error("Fetch scraping failed:", error);
      return {};
    }
  }

  /**
   * Extract page title
   */
  private extractTitle(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : undefined;
  }

  /**
   * Extract meta description
   */
  private extractMetaDescription(html: string): string | undefined {
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    return metaMatch ? metaMatch[1].trim() : undefined;
  }

  /**
   * Extract main content text (simplified)
   */
  private extractMainContent(html: string): string | undefined {
    // Remove scripts and styles
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleanHtml = cleanHtml.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    cleanHtml = cleanHtml.replace(/&nbsp;/g, ' ');
    cleanHtml = cleanHtml.replace(/&/g, '&');
    cleanHtml = cleanHtml.replace(/</g, '<');
    cleanHtml = cleanHtml.replace(/>/g, '>');
    cleanHtml = cleanHtml.replace(/"/g, '"');

    // Clean up whitespace
    cleanHtml = cleanHtml.replace(/\s+/g, ' ').trim();

    // Extract first meaningful paragraph (simplified content extraction)
    const sentences = cleanHtml.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const firstParagraph = sentences.slice(0, 3).join('. ').trim();

    return firstParagraph.length > 50 ? firstParagraph.substring(0, 500) + '...' : undefined;
  }

  /**
   * Extract favicon URL
   */
  private extractFavicon(html: string, baseUrl: string): string | undefined {
    // Try to find favicon link
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    if (faviconMatch) {
      const faviconUrl = faviconMatch[1];
      return faviconUrl.startsWith('http') ? faviconUrl : new URL(faviconUrl, baseUrl).href;
    }

    // Fallback to default favicon location
    try {
      const url = new URL(baseUrl);
      return `${url.protocol}//${url.host}/favicon.ico`;
    } catch {
      return undefined;
    }
  }
}

export const pageScrapingService = new PageScrapingService();
