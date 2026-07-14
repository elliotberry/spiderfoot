import pytest
import unittest

from modules.sfp_tool_holehe import sfp_tool_holehe
from sflib import SpiderFoot


@pytest.mark.usefixtures
class TestModuleToolHolehe(unittest.TestCase):

    def test_opts(self):
        module = sfp_tool_holehe()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_tool_holehe()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_tool_holehe()
        self.assertIsInstance(module.watchedEvents(), list)
        self.assertIn("EMAILADDR", module.watchedEvents())

    def test_producedEvents_should_return_list(self):
        module = sfp_tool_holehe()
        self.assertIsInstance(module.producedEvents(), list)
        self.assertIn("ACCOUNT_EXTERNAL_OWNED", module.producedEvents())

    def test_safe_email_rejects_invalid(self):
        module = sfp_tool_holehe()
        self.assertIsNone(module._safe_email(""))
        self.assertIsNone(module._safe_email("not-an-email"))
        self.assertEqual(module._safe_email("User@Example.COM"), "user@example.com")
