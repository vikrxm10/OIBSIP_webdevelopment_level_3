(function(){
  if (window.__PizzaAppInit) return; window.__PizzaAppInit = true;
  function safeParse(s){ try{ return JSON.parse(s||'[]'); }catch(e){ return []; } }
  // Respect page-local implementations if present
  if (!window.getCart) window.getCart = function(){ return safeParse(localStorage.getItem('cart')); };
  if (!window.saveCart) window.saveCart = function(c){ try{ localStorage.setItem('cart', JSON.stringify(c||[])); }catch(e){} updateBadge(); window.dispatchEvent(new Event('storage')); };
  function updateBadge(){ try{ const el = document.getElementById('cartCount'); if (!el) return; const c = getCart() || []; const qty = c.reduce((s,i)=> s + (i.qty||0), 0); el.textContent = qty; }catch(e){} }
  window.updateBadge = updateBadge;

  function signOut(){ try{ if (!confirm('Are you sure you want to sign out?')) return; localStorage.removeItem('cart'); localStorage.removeItem('pizzaBuilder'); localStorage.removeItem('lastOrder'); }catch(e){} try{ window.location.href = 'login.html'; }catch(e){} }
  window.signOut = signOut;

  function findImageFromCard(card){
    try{
      const el = card && card.querySelector && card.querySelector('[style*="background-image"]');
      if (el){ const s = el.getAttribute('style') || ''; const m = s.match(/url\(["']?(.*?)["']?\)/); return (m && m[1]) || '' }
      const img = card && (card.querySelector('img')?.src || card.querySelector('img')?.getAttribute('src'));
      return img || '';
    }catch(e){ return ''; }
  }

  // --- Payment methods management ---
  function getPayments(){ try{ return safeParse(localStorage.getItem('payments')); }catch(e){ return []; } }
  function savePayments(p){ try{ localStorage.setItem('payments', JSON.stringify(p||[])); }catch(e){} }

  function renderPayments(){
    const container = document.getElementById('paymentsList');
    if (!container) return;
    const payments = getPayments();
    // preserve the Add button if present
    const addBtn = Array.from(container.children).find(n => n && (n.textContent||'').includes('Add New Payment Method'));
    container.innerHTML = '';
    payments.forEach(pm => {
      const div = document.createElement('div');
      div.className = 'group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#2a1c15] p-5 rounded-xl border border-[#e6dbd6] dark:border-[#3a2820] shadow-sm hover:shadow-md transition-shadow';
      div.setAttribute('data-payment-id', pm.id);
      const imgStyle = pm.image ? `background-image: url('${pm.image}')` : '';
      div.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="bg-center bg-no-repeat bg-contain h-10 w-16 shrink-0 rounded bg-white border border-gray-100 p-1" style="${imgStyle}"></div>
          <div class="flex flex-col justify-center">
            <div class="flex items-center gap-2">
              <p class="text-[#1c120d] dark:text-white text-base font-bold leading-normal">${pm.title}</p>
              ${pm.isDefault ? '<span class="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">Default</span>' : ''}
            </div>
            <p class="text-[#9c6549] dark:text-[#ccb0a0] text-sm font-normal leading-normal">${pm.subtitle||''}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 sm:self-center self-end w-full sm:w-auto justify-end">
          ${pm.isDefault ? '<button class="text-sm font-medium text-[#1c120d] dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-colors hidden sm:block">Default</button>' : '<button class="text-sm font-medium make-default text-[#1c120d] dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-colors hidden sm:block">Make Default</button>'}
          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
          <button aria-label="Edit" class="p-2 text-[#9c6549] dark:text-[#ccb0a0] hover:bg-[#f4ebe7] dark:hover:bg-[#3a2820] rounded-lg transition-colors"><span class="material-symbols-outlined text-[20px]">edit</span></button>
          <button aria-label="Delete" class="p-2 text-[#9c6549] dark:text-[#ccb0a0] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
        </div>`;
      container.appendChild(div);
      // add a small-screen Make Default / Default button for mobile layouts
      const mobileBtn = document.createElement('button');
      mobileBtn.className = 'sm:hidden w-full py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg bg-primary/5 mt-3';
      mobileBtn.textContent = pm.isDefault ? 'Default' : 'Make Default';
      div.appendChild(mobileBtn);
    });
    if (addBtn) container.appendChild(addBtn);
  }

  function importExistingPaymentCards(){
    const container = document.getElementById('paymentsList');
    if (!container) return;
    if (getPayments().length) return renderPayments();
    const children = Array.from(container.children || []);
    const addBtn = children.find(n => n && (n.textContent||'').includes('Add New Payment Method'));
    const cards = children.filter(n => n !== addBtn);
    if (!cards.length) return;
    const payments = cards.map((n, idx) => {
      const title = n.querySelector('p.text-base.font-bold')?.textContent?.trim() || n.querySelector('p')?.textContent?.trim() || ('Payment ' + (idx+1));
      const subtitle = n.querySelector('p.text-sm')?.textContent?.trim() || '';
      const image = findImageFromCard(n) || '';
      const isDefault = !!n.querySelector('span.inline-flex');
      return { id: 'p' + (Date.now() + idx), title, subtitle, image, isDefault };
    });
    if (payments.length) savePayments(payments);
    renderPayments();
  }

  function deletePayment(id){
    let payments = getPayments();
    payments = payments.filter(p => p.id !== id);
    savePayments(payments);
    renderPayments();
  }

  function setDefaultPayment(id){
    const payments = getPayments();
    payments.forEach(p => p.isDefault = (p.id === id));
    savePayments(payments);
    renderPayments();
  }

  function addPaymentInteractive(){
    const type = prompt('Add payment type (card or upi)', 'card');
    if (!type) return;
    const title = prompt('Title (e.g. Visa ending in 4242)', type === 'card' ? 'New Card' : 'New UPI');
    if (!title) return;
    const subtitle = prompt('Subtitle / details (expiry or UPI id)', '');
    const image = prompt('Image URL (optional)', '') || '';
    const pm = { id: 'p' + Date.now(), title, subtitle, image, isDefault: false };
    const payments = getPayments();
    payments.push(pm);
    savePayments(payments);
    renderPayments();
  }

  function editPaymentInteractive(id){
    if (!id) return;
    const payments = getPayments();
    const pm = payments.find(p => p.id === id);
    if (!pm) return;
    const title = prompt('Title', pm.title) || pm.title;
    const subtitle = prompt('Subtitle / details', pm.subtitle) || pm.subtitle;
    const image = prompt('Image URL (optional)', pm.image || '') || pm.image || '';
    pm.title = title;
    pm.subtitle = subtitle;
    pm.image = image;
    savePayments(payments);
    renderPayments();
  }

  // --- end payments management ---

  // --- Addresses management ---
  function getAddresses(){ try{ return safeParse(localStorage.getItem('addresses')); }catch(e){ return []; } }
  function saveAddresses(a){ try{ localStorage.setItem('addresses', JSON.stringify(a||[])); }catch(e){} }

  function renderAddresses(){
    let container = document.getElementById('addressesList');
    if (!container){
      // try to insert it after the Add New Address button
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText||'').trim().includes('Add New Address') || b.getAttribute('aria-label') === 'Add New Address');
      if (!addBtn) return;
      const wrapper = document.createElement('div'); wrapper.id = 'addressesList'; wrapper.className = 'flex flex-col gap-4 mt-4';
      addBtn.parentNode.insertBefore(wrapper, addBtn.nextSibling);
      container = wrapper;
    }
    const addresses = getAddresses();
    container.innerHTML = '';
    if (!addresses || !addresses.length){ container.innerHTML = '<p class="text-sm text-[#9c6549] dark:text-[#ccb0a0]">No saved addresses yet.</p>'; return; }
    addresses.forEach(a => {
      const div = document.createElement('div');
      div.className = 'group bg-white dark:bg-[#2a1c15] p-5 rounded-xl border border-[#e6dbd6] dark:border-[#3a2820] shadow-sm flex items-start justify-between';
      div.setAttribute('data-address-id', a.id);
      div.innerHTML = `
        <div>
          <p class="text-[#1c120d] dark:text-white text-base font-bold leading-normal">${a.title}</p>
          <p class="text-[#9c6549] dark:text-[#ccb0a0] text-sm">${a.line1}${a.city ? ', ' + a.city : ''}</p>
          <p class="text-[#9c6549] dark:text-[#ccb0a0] text-sm">${a.phone || ''}</p>
        </div>
        <div class="flex items-center gap-2 self-end">
          <button class="text-sm font-medium ${a.isDefault ? 'text-primary' : 'make-default'}">${a.isDefault ? 'Default' : 'Make Default'}</button>
          <button aria-label="Edit Address" class="p-2 text-[#9c6549] dark:text-[#ccb0a0] hover:bg-[#f4ebe7] dark:hover:bg-[#3a2820] rounded-lg transition-colors"><span class="material-symbols-outlined text-[20px]">edit</span></button>
          <button aria-label="Delete Address" class="p-2 text-[#9c6549] dark:text-[#ccb0a0] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
        </div>`;
      container.appendChild(div);
    });
  }

  function importExistingAddresses(){
    const addresses = getAddresses();
    if (addresses.length) return renderAddresses();
    // Look for address-like static markup and import basic info
    const nodes = Array.from(document.querySelectorAll('p'));
    const found = [];
    nodes.forEach(n => {
      const txt = (n.textContent||'').trim();
      // crude heuristic: lines that look like addresses (contain numbers and commas)
      if (/,/.test(txt) && /\d/.test(txt) && txt.length > 10){
        found.push({ id: 'a' + (Date.now()+found.length), title: 'Saved Address', line1: txt, city: '', phone: '', isDefault: false });
      }
    });
    if (found.length){ saveAddresses(found); }
    renderAddresses();
  }

  function addAddressInteractive(){
    const title = prompt('Label for this address (Home, Work, etc.)', 'Home');
    if (!title) return;
    const line1 = prompt('Address line 1', '123 Main St') || '';
    const city = prompt('City', '') || '';
    const phone = prompt('Phone (optional)', '') || '';
    const isDefault = confirm('Set as default address?');
    const addr = { id: 'a' + Date.now(), title, line1, city, phone, isDefault };
    const list = getAddresses();
    if (isDefault) list.forEach(a => a.isDefault = false);
    list.push(addr); saveAddresses(list); renderAddresses();
  }

  function editAddressInteractive(id){
    if (!id) return;
    const list = getAddresses(); const a = list.find(x => x.id === id); if (!a) return;
    const title = prompt('Label', a.title) || a.title;
    const line1 = prompt('Address line 1', a.line1) || a.line1;
    const city = prompt('City', a.city) || a.city;
    const phone = prompt('Phone', a.phone) || a.phone;
    const isDefault = confirm('Set as default?');
    if (isDefault) list.forEach(x => x.isDefault = false);
    a.title = title; a.line1 = line1; a.city = city; a.phone = phone; a.isDefault = isDefault;
    saveAddresses(list); renderAddresses();
  }

  function deleteAddress(id){
    if (!id) return; if (!confirm('Delete this address?')) return;
    let list = getAddresses(); list = list.filter(x => x.id !== id);
    // ensure one default remains if needed
    if (list.length && !list.some(x => x.isDefault)) list[0].isDefault = true;
    saveAddresses(list); renderAddresses();
  }

  function setDefaultAddress(id){
    const list = getAddresses(); list.forEach(x => x.isDefault = (x.id === id)); saveAddresses(list); renderAddresses();
  }

  // --- end Addresses management ---

  function initDelegation(){
    document.addEventListener('click', function(e){
      const el = e.target;
      // Add to cart buttons: look for 'Add' text, add_shopping_cart icon, or class 'add-to-cart'
      const btn = el.closest && el.closest('button');
      if (btn){
        const txt = (btn.innerText||'').trim();
        const icon = btn.querySelector && btn.querySelector('span.material-symbols-outlined')?.textContent?.trim();
        if (txt === 'Add' || icon === 'add_shopping_cart' || btn.classList.contains('add-to-cart')){
          const card = btn.closest('.group') || btn.closest('div');
          const name = (card && (card.querySelector('h3')?.textContent || card.querySelector('h1')?.textContent) )?.trim() || 'Item';
          const priceText = (card && (card.querySelector('div.absolute span')?.textContent || card.querySelector('.price')?.textContent)) || '$0';
          const price = Number((priceText||'').replace(/[^0-9.]/g,'')) || 0;
          const img = findImageFromCard(card) || '';
          const cart = getCart() || [];
          const found = cart.find(i => i.name === name && (i.image||'') === (img||''));
          if (found) found.qty = (found.qty||1) + 1; else cart.push({ name, price, qty:1, image: img });
          saveCart(cart);
          // feedback
          const orig = btn.innerHTML;
          try{ btn.disabled = true; btn.innerHTML = 'Added ✓'; setTimeout(()=>{ btn.innerHTML = orig; btn.disabled = false; }, 700); }catch(e){}
          return;
        }
        // Customize shortcut
        if (btn.title && btn.title.toLowerCase().includes('customize')){ window.location.href = 'pizabuilder.html'; return; }
        // Reorder buttons
        if (btn.classList.contains('reorder') || (btn.innerText||'').trim() === 'Reorder'){
          const orderEl = btn.closest('[data-order]');
          if (!orderEl){ /* fallback: look for data-order-items attr on button */ }
          try{
            const items = safeParse(orderEl?.getAttribute('data-order-items') || orderEl?.getAttribute('data-items') || '[]');
            const cart = getCart() || [];
            items.forEach(it=>{ const found = cart.find(c=> c.name === it.name && (c.image||'') === (it.image||'')); if (found) found.qty = (found.qty||1) + (it.qty||1); else cart.push(Object.assign({qty: it.qty||1}, it)); });
            saveCart(cart);
            const orig = btn.innerText; btn.disabled = true; btn.innerText = 'Added'; setTimeout(()=>{ btn.disabled=false; btn.innerText = orig; },800);
          }catch(e){}
          return;
        }
      }

      // View cart elements
      const viewCart = el.closest && el.closest('[aria-label="View cart"]');
      if (viewCart){ window.location.href = 'cart.html'; return; }

      const logoutEl = el.closest && (el.closest('button[aria-label="Sign Out"]') || el.closest('a[aria-label="Log Out"]') || (el.tagName === 'BUTTON' && (el.innerText||'').trim() === 'Sign Out') || (el.tagName === 'A' && (el.innerText||'').trim().toLowerCase().includes('log out')));
      if (logoutEl){ try{ e.preventDefault && e.preventDefault(); signOut(); }catch(err){} return; }

      // data-action handlers
      const actionEl = el.closest && el.closest('[data-action]');
      if (actionEl){
        const action = actionEl.getAttribute('data-action');
        if (action === 'track') window.location.href = 'orderconfirmation.html';
        if (action === 'details') { const order = actionEl.closest('[data-order]'); if (order){ try{ localStorage.setItem('lastOrder', order.getAttribute('data-order-json')); }catch(e){} } window.location.href = 'orderconfirmation.html'; }
      }

      // Payments: Delete / Edit / Make Default / Add New
      const deleteBtn = el.closest && (el.closest('button[aria-label="Delete"]') || el.closest('button[aria-label="Delete Address"]'));
      if (deleteBtn){
        if (deleteBtn.closest('#paymentsList')){
          const card = deleteBtn.closest('[data-payment-id]');
          if (card) { if (confirm('Delete this payment method?')) deletePayment(card.getAttribute('data-payment-id')); }
          return;
        }
        if (deleteBtn.closest('#addressesList')){
          const card = deleteBtn.closest('[data-address-id]'); if (card) deleteAddress(card.getAttribute('data-address-id')); return;
        }
      }

      const editBtn = el.closest && (el.closest('button[aria-label="Edit"]') || el.closest('button[aria-label="Edit Address"]'));
      if (editBtn){
        if (editBtn.closest('#paymentsList')){ const card = editBtn.closest('[data-payment-id]'); if (card) editPaymentInteractive(card.getAttribute('data-payment-id')); return; }
        if (editBtn.closest('#addressesList')){ const card = editBtn.closest('[data-address-id]'); if (card) editAddressInteractive(card.getAttribute('data-address-id')); return; }
      }

      const makeBtn = el.closest && (el.closest('.make-default') || (el.tagName === 'BUTTON' && (el.innerText||'').trim() === 'Make Default'));
      if (makeBtn){
        if (makeBtn.closest('#paymentsList')){ const card = makeBtn.closest('[data-payment-id]'); if (card) setDefaultPayment(card.getAttribute('data-payment-id')); return; }
        if (makeBtn.closest('#addressesList')){ const card = makeBtn.closest('[data-address-id]'); if (card) setDefaultAddress(card.getAttribute('data-address-id')); return; }
      }

      const addBtnEl = (el && el.closest && (el.closest('button[aria-label="Add New Payment"]') || (el && (el.innerText||'').includes('Add New Payment Method') && el.closest('#paymentsList'))));
      if (addBtnEl){ addPaymentInteractive(); return; }

      // Add address button
      if (el && el.closest && ((el.tagName === 'BUTTON' && (el.innerText||'').trim().includes('Add New Address')) || el.getAttribute && el.getAttribute('aria-label') === 'Add New Address')){
        addAddressInteractive(); return;
      }

    }, false);
  }

  document.addEventListener('DOMContentLoaded', function(){ updateBadge(); importExistingPaymentCards(); importExistingAddresses(); initDelegation(); if (document.getElementById('paymentsList')) renderPayments(); if (document.querySelector('button') && (Array.from(document.querySelectorAll('button')).some(b => (b.innerText||'').includes('Add New Address')))) renderAddresses(); });
  window.addEventListener('storage', function(e){ if (!e.key || e.key === 'cart' || e.key === 'lastOrder') updateBadge(); });
})();