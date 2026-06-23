# Render the authentic Instagram "verified" scalloped seal to a sharp,
# transparent, high-res PNG used by the email templates (cid:verified).
# Uses Playwright + the system Chrome (channel="chrome") so no extra download.
import os
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(__file__), "..", "email-assets", "email-verified.png")
SIZE = 240  # rendered px; shown ~20px in email => crisp on retina

SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="{s}" height="{s}">
  <path fill="#3897f0" fill-rule="evenodd" d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Z"/>
  <polygon fill="#fff" fill-rule="evenodd" points="28.157 12.358 24.072 16.443 17.072 23.443 12.831 19.202 9.992 22.041 17.072 29.121 30.996 15.197"/>
</svg>'''.format(s=SIZE)

HTML = '<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{background:transparent}</style></head><body>' + SVG + '</body></html>'

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": SIZE, "height": SIZE}, device_scale_factor=2)
    page.set_content(HTML)
    el = page.query_selector("svg")
    el.screenshot(path=OUT, omit_background=True)
    browser.close()

print("wrote", os.path.abspath(OUT), os.path.getsize(OUT), "bytes")
