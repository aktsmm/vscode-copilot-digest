"""Headed, isolated Edge acceptance check; requires global Python Playwright/pywin32."""
import argparse
import base64
import json
import pathlib
import subprocess
import threading
import time
import urllib.request
from urllib.parse import urljoin

import win32gui
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--base", required=True)
parser.add_argument("--artifacts", required=True)
parser.add_argument("--port", type=int, default=9337)
args = parser.parse_args()
artifacts = pathlib.Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
endpoint = f"http://127.0.0.1:{args.port}"
foreground = win32gui.GetForegroundWindow()
changes = []
stop = threading.Event()


def monitor():
    while not stop.wait(0.02):
        current = win32gui.GetForegroundWindow()
        if current != foreground and (not changes or changes[-1] != current):
            changes.append(current)


watcher = threading.Thread(target=monitor, daemon=True)
watcher.start()
startup = subprocess.STARTUPINFO()
startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
startup.wShowWindow = 4  # SW_SHOWNOACTIVATE
process = subprocess.Popen([
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    f"--remote-debugging-port={args.port}",
    f"--user-data-dir={artifacts / 'edge-profile'}",
    "--no-first-run", "--no-default-browser-check", "about:blank",
], startupinfo=startup)

report = {"base": args.base, "checks": []}
try:
    deadline = time.monotonic() + 30
    while True:
        try:
            with urllib.request.urlopen(endpoint + "/json/version", timeout=2) as response:
                identity = json.load(response)
            break
        except (OSError, TimeoutError):
            if time.monotonic() > deadline:
                raise
            time.sleep(0.2)
    assert "Edg/" in identity["Browser"], identity
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(endpoint)
        context = browser.contexts[0]
        control = browser.new_browser_cdp_session()
        target = control.send("Target.createTarget", {"url": "about:blank", "background": True})
        deadline = time.monotonic() + 10
        page = None
        while page is None and time.monotonic() < deadline:
            for candidate in context.pages:
                session = context.new_cdp_session(candidate)
                info = session.send("Target.getTargetInfo")
                session.detach()
                if info["targetInfo"]["targetId"] == target["targetId"]:
                    page = candidate
                    break
            time.sleep(0.1)
        assert page is not None, "Owned work target was not found"
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)) if page.url.startswith(args.base) else None)
        for route, query in [
            ("index.html", "skills"),
            ("search.html", "1.109"),
            ("search.html", "1.128"),
            ("en/search.html", "MCP"),
        ]:
            page.goto(args.base.rstrip("/") + "/" + route, wait_until="networkidle")
            page.locator("[data-search-input]").fill(query)
            page.wait_for_function(
                "() => document.querySelectorAll('.search-result-card').length > 0",
                timeout=30000,
            )
            rows = page.locator(".search-result-card").evaluate_all(
                """nodes => nodes.slice(0,6).map(node => ({
                  title: node.querySelector('h3').textContent,
                  original: node.querySelector('.resource-links a[target="_blank"]')?.href,
                  archive: node.querySelector('[data-archive-path]')?.href,
                  documents: [...node.querySelectorAll('.resource-links li a')].map(a=>({title:a.textContent,url:a.href}))
                }))"""
            )
            assert any(row["original"] and row["archive"] for row in rows), (route, query, rows)
            assert all(len(row["documents"]) <= 3 for row in rows)
            representative = next(row for row in rows if row["original"] and row["archive"])
            report["checks"].append({"route": route, "query": query, "results": rows})
            page.goto(representative["archive"], wait_until="networkidle")
            assert page.evaluate("() => !!document.getElementById(decodeURIComponent(location.hash.slice(1)))")
            assert page.locator(".resource-links").count() > 0
            screenshot = artifacts / f"{route.replace('/', '-')}-{query}-archive.png"
            capture = context.new_cdp_session(page)
            capture.send("Emulation.setDeviceMetricsOverride", {
                "width": 1280, "height": 900, "deviceScaleFactor": 1, "mobile": False,
            })
            image = capture.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
            screenshot.write_bytes(base64.b64decode(image["data"]))
            capture.detach()
            report["checks"][-1]["screenshot"] = str(screenshot)
            if route.startswith("en/"):
                assert page.locator("html").get_attribute("lang") == "en"
            # Reset only our isolated preference to keep subsequent checks in their intended language.
            page.evaluate("() => localStorage.removeItem('vcd-lang')")
        for date, version in [("2026-04-06", "v1_109"), ("2026-07-06", "v1_128")]:
            page.goto(args.base.rstrip("/") + f"/days/{date}.html", wait_until="networkidle")
            card = page.locator("article").filter(
                has=page.locator(f'h3 a[href*="/updates/{version}"]')
            ).first
            card.wait_for()
            original = card.locator('.resource-links a[target="_blank"]').first.get_attribute("href")
            archive = urljoin(page.url, card.locator("[data-archive-path]").get_attribute("href"))
            documentation = card.locator(".resource-links li a").first
            doc_url = documentation.get_attribute("href")
            doc_title = documentation.text_content()
            card_title = card.locator("h3").inner_text().strip()
            assert version in original
            assert archive.split("#")[0].endswith(f"/days/{date}.html")
            assert doc_url and doc_title.strip(), "Related documentation must have a document title"
            page.goto(archive, wait_until="networkidle")
            assert page.evaluate("() => !!document.getElementById(decodeURIComponent(location.hash.slice(1)))")
            assert page.evaluate("() => document.getElementById(decodeURIComponent(location.hash.slice(1))).innerText.trim()") == card_title
            page.goto(original, wait_until="domcontentloaded")
            assert page.url.startswith("https://code.visualstudio.com/updates/" + version)
            assert page.locator("main").last.inner_text().strip()
            page.goto(doc_url, wait_until="domcontentloaded")
            assert page.locator("main").last.inner_text().strip()
            assert page.evaluate("() => !location.hash || !!document.getElementById(decodeURIComponent(location.hash.slice(1)))")
            report["checks"].append({
                "date": date, "version": version, "original": original,
                "archive": archive, "document": {"url": doc_url, "title": doc_title},
            })
        assert not errors, errors
        control.send("Target.closeTarget", {"targetId": target["targetId"]})
        browser.close()
    report["pageErrors"] = errors
finally:
    stop.set()
    watcher.join(timeout=1)
    report["foregroundChanges"] = changes
    report["foregroundPreservationVerified"] = not changes
    report["browserPid"] = process.pid
    (artifacts / "browser-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    # This is the unique profile/process launched above, never a shared browser.
    if process.poll() is None:
        process.terminate()
        process.wait(timeout=15)
print(json.dumps({"verified": len(report["checks"]), "foregroundChanges": len(changes), "report": str(artifacts / "browser-report.json")}))
