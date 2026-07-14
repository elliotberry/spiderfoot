/**
 * Lightweight table sort / filter / pager to replace jquery.tablesorter.
 */
(function () {
  'use strict';

  var CRITICALITY = { high: 3, medium: 2, low: 1, info: 0 };

  function textOf(cell) {
    return (cell.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function parseValue(cell, sorter) {
    var text = textOf(cell);
    if (sorter === 'criticality') {
      var key = text.toLowerCase();
      return CRITICALITY.hasOwnProperty(key) ? CRITICALITY[key] : -1;
    }
    var num = parseFloat(text.replace(/,/g, ''));
    if (text !== '' && !isNaN(num) && /^-?\d+(\.\d+)?$/.test(text.replace(/,/g, ''))) {
      return num;
    }
    return text.toLowerCase();
  }

  function compare(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  function getBodyRows(table) {
    var tbodies = table.tBodies;
    if (!tbodies || !tbodies.length) return [];
    return Array.prototype.slice.call(tbodies[0].rows);
  }

  function clearSortClasses(table) {
    table.querySelectorAll('thead th').forEach(function (th) {
      th.classList.remove('tablesorter-headerAsc', 'tablesorter-headerDesc', 'headerSortUp', 'headerSortDown');
      th.classList.add('tablesorter-header');
    });
  }

  function applyFilter(state) {
    var filters = state.filters || [];
    state.allRows.forEach(function (row) {
      var show = true;
      for (var i = 0; i < filters.length; i++) {
        var q = filters[i];
        if (!q) continue;
        var cell = row.cells[i];
        if (!cell || textOf(cell).toLowerCase().indexOf(q) === -1) {
          show = false;
          break;
        }
      }
      row._sfFilterMatch = show;
    });
  }

  function renderPager(state) {
    if (!state.pager) return;
    var matched = state.allRows.filter(function (r) { return r._sfFilterMatch !== false; });
    var size = state.pageSize;
    var pageCount = size === Infinity ? 1 : Math.max(1, Math.ceil(matched.length / size));
    if (state.page >= pageCount) state.page = pageCount - 1;
    if (state.page < 0) state.page = 0;

    var start = size === Infinity ? 0 : state.page * size;
    var end = size === Infinity ? matched.length : Math.min(matched.length, start + size);

    state.allRows.forEach(function (row) {
      row.style.display = 'none';
    });
    matched.slice(start, end).forEach(function (row) {
      row.style.display = '';
    });

    var container = state.pager.container;
    var display = container.querySelector('.pagedisplay');
    if (display) {
      var output = state.pager.output || 'Rows {startRow} - {endRow} / {filteredRows} ({totalRows})';
      display.textContent = output
        .replace('{startRow}', matched.length ? String(start + 1) : '0')
        .replace('{endRow}', String(end))
        .replace('{filteredRows}', String(matched.length))
        .replace('{totalRows}', String(state.allRows.length));
    }

    var gotoSel = container.querySelector(state.pager.cssGoto || '.pagenum');
    if (gotoSel && gotoSel.tagName === 'SELECT') {
      var html = '';
      for (var p = 0; p < pageCount; p++) {
        html += '<option value="' + p + '"' + (p === state.page ? ' selected' : '') + '>' + (p + 1) + '</option>';
      }
      gotoSel.innerHTML = html;
    }
  }

  function sortTable(state, colIndex, dir) {
    var sorter = state.sorters[colIndex];
    if (sorter === false) return;

    state.allRows.sort(function (ra, rb) {
      var av = parseValue(ra.cells[colIndex], sorter);
      var bv = parseValue(rb.cells[colIndex], sorter);
      var cmp = compare(av, bv);
      return dir === 'desc' ? -cmp : cmp;
    });

    var tbody = state.table.tBodies[0];
    state.allRows.forEach(function (row) { tbody.appendChild(row); });

    clearSortClasses(state.table);
    var th = state.headers[colIndex];
    if (th) {
      th.classList.add(dir === 'asc' ? 'tablesorter-headerAsc' : 'tablesorter-headerDesc');
      th.classList.add(dir === 'asc' ? 'headerSortUp' : 'headerSortDown');
    }
    state.sortCol = colIndex;
    state.sortDir = dir;
    renderPager(state);
  }

  function addFilterRow(state) {
    var thead = state.table.tHead;
    if (!thead || !thead.rows.length) return;
    if (thead.querySelector('.sf-filter-row')) return;

    var headerRow = thead.rows[0];
    var filterRow = document.createElement('tr');
    filterRow.className = 'sf-filter-row tablesorter-filter-row';
    state.filters = [];

    Array.prototype.forEach.call(headerRow.cells, function (_, idx) {
      var td = document.createElement('td');
      var input = document.createElement('input');
      input.type = 'search';
      input.className = 'form-control input-sm tablesorter-filter';
      input.setAttribute('data-column', String(idx));
      var timer = null;
      input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.filters[idx] = input.value.toLowerCase();
          applyFilter(state);
          state.page = 0;
          renderPager(state);
        }, state.filterDelay || 300);
      });
      td.appendChild(input);
      filterRow.appendChild(td);
      state.filters[idx] = '';
    });
    thead.appendChild(filterRow);
  }

  function bindPager(state) {
    var container = state.pager.container;
    if (!container) return;

    function go(page) {
      state.page = page;
      renderPager(state);
    }

    var first = container.querySelector('.first');
    var prev = container.querySelector('.prev');
    var next = container.querySelector('.next');
    var last = container.querySelector('.last');
    var sizeSel = container.querySelector('.pagesize');
    var gotoSel = container.querySelector(state.pager.cssGoto || '.pagenum');

    if (first) first.addEventListener('click', function () { go(0); });
    if (prev) prev.addEventListener('click', function () { go(state.page - 1); });
    if (next) next.addEventListener('click', function () { go(state.page + 1); });
    if (last) last.addEventListener('click', function () {
      var matched = state.allRows.filter(function (r) { return r._sfFilterMatch !== false; });
      var pages = state.pageSize === Infinity ? 1 : Math.max(1, Math.ceil(matched.length / state.pageSize));
      go(pages - 1);
    });
    if (sizeSel) {
      sizeSel.addEventListener('change', function () {
        state.pageSize = sizeSel.value === 'all' ? Infinity : parseInt(sizeSel.value, 10) || 10;
        state.page = 0;
        renderPager(state);
      });
      state.pageSize = sizeSel.value === 'all' ? Infinity : parseInt(sizeSel.value, 10) || 10;
    }
    if (gotoSel) {
      gotoSel.addEventListener('change', function () {
        go(parseInt(gotoSel.value, 10) || 0);
      });
    }
  }

  function init(table, options) {
    if (!table) return null;
    options = options || {};

    if (typeof table === 'string') {
      table = document.querySelector(table);
    }
    if (!table) return null;

    var headersOpt = options.headers || {};
    var headerCells = table.tHead ? Array.prototype.slice.call(table.tHead.rows[0].cells) : [];
    var sorters = headerCells.map(function (th, idx) {
      if (th.classList.contains('sorter-false')) return false;
      if (headersOpt[idx] && headersOpt[idx].sorter === false) return false;
      if (headersOpt[idx] && headersOpt[idx].sorter) return headersOpt[idx].sorter;
      return true;
    });

    var state = {
      table: table,
      headers: headerCells,
      sorters: sorters,
      allRows: getBodyRows(table),
      page: 0,
      pageSize: 10,
      sortCol: null,
      sortDir: null,
      filterDelay: (options.widgetOptions && options.widgetOptions.filter_searchDelay) || 300
    };

    table.classList.add('tablesorter', 'tablesorter-default');
    clearSortClasses(table);

    headerCells.forEach(function (th, idx) {
      if (sorters[idx] === false) {
        th.classList.add('sorter-false');
        return;
      }
      th.style.cursor = 'pointer';
      th.addEventListener('click', function () {
        var dir = (state.sortCol === idx && state.sortDir === 'asc') ? 'desc' : 'asc';
        sortTable(state, idx, dir);
      });
    });

    var widgets = options.widgets || [];
    if (widgets.indexOf('filter') !== -1) {
      addFilterRow(state);
      applyFilter(state);
    } else {
      state.allRows.forEach(function (r) { r._sfFilterMatch = true; });
    }

    if (options.pager) {
      var container = options.pager.container;
      if (typeof container === 'string') container = document.querySelector(container);
      else if (container && container.length) container = container[0];
      state.pager = {
        container: container,
        cssGoto: options.pager.cssGoto || '.pagenum',
        output: options.pager.output
      };
      if (container) {
        bindPager(state);
        renderPager(state);
      }
    }

    table._sfTable = state;
    return state;
  }

  window.sfTable = {
    init: init,
    // Compatibility helpers used by older call sites after migration
    sort: function (table, options) {
      return init(table, options || {});
    }
  };
})();
