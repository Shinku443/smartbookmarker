import { PrismaClient } from "@prisma/client";
import { syncService } from "./syncService";
import { pageScrapingService } from "./pageScrapingService";
import { serializeBigInts } from "../utils/helpers";
import { PageContentService } from "./pageContentService";

const prisma = new PrismaClient();

export const pageService = {
  getAll(bookId: string) {
    return prisma.page.findMany({
      where: { bookId },
      orderBy: { order: "asc" },
      include: { tags: true },
    });
  },

  get(id: string) {
    return prisma.page.findUnique({
      where: { id },
      include: { tags: true },
    });
  },

  async create(data: {
    bookId: string;
    title: string;
    content?: string;
    url?: string;
    status?: string;
    notes?: string;
    description?: string;
    faviconUrl?: string;
    thumbnailUrl?: string;
    extractedText?: string;
    screenshotUrl?: string;
    metaDescription?: string;
    source?: string;
    rawMetadata?: any;
  }) {
    let enhancedData = { ...data };

    // If URL is provided, extract content using both services for maximum compatibility
    if (data.url) {
      try {
        // Try advanced content extraction first
        const extractedContent = await PageContentService.extractContent(data.url);
        enhancedData = {
          ...enhancedData,
          title: extractedContent.title || data.title,
          description: extractedContent.description,
          faviconUrl: extractedContent.faviconUrl,
          thumbnailUrl: extractedContent.screenshotUrl,
          extractedText: extractedContent.extractedText,
          metaDescription: extractedContent.metaDescription,
          source: 'imported' as const,
          rawMetadata: {
            extractedAt: new Date().toISOString(),
            originalUrl: data.url,
            ...extractedContent
          }
        };
      } catch (error) {
        console.error('Advanced content extraction failed, trying basic scraping:', error);
        try {
          // Fallback to basic scraping (current functionality)
          const scraped = await pageScrapingService.scrapePage(data.url);
          enhancedData = {
            ...enhancedData,
            url: data.url,
            extractedText: scraped.extractedText,
            metaDescription: scraped.description,
            faviconUrl: scraped.faviconUrl,
            screenshotUrl: scraped.screenshotUrl,
            // Override title if scraped title is better
            title: scraped.title && scraped.title.length > data.title.length ? scraped.title : data.title
          };
        } catch (scrapingError) {
          console.error("Basic scraping also failed:", scrapingError);
          enhancedData = { ...enhancedData, url: data.url };
        }
      }
    }

    const page = await prisma.page.create({
      data: {
        ...enhancedData,
        order: Date.now(),
      },
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      pinned: boolean;
      status: string;
      notes: string;
      description: string;
      faviconUrl: string;
      thumbnailUrl: string;
      extractedText: string;
      screenshotUrl: string;
      metaDescription: string;
    }>,
  ) {
    const page = await prisma.page.update({
      where: { id },
      data,
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  // Enhanced methods for content extraction
  async extractContent(id: string, url: string) {
    try {
      const extractedContent = await PageContentService.extractContent(url);

      const page = await prisma.page.update({
        where: { id },
        data: {
          title: extractedContent.title,
          description: extractedContent.description,
          faviconUrl: extractedContent.faviconUrl,
          thumbnailUrl: extractedContent.screenshotUrl,
          extractedText: extractedContent.extractedText,
          metaDescription: extractedContent.metaDescription,
          source: 'imported',
          rawMetadata: {
            extractedAt: new Date().toISOString(),
            originalUrl: url,
            ...extractedContent
          }
        },
      });

      await syncService.record("page", page.id);
      return serializeBigInts(page);
    } catch (error) {
      console.error('Content extraction failed:', error);
      throw error;
    }
  },

  // Status management methods
  async updateStatus(id: string, status: string) {
    const page = await prisma.page.update({
      where: { id },
      data: { status },
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  async addNotes(id: string, notes: string) {
    const page = await prisma.page.update({
      where: { id },
      data: { notes },
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  async delete(id: string) {
    const page = await prisma.page.delete({ where: { id } });
    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },
};