/* ---------- WhatsApp order notifications ----------
   Orders get sent here as a WhatsApp message so you have the
   customer's delivery address and phone number to fulfill the order. */
const WHATSAPP_NUMBER = "919909444006";

/* ---------- Razorpay setup ----------
   Paste your Razorpay Key ID between the quotes below.
   Use your Test Key ID (starts with rzp_test_...) while trying things out —
   no real money moves in test mode. When you're ready to accept real
   payments, switch this to your Live Key ID (starts with rzp_live_...). */
const RAZORPAY_KEY_ID = "rzp_test_T9W7jbAqHJ7B8F";

function getProfile(){
  try { return JSON.parse(localStorage.getItem('amore_profile')); }
  catch(e){ return null; }
}

/* Opens the Razorpay payment window.
   options = { amountRupees, description, onSuccess } */
function openRazorpayCheckout(options){
  if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.indexOf('PASTE_YOUR') === 0){
    alert('Razorpay isn\'t connected yet. Add your Razorpay Key ID in cart.js (look for RAZORPAY_KEY_ID) to accept real payments.');
    return;
  }
  const profile = getProfile() || {};
  const rzp = new Razorpay({
    key: RAZORPAY_KEY_ID,
    amount: Math.round(options.amountRupees * 100), // Razorpay wants paise, not rupees
    currency: 'INR',
    name: 'Meraki Touch',
    description: options.description || 'Order payment',
    prefill: {
      name: profile.name || '',
      email: profile.email || '',
      contact: profile.phone || ''
    },
    theme: { color: '#6E6E6E' },
    handler: function(response){
      // response.razorpay_payment_id confirms the payment went through.
      options.onSuccess(response.razorpay_payment_id);
    },
    modal: {
      ondismiss: function(){
        // Customer closed the payment window without paying — no action needed.
      }
    }
  });
  rzp.open();
}

/* ---------- Meraki Touch: Bag + Wishlist helper ----------
   Everything here saves to the visitor's own browser (localStorage),
   so their bag and wishlist stay put while they browse, and even if
   they close the tab and come back later. Nothing is sent anywhere;
   it lives only on their device until you connect real payments/login. */
const BAG_KEY = 'amore_bag';
const WISHLIST_KEY = 'amore_wishlist';

function getBag(){
  try { return JSON.parse(localStorage.getItem(BAG_KEY)) || {}; }
  catch(e){ return {}; }
}
function setBag(bag){
  localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  updateBagBadge();
}

/* ---------- Stock control ----------
   To limit how many of a product can be bought, add a "stock" number to
   that product in data/products.json, e.g.  "stock": 5
   - Leave the "stock" field out entirely  → no limit, sells freely.
   - Set "stock": 0                        → shows "Sold Out" and blocks buying.
   - Set "stock": 5                        → customers can add up to 5 total; the
                                              exact number is never shown to them.
   This works the same way on every page (home, categories, buy, bag) because
   it's loaded once here and shared. */
let PRODUCT_STOCK = null; // becomes {id: stock} once data/products.json loads
const PRODUCT_STOCK_READY = fetch('data/products.json')
  .then(r => r.json())
  .then(data => {
    PRODUCT_STOCK = {};
    (data.products || []).forEach(p => {
      if (p.stock !== undefined && p.stock !== null) PRODUCT_STOCK[p.id] = p.stock;
    });
    return PRODUCT_STOCK;
  })
  .catch(() => { PRODUCT_STOCK = {}; return PRODUCT_STOCK; });

// true only for products explicitly set to 0 — everything else (including
// products with no "stock" field at all) counts as available.
function isSoldOut(id){
  return !!(PRODUCT_STOCK && PRODUCT_STOCK[id] === 0);
}

function showStockToast(message){
  let toast = document.getElementById('stockToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'stockToast';
    toast.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);' +
      'background:#2B2B2A;color:#F3EFE8;padding:12px 22px;border-radius:24px;font-size:13px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.2);opacity:0;pointer-events:none;' +
      'transition:opacity .25s, transform .25s;z-index:9999;font-family:sans-serif;max-width:80vw;text-align:center;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translate(-50%,0)';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%,20px)';
  }, 2200);
}

/* Returns true if the item was added, false if stock blocked it.
   Existing calls like addToBag(id) still work exactly as before —
   the stock check only changes behaviour for products that have a
   "stock" number set in products.json. */
async function addToBag(id, qty){
  qty = qty || 1;
  if (!PRODUCT_STOCK) { await PRODUCT_STOCK_READY; }

  const stock = PRODUCT_STOCK[id];
  const bag = getBag();
  const already = bag[id] || 0;

  if (stock !== undefined){
    if (stock <= 0){
      showStockToast("Sorry, this item is sold out.");
      return false;
    }
    if (already + qty > stock){
      // Deliberately vague — never reveals the actual number left.
      showStockToast("Sorry, that's the most we have of this one right now.");
      return false;
    }
  }

  bag[id] = already + qty;
  setBag(bag);
  return true;
}

/* Same stock rule applied when someone types a quantity directly
   (e.g. a quantity box on the bag or buy page), not just the +/- clicks. */
async function setBagQty(id, qty){
  if (!PRODUCT_STOCK) { await PRODUCT_STOCK_READY; }
  const stock = PRODUCT_STOCK[id];

  if (qty <= 0) {
    const bag = getBag();
    delete bag[id];
    setBag(bag);
    return true;
  }

  if (stock !== undefined && qty > stock){
    showStockToast("Sorry, that's the most we have of this one right now.");
    return false;
  }

  const bag = getBag();
  bag[id] = qty;
  setBag(bag);
  return true;
}

function removeFromBag(id){
  const bag = getBag();
  delete bag[id];
  setBag(bag);
}
function bagItemCount(){
  const bag = getBag();
  return Object.values(bag).reduce((sum, q) => sum + q, 0);
}
function updateBagBadge(){
  const count = bagItemCount();
  document.querySelectorAll('.bag-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? '' : 'none';
  });
}

function getWishlist(){
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
  catch(e){ return []; }
}
function setWishlist(list){
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  updateWishlistBadge();
}
function isWishlisted(id){
  return getWishlist().includes(id);
}
function toggleWishlist(id){
  let list = getWishlist();
  if (list.includes(id)) { list = list.filter(x => x !== id); }
  else { list.push(id); }
  setWishlist(list);
  return list.includes(id);
}
function updateWishlistBadge(){
  const count = getWishlist().length;
  document.querySelectorAll('.wishlist-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? '' : 'none';
  });
}

// Run on every page load so the header badges are always correct.
document.addEventListener('DOMContentLoaded', () => {
  updateBagBadge();
  updateWishlistBadge();
});
