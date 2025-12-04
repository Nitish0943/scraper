import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { saveToFirestore, saveJobsToFirestore } from './utils/firebase.js';

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
    ,
    {
        name: 'National Career Service (Jobs)',
        url: 'https://www.ncs.gov.in/job-seeker/Pages/Search.aspx?OT=lp9dNs3%2FpQ%2FJ1WtoCNHP9Q%3D%3D',
        parser: parseNCSJobs
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

export async function runScraper() {
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

    console.log(`\nTotal items collected: ${allData.length}`);
    if (allData.length > 0) {
        const jobs = allData.filter(i => i.type === 'job');
        const scholarships = allData.filter(i => i.type !== 'job');

        console.log(`Uploading scholarships: ${scholarships.length}`);
        if (scholarships.length > 0) {
            await saveToFirestore(scholarships);
        }

        console.log(`Uploading jobs: ${jobs.length}`);
        if (jobs.length > 0) {
            await saveJobsToFirestore(jobs);
        }
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

// NCS Portal – Best-effort parser for job listings/cards
function parseNCSJobs($, sourceUrl) {
    const jobs = [];

    // Strategy 1: Look for common job card patterns
    const cardSelectors = [
        '.job-card',
        '.card.job',
        '.jobListing',
        'li.job',
        '.jobs-list .card',
        '.jobs-list li'
    ];

    for (const sel of cardSelectors) {
        $(sel).each((i, el) => {
            const title = cleanText($(el).find('h3, h4, .title').first().text()) || cleanText($(el).text());
            const company = cleanText($(el).find('.company, .employer').first().text());
            const location = cleanText($(el).find('.location, .place').first().text());
            const link = $(el).find('a').first().attr('href');

            if (title && title.length > 3) {
                const name = company ? `${title} at ${company}` : title;
                const sourceLink = link ? (link.startsWith('http') ? link : new URL(link, sourceUrl).toString()) : sourceUrl;

                // Dedupe by title/company
                if (!jobs.find(j => j.name === name)) {
                    jobs.push({
                        scheme_id: createSlug(name),
                        name,
                        ministry: 'National Career Service',
                        amount: 'N/A',
                        deadline: 'Rolling',
                        description: location ? `Location: ${location}` : 'Job opportunity listed on NCS portal',
                        source_url: sourceLink,
                        type: 'job'
                    });
                }
            }
        });
        if (jobs.length > 0) break; // if found via one selector, stop
    }

    // Strategy 2: Fallback – scan links that look like job postings
    if (jobs.length === 0) {
        $('a').each((i, el) => {
            const text = cleanText($(el).text());
            const href = $(el).attr('href');
            if (!href) return;
            const isJoby = /job|opening|vacanc/i.test(text) || /job|vacancy|opening/i.test(href);
            if (isJoby && text.length > 3) {
                const sourceLink = href.startsWith('http') ? href : new URL(href, sourceUrl).toString();
                if (!jobs.find(j => j.name === text)) {
                    jobs.push({
                        scheme_id: createSlug(text),
                        name: text,
                        ministry: 'National Career Service',
                        amount: 'N/A',
                        deadline: 'Rolling',
                        description: 'Job opportunity listed on NCS portal',
                        source_url: sourceLink,
                        type: 'job'
                    });
                }
            }
        });
    }

    return jobs;
}

// Run only when executed directly: `node scrape.js`
try {
    const invokedAs = new URL(process.argv[1], 'file://').href;
    if (import.meta.url === invokedAs) {
        runScraper().catch(err => {
            console.error('Scraper failed:', err);
            process.exitCode = 1;
        });
    }
} catch (_) {
    // process.argv[1] may be undefined in some contexts; ignore
}
