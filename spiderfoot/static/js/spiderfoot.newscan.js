tabs = ['use', 'type', 'module'];
activeTab = 'use';

function submitForm() {
  var list = '';
  sf.qsa('[id^=' + activeTab + '_]').forEach(function (el) {
    if (el.checked) {
      list += el.id + ',';
    }
  });

  var activeList = sf.el(activeTab + 'list');
  if (activeList) activeList.value = list;

  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i] != activeTab) {
      var other = sf.el(tabs[i] + 'list');
      if (other) other.value = '';
    }
  }
}

function switchTab(tabname) {
  sf.hide(activeTab + 'table');
  sf.removeClass(activeTab + 'tab', 'active');
  sf.show(tabname + 'table');
  sf.addClass(tabname + 'tab', 'active');
  activeTab = tabname;
  if (activeTab == 'use') {
    sf.hide('selectors');
  } else {
    sf.show('selectors');
  }
}

function selectAll() {
  sf.qsa('[id^=' + activeTab + '_]').forEach(function (el) {
    el.checked = true;
  });
}

function deselectAll() {
  sf.qsa('[id^=' + activeTab + '_]').forEach(function (el) {
    el.checked = false;
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var usetab = sf.el('usetab');
  var typetab = sf.el('typetab');
  var moduletab = sf.el('moduletab');
  var btnSelectAll = sf.el('btn-select-all');
  var btnDeselectAll = sf.el('btn-deselect-all');
  var btnRunScan = sf.el('btn-run-scan');
  var scantarget = sf.el('scantarget');

  if (usetab) usetab.addEventListener('click', function () { switchTab('use'); });
  if (typetab) typetab.addEventListener('click', function () { switchTab('type'); });
  if (moduletab) moduletab.addEventListener('click', function () { switchTab('module'); });
  if (btnSelectAll) btnSelectAll.addEventListener('click', function () { selectAll(); });
  if (btnDeselectAll) btnDeselectAll.addEventListener('click', function () { deselectAll(); });
  if (btnRunScan) btnRunScan.addEventListener('click', function () { submitForm(); });

  if (scantarget && window.sfBootstrap) {
    sfBootstrap.popover(scantarget, {html: true, animation: true, trigger: 'focus'});
  }
});
