import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

export interface PageContent {
  title: string;
  description?: string;
  extractedText?: string;
  screenshotUrl?: string;
  faviconUrl?: string;
  metaDescription?: string;
}

export class PageContentService {
  private static browser: any = null;

  private static async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  static async extractContent(url: string): Promise<PageContent> {
    try {
      // Basic HTML fetch for metadata
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Extract basic metadata
      const title = $('title').text().trim() ||
                   $('meta[property="og:title"]').attr('content') ||
                   $('h1').first().text().trim() ||
                   'Untitled Page';

      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content');

      const metaDescription = description || $('p').first().text().trim();

      // Find favicon
      const faviconLink = $('link[rel="icon"]').attr('href') ||
                         $('link[rel="shortcut icon"]').attr('href') ||
                         '/favicon.ico';

      const faviconUrl = faviconLink.startsWith('http')
        ? faviconLink
        : faviconLink.startsWith('//')
          ? `https:${faviconLink}`
          : faviconLink.startsWith('/')
            ? `${new URL(url).origin}${faviconLink}`
            : `${url}/${faviconLink}`;

      // Extract main content text (basic approach)
      const extractedText = this.extractMainContent($);

      // For screenshots, we'd need a screenshot service
      // For now, we'll use a placeholder
      const screenshotUrl = `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&viewport_width=1280&viewport_height=720&image_quality=80&format=jpg&cache=true`;

      return {
        title,
        description,
        extractedText,
        screenshotUrl,
        faviconUrl,
        metaDescription
      };

    } catch (error) {
      console.error('Error extracting page content:', error);
      return {
        title: 'Failed to load page',
        description: 'Could not extract page content'
      };
    }
  }

  private static extractMainContent($: cheerio.CheerioAPI): string {
    // Remove script, style, and navigation elements
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar').remove();

    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        break;
      }
    }

    // Fallback to body content
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up the text
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 2000); // Limit to 2000 characters
  }

  static async generateScreenshot(url: string): Promise<string | null> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false
      });

      await page.close();

      // In a real implementation, you'd upload this to a storage service
      // For now, we'll return a data URL
      const base64 = screenshot.toString('base64');
      return `data:image/jpeg;base64,${base64}`;

    } catch (error) {
      console.error('Error generating screenshot:', error);
      return null;
    }
  }

  static async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}