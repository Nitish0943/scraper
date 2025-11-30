import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { saveToFirestore } from './utils/firebase.js';

// Configuration for target sites
const TARGETS = [
    {
        name: 'National Scholarship Portal',
        url: 'https://scholarships.gov.in/All-Scholarships',
        parser: parseNSP
    },
    {
        name: 'JK Social Welfare',
        url: 'https://jkdswd.nic.in/scholarships.html',
        parser: parseJKDSWD
    },
    {
        name: 'JK Tribal Affairs',
        url: 'https://tribalaffairs.jk.gov.in/scholarship',
        parser: parseJKTribal
    },
    {
        name: 'JK Higher Education',
        url: 'https://highereducation.jk.gov.in/scholarships',
        parser: parseJKHigherEd
    }
];

async function safeGoto(page, url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            return;
        } catch (e) {
            console.warn(`Attempt ${i + 1} failed for ${url}: ${e.message}`);
            if (i === retries - 1) throw e;
            await page.waitForTimeout(3000);
        }
    }
}

async function runScraper() {
    console.log("Starting Scholarship Scraper...");

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    const page = await context.newPage();
    let allData = [];

    for (const target of TARGETS) {
        console.log(`\n--- Scraping ${target.name} ---`);
        try {
            await safeGoto(page, target.url);

            // Wait for dynamic content. 
            await page.waitForTimeout(5000);

            const content = await page.content();
            const $ = cheerio.load(content);

            const schemes = target.parser($, target.url);

            if (schemes.length > 0) {
                console.log(`Successfully extracted ${schemes.length} schemes.`);
                allData = allData.concat(schemes);
            } else {
                console.warn(`No schemes found on ${target.name}. Check selectors or page structure.`);
            }

        } catch (error) {
            console.error(`Failed to scrape ${target.name}:`, error.message);
        }
    }

    await browser.close();

    console.log(`\nTotal schemes collected: ${allData.length}`);
    if (allData.length > 0) {
        await saveToFirestore(allData);
    } else {
        console.log("Skipping database save (No data).");
    }
}

// --- PARSERS ---

function createSlug(text) {
    if (!text) return `scheme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return slugify(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
}

function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

function parseNSP($, sourceUrl) {
    const schemes = [];

    // NSP Structure:
    // Ministry -> Accordion Item
    // Scheme -> div.row.mb-4.border-1.border-bottom inside accordion-body

    $('.accordion-item').each((i, item) => {
        const ministryName = cleanText($(item).find('.accordion-button').text());

        $(item).find('.accordion-body .row.mb-4.border-1.border-bottom').each((j, schemeRow) => {
            const titleEl = $(schemeRow).find('h6');
            const title = cleanText(titleEl.text());

            if (title) {
                // Extract dates from spans
                let deadline = 'Check Portal';
                let openDate = '';

                $(schemeRow).find('span').each((k, span) => {
                    const spanText = $(span).text();
                    if (spanText.includes('Closed on') || spanText.includes('Open till')) {
                        deadline = cleanText(spanText);
                    }
                    if (spanText.includes('Open from')) {
                        openDate = cleanText(spanText);
                    }
                });

                // Dedupe
                if (!schemes.find(s => s.name === title)) {
                    schemes.push({
                        scheme_id: createSlug(title),
                        name: title,
                        ministry: ministryName || 'Central/State Scheme (NSP)',
                        amount: 'See Guidelines',
                        deadline: deadline,
                        openDate: openDate, // Added extra field for clarity
                        description: 'Please visit the portal for detailed eligibility.',
                        source_url: sourceUrl
                    });
                }
            }
        });
    });

    return schemes;
}

function parseJKDSWD($, sourceUrl) {
    const schemes = [];
    $('table tr').each((i, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 2) {
            const name = cleanText($(cols[1]).text());
            if (name && !name.toLowerCase().includes('name of scheme')) {
                schemes.push({
                    scheme_id: createSlug(name),
                    name: name,
                    ministry: 'J&K Social Welfare Department',
                    amount: 'Varies',
                    deadline: 'Check Portal',
                    description: cleanText($(cols[2]).text()) || 'Social Welfare Scheme',
                    source_url: sourceUrl
                });
            }
        }
    });
    return schemes;
}

function parseJKTribal($, sourceUrl) {
    const schemes = [];
    $('h3, h4').each((i, el) => {
        const title = cleanText($(el).text());
        if (title.toLowerCase().includes('scholarship')) {
            const nextP = $(el).next('p').text();
            schemes.push({
                scheme_id: createSlug(title),
                name: title,
                ministry: 'J&K Tribal Affairs',
                description: cleanText(nextP) || 'Tribal Scholarship Scheme',
                source_url: sourceUrl
            });
        }
    });
    return schemes;
}

function parseJKHigherEd($, sourceUrl) {
    const schemes = [];
    $('a').each((i, el) => {
        const text = cleanText($(el).text());
        if (text.toLowerCase().includes('scholarship')) {
            schemes.push({
                scheme_id: createSlug(text),
                name: text,
                ministry: 'J&K Higher Education',
                description: 'Higher Education Scholarship',
                source_url: sourceUrl
            });
        }
    });
    return schemes;
}

runScraper();
