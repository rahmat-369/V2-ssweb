const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
    // 1. Ambil URL dari query parameter
    const targetUrl = req.query.url;

    // Tambahkan header CORS untuk mengizinkan permintaan dari domain front-end Anda (misalnya GitHub Pages)
    // Untuk pengembangan dan pengujian, kita akan menggunakan '*'
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle permintaan OPTIONS (Preflight check CORS)
    if (req.method === 'OPTIONS') {
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
    let screenshotBuffer = null;

    try {
        // 2. Konfigurasi dan Luncurkan Browser Headless
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            defaultViewport: {
                width: 1280,
                height: 800
            }
        });

        const page = await browser.newPage();
        
        // 3. Navigasi ke URL Tujuan
        await page.goto(targetUrl, {
            // Tunggu hingga jaringan menjadi diam (lebih handal daripada 'load')
            waitUntil: 'networkidle0', 
            timeout: 15000 // Timeout setelah 15 detik
        });

        // 4. Ambil Screenshot
        screenshotBuffer = await page.screenshot({
            type: 'jpeg', // Menggunakan JPEG untuk ukuran file yang lebih kecil
            quality: 80,
            fullPage: true // Ambil screenshot dari seluruh halaman
        });

        // 5. Kirim Respons
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/jpeg');
        // Cache selama 1 jam
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
        res.end(screenshotBuffer);

    } catch (error) {
        console.error('Error saat memproses screenshot:', error);
        res.status(500).json({ 
            status: 500,
            message: 'Gagal mengambil screenshot: ' + error.message 
        });
    } finally {
        // 6. Tutup Browser
        if (browser !== null) {
            await browser.close();
        }
    }
};
          
