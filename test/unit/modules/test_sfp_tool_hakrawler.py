import pytest
import unittest

from modules.sfp_tool_hakrawler import sfp_tool_hakrawler
from sflib import SpiderFoot
from spiderfoot import SpiderFootEvent, SpiderFootTarget


@pytest.mark.usefixtures
class TestModuleToolHakrawler(unittest.TestCase):

    def test_opts(self):
        module = sfp_tool_hakrawler()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_tool_hakrawler()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_tool_hakrawler()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_tool_hakrawler()
        self.assertIsInstance(module.producedEvents(), list)

    def test_handleEvent_no_binary_should_set_errorState(self):
        sf = SpiderFoot(self.default_options)

        module = sfp_tool_hakrawler()
        module.setup(sf, dict())
        # Simulate the tool binary not being installed, regardless of the host
        module._find_binary = lambda: None

        target = SpiderFootTarget('example.com', 'INTERNET_NAME')
        module.setTarget(target)

        evt = SpiderFootEvent('DOMAIN_NAME', 'example.com', 'example module', SpiderFootEvent('ROOT', 'example data', '', ''))

        result = module.handleEvent(evt)

        self.assertIsNone(result)
        self.assertTrue(module.errorState)
