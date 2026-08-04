const apiBase = '/api';
const appState = {
  products: [],
  cart: [],
  cartCount: 0,
  currentUser: null,
  filters: {
    search: '',
    category: 'all',
    minPrice: 0,
    maxPrice: 100000,
    page: 1,
  },
};

function getToken() {
  return sessionStorage.getItem('token');
}

function setToken(token) {
  if (token) {
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
}

function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem('shopUser') || 'null');
  } catch (error) {
    return null;
  }
}

function setStoredUser(user) {
  if (user) {
    sessionStorage.setItem('shopUser', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('shopUser');
  }
}

function clearAuthState() {
  setToken(null);
  setStoredUser(null);
  localStorage.removeItem('guestCart');
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && getToken()) {
      clearAuthState();
      renderAuthNav();
    }
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function renderStars(rating = 4.5) {
  const full = '★'.repeat(Math.floor(rating));
  const empty = '☆'.repeat(5 - Math.floor(rating));
  return `${full}${empty}`;
}

function renderStatusBadge(status) {
  const normalized = (status || 'pending').toLowerCase();
  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return `<span class="status-badge status-${normalized}"><i data-lucide="${getStatusIcon(normalized)}" class="status-icon"></i>${label}</span>`;
}

function getStatusIcon(status) {
  const icons = {
    pending: 'clock',
    delivered: 'package-check',
    cancelled: 'x-circle',
    processing: 'loader',
  };
  return icons[status] || 'circle';
}

function requireLoginRedirect(message = 'Please log in to continue.') {
  toast(message);
  const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.setTimeout(() => {
    window.location.href = `login.html?redirect=${returnUrl}`;
  }, 900);
}

function toast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => element.classList.remove('show'), 2200);
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join('');
  return (initials || name[0] || '?').toUpperCase();
}

async function validateSession() {
  const token = getToken();
  if (!token) {
    renderAuthNav();
    return false;
  }

  try {
    const data = await apiRequest('/auth/profile');
    setStoredUser(data.user);
    renderAuthNav();
    await updateCartBadge();
    return true;
  } catch (error) {
    clearAuthState();
    renderAuthNav();
    setCartBadgeCount(0);
    return false;
  }
}

async function performLogout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (error) {
    // session may already be cleared
  }
  clearAuthState();
  toast('Logged out');
  window.location.href = 'index.html';
}

function renderAuthNav() {
  const mount = document.getElementById('navAuth');
  if (!mount) return;

  const token = getToken();
  const user = getStoredUser();

  if (token && user) {
    const displayName = user.username || user.fullname || 'there';
    mount.innerHTML = `
      <button type="button" class="nav-user-trigger" id="navUserTrigger" aria-haspopup="true" aria-expanded="false">
        <span class="nav-avatar">${getInitials(user.fullname || user.username)}</span>
        <span class="nav-user-greeting">Hi ${displayName}</span>
        <span class="nav-user-caret">&#9662;</span>
      </button>
      <div class="nav-user-menu" id="navUserMenu">
        <div class="nav-user-menu-header">
          <strong>${user.fullname || displayName}</strong>
          <span>${user.email || ''}</span>
        </div>
        <a href="dashboard.html"><i data-lucide="layout-dashboard"></i> Dashboard</a>
        <a href="orders.html"><i data-lucide="package"></i> My Orders</a>
        <a href="cart.html"><i data-lucide="shopping-cart"></i> Cart</a>
        ${user.role === 'admin' ? '<a href="admin.html"><i data-lucide="shield"></i> Admin Center</a>' : ''}
        <button type="button" class="danger" id="navLogoutButton"><i data-lucide="log-out"></i> Logout</button>
      </div>
    `;

    const trigger = document.getElementById('navUserTrigger');
    const menu = document.getElementById('navUserMenu');

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (event) => {
      if (!mount.contains(event.target)) {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.getElementById('navLogoutButton').addEventListener('click', performLogout);
  } else {
    mount.innerHTML = `
      <div class="nav-guest-links">
        <a href="login.html"><i data-lucide="log-in"></i> Login</a>
        <a class="button button-primary" href="register.html"><i data-lucide="user-plus"></i> Register</a>
      </div>
    `;
  }

  refreshIcons();
  renderFooterAuth();
}

function renderFooterAuth() {
  const token = getToken();
  document.querySelectorAll('.footer-guest-link').forEach((el) => {
    el.style.display = token ? 'none' : '';
  });

  const logoutLi = document.getElementById('footerLogoutLink');
  if (logoutLi) {
    logoutLi.style.display = token ? '' : 'none';
    const logoutButton = document.getElementById('footerLogoutButton');
    if (logoutButton && !logoutButton.dataset.bound) {
      logoutButton.dataset.bound = 'true';
      logoutButton.addEventListener('click', performLogout);
    }
  }
}

function setCartBadgeCount(count) {
  const badge = document.getElementById('navCartBadge');
  if (!badge) return;
  const safeCount = Number.isFinite(count) ? count : 0;
  badge.textContent = safeCount > 99 ? '99+' : String(safeCount);
  badge.hidden = safeCount <= 0;
}

async function updateCartBadge() {
  if (!getToken()) {
    setCartBadgeCount(0);
    return;
  }

  try {
    const data = await apiRequest('/cart');
    const count = data.cart.reduce((sum, item) => sum + Number(item.quantity), 0);
    appState.cartCount = count;
    setCartBadgeCount(count);
  } catch (error) {
    setCartBadgeCount(0);
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach((link) => {
    const linkPath = link.getAttribute('href').split('?')[0];
    link.classList.toggle('nav-link-active', linkPath === currentPath);
  });
}

function bindMobileNav() {
  const menuButton = document.querySelector('.menu-button');
  const navLinks = document.querySelector('.nav-links');

  if (!menuButton || !navLinks) {
    return;
  }

  menuButton.setAttribute('aria-label', 'Toggle navigation menu');
  menuButton.addEventListener('click', () => {
    navLinks.classList.toggle('nav-open');
  });
}

function bindPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((toggleButton) => {
    const fieldWrapper = toggleButton.closest('.password-field');
    const passwordInput = fieldWrapper ? fieldWrapper.querySelector('[data-password-input]') : null;

    if (!passwordInput) {
      return;
    }

    toggleButton.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      toggleButton.textContent = isHidden ? 'Hide' : 'Show';
      toggleButton.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  });
}

async function loadProducts() {
  const params = new URLSearchParams({
    search: appState.filters.search,
    category: appState.filters.category,
    minPrice: appState.filters.minPrice,
    maxPrice: appState.filters.maxPrice,
    page: appState.filters.page,
    limit: 12,
  });

  const data = await apiRequest(`/products?${params.toString()}`);
  appState.products = data.products;
  renderProductGrid(document.getElementById('featuredGrid'), data.products);
  renderProductGrid(document.getElementById('latestGrid'), data.products.slice(0, 4));
  refreshIcons();
}

function renderProductGrid(container, products) {
  if (!container) return;
  container.innerHTML = products.length
    ? products.map((product) => `
      <article class="card product-card glass-card fade-in">
        <div class="product-media">
          <div class="product-badges">
            <span class="product-badge">${product.category}</span>
            <span class="product-badge">${product.stock > 0 ? 'In Stock' : 'Sold Out'}</span>
          </div>
          <img class="product-image" src="${product.image}" alt="${product.name}">
        </div>
        <div class="card-body">
          <div class="product-meta">
            <span class="rating">${renderStars(4.5)} <span>${product.rating || 4.5}</span></span>
            <span class="price">${formatCurrency(product.price)}</span>
          </div>
          <h3 style="margin-top: 0.7rem;">${product.name}</h3>
          <p class="description-clamp">${product.description}</p>
          <div class="action-row">
            <button class="button button-secondary" data-view-id="${product.id}"><i data-lucide="eye"></i> View</button>
            <button class="button button-primary" data-cart-id="${product.id}"><i data-lucide="shopping-cart"></i> Add</button>
          </div>
        </div>
      </article>
    `).join('')
    : '<div class="empty-state glass-panel"><div><h2>No products found</h2><p>Try adjusting your search or filters on the products page.</p></div></div>';
  refreshIcons();
}

function renderBreadcrumb(product) {
  const mount = document.getElementById('productBreadcrumb');
  if (!mount) return;
  mount.innerHTML = `
    <a href="index.html"><i data-lucide="home"></i></a>
    <i data-lucide="chevron-right"></i>
    <a href="products.html">Products</a>
    <i data-lucide="chevron-right"></i>
    <a href="products.html?category=${encodeURIComponent(product.category)}">${product.category}</a>
    <i data-lucide="chevron-right"></i>
    <span aria-current="page">${product.name}</span>
  `;
}

function stockPill(stock) {
  if (stock <= 0) return `<span class="product-stock-pill out-stock"><i data-lucide="x-circle"></i> Out of stock</span>`;
  if (stock <= 5) return `<span class="product-stock-pill low-stock"><i data-lucide="alert-triangle"></i> Only ${stock} left</span>`;
  return `<span class="product-stock-pill in-stock"><i data-lucide="check-circle"></i> In stock</span>`;
}

async function loadProductDetails(id) {
  const data = await apiRequest(`/products/${id}`);
  const product = data.product;
  const wrapper = document.getElementById('productDetails');
  if (!wrapper) return;

  document.title = `ShopSphere | ${product.name}`;
  renderBreadcrumb(product);

  // The API may return duplicate placeholder images; keep only unique ones.
  const images = [...new Set([product.image, ...(product.gallery || [])].filter(Boolean))];

  wrapper.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery">
        <div class="product-gallery-main glass-panel">
          <div class="product-gallery-badges">
            <span class="product-badge">${product.category}</span>
          </div>
          <img id="productMainImage" src="${images[0]}" alt="${product.name}">
        </div>
        ${images.length > 1 ? `
          <div class="product-gallery-thumbs">
            ${images.map((image, index) => `
              <button type="button" class="${index === 0 ? 'active' : ''}" data-thumb-src="${image}">
                <img src="${image}" alt="${product.name} view ${index + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="product-info-card glass-panel">
        <div class="product-info-top">
          <span class="rating"><i data-lucide="star" style="color:#f59e0b; width:1rem; height:1rem;"></i> ${renderStars(4.5)} <span>${product.rating || 4.5}</span></span>
          ${stockPill(product.stock)}
        </div>
        <h1 class="product-title">${product.name}</h1>
        <div class="product-price-row">
          <span class="price">${formatCurrency(product.price)}</span>
          ${product.stock > 0 ? '<span class="helper-text">Free shipping over $100</span>' : ''}
        </div>
        <p class="product-description">${product.description}</p>

        <div class="product-specs-modern">
          <div class="spec-card"><span class="spec-label">Category</span><span class="spec-value">${product.category}</span></div>
          <div class="spec-card"><span class="spec-label">Availability</span><span class="spec-value">${product.stock > 0 ? `${product.stock} units` : 'Sold out'}</span></div>
        </div>

        <div class="product-purchase-row">
          <div class="qty-stepper">
            <button type="button" id="qtyDecrease" aria-label="Decrease quantity">&minus;</button>
            <input id="quantitySelector" type="number" min="1" max="${Math.max(product.stock, 1)}" value="1" aria-label="Quantity">
            <button type="button" id="qtyIncrease" aria-label="Increase quantity">+</button>
          </div>
          <button id="detailsAddToCart" class="button button-primary" ${product.stock <= 0 ? 'disabled' : ''}>
            <i data-lucide="shopping-cart"></i> ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>

        <a class="button button-secondary" href="products.html" style="margin-top:0.5rem; width:100%;"><i data-lucide="arrow-left"></i> Continue Shopping</a>

        <div class="product-trust-row">
          <div class="product-trust-item"><i data-lucide="shield-check"></i> Secure checkout</div>
          <div class="product-trust-item"><i data-lucide="truck"></i> Fast delivery</div>
          <div class="product-trust-item"><i data-lucide="rotate-ccw"></i> Easy returns</div>
        </div>
      </div>
    </div>

    <section class="section" id="relatedProductsSection" style="display:none;">
      <div class="section-header">
        <div>
          <h2 class="section-title">You may also like</h2>
          <p class="section-subtitle">More from ${product.category}.</p>
        </div>
      </div>
      <div id="relatedGrid" class="grid product-grid"></div>
    </section>
  `;

  refreshIcons();

  const mainImage = document.getElementById('productMainImage');
  document.querySelectorAll('[data-thumb-src]').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      mainImage.src = thumb.getAttribute('data-thumb-src');
      document.querySelectorAll('[data-thumb-src]').forEach((el) => el.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  const quantityInput = document.getElementById('quantitySelector');
  document.getElementById('qtyDecrease').addEventListener('click', () => {
    quantityInput.value = Math.max(1, Number(quantityInput.value || 1) - 1);
  });
  document.getElementById('qtyIncrease').addEventListener('click', () => {
    const max = Number(quantityInput.max || 99);
    quantityInput.value = Math.min(max, Number(quantityInput.value || 1) + 1);
  });

  const addButton = document.getElementById('detailsAddToCart');
  if (addButton && !addButton.disabled) {
    addButton.addEventListener('click', async () => {
      const quantity = Number(quantityInput.value) || 1;
      await addToCart(product.id, quantity);
    });
  }

  loadRelatedProducts(product);
}

async function loadRelatedProducts(product) {
  const section = document.getElementById('relatedProductsSection');
  const grid = document.getElementById('relatedGrid');
  if (!section || !grid) return;

  try {
    const params = new URLSearchParams({ category: product.category, limit: 5 });
    const data = await apiRequest(`/products?${params.toString()}`);
    const related = data.products.filter((item) => item.id !== product.id).slice(0, 4);
    if (!related.length) return;
    section.style.display = '';
    renderProductGrid(grid, related);
  } catch (error) {
    // Silently skip related products if the request fails.
  }
}

async function addToCart(productId, quantity = 1) {
  if (!getToken()) {
    requireLoginRedirect('Please log in to add items to your cart.');
    return;
  }

  await apiRequest('/cart', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
  toast('Added to cart');
  await updateCartBadge();
}

function bindProductCardActions() {
  document.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-view-id]');
    const cartButton = event.target.closest('[data-cart-id]');
    if (viewButton) {
      window.location.href = `product.html?id=${viewButton.getAttribute('data-view-id')}`;
    }
    if (cartButton) {
      await addToCart(Number(cartButton.getAttribute('data-cart-id')), 1);
    }
  });
}

function bindHomeEvents() {
  document.querySelectorAll('.chip[data-category]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const category = chip.getAttribute('data-category');
      window.location.href = `products.html?category=${encodeURIComponent(category)}`;
    });
  });

  bindProductCardActions();
}

async function loadCatalogGrid(container, resultsMeta) {
  const params = new URLSearchParams({
    search: appState.filters.search,
    category: appState.filters.category,
    minPrice: appState.filters.minPrice,
    maxPrice: appState.filters.maxPrice,
    page: appState.filters.page,
    limit: 60,
  });

  const data = await apiRequest(`/products?${params.toString()}`);
  appState.products = data.products;
  renderProductGrid(container, data.products);

  if (resultsMeta) {
    const categoryLabel = appState.filters.category === 'all' ? 'All categories' : appState.filters.category;
    resultsMeta.textContent = `${data.pagination.total} product${data.pagination.total === 1 ? '' : 's'} · ${categoryLabel}`;
  }
}

function setActiveCategoryChip(category) {
  document.querySelectorAll('.chip[data-category]').forEach((chip) => {
    chip.classList.toggle('active', chip.getAttribute('data-category') === category);
  });
}

async function initProductsPage() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  const resultsMeta = document.getElementById('catalogResultsMeta');
  const searchInput = document.getElementById('catalogSearchInput');
  const categoryFilter = document.getElementById('catalogCategoryFilter');
  const minPrice = document.getElementById('catalogMinPrice');
  const maxPrice = document.getElementById('catalogMaxPrice');
  const form = document.getElementById('catalogFilterForm');

  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get('search') || '';
  const initialCategory = urlParams.get('category') || 'all';

  appState.filters.search = initialSearch;
  appState.filters.category = initialCategory;

  if (searchInput) searchInput.value = initialSearch;
  if (categoryFilter) categoryFilter.value = initialCategory;
  setActiveCategoryChip(initialCategory);

  if (searchInput) {
    searchInput.addEventListener('input', async (event) => {
      appState.filters.search = event.target.value;
      await loadCatalogGrid(grid, resultsMeta);
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (searchInput) appState.filters.search = searchInput.value;
      if (categoryFilter) {
        appState.filters.category = categoryFilter.value;
        setActiveCategoryChip(categoryFilter.value);
      }
      await loadCatalogGrid(grid, resultsMeta);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', async (event) => {
      appState.filters.category = event.target.value;
      setActiveCategoryChip(event.target.value);
      await loadCatalogGrid(grid, resultsMeta);
    });
  }

  if (minPrice && maxPrice) {
    const handlePriceFilter = async () => {
      appState.filters.minPrice = Number(minPrice.value || 0);
      appState.filters.maxPrice = Number(maxPrice.value || 100000);
      await loadCatalogGrid(grid, resultsMeta);
    };
    minPrice.addEventListener('change', handlePriceFilter);
    maxPrice.addEventListener('change', handlePriceFilter);
  }

  document.querySelectorAll('.chip[data-category]').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const category = chip.getAttribute('data-category');
      appState.filters.category = category;
      if (categoryFilter) categoryFilter.value = category;
      setActiveCategoryChip(category);
      await loadCatalogGrid(grid, resultsMeta);
    });
  });

  bindProductCardActions();
  await loadCatalogGrid(grid, resultsMeta);
}

function renderLoginRequired(container, title, message) {
  container.innerHTML = `
    <div class="empty-state glass-panel login-gate">
      <div>
        <div class="login-gate-icon"><i data-lucide="lock"></i></div>
        <h2>${title}</h2>
        <p>${message}</p>
        <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap; margin-top:1rem;">
          <a class="button button-primary" href="login.html?redirect=${encodeURIComponent(window.location.pathname)}"><i data-lucide="log-in"></i> Log in</a>
          <a class="button button-secondary" href="register.html"><i data-lucide="user-plus"></i> Create account</a>
        </div>
      </div>
    </div>
  `;
  refreshIcons();
}

async function loadCart() {
  const container = document.getElementById('cartContent');
  if (!container) return;

  if (!getToken()) {
    renderLoginRequired(container, 'Sign in to view your cart', 'You need an account to add items and checkout securely.');
    return;
  }

  const data = await apiRequest('/cart');
  appState.cart = data.cart;
  setCartBadgeCount(data.cart.reduce((sum, item) => sum + Number(item.quantity), 0));
  if (!data.cart.length) {
    container.innerHTML = `
      <div class="empty-state glass-panel">
        <div>
          <div class="login-gate-icon"><i data-lucide="shopping-bag"></i></div>
          <h2>Your cart is empty</h2>
          <p>Add products to see them here and continue to checkout when you are ready.</p>
          <a class="button button-primary" href="products.html" style="margin-top:1rem;"><i data-lucide="store"></i> Browse products</a>
        </div>
      </div>`;
    refreshIcons();
    return;
  }

  const subtotal = data.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = subtotal * 0.1;

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-table glass-panel">
        <table>
          <thead>
            <tr>
              <th><i data-lucide="box"></i> Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.cart.map((item) => `
              <tr>
                <td>
                  <div class="cart-product-cell">
                    <img src="${item.image}" alt="${item.name}" class="cart-thumb">
                    <div>
                      <strong>${item.name}</strong>
                      <span class="helper-text">${item.category}</span>
                    </div>
                  </div>
                </td>
                <td><span class="qty-badge">${item.quantity}</span></td>
                <td class="price">${formatCurrency(Number(item.price) * Number(item.quantity))}</td>
                <td>
                  <button class="button button-danger-soft" data-remove-id="${item.id}"><i data-lucide="trash-2"></i> Remove</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <aside class="order-summary glass-panel cart-summary">
        <h2 style="margin-top:0;"><i data-lucide="receipt"></i> Order summary</h2>
        <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatCurrency(shipping)}</span></div>
        <div class="summary-row"><span>Tax</span><span>${formatCurrency(tax)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(subtotal + shipping + tax)}</span></div>
        <div class="cart-actions">
          <button id="clearCartButton" class="button button-secondary"><i data-lucide="x"></i> Clear cart</button>
          <a href="checkout.html" class="button button-primary"><i data-lucide="credit-card"></i> Checkout</a>
        </div>
      </aside>
    </div>
  `;

  refreshIcons();

  document.getElementById('clearCartButton').addEventListener('click', async () => {
    await apiRequest('/cart', { method: 'DELETE' });
    toast('Cart cleared');
    await loadCart();
  });

  document.querySelectorAll('[data-remove-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const cartItemId = button.getAttribute('data-remove-id');
      await apiRequest(`/cart/${cartItemId}`, { method: 'DELETE' });
      toast('Item removed');
      await loadCart();
    });
  });
}

async function renderCheckoutSummary() {
  const container = document.getElementById('checkoutSummary');
  if (!container) return;

  if (!getToken()) {
    renderLoginRequired(container, 'Sign in to checkout', 'Please log in before completing your purchase.');
    return;
  }

  const cartItems = (await apiRequest('/cart')).cart.map((item) => ({
    quantity: item.quantity,
    price: item.price,
    name: item.name,
  }));

  const total = cartItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = total > 100 ? 0 : 10;
  const tax = total * 0.1;
  container.innerHTML = `
    <h2 style="margin-top:0;"><i data-lucide="receipt"></i> Order Summary</h2>
    <p class="helper-text">Review your purchase before placing the order.</p>
    <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(total)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${formatCurrency(shipping)}</span></div>
    <div class="summary-row"><span>Tax</span><span>${formatCurrency(tax)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatCurrency(total + shipping + tax)}</span></div>
  `;
  refreshIcons();
}

async function loadProfile() {
  const profileBox = document.getElementById('profileBox');
  if (!profileBox || !getToken()) return;

  try {
    const data = await apiRequest('/auth/profile');
    const user = data.user;
    setStoredUser(user);
    renderAuthNav();

    const ordersData = await apiRequest('/orders');
    const orderCount = ordersData.orders.length;
    const pendingCount = ordersData.orders.filter((o) => o.order_status === 'pending').length;

    document.getElementById('dashOrderCount').textContent = orderCount;
    document.getElementById('dashPendingCount').textContent = pendingCount;

    profileBox.innerHTML = `
      <div class="profile-grid">
        <div class="profile-field glass-soft">
          <i data-lucide="user"></i>
          <div><span class="spec-label">Full name</span><span class="spec-value">${user.fullname}</span></div>
        </div>
        <div class="profile-field glass-soft">
          <i data-lucide="at-sign"></i>
          <div><span class="spec-label">Username</span><span class="spec-value">@${user.username}</span></div>
        </div>
        <div class="profile-field glass-soft">
          <i data-lucide="mail"></i>
          <div><span class="spec-label">Email</span><span class="spec-value">${user.email}</span></div>
        </div>
        <div class="profile-field glass-soft">
          <i data-lucide="badge-check"></i>
          <div><span class="spec-label">Role</span><span class="spec-value role-badge">${user.role}</span></div>
        </div>
        <div class="profile-field glass-soft">
          <i data-lucide="calendar"></i>
          <div><span class="spec-label">Joined</span><span class="spec-value">${new Date(user.created_at).toLocaleDateString()}</span></div>
        </div>
      </div>
    `;
    refreshIcons();
  } catch (error) {
    profileBox.innerHTML = '<div class="empty-state glass-panel"><div><h2>Profile unavailable</h2><p>Please sign in again to load your dashboard information.</p></div></div>';
  }
}

function formatOrderTitle(order) {
  const rawNames = (order.product_names || '').split(',').map((n) => n.trim()).filter(Boolean);
  const itemCount = Number(order.item_count) || rawNames.length;

  if (!rawNames.length) {
    return order.order_number || `Order #${order.id}`;
  }

  if (itemCount > 1) {
    const extra = itemCount - 1;
    return `${rawNames[0]}${extra > 0 ? ` +${extra} more` : ''}`;
  }

  return rawNames[0];
}

function renderOrdersTable(container, orders, { showCancel = false, showAdminActions = false } = {}) {
  if (!orders.length) {
    container.innerHTML = '<div class="empty-state glass-panel"><div><h2>No orders yet</h2><p>Your order history will appear here after checkout.</p></div></div>';
    return;
  }

  container.innerHTML = `
    <div class="cart-table glass-panel">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            ${showAdminActions ? '<th>Customer</th>' : ''}
            <th>Total</th>
            ${showAdminActions ? '' : '<th>Status</th>'}
            <th>Date</th>
            <th>${showAdminActions ? 'Status &amp; Actions' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map((order) => `
            <tr>
              <td>
                <strong>${formatOrderTitle(order)}</strong>
                <br><span class="helper-text">${order.order_number || `#${order.id}`}</span>
              </td>
              ${showAdminActions ? `<td>${order.customer_fullname || order.customer_name || '—'}<br><span class="helper-text">${order.customer_email || order.email || ''}</span></td>` : ''}
              <td class="price">${formatCurrency(order.total)}</td>
              ${showAdminActions ? '' : `<td>${renderStatusBadge(order.order_status)}</td>`}
              <td>${new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                ${showAdminActions ? `
                  <select class="status-select status-select-${order.order_status}" data-order-id="${order.id}" data-current="${order.order_status}">
                    <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                ` : ''}
                ${showCancel && order.order_status === 'pending' ? `
                  <button class="button button-danger-soft" data-cancel-order="${order.id}"><i data-lucide="ban"></i> Cancel</button>
                ` : ''}
                ${!showCancel && !showAdminActions ? '<span class="helper-text">—</span>' : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  refreshIcons();

  container.querySelectorAll('[data-cancel-order]').forEach((button) => {
    button.addEventListener('click', async () => {
      const orderId = button.getAttribute('data-cancel-order');
      try {
        await apiRequest(`/orders/${orderId}/cancel`, { method: 'PATCH' });
        toast('Order cancelled');
        loadOrders();
      } catch (error) {
        toast(error.message);
      }
    });
  });

  container.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const orderId = select.getAttribute('data-order-id');
      const previous = select.getAttribute('data-current');
      try {
        await apiRequest(`/orders/${orderId}`, {
          method: 'PUT',
          body: JSON.stringify({ orderStatus: select.value }),
        });
        select.setAttribute('data-current', select.value);
        select.className = `status-select status-select-${select.value}`;
        toast('Order status updated');
        loadAdminDashboard();
      } catch (error) {
        select.value = previous;
        toast(error.message);
      }
    });
  });
}

async function loadOrders() {
  const ordersTable = document.getElementById('ordersTable');
  if (!ordersTable) return;

  if (!getToken()) {
    renderLoginRequired(ordersTable, 'Sign in to view orders', 'Your purchase history is available after you log in.');
    return;
  }

  try {
    const data = await apiRequest('/orders');
    renderOrdersTable(ordersTable, data.orders, { showCancel: true });
  } catch (error) {
    ordersTable.innerHTML = '<div class="empty-state glass-panel"><div><h2>Unable to load orders</h2><p>Sign in to view your purchase history.</p></div></div>';
  }
}

async function loadAdminStats() {
  const statsMount = document.getElementById('adminStats');
  if (!statsMount || !getToken()) return;

  try {
    const data = await apiRequest('/admin/stats');
    const { stats } = data;
    statsMount.innerHTML = `
      <div class="dash-stat-card stat-users">
        <div class="dash-stat-icon"><i data-lucide="users"></i></div>
        <div><span class="dash-stat-value">${stats.totalUsers}</span><span class="dash-stat-label">Registered users</span></div>
      </div>
      <div class="dash-stat-card stat-orders">
        <div class="dash-stat-icon"><i data-lucide="package"></i></div>
        <div><span class="dash-stat-value">${stats.totalOrders}</span><span class="dash-stat-label">Total orders</span></div>
      </div>
      <div class="dash-stat-card stat-pending">
        <div class="dash-stat-icon"><i data-lucide="clock"></i></div>
        <div><span class="dash-stat-value">${stats.pendingOrders}</span><span class="dash-stat-label">Pending</span></div>
      </div>
      <div class="dash-stat-card stat-delivered">
        <div class="dash-stat-icon"><i data-lucide="truck"></i></div>
        <div><span class="dash-stat-value">${stats.deliveredOrders}</span><span class="dash-stat-label">Delivered</span></div>
      </div>
      <div class="dash-stat-card stat-cancelled">
        <div class="dash-stat-icon"><i data-lucide="x-circle"></i></div>
        <div><span class="dash-stat-value">${stats.cancelledOrders}</span><span class="dash-stat-label">Cancelled</span></div>
      </div>
    `;
    refreshIcons();
  } catch (error) {
    statsMount.innerHTML = '<div class="empty-state"><p>Unable to load admin statistics.</p></div>';
  }
}

async function loadAdminUsers() {
  const usersTable = document.getElementById('usersTable');
  if (!usersTable || !getToken()) return;

  try {
    const data = await apiRequest('/admin/users');
    document.getElementById('adminUserCount').textContent = data.total;

    if (!data.users.length) {
      usersTable.innerHTML = '<div class="empty-state glass-panel"><div><h2>No users found</h2><p>Registered customers will show up here.</p></div></div>';
      return;
    }

    usersTable.innerHTML = `
      <div class="cart-table glass-panel">
        <table>
          <thead>
            <tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr>
          </thead>
          <tbody>
            ${data.users.map((user) => `
              <tr>
                <td>${user.fullname}</td>
                <td>@${user.username}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    usersTable.innerHTML = '<div class="empty-state glass-panel"><div><h2>Admin view unavailable</h2><p>Sign in with an admin account to manage users.</p></div></div>';
  }
}

async function loadAdminOrders() {
  const ordersTable = document.getElementById('adminOrdersTable');
  if (!ordersTable || !getToken()) return;

  try {
    const data = await apiRequest('/orders');
    renderOrdersTable(ordersTable, data.orders, { showAdminActions: true });
  } catch (error) {
    ordersTable.innerHTML = '<div class="empty-state glass-panel"><div><h2>Unable to load orders</h2><p>Admin access required.</p></div></div>';
  }
}

async function loadAdminDashboard() {
  await loadAdminStats();
  await loadAdminUsers();
  await loadAdminOrders();
}

async function initializePage() {
  const page = document.body.dataset.page;
  bindMobileNav();
  bindPasswordToggles();
  highlightActiveNavLink();
  await validateSession();

  if (page === 'home') {
    bindHomeEvents();
    await loadProducts();
  }

  if (page === 'products') {
    await initProductsPage();
  }

  if (page === 'product') {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) await loadProductDetails(id);
  }

  if (page === 'cart') {
    await loadCart();
  }

  if (page === 'checkout') {
    await renderCheckoutSummary();
  }

  if (page === 'dashboard') {
    if (!getToken()) {
      requireLoginRedirect('Please log in to access your dashboard.');
      return;
    }
    await loadProfile();
    await loadOrders();
  }

  if (page === 'orders') {
    await loadOrders();
  }

  if (page === 'admin') {
    const user = getStoredUser();
    if (!getToken() || user?.role !== 'admin') {
      toast('Admin access required.');
      window.setTimeout(() => { window.location.href = 'login.html?redirect=admin.html'; }, 900);
      return;
    }
    await loadAdminDashboard();
  }

  const authForms = document.querySelectorAll('[data-auth-form]');
  authForms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const action = form.getAttribute('data-auth-form');
      const formData = Object.fromEntries(new FormData(form).entries());
      try {
        const data = await apiRequest(`/auth/${action}`, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        if (data.token) setToken(data.token);
        if (data.user) setStoredUser(data.user);
        toast(data.message);
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirect ? decodeURIComponent(redirect) : 'dashboard.html';
      } catch (error) {
        toast(error.message);
      }
    });
  });

  refreshIcons();
}

document.addEventListener('DOMContentLoaded', initializePage);
