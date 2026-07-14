activeTab = 'global';
function saveSettings() {
  var retarr = {};
  sf.qsa('input, select, textarea').forEach(function (el) {
    if (!el.id) return;
    retarr[el.id] = el.value;
  });

  sf.el('allopts').value = JSON.stringify(retarr);
}

function clearSettings() {
  sf.el('allopts').value = 'RESET';
}

function switchTab(tab) {
  sf.hide('optsect_' + activeTab);
  sf.show('optsect_' + tab);
  sf.removeClass('tab_' + activeTab, 'active');
  sf.addClass('tab_' + tab, 'active');
  activeTab = tab;
}

function getFile(elemId) {
  var elem = document.getElementById(elemId);
  if (elem) {
    elem.click();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var btnSave = sf.el('btn-save-changes');
  var btnImport = sf.el('btn-import-config');
  var btnReset = sf.el('btn-reset-settings');
  var btnExport = sf.el('btn-opt-export');
  var tabGlobal = sf.el('tab_global');

  if (btnSave) btnSave.addEventListener('click', function () { saveSettings(); });
  if (btnImport)
    btnImport.addEventListener('click', function (e) {
      e.preventDefault();
      getFile('configFile');
    });
  if (btnReset) btnReset.addEventListener('click', function () { clearSettings(); });
  if (btnExport)
    btnExport.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = docroot + '/optsexport?pattern=api_key';
    });
  if (tabGlobal)
    tabGlobal.addEventListener('click', function () {
      switchTab('global');
    });

  sf.qsa('[data-toggle="popover"]').forEach(function (el) {
    el.setAttribute('data-max-width', '600px');
  });
  if (window.sfBootstrap) {
    sfBootstrap.initPopovers();
  }
});
