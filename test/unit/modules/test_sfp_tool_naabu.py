import pytest
import unittest

from modules.sfp_tool_naabu import sfp_tool_naabu
from sflib import SpiderFoot
from spiderfoot import SpiderFootEvent, SpiderFootTarget


@pytest.mark.usefixtures
class TestModuleToolNaabu(unittest.TestCase):

    def test_opts(self):
        module = sfp_tool_naabu()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_tool_naabu()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_tool_naabu()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_tool_naabu()
        self.assertIsInstance(module.producedEvents(), list)

    def test_handleEvent_no_binary_should_set_errorState(self):
        sf = SpiderFoot(self.default_options)

        module = sfp_tool_naabu()
        module.setup(sf, dict())
        # Simulate the tool binary not being installed, regardless of the host
        module._find_binary = lambda: None

        target = SpiderFootTarget('192.0.2.1', 'IP_ADDRESS')
        module.setTarget(target)

        evt = SpiderFootEvent('IP_ADDRESS', '192.0.2.1', 'example module', SpiderFootEvent('ROOT', 'example data', '', ''))

        result = module.handleEvent(evt)

        self.assertIsNone(result)
        self.assertTrue(module.errorState)
