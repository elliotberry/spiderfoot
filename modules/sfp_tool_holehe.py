# -*- coding: utf-8 -*-
# -------------------------------------------------------------------------------
# Name:         sfp_tool_holehe
# Purpose:      SpiderFoot plug-in for using the Holehe email OSINT tool.
#               Tool: https://github.com/megadose/holehe
#
# Author:       SpiderFoot contributors
#
# Licence:      MIT
# -------------------------------------------------------------------------------

from __future__ import annotations

import csv
import glob
import json
import os
import re
import shutil
import subprocess
import tempfile

from spiderfoot import SpiderFootEvent, SpiderFootPlugin


class sfp_tool_holehe(SpiderFootPlugin):
    """Check which sites an email address is registered on via Holehe.

    Distinct from breach lookups (HIBP/Dehashed) and username enumeration
    (Maigret). Uses registration / password-reset signals.
    """

    meta = {
        "name": "Tool - Holehe",
        "summary": (
            "Check which websites an email address is registered on using Holehe."
        ),
        "flags": ["tool", "slow"],
        "useCases": ["Footprint", "Investigate"],
        "categories": ["Social Media"],
        "toolDetails": {
            "name": "Holehe",
            "description": (
                "Holehe checks if an email is used on various sites via "
                "registration and password-recovery flows."
            ),
            "website": "https://github.com/megadose/holehe",
            "repository": "https://github.com/megadose/holehe",
        },
        "dataSource": {
            "website": "https://github.com/megadose/holehe",
            "model": "FREE_NOAUTH_UNLIMITED",
            "references": [
                "https://github.com/megadose/holehe",
            ],
            "description": (
                "Holehe checks whether an email address is registered on "
                "hundreds of websites."
            ),
        },
    }

    opts = {
        "holehe_path": "",
        "timeout": 600,
        "site_timeout": 10,
        "max_results": 200,
        "no_password_recovery": True,
    }

    optdescs = {
        "holehe_path": (
            "Path to the holehe binary. Leave blank to search PATH, then "
            "/opt/holehe-venv/bin/holehe."
        ),
        "timeout": "Overall Holehe process timeout in seconds.",
        "site_timeout": "Per-request timeout passed to Holehe --timeout.",
        "max_results": "Maximum number of found accounts to emit per email.",
        "no_password_recovery": (
            "Skip password-recovery checks (reduces chance of notifying the target)."
        ),
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
        return ["EMAILADDR", "EMAILADDR_GENERIC"]

    def producedEvents(self):
        return [
            "ACCOUNT_EXTERNAL_OWNED",
            "SOCIAL_MEDIA",
            "RAW_RIR_DATA",
        ]

    def _find_binary(self):
        custom = self.opts.get("holehe_path", "")
        if custom and os.path.isfile(custom) and os.access(custom, os.X_OK):
            return custom
        for p in os.environ.get("PATH", "").split(os.pathsep):
            candidate = os.path.join(p, "holehe")
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
        for fallback in (
            "/opt/holehe-venv/bin/holehe",
            "/usr/local/bin/holehe",
            "/usr/bin/holehe",
        ):
            if os.path.isfile(fallback) and os.access(fallback, os.X_OK):
                return fallback
        return None

    def _safe_email(self, email: str) -> str | None:
        email = (email or "").strip().lower()
        if not email or len(email) > 254:
            return None
        if not re.fullmatch(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", email):
            return None
        return email

    def _find_csv_files(self, work_dir: str, email: str) -> list[str]:
        """Locate Holehe CSV export files for the email."""
        matches = []
        # Canonical: holehe_<ts>_<email>_results.csv
        pattern = os.path.join(work_dir, f"holehe_*_{email}_results.csv")
        matches.extend(glob.glob(pattern))
        if matches:
            return matches
        try:
            for entry in os.listdir(work_dir):
                if entry.startswith("holehe_") and entry.endswith("_results.csv"):
                    matches.append(os.path.join(work_dir, entry))
        except OSError:
            pass
        return matches

    def _parse_csv(self, path: str) -> list[dict]:
        rows = []
        with open(path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if isinstance(row, dict):
                    rows.append(row)
        return rows

    def _truthy(self, value) -> bool:
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in ("1", "true", "yes", "y")

    def handleEvent(self, event):
        if self.errorState:
            return

        email = self._safe_email(event.data)
        if not email:
            self.debug(f"Skipping invalid email for Holehe: {event.data!r}")
            return

        if email in self.results:
            return
        self.results[email] = True

        binary = self._find_binary()
        if not binary:
            self.error(
                "holehe not found. Install into a separate venv "
                "(e.g. /opt/holehe-venv) — do not pip-install into SpiderFoot's venv."
            )
            self.errorState = True
            return

        work_dir = tempfile.mkdtemp(prefix="holehe_")
        try:
            cmd = [
                binary,
                email,
                "--csv",
                "--only-used",
                "--no-color",
                "--no-clear",
                "--timeout",
                str(int(self.opts["site_timeout"])),
            ]
            if self.opts.get("no_password_recovery", True):
                cmd.append("--no-password-recovery")

            self.debug(f"Running: {' '.join(cmd)}")
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=int(self.opts["timeout"]),
                cwd=work_dir,
            )
            if proc.returncode not in (0, None) and proc.stderr:
                self.debug(f"holehe stderr: {proc.stderr[:1000]}")

            csv_files = self._find_csv_files(work_dir, email)
            if not csv_files:
                # Fallback: parse stdout lines like "[+] site.com"
                findings = []
                for line in (proc.stdout or "").splitlines():
                    line = line.strip()
                    m = re.match(r"^\[\+\]\s+(\S+)", line)
                    if m:
                        findings.append({"name": m.group(1), "domain": m.group(1), "exists": True})
                if not findings:
                    self.info(f"holehe found no registrations for {email}")
                    return
            else:
                findings = []
                for path in csv_files:
                    try:
                        findings.extend(self._parse_csv(path))
                    except (OSError, csv.Error) as e:
                        self.debug(f"Failed to parse {path}: {e}")

            emitted = 0
            max_results = int(self.opts["max_results"])
            seen_sites = set()

            for entry in findings:
                if self.checkForStop():
                    return
                if emitted >= max_results:
                    break

                exists = entry.get("exists", True)
                if not self._truthy(exists):
                    continue

                sitename = (
                    entry.get("name")
                    or entry.get("domain")
                    or entry.get("site")
                    or ""
                )
                sitename = str(sitename).strip()
                if not sitename:
                    continue

                site_key = sitename.lower()
                if site_key in seen_sites:
                    continue
                seen_sites.add(site_key)

                domain = str(entry.get("domain") or sitename).strip()
                url = ""
                if domain and "." in domain:
                    url = f"https://{domain}"

                evt = SpiderFootEvent(
                    "ACCOUNT_EXTERNAL_OWNED",
                    sitename,
                    self.__name__,
                    event,
                )
                self.notifyListeners(evt)

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

                raw = {
                    "name": sitename,
                    "domain": domain,
                    "email": email,
                    "exists": True,
                }
                for key in ("emailrecovery", "phoneNumber", "method", "others"):
                    val = entry.get(key)
                    if val not in (None, "", "None", "null"):
                        raw[key] = val
                evt = SpiderFootEvent(
                    "RAW_RIR_DATA",
                    json.dumps(raw, ensure_ascii=False),
                    self.__name__,
                    event,
                )
                self.notifyListeners(evt)

                emitted += 1

            self.info(f"holehe found {emitted} registrations for {email}")

        except subprocess.TimeoutExpired:
            self.error(f"holehe timed out for {email}")
        except Exception as e:
            self.error(f"holehe error: {e}")
        finally:
            try:
                shutil.rmtree(work_dir, ignore_errors=True)
            except Exception:
                pass
