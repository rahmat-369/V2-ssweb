const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

module.exports = async (req, res) => {
  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // ===== Query Params =====
  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).json({
      status: 400,
      message: 'Parameter "url" diperlukan.',
    });
    return;
  }

  const device = (req.query.device || "").toLowerCase(); // mobile/tablet/desktop/pc
  const fullPage = req.query.fullPage !== "false"; // default true
  const format = (req.query.format || "jpeg").toLowerCase(); // jpeg/png
  const quality = parseInt(req.query.quality) || 80; // jpeg only
  const delay = parseInt(req.query.delay) || 0; // ms

  // default viewport
  let width = parseInt(req.query.width) || 1280;
  let height = parseInt(req.query.height) || 800;

  // ===== Device Presets =====
  const devicePresets = {
    mobile: { width: 390, height: 844, ua: "mobile" },   // iPhone 14-ish
    tablet: { width: 768, height: 1024, ua: "tablet" },  // iPad
    desktop: { width: 1366, height: 768, ua: "desktop" },// laptop
    pc: { width: 1920, height: 1080, ua: "desktop" }     // monitor
  };

  if (device && devicePresets[device]) {
    width = devicePresets[device].width;
    height = devicePresets[device].height;
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      defaultViewport: { width, height },
    });

    const page = await browser.newPage();

    // ===== User Agent (biar beneran kerasa mobile/tablet) =====
    if (device === "mobile") {
      await page.setUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      );
    } else if (device === "tablet") {
      await page.setUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      );
    } else {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
    }

    // ===== Load Page =====
    await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 20000,
    });

    // optional delay
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // ===== Screenshot Options =====
    const screenshotOptions = {
      fullPage: fullPage,
      type: format === "png" ? "png" : "jpeg",
    };

    if (format !== "png") {
      screenshotOptions.quality = Math.min(Math.max(quality, 10), 100);
    }

    const screenshotBuffer = await page.screenshot(screenshotOptions);

    // ===== Response =====
    res.statusCode = 200;
    res.setHeader(
      "Content-Type",
      format === "png" ? "image/png" : "image/jpeg"
    );
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");

    res.end(screenshotBuffer);
  } catch (error) {
    console.error("Screenshot error:", error);

    res.status(500).json({
      status: 500,
      message: "Gagal mengambil screenshot: " + error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
