//-------------------------------------------------------------------------------
// Name:         spiderfoot.js
// Purpose:      All the javascript code for the spiderfoot aspects of the UI.
//
// Author:      Steve Micallef <steve@binarypool.com>
//
// Created:     03/10/2012
// Copyright:   (c) Steve Micallef 2012
// Licence:     MIT
//-------------------------------------------------------------------------------

function __$styleInject(e) {
  if (e && 'undefined' != typeof window) {
    var t = document.createElement('style');
    return t.setAttribute('media', 'screen'), (t.innerHTML = e), document.head.appendChild(t), e;
  }
}
function escapeString(e) {
  return e.replace(/"/g, '\\"');
}
function getType(e) {
  return null === e ? 'null' : typeof e;
}
function isObject(e) {
  return !!e && 'object' == typeof e;
}
function getObjectName(e) {
  if (void 0 === e) return '';
  if (null === e) return 'Object';
  if ('object' == typeof e && !e.constructor) return 'Object';
  var t = /function ([^(]*)/.exec(e.constructor.toString());
  return t && t.length > 1 ? t[1] : '';
}
function getValuePreview(e, t, r) {
  return 'null' === e || 'undefined' === e
    ? e
    : (('string' !== e && 'stringifiable' !== e) || (r = '"' + escapeString(r) + '"'),
      'function' === e
        ? t
            .toString()
            .replace(/[\r\n]/g, '')
            .replace(/\{.*\}/, '') + '{…}'
        : r);
}
function getPreview(e) {
  var t = '';
  return isObject(e) ? ((t = getObjectName(e)), Array.isArray(e) && (t += '[' + e.length + ']')) : (t = getValuePreview(getType(e), e, e)), t;
}
function cssClass(e) {
  return 'json-formatter-' + e;
}
function createElement(e, t, r) {
  var n = document.createElement(e);
  return t && n.classList.add(cssClass(t)), void 0 !== r && (r instanceof Node ? n.appendChild(r) : n.appendChild(document.createTextNode(String(r)))), n;
}
__$styleInject(
  '.json-formatter-row {\n  font-family: monospace;\n}\n.json-formatter-row,\n.json-formatter-row a,\n.json-formatter-row a:hover {\n  color: black;\n  text-decoration: none;\n}\n.json-formatter-row .json-formatter-row {\n  margin-left: 1rem;\n}\n.json-formatter-row .json-formatter-children.json-formatter-empty {\n  opacity: 0.5;\n  margin-left: 1rem;\n}\n.json-formatter-row .json-formatter-children.json-formatter-empty:after {\n  display: none;\n}\n.json-formatter-row .json-formatter-children.json-formatter-empty.json-formatter-object:after {\n  content: "No properties";\n}\n.json-formatter-row .json-formatter-children.json-formatter-empty.json-formatter-array:after {\n  content: "[]";\n}\n.json-formatter-row .json-formatter-string,\n.json-formatter-row .json-formatter-stringifiable {\n  color: green;\n  white-space: pre;\n  word-wrap: break-word;\n}\n.json-formatter-row .json-formatter-number {\n  color: blue;\n}\n.json-formatter-row .json-formatter-boolean {\n  color: red;\n}\n.json-formatter-row .json-formatter-null {\n  color: #855A00;\n}\n.json-formatter-row .json-formatter-undefined {\n  color: #ca0b69;\n}\n.json-formatter-row .json-formatter-function {\n  color: #FF20ED;\n}\n.json-formatter-row .json-formatter-date {\n  background-color: rgba(0, 0, 0, 0.05);\n}\n.json-formatter-row .json-formatter-url {\n  text-decoration: underline;\n  color: blue;\n  cursor: pointer;\n}\n.json-formatter-row .json-formatter-bracket {\n  color: blue;\n}\n.json-formatter-row .json-formatter-key {\n  color: #00008B;\n  padding-right: 0.2rem;\n}\n.json-formatter-row .json-formatter-toggler-link {\n  cursor: pointer;\n}\n.json-formatter-row .json-formatter-toggler {\n  line-height: 1.2rem;\n  font-size: 0.7rem;\n  vertical-align: middle;\n  opacity: 0.6;\n  cursor: pointer;\n  padding-right: 0.2rem;\n}\n.json-formatter-row .json-formatter-toggler:after {\n  display: inline-block;\n  transition: transform 100ms ease-in;\n  content: "►";\n}\n.json-formatter-row > a > .json-formatter-preview-text {\n  opacity: 0;\n  transition: opacity 0.15s ease-in;\n  font-style: italic;\n}\n.json-formatter-row:hover > a > .json-formatter-preview-text {\n  opacity: 0.6;\n}\n.json-formatter-row.json-formatter-open > .json-formatter-toggler-link .json-formatter-toggler:after {\n  transform: rotate(90deg);\n}\n.json-formatter-row.json-formatter-open > .json-formatter-children:after {\n  display: inline-block;\n}\n.json-formatter-row.json-formatter-open > a > .json-formatter-preview-text {\n  display: none;\n}\n.json-formatter-row.json-formatter-open.json-formatter-empty:after {\n  display: block;\n}\n.json-formatter-dark.json-formatter-row {\n  font-family: monospace;\n}\n.json-formatter-dark.json-formatter-row,\n.json-formatter-dark.json-formatter-row a,\n.json-formatter-dark.json-formatter-row a:hover {\n  color: white;\n  text-decoration: none;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-row {\n  margin-left: 1rem;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-children.json-formatter-empty {\n  opacity: 0.5;\n  margin-left: 1rem;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-children.json-formatter-empty:after {\n  display: none;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-children.json-formatter-empty.json-formatter-object:after {\n  content: "No properties";\n}\n.json-formatter-dark.json-formatter-row .json-formatter-children.json-formatter-empty.json-formatter-array:after {\n  content: "[]";\n}\n.json-formatter-dark.json-formatter-row .json-formatter-string,\n.json-formatter-dark.json-formatter-row .json-formatter-stringifiable {\n  color: #31F031;\n  white-space: pre;\n  word-wrap: break-word;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-number {\n  color: #66C2FF;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-boolean {\n  color: #EC4242;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-null {\n  color: #EEC97D;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-undefined {\n  color: #ef8fbe;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-function {\n  color: #FD48CB;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-date {\n  background-color: rgba(255, 255, 255, 0.05);\n}\n.json-formatter-dark.json-formatter-row .json-formatter-url {\n  text-decoration: underline;\n  color: #027BFF;\n  cursor: pointer;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-bracket {\n  color: #9494FF;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-key {\n  color: #23A0DB;\n  padding-right: 0.2rem;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-toggler-link {\n  cursor: pointer;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-toggler {\n  line-height: 1.2rem;\n  font-size: 0.7rem;\n  vertical-align: middle;\n  opacity: 0.6;\n  cursor: pointer;\n  padding-right: 0.2rem;\n}\n.json-formatter-dark.json-formatter-row .json-formatter-toggler:after {\n  display: inline-block;\n  transition: transform 100ms ease-in;\n  content: "►";\n}\n.json-formatter-dark.json-formatter-row > a > .json-formatter-preview-text {\n  opacity: 0;\n  transition: opacity 0.15s ease-in;\n  font-style: italic;\n}\n.json-formatter-dark.json-formatter-row:hover > a > .json-formatter-preview-text {\n  opacity: 0.6;\n}\n.json-formatter-dark.json-formatter-row.json-formatter-open > .json-formatter-toggler-link .json-formatter-toggler:after {\n  transform: rotate(90deg);\n}\n.json-formatter-dark.json-formatter-row.json-formatter-open > .json-formatter-children:after {\n  display: inline-block;\n}\n.json-formatter-dark.json-formatter-row.json-formatter-open > a > .json-formatter-preview-text {\n  display: none;\n}\n.json-formatter-dark.json-formatter-row.json-formatter-open.json-formatter-empty:after {\n  display: block;\n}\n',
);
var DATE_STRING_REGEX = /(^\d{1,4}[\.|\\/|-]\d{1,2}[\.|\\/|-]\d{1,4})(\s*(?:0?[1-9]:[0-5]|1(?=[012])\d:[0-5])\d\s*[ap]m)?$/,
  PARTIAL_DATE_REGEX = /\d{2}:\d{2}:\d{2} GMT-\d{4}/,
  JSON_DATE_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/,
  MAX_ANIMATED_TOGGLE_ITEMS = 10,
  requestAnimationFrame =
    window.requestAnimationFrame ||
    function (e) {
      return e(), 0;
    },
  _defaultConfig = {hoverPreviewEnabled: !1, hoverPreviewArrayCount: 100, hoverPreviewFieldCount: 5, animateOpen: !0, animateClose: !0, theme: null, useToJSON: !0, sortPropertiesBy: null},
  JSONFormatter = (function () {
    function e(e, t, r, n) {
      void 0 === t && (t = 1),
        void 0 === r && (r = _defaultConfig),
        (this.json = e),
        (this.open = t),
        (this.config = r),
        (this.key = n),
        (this._isOpen = null),
        void 0 === this.config.hoverPreviewEnabled && (this.config.hoverPreviewEnabled = _defaultConfig.hoverPreviewEnabled),
        void 0 === this.config.hoverPreviewArrayCount && (this.config.hoverPreviewArrayCount = _defaultConfig.hoverPreviewArrayCount),
        void 0 === this.config.hoverPreviewFieldCount && (this.config.hoverPreviewFieldCount = _defaultConfig.hoverPreviewFieldCount),
        void 0 === this.config.useToJSON && (this.config.useToJSON = _defaultConfig.useToJSON),
        '' === this.key && (this.key = '""');
    }
    return (
      Object.defineProperty(e.prototype, 'isOpen', {
        get: function () {
          return null !== this._isOpen ? this._isOpen : this.open > 0;
        },
        set: function (e) {
          this._isOpen = e;
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'isDate', {
        get: function () {
          return this.json instanceof Date || ('string' === this.type && (DATE_STRING_REGEX.test(this.json) || JSON_DATE_REGEX.test(this.json) || PARTIAL_DATE_REGEX.test(this.json)));
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'isUrl', {
        get: function () {
          return 'string' === this.type && 0 === this.json.indexOf('http');
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'isArray', {
        get: function () {
          return Array.isArray(this.json);
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'isObject', {
        get: function () {
          return isObject(this.json);
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'isEmptyObject', {
        get: function () {
          return !this.keys.length && !this.isArray;
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'isEmpty', {
        get: function () {
          return this.isEmptyObject || (this.keys && !this.keys.length && this.isArray);
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'useToJSON', {
        get: function () {
          return this.config.useToJSON && 'stringifiable' === this.type;
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'hasKey', {
        get: function () {
          return void 0 !== this.key;
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'constructorName', {
        get: function () {
          return getObjectName(this.json);
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'type', {
        get: function () {
          return this.config.useToJSON && this.json && this.json.toJSON ? 'stringifiable' : getType(this.json);
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(e.prototype, 'keys', {
        get: function () {
          if (this.isObject) {
            var e = Object.keys(this.json);
            return !this.isArray && this.config.sortPropertiesBy ? e.sort(this.config.sortPropertiesBy) : e;
          }
          return [];
        },
        enumerable: !0,
        configurable: !0,
      }),
      (e.prototype.toggleOpen = function () {
        (this.isOpen = !this.isOpen), this.element && (this.isOpen ? this.appendChildren(this.config.animateOpen) : this.removeChildren(this.config.animateClose), this.element.classList.toggle(cssClass('open')));
      }),
      (e.prototype.openAtDepth = function (e) {
        void 0 === e && (e = 1),
          e < 0 || ((this.open = e), (this.isOpen = 0 !== e), this.element && (this.removeChildren(!1), 0 === e ? this.element.classList.remove(cssClass('open')) : (this.appendChildren(this.config.animateOpen), this.element.classList.add(cssClass('open')))));
      }),
      (e.prototype.getInlinepreview = function () {
        var e = this;
        if (this.isArray) return this.json.length > this.config.hoverPreviewArrayCount ? 'Array[' + this.json.length + ']' : '[' + this.json.map(getPreview).join(', ') + ']';
        var t = this.keys,
          r = t.slice(0, this.config.hoverPreviewFieldCount).map(function (t) {
            return t + ':' + getPreview(e.json[t]);
          }),
          n = t.length >= this.config.hoverPreviewFieldCount ? '…' : '';
        return '{' + r.join(', ') + n + '}';
      }),
      (e.prototype.render = function () {
        this.element = createElement('div', 'row');
        var e = this.isObject ? createElement('a', 'toggler-link') : createElement('span');
        if ((this.isObject && !this.useToJSON && e.appendChild(createElement('span', 'toggler')), this.hasKey && e.appendChild(createElement('span', 'key', this.key + ':')), this.isObject && !this.useToJSON)) {
          var t = createElement('span', 'value'),
            r = createElement('span'),
            n = createElement('span', 'constructor-name', this.constructorName);
          if ((r.appendChild(n), this.isArray)) {
            var o = createElement('span');
            o.appendChild(createElement('span', 'bracket', '[')), o.appendChild(createElement('span', 'number', this.json.length)), o.appendChild(createElement('span', 'bracket', ']')), r.appendChild(o);
          }
          t.appendChild(r), e.appendChild(t);
        } else {
          (t = this.isUrl ? createElement('a') : createElement('span')).classList.add(cssClass(this.type)), this.isDate && t.classList.add(cssClass('date')), this.isUrl && (t.classList.add(cssClass('url')), t.setAttribute('href', this.json));
          var s = getValuePreview(this.type, this.json, this.useToJSON ? this.json.toJSON() : this.json);
          t.appendChild(document.createTextNode(s)), e.appendChild(t);
        }
        if (this.isObject && this.config.hoverPreviewEnabled) {
          var i = createElement('span', 'preview-text');
          i.appendChild(document.createTextNode(this.getInlinepreview())), e.appendChild(i);
        }
        var a = createElement('div', 'children');
        return (
          this.isObject && a.classList.add(cssClass('object')),
          this.isArray && a.classList.add(cssClass('array')),
          this.isEmpty && a.classList.add(cssClass('empty')),
          this.config && this.config.theme && this.element.classList.add(cssClass(this.config.theme)),
          this.isOpen && this.element.classList.add(cssClass('open')),
          this.element.appendChild(e),
          this.element.appendChild(a),
          this.isObject && this.isOpen && this.appendChildren(),
          this.isObject && !this.useToJSON && e.addEventListener('click', this.toggleOpen.bind(this)),
          this.element
        );
      }),
      (e.prototype.appendChildren = function (t) {
        var r = this;
        void 0 === t && (t = !1);
        var n = this.element.querySelector('div.' + cssClass('children'));
        if (n && !this.isEmpty)
          if (t) {
            var o = 0,
              s = function () {
                var t = r.keys[o],
                  i = new e(r.json[t], r.open - 1, r.config, t);
                n.appendChild(i.render()), (o += 1) < r.keys.length && (o > MAX_ANIMATED_TOGGLE_ITEMS ? s() : requestAnimationFrame(s));
              };
            requestAnimationFrame(s);
          } else
            this.keys.forEach(function (t) {
              var o = new e(r.json[t], r.open - 1, r.config, t);
              n.appendChild(o.render());
            });
      }),
      (e.prototype.removeChildren = function (e) {
        void 0 === e && (e = !1);
        var t = this.element.querySelector('div.' + cssClass('children'));
        if (e) {
          var r = 0,
            n = function () {
              t && t.children.length && (t.removeChild(t.children[0]), (r += 1) > MAX_ANIMATED_TOGGLE_ITEMS ? n() : requestAnimationFrame(n));
            };
          requestAnimationFrame(n);
        } else t && (t.innerHTML = '');
      }),
      e
    );
  })();

// Toggler for theme
document.addEventListener('DOMContentLoaded', () => {
  const themeToggler = document.getElementById('theme-toggler');
  const head = document.getElementsByTagName('HEAD')[0];
  const togglerText = document.getElementById('toggler-text');
  let link = document.createElement('link');

  if (localStorage.getItem('mode') === 'Light Mode') {
    togglerText.innerText = 'Dark Mode';
    document.getElementById('theme-toggler').checked = true; // ensure theme toggle is set to dark
  } else {
    // initial mode ist null
    togglerText.innerText = 'Light Mode';
    document.getElementById('theme-toggler').checked = false; // ensure theme toggle is set to light
  }

  themeToggler.addEventListener('click', () => {
    togglerText.innerText = 'Light Mode';

    if (localStorage.getItem('theme') === 'dark-theme') {
      localStorage.removeItem('theme');
      localStorage.setItem('mode', 'Dark Mode');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '${docroot}/static/css/spiderfoot.css';

      head.appendChild(link);
      location.reload();
    } else {
      localStorage.setItem('theme', 'dark-theme');
      localStorage.setItem('mode', 'Light Mode');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = '${docroot}/static/css/dark.css';

      head.appendChild(link);
      location.reload();
    }
  });
});

var sf = {};

sf.replace_sfurltag = function (data) {
  if (data.toLowerCase().indexOf('&lt;sfurl&gt;') >= 0) {
    data = data.replace(RegExp('&lt;sfurl&gt;(.*)&lt;/sfurl&gt;', 'img'), "<a target=_new href='$1'>$1</a>");
  }
  if (data.toLowerCase().indexOf('<sfurl>') >= 0) {
    data = data.replace(RegExp('<sfurl>(.*)</sfurl>', 'img'), "<a target=_new href='$1'>$1</a>");
  }
  return data;
};

sf.remove_sfurltag = function (data) {
  if (data.toLowerCase().indexOf('&lt;sfurl&gt;') >= 0) {
    data = data.toLowerCase().replace('&lt;sfurl&gt;', '').replace('&lt;/sfurl&gt;', '');
  }
  if (data.toLowerCase().indexOf('<sfurl>') >= 0) {
    data = data.toLowerCase().replace('<sfurl>', '').replace('</sfurl>', '');
  }
  return data;
};

sf.search = function (scan_id, value, type, postFunc) {
  sf.fetchData('/search', {id: scan_id, eventType: type, value: value}, postFunc);
};

sf.deleteScan = function (scan_id, callback) {
  var req = $.ajax({
    type: 'GET',
    url: '/scandelete?id=' + scan_id,
  });
  req.done(function () {
    alertify.success('<i class="glyphicon glyphicon-ok-circle"></i> <b>Scans Deleted</b><br/><br/>' + scan_id.replace(/,/g, '<br/>'));
    sf.log('Deleted scans: ' + scan_id);
    callback();
  });
  req.fail(function (hr, textStatus, errorThrown) {
    alertify.error('<i class="glyphicon glyphicon-minus-sign"></i> <b>Error</b><br/></br>' + hr.responseText);
    sf.log('Error deleting scans: ' + scan_id + ': ' + hr.responseText);
  });
};

sf.stopScan = function (scan_id, callback) {
  var req = $.ajax({
    type: 'GET',
    url: '/stopscan?id=' + scan_id,
  });
  req.done(function () {
    alertify.success('<i class="glyphicon glyphicon-ok-circle"></i> <b>Scans Aborted</b><br/><br/>' + scan_id.replace(/,/g, '<br/>'));
    sf.log('Aborted scans: ' + scan_id);
    callback();
  });
  req.fail(function (hr, textStatus, errorThrown) {
    alertify.error('<i class="glyphicon glyphicon-minus-sign"></i> <b>Error</b><br/><br/>' + hr.responseText);
    sf.log('Error stopping scans: ' + scan_id + ': ' + hr.responseText);
  });
};

sf.fetchData = function (url, postData, postFunc) {
  var req = $.ajax({
    type: 'POST',
    url: url,
    data: postData,
    cache: false,
    dataType: 'json',
  });

  req.done(postFunc);
  req.fail(function (hr, status) {
    alertify.error('<i class="glyphicon glyphicon-minus-sign"></i> <b>Error</b><br/>' + status);
  });
};


/*
sf.simpleTable = function(id, data, cols, linkcol=null, linkstring=null, sortable=true, rowfunc=null) {
	var table = "<table id='" + id + "' ";
	table += "class='table table-bordered table-striped tablesorter'>";
	table += "<thead><tr>";
	for (var i = 0; i < cols.length; i++) {
		table += "<th>" + cols[i] + "</th>";
	}
	table += "</tr></thead><tbody>";

	for (var i = 1; i < data.length; i++) {
		table += "<tr>";
		for (var c = 0; c < data[i].length; c++) {
			if (c == linkcol) {
				if (linkstring.indexOf("%%col") > 0) {
				}
				table += "<td>" + <a class='link' onClick='" + linkstring + "'>";
				table += data[i][c] + "</a></td>"
			} else {
				table += "<td>" + data[i][c] + "</td>";
			}
		}
		table += "</tr>";
	}
	table += "</tbody></table>";

	return table;
}

*/

sf.updateTooltips = function () {
  $(document).ready(function () {
    if ($('[rel=tooltip]').length) {
      $('[rel=tooltip]').tooltip({container: 'body'});
    }
  });
};

sf.log = function (message) {
  if (typeof console == 'object' && typeof console.log == 'function') {
    var currentdate = new Date();
    var pad = function (n) {
      return ('0' + n).slice(-2);
    };
    var datetime = currentdate.getFullYear() + '-' + pad(currentdate.getMonth() + 1) + '-' + pad(currentdate.getDate()) + ' ' + pad(currentdate.getHours()) + ':' + pad(currentdate.getMinutes()) + ':' + pad(currentdate.getSeconds());
    console.log('[' + datetime + '] ' + message);
  }
};
