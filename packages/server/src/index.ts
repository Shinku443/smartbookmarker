import Fastify from "fastify";
import cors from "@fastify/cors";

import bookRoutes from "./routes/books";
import pageRoutes from "./routes/pages";
// import tagRoutes from "./routes/tags";  // TODO: Implement CouchDB tags
// import authRoutes from "./routes/auth"; // TODO: Implement auth

const app = Fastify();

// Register plugins first
app.register(cors, {
  origin: true, // Allow all origins for testing
  credentials: true
});

// Register routes after plugins
console.log('🔄 Starting route registration...');

// Register routes synchronously with error handling
console.log('📚 Registering book routes...');
try {
  app.register(bookRoutes);
  console.log('✅ Book routes registered');
} catch (error: any) {
  console.error('❌ Book routes registration failed:', error);
  console.error('❌ Error details:', error.stack);
}

console.log('📄 Registering page routes...');
try {
  app.register(pageRoutes);
  console.log('✅ Page routes registered');
} catch (error: any) {
  console.error('❌ Page routes registration failed:', error);
  console.error('❌ Error details:', error.stack);
}

console.log('🔄 Route registration complete');

// Health check and utility routes
console.log('🔧 Defining /health route...');
app.get("/health", async () => {
  console.log('[API] GET /health - health check executed');
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0"
  };
});
console.log('✅ /health route defined');

// Test route to verify server is working
app.get("/test", async () => {
  console.log('[API] GET /test - server test route called');
  return { message: "Server is working!" };
});

// Simple test route to verify ANY routes work
app.get("/ping", async () => {
  console.log('[API] GET /ping - simple test from index.ts');
  return { pong: true, timestamp: new Date().toISOString() };
});

// Emergency test route
app.get("/emergency", async () => {
  console.log('[API] GET /emergency - emergency test route');
  return { emergency: "working", time: Date.now() };
});

// Test CouchDB connectivity
app.get("/couchdb-test", async () => {
  console.log('[API] GET /couchdb-test - testing CouchDB connection');

  try {
    // Try to import PouchDB
    const { default: PouchDB } = await import('pouchdb');
    console.log('[API] PouchDB imported successfully');

    // Try to connect to CouchDB
    const db = new PouchDB('http://admin:changeme123@localhost:5984/bookmarks');
    console.log('[API] CouchDB connection created');

    // Test basic connectivity
    const info = await db.info();
    console.log('[API] CouchDB info:', info);

    return {
      success: true,
      pouchdb: 'loaded',
      couchdb: 'connected',
      info: info
    };
  } catch (error: any) {
    console.error('[API] CouchDB test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});

// Catch-all route for debugging
app.post("*", async (req) => {
  console.log('[API] CATCH-ALL POST:', req.url);
  console.log('[API] Headers:', req.headers);
  console.log('[API] Body:', req.body);
  return { message: "Catch-all route", url: req.url };
});

// List all registered routes for debugging
app.ready().then(() => {
  console.log('📋 Registered routes:');
  try {
    // Try to print routes
    app.printRoutes();
  } catch (error) {
    console.log('❌ Could not print routes:', error);
  }

  // Manually log some key routes
  console.log('🔍 Manual route check:');
  console.log('  GET /ping - should exist');
  console.log('  GET /test - should exist');
  console.log('  GET /health - should exist');
  console.log('  GET /couchdb-test - should exist');
  console.log('  GET /books - should exist');
  console.log('  POST /books - should exist');
  console.log('  GET /pages - should exist');
  console.log('  POST /pages - should exist');
});

app.listen({ port: 4000, host: "0.0.0.0" }).then(() => {
  console.log("API running on port 4000");
});
