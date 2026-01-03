    $root = "packages/server/src"

$folders = @(
    "$root/services",
    "$root/routes",
    "$root/plugins"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }
}

# Prisma Plugin
@"
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default fp(async (app) => {
  await prisma.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
"@ | Set-Content "$root/plugins/prisma.ts"


# Book Service
@"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const bookService = {
  getAll() {
    return prisma.book.findMany({
      orderBy: { order: "asc" },
    });
  },

  get(id: string) {
    return prisma.book.findUnique({ where: { id } });
  },

  create(data: { title: string; emoji?: string }) {
    return prisma.book.create({
      data: {
        title: data.title,
        emoji: data.emoji,
        order: Date.now(),
      },
    });
  },

  update(id: string, data: Partial<{ title: string; emoji: string }>) {
    return prisma.book.update({
      where: { id },
      data,
    });
  },

  delete(id: string) {
    return prisma.book.delete({ where: { id } });
  },
};
"@ | Set-Content "$root/services/bookService.ts"


# Page Service
@"
import { PrismaClient } from "@prisma/client";
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

  create(data: { bookId: string; title: string; content?: string }) {
    return prisma.page.create({
      data: {
        ...data,
        order: Date.now(),
      },
    });
  },

  update(id: string, data: Partial<{ title: string; content: string; pinned: boolean }>) {
    return prisma.page.update({
      where: { id },
      data,
    });
  },

  delete(id: string) {
    return prisma.page.delete({ where: { id } });
  },
};
"@ | Set-Content "$root/services/pageService.ts"


# Tag Service
@"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const tagService = {
  getAll() {
    return prisma.tag.findMany();
  },

  create(data: { name: string; color?: string }) {
    return prisma.tag.create({ data });
  },

  delete(id: string) {
    return prisma.tag.delete({ where: { id } });
  },
};
"@ | Set-Content "$root/services/tagService.ts"


# PageTag Service
@"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const pageTagService = {
  addTag(pageId: string, tagId: string) {
    return prisma.pageTag.create({
      data: { pageId, tagId },
    });
  },

  removeTag(pageId: string, tagId: string) {
    return prisma.pageTag.delete({
      where: { pageId_tagId: { pageId, tagId } },
    });
  },
};
"@ | Set-Content "$root/services/pageTagService.ts"


# Ordering Service
@"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const orderingService = {
  reorderPages(bookId: string, orderedIds: string[]) {
    return prisma.\$transaction(
      orderedIds.map((id, index) =>
        prisma.page.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  },

  reorderBooks(orderedIds: string[]) {
    return prisma.\$transaction(
      orderedIds.map((id, index) =>
        prisma.book.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  },
};
"@ | Set-Content "$root/services/orderingService.ts"


# Sync Service
@"
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const syncService = {
  record(entityType: string, entityId: string) {
    return prisma.syncMetadata.upsert({
      where: { entityId },
      update: { version: { increment: 1 } },
      create: { entityType, entityId },
    });
  },
};
"@ | Set-Content "$root/services/syncService.ts"


# Routes
@"
import { FastifyInstance } from "fastify";
import { bookService } from "../services/bookService";

export default async function bookRoutes(app: FastifyInstance) {
  app.get("/books", () => bookService.getAll());
  app.post("/books", (req) => bookService.create(req.body as any));
  app.patch("/books/:id", (req) => bookService.update((req.params as any).id, req.body as any));
  app.delete("/books/:id", (req) => bookService.delete((req.params as any).id));
}
"@ | Set-Content "$root/routes/books.ts"


@"
import { FastifyInstance } from "fastify";
import { pageService } from "../services/pageService";

export default async function pageRoutes(app: FastifyInstance) {
  app.get("/pages/:bookId", (req) => pageService.getAll((req.params as any).bookId));
  app.post("/pages", (req) => pageService.create(req.body as any));
  app.patch("/pages/:id", (req) => pageService.update((req.params as any).id, req.body as any));
  app.delete("/pages/:id", (req) => pageService.delete((req.params as any).id));
}
"@ | Set-Content "$root/routes/pages.ts"


@"
import { FastifyInstance } from "fastify";
import { tagService } from "../services/tagService";

export default async function tagRoutes(app: FastifyInstance) {
  app.get("/tags", () => tagService.getAll());
  app.post("/tags", (req) => tagService.create(req.body as any));
  app.delete("/tags/:id", (req) => tagService.delete((req.params as any).id));
}
"@ | Set-Content "$root/routes/tags.ts"


# Index.ts
@"
import Fastify from "fastify";
import prismaPlugin from "./plugins/prisma";

import bookRoutes from "./routes/books";
import pageRoutes from "./routes/pages";
import tagRoutes from "./routes/tags";

const app = Fastify();

app.register(prismaPlugin);
app.register(bookRoutes);
app.register(pageRoutes);
app.register(tagRoutes);

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});
"@ | Set-Content "$root/index.ts"

Write-Host "Emperor backend scaffold created successfully."
