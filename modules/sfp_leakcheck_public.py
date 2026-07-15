from __future__ import annotations

"""SpiderFoot plug-in module: leakcheck_public."""

# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:        sfp_leakcheck_public
# Purpose:     Gather breach data from LeakCheck Public API.
#
# Author:      <the@leakcheck.net>
#
# Created:     05-10-2024
# Copyright:   (c) LeakCheck Security Services LTD
# Licence:     MIT
# -------------------------------------------------------------------------------

import json
import time

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_leakcheck_public(SpiderFootPlugin):
    """Gather breach data from LeakCheck Public API."""

    meta = {
        "name": "LeakCheck.io Public",
        "summary": "Gather breach data from LeakCheck Public API.",
        "flags": [],
        "useCases": ["Footprint", "Investigate", "Passive"],
        "categories": ["Leaks, Dumps and Breaches"],
        "dataSource": {
            "website": "https://leakcheck.io/",
            "model": "FREE_NOAUTH_LIMITED",
            "references": [
                "https://wiki.leakcheck.io/en/api"
            ],
            "favIcon": "https://leakcheck.io/favicon.ico",
            "logo": "https://leakcheck.io/logo.png",
            "description": "LeakCheck offers a search engine with a database of more than 9 billion leaked records. Users can search for leaked information using email addresses, usernames, phone numbers, keywords, and domain names. Our goal is to safeguard the data of people and companies.",
        },
    }

    # Default options
    opts = {
        "pause": 1,
    }

    # Option descriptions
    optdescs = {
        "pause": "Number of seconds to wait between each API call.",
    }

    results = None
    errorState = False

    def setup(self, sfc, userOpts=dict()):
        self.sf = sfc
        self.results = self.tempStorage()
        self.errorState = False

        for opt in list(userOpts.keys()):
            self.opts[opt] = userOpts[opt]

    def watchedEvents(self) -> list:
        """Return the list of events this module watches."""
        return ["EMAILADDR"]

    def producedEvents(self) -> list:
        """Return the list of events this module produces."""
        return [
            "ACCOUNT_EXTERNAL_OWNED_COMPROMISED",
            "RAW_RIR_DATA",
        ]

    def query(self, event: SpiderFootEvent) -> dict | None:
        """Query the LeakCheck Public API."""
        queryString = f"https://leakcheck.io/api/public?check={event.data}"

        headers = {
            "Accept": "application/json",
        }

        res = self.fetch_url(
            queryString,
            headers=headers,
            timeout=15,
            useragent=self.opts["_useragent"],
            verify=True,
        )

        time.sleep(self.opts["pause"])

        if res["code"] == "429":
            self.error("Too many requests performed in a short time. Please wait before trying again.")
            time.sleep(5)
            res = self.fetch_url(
                queryString,
                headers=headers,
                timeout=15,
                useragent=self.opts["_useragent"],
                verify=True,
            )

        if res["code"] != "200":
            self.error("Unable to fetch data from LeakCheck Public API.")
            self.errorState = True
            return None

        if res["content"] is None:
            self.debug("No response from LeakCheck Public API")
            return None

        try:
            return json.loads(res["content"])
        except Exception as e:
            self.debug(f"Error processing JSON response: {e}")
            return None

    def handleEvent(self, event: SpiderFootEvent) -> None:
        """Handle events sent to this module."""
        eventName = event.eventType
        srcModuleName = event.module
        eventData = event.data

        if srcModuleName == self.__name__:
            return

        if eventData in self.results:
            return

        if self.errorState:
            return

        self.results[eventData] = True

        self.debug(f"Received event, {eventName}, from {srcModuleName}")

        data = self.query(event)

        if not data:
            return

        if not data.get("found"):
            self.debug("No breach data found.")
            return

        sources = data.get("sources", [])
        fields = data.get("fields", [])

        for source in sources:
            leakSource = source.get("name", "N/A")
            breachDate = source.get("date") if source.get("date") else "Unknown Date"

            evt = SpiderFootEvent(
                "ACCOUNT_EXTERNAL_OWNED_COMPROMISED",
                f"{eventData} [{leakSource} - {breachDate}]",
                self.__name__,
                event,
            )
            self.notifyListeners(evt)

        if fields:
            evt = SpiderFootEvent("RAW_RIR_DATA", ", ".join(fields), self.__name__, event)
            self.notifyListeners(evt)

# End of sfp_leakcheck_public class
