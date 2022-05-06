import pytest
import unittest

from modules.sfp_punkspider import sfp_punkspider
from sflib import SpiderFoot


@pytest.mark.usefixtures
class TestModulePunkspider(unittest.TestCase):

    def test_opts(self):
        module = sfp_punkspider()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_punkspider()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_punkspider()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_punkspider()
        self.assertIsInstance(module.producedEvents(), list)
