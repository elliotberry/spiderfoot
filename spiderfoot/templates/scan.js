var currentType = 'ALL';
var currentTypeName = 'All';
var currentSection = 'btn-browse';
var lastSearchType = 'ALL';
var lastSearchQuery = '';
var dataloaders = [];
var sharedSigma = '';
var loadersrunning = false;
var refresh = function () {
  browseEventList('${id}');
};
$('#searchvalue').popover({trigger: 'focus', placement: 'bottom'});
$('#searchvalue').keyup(function (event) {
  if (event.keyCode == 13) {
    $('#searchbutton').click();
  }
});

function switchSelectAll() {
  if (!$('#checkall')[0].checked) {
    $('input[id*=cb_]').prop('checked', false);
  } else {
    $('input[id*=cb_]').prop('checked', true);
  }
}

function getSelected() {
  ids = [];
  $('input[id*=cb_]').each(function (i, obj) {
    if (obj.checked) {
      ids[ids.length] = obj.id.replace('cb_', '');
    }
  });

  return ids;
}

function setFp(flag) {
  sel = getSelected();
  if (sel.length == 0) {
    alertify.error('You need to select at least one record.');
    return false;
  }
  data = JSON.stringify(sel);
  $('#loader').show();
  sf.fetchData('${docroot}/resultsetfp', {id: '${id}', fp: flag, resultids: data}, function (ret) {
    $('#loader').hide();
    if (ret[0] == 'SUCCESS') {
      refresh();
      return;
    }
    if (ret[0] == 'WARNING') {
      alertify.error(ret[1]);
      return;
    }
    if (ret[0] == 'ERROR') {
      alertify.error('There was an error setting false positives because: ' + ret[1] + '<br/>If you believe this to be an error, please log out and log back in, and if the problem repeats, report this as a bug.');
    }
  });
}

function navTo(target) {
  var targets = ['btn-browse', 'btn-info', 'btn-log', 'btn-export', 'btn-download-logs', 'btn-viz', 'btn-status', 'btn-graph', 'btn-correlations'];
  for (var i = 0; i < targets.length; i++) {
    if (targets[i] == target) {
      $('#' + targets[i]).addClass('active');
    } else {
      $('#' + targets[i]).removeClass('active');
    }
  }

  $('#breadcrumbs').remove();
  $('#customtabview').hide();
  $('#customvizview').hide();
  $('#modifyactions').hide();
  currentSection = target;
  dataloaders = [];
}

function searchDirector(instanceId) {
  qry = $('#searchvalue').val();
  if (currentType == 'ALL') {
    searchResults(instanceId, qry);
  } else {
    searchResults(instanceId, qry, currentType);
  }
}

function searchResults(instanceId, query, typeName) {
  // Remove pre-existing tables if they exist
  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  navTo('btn-search');
  $('#modifyactions').hide();
  $('#loader').show();
  $('#btn-export').show();
  $('#btn-download-logs').hide();
  $('#btn-refresh').show();
  $('#btn-search').show();
  $('#scanreminder').hide();
  refresh = function () {
    searchResults(instanceId, query, typeName);
  };
  sf.search(instanceId, query, typeName, function (data) {
    lastSearchType = typeName;
    lastSearchQuery = query;
    var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + '");\'>Browse</a>';
    crumbs += " <span class='divider'></span></li>";
    if (typeName != null) {
      crumbs += " <li><a class='link' onClick=";
      crumbs += '\'browseEventData("' + instanceId + '","' + currentTypeName + '","' + typeName + '","full");\'>';
      crumbs += unescape(currentTypeName) + "</a><span class='divider'></span></li>";
    }
    crumbs += '<li>Search results';
    crumbs += ' (' + data.length + ' records)</li></ul>';

    if (data.length == 0) {
      var table = "<div id='scansummary-content'>&nbsp;&nbsp;No results found. Try broadening your search criteria.</div>";
    } else {
      var table = "<table id='scansummary-content' class='table table-bordered table-striped small tablesorter'><thead><tr>";
      if (typeName == null) {
        table += "<th class='sorter-false'>Data Element Type</th>";
      }
      table += '<th>Data Element</th><th>Source Data Element</th><th>Source Module</th><th>Identified</th></tr></thead><tbody>';
      for (var i = 0; i < data.length; i++) {
        table += '<tr>';
        if (typeName == null) {
          table += "<td><pre class='table-border-bg-inherit t1'>" + data[i][8] + '</pre></td>';
        }
        table += "<td><pre class='table-border-bg-inherit t2' >";
        table += sf.replace_sfurltag(data[i][1]);
        // for debug
        table += "</pre></td><td><pre class='table-border-bg-inherit t3'>";
        table += sf.replace_sfurltag(data[i][2]);
        table += "</pre></td><td><pre class='table-border-bg-inherit t4'>" + data[i][3];
        table += "</pre></td><td><pre class='table-border-bg-inherit t5'>" + data[i][0];
        table += '</pre></td>';
        table += '</tr>';
      }
      table += '</tbody></table>';
    }
    $('#loader').fadeOut(500);
    $('#mainbody').append(crumbs + table);
    $('#scansummary-content').tablesorter();
  });
}

// Visualisation
function graphEvents(instanceId) {
  grid = "<div id='scansummary-content'><br />";
  grid += "<div class='col-md-12 graph-container' id='graph-container'></div>";
  grid += '</div>';

  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  $('#loader').show();
  $('#btn-export').show();
  $('#btn-download-logs').hide();
  $('#btn-refresh').show();
  $('#btn-search').hide();
  $('#btn-graph').show();
  $('#scanreminder').hide();
  refresh = function () {
    graphEvents(instanceId);
  };
  navTo('btn-graph');
  $('#customvizview').show();
  $('#mainbody').append(grid);
  $('#btn-forceatlas').removeClass('active');
  $('#btn-random').addClass('active');

  sigma.renderers.def = sigma.renderers.canvas;
  sigma.parsers.json(
    '${docroot}/scanviz?id=' + instanceId + '&gexf=0',
    {
      container: 'graph-container',
    },
    function (s) {
      if (s.renderers[0].nodesOnScreen.length == 0) {
        $('#graph-container').append("<div class='alert alert-danger'>Insufficient data to produce a graph.</div>");
        $('#loader').hide();
        return;
      }
      sharedSigma = s;
      s.settings({
        edgeColor: 'default',
        defaultEdgeColor: '#aaa',
        maxNodeSize: 5,
      });
      sigma.plugins.dragNodes(s, s.renderers[0]);
      s.refresh();
      $('#loader').hide();
    },
  );
}

function vizUpdate(method) {
  s = sharedSigma;
  if (method == 'force') {
    $('#btn-forceatlas').addClass('active');
    $('#btn-random').removeClass('active');
    s.startForceAtlas2();
    s.refresh();
    setTimeout(function () {
      s.stopForceAtlas2();
    }, 5000);
  }

  if (method == 'random') {
    $('#btn-forceatlas').removeClass('active');
    $('#btn-random').addClass('active');
    refresh();
  }

  if (method == 'download') {
    s.renderers[0].snapshot({download: true});
  }
}

// Scan status
function scanSummaryView(instanceId) {
  grid = "<div id='scansummary-content'>";
  grid += "<div class='row'>";
  grid += "<div class='col-sm-7'>";
  grid += "<div class='panel panel-default'>";
  grid += "<div class='panel-heading'><i class='glyphicon glyphicon-eye-open'></i>&nbsp;&nbsp;Scan Status</div><div class='panel-body' style='padding: 5px'>";
  grid += "<div class='btn-toolbar text-center'>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-secondary' style='cursor: default;'>Total</span></button>";
  grid += "<button class='btn disabled btn-md btn-default' id='tcounter' style='cursor: default;'>?</button></div>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-secondary' style='cursor: default;'>Unique</button>";
  grid += "<button class='btn disabled btn-md btn-default' id='ucounter' style='cursor: default;'>?</button></div>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-secondary' style='cursor: default;'>Status</button>";
  grid += "<button class='btn disabled btn-md btn-default' id='status' style='cursor: default;'>?</button></div>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-secondary' style='cursor: default;'>Errors</button>";
  grid += "<button class='btn disabled btn-md btn-default' id='errors' style='cursor: default;'>?</button></div>";
  grid += '</div></div></div></div>';
  grid += "<div class='col-sm-5'>";
  grid += "<div class='panel panel-default'>";
  grid += "<div class='panel-heading'><i class='glyphicon glyphicon-exclamation-sign'></i>&nbsp;&nbsp;Correlations</div><div class='panel-body' style='padding: 5px'>";
  grid += "<div class='btn-toolbar text-center'>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-danger' style='cursor: default;'>High</span></button>";
  grid += "<button class='btn disabled btn-md btn-default' id='corr-high' style='cursor: default;'>?</button></div>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-warning' style='cursor: default;'>Medium</button>";
  grid += "<button class='btn disabled btn-md btn-default' id='corr-medium' style='cursor: default;'>?</button></div>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-primary' style='cursor: default;'>Low</button>";
  grid += "<button class='btn disabled btn-md btn-default' id='corr-low' style='cursor: default;'>?</button></div>";
  grid += "<div class='btn-group' style='float: unset; padding: 5px'><button class='btn disabled btn-md btn-success' style='cursor: default;'>Info</button>";
  grid += "<button class='btn disabled btn-md btn-default' id='corr-info' style='cursor: default;'>?</button></div>";
  grid += '</div></div></div></div></div>';
  grid += "<div class='row'><div class='col-sm-12'>";
  grid += "<div class='panel panel-default'>";
  grid += "<div class='panel-heading'><i class='glyphicon glyphicon-stats'></i>&nbsp;&nbsp;Data Types</div><div class='panel-body'>";
  grid += "<div id='vbarsummary'></div>";
  grid += '</div></div></div></div>';

  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  $('#loader').show();
  $('#btn-export').hide();
  $('#btn-download-logs').hide();
  $('#btn-refresh').hide();
  $('#btn-search').hide();
  $('#scanreminder').show();
  navTo('btn-status');

  $('#mainbody').append(grid);

  // Collect data and populate variables for use later
  dataloaders.push(function () {
    sf.fetchData('${docroot}/scanstatus', {id: instanceId}, function (data) {
      scanName = data[0];
      scanTarget = data[1];
      scanStarted = data[2];
      scanEnded = data[4];
      scanStatus = data[5];
      scanCorrelations = data[6];

      $('#corr-high').html(scanCorrelations['HIGH']);
      $('#corr-medium').html(scanCorrelations['MEDIUM']);
      $('#corr-low').html(scanCorrelations['LOW']);
      $('#corr-info').html(scanCorrelations['INFO']);
    });
  });

  dataloaders.push(function () {
    sf.fetchData('${docroot}/scanerrors', {id: instanceId}, function (data) {
      $('#errors').html(data.length);
    });
  });

  dataloaders.push(function () {
    sf.fetchData('${docroot}/scansummary', {id: instanceId, by: 'type'}, function (data) {
      scanSummary = [];
      totalCount = 0;
      uniqueCount = 0;
      for (i = 0; i < data.length; i++) {
        scanSummary[i] = {};
        scanSummary[i].scanId = instanceId;
        scanSummary[i].id = data[i][0];
        scanSummary[i].name = data[i][1];
        scanSummary[i].total = data[i][3];
        scanSummary[i].counter = data[i][4];
        scanSummary[i].link = function (d) {
          return browseEventData(d.scanId, d.name, d.id, 'full');
        };
        totalCount += data[i][3];
        uniqueCount += data[i][4];
        scanStatus = data[i][5];
      }

      for (x = 0; x < i; x++) {
        scanSummary[x].pct = scanSummary[x].counter / uniqueCount;
      }

      $('#ucounter').html(uniqueCount);
      $('#tcounter').html(totalCount);
      $('#scanstatusbadge').html(scanStatus);

      var statusy = '';
      if (scanStatus == 'FINISHED') {
        statusy = 'alert-success';
      } else if (scanStatus.indexOf('ABORT') >= 0) {
        statusy = 'alert-warning';
      } else if (scanStatus == 'CREATED' || scanStatus == 'RUNNING' || scanStatus == 'STARTED' || scanStatus == 'STARTING' || scanStatus == 'INITIALIZING') {
        statusy = 'alert-info';
      } else if (scanStatus.indexOf('FAILED') >= 0) {
        statusy = 'alert-danger';
      } else {
        statusy = 'alert-info';
      }
      $('#scanstatusbadge').removeClass(['alert-info', 'alert-warning', 'alert-danger']).addClass(statusy);
      $('#status').html(scanStatus);
      $('#vbarsummary').empty();
      if (scanSummary.length == 0) {
        $('#vbarsummary').append("<div id='scansummary-content' class='alert alert-warning'><h4>No data.</h4>If the scan is still running this section will update shortly.</div>");
      } else {
        sf_viz_vbar('#vbarsummary', scanSummary);
      }
      $('#loader').fadeOut(500);
    });
  });

  loadersrunning = true;
  for (var i = 0; i < dataloaders.length; i++) {
    dataloaders[i]();
  }
  loadersrunning = false;
}

// Expand the correlation list to show the events associated
function toggleCorrelation(instanceId, correlationId) {
  if (!$('#corrwell_tr_' + correlationId).hasClass('hidden')) {
    $('#corrwell_td_' + correlationId).empty();
    $('#corrwell_tr_' + correlationId).addClass('hidden');
    return;
  }
  sf.fetchData('${docroot}/scaneventresults', {id: instanceId, correlationId: correlationId}, function (data) {
    var table = "<table id='corrcontent_'" + correlationId + "' class='table table-bordered table-striped small'>";
    table += '<thead><tr>';
    table += '<th>Data Element</th></th>';
    table += '<th>Source Data Element</th>';
    table += '<th>Source Module</th>';
    table += '<th>Identified</th>';
    table += '</tr></thead><tbody>';

    for (var i = 0; i < data.length; i++) {
      table += '<tr>';
      table += "<td><pre class='table-border-bg-inherit'>";
      table += sf.replace_sfurltag(data[i][1]);
      table += "</pre></td><td><pre class='table-border-bg-inherit'>";
      table += sf.replace_sfurltag(data[i][2]);
      table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][3];
      table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][0];
      table += '</pre></td>';
      table += '</tr>';
    }
    table += '</tbody></table>';
    $('#corrwell_td_' + correlationId).prepend(table);
    $('#corrwell_tr_' + correlationId).removeClass('hidden');
  });
}

// Correlation results for the scan
function browseCorrelations(instanceId) {
  $('#scansummary-content').remove();
  $('#loader').show();
  $('#btn-search').hide();
  $('#btn-export').hide();
  $('#scanreminder').hide();
  navTo('btn-correlations');
  refresh = function () {
    browseCorrelations(instanceId);
  };
  sf.fetchData('${docroot}/scancorrelations', {id: instanceId}, function (data) {
    if (data.length == 0) {
      table = "<div id='scansummary-content' class='alert alert-warning'><h4>No correlations.</h4>If the scan is still running please reload once it has completed.</div>";
      $('#loader').fadeOut(500);
      $('#mainbody').append(table);
      sf.updateTooltips();
      return;
    }
    var table = "<table id='scansummary-content' class='table table-bordered table-striped table-condensed tablesorter small'>";
    table += '<thead><tr><th>Correlation</th><th>Risk</th><th>Data Elements</th></tr></thead><tbody>';
    for (var i = 0; i < data.length; i++) {
      table += '<tr>';
      table += "<td><a style='cursor: pointer' onClick='toggleCorrelation(\"" + instanceId + '","' + data[i][0] + '")\'>' + data[i][1] + '</a>&nbsp;&nbsp;';
      table += "<i class='glyphicon glyphicon-question-sign' style='color: #ccc' rel='tooltip' data-title=\"" + data[i][5] + '"></i>';
      table += '</td>';
      if (data[i][3] == 'HIGH') {
        statusy = 'alert-danger';
      }
      if (data[i][3] == 'MEDIUM') {
        statusy = 'alert-warning';
      }
      if (data[i][3] == 'LOW') {
        statusy = 'alert-info';
      }
      if (data[i][3] == 'INFO') {
        statusy = 'alert-success';
      }
      table += "<td><span class='badge " + statusy + "'>" + data[i][3] + '</span></td>';
      table += '<td>' + data[i][7] + '</td>';
      table += "</tr><tr class='hidden' id='corrwell_tr_" + data[i][0] + "'><td colspan=3 id='corrwell_td_" + data[i][0] + "'></td></tr>";
    }
    table += '</tbody></table>';
    $('#loader').fadeOut(500);
    $('#mainbody').append(table);
    $.tablesorter.addParser({
      id: 'criticality',
      is: function (s) {
        return false;
      },
      format: function (s) {
        return s
          .toLowerCase()
          .replace(/high/, 3)
          .replace(/medium/, 2)
          .replace(/low/, 1)
          .replace(/info/, 0);
      },
      type: 'numeric',
    });
    $('#scansummary-content').tablesorter({headers: {1: {sorter: 'criticality'}}});
    sf.updateTooltips();
  });
}

// Logs for the scan
function viewScanLog(instanceId) {
  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  $('#loader').show();
  $('#btn-search').hide();
  $('#btn-export').hide();
  $('#btn-download-logs').show();
  $('#scanreminder').hide();
  navTo('btn-log');
  refresh = function () {
    viewScanLog(instanceId);
  };
  sf.fetchData('${docroot}/scanlog', {id: instanceId}, function (data) {
    var table = "<table id='scanlogs-content' class='table table-bordered table-striped table-condensed small tablesorter' style='table-layout: fixed'>";
    table += '<thead><tr><th>Time</th><th>Component</th><th>Type</th><th>Event</th></tr></thead><tbody>';
    for (var i = 0; i < data.length; i++) {
      if (data[i][2] == 'ERROR') {
        table += "<tr class='danger'>";
      } else {
        table += '<tr>';
      }
      table += '<td>' + data[i][0] + '</a></td>';
      table += '<td>' + data[i][1] + '</td>';
      table += '<td>' + data[i][2] + '</td>';
      table += '<td>' + data[i][3] + '</td>';
      table += '</tr>';
    }
    table += '</tbody></table>';
    $('#loader').fadeOut(500);
    $('#mainbody').append(table);
    $('#scanlogs-content').tablesorter({widgets: ['filter'], widgetOptions: {filter_searchDelay: 300, filter_hideFilters: false}});
  });
}

// Summary of event types and counts for a scan
function browseEventList(instanceId) {
  currentType = 'ALL';
  currentTypeName = 'All';

  // Remove pre-existing tables if they exist
  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  navTo('btn-browse');
  $('#loader').show();
  $('#btn-export').show();
  $('#btn-download-logs').hide();
  $('#btn-refresh').show();
  $('#btn-search').show();
  $('#scanreminder').hide();
  refresh = function () {
    browseEventList(instanceId);
  };
  sf.fetchData('${docroot}/scansummary', {id: instanceId, by: 'type'}, function (data) {
    var table = "<table id='scansummary-content' class='table table-bordered table-striped tablesorter'>";
    table += '<thead><tr> <th>Type</th><th>Unique Data Elements</th> <th>Total Data Elements</th><th>Last Data Element</th></tr></thead><tbody>';
    for (var i = 0; i < data.length; i++) {
      table += "<tr><td><a class='link' onClick='";
      table += 'browseEventData("${id}", "' + escape(data[i][1]) + '", "' + data[i][0] + '", "full");\'>';
      table += data[i][1] + '</a></td>';
      table += '<td>' + data[i][4] + '</td>';
      table += '<td>' + data[i][3] + '</td>';
      table += '<td>' + data[i][2] + '</td>';
    }
    table += '</tbody></table>';

    if (data.length < 1) {
      table = "<div id='scansummary-content' class='alert alert-warning'><h4>No data.</h4>If the scan is still running please try again soon.</div>";
    }

    $('#loader').fadeOut(500);
    $('#mainbody').append(table);
    $('#scansummary-content').tablesorter();
  });
}

// Detailed view of data for an event type for a scan
function browseEventData(instanceId, eventTypeLabel, eventType, format, filterFP) {
  if (filterFP === 'undefined') {
    filterFP = false;
  }
  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  $('#breadcrumbs').remove();
  $('#loader').show();
  navTo('btn-browse');
  $('#btn-export').show();
  $('#btn-download-logs').hide();
  $('#btn-refresh').show();
  $('#btn-search').show();
  $('#customtabview').show();
  $('#scanreminder').hide();
  currentType = eventType;
  currentTypeName = eventTypeLabel;
  refresh = function () {
    browseEventData(instanceId, eventTypeLabel, eventType, format, filterFP);
  };
  browseUpdate = function (newformat) {
    browseEventData(instanceId, eventTypeLabel, eventType, newformat, filterFP);
  };

  if (format == 'full') {
    $('#btn-fullview').addClass('active');
    $('#btn-uniqueview').removeClass('active');
    $('#btn-vizview').removeClass('active');
    $('#modifyactions').show();
    sf.fetchData('${docroot}/scaneventresults', {id: instanceId, eventType: eventType}, function (data) {
      totalcount = 0;
      fpcount = 0;
      for (var i = 0; i < data.length; i++) {
        totalcount++;
        if (data[i][8] == '1') {
          fpcount++;
        }
      }
      var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + '");\'>Browse</a>';
      crumbs += " <span class='divider'></span></li> <li><a class='link' onClick=";
      crumbs += '\'browseEventData("' + instanceId + '","' + eventTypeLabel + '","' + eventType + '","';
      crumbs += format + '", ' + filterFP + ");'>";
      crumbs += unescape(eventTypeLabel) + '</a></li>';
      if (fpcount > 0) {
        crumbs += "<div class='pull-right text-center'><i class='glyphicon glyphicon-ban-circle'></i>&nbsp;&nbsp;Hide " + fpcount + ' False Positives: ';
        crumbs += "<input class='vertical-align-top' type='checkbox' ";
        crumbs += 'onClick="browseEventData(\'' + instanceId + "', '" + eventTypeLabel + "', '" + eventType + "'";
        crumbs += ",'" + format + "', ";
        if (!filterFP) {
          fp = 1;
          ch = '';
        } else {
          fp = 0;
          ch = 'checked';
        }
        crumbs += fp + ')" ' + ch + '></input></div>';
      }
      crumbs += '</ul>';

      var table = "<table id='scansummary-content' class='table table-bordered table-striped small tablesorter'>";
      table += '<thead><tr>';
      table += "<th class='text-center'><input id='checkall' type='checkbox' onClick='switchSelectAll()'></th>";
      table += '<th>Data Element</th></th>';
      table += '<th>Source Data Element</th>';
      table += '<th>Source Module</th>';
      table += '<th>Identified</th>';
      table += '</tr></thead><tbody>';

      for (var i = 0; i < data.length; i++) {
        if (filterFP && data[i][8] == '1') {
          continue;
        }
        table += '<tr>';
        table += "<td class='text-center'><input type='checkbox' id='cb_" + data[i][7] + "'>";
        if (data[i][8] == '1') {
          table += "<br /><i class='glyphicon glyphicon-ban-circle' class='vertical-align-bottom' />";
        }
        table += '</td>';
        table += "<td><pre class='table-border-bg-inherit'>";
        //table += "<a href='${docroot}/entityinfo?id=" + data[i][7] + "'>" + data[i][1] + "</a>";
        table += sf.replace_sfurltag(data[i][1]);
        table += "</pre></td><td><pre class='table-border-bg-inherit'>";
        table += sf.replace_sfurltag(data[i][2]);
        table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][3];
        table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][0];
        table += '</pre></td>';
        table += '</tr>';
      }
      table += '</tbody></table>';
      $('#loader').fadeOut(500);
      $('#mainbody').append(crumbs + table);
      $('#scansummary-content').tablesorter({headers: {0: {sorter: false}}});
      lastChecked = null;
      var chkboxes = $('input[id*=cb_]');
      chkboxes.click(function (e) {
        if (!lastChecked) {
          lastChecked = this;
          return;
        }

        if (e.shiftKey) {
          var start = chkboxes.index(this);
          var end = chkboxes.index(lastChecked);

          chkboxes.slice(Math.min(start, end), Math.max(start, end) + 1).prop('checked', lastChecked.checked);
        }

        lastChecked = this;
      });
    });
  }

  if (format == 'unique') {
    $('#btn-uniqueview').addClass('active');
    $('#btn-fullview').removeClass('active');
    $('#btn-vizview').removeClass('active');
    if (filterFP == '0') {
      filterFP = null;
    }
    sf.fetchData('${docroot}/scaneventresultsunique', {id: instanceId, eventType: eventType, filterfp: filterFP}, function (data) {
      var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + '");\'>Browse</a>';
      crumbs += " <span class='divider'></span></li> <li><a class='link' onClick=";
      crumbs += '\'browseEventData("' + instanceId + '","' + eventTypeLabel + '","' + eventType + '","' + format;
      crumbs += '", ' + filterFP + ");'>";
      crumbs += unescape(eventTypeLabel) + '</a></li>';
      crumbs += "<div class='pull-right text-center'><i class='glyphicon glyphicon-ban-circle'></i>&nbsp;&nbsp;&nbsp;&nbsp;Hide False Positives: ";
      crumbs += "<input class='vertical-align-top' type='checkbox' ";
      crumbs += 'onClick="browseEventData(\'' + instanceId + "', '" + eventTypeLabel + "', '" + eventType + "'";
      crumbs += ",'" + format + "', ";
      if (!filterFP) {
        fp = 1;
        ch = '';
      } else {
        fp = 0;
        ch = 'checked';
      }
      crumbs += fp + ')" ' + ch + '></input></div>';
      crumbs += '</ul>';

      var table = "<table id='scansummary-content' class='table table-bordered table-striped small'>";
      table += '<thead><tr> <th>Unique Data Element</th><th>Occurrences</th></tr></thead><tbody>';
      for (var i = 0; i < data.length; i++) {
        table += "<tr><td><pre class='table-border-bg-inherit'>";
        table += sf.replace_sfurltag(data[i][0]);
        table += '</pre></td><td>' + data[i][2] + '</td>';
        table += '</tr>';
      }
      table += '</tbody></table>';
      $('#loader').fadeOut(500);
      $('#mainbody').append(crumbs + table);
    });
  }

  if (format.indexOf('viz') == 0) {
    $('#btn-vizview').addClass('active');
    $('#btn-fullview').removeClass('active');
    $('#btn-uniqueview').removeClass('active');

    if (format.indexOf('viz-bubble') == 0) {
      sf.fetchData('${docroot}/scaneventresults', {id: instanceId, eventType: eventType}, function (data) {
        var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + '");\'>Browse</a>';
        crumbs += " <span class='divider'>;</span></li> <li><a class='link' onClick=";
        crumbs += '\'browseEventData("' + instanceId + '","' + eventTypeLabel + '","' + eventType + '","' + format + '");\'>';
        crumbs += unescape(eventTypeLabel) + '</a></li></ul>';
        itemList = [];
        for (var i = 0; i < data.length; i++) {
          if (format == 'viz-bubble-source') {
            itemList.push(sf.remove_sfurltag(data[i][2]));
          }
          if (format == 'viz-bubble-data') {
            itemList.push(sf.remove_sfurltag(data[i][1]));
          }
        }
        $('#loader').fadeOut(500);
        $('#mainbody').append(crumbs + "<div id='scansummary-content' class='text-center'></div>");
        sf_viz_bubble('#scansummary-content', itemList);
      });
    }

    if (format == 'viz-dendro') {
      sf.fetchData('${docroot}/scanelementtypediscovery', {id: instanceId, eventType: eventType}, function (data) {
        var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + '");\'>Browse</a>';
        crumbs += " <span class='divider'></span></li> <li><a class='link' onClick=";
        crumbs += '\'browseEventData("' + instanceId + '","' + eventTypeLabel + '","' + eventType + '","' + format + '");\'>';
        crumbs += unescape(eventTypeLabel) + '</a></li></ul>';

        $('#loader').fadeOut(500);
        $('#mainbody').append(crumbs + "<div id='scansummary-content' class='text-center'></div>");
        sf_viz_dendrogram('#scansummary-content', data);
      });
    }
  }
}

function downloadLogs(instanceId) {
  $('#loader').show();
  sf.log('Loading logs for scan: ' + instanceId);
  var efr = document.getElementById('exportframe');
  var urlBase = '${docroot}/scanexportlogs?id=';
  efr.src = urlBase + instanceId;
  $('#loader').fadeOut(500);
}

// Download the data currently being viewed
function exportEventData(instanceId, eventType, fileType) {
  $('#loader').show();
  var efr = document.getElementById('exportframe');
  if (currentSection == 'btn-search') {
    if (lastSearchType == null || lastSearchType == 'ALL') {
      type = '';
    } else {
      type = lastSearchType;
    }
    if (fileType == 'excel') {
      var urlBase = '${docroot}/scansearchresultexport?filetype=excel&id=';
    } else {
      var urlBase = '${docroot}/scansearchresultexport?id=';
    }
    efr.src = urlBase + instanceId + '&eventType=' + type + '&value=' + lastSearchQuery;
  }

  if (currentSection == 'btn-browse') {
    if (fileType == 'excel') {
      var urlBase = '${docroot}/scaneventresultexport?filetype=excel&id=';
    } else {
      var urlBase = '${docroot}/scaneventresultexport?id=';
    }
    efr.src = urlBase + instanceId + '&type=' + eventType;
  }

  if (currentSection == 'btn-graph') {
    sf.log('Loading visualisation for scan: ' + instanceId);
    efr.src = '${docroot}/scanviz?id=' + instanceId + '&gexf=1';
  }

  $('#loader').fadeOut(500);
}

// View the configuration that was used for this scan
function viewScanConfig(instanceId) {
  $('#scansummary-content').remove();
  $('#scanlogs-content').remove();
  $('#loader').show();
  $('#btn-export').hide();
  $('#btn-download-logs').hide();
  $('#btn-refresh').show();
  $('#btn-search').hide();
  $('#scanreminder').hide();
  navTo('btn-info');
  refresh = function () {
    viewScanConfig(instanceId);
  };
  sf.fetchData('${docroot}/scanopts', {id: instanceId}, function (data) {
    table = "<div id='scansummary-content'>";
    table += '<h4>Meta Information</h4>';
    table += "<table class='table table-bordered table-striped'>";
    table += '<tr><td>Name:</td><td>' + data['meta'][0] + '</td></tr>';
    table += '<tr><td>Internal ID:</td><td>${id}</td></tr>';
    table += '<tr><td>Target:</td><td>' + data['meta'][1] + '</td></tr>';
    table += '<tr><td>Started:</td><td>' + data['meta'][3] + '</td></tr>';
    table += '<tr><td>Completed:</td><td>' + data['meta'][4] + '</td></tr>';
    table += '<tr><td>Status:</td><td>' + data['meta'][5] + '</td></tr>';
    table += '</table>';
    table += '<h4>Global Settings</h4>';
    table += "<table class='table table-bordered table-striped' style='table-layout: fixed'>";
    table += '<thead><tr><th>Option</th><th>Value</th></tr></thead><tbody>';
    for (var key in data['config']) {
      if (key.indexOf(':') > 0) {
        continue;
      }
      table += '<tr><td width=100%>' + data['configdesc'][key] + '</td><td>' + data['config'][key] + '</td></tr>';
    }
    table += '</table>';
    table += '<h4>Module Settings</h4>';
    table += "<div class='table-responsive'><table class='table table-bordered table-striped' style='table-layout: fixed'>";
    table += '<thead><tr><th>Module</th> <th>Option</th> <th>Value</th></tr></thead><tbody>';
    keys = [];
    for (var key in data['config']) {
      keys.push(key);
    }
    keys_s = keys.sort();

    for (var i = 0; i < keys_s.length; i++) {
      key = keys_s[i];
      if (key.indexOf(':') > 0) {
        bits = key.split(':');
        table += '<tr><td>' + bits[0] + '</td><td>' + data['configdesc'][key] + '</td><td>' + data['config'][key] + '</td></tr>';
      }
    }
    table += '</table></div></div>';

    $('#loader').fadeOut(500);
    $('#mainbody').append(table);
  });
}

if ('${status}' == 'CREATED' || '${status}' == 'RUNNING' || '${status}' == 'STARTING' || '${status}' == 'STARTED' || '${status}' == 'UNKNOWN' || '${status}' == 'INITIALIZING') {
  scanSummaryView('${id}');
} else {
  browseEventList('${id}');
}

var refreshSummaryInterval;

refreshSummary = function () {
  var status = document.getElementById('scanstatusbadge').innerHTML;

  if (status == 'ERROR-FAILED' || status == 'FINISHED' || status == 'ABORTED') {
    sf.log('Scan is ' + status);
    clearInterval(refreshSummaryInterval);
    return;
  }

  sf.log('Scan is ' + status + '. Refreshing scan summary ...');

  for (var i = 0; i < dataloaders.length; i++) {
    if (!loadersrunning) {
      loadersrunning = true;
      dataloaders[i]();
      loadersrunning = false;
    }
  }
};

refreshSummaryInterval = setInterval(refreshSummary, 5000);
