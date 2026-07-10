# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:         sfp_tool_maigret
# Purpose:      SpiderFoot plug-in for using the Maigret username OSINT tool.
#               Tool: https://github.com/soxoj/maigret
#
# Author:       SpiderFoot contributors
#
# Licence:      MIT
# -------------------------------------------------------------------------------

from __future__ import annotations

import glob
import json
import os
import re
import shutil
import subprocess
import tempfile

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_tool_maigret(SpiderFootPlugin):
    """Username enumeration across thousands of sites via Maigret.

    Broader coverage than sfp_accounts (WhatsMyName). Prefer one or the other
    for a given scan unless you explicitly want both.
    """

    meta = {
        "name": "Tool - Maigret",
        "summary": (
            "Enumerate a username across 3000+ sites using Maigret. "
            "Overlaps with sfp_accounts (WhatsMyName); enable for broader coverage."
        ),
        "flags": ["tool", "slow"],
        "useCases": ["Footprint", "Investigate"],
        "categories": ["Social Media"],
        "toolDetails": {
            "name": "Maigret",
            "description": (
                "Collect a dossier on a person by username from thousands of sites."
            ),
            "website": "https://github.com/soxoj/maigret",
            "repository": "https://github.com/soxoj/maigret",
        },
        "dataSource": {
            "website": "https://github.com/soxoj/maigret",
            "model": "FREE_NOAUTH_UNLIMITED",
            "references": [
                "https://github.com/soxoj/maigret",
                "https://maigret.readthedocs.io/",
            ],
            "description": (
                "Maigret collects a dossier on a person by username from "
                "thousands of sites, with optional profile parsing."
            ),
        },
    }

    opts = {
        "maigret_path": "",
        "top": 500,
        "timeout": 600,
        "site_timeout": 30,
        "tags": "",
        "max_results": 500,
    }

    optdescs = {
        "maigret_path": (
            "Path to the maigret binary. Leave blank to search PATH, then "
            "/opt/maigret-venv/bin/maigret."
        ),
        "top": "Number of top-ranked sites to scan (Maigret --top-sites).",
        "timeout": "Overall Maigret process timeout in seconds.",
        "site_timeout": "Per-site HTTP timeout passed to Maigret --timeout.",
        "tags": "Optional comma-separated Maigret site tags (e.g. photo,dating).",
        "max_results": "Maximum number of found accounts to emit per username.",
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
        return ["USERNAME"]

    def producedEvents(self):
        return [
            "ACCOUNT_EXTERNAL_OWNED",
            "SOCIAL_MEDIA",
            "RAW_RIR_DATA",
        ]

    def _find_binary(self):
        custom = self.opts.get("maigret_path", "")
        if custom and os.path.isfile(custom) and os.access(custom, os.X_OK):
            return custom
        for p in os.environ.get("PATH", "").split(os.pathsep):
            candidate = os.path.join(p, "maigret")
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
        for fallback in (
            "/opt/maigret-venv/bin/maigret",
            "/usr/local/bin/maigret",
            "/usr/bin/maigret",
        ):
            if os.path.isfile(fallback) and os.access(fallback, os.X_OK):
                return fallback
        return None

    def _bundled_db_path(self, binary: str) -> str | None:
        """Locate Maigret's bundled sites database next to the venv binary."""
        root = os.path.dirname(os.path.dirname(os.path.abspath(binary)))
        matches = glob.glob(
            os.path.join(
                root,
                "lib",
                "python*",
                "site-packages",
                "maigret",
                "resources",
                "data.json",
            )
        )
        return matches[0] if matches else None

    def _safe_username(self, username: str) -> str | None:
        """Reject usernames that are unsafe for shell/report filenames."""
        username = (username or "").strip()
        if not username or len(username) > 64:
            return None
        if not re.fullmatch(r"[A-Za-z0-9._-]+", username):
            return None
        return username

    def _parse_ndjson_file(self, path: str) -> list[dict]:
        findings = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(obj, dict):
                    findings.append(obj)
        return findings

    def _find_report_files(self, report_dir: str, username: str) -> list[str]:
        """Locate Maigret ndjson/simple JSON reports for the username."""
        matches = []
        # Canonical: report_{username}_ndjson.json
        for name in (
            f"report_{username}_ndjson.json",
            f"report_{username}_simple.json",
        ):
            path = os.path.join(report_dir, name)
            if os.path.isfile(path):
                matches.append(path)
        if matches:
            return matches
        # Fallback: any report_*ndjson*.json in the folder
        try:
            for entry in os.listdir(report_dir):
                if "ndjson" in entry and entry.endswith(".json"):
                    matches.append(os.path.join(report_dir, entry))
        except OSError:
            pass
        return matches

    def handleEvent(self, event):
        if self.errorState:
            return

        username = self._safe_username(event.data)
        if not username:
            self.debug(f"Skipping invalid username for Maigret: {event.data!r}")
            return

        if username.lower() in self.results:
            return
        self.results[username.lower()] = True

        binary = self._find_binary()
        if not binary:
            self.error(
                "maigret not found. Install into a separate venv "
                "(e.g. /opt/maigret-venv) — do not pip-install into SpiderFoot's venv."
            )
            self.errorState = True
            return

        report_dir = tempfile.mkdtemp(prefix="maigret_")
        try:
            cmd = [
                binary,
                username,
                "--json",
                "ndjson",
                "--folderoutput",
                report_dir,
                "--top-sites",
                str(int(self.opts["top"])),
                "--timeout",
                str(int(self.opts["site_timeout"])),
                "--no-progressbar",
                "--no-autoupdate",
            ]
            # Copy sites DB into the writable temp dir so Maigret's end-of-run
            # db.save_to_file() does not fail under the non-root spiderfoot user.
            bundled_db = self._bundled_db_path(binary)
            if bundled_db and os.path.isfile(bundled_db):
                local_db = os.path.join(report_dir, "data.json")
                shutil.copy2(bundled_db, local_db)
                cmd.extend(["--db", local_db])

            tags = (self.opts.get("tags") or "").strip()
            if tags:
                cmd.extend(["--tags", tags])

            self.debug(f"Running: {' '.join(cmd)}")
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=int(self.opts["timeout"]),
                cwd=report_dir,
            )
            if proc.returncode not in (0, None) and proc.stderr:
                self.debug(f"maigret stderr: {proc.stderr[:1000]}")

            report_files = self._find_report_files(report_dir, username)
            if not report_files:
                self.info(f"maigret produced no JSON report for {username}")
                return

            findings = []
            for path in report_files:
                # ndjson: one object per line; simple: single JSON object map
                if path.endswith("_simple.json"):
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        if isinstance(data, dict):
                            for sitename, entry in data.items():
                                if isinstance(entry, dict):
                                    entry = dict(entry)
                                    entry.setdefault("sitename", sitename)
                                    findings.append(entry)
                    except (OSError, json.JSONDecodeError) as e:
                        self.debug(f"Failed to parse {path}: {e}")
                else:
                    findings.extend(self._parse_ndjson_file(path))

            emitted = 0
            max_results = int(self.opts["max_results"])
            seen_sites = set()

            for entry in findings:
                if self.checkForStop():
                    return
                if emitted >= max_results:
                    break

                sitename = (
                    entry.get("sitename")
                    or entry.get("site_name")
                    or (entry.get("status") or {}).get("site_name")
                    or ""
                )
                if isinstance(sitename, dict):
                    sitename = sitename.get("name") or ""
                sitename = str(sitename).strip()
                if not sitename:
                    continue

                url = (
                    entry.get("url_user")
                    or (entry.get("status") or {}).get("site_url_user")
                    or ""
                )
                url = str(url).strip()

                site_key = sitename.lower()
                if site_key in seen_sites:
                    continue
                seen_sites.add(site_key)

                # ACCOUNT_EXTERNAL_OWNED: site label (same as sfp_accounts)
                evt = SpiderFootEvent(
                    "ACCOUNT_EXTERNAL_OWNED",
                    sitename,
                    self.__name__,
                    event,
                )
                self.notifyListeners(evt)

                # SOCIAL_MEDIA: "Site: <SFURL>url</SFURL>" style
                if url:
                    social = f"{sitename}: <SFURL>{url}</SFURL>"
                else:
                    social = sitename
                evt = SpiderFootEvent(
                    "SOCIAL_MEDIA",
                    social,
                    self.__name__,
                    event,
                )
                self.notifyListeners(evt)

                # RAW_RIR_DATA: compact found-result JSON
                raw = {
                    "sitename": sitename,
                    "url_user": url,
                    "username": username,
                }
                ids_data = entry.get("ids_data")
                if ids_data:
                    raw["ids_data"] = ids_data
                evt = SpiderFootEvent(
                    "RAW_RIR_DATA",
                    json.dumps(raw, ensure_ascii=False),
                    self.__name__,
                    event,
                )
                self.notifyListeners(evt)

                emitted += 1

            self.info(f"maigret found {emitted} accounts for {username}")

        except subprocess.TimeoutExpired:
            self.error(f"maigret timed out for {username}")
        except Exception as e:
            self.error(f"maigret error: {e}")
        finally:
            try:
                shutil.rmtree(report_dir, ignore_errors=True)
            except Exception:
                pass
