import pytest
import unittest

from modules.sfp_tool_dnsx import sfp_tool_dnsx
from sflib import SpiderFoot


@pytest.mark.usefixtures
class TestModuleToolDnsx(unittest.TestCase):

    def test_opts(self):
        module = sfp_tool_dnsx()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_tool_dnsx()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_tool_dnsx()
        self.assertIsInstance(module.watchedEvents(), list)
        self.assertIn("DOMAIN_NAME", module.watchedEvents())

    def test_producedEvents_should_return_list(self):
        module = sfp_tool_dnsx()
        self.assertIsInstance(module.producedEvents(), list)
        self.assertIn("IP_ADDRESS", module.producedEvents())

    def test_build_cmd_includes_selected_records(self):
        module = sfp_tool_dnsx()
        module.setup(SpiderFoot(self.default_options), {
            "query_a": True,
            "query_aaaa": False,
            "query_cname": True,
            "query_mx": False,
            "query_ns": True,
            "query_txt": False,
            "wildcard_detect": True,
            "threads": 10,
            "rate_limit": 50,
        })
        cmd = module._build_cmd("dnsx", "/tmp/in.txt", "/tmp/out.json")
        self.assertIn("-a", cmd)
        self.assertNotIn("-aaaa", cmd)
        self.assertIn("-cname", cmd)
        self.assertNotIn("-mx", cmd)
        self.assertIn("-ns", cmd)
        self.assertNotIn("-txt", cmd)
        self.assertIn("-auto-wildcard", cmd)
        self.assertIn("-json", cmd)
