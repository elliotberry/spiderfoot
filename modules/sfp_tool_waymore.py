# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:         sfp_tool_waymore
# Purpose:      SpiderFoot plug-in for using waymore historical URL harvesting.
#               Tool: https://github.com/xnl-h4ck3r/waymore
#
# Author:       SpiderFoot contributors
#
# Licence:      MIT
# -------------------------------------------------------------------------------

from __future__ import annotations

import os
import subprocess
import tempfile

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_tool_waymore(SpiderFootPlugin):
    """Harvest historical URLs via waymore.

    Broader archive coverage than sfp_tool_gau. Prefer one or enable both
    intentionally when you want maximum URL recall.
    """

    meta = {
        "name": "Tool - waymore",
        "summary": (
            "Discover historical URLs from Wayback, Common Crawl, AlienVault OTX, "
            "and URLScan using waymore. Overlaps with sfp_tool_gau."
        ),
        "flags": ["tool", "slow"],
        "useCases": ["Investigate", "Footprint", "Passive"],
        "categories": ["Search Engines"],
        "toolDetails": {
            "name": "waymore",
            "description": (
                "waymore finds URLs from multiple web archives, often returning "
                "more links than similar tools."
            ),
            "website": "https://github.com/xnl-h4ck3r/waymore",
            "repository": "https://github.com/xnl-h4ck3r/waymore",
        },
        "dataSource": {
            "website": "https://github.com/xnl-h4ck3r/waymore",
            "model": "FREE_NOAUTH_UNLIMITED",
            "references": [
                "https://github.com/xnl-h4ck3r/waymore",
            ],
            "description": (
                "waymore collects historical URLs from archive.org, Common Crawl, "
                "AlienVault OTX, and URLScan."
            ),
        },
    }

    opts = {
        "waymore_path": "",
        "mode": "U",
        "timeout": 600,
        "max_results": 5000,
        "limit_requests": 100,
        "blacklist_extensions": "png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,css",
        "exclude_commoncrawl": True,
        "output_overwrite": True,
    }

    optdescs = {
        "waymore_path": (
            "Path to the waymore binary. Leave blank to search PATH, then "
            "/opt/waymore-venv/bin/waymore."
        ),
        "mode": "waymore mode: U (URLs only), R (responses), or B (both). Prefer U.",
        "timeout": "Overall waymore process timeout in seconds.",
        "max_results": "Maximum URLs to emit per domain.",
        "limit_requests": (
            "Limit archive.org (and similar) requests per source (-lr). "
            "0 means no limit (can be extremely slow)."
        ),
        "blacklist_extensions": "File extensions to skip when emitting URL events.",
        "exclude_commoncrawl": "Exclude Common Crawl (-xcc) for more reliable runs.",
        "output_overwrite": "Overwrite URL output file (-ow) instead of appending.",
    }

    results = None
    errorState = False

    def setup(self, sfc, userOpts=dict()):
        self.sf = sfc
        self.results = self.tempStorage()
        self.errorState = False

        for opt in list(userOpts.keys()):
            self.opts[opt] = userOpts[opt]

    def watchedEvents(self):
        return ["DOMAIN_NAME"]

    def producedEvents(self):
        return [
            "LINKED_URL_INTERNAL",
            "LINKED_URL_EXTERNAL",
            "URL_FORM",
            "URL_JAVASCRIPT",
            "RAW_RIR_DATA",
        ]

    def _find_binary(self):
        custom = self.opts.get("waymore_path", "")
        if custom and os.path.isfile(custom) and os.access(custom, os.X_OK):
            return custom
        for p in os.environ.get("PATH", "").split(os.pathsep):
            for name in ("waymore", "waymore.py"):
                candidate = os.path.join(p, name)
                if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                    return candidate
        for fallback in (
            "/opt/waymore-venv/bin/waymore",
            "/usr/local/bin/waymore",
            "/usr/bin/waymore",
        ):
            if os.path.isfile(fallback) and os.access(fallback, os.X_OK):
                return fallback
        return None

    def _classify_url(self, url: str, domain: str) -> str:
        url_lower = url.lower()
        if ".js" in url_lower or "javascript" in url_lower:
            return "URL_JAVASCRIPT"
        if any(x in url_lower for x in ("?", "form", "login", "signup", "register")):
            return "URL_FORM"
        if domain.lower() in url_lower:
            return "LINKED_URL_INTERNAL"
        return "LINKED_URL_EXTERNAL"

    def _blocked_extension(self, url: str) -> bool:
        blacklist = [
            e.strip().lower().lstrip(".")
            for e in (self.opts.get("blacklist_extensions") or "").split(",")
            if e.strip()
        ]
        if not blacklist:
            return False
        path = url.split("?", 1)[0].lower()
        for ext in blacklist:
            if path.endswith("." + ext):
                return True
        return False

    def handleEvent(self, event):
        data = (event.data or "").strip().lower()
        if self.errorState:
            return
        if not data:
            return
        if data in self.results:
            return
        self.results[data] = True

        binary = self._find_binary()
        if not binary:
            self.error(
                "waymore not found. Install into a separate venv "
                "(e.g. /opt/waymore-venv)."
            )
            self.errorState = True
            return

        output_path = tempfile.mktemp(suffix=".urls.txt")
        try:
            mode = (self.opts.get("mode") or "U").strip().upper()
            if mode not in ("U", "R", "B"):
                mode = "U"

            cmd = [
                binary,
                "-i", data,
                "-mode", mode,
                "-oU", output_path,
                "-lr", str(int(self.opts["limit_requests"])),
            ]
            if self.opts.get("output_overwrite", True):
                cmd.append("-ow")
            if self.opts.get("exclude_commoncrawl", True):
                cmd.append("-xcc")

            self.debug(f"Running: {' '.join(cmd)}")
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=int(self.opts["timeout"]),
            )
            if proc.returncode not in (0, None) and proc.stderr:
                self.debug(f"waymore stderr: {proc.stderr[:1000]}")

            count = 0
            max_results = int(self.opts["max_results"])
            urls = []

            if os.path.isfile(output_path):
                with open(output_path, "r", encoding="utf-8", errors="ignore") as f:
                    urls.extend(line.strip() for line in f if line.strip())

            # Also accept URLs printed to stdout (waymore pipes links there)
            for line in (proc.stdout or "").splitlines():
                line = line.strip()
                if line.startswith("http://") or line.startswith("https://"):
                    urls.append(line)

            seen = set()
            for url in urls:
                if self.checkForStop():
                    return
                if count >= max_results:
                    break
                if not url or url in seen or url in self.results:
                    continue
                if self._blocked_extension(url):
                    continue
                seen.add(url)
                self.results[url] = True
                count += 1

                evt_type = self._classify_url(url, data)
                evt = SpiderFootEvent(evt_type, url, self.__name__, event)
                self.notifyListeners(evt)

            if count:
                evt = SpiderFootEvent(
                    "RAW_RIR_DATA",
                    f"waymore:{data}:{count}",
                    self.__name__,
                    event,
                )
                self.notifyListeners(evt)

            self.info(f"waymore found {count} URLs for {data}")

        except subprocess.TimeoutExpired:
            self.error(f"waymore timed out for {data}")
        except Exception as e:
            self.error(f"waymore error: {e}")
        finally:
            try:
                os.unlink(output_path)
            except OSError:
                pass
