// Visual uptime check. Plain-code checks first (status, console errors, failed
// requests, challenge page, hero image); Jev is only a backstop for visual breakage.
// Sites: scripts/uptime/sites.json, or UPTIME_SITES (JSON) to override.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { judge, decide } from "./jev.mjs";

const sites = JSON.parse(process.env.UPTIME_SITES || readFileSync(new URL("./sites.json", import.meta.url), "utf8"));
const VIEWPORTS = [{ width: 1280, height: 900 }, { width: 390, height: 844 }];
mkdirSync("uptime-shots", { recursive: true });

const browser = await chromium.launch();
const report = [];
for (const s of sites) {
  for (const vp of VIEWPORTS) {
    const problems = [];
    const page = await browser.newPage({ viewport: vp });
    page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text().slice(0, 200)}`));
    page.on("requestfailed", (r) => problems.push(`request failed: ${r.url().slice(0, 150)}`));
    try {
      const resp = await page.goto(s.url, { waitUntil: "networkidle", timeout: 45_000 });
      if (!resp || resp.status() >= 400) problems.push(`HTTP ${resp?.status()}`);
      const title = await page.title();
      if (/just a moment|attention required|access denied/i.test(title)) problems.push(`challenge page: "${title}"`);
      const brokenImgs = await page.$$eval("img", (els) => els.filter((i) => i.complete && i.naturalWidth === 0).length);
      if (brokenImgs) problems.push(`${brokenImgs} broken image(s)`);
      await page.addStyleTag({ content: "iframe{visibility:hidden!important}" });
      const shot = await page.screenshot({ path: `uptime-shots/${s.name}-${vp.width}.png` });
      problems.push(...decide(await judge({ site: s.name, expected: s.expected, pngBase64: shot.toString("base64") })));
    } catch (e) {
      problems.push(`load error: ${e.message.split("\n")[0]}`);
    }
    await page.close();
    if (problems.length) report.push({ site: s.name, url: s.url, viewport: `${vp.width}x${vp.height}`, problems });
  }
}
await browser.close();
writeFileSync("uptime-report.json", JSON.stringify(report, null, 2));
console.log(report.length ? JSON.stringify(report, null, 2) : "All sites OK");
