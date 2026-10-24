import pytest
import unittest

from modules.sfp_bugbounty import sfp_bugbounty
from sflib import SpiderFoot
from spiderfoot import SpiderFootEvent, SpiderFootTarget


@pytest.mark.usefixtures
class TestModuleBugbounty(unittest.TestCase):

    def test_opts(self):
        module = sfp_bugbounty()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_bugbounty()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_bugbounty()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_bugbounty()
        self.assertIsInstance(module.producedEvents(), list)

    def test_handleEvent_no_api_key_should_set_errorState(self):
        sf = SpiderFoot(self.default_options)

        module = sfp_bugbounty()
        module.setup(sf, dict())

        target = SpiderFootTarget('example data', 'INTERNET_NAME')
        module.setTarget(target)

        evt = SpiderFootEvent('ROOT', 'example data', 'example module', SpiderFootEvent('ROOT', 'example data', '', ''))

        result = module.handleEvent(evt)

        self.assertIsNone(result)
        self.assertTrue(module.errorState)
