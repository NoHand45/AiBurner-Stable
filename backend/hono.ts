import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors({
  origin: '*',
  credentials: true,
}));

// Add error handling middleware
app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

// Test endpoint for debugging
app.get("/test", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Test endpoint working", 
    timestamp: new Date().toISOString(),
    userAgent: c.req.header('user-agent') || 'unknown'
  });
});

// Test Gemini API endpoint
app.get("/test-gemini", async (c) => {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GOOGLE_AI_API_KEY || 'AIzaSyCsjfisZpa6Yz3kESROvzyR_y0tyFe3l4g';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Hello, this is a test message.');
    const response = await result.response;
    const text = response.text();
    
    return c.json({
      status: "ok",
      message: "Gemini API test successful",
      response: text,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Gemini API test failed:', error);
    return c.json({
      status: "error",
      message: "Gemini API test failed",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default app;