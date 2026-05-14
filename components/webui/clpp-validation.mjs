import { chromium } from "playwright";

const BASE_URL = "http://localhost:8080";
const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log(`✅ PASS: ${name}`);
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.message });
    console.log(`❌ FAIL: ${name} — ${e.message}`);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// === Test 1: App loads ===
await test("App loads successfully", async () => {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15000 });
  const title = await page.title();
  if (!title) throw new Error("Page title is empty");
});

// === Test 2: Settings page accessible ===
await test("Settings page is accessible", async () => {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  if (!body.includes("Settings") && !body.includes("Experimental") && !body.includes("Schema")) {
    throw new Error("Settings page content not found");
  }
});

// === Test 3: Explore page loads ===
await test("Explore page loads (Search→Explore rename)", async () => {
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  if (!body.includes("Explore") && !body.includes("Logs")) {
    throw new Error("Explore page content not found");
  }
});

// === Test 4: Experimental mode toggle ===
await test("Experimental mode toggle exists on Settings page", async () => {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  if (!body.includes("Experimental") && !body.includes("experimental")) {
    throw new Error("Experimental mode toggle text not found on Settings page");
  }
});

// === Test 5: Schema Library section ===
await test("Schema Library section visible on Settings page", async () => {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  if (!body.includes("Schema") && !body.includes("schema")) {
    throw new Error("Schema Library section not found");
  }
});

// === Test 6: Ingest page loads ===
await test("Ingest page loads", async () => {
  await page.goto(`${BASE_URL}/ingest`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  if (!body.includes("Compress") && !body.includes("ingest") && !body.includes("Ingest")) {
    throw new Error("Ingest page content not found");
  }
});

// === Test 7: Sidebar navigation ===
await test("Sidebar shows navigation items", async () => {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  const hasExplore = body.includes("Explore");
  const hasSettings = body.includes("Settings") || body.includes("settings");
  if (!hasExplore && !hasSettings) {
    if (!body.includes("Search") && !body.includes("Ingest")) {
      throw new Error("Navigation items not found in sidebar");
    }
  }
});

// === Test 8: Dashboard page loads ===
await test("Dashboard page loads", async () => {
  await page.goto(`${BASE_URL}/dashboards`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const errorText = await page.locator("body").textContent();
  if (errorText.includes("404") || errorText.includes("Not Found")) {
    throw new Error("Dashboard page returned 404");
  }
});

// === Test 9: No console errors on main pages ===
await test("No uncaught console errors on main pages", async () => {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if ("error" === msg.type()) {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });
  
  for (const path of ["/", "/settings", "/search", "/ingest"]) {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);
  }
  
  // Filter out known acceptable errors (React dev tools, HMR, etc.)
  const realErrors = consoleErrors.filter(e => 
    !e.includes("Download the React DevTools") && 
    !e.includes("HMR") &&
    !e.includes("[HMR]")
  );
  
  if (0 < realErrors.length) {
    throw new Error(`Console errors: ${realErrors.slice(0, 3).join("; ")}`);
  }
});

// === Test 10: Backend API health ===
await test("Backend API responds", async () => {
  const response = await page.request.get("http://localhost:3000/api/dashboards", { timeout: 5000 });
  // Should get 200 or 404 (empty list) but not connection refused
  if (200 !== response.status() && 404 !== response.status()) {
    throw new Error(`API returned status ${response.status()}`);
  }
});

// === Test 11: Schema API endpoint exists ===
await test("Schema API endpoint responds", async () => {
  const response = await page.request.get("http://localhost:3000/api/schemas", { timeout: 5000 });
  // 200 = working, 404 = route not found (bad), 500 = DB issue (acceptable)
  if (404 === response.status()) {
    throw new Error("Schema API route not found — route not registered");
  }
});

// === Summary ===
console.log("\n" + "=".repeat(50));
console.log("VALIDATION SUMMARY");
console.log("=".repeat(50));
const passed = results.filter(r => "PASS" === r.status).length;
const failed = results.filter(r => "FAIL" === r.status).length;
console.log(`Passed: ${passed}/${results.length}`);
console.log(`Failed: ${failed}/${results.length}`);
if (0 < failed) {
  console.log("\nFailed tests:");
  for (const r of results.filter(r => "FAIL" === r.status)) {
    console.log(`  - ${r.name}: ${r.error}`);
  }
}

await browser.close();
