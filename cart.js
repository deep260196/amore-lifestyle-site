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
    name: 'Amore Lifestyle',
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

/* ---------- Amore Lifestyle: Bag + Wishlist helper ----------
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
function addToBag(id, qty){
  qty = qty || 1;
  const bag = getBag();
  bag[id] = (bag[id] || 0) + qty;
  setBag(bag);
}
function setBagQty(id, qty){
  const bag = getBag();
  if (qty <= 0) { delete bag[id]; } else { bag[id] = qty; }
  setBag(bag);
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
  document.querySelectorAll('.bag-count').forEach(el => el.textContent = count);
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
  document.querySelectorAll('.wishlist-count').forEach(el => el.textContent = count);
}

// Run on every page load so the header badges are always correct.
document.addEventListener('DOMContentLoaded', () => {
  updateBagBadge();
  updateWishlistBadge();
});
