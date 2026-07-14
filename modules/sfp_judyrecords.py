# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:         sfp_judyrecords
# Purpose:      Search judyrecords.com for US court case records by person or
#               company name using their public AJAX search flow.
#
# Author:      Auto
#
# Created:     2026-07-14
# Copyright:   (c) Steve Micallef
# Licence:     MIT
# -------------------------------------------------------------------------------

import json
import re
import time
import urllib.parse

from bs4 import BeautifulSoup

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_judyrecords(SpiderFootPlugin):

    meta = {
        "name": "JudyRecords",
        "summary": "Search judyrecords.com for United States court case records by person or company name.",
        "flags": ["slow", "errorprone"],
        "useCases": ["Investigate", "Passive"],
        "categories": ["Real World"],
        "dataSource": {
            "website": "https://www.judyrecords.com/",
            "model": "FREE_NOAUTH_LIMITED",
            "references": [
                "https://www.judyrecords.com/",
                "https://www.judyrecords.com/info",
                "https://www.judyrecords.com/terms",
                "https://www.judyrecords.com/api",
            ],
            "favIcon": "https://www.judyrecords.com/favicon-32x32.png",
            "logo": "https://www.judyrecords.com/apple-touch-icon.png",
            "description": "judyrecords is a nationwide search engine for hundreds of millions "
            "of United States court cases. This module uses the public website search "
            "workflow. Programmatic access via the official API is preferred for production use; "
            "the website may rate-limit, captcha, or change without notice.",
        },
    }

    opts = {
        "maxpages": 1,
        "maxresults": 20,
        "namematch": "strict",
        "pause": 1,
    }

    optdescs = {
        "maxpages": "Maximum number of result pages to fetch (free web UI is typically limited to page 1).",
        "maxresults": "Maximum number of case results to emit per query.",
        "namematch": "Name matching mode for HUMAN_NAME: strict (,,,), lenient (,,), or raw (as-is).",
        "pause": "Seconds to wait between poll attempts and page fetches.",
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
        return ["HUMAN_NAME", "COMPANY_NAME"]

    def producedEvents(self):
        return [
            "SEARCH_ENGINE_WEB_CONTENT",
            "RAW_RIR_DATA",
            "LINKED_URL_EXTERNAL",
        ]

    def buildQuery(self, eventName: str, eventData: str) -> str:
        """Build a judyrecords search query from an event.

        Args:
            eventName (str): SpiderFoot event type
            eventData (str): event payload (name)

        Returns:
            str: search query string
        """
        name = (eventData or "").strip()
        if not name:
            return ""

        mode = str(self.opts.get("namematch", "strict")).lower()

        if eventName == "COMPANY_NAME":
            if mode == "raw":
                return name
            # Prefer phrase search for company names
            if not (name.startswith('"') and name.endswith('"')):
                return f'"{name}"'
            return name

        # HUMAN_NAME
        if mode == "raw":
            return name
        if mode == "lenient":
            if name.endswith(",,") or name.endswith(",,,"):
                return name
            return f"{name},,"
        # strict (default)
        if name.endswith(",,,"):
            return name
        if name.endswith(",,"):
            return f"{name},"
        return f"{name},,,"

    def isCaptcha(self, content: str) -> bool:
        """Detect judyrecords captcha interstitial pages (not homepage JS that mentions captcha)."""
        if not content:
            return False
        # Actual captcha pages use a Captcha title; homepage JS also mentions /captcha
        if re.search(r"<title\b[^>]*>\s*Captcha\b", content, flags=re.IGNORECASE):
            return True
        return False

    def _extractSessionCookie(self, headers: dict) -> dict:
        """Parse session2 cookie from Set-Cookie response headers."""
        if not headers:
            return {}

        set_cookie = headers.get("set-cookie") or headers.get("Set-Cookie") or ""
        m = re.search(r"(?:^|[,;\s])session2=([^;,\s]+)", set_cookie, flags=re.IGNORECASE)
        if not m and set_cookie.lower().startswith("session2="):
            m = re.match(r"session2=([^;,\s]+)", set_cookie, flags=re.IGNORECASE)
        if m:
            return {"session2": m.group(1)}
        return {}

    def _ajaxHeaders(self) -> dict:
        return {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.judyrecords.com/",
        }

    def seedSession(self) -> dict:
        """Fetch homepage and return session cookies."""
        res = self.sf.fetchUrl(
            "https://www.judyrecords.com/",
            timeout=self.opts.get("_fetchtimeout", 30),
            useragent=self.opts.get("_useragent", "SpiderFoot"),
        )
        if not res or res.get("code") != "200":
            self.error("JudyRecords: failed to seed session from homepage.")
            return {}

        if self.isCaptcha(res.get("content") or ""):
            self.error("JudyRecords: captcha when seeding session.")
            self.errorState = True
            return {}

        cookies = self._extractSessionCookie(res.get("headers") or {})
        if not cookies:
            self.debug("JudyRecords: no session2 cookie on homepage; continuing without explicit cookie.")
        return cookies

    def addSearchJob(self, query: str, cookies: dict):
        """Start a search job bound to the session.

        Returns:
            dict|None: JSON status payload, or None on failure
        """
        params = urllib.parse.urlencode({"search": query})
        url = f"https://www.judyrecords.com/addSearchJob?{params}"
        res = self.sf.fetchUrl(
            url,
            cookies=cookies or None,
            timeout=self.opts.get("_fetchtimeout", 30),
            useragent=self.opts.get("_useragent", "SpiderFoot"),
            headers=self._ajaxHeaders(),
        )
        if not res:
            return None

        content = res.get("content") or ""
        if self.isCaptcha(content):
            self.error("JudyRecords: captcha during addSearchJob.")
            self.errorState = True
            return None

        if res.get("code") != "200":
            self.error(f"JudyRecords: addSearchJob HTTP {res.get('code')}")
            return None

        # Refresh cookie if rotated
        new_cookies = self._extractSessionCookie(res.get("headers") or {})
        if new_cookies:
            cookies.update(new_cookies)

        try:
            data = json.loads(content)
        except Exception:
            self.error("JudyRecords: addSearchJob returned non-JSON content.")
            return None

        if data.get("status") == "failed":
            errors = data.get("errors") or ["unknown error"]
            joined = "; ".join(errors)
            self.error(f"JudyRecords: addSearchJob failed: {joined}")
            return None

        if data.get("status") != "succeeded":
            self.error(f"JudyRecords: unexpected addSearchJob status: {data}")
            return None

        return data

    def waitForJob(self, cookies: dict, searchJobId: str = None) -> bool:
        """Poll getSearchJobStatus until the session job completes."""
        max_attempts = 60
        pause = float(self.opts.get("pause", 1) or 1)
        # First polls can be faster; site JS uses 100ms
        poll_pause = min(pause, 0.5)

        params = {}
        if searchJobId:
            params["searchJobId"] = searchJobId
        qs = urllib.parse.urlencode(params)
        url = "https://www.judyrecords.com/getSearchJobStatus"
        if qs:
            url = f"{url}?{qs}"

        for _ in range(max_attempts):
            if self.checkForStop():
                return False

            res = self.sf.fetchUrl(
                url,
                cookies=cookies or None,
                timeout=self.opts.get("_fetchtimeout", 30),
                useragent=self.opts.get("_useragent", "SpiderFoot"),
                headers=self._ajaxHeaders(),
                noLog=True,
            )
            if not res or res.get("code") != "200":
                self.debug(f"JudyRecords: getSearchJobStatus HTTP {res.get('code') if res else None}")
                time.sleep(poll_pause)
                continue

            content = res.get("content") or ""
            if self.isCaptcha(content):
                self.error("JudyRecords: captcha during getSearchJobStatus.")
                self.errorState = True
                return False

            try:
                data = json.loads(content)
            except Exception:
                self.debug("JudyRecords: getSearchJobStatus non-JSON; retrying.")
                time.sleep(poll_pause)
                continue

            if data.get("status") == "failed":
                self.error("JudyRecords: getSearchJobStatus reported failure.")
                return False

            processing = data.get("processingStatus")
            if processing == "failed":
                self.error("JudyRecords: search job processing failed.")
                return False
            if processing == "succeeded":
                return True

            time.sleep(poll_pause)

        self.error("JudyRecords: timed out waiting for search job.")
        return False

    def fetchResultsPage(self, page: int, cookies: dict) -> str:
        """Fetch a search results HTML page."""
        url = f"https://www.judyrecords.com/getSearchResults/?page={int(page)}"
        res = self.sf.fetchUrl(
            url,
            cookies=cookies or None,
            timeout=self.opts.get("_fetchtimeout", 30),
            useragent=self.opts.get("_useragent", "SpiderFoot"),
            headers={"Referer": "https://www.judyrecords.com/"},
        )
        if not res or res.get("code") != "200":
            self.error(f"JudyRecords: getSearchResults page {page} HTTP {res.get('code') if res else None}")
            return ""

        content = res.get("content") or ""
        if self.isCaptcha(content):
            self.error("JudyRecords: captcha during getSearchResults.")
            self.errorState = True
            return ""

        return content

    def parseResults(self, html: str) -> list:
        """Parse case hits from a results page.

        Returns:
            list[dict]: [{title, url, snippets, text}, ...]
        """
        if not html:
            return []

        soup = BeautifulSoup(html, features="lxml")
        html_tag = soup.find("html")
        classes = html_tag.get("class", []) if html_tag else []
        if "page2AndBeyondSubscribe" in classes or (
            "noResults" in classes and "results" not in classes
        ):
            self.info("JudyRecords: no free results on this page (subscribe wall or empty).")
            return []

        results = []
        for item in soup.select("div.searchResultItem"):
            link = item.select_one("h2.title a") or item.find("a")
            if not link:
                continue
            href = (link.get("href") or "").strip()
            title = link.get_text(" ", strip=True)
            if not href:
                continue
            if href.startswith("/"):
                url = f"https://www.judyrecords.com{href}"
            else:
                url = href

            snippets = [
                sn.get_text(" ", strip=True)
                for sn in item.select("div.snippet")
                if sn.get_text(strip=True)
            ]
            text = title
            if snippets:
                text = f"{title}\n" + "\n".join(snippets)

            results.append({
                "title": title,
                "url": url,
                "snippets": snippets,
                "text": text,
            })
        return results

    def query(self, qry: str) -> list:
        """Run a judyrecords search and return parsed case results."""
        cookies = self.seedSession()
        if self.errorState:
            return []

        job = self.addSearchJob(qry, cookies)
        if not job:
            return []

        search_job_id = job.get("searchJobId")
        if not self.waitForJob(cookies, search_job_id):
            return []

        maxpages = int(self.opts.get("maxpages", 1) or 1)
        maxresults = int(self.opts.get("maxresults", 20) or 20)
        pause = float(self.opts.get("pause", 1) or 1)
        collected = []

        for page in range(1, maxpages + 1):
            if self.checkForStop() or self.errorState:
                break
            if page > 1:
                time.sleep(pause)

            html = self.fetchResultsPage(page, cookies)
            if not html:
                break

            page_results = self.parseResults(html)
            if not page_results:
                break

            collected.extend(page_results)
            if len(collected) >= maxresults:
                break

        return collected[:maxresults]

    def handleEvent(self, event):
        eventName = event.eventType
        srcModuleName = event.module
        eventData = event.data

        if self.errorState:
            return

        self.debug(f"Received event, {eventName}, from {srcModuleName}")

        if eventData in self.results:
            self.debug(f"Skipping {eventData}, already checked.")
            return
        self.results[eventData] = True

        query = self.buildQuery(eventName, eventData)
        if not query:
            return

        self.info(f"Searching JudyRecords for: {query}")
        results = self.query(query)
        if not results:
            self.info(f"No JudyRecords results for {query}")
            return

        raw = {
            "query": query,
            "source": "judyrecords.com",
            "results": [
                {"title": r["title"], "url": r["url"], "snippets": r["snippets"]}
                for r in results
            ],
        }
        evt = SpiderFootEvent("RAW_RIR_DATA", json.dumps(raw), self.__name__, event)
        self.notifyListeners(evt)

        for item in results:
            if self.checkForStop():
                return

            url_evt = SpiderFootEvent(
                "LINKED_URL_EXTERNAL", item["url"], self.__name__, event
            )
            self.notifyListeners(url_evt)

            content_evt = SpiderFootEvent(
                "SEARCH_ENGINE_WEB_CONTENT", item["text"], self.__name__, event
            )
            self.notifyListeners(content_evt)
