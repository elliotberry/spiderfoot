import pytest
import unittest

from modules.sfp_judyrecords import sfp_judyrecords
from sflib import SpiderFoot


@pytest.mark.usefixtures
class TestModuleJudyrecords(unittest.TestCase):

    def test_opts(self):
        module = sfp_judyrecords()
        self.assertEqual(len(module.opts), len(module.optdescs))

    def test_setup(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, dict())

    def test_watchedEvents_should_return_list(self):
        module = sfp_judyrecords()
        self.assertIsInstance(module.watchedEvents(), list)
        self.assertIn("HUMAN_NAME", module.watchedEvents())
        self.assertIn("COMPANY_NAME", module.watchedEvents())

    def test_producedEvents_should_return_list(self):
        module = sfp_judyrecords()
        self.assertIsInstance(module.producedEvents(), list)
        self.assertIn("RAW_RIR_DATA", module.producedEvents())
        self.assertIn("SEARCH_ENGINE_WEB_CONTENT", module.producedEvents())
        self.assertIn("LINKED_URL_EXTERNAL", module.producedEvents())

    def test_buildQuery_human_name_strict(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, {"namematch": "strict"})
        self.assertEqual(module.buildQuery("HUMAN_NAME", "donald trump"), "donald trump,,,")
        self.assertEqual(module.buildQuery("HUMAN_NAME", "donald trump,,,"), "donald trump,,,")
        self.assertEqual(module.buildQuery("HUMAN_NAME", "donald trump,,"), "donald trump,,,")

    def test_buildQuery_human_name_lenient(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, {"namematch": "lenient"})
        self.assertEqual(module.buildQuery("HUMAN_NAME", "donald trump"), "donald trump,,")
        self.assertEqual(module.buildQuery("HUMAN_NAME", "donald trump,,"), "donald trump,,")

    def test_buildQuery_human_name_raw(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, {"namematch": "raw"})
        self.assertEqual(module.buildQuery("HUMAN_NAME", "donald trump,, texas"), "donald trump,, texas")

    def test_buildQuery_company_name(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, {"namematch": "strict"})
        self.assertEqual(module.buildQuery("COMPANY_NAME", "Acme Corp"), '"Acme Corp"')
        self.assertEqual(module.buildQuery("COMPANY_NAME", '"Acme Corp"'), '"Acme Corp"')

        module.setup(sf, {"namematch": "raw"})
        self.assertEqual(module.buildQuery("COMPANY_NAME", "Acme Corp"), "Acme Corp")

    def test_isCaptcha(self):
        module = sfp_judyrecords()
        self.assertFalse(module.isCaptcha(""))
        self.assertFalse(module.isCaptcha("<html><title>Search Results</title></html>"))
        self.assertTrue(module.isCaptcha("<html><title>Captcha Challenge</title></html>"))
        # Homepage JS references captcha URLs; that must not count as a captcha page
        self.assertFalse(
            module.isCaptcha(
                '<script>window.location.href = "/captcha?preCaptchaUri=" + x;</script>'
            )
        )

    def test_parseResults(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, dict())

        html = """
        <html class="search interior searchPage1 results">
          <body>
            <div class="searchResultItem">
              <h2 class="title"><a href="/record/abc123">Example Court Record</a></h2>
              <div class="snippet">party plaintiff <em>smith</em></div>
              <div class="snippet">case status disposed</div>
            </div>
          </body>
        </html>
        """
        results = module.parseResults(html)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Example Court Record")
        self.assertEqual(results[0]["url"], "https://www.judyrecords.com/record/abc123")
        self.assertEqual(len(results[0]["snippets"]), 2)

    def test_parseResults_subscribe_wall(self):
        sf = SpiderFoot(self.default_options)
        module = sfp_judyrecords()
        module.setup(sf, dict())
        html = '<html class="page2AndBeyondSubscribe interior noResults"><body></body></html>'
        self.assertEqual(module.parseResults(html), [])
