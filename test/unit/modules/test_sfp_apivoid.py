import pytest
import unittest

from modules.sfp_apivoid import sfp_apivoid
from sflib import SpiderFoot
from spiderfoot import SpiderFootEvent, SpiderFootTarget


@pytest.mark.usefixtures
class TestModuleApivoid(unittest.TestCase):

    def test_opts(self):
        module = sfp_apivoid()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_apivoid()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_apivoid()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_apivoid()
        self.assertIsInstance(module.producedEvents(), list)

    def test_handleEvent_no_api_key_should_set_errorState(self):
        sf = SpiderFoot(self.default_options)

        module = sfp_apivoid()
        module.setup(sf, dict())

        target = SpiderFootTarget('192.0.2.1', 'IP_ADDRESS')
        module.setTarget(target)

        evt = SpiderFootEvent('IP_ADDRESS', '192.0.2.1', 'example module', SpiderFootEvent('ROOT', 'example data', '', ''))

        result = module.handleEvent(evt)

        self.assertIsNone(result)
        self.assertTrue(module.errorState)
