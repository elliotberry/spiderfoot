import pytest
import unittest

from modules.sfp_tool_waymore import sfp_tool_waymore
from sflib import SpiderFoot


@pytest.mark.usefixtures
class TestModuleToolWaymore(unittest.TestCase):

    def test_opts(self):
        module = sfp_tool_waymore()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_tool_waymore()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_tool_waymore()
        self.assertIsInstance(module.watchedEvents(), list)
        self.assertEqual(module.watchedEvents(), ["DOMAIN_NAME"])

    def test_producedEvents_should_return_list(self):
        module = sfp_tool_waymore()
        self.assertIsInstance(module.producedEvents(), list)
        self.assertIn("LINKED_URL_INTERNAL", module.producedEvents())

    def test_classify_url(self):
        module = sfp_tool_waymore()
        self.assertEqual(
            module._classify_url("https://example.com/app.js", "example.com"),
            "URL_JAVASCRIPT",
        )
        self.assertEqual(
            module._classify_url("https://example.com/login?x=1", "example.com"),
            "URL_FORM",
        )
        self.assertEqual(
            module._classify_url("https://example.com/about", "example.com"),
            "LINKED_URL_INTERNAL",
        )
        self.assertEqual(
            module._classify_url("https://other.test/page", "example.com"),
            "LINKED_URL_EXTERNAL",
        )

    def test_blocked_extension(self):
        module = sfp_tool_waymore()
        module.setup(SpiderFoot(self.default_options), {
            "blacklist_extensions": "png,css",
        })
        self.assertTrue(module._blocked_extension("https://x.test/a.PNG"))
        self.assertTrue(module._blocked_extension("https://x.test/a.css?v=1"))
        self.assertFalse(module._blocked_extension("https://x.test/a.html"))
