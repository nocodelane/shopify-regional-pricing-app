(function () {
    // Force sync trigger - v1.1
    // --- Phase 0: Aggressive Flicker Guard ---
    (function injectGuard() {
        const getCookie = (name) => { const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)'); return v ? v[2] : null; };
        const rid = getCookie("regionId") || localStorage.getItem("regionId");
        
        if (rid && rid !== "null" && rid !== "undefined") {
            const css = `
                .price, .money, .amount, .price-item, .product-item__price, .price__regular, .price__sale, 
                [data-price], .product-single__price, .product__price { 
                    visibility: hidden !important; 
                    opacity: 0 !important;
                }
                .pincode-prices-revealed .price, 
                .pincode-prices-revealed .money, 
                .pincode-prices-revealed .amount,
                .pincode-prices-revealed .price-item,
                .pincode-prices-revealed .product-item__price,
                .pincode-prices-revealed .price__regular,
                .pincode-prices-revealed .price__sale,
                .pincode-prices-revealed [data-price],
                .pincode-prices-revealed .product-single__price,
                .pincode-prices-revealed .product__price {
                    visibility: visible !important;
                    opacity: 1 !important;
                }
            `;
            const style = document.createElement('style');
            style.id = 'pincode-flicker-guard';
            style.appendChild(document.createTextNode(css));
            (document.head || document.documentElement).appendChild(style);
            
            // Fallback reveal in case of crashes
            setTimeout(() => document.body.classList.add('pincode-prices-revealed'), 3500);
        }
    })();

    const getCookie = (name) => { const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)'); return v ? v[2] : null; };
    const getStored = (key) => getCookie(key) || localStorage.getItem(key);
    const setCookie = (n, v, d) => {
        if (!v || v === "null") { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; return; }
        const date = new Date(); date.setTime(date.getTime() + (d * 24 * 60 * 60 * 1000));
        document.cookie = n + "=" + v + "; expires=" + date.toUTCString() + "; path=/; SameSite=None; Secure";
    };

    const isHomepage = () => {
        const path = window.location.pathname;
        const root = window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/";
        return path === "/" || path === "/index.html" || path === "/index" || path === root || path === root + "index.html";
    };

    const toggleScroll = (disable) => {
        document.body.style.setProperty("overflow", disable ? "hidden" : "", disable ? "important" : "");
    };

    const getShop = () => {
        if (window.Shopify && window.Shopify.shop) return window.Shopify.shop;
        const meta = document.querySelector('meta[name="shopify-shop-domain"]');
        if (meta) return meta.getAttribute('content');
        return "";
    };

    const revealPrices = () => {
        document.body.classList.add('pincode-prices-revealed');
        document.querySelectorAll('#pincode-flicker-guard').forEach(el => el.remove());
    };

    document.addEventListener("DOMContentLoaded", () => {
        const modal = document.getElementById("pincode-modal");
        const submitBtn = document.getElementById("pincode-submit");
        const input = document.getElementById("pincode-input");
        const errorMsg = document.getElementById("pincode-error");
        const shop = getShop();

        if (!shop) { revealPrices(); return; }

        const configPromise = (async () => {
            try {
                const resp = await fetch(`/apps/regional-sync-api/api/modal-config?shop=${shop}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!resp.ok) return null;
                const config = await resp.json();
                
                // --- 1a. Apply Modal Customization ---
                if (config.primaryColor && submitBtn) submitBtn.style.backgroundColor = config.primaryColor;
                if (modal && config.backgroundColor) {
                    const content = modal.querySelector('.pincode-modal-content');
                    if (content) content.style.backgroundColor = config.backgroundColor;
                }
                
                // --- 1b. Restore Floating Button ---
                const floatingTrigger = document.getElementById("pincode-change-trigger");
                if (floatingTrigger) {
                    if (config.showFloatingButton === false) {
                        floatingTrigger.style.display = "none";
                    } else {
                        floatingTrigger.style.display = "block";
                        const btn = floatingTrigger.querySelector('button');
                        
                        // Positioning
                        floatingTrigger.style.position = "fixed"; floatingTrigger.style.zIndex = "2147483647";
                        const margin = "25px";
                        if (config.position === "bottom-left") { floatingTrigger.style.bottom = margin; floatingTrigger.style.left = margin; }
                        else if (config.position === "top-right") { floatingTrigger.style.top = margin; floatingTrigger.style.right = margin; }
                        else if (config.position === "top-left") { floatingTrigger.style.top = margin; floatingTrigger.style.left = margin; }
                        else { floatingTrigger.style.bottom = margin; floatingTrigger.style.right = margin; }

                        // Display Text
                        const rid = getStored("regionId");
                        if (config.showCurrentPincode && rid && rid !== "null") {
                            const pincode = getStored("lastCheckedPincode") || "Pincode";
                            const region = getStored("regionName") || pincode;
                            btn.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><div style="display:flex; flex-direction:column; align-items:flex-start; line-height:1.1;"><span style="font-size:9px; opacity:0.7;">${config.pincodePrefixText || "Delivering to:"}</span><strong>${region}</strong></div><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>`;
                        } else if (config.floatingButtonText) {
                            btn.innerText = config.floatingButtonText;
                        }

                        // Premium Styles
                        const bg = config.triggerBackgroundColor || '#000000';
                        const text = config.triggerTextColor || '#ffffff';
                        btn.style.setProperty("background-color", bg, "important");
                        btn.style.setProperty("color", text, "important");
                        btn.style.setProperty("padding", config.triggerPadding || '10px 18px', "important");
                        btn.style.setProperty("border-radius", config.triggerBorderRadius || '24px', "important");
                        btn.style.setProperty("border", `1px solid ${config.triggerBorderColor || bg}`, "important");
                    }
                }

                // --- 1c. Restore Regional Widgets ---
                const initWidgets = async () => {
                   const widgets = document.querySelectorAll('.regional-pincode-widget-block');
                   if (widgets.length === 0) return;
                   const rid = getStored("regionId");
                   if (!rid) return;
                   
                   try {
                       const r = await fetch(`/apps/regional-sync-api/api/region-config?region=${rid}&shop=${shop}`);
                       if (!r.ok) return;
                       const data = await r.json();
                       
                       widgets.forEach(w => {
                           const id = w.getAttribute('data-component-id');
                           const section = data.homepage?.sections?.find(s => s.id === id);
                           if (section) {
                               const content = w.querySelector('.regional-widget-content');
                               if (content) content.innerHTML = `<strong>${getStored("lastCheckedPincode") || "--"}</strong>`;
                           }
                       });
                   } catch(e) {}
                };
                initWidgets();

                return config;
            } catch (e) { return null; }
        })();

        const detectProducts = () => {
            const ids = new Set();
            document.querySelectorAll('[data-product-id], [data-id], form[action*="/cart/add"]').forEach(el => {
                let id = el.getAttribute('data-product-id') || el.getAttribute('data-id');
                if (!id) {
                    const idInput = el.querySelector('input[name="product-id"]');
                    if (idInput) id = idInput.value;
                }
                if (id && /^\d+$/.test(id)) ids.add(`gid://shopify/Product/${id}`);
                else if (id && id.includes('Product/')) ids.add(id);
            });
            if (window.ShopifyAnalytics?.meta?.product?.id) {
                ids.add(`gid://shopify/Product/${window.ShopifyAnalytics.meta.product.id}`);
            }
            return Array.from(ids);
        };

        const syncCart = async (pricing) => {
            const globalMult = getStored("regionMultiplier");
            if (!globalMult) return;
            try {
                const cart = await fetch('/cart.js').then(r => r.json());
                const rulesMap = {};
                let needsUpdate = false;

                // Build a map of product GIDs to their effective multipliers for the current region
                if (cart.items && cart.items.length > 0) {
                    cart.items.forEach(item => {
                        const gid = `gid://shopify/Product/${item.product_id}`;
                        if (pricing && pricing[gid]) {
                           const rule = pricing[gid];
                           let m = 1.0;
                           const orig = item.original_price / 100;
                           if (rule.ruleType === 'percentage') m = parseFloat(rule.multiplier);
                           else if (rule.ruleType === 'fixed_adjustment') m = (orig + parseFloat(rule.multiplier)) / orig;
                           else if (rule.ruleType === 'fixed_price') m = parseFloat(rule.multiplier) / orig;
                           else m = parseFloat(globalMult) || 1.0;
                           rulesMap[gid] = parseFloat(m.toFixed(4));
                        }
                    });
                }

                const rulesJson = JSON.stringify(rulesMap);
                if (cart.attributes?._regionMultiplier !== globalMult.toString() || cart.attributes?._regionalRules !== rulesJson) {
                    await fetch('/cart/update.js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            attributes: { 
                                '_regionMultiplier': globalMult,
                                '_regionalRules': rulesJson
                            } 
                        })
                    });
                }
            } catch (e) {}
        };

        async function applyRegionalPricing() {
            const regionId = getStored("regionId");
            if (!regionId || regionId === "null") { revealPrices(); return; }

            const productIds = detectProducts();
            if (productIds.length === 0) { revealPrices(); return; }

            try {
                const cacheKey = `pincode_pricing_${regionId}`;
                const cached = sessionStorage.getItem(cacheKey);
                let productPricing = null;

                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.timestamp < 300000) productPricing = parsed.productPricing;
                }

                if (!productPricing) {
                    const resp = await fetch(`/apps/regional-sync-api/api/pricing`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                        body: JSON.stringify({ shop, region: regionId, products: productIds })
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        productPricing = data.productPricing;
                        sessionStorage.setItem(cacheKey, JSON.stringify({ productPricing, timestamp: Date.now() }));
                    }
                }

                if (!productPricing) { revealPrices(); return; }

                const effectiveMultipliers = {};
                const originalPrices = new WeakMap(); // Private storage

                const update = () => {
                    document.querySelectorAll('.price, .money, .amount, .price-item, .product-item__price').forEach(el => {
                        const container = el.closest('[data-product-id], [data-id], form[action*="/cart/add"], .product-single, .product-item, .product-form');
                        if (!container) return;
                        
                        let gid = container.getAttribute('data-product-id') || container.getAttribute('data-id');
                        if (!gid) {
                            const inp = container.querySelector('input[name="product-id"]');
                            if (inp) gid = inp.value;
                            else if (window.ShopifyAnalytics?.meta?.product?.id && (container.classList.contains('product-single') || container.closest('.product-single'))) {
                                gid = window.ShopifyAnalytics.meta.product.id;
                            }
                        }
                        if (gid && !gid.toString().includes('Product/')) gid = `gid://shopify/Product/${gid}`;
                        
                        if (!gid || !productPricing[gid]) return;
                        const rule = productPricing[gid];
                        if (!rule.allowed) { el.style.setProperty('display', 'none', 'important'); return; }

                        let baseText = originalPrices.get(el);
                        if (!baseText) {
                            baseText = el.innerText.trim();
                            originalPrices.set(el, baseText);
                        }

                        const priceRegex = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/;
                        const match = baseText.match(priceRegex);
                        if (!match) return;

                        const orig = parseFloat(match[0].replace(/,/g, ''));
                        if (isNaN(orig)) return;

                        let mult = 1.0;
                        if (rule.ruleType === 'percentage') mult = parseFloat(rule.multiplier);
                        else if (rule.ruleType === 'fixed_adjustment') mult = (orig + parseFloat(rule.multiplier)) / orig;
                        else if (rule.ruleType === 'fixed_price') mult = parseFloat(rule.multiplier) / orig;
                        else mult = parseFloat(getStored("regionMultiplier")) || 1.0;

                        effectiveMultipliers[gid] = mult;
                        const np = orig * mult;
                        const formatted = np.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        
                        const newText = baseText.replace(match[0], formatted);
                        if (el.innerText !== newText) {
                            el.innerText = newText;
                        }
                    });
                    revealPrices();
                };

                update();
                new MutationObserver(update).observe(document.body, { childList: true, subtree: true, characterData: true });
                syncCart(productPricing);
            } catch (e) { revealPrices(); }
        }

        if (submitBtn) {
            submitBtn.addEventListener("click", async () => {
                const pin = input.value.trim();
                if (!/^\d{6}$/.test(pin)) {
                    errorMsg.innerText = "Invalid 6-digit pincode.";
                    errorMsg.style.display = "block";
                    return;
                }
                submitBtn.disabled = true; submitBtn.innerText = "Wait...";
                try {
                    const resp = await fetch(`/apps/regional-sync-api/api/region?pincode=${pin}&shop=${shop}`);
                    const data = await resp.json();
                    if (data.matched) {
                        setCookie("regionId", data.regionId, 30);
                        setCookie("regionMultiplier", data.priceMultiplier, 30);
                        setCookie("lastCheckedPincode", pin, 30);
                        localStorage.setItem("regionId", data.regionId);
                        localStorage.setItem("regionMultiplier", data.priceMultiplier);
                        localStorage.setItem("lastCheckedPincode", pin);
                        window.location.reload();
                    } else {
                        errorMsg.innerText = data.message || "Unavailable."; errorMsg.style.display = "block";
                        submitBtn.disabled = false; submitBtn.innerText = "Confirm";
                    }
                } catch (e) { submitBtn.disabled = false; }
            });
        }

        const rid = getStored("regionId");
        if (!rid || rid === "null") {
            (async () => {
                const config = await configPromise;
                if (config && (config.showOnAnyPage || isHomepage())) {
                    if (modal) {
                        modal.style.display = "flex";
                        if (config.disableScroll) toggleScroll(true);
                    }
                }
                revealPrices();
            })();
        } else {
            applyRegionalPricing();
        }
    });

    document.addEventListener("click", (e) => {
        if (e.target.closest('[data-open-pincode-modal]')) {
            const modal = document.getElementById("pincode-modal");
            if (modal) modal.style.display = "flex";
        }
        if (e.target.id === "pincode-modal-close" || e.target.id === "pincode-modal") {
             const modal = document.getElementById("pincode-modal");
             if (modal) modal.style.display = "none";
             toggleScroll(false);
        }
    });
})();
