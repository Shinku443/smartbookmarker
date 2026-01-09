"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageService = void 0;
const client_1 = require("@prisma/client");
const syncService_1 = require("./syncService");
const pageScrapingService_1 = require("./pageScrapingService");
const helpers_1 = require("../utils/helpers");
const pageContentService_1 = require("./pageContentService");
const prisma = new client_1.PrismaClient();
exports.pageService = {
    getAll(bookId) {
        console.log(`[PAGE READ] Fetching ${bookId ? `pages for book ${bookId}` : 'all pages'}`);
        const result = prisma.page.findMany({
            where: bookId ? { bookId } : {},
            orderBy: { order: "asc" },
            include: { tags: true },
        });
        result.then(pages => console.log(`[PAGE READ] Found ${pages.length} pages`));
        return result;
    },
    get(id) {
        return prisma.page.findUnique({
            where: { id },
            include: { tags: true },
        });
    },
    async create(data) {
        console.log(`[PAGE CREATE] Creating page "${data.title}" ${data.url ? `for URL: ${data.url}` : ''} ${data.bookId ? `in book ${data.bookId}` : 'at root'}`);
        let enhancedData = { ...data };
        // If URL is provided, extract content using both services for maximum compatibility
        if (data.url) {
            try {
                // Try advanced content extraction first
                const extractedContent = await pageContentService_1.PageContentService.extractContent(data.url);
                enhancedData = {
                    ...enhancedData,
                    title: extractedContent.title || data.title,
                    description: extractedContent.description,
                    faviconUrl: extractedContent.faviconUrl,
                    thumbnailUrl: extractedContent.screenshotUrl,
                    extractedText: extractedContent.extractedText,
                    metaDescription: extractedContent.metaDescription,
                    source: 'imported',
                    rawMetadata: JSON.stringify({
                        extractedAt: new Date().toISOString(),
                        originalUrl: data.url,
                        ...extractedContent
                    })
                };
            }
            catch (error) {
                console.error('Advanced content extraction failed, trying basic scraping:', error);
                try {
                    // Fallback to basic scraping (current functionality)
                    const scraped = await pageScrapingService_1.pageScrapingService.scrapePage(data.url);
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
                }
                catch (scrapingError) {
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
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
    async update(id, data) {
        const page = await prisma.page.update({
            where: { id },
            data,
        });
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
    // Enhanced methods for content extraction
    async extractContent(id, url) {
        try {
            const extractedContent = await pageContentService_1.PageContentService.extractContent(url);
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
                    rawMetadata: JSON.stringify({
                        extractedAt: new Date().toISOString(),
                        originalUrl: url,
                        ...extractedContent
                    })
                },
            });
            await syncService_1.syncService.record("page", page.id);
            return (0, helpers_1.serializeBigInts)(page);
        }
        catch (error) {
            console.error('Content extraction failed:', error);
            throw error;
        }
    },
    // Status management methods
    async updateStatus(id, status) {
        const page = await prisma.page.update({
            where: { id },
            data: { status },
        });
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
    async addNotes(id, notes) {
        const page = await prisma.page.update({
            where: { id },
            data: { notes },
        });
        await syncService_1.syncService.record("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
    async delete(id) {
        const page = await prisma.page.delete({ where: { id } });
        await syncService_1.syncService.recordDeletion("page", page.id);
        return (0, helpers_1.serializeBigInts)(page);
    },
};
