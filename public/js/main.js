document.addEventListener('DOMContentLoaded', function () {
  // ---------- Тост ----------
  var toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2200);
  }

  // ---------- Мобильное меню ----------
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  var navOverlay = document.getElementById('navOverlay');
  var navClose = document.getElementById('navClose');
  function openNav() {
    if (!nav) return;
    nav.classList.add('is-open');
    if (navOverlay) navOverlay.hidden = false;
    document.body.classList.add('menu-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    if (!nav) return;
    nav.classList.remove('is-open');
    if (navOverlay) navOverlay.hidden = true;
    document.body.classList.remove('menu-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  }
  if (navToggle) navToggle.addEventListener('click', function () {
    nav.classList.contains('is-open') ? closeNav() : openNav();
  });
  if (navClose) navClose.addEventListener('click', closeNav);
  if (navOverlay) navOverlay.addEventListener('click', closeNav);
  if (nav) nav.querySelectorAll('.nav__link').forEach(function (l) { l.addEventListener('click', closeNav); });

  // ---------- Мобильные фильтры ----------
  var filtersToggle = document.getElementById('filtersToggle');
  var filtersPanel = document.getElementById('filtersPanel');
  if (filtersToggle && filtersPanel) {
    filtersToggle.addEventListener('click', function () {
      var open = filtersPanel.classList.toggle('is-open');
      filtersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ---------- Счётчики в шапке ----------
  function setCount(id, n) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
  }

  // ---------- Избранное (AJAX-сердечки) ----------
  document.body.addEventListener('click', function (e) {
    var btn = e.target.closest('.wish-btn');
    if (!btn) return;
    e.preventDefault();
    var id = btn.dataset.id;
    btn.disabled = true;
    fetch('/api/wishlist/' + id + '/toggle', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          throw new Error('auth');
        }
        return res.json();
      })
      .then(function (data) {
        document.querySelectorAll('.wish-btn[data-id="' + id + '"]').forEach(function (b) {
          b.classList.toggle('is-active', data.active);
          b.classList.add('pulse');
          setTimeout(function () { b.classList.remove('pulse'); }, 300);
        });
        setCount('wishCount', data.count);
        toast(data.active ? 'Добавлено в избранное' : 'Убрано из избранного');
      })
      .catch(function () {})
      .finally(function () { btn.disabled = false; });
  });

  // ---------- Корзина: выезжающая панель ----------
  var drawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  var drawerBody = document.getElementById('cartDrawerBody');

  function loadDrawer() {
    if (!drawerBody) return Promise.resolve();
    return fetch('/cart/drawer')
      .then(function (r) { return r.text(); })
      .then(function (html) { drawerBody.innerHTML = html; });
  }
  function openDrawer() {
    if (!drawer) return;
    loadDrawer().then(function () {
      overlay.hidden = false;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
    });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
  }
  var cartToggle = document.getElementById('cartToggle');
  if (cartToggle) cartToggle.addEventListener('click', openDrawer);
  var cartClose = document.getElementById('cartClose');
  if (cartClose) cartClose.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  // Удаление позиции из панели
  if (drawerBody) {
    drawerBody.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-ajax-remove]');
      if (!form) return;
      e.preventDefault();
      fetch('/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(new FormData(form)),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) { setCount('cartCount', data.count); loadDrawer(); })
        .catch(function () {});
    });
  }

  // ---------- Галерея товара ----------
  var galleryMain = document.getElementById('galleryMain');
  if (galleryMain) {
    document.querySelectorAll('.gallery__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        galleryMain.src = thumb.dataset.src;
        document.querySelectorAll('.gallery__thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    });
  }

  // ---------- Выбор размера / цвета на странице товара ----------
  var sizeInput = document.getElementById('sizeInput');
  var sizeError = document.getElementById('sizeError');
  document.querySelectorAll('.selector__sizes').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var opt = e.target.closest('.size-opt');
      if (!opt) return;
      group.querySelectorAll('.size-opt').forEach(function (o) { o.classList.remove('is-active'); });
      opt.classList.add('is-active');
      if (sizeInput) sizeInput.value = opt.dataset.size;
      if (sizeError) sizeError.hidden = true;
    });
  });

  var colorLabel = document.getElementById('colorLabel');
  var colorInput = document.getElementById('colorInput');
  document.querySelectorAll('.selector__colors').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var opt = e.target.closest('.color-opt');
      if (!opt) return;
      group.querySelectorAll('.color-opt').forEach(function (o) { o.classList.remove('is-active'); });
      opt.classList.add('is-active');
      if (colorLabel) colorLabel.textContent = opt.dataset.color;
      if (colorInput) colorInput.value = opt.dataset.color;
    });
  });

  // ---------- Таблица размеров ----------
  var sizeDialog = document.getElementById('sizeDialog');
  var sizeGuideBtn = document.getElementById('sizeGuideBtn');
  if (sizeGuideBtn && sizeDialog) {
    sizeGuideBtn.addEventListener('click', function () {
      if (typeof sizeDialog.showModal === 'function') sizeDialog.showModal();
      else sizeDialog.setAttribute('open', '');
    });
    var close = document.getElementById('sizeDialogClose');
    if (close) close.addEventListener('click', function () { sizeDialog.close(); });
    sizeDialog.addEventListener('click', function (e) { if (e.target === sizeDialog) sizeDialog.close(); });
  }

  // ---------- Добавление в корзину (с проверкой размера) ----------
  var addForm = document.getElementById('addForm');
  if (addForm) {
    var needSize = !!document.querySelector('.selector__sizes .size-opt') && sizeInput && sizeInput.value === '';
    addForm.addEventListener('submit', function (e) {
      // если нужен размер и он не выбран — блокируем
      var sizeOpts = addForm.querySelectorAll('.size-opt');
      if (sizeOpts.length && sizeInput && !sizeInput.value) {
        e.preventDefault();
        if (sizeError) sizeError.hidden = false;
        return;
      }
      e.preventDefault();
      var btn = document.getElementById('addToBag');
      fetch('/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(new FormData(addForm)),
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
          setCount('cartCount', data.count);
          if (btn) { var t = btn.textContent; btn.textContent = '✓ В корзине'; setTimeout(function () { btn.textContent = t; }, 1500); }
          openDrawer();
        })
        .catch(function () { toast('Не удалось добавить товар'); });
    });
  }

  // ---------- Звёзды в форме отзыва ----------
  var ratingPicker = document.getElementById('ratingPicker');
  if (ratingPicker) {
    var input = document.getElementById('ratingInput');
    var stars = ratingPicker.querySelectorAll('.rate-star');
    function paint(val) {
      stars.forEach(function (s) { s.classList.toggle('is-active', Number(s.dataset.value) <= val); });
    }
    paint(Number(input.value) || 5);
    stars.forEach(function (s) {
      s.addEventListener('mouseenter', function () { paint(Number(s.dataset.value)); });
      s.addEventListener('click', function () { input.value = s.dataset.value; paint(Number(s.dataset.value)); });
    });
    ratingPicker.addEventListener('mouseleave', function () { paint(Number(input.value)); });
  }

  // ---------- Цветовой фильтр в каталоге (повторный клик снимает) ----------
  document.querySelectorAll('.color-filter').forEach(function (label) {
    label.addEventListener('click', function (e) {
      var input = label.querySelector('input');
      if (input && input.checked) { e.preventDefault(); input.checked = false; label.classList.remove('is-active'); }
    });
  });

  // ---------- «Показать ещё» в каталоге ----------
  var loadMore = document.getElementById('loadMore');
  if (loadMore) {
    loadMore.addEventListener('click', function (e) {
      e.preventDefault();
      var url = loadMore.getAttribute('href');
      loadMore.textContent = 'Загрузка…';
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var newGrid = doc.getElementById('productGrid');
          var grid = document.getElementById('productGrid');
          if (newGrid && grid) grid.insertAdjacentHTML('beforeend', newGrid.innerHTML);
          var newMore = doc.getElementById('loadMore');
          var wrap = loadMore.closest('.load-more');
          if (newMore) { loadMore.setAttribute('href', newMore.getAttribute('href')); loadMore.textContent = 'Показать ещё';
            var info = wrap && wrap.querySelector('.load-more__info'); var newInfo = doc.querySelector('.load-more__info');
            if (info && newInfo) info.textContent = newInfo.textContent;
          } else if (wrap) { wrap.remove(); }
        })
        .catch(function () { loadMore.textContent = 'Показать ещё'; });
    });
  }

  // ---------- Заглушки форм (рассылка / контакты / оформление) ----------
  document.querySelectorAll('[data-newsletter]').forEach(function (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); form.reset(); toast('Спасибо! Вы подписаны.'); });
  });
  document.querySelectorAll('[data-contact]').forEach(function (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); form.reset(); toast('Сообщение отправлено!'); });
  });
  var checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function () { toast('Онлайн-оплата скоро появится 🙌'); });
  }
});
