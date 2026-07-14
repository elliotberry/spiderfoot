# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:         sfp_tool_dnsx
# Purpose:      SpiderFoot plug-in for using ProjectDiscovery dnsx.
#               Tool: https://github.com/projectdiscovery/dnsx
#
# Author:       SpiderFoot contributors
#
# Licence:      MIT
# -------------------------------------------------------------------------------

from __future__ import annotations

import json
import os
import subprocess
import tempfile

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_tool_dnsx(SpiderFootPlugin):
    """Mass DNS resolution and record probing via ProjectDiscovery dnsx."""

    meta = {
        "name": "Tool - dnsx",
        "summary": (
            "Fast DNS resolution and multi-record probing using ProjectDiscovery dnsx."
        ),
        "flags": ["tool"],
        "useCases": ["Investigate", "Footprint", "Passive"],
        "categories": ["Passive DNS"],
        "toolDetails": {
            "name": "dnsx",
            "description": (
                "dnsx is a fast and multi-purpose DNS toolkit for running "
                "multiple DNS queries."
            ),
            "website": "https://github.com/projectdiscovery/dnsx",
            "repository": "https://github.com/projectdiscovery/dnsx",
        },
        "dataSource": {
            "website": "https://github.com/projectdiscovery/dnsx",
            "model": "FREE_NOAUTH_UNLIMITED",
            "references": [
                "https://github.com/projectdiscovery/dnsx",
                "https://docs.projectdiscovery.io/tools/dnsx",
            ],
            "description": (
                "ProjectDiscovery dnsx performs fast mass DNS resolution and "
                "record enumeration."
            ),
        },
    }

    opts = {
        "dnsx_path": "",
        "threads": 25,
        "timeout": 120,
        "rate_limit": 150,
        "max_hosts": 500,
        "query_a": True,
        "query_aaaa": True,
        "query_cname": True,
        "query_mx": True,
        "query_ns": True,
        "query_txt": True,
        "wildcard_detect": False,
    }

    optdescs = {
        "dnsx_path": "Path to dnsx binary. Leave blank to use PATH or /usr/local/bin/dnsx.",
        "threads": "Number of concurrent threads (-t).",
        "timeout": "Overall dnsx process timeout in seconds.",
        "rate_limit": "Maximum DNS queries per second (-rl).",
        "max_hosts": "Maximum number of unique hosts to query per event burst (informational cap).",
        "query_a": "Query A (IPv4) records.",
        "query_aaaa": "Query AAAA (IPv6) records.",
        "query_cname": "Query CNAME records.",
        "query_mx": "Query MX records.",
        "query_ns": "Query NS records.",
        "query_txt": "Query TXT records.",
        "wildcard_detect": "Enable automatic wildcard detection (-auto-wildcard).",
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
            "INTERNET_NAME",
            "DOMAIN_NAME",
            "INTERNET_NAME_UNRESOLVED",
        ]

    def producedEvents(self):
        return [
            "IP_ADDRESS",
            "IPV6_ADDRESS",
            "PROVIDER_DNS",
            "PROVIDER_MAIL",
            "DNS_TEXT",
            "RAW_DNS_RECORDS",
            "RAW_RIR_DATA",
            "INTERNET_NAME",
        ]

    def _find_binary(self):
        custom = self.opts.get("dnsx_path", "")
        if custom and os.path.isfile(custom) and os.access(custom, os.X_OK):
            return custom
        for p in os.environ.get("PATH", "").split(os.pathsep):
            for name in ("dnsx", "dnsx.exe"):
                candidate = os.path.join(p, name)
                if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                    return candidate
        for fallback in ("/usr/local/bin/dnsx", "/usr/bin/dnsx"):
            if os.path.isfile(fallback) and os.access(fallback, os.X_OK):
                return fallback
        return None

    def _build_cmd(self, binary: str, input_file: str, output_file: str) -> list[str]:
        cmd = [
            binary,
            "-l", input_file,
            "-o", output_file,
            "-json",
            "-omit-raw",
            "-silent",
            "-t", str(int(self.opts["threads"])),
            "-rl", str(int(self.opts["rate_limit"])),
        ]
        if self.opts.get("query_a", True):
            cmd.append("-a")
        if self.opts.get("query_aaaa", True):
            cmd.append("-aaaa")
        if self.opts.get("query_cname", True):
            cmd.append("-cname")
        if self.opts.get("query_mx", True):
            cmd.append("-mx")
        if self.opts.get("query_ns", True):
            cmd.append("-ns")
        if self.opts.get("query_txt", True):
            cmd.append("-txt")
        if self.opts.get("wildcard_detect", False):
            cmd.append("-auto-wildcard")
        return cmd

    def _as_list(self, value) -> list:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return [str(value).strip()]

    def _emit_host_result(self, result: dict, parent_event):
        host = str(result.get("host") or result.get("input") or "").strip().lower()
        raw_lines = []

        for ip in self._as_list(result.get("a")):
            if not self.sf.validIP(ip):
                continue
            key = f"ip4:{ip}"
            if key in self.results:
                continue
            self.results[key] = True
            evt = SpiderFootEvent("IP_ADDRESS", ip, self.__name__, parent_event)
            self.notifyListeners(evt)
            raw_lines.append(f"{host} A {ip}")

        for ip6 in self._as_list(result.get("aaaa")):
            if not self.sf.validIP6(ip6):
                continue
            key = f"ip6:{ip6}"
            if key in self.results:
                continue
            self.results[key] = True
            evt = SpiderFootEvent("IPV6_ADDRESS", ip6, self.__name__, parent_event)
            self.notifyListeners(evt)
            raw_lines.append(f"{host} AAAA {ip6}")

        for cname in self._as_list(result.get("cname")):
            cname = cname.rstrip(".").lower()
            if not cname:
                continue
            key = f"cname:{cname}"
            if key not in self.results:
                self.results[key] = True
                evt = SpiderFootEvent("INTERNET_NAME", cname, self.__name__, parent_event)
                self.notifyListeners(evt)
            raw_lines.append(f"{host} CNAME {cname}")

        for mx in self._as_list(result.get("mx")):
            mx_host = mx.split()[-1].rstrip(".").lower() if mx else ""
            if mx_host and mx_host not in self.results:
                self.results[mx_host] = True
                evt = SpiderFootEvent("PROVIDER_MAIL", mx_host, self.__name__, parent_event)
                self.notifyListeners(evt)
            raw_lines.append(f"{host} MX {mx}")

        for ns in self._as_list(result.get("ns")):
            ns_host = ns.rstrip(".").lower()
            if ns_host and f"ns:{ns_host}" not in self.results:
                self.results[f"ns:{ns_host}"] = True
                evt = SpiderFootEvent("PROVIDER_DNS", ns_host, self.__name__, parent_event)
                self.notifyListeners(evt)
            raw_lines.append(f"{host} NS {ns_host}")

        for txt in self._as_list(result.get("txt")):
            txt = txt.strip().strip('"')
            if not txt:
                continue
            key = f"txt:{txt}"
            if key not in self.results:
                self.results[key] = True
                evt = SpiderFootEvent("DNS_TEXT", txt, self.__name__, parent_event)
                self.notifyListeners(evt)
            raw_lines.append(f"{host} TXT {txt}")

        if raw_lines:
            evt = SpiderFootEvent(
                "RAW_DNS_RECORDS",
                "\n".join(raw_lines),
                self.__name__,
                parent_event,
            )
            self.notifyListeners(evt)

        evt = SpiderFootEvent(
            "RAW_RIR_DATA",
            json.dumps(result, ensure_ascii=False),
            self.__name__,
            parent_event,
        )
        self.notifyListeners(evt)

    def handleEvent(self, event):
        if self.errorState:
            return

        host = (event.data or "").strip().lower()
        if not host:
            return
        if host in self.results:
            return
        self.results[host] = True

        if len(self.results) > int(self.opts["max_hosts"]) * 20:
            # soft guard: still process this host; limit is informational
            pass

        binary = self._find_binary()
        if not binary:
            self.error("dnsx binary not found. Install from ProjectDiscovery releases.")
            self.errorState = True
            return

        input_path = None
        output_path = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as inf:
                inf.write(host + "\n")
                input_path = inf.name
            output_path = tempfile.mktemp(suffix=".jsonl")

            cmd = self._build_cmd(binary, input_path, output_path)
            self.debug(f"Running: {' '.join(cmd)}")
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=int(self.opts["timeout"]),
            )
            if proc.returncode not in (0, None) and proc.stderr:
                self.debug(f"dnsx stderr: {proc.stderr[:1000]}")

            count = 0
            if output_path and os.path.isfile(output_path):
                with open(output_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if self.checkForStop():
                            return
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            result = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if not isinstance(result, dict):
                            continue
                        self._emit_host_result(result, event)
                        count += 1

            self.info(f"dnsx processed {count} result line(s) for {host}")

        except subprocess.TimeoutExpired:
            self.error(f"dnsx timed out for {host}")
        except Exception as e:
            self.error(f"dnsx error: {e}")
        finally:
            for path in (input_path, output_path):
                if path:
                    try:
                        os.unlink(path)
                    except OSError:
                        pass
