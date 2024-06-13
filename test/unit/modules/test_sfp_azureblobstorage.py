import pytest
import unittest

from modules.sfp_azureblobstorage import sfp_azureblobstorage
from sflib import SpiderFoot


@pytest.mark.usefixtures
class TestModuleAzureblobstorage(unittest.TestCase):

    def test_opts(self):
        module = sfp_azureblobstorage()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_azureblobstorage()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_azureblobstorage()
        self.assertIsInstance(module.watchedEvents(), list)

    def test_producedEvents_should_return_list(self):
        module = sfp_azureblobstorage()
        self.assertIsInstance(module.producedEvents(), list)
