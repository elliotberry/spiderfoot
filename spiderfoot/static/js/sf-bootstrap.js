/**
 * Minimal Bootstrap 3 behavior without jQuery:
 * dropdown, collapse, modal, alert dismiss, tooltip, popover.
 */
(function () {
  'use strict';

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function hideDropdowns(except) {
    document.querySelectorAll('.dropdown.open, .btn-group.open').forEach(function (el) {
      if (el !== except) el.classList.remove('open');
    });
  }

  function toggleDropdown(toggle) {
    var parent = closest(toggle, '.dropdown, .btn-group');
    if (!parent) return;
    var willOpen = !parent.classList.contains('open');
    hideDropdowns(parent);
    parent.classList.toggle('open', willOpen);
  }

  function toggleCollapse(targetSel) {
    var target = document.querySelector(targetSel);
    if (!target) return;
    var open = target.classList.contains('in') || target.classList.contains('show');
    target.classList.toggle('in', !open);
    target.classList.toggle('collapse', open);
    if (!open) {
      target.style.display = 'block';
      target.classList.add('in');
    } else {
      target.style.display = 'none';
      target.classList.remove('in');
    }
    var toggler = document.querySelector('[data-toggle="collapse"][data-target="' + targetSel + '"]');
    if (toggler) {
      toggler.classList.toggle('collapsed', open);
      toggler.setAttribute('aria-expanded', String(!open));
    }
  }

  function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    modal.classList.add('in');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (!document.querySelector('.modal-backdrop')) {
      var backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade in';
      document.body.appendChild(backdrop);
    }
  }

  function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('in');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
  }

  function dismissAlert(btn) {
    var alert = closest(btn, '.alert');
    if (alert) alert.remove();
  }

  function ensureTip(el, kind) {
    var key = kind === 'popover' ? '_sfPopover' : '_sfTooltip';
    if (el[key]) return el[key];

    var tip = document.createElement('div');
    tip.className = kind === 'popover' ? 'popover fade bottom in' : 'tooltip fade bottom in';
    tip.setAttribute('role', 'tooltip');
    tip.style.display = 'none';
    tip.style.position = 'absolute';
    tip.style.zIndex = '1060';

    if (kind === 'popover') {
      tip.innerHTML = '<div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div>';
    } else {
      tip.innerHTML = '<div class="tooltip-arrow"></div><div class="tooltip-inner"></div>';
    }
    document.body.appendChild(tip);
    el[key] = tip;
    return tip;
  }

  function placeTip(el, tip, placement) {
    placement = placement || el.getAttribute('data-placement') || 'bottom';
    var rect = el.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var top = window.scrollY + rect.bottom + 6;
    var left = window.scrollX + rect.left + (rect.width - tipRect.width) / 2;
    if (placement === 'top') {
      top = window.scrollY + rect.top - tipRect.height - 6;
    }
    tip.style.top = Math.max(0, top) + 'px';
    tip.style.left = Math.max(0, left) + 'px';
    tip.classList.remove('top', 'bottom', 'left', 'right');
    tip.classList.add(placement);
  }

  function showTooltip(el) {
    var title = el.getAttribute('data-title') || el.getAttribute('title') || el.getAttribute('data-original-title');
    if (!title) return;
    if (el.getAttribute('title')) {
      el.setAttribute('data-original-title', title);
      el.removeAttribute('title');
    }
    var tip = ensureTip(el, 'tooltip');
    tip.querySelector('.tooltip-inner').textContent = title;
    tip.style.display = 'block';
    tip.style.opacity = '1';
    placeTip(el, tip, el.getAttribute('data-placement') || 'top');
  }

  function hideTooltip(el) {
    var tip = el._sfTooltip;
    if (tip) tip.style.display = 'none';
  }

  function showPopover(el) {
    var tip = ensureTip(el, 'popover');
    var title = el.getAttribute('data-title') || '';
    var content = el.getAttribute('data-content') || '';
    var titleEl = tip.querySelector('.popover-title');
    var contentEl = tip.querySelector('.popover-content');
    if (title) {
      titleEl.style.display = '';
      titleEl.innerHTML = title;
    } else {
      titleEl.style.display = 'none';
    }
    if (el.getAttribute('data-html') === 'true') {
      contentEl.innerHTML = content;
    } else {
      contentEl.textContent = content;
    }
    tip.style.display = 'block';
    tip.style.opacity = '1';
    tip.style.maxWidth = el.getAttribute('data-max-width') || '600px';
    placeTip(el, tip, el.getAttribute('data-placement') || 'bottom');
  }

  function hidePopover(el) {
    var tip = el._sfPopover;
    if (tip) tip.style.display = 'none';
  }

  function togglePopover(el) {
    var tip = el._sfPopover;
    if (tip && tip.style.display === 'block') {
      hidePopover(el);
    } else {
      showPopover(el);
    }
  }

  window.sfBootstrap = {
    initTooltips: function (root) {
      (root || document).querySelectorAll('[rel="tooltip"], [rel=tooltip]').forEach(function (el) {
        if (el._sfTipBound) return;
        el._sfTipBound = true;
        el.addEventListener('mouseenter', function () { showTooltip(el); });
        el.addEventListener('mouseleave', function () { hideTooltip(el); });
        el.addEventListener('focus', function () { showTooltip(el); });
        el.addEventListener('blur', function () { hideTooltip(el); });
      });
    },
    initPopovers: function (root) {
      (root || document).querySelectorAll('[data-toggle="popover"]').forEach(function (el) {
        if (el._sfPopBound) return;
        el._sfPopBound = true;
        var trigger = el.getAttribute('data-trigger') || 'click';
        if (trigger === 'focus') {
          el.addEventListener('focus', function () { showPopover(el); });
          el.addEventListener('blur', function () { hidePopover(el); });
        } else {
          el.addEventListener('click', function (e) {
            e.preventDefault();
            togglePopover(el);
          });
        }
      });
    },
    popover: function (el, opts) {
      if (!el) return;
      if (opts) {
        if (opts.html) el.setAttribute('data-html', 'true');
        if (opts.placement) el.setAttribute('data-placement', opts.placement);
        if (opts.trigger) el.setAttribute('data-trigger', opts.trigger);
      }
      if (!el.getAttribute('data-toggle')) el.setAttribute('data-toggle', 'popover');
      this.initPopovers(el.parentNode || document);
      var trigger = (opts && opts.trigger) || el.getAttribute('data-trigger') || 'click';
      if (trigger === 'focus' && !el._sfPopFocusBound) {
        el._sfPopFocusBound = true;
        el.addEventListener('focus', function () { showPopover(el); });
        el.addEventListener('blur', function () { hidePopover(el); });
      }
    },
    tooltip: function (els) {
      if (!els) return;
      var list = els.length !== undefined ? Array.prototype.slice.call(els) : [els];
      list.forEach(function (el) {
        if (!el.getAttribute('rel')) el.setAttribute('rel', 'tooltip');
      });
      this.initTooltips(document);
    }
  };

  document.addEventListener('click', function (e) {
    var dismiss = closest(e.target, '[data-dismiss="modal"]');
    if (dismiss) {
      hideModal(closest(dismiss, '.modal'));
      return;
    }

    var alertBtn = closest(e.target, '[data-dismiss="alert"]');
    if (alertBtn) {
      dismissAlert(alertBtn);
      return;
    }

    var dropdownToggle = closest(e.target, '[data-toggle="dropdown"]');
    if (dropdownToggle) {
      e.preventDefault();
      toggleDropdown(dropdownToggle);
      return;
    }

    var collapseToggle = closest(e.target, '[data-toggle="collapse"]');
    if (collapseToggle) {
      e.preventDefault();
      toggleCollapse(collapseToggle.getAttribute('data-target'));
      return;
    }

    var modalToggle = closest(e.target, '[data-toggle="modal"]');
    if (modalToggle) {
      e.preventDefault();
      var target = modalToggle.getAttribute('data-target') || modalToggle.getAttribute('href');
      showModal(document.querySelector(target));
      return;
    }

    if (!closest(e.target, '.dropdown, .btn-group')) {
      hideDropdowns();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    sfBootstrap.initTooltips();
    sfBootstrap.initPopovers();
  });
})();
