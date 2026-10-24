import pytest
import unittest

from modules.sfp_cisco_umbrella import sfp_cisco_umbrella
from sflib import SpiderFoot
from spiderfoot import SpiderFootEvent, SpiderFootTarget


@pytest.mark.usefixtures
class TestModuleCiscoUmbrella(unittest.TestCase):

    def test_opts(self):
        module = sfp_cisco_umbrella()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_cisco_umbrella()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_cisco_umbrella()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_cisco_umbrella()
        self.assertIsInstance(module.producedEvents(), list)

    def test_handleEvent_no_api_key_should_set_errorState(self):
        sf = SpiderFoot(self.default_options)

        module = sfp_cisco_umbrella()
        module.setup(sf, dict())

        target = SpiderFootTarget('example.com', 'INTERNET_NAME')
        module.setTarget(target)

        evt = SpiderFootEvent('DOMAIN_NAME', 'example.com', 'example module', SpiderFootEvent('ROOT', 'example data', '', ''))

        result = module.handleEvent(evt)

        self.assertIsNone(result)
        self.assertTrue(module.errorState)
