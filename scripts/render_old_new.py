import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    html_path = os.path.join(os.path.dirname(__file__), 'old_vs_new.html')
    png_path = os.path.join(os.path.dirname(__file__), 'old_vs_new.png')
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 900, "height": 600})
        await page.goto(f'file://{html_path}')
        await page.wait_for_load_state('networkidle')
        await page.screenshot(path=png_path, full_page=True)
        await browser.close()
        print(f'Done: {png_path}')

asyncio.run(main())
