import { PrismaClient } from "@prisma/client";
import { syncService } from "./syncService";
import { pageScrapingService } from "./pageScrapingService";
import { serializeBigInts } from "../utils/helpers";

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

  async create(data: { bookId: string; title: string; content?: string; url?: string }) {
    // Scrape content if URL is provided
    let scrapedData = {};
    if (data.url) {
      try {
        const scraped = await pageScrapingService.scrapePage(data.url);
        scrapedData = {
          url: data.url,
          extractedText: scraped.extractedText,
          metaDescription: scraped.description,
          faviconUrl: scraped.faviconUrl,
          screenshotUrl: scraped.screenshotUrl,
          // Override title if scraped title is better
          title: scraped.title && scraped.title.length > data.title.length ? scraped.title : data.title
        };
      } catch (error) {
        console.error("Failed to scrape page:", error);
        scrapedData = { url: data.url };
      }
    }

    const page = await prisma.page.create({
      data: {
        ...data,
        ...scrapedData,
        order: Date.now(),
      },
    });

    await syncService.record("page", page.id);
    return serializeBigInts(page);
  },

  async update(
    id: string,
    data: Partial<{ title: string; content: string; pinned: boolean }>,
  ) {
    const page = await prisma.page.update({
      where: { id },
      data,
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
