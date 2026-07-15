# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:         sfp_ip2locationio
# Purpose:      SpiderFoot plug-in to identify the Geo-location of IP addresses
#               identified by other modules using ip2location.io
#
# Author:      IP2Location <support@ip2location.com>
#
# Created:     25/10/2023
# Copyright:   (c) Steve Micallef
# Licence:     MIT
# -------------------------------------------------------------------------------

import json
import time

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_ip2locationio(SpiderFootPlugin):

    meta = {
        'name': "ip2location.io",
        'summary': "Queries ip2location.io to identify geolocation of IP Addresses using ip2location.io API",
        'flags': ["apikey"],
        'useCases': ["Footprint", "Investigate", "Passive"],
        'categories': ["Real World"],
        'dataSource': {
            'website': "https://www.ip2location.io/",
            'model': "FREE_AUTH_LIMITED",
            'references': [
                "https://www.ip2location.io/ip2location-documentation"
            ],
            'apiKeyInstructions': [
                "Visit https://www.ip2location.io/",
                "Register a free account",
                "Login from https://www.ip2location.io/log-in and go to your dashboard",
                "Your API Key will be listed under API Key section.",
            ],
            'favIcon': "https://www.ip2location.io/favicon.ico",
            'logo': "https://cdn.ip2location.io/assets/img/icons/apple-touch-icon.png",
            'description': "IP2Location.io provides a fast and accurate IP Geolocation API tool "
            "to determine a user's location and use the geolocation information in different use cases. "
        }
    }

    # Default options
    opts = {
        'api_key': '',
    }

    # Option descriptions
    optdescs = {
        'api_key': "ip2location.io API Key.",
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
        return [
            "IP_ADDRESS",
            "IPV6_ADDRESS"
        ]

    def producedEvents(self):
        return [
            "GEOINFO",
            "PHYSICAL_COORDINATES",
            "RAW_RIR_DATA"
        ]

    def query(self, qry):
        queryString = f"https://api.ip2location.io/?key={self.opts['api_key']}&ip={qry}"

        res = self.sf.fetchUrl(
            queryString,
            timeout=self.opts['_fetchtimeout'],
            useragent=self.opts['_useragent']
        )
        time.sleep(1.5)

        if res['code'] == "429":
            self.error("You are being rate-limited by ip2location.io.")
            self.errorState = True
            return None

        if res['code'] in ("401", "403"):
            self.error("ip2location.io API key appears to be invalid.")
            self.errorState = True
            return None

        if res['code'] != "200":
            self.info(f"No ip2location.io data found for {qry}")
            return None

        if res['content'] is None:
            self.info(f"No ip2location.io data found for {qry}")
            return None

        try:
            data = json.loads(res['content'])
        except Exception as e:
            self.debug(f"Error processing JSON response: {e}")
            return None

        if isinstance(data, dict) and data.get('error'):
            self.info(f"No ip2location.io data found for {qry}: {data.get('error')}")
            return None

        return data

    def handleEvent(self, event):
        eventName = event.eventType
        srcModuleName = event.module
        eventData = event.data

        self.debug(f"Received event, {eventName}, from {srcModuleName}")

        if self.errorState:
            return

        if self.opts['api_key'] == "":
            self.error("You enabled sfp_ip2locationio but did not set an API key!")
            self.errorState = True
            return

        if eventData in self.results:
            self.debug(f"Skipping {eventData}, already checked.")
            return

        self.results[eventData] = True

        data = self.query(eventData)
        if not data:
            return

        if data.get('country_name'):
            location = ', '.join(filter(None, [
                data.get('city_name'),
                data.get('region_name'),
                data.get('country_name'),
                data.get('country_code')
            ]))
            evt = SpiderFootEvent('GEOINFO', location, self.__name__, event)
            self.notifyListeners(evt)

            if data.get('latitude') is not None and data.get('longitude') is not None:
                evt = SpiderFootEvent(
                    "PHYSICAL_COORDINATES",
                    f"{data.get('latitude')}, {data.get('longitude')}",
                    self.__name__,
                    event
                )
                self.notifyListeners(evt)

            evt = SpiderFootEvent('RAW_RIR_DATA', str(data), self.__name__, event)
            self.notifyListeners(evt)

# End of sfp_ip2locationio class
