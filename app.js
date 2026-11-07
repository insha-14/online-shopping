let currentUserId = localStorage.getItem("shoppingUserId") || "";
const icons = {Electronics:"🎧",Fashion:"🎒",Footwear:"👟",Books:"📚",Home:"🏡"};
const money = n => "₹" + Number(n).toFixed(2);
async function api(url, options={}) {
  const response = await fetch(url, {headers:{"Content-Type":"application/json"}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
function toast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600)}
function setUser(id){currentUserId=id;localStorage.setItem("shoppingUserId",id);document.getElementById("user-id").value=id;document.getElementById("account-status").textContent="Active customer ID: "+id;loadCart();loadOrders()}
document.getElementById("user-form").addEventListener("submit",e=>{e.preventDefault();const id=document.getElementById("user-id").value;if(id)setUser(id)});
async function loadProducts(){
  try{const products=await api("/api/products");const grid=document.getElementById("product-grid");
    grid.innerHTML=products.map(p=>`<article class="product-card"><div class="product-image">${icons[p.category]||"🛍️"}</div><div class="product-info"><span class="category">${p.category}</span><h3>${escapeHtml(p.product_name)}</h3><p>${escapeHtml(p.description||"A great addition to your everyday essentials.")}</p><div class="price-row"><span class="price">${money(p.price)}</span><button class="add-btn" ${p.stock<1?"disabled":""} onclick="addToCart(${p.product_id})">${p.stock<1?"Out of stock":"Add +"}</button></div><small class="muted">${p.stock} available</small></div></article>`).join("")||"<p>No products available.</p>";
  }catch(e){document.getElementById("product-grid").innerHTML="<p>Unable to load products. Start the server and check your MySQL connection.</p>";}
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function addToCart(product_id){if(!currentUserId)return toast("Enter your customer ID first.");try{await api("/api/cart",{method:"POST",body:JSON.stringify({user_id:Number(currentUserId),product_id,quantity:1})});toast("Added to your cart!");loadCart()}catch(e){toast(e.message)}}
async function loadCart(){
  if(!currentUserId)return;try{const items=await api("/api/cart/"+currentUserId);document.getElementById("cart-count").textContent=items.reduce((s,x)=>s+Number(x.quantity),0);
    document.getElementById("cart-items").innerHTML=items.length?items.map(i=>`<div class="cart-row"><div><h4>${escapeHtml(i.product_name)}</h4><small>${money(i.price)} each</small></div><input type="number" min="1" max="${i.stock}" value="${i.quantity}" onchange="updateQuantity(${i.cart_id},this.value)"><strong>${money(i.subtotal)}</strong><button class="remove" onclick="removeItem(${i.cart_id})">Remove</button></div>`).join(""):'<p class="muted">Your cart is empty. Explore products above!</p>';
    const total=items.reduce((s,x)=>s+Number(x.subtotal),0);document.getElementById("subtotal").textContent=money(total);document.getElementById("total").textContent=money(total);
  }catch(e){toast(e.message)}
}
async function updateQuantity(id,quantity){try{await api("/api/cart/"+id,{method:"PUT",body:JSON.stringify({quantity:Number(quantity)})});loadCart()}catch(e){toast(e.message);loadCart()}}
async function removeItem(id){try{await api("/api/cart/"+id,{method:"DELETE"});loadCart();toast("Item removed.")}catch(e){toast(e.message)}}
function showCart(){document.getElementById("cart").scrollIntoView({behavior:"smooth"})}
async function checkout(){if(!currentUserId)return toast("Enter your customer ID first.");try{const result=await api("/api/orders",{method:"POST",body:JSON.stringify({user_id:Number(currentUserId)})});toast(`${result.message} Order #${result.order_id}`);loadCart();loadProducts();loadOrders()}catch(e){toast(e.message)}}
async function loadOrders(){if(!currentUserId)return;try{const orders=await api("/api/orders/"+currentUserId);document.getElementById("order-list").innerHTML=orders.length?orders.map(o=>`<div class="order-row"><span>Order #${o.order_id} · ${new Date(o.order_date).toLocaleDateString()}</span><strong>${money(o.total_amount)} · ${escapeHtml(o.status)}</strong></div>`).join(""):"No orders placed yet."}catch(e){document.getElementById("order-list").textContent=e.message}}
document.getElementById("product-form").addEventListener("submit",async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));data.price=Number(data.price);data.stock=Number(data.stock);try{await api("/api/products",{method:"POST",body:JSON.stringify(data)});toast("Product added successfully.");e.target.reset();loadProducts()}catch(err){toast(err.message)}});
if(currentUserId)setUser(currentUserId);
loadProducts();
