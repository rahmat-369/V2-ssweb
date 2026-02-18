const puppeteer = require("puppeteer");

module.exports = async (req, res) => {
  const targetUrl = req.query.url;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (!targetUrl) {
    res.status(400).json({
      status: 400,
      message: 'Parameter "url" diperlukan.'
    });
    return;
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 20000
    });

    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 80,
      fullPage: true
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");

    res.end(screenshotBuffer);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      status: 500,
      message: "Gagal mengambil screenshot: " + error.message
    });
  } finally {
    if (browser) await browser.close();
  }
};
