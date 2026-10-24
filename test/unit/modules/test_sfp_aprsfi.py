import pytest
import unittest

from modules.sfp_aprsfi import sfp_aprsfi
from sflib import SpiderFoot
from spiderfoot import SpiderFootEvent, SpiderFootTarget


@pytest.mark.usefixtures
class TestModuleAprsfi(unittest.TestCase):

    def test_opts(self):
        module = sfp_aprsfi()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_aprsfi()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_aprsfi()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_aprsfi()
        self.assertIsInstance(module.producedEvents(), list)

    def test_handleEvent_no_api_key_should_set_errorState(self):
        sf = SpiderFoot(self.default_options)

        module = sfp_aprsfi()
        module.setup(sf, dict())

        target = SpiderFootTarget('example data', 'INTERNET_NAME')
        module.setTarget(target)

        evt = SpiderFootEvent('COMPANY_NAME', 'example data', 'example module', SpiderFootEvent('ROOT', 'example data', '', ''))

        result = module.handleEvent(evt)

        self.assertIsNone(result)
        self.assertTrue(module.errorState)
