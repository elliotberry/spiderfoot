/* Scan info page UI (vanilla JS, no jQuery).
 * Expects globals: docroot, scanInfoId, scanInfoStatus
 */
var currentType = "ALL";
var currentTypeName = "All";
var currentSection = "btn-browse";
var lastSearchType = "ALL";
var lastSearchQuery = "";
var dataloaders = [];
var sharedSigma = "";
var loadersrunning = false;
var refresh = function() { browseEventList(scanInfoId); }
if (window.sfBootstrap) { sfBootstrap.popover(sf.el('searchvalue'), {trigger: 'focus', placement: 'bottom'}); }
var searchvalueEl = sf.el('searchvalue');
if (searchvalueEl) {
    searchvalueEl.addEventListener('keyup', function(event) {
        if (event.keyCode == 13) {
            var btn = sf.el('searchbutton');
            if (btn) btn.click();
        }
    });
}

function switchSelectAll() {
    var checkall = sf.el('checkall');
    var checked = checkall && checkall.checked;
    sf.qsa('input[id*=cb_]').forEach(function(obj) { obj.checked = checked; });
}

function getSelected() {
    ids = [];
    sf.qsa('input[id*=cb_]').forEach(function(obj) {
        if (obj.checked) {
            ids.push(obj.id.replace("cb_", ""));
        }
    });
    return ids;
}

function setFp(flag) {
    sel = getSelected();
    if (sel.length == 0) {
        alertify.error("You need to select at least one record.");
        return false;
    }
    data = JSON.stringify(sel);
    sf.show('#loader');
    sf.fetchData(docroot + '/resultsetfp', {'id': scanInfoId, 'fp': flag, 'resultids': data }, function(ret) {
        sf.hide('#loader');
        if (ret[0] == "SUCCESS") {
            refresh();
            return;
        }
        if (ret[0] == "WARNING") {
            alertify.error(ret[1]);
            return;
        }
        if (ret[0] == "ERROR") {
            alertify.error("There was an error setting false positives because: " + ret[1] + "<br/>If you believe this to be an error, please log out and log back in, and if the problem repeats, report this as a bug.");
        }
    });
}

function navTo(target) {
    var targets = [ "btn-browse", "btn-info", "btn-log", 
        "btn-export", "btn-download-logs", "btn-viz",
        "btn-status", "btn-graph", "btn-correlations" ]
    for (var i = 0; i < targets.length; i++) {
        if (targets[i] == target) {
            sf.addClass(targets[i], "active");
        } else {
            sf.removeClass(targets[i], "active");
        }
    }

    sf.remove('#breadcrumbs');
    sf.hide('#customtabview');
    sf.hide('#customvizview');
    sf.hide('#modifyactions');
    currentSection = target
    dataloaders = []
}

function searchDirector(instanceId) {
    qry = (sf.el('#searchvalue') ? sf.el('#searchvalue').value : '');
    if (currentType == "ALL") {
        searchResults(instanceId, qry);
    } else {
        searchResults(instanceId, qry, currentType);
    }
}

function searchResults(instanceId, query, typeName) {
    // Remove pre-existing tables if they exist
    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    navTo("btn-search");
    sf.hide('#modifyactions');
    sf.show('#loader');
    sf.show('#btn-export');
    sf.hide('#btn-download-logs');
    sf.show('#btn-refresh');
    sf.show('#btn-search');
    sf.hide('#scanreminder');
    refresh = function() { searchResults(instanceId, query, typeName); }
    sf.search(instanceId, query, typeName, function(data) {
                    lastSearchType = typeName;
                    lastSearchQuery = query;
                    var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + "\");'>Browse</a>";
                    crumbs += " <span class='divider'></span></li>";
                    if (typeName != null) {
                        crumbs += " <li><a class='link' onClick=";
                        crumbs += "'browseEventData(\"" + instanceId + "\",\"" + currentTypeName + "\",\"" + typeName + "\",\"full\");'>";
                        crumbs += unescape(currentTypeName) + "</a><span class='divider'></span></li>";
                    }
                    crumbs += "<li>Search results";
                    crumbs += " (" + data.length + " records)</li></ul>";

                    if (data.length == 0) {
                        var table = "<div id='scansummary-content'>&nbsp;&nbsp;No results found. Try broadening your search criteria.</div>";
                    } else {
                        var table = "<table id='scansummary-content' class='table table-bordered table-striped small tablesorter'><thead><tr>";
                        if (typeName == null) {
                            table += "<th class='sorter-false'>Data Element Type</th>";
                        }
                        table += "<th>Data Element</th><th>Source Data Element</th><th>Source Module</th><th>Identified</th></tr></thead><tbody>";
                        for (var i = 0; i < data.length; i++) {
                            table += "<tr>";
                            if (typeName == null) {
                                table += "<td><pre class='table-border-bg-inherit'>" + data[i][8] + "</pre></td>";
                            }
                            table += "<td><pre class='table-border-bg-inherit'>";
                            table += sf.replace_sfurltag(data[i][1]);
                            // for debug
                            table += "</pre></td><td><pre class='table-border-bg-inherit'>";
                            table += sf.replace_sfurltag(data[i][2]);
                            table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][3];
                            table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][0];
                            table += "</pre></td>";
                            table += "</tr>";
                        }
                        table += "</tbody></table>"
                    }
                    sf.fadeOut('#loader', 500);
                    sf.appendHtml('#mainbody', crumbs + table);
                    sfTable.init(sf.el('scansummary-content'));
    });
}

// Visualisation
function graphEvents(instanceId) {
    grid = "<div id='scansummary-content'><br />"
    grid += "<div class='col-md-12 graph-container' id='graph-container'></div>"
    grid += "</div>"

    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    sf.show('#loader');
    sf.show('#btn-export');
    sf.hide('#btn-download-logs');
    sf.show('#btn-refresh');
    sf.hide('#btn-search');
    sf.show('#btn-graph');
    sf.hide('#scanreminder');
    refresh = function() { graphEvents(instanceId); }
    navTo("btn-graph");
    sf.show('#customvizview');
    sf.appendHtml('#mainbody', grid);
    sf.removeClass('#btn-forceatlas', "active");
    sf.addClass('#btn-random', "active");

    sigma.renderers.def = sigma.renderers.canvas
    sigma.parsers.json(docroot + "/scanviz?id=" + instanceId + "&gexf=0", {
        container: 'graph-container'
    }, function(s) { 
        if (s.renderers[0].nodesOnScreen.length == 0) {
            sf.appendHtml('#graph-container', "<div class='alert alert-danger'>Insufficient data to produce a graph.</div>");
            sf.hide('#loader');
            return;
        }
        sharedSigma = s;
        s.settings({
            edgeColor: 'default',
            defaultEdgeColor: '#aaa',
            maxNodeSize: 5
        });
        sigma.plugins.dragNodes(s, s.renderers[0])
        s.refresh()
        sf.hide('#loader');
    });
}

function vizUpdate(method) {
    s = sharedSigma
    if (method == "force") {
        sf.addClass('#btn-forceatlas', "active");
        sf.removeClass('#btn-random', "active");
        s.startForceAtlas2();
        s.refresh();
        setTimeout(function() { s.stopForceAtlas2() }, 5000);
    }

    if (method == "random") {
        sf.removeClass('#btn-forceatlas', "active");
        sf.addClass('#btn-random', "active");
        refresh();
    }

    if (method == "download") {
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
    grid += "</div></div></div></div>";
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
    grid += "</div></div></div></div></div>";
    grid += "<div class='row'><div class='col-sm-12'>";
    grid += "<div class='panel panel-default'>";
    grid += "<div class='panel-heading'><i class='glyphicon glyphicon-stats'></i>&nbsp;&nbsp;Data Types</div><div class='panel-body'>";
    grid += "<div id='vbarsummary'></div>";
    grid += "</div></div></div></div>";

    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    sf.show('#loader');
    sf.hide('#btn-export');
    sf.hide('#btn-download-logs');
    sf.hide('#btn-refresh');
    sf.hide('#btn-search');
    sf.show('#scanreminder');
    navTo("btn-status");

    sf.appendHtml('#mainbody', grid);

    // Collect data and populate variables for use later
    dataloaders.push(
        function() {
            sf.fetchData(docroot + '/scanstatus', {'id': instanceId}, function(data) {
                scanName = data[0];
                scanTarget = data[1];
                scanStarted = data[2];
                scanEnded = data[4];
                scanStatus = data[5];
                scanCorrelations = data[6];

                sf.setHtml('#corr-high', scanCorrelations['HIGH']);
                sf.setHtml('#corr-medium', scanCorrelations['MEDIUM']);
                sf.setHtml('#corr-low', scanCorrelations['LOW']);
                sf.setHtml('#corr-info', scanCorrelations['INFO']);
            });
        }
    );

    dataloaders.push(
        function() {
            sf.fetchData(docroot + '/scanerrors', {'id': instanceId}, function(data) {
                sf.setHtml('#errors', data.length);
            });
        }
    );

    dataloaders.push(
        function() {
            sf.fetchData(docroot + '/scansummary', {'id': instanceId, 'by': 'type'}, function(data) {
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
                    scanSummary[i].link = function(d) { return browseEventData(d.scanId, d.name, d.id, "full"); };
                    totalCount += data[i][3];
                    uniqueCount += data[i][4];
                    scanStatus = data[i][5];
                }

                for (x = 0; x < i; x++) {
                    scanSummary[x].pct = scanSummary[x].counter / uniqueCount;
                }

                sf.setHtml('#ucounter', uniqueCount);
                sf.setHtml('#tcounter', totalCount);
                sf.setHtml('#scanstatusbadge', scanStatus);

                var statusy = "";
                if (scanStatus == "FINISHED") {
                    statusy = "alert-success";
                } else if (scanStatus.indexOf("ABORT") >= 0) {
                    statusy = "alert-warning";
                } else if (scanStatus == "CREATED" || scanStatus == "RUNNING" || scanStatus == "STARTED" || scanStatus == "STARTING" || scanStatus == "INITIALIZING") {
                    statusy = "alert-info";
                } else if (scanStatus.indexOf("FAILED") >= 0) {
                    statusy = "alert-danger";
                } else {
                    statusy = "alert-info";
                }
                sf.removeClass('#scanstatusbadge', ["alert-info", "alert-warning", "alert-danger", "alert-success"]);
                sf.addClass('#scanstatusbadge', statusy);
                sf.setHtml('#status', scanStatus);
                sf.empty('#vbarsummary');
                if (scanSummary.length == 0) {
                  sf.appendHtml('#vbarsummary', "<div id='scansummary-content' class='alert alert-warning'><h4>No data.</h4>If the scan is still running this section will update shortly.</div>");
                } else {
                  sf_viz_vbar("#vbarsummary", scanSummary);
                }
                sf.fadeOut('#loader', 500);
            });
        }
    );

    loadersrunning = true;
    for (var i = 0; i < dataloaders.length; i++) {
        dataloaders[i]();
    }
    loadersrunning = false;
}

// Expand the correlation list to show the events associated
function toggleCorrelation(instanceId, correlationId) {
    if (!sf.el("corrwell_tr_" + correlationId).classList.contains("hidden")) {
        sf.empty("corrwell_td_" + correlationId);
        sf.addClass("corrwell_tr_" + correlationId, "hidden");
        return;
    }
    sf.fetchData(docroot + '/scaneventresults', { 'id': instanceId, 'correlationId': correlationId }, function(data) {
        var table = "<table id='corrcontent_'" + correlationId + "' class='table table-bordered table-striped small'>";
        table += "<thead><tr>";
        table += "<th>Data Element</th></th>";
        table += "<th>Source Data Element</th>";
        table += "<th>Source Module</th>";
        table += "<th>Identified</th>";
        table += "</tr></thead><tbody>";

        for (var i = 0; i < data.length; i++) {
            table += "<tr>";
            table += "<td><pre class='table-border-bg-inherit'>";
            table += sf.replace_sfurltag(data[i][1]);
            table += "</pre></td><td><pre class='table-border-bg-inherit'>";
            table += sf.replace_sfurltag(data[i][2]);
            table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][3];
            table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][0];
            table += "</pre></td>";
            table += "</tr>";
        }
        table += "</tbody></table>"
        sf.prependHtml("corrwell_td_" + correlationId, table);
        sf.removeClass("corrwell_tr_" + correlationId, "hidden");
    });
}

// Correlation results for the scan
function browseCorrelations(instanceId) {
    sf.remove('#scansummary-content');
    sf.show('#loader');
    sf.hide('#btn-search');
    sf.hide('#btn-export');
    sf.hide('#scanreminder');
    navTo("btn-correlations");
    refresh = function() { browseCorrelations(instanceId); }
    sf.fetchData(docroot + '/scancorrelations', {'id': instanceId}, function(data) {
        if (data.length == 0) {
            table = "<div id='scansummary-content' class='alert alert-warning'><h4>No correlations.</h4>If the scan is still running please reload once it has completed.</div>";
            sf.fadeOut('#loader', 500);
            sf.appendHtml('#mainbody', table);
            sf.updateTooltips();
            return;
        }
        var table = "<table id='scansummary-content' class='table table-bordered table-striped table-condensed tablesorter small'>";
        table += "<thead><tr><th>Correlation</th><th>Risk</th><th>Data Elements</th></tr></thead><tbody>";
        for (var i = 0; i < data.length; i++) {
            table += "<tr>";
            table += "<td><a style='cursor: pointer' onClick='toggleCorrelation(\"" + instanceId + "\",\"" + data[i][0] + "\")'>" + data[i][1] + "</a>&nbsp;&nbsp;";
            table += "<i class='glyphicon glyphicon-question-sign' style='color: #ccc' rel='tooltip' data-title=\"" + data[i][5] + "\"></i>";
            table += "</td>";
            if (data[i][3] == "HIGH") {
                statusy = "alert-danger";
            }
            if (data[i][3] == "MEDIUM") {
                statusy = "alert-warning";
            }
            if (data[i][3] == "LOW") {
                statusy = "alert-info";
            }
            if (data[i][3] == "INFO") {
                statusy = "alert-success";
            }
            table += "<td><span class='badge " + statusy + "'>" + data[i][3] + "</span></td>";
            table += "<td>" + data[i][7] + "</td>";
            table += "</tr><tr class='hidden' id='corrwell_tr_" + data[i][0] + "'><td colspan=3 id='corrwell_td_" + data[i][0] + "'></td></tr>";
        }
        table += "</tbody></table>";
        sf.fadeOut('#loader', 500);
        sf.appendHtml('#mainbody', table);
        sfTable.init(sf.el('scansummary-content'), { headers: { 1: { sorter: 'criticality' } } });
        sf.updateTooltips();
    });
}

// Logs for the scan
function viewScanLog(instanceId) {
    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    sf.show('#loader');
    sf.hide('#btn-search');
    sf.hide('#btn-export');
    sf.show('#btn-download-logs');
    sf.hide('#scanreminder');
    navTo("btn-log");
    refresh = function() { viewScanLog(instanceId); }
    sf.fetchData(docroot + '/scanlog', {'id': instanceId}, function(data) {
                    var table = "<table id='scanlogs-content' class='table table-bordered table-striped table-condensed small tablesorter' style='table-layout: fixed'>";
                    table += "<thead><tr><th>Time</th><th>Component</th><th>Type</th><th>Event</th></tr></thead><tbody>";
                    for (var i = 0; i < data.length; i++) {
                        if (data[i][2] == "ERROR") {
                          table += "<tr class='danger'>";
                        } else {
                          table += "<tr>";
                        }
                        table += "<td>" + data[i][0] + "</a></td>";
                        table += "<td>" + data[i][1] + "</td>";
                        table += "<td>" + data[i][2] + "</td>";
                        table += "<td>" + data[i][3] + "</td>";
                        table += "</tr>";
                    }
                    table += "</tbody></table>";
                    sf.fadeOut('#loader', 500);
                    sf.appendHtml('#mainbody', table);
                    sfTable.init(sf.el('scanlogs-content'), {widgets: ['filter'], widgetOptions: {filter_searchDelay: 300}});
    });
}

// Summary of event types and counts for a scan
function browseEventList(instanceId) {
    currentType = "ALL";
    currentTypeName = "All";

    // Remove pre-existing tables if they exist
    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    navTo("btn-browse");
    sf.show('#loader');
    sf.show('#btn-export');
    sf.hide('#btn-download-logs');
    sf.show('#btn-refresh');
    sf.show('#btn-search');
    sf.hide('#scanreminder');
    refresh = function() { browseEventList(instanceId); }
    sf.fetchData(docroot + '/scansummary', {'id': instanceId, 'by': 'type'}, function(data) {
                    var table = "<table id='scansummary-content' class='table table-bordered table-striped tablesorter'>";
                    table += "<thead><tr> <th>Type</th><th>Unique Data Elements</th> <th>Total Data Elements</th><th>Last Data Element</th></tr></thead><tbody>";
                    for (var i = 0; i < data.length; i++) {
                        table += "<tr><td><a class='link' onClick='";
                        table += "browseEventData(\"" + scanInfoId + "\", \"" + escape(data[i][1]) + "\", \"" + data[i][0] + "\", \"full\");'>";
                        table += data[i][1] + "</a></td>";
                        table += "<td>" + data[i][4] + "</td>";
                        table += "<td>" + data[i][3] + "</td>";
                        table += "<td>" + data[i][2] + "</td>";
                    }
                    table += "</tbody></table>"

                    if (data.length < 1) {
                        table = "<div id='scansummary-content' class='alert alert-warning'><h4>No data.</h4>If the scan is still running please try again soon.</div>";
                    }

                    sf.fadeOut('#loader', 500);
                    sf.appendHtml('#mainbody', table);
                    sfTable.init(sf.el('scansummary-content'));
    });
}

// Detailed view of data for an event type for a scan
function browseEventData(instanceId, eventTypeLabel, eventType, format, filterFP) {
    if (filterFP === 'undefined') {
        filterFP = false;
    }
    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    sf.remove('#breadcrumbs');
    sf.show('#loader');
    navTo("btn-browse");
    sf.show('#btn-export');
    sf.hide('#btn-download-logs');
    sf.show('#btn-refresh');
    sf.show('#btn-search');
    sf.show('#customtabview');
    sf.hide('#scanreminder');
    currentType = eventType;
    currentTypeName = eventTypeLabel;
    refresh = function() { browseEventData(instanceId, eventTypeLabel, eventType, format, filterFP); }
    browseUpdate = function(newformat) { browseEventData(instanceId, eventTypeLabel, eventType, newformat, filterFP); }

    if (format == 'full') {
        sf.addClass('#btn-fullview', "active");
        sf.removeClass('#btn-uniqueview', "active");
        sf.removeClass('#btn-vizview', "active");
        sf.show('#modifyactions');
        sf.fetchData(docroot + '/scaneventresults', {'id': instanceId, 'eventType': eventType }, function(data) {
                    totalcount = 0;
                    fpcount = 0;
                    for (var i = 0; i < data.length; i++) {
                        totalcount++;
                        if (data[i][8] == "1") {
                            fpcount++;
                        }
                    }
                    var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + "\");'>Browse</a>";
                    crumbs += " <span class='divider'></span></li> <li><a class='link' onClick=";
                    crumbs += "'browseEventData(\"" + instanceId + "\",\"" + eventTypeLabel + "\",\"" + eventType + "\",\"";
                    crumbs += format + "\", " + filterFP + ");'>";
                    crumbs += unescape(eventTypeLabel) + "</a></li>";
                    if (fpcount > 0) {
                        crumbs += "<div class='pull-right text-center'><i class='glyphicon glyphicon-ban-circle'></i>&nbsp;&nbsp;Hide " + fpcount + " False Positives: ";
                        crumbs += "<input class='vertical-align-top' type='checkbox' ";
                        crumbs += "onClick=\"browseEventData('" + instanceId + "', '" + eventTypeLabel +"', '" + eventType + "'";
                        crumbs += ",'" + format + "', ";
                        if (!filterFP) {
                            fp = 1;
                            ch = "";
                        } else {
                            fp = 0;
                            ch = "checked";
                        }
                        crumbs += fp + ")\" " + ch + "></input></div>";
                    }
                    crumbs += "</ul>";

                    var table = "<table id='scansummary-content' class='table table-bordered table-striped small tablesorter'>";
                    table += "<thead><tr>";
                    table += "<th class='text-center'><input id='checkall' type='checkbox' onClick='switchSelectAll()'></th>";
                    table += "<th>Data Element</th></th>";
                    table += "<th>Source Data Element</th>";
                    table += "<th>Source Module</th>";
                    table += "<th>Identified</th>";
                    table += "</tr></thead><tbody>";

                    for (var i = 0; i < data.length; i++) {
                        if (filterFP && data[i][8] == "1") {
                            continue;
                        }
                        table += "<tr>";
                        table += "<td class='text-center'><input type='checkbox' id='cb_" + data[i][7] + "'>";
                        if (data[i][8] == "1") {
                            table += "<br /><i class='glyphicon glyphicon-ban-circle' class='vertical-align-bottom' />";
                        }
                        table += "</td>";
                        table += "<td><pre class='table-border-bg-inherit'>";
                        //table += "<a href=docroot + '/entityinfo?id=" + data[i][7] + "'>" + data[i][1] + "</a>";
                        table += sf.replace_sfurltag(data[i][1]);
                        table += "</pre></td><td><pre class='table-border-bg-inherit'>";
                        table += sf.replace_sfurltag(data[i][2]);
                        table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][3];
                        table += "</pre></td><td><pre class='table-border-bg-inherit'>" + data[i][0];
                        table += "</pre></td>";
                        table += "</tr>";
                    }
                    table += "</tbody></table>"
                    sf.fadeOut('#loader', 500);
                    sf.appendHtml('#mainbody', crumbs + table);
                    sfTable.init(sf.el('scansummary-content'), { headers: { 0: { sorter: false } } });
                    lastChecked = null;
                    var chkboxes = sf.qsa('input[id*=cb_]');
                    chkboxes.forEach(function(box) {
                        box.addEventListener('click', function(e) {
                            if (!lastChecked) {
                                lastChecked = this;
                                return;
                            }
                            if (e.shiftKey) {
                                var start = chkboxes.indexOf(this);
                                var end = chkboxes.indexOf(lastChecked);
                                var min = Math.min(start, end);
                                var max = Math.max(start, end);
                                for (var ci = min; ci <= max; ci++) {
                                    chkboxes[ci].checked = lastChecked.checked;
                                }
                            }
                            lastChecked = this;
                        });
                    });

        });
    }

    if (format == 'unique') {
        sf.addClass('#btn-uniqueview', "active");
        sf.removeClass('#btn-fullview', "active");
        sf.removeClass('#btn-vizview', "active");
        if (filterFP == "0") {
            filterFP = null;
        }
        sf.fetchData(docroot + '/scaneventresultsunique', {'id': instanceId, 'eventType': eventType, 'filterfp': filterFP }, function(data) {
                    var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + "\");'>Browse</a>";
                    crumbs += " <span class='divider'></span></li> <li><a class='link' onClick=";
                    crumbs += "'browseEventData(\"" + instanceId + "\",\"" + eventTypeLabel + "\",\"" + eventType + "\",\"" + format;
                    crumbs += "\", " + filterFP + ");'>";
                    crumbs += unescape(eventTypeLabel) + "</a></li>";
                    crumbs += "<div class='pull-right text-center'><i class='glyphicon glyphicon-ban-circle'></i>&nbsp;&nbsp;&nbsp;&nbsp;Hide False Positives: ";
                    crumbs += "<input class='vertical-align-top' type='checkbox' ";
                    crumbs += "onClick=\"browseEventData('" + instanceId + "', '" + eventTypeLabel +"', '" + eventType + "'";
                    crumbs += ",'" + format + "', ";
                    if (!filterFP) {
                        fp = 1;
                        ch = "";
                    } else {
                        fp = 0;
                        ch = "checked";
                    }
                    crumbs += fp + ")\" " + ch + "></input></div>";
                    crumbs += "</ul>";

                    var table = "<table id='scansummary-content' class='table table-bordered table-striped small'>";
                    table += "<thead><tr> <th>Unique Data Element</th><th>Occurrences</th></tr></thead><tbody>";
                    for (var i = 0; i < data.length; i++) {
                        table += "<tr><td><pre class='table-border-bg-inherit'>";
                        table += sf.replace_sfurltag(data[i][0]);
                        table += "</pre></td><td>" + data[i][2] + "</td>";
                        table += "</tr>";
                    }
                    table += "</tbody></table>"
                    sf.fadeOut('#loader', 500);
                    sf.appendHtml('#mainbody', crumbs + table);
        });
    }

    if (format.indexOf('viz') == 0) {
        sf.addClass('#btn-vizview', "active");
        sf.removeClass('#btn-fullview', "active");
        sf.removeClass('#btn-uniqueview', "active");

        if (format.indexOf("viz-bubble") == 0) {
            sf.fetchData(docroot + '/scaneventresults', {'id': instanceId, 'eventType': eventType }, function(data) {
                var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + "\");'>Browse</a>";
                crumbs += " <span class='divider'>;</span></li> <li><a class='link' onClick=";
                crumbs += "'browseEventData(\"" + instanceId + "\",\"" + eventTypeLabel + "\",\"" + eventType + "\",\"" + format + "\");'>";
                crumbs += unescape(eventTypeLabel) + "</a></li></ul>";
                itemList = []
                for (var i = 0; i < data.length; i++) {
                    if (format == "viz-bubble-source") {
                        itemList.push(sf.remove_sfurltag(data[i][2]));
                    }
                    if (format == "viz-bubble-data") {
                        itemList.push(sf.remove_sfurltag(data[i][1]));
                    }
                }
                sf.fadeOut('#loader', 500);
                sf.appendHtml('#mainbody', crumbs + "<div id='scansummary-content' class='text-center'></div>");
                sf_viz_bubble("#scansummary-content", itemList)
            });
        }

        if (format == "viz-dendro") {
            sf.fetchData(docroot + "/scanelementtypediscovery", {'id': instanceId, 'eventType': eventType }, function(data) {
                var crumbs = " <ul class='breadcrumb' id='breadcrumbs'> <li><a class='link' onClick='browseEventList(\"" + instanceId + "\");'>Browse</a>";
                crumbs += " <span class='divider'></span></li> <li><a class='link' onClick=";
                crumbs += "'browseEventData(\"" + instanceId + "\",\"" + eventTypeLabel + "\",\"" + eventType + "\",\"" + format + "\");'>";
                crumbs += unescape(eventTypeLabel) + "</a></li></ul>";

                sf.fadeOut('#loader', 500);
                sf.appendHtml('#mainbody', crumbs + "<div id='scansummary-content' class='text-center'></div>");
                sf_viz_dendrogram("#scansummary-content", data);
            });
        }
    }
}

function downloadLogs(instanceId) {
    sf.show('#loader');
    sf.log("Loading logs for scan: " + instanceId);
    var efr = document.getElementById('exportframe');
    var urlBase = docroot + '/scanexportlogs?id=';
    efr.src = urlBase + instanceId;
    sf.fadeOut('#loader', 500);
}

// Download the data currently being viewed
function exportEventData(instanceId, eventType, fileType) {
    sf.show('#loader');
    var efr = document.getElementById('exportframe');
    if (currentSection == "btn-search") {
        if (lastSearchType == null || lastSearchType == "ALL") {
            type = "";
        } else {
            type = lastSearchType;
        }
        if (fileType == "excel") {
            var urlBase = docroot + '/scansearchresultexport?filetype=excel&id=';
        } else {
            var urlBase = docroot + '/scansearchresultexport?id=';
        }
        efr.src = urlBase + instanceId + '&eventType=' + type + "&value=" + lastSearchQuery;
    }

    if (currentSection == "btn-browse") {
        if (fileType == "excel") {
            var urlBase = docroot + '/scaneventresultexport?filetype=excel&id=';
        } else {
            var urlBase = docroot + '/scaneventresultexport?id=';
        }
        efr.src = urlBase + instanceId + '&type=' + eventType;
    }

    if (currentSection == "btn-graph") {
        sf.log("Loading visualisation for scan: " + instanceId);
        efr.src = docroot + '/scanviz?id=' + instanceId + '&gexf=1';
    }

    sf.fadeOut('#loader', 500);
}

// View the configuration that was used for this scan
function viewScanConfig(instanceId) {
    sf.remove('#scansummary-content');
    sf.remove('#scanlogs-content');
    sf.show('#loader');
    sf.hide('#btn-export');
    sf.hide('#btn-download-logs');
    sf.show('#btn-refresh');
    sf.hide('#btn-search');
    sf.hide('#scanreminder');
    navTo("btn-info");
    refresh = function() { viewScanConfig(instanceId); }
    sf.fetchData(docroot + '/scanopts', {'id': instanceId}, function(data) {
        table = "<div id='scansummary-content'>";
        table += "<h4>Meta Information</h4>";
        table += "<table class='table table-bordered table-striped'>";
        table += "<tr><td>Name:</td><td>" + data['meta'][0] + "</td></tr>";
        table += "<tr><td>Internal ID:</td><td>" + scanInfoId + "</td></tr>";
        table += "<tr><td>Target:</td><td>" + data['meta'][1] + "</td></tr>";
        table += "<tr><td>Started:</td><td>" + data['meta'][3] + "</td></tr>";
        table += "<tr><td>Completed:</td><td>" + data['meta'][4] + "</td></tr>";
        table += "<tr><td>Status:</td><td>" + data['meta'][5] + "</td></tr>";
        table += "</table>";
        table += "<h4>Global Settings</h4>";
        table += "<table class='table table-bordered table-striped' style='table-layout: fixed'>";
        table += "<thead><tr><th>Option</th><th>Value</th></tr></thead><tbody>";
        for (var key in data['config']) {
            if (key.indexOf(":") > 0) {
                continue;
            }
            table += "<tr><td width=100%>" + data['configdesc'][key] + "</td><td>" + data['config'][key] + "</td></tr>";
        }
        table += "</table>";
        table += "<h4>Module Settings</h4>";
        table += "<div class='table-responsive'><table class='table table-bordered table-striped' style='table-layout: fixed'>";
        table += "<thead><tr><th>Module</th> <th>Option</th> <th>Value</th></tr></thead><tbody>";
        keys = [];
        for (var key in data['config']) {
            keys.push(key);
        }
        keys_s = keys.sort();

        for (var i = 0; i < keys_s.length; i++) {
            key = keys_s[i];
            if (key.indexOf(":") > 0) {
                bits = key.split(":");
                table += "<tr><td>" + bits[0] + "</td><td>" + data['configdesc'][key] + "</td><td>" + data['config'][key] + "</td></tr>";
            }
        }
        table += "</table></div></div>";

        sf.fadeOut('#loader', 500);
        sf.appendHtml('#mainbody', table);
    });
}

if (scanInfoStatus == "CREATED" || scanInfoStatus == "RUNNING" || scanInfoStatus == "STARTING" || scanInfoStatus == "STARTED" || scanInfoStatus == "UNKNOWN" || scanInfoStatus == "INITIALIZING") {
    scanSummaryView(scanInfoId);
} else {
    browseEventList(scanInfoId);
}

var refreshSummaryInterval;

refreshSummary = function() {
    var status = document.getElementById("scanstatusbadge").innerHTML;

    if (status == "ERROR-FAILED" || status == "FINISHED" || status == "ABORTED") {
        sf.log("Scan is " + status);
        clearInterval(refreshSummaryInterval);
        return;
    }

    sf.log("Scan is " + status + ". Refreshing scan summary ...");

    for (var i = 0; i < dataloaders.length; i++) {
        if (!loadersrunning) {
            loadersrunning = true;
            dataloaders[i]();
            loadersrunning = false;
        }
    }
}

refreshSummaryInterval = setInterval(refreshSummary, 5000);
