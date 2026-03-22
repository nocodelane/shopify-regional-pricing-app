(function() {
    // Helper: Dual Storage Read
    function getCookie(name) { const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)'); return v ? v[2] : null; }
    function getStored(key) { return getCookie(key) || localStorage.getItem(key); }
    function setCookie(n, v, d) { if (!v || v === "null") { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; return; } const date = new Date(); date.setTime(date.getTime() + (d * 24 * 60 * 60 * 1000)); document.cookie = n + "=" + v + "; expires=" + date.toUTCString() + "; path=/; SameSite=None; Secure"; }

    function isHomepage() {
        const path = window.location.pathname;
        const root = window.Shopify && window.Shopify.routes && window.Shopify.routes.root ? window.Shopify.routes.root : "/";
        return path === "/" || path === "/index.html" || path === "/index" || path === root || path === root + "index.html";
    }

    function toggleScroll(disable) {
        if (disable) {
            document.body.style.setProperty("overflow", "hidden", "important");
        } else {
            document.body.style.setProperty("overflow", "", "");
        }
    }

    // 0. Prevent Flickering (FOOP) - Run IMMEDIATELY
    const initialRegion = getStored("regionId");
    if (initialRegion) {
        const hideStyle = document.createElement('style');
        hideStyle.id = 'pincode-flicker-guard';
        hideStyle.innerHTML = `.price-item, .price, .money, .amount, [data-price] { color: transparent !important; background: #e0e0e0 !important; border-radius: 4px !important; animation: pincodePulse 1.5s infinite !important; pointer-events: none !important; } @keyframes pincodePulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`;
        document.head.appendChild(hideStyle);
        // Fallback: If logic hangs, reveal after 3 seconds
        setTimeout(revealPrices, 3000);
    }

    function revealPrices() {
        const guard = document.getElementById('pincode-flicker-guard');
        if (guard) {
            const revealStyle = document.createElement('style');
            revealStyle.id = 'pincode-reveal-style';
            revealStyle.innerHTML = `.price-item, .price, .money, .amount, [data-price] { color: inherit !important; background: transparent !important; animation: none !important; transition: all 0.3s ease-in !important; }`;
            document.head.appendChild(revealStyle);
            setTimeout(() => { guard.remove(); }, 100);
        }
    }

    function getShop() {
        if (window.Shopify && window.Shopify.shop) return window.Shopify.shop;
        const meta = document.querySelector('meta[name="shopify-shop-domain"]');
        if (meta) return meta.getAttribute('content');
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("shop")) return urlParams.get("shop");
        return "";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const modal = document.getElementById("pincode-modal");
        const submitBtn = document.getElementById("pincode-submit");
        const input = document.getElementById("pincode-input");
        const errorMsg = document.getElementById("pincode-error");
        const shop = getShop();
        console.log("[Pincode] Loader starting. Shop:", shop || "Unknown");
        if (!shop) {
             console.warn("[Pincode] No shop domain found. Proxy requests might fail.");
        }

        // 0. Fetch and Apply Modal Customization
        async function applyModalCustomization() {
            if (!shop) return null;
            try {
                const resp = await fetch(`/apps/regional-sync-api/api/modal-config?shop=${shop}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!resp.ok) {
                    console.error("[Pincode] Config fetch failed:", resp.status);
                    return null;
                }
                const config = await resp.json();
                console.log("[Pincode] Config loaded:", config);
                
                if (config.usePulse && !document.getElementById('pincode-animations')) {
                    const style = document.createElement('style'); style.id = 'pincode-animations';
                    style.innerHTML = `@keyframes pincode-pulse { 0% { box-shadow: 0 0 0 0 rgba(0,0,0,0.4); } 70% { box-shadow: 0 0 0 10px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }`;
                    document.head.appendChild(style);
                }
                if (config.title) document.getElementById("modal-title").innerText = config.title;
                if (config.description) document.getElementById("modal-description").innerText = config.description;
                if (config.headerImage) {
                    const img = document.getElementById("modal-header-image");
                    const container = document.getElementById("modal-header-image-container");
                    if (img && container) {
                        img.src = config.headerImage;
                        container.style.display = "block";
                    }
                }
                if (config.confirmButtonText && submitBtn) submitBtn.innerText = config.confirmButtonText;
                if (modal) {
                    const modalDialog = modal.querySelector('.pincode-modal-content');
                    if (modalDialog) {
                        modalDialog.style.backgroundColor = config.backgroundColor || "#ffffff";
                        modalDialog.style.color = config.textColor || "#333333";
                        modalDialog.style.borderColor = config.primaryColor || "#000000";
                        modalDialog.style.fontSize = config.fontSize || "16px";
                        modalDialog.style.fontFamily = config.fontFamily || "Inter, sans-serif";
                    }
                    if (submitBtn) {
                        submitBtn.style.backgroundColor = config.primaryColor || "#000000";
                        submitBtn.style.color = config.textColor || "#ffffff"; /* Avoid dark on dark */
                    }
                    if (config.overlayColor) modal.style.backgroundColor = config.overlayColor;
                    if (config.overlayBlur) modal.style.backdropFilter = `blur(${config.overlayBlur})`;
                }

                const applyPremiumStyles = (btn) => {
                    if (!btn) return;
                    const layout = config.triggerLayoutStyle || 'boxed';
                    const bg = (config.triggerTransparent || layout === 'minimal') ? 'transparent' : (config.triggerBackgroundColor || '#000000');
                    const text = config.triggerTextColor || '#ffffff';
                    
                    btn.style.setProperty("background-color", bg, "important");
                    btn.style.setProperty("color", text, "important");
                    btn.style.setProperty("padding", config.triggerPadding || '10px 18px', "important");
                    btn.style.setProperty("border-radius", config.triggerBorderRadius || '24px', "important");
                    btn.style.setProperty("font-size", config.triggerFontSize || '14px', "important");
                    btn.style.setProperty("font-weight", config.triggerFontWeight || '600', "important");
                    btn.style.setProperty("border", `${config.triggerBorderWidth || '1px'} solid ${config.triggerBorderColor || (bg === 'transparent' ? text : bg)}`, "important");
                    
                    if (config.useGlassmorphism) { 
                        btn.style.backdropFilter = 'blur(10px) saturate(180%)'; 
                        btn.style.webkitBackdropFilter = 'blur(10px) saturate(180%)';
                    }
                    btn.style.transition = 'all 0.3s ease'; 
                    btn.style.cursor = 'pointer'; 
                    btn.style.display = 'inline-flex'; 
                    btn.style.alignItems = 'center'; 
                    btn.style.gap = '10px';
                };

                const floatingTrigger = document.getElementById("pincode-change-trigger");
                if (floatingTrigger) {
                    if (config.showFloatingButton === false) floatingTrigger.style.display = "none";
                    else {
                        floatingTrigger.style.display = "block";
                        const btn = floatingTrigger.querySelector('button');
                        floatingTrigger.style.position = "fixed"; floatingTrigger.style.zIndex = "2147483647";
                        floatingTrigger.style.top = "auto"; floatingTrigger.style.bottom = "auto"; floatingTrigger.style.left = "auto"; floatingTrigger.style.right = "auto";
                        const margin = "25px";
                        if (config.position === "bottom-left") { floatingTrigger.style.bottom = margin; floatingTrigger.style.left = margin; }
                        else if (config.position === "top-right") { floatingTrigger.style.top = margin; floatingTrigger.style.right = margin; }
                        else if (config.position === "top-left") { floatingTrigger.style.top = margin; floatingTrigger.style.left = margin; }
                        else { floatingTrigger.style.bottom = margin; floatingTrigger.style.right = margin; }

                        const activeRegion = getStored("regionId");
                        if (config.showCurrentPincode && activeRegion && activeRegion !== "null") {
                            const currentPincode = getStored("lastCheckedPincode") || "Pincode";
                            const currentRegion = getStored("regionName");
                            const displayText = (currentRegion && currentRegion !== "undefined") ? currentRegion : currentPincode;
                            const pencilIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px; opacity: 0.8;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
                            btn.innerHTML = `<div style="display:flex; align-items:center; gap:8px;"><div style="display:flex; flex-direction:column; align-items:flex-start; line-height:1.1;"><span style="font-size:9px; opacity:0.7;">${config.pincodePrefixText || "Delivering to:"}</span><strong>${displayText}</strong></div>${pencilIcon}</div>`;
                        } else if (config.floatingButtonText) {
                            btn.innerText = config.floatingButtonText;
                        }
                        applyPremiumStyles(btn);
                    }
                }
                return config;
            } catch (e) { 
                console.error("Modal config error:", e); 
                return null;
            }
        }

        const configPromise = applyModalCustomization();

        const storedRegion = getStored("regionId");
        
        async function checkModalVisibility() {
            const config = await configPromise;
            const isHome = isHomepage();
            console.log(`[Pincode] Visibility check: isHome=${isHome}, storedRegion=${storedRegion}, showOnAnyPage=${config?.showOnAnyPage}`);

            if (!storedRegion || storedRegion === "null" || storedRegion === "undefined") { 
                const isExcluded = (config && config.excludedPaths) ? config.excludedPaths.split(',').map(p => p.trim()).some(p => window.location.pathname.startsWith(p)) : false;
                
                if (modal) {
                    const shouldShow = (!config) || config.showOnAnyPage || isHome; 
                    console.log(`[Pincode] shouldShow decision: ${shouldShow} (isExcluded: ${isExcluded})`);

                    if (shouldShow) {
                        if (config && config.pincodeGuardActive && !isExcluded) {
                            console.log("[Pincode] Showing modal (Guard Mode)");
                            modal.style.display = "flex";
                            if (config.disableScroll) toggleScroll(true);
                            const closeBtn = document.getElementById("pincode-modal-close");
                            if (closeBtn) closeBtn.style.display = "none";
                            modal.setAttribute('data-locked', 'true');
                        } else {
                            const closeBtn = document.getElementById("pincode-modal-close");
                            if (closeBtn) closeBtn.style.display = "flex";
                            
                            if (!storedRegion || storedRegion === "null" || storedRegion === "undefined") {
                                console.log("[Pincode] Showing modal (Initial/No Region)");
                                modal.style.display = "flex";
                                if (config && config.disableScroll) toggleScroll(true);
                            }
                        }
                    }
                } else {
                    console.warn("[Pincode] Modal element not found! Make sure the Pincode Modal block is added to your theme.");
                }
            }
            revealPrices();
        }

        checkModalVisibility();

        if (storedRegion && storedRegion !== "null" && storedRegion !== "undefined") { 
            applyRegionalPricing(); 
            applyVisibilityRules(storedRegion); 
        }

        async function applyVisibilityRules(regionId) {
            if (!shop) return;
            try {
                const resp = await fetch(`/apps/regional-sync-api/api/region-visibility-check?shop=${shop}&regionId=${regionId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (resp.ok) {
                    const visibility = await resp.json();
                    updateHidingStyles(visibility.deniedProductHandles, visibility.deniedCollectionHandles);
                }
            } catch (e) {}
        }

        async function applyRegionalPricing() {
            const regionId = getStored("regionId"); if (!regionId) { revealPrices(); return; }
            if (!shop) { revealPrices(); return; }
            const getProductsOnPage = () => {
                const ids = new Set();
                // Strategy 1: Data attributes (modern themes)
                document.querySelectorAll('[data-product-id], [data-id], .product-card[id], [data-shopify-product-id]').forEach(el => {
                    const id = el.getAttribute('data-product-id') || el.getAttribute('data-id') || el.getAttribute('data-shopify-product-id') || el.id.replace('product-', '');
                    if (id && /^\d+$/.test(id)) ids.add(`gid://shopify/Product/${id}`);
                    else if (id && id.includes('Product/')) ids.add(id);
                });
                // Strategy 2: Forms & Hidden Inputs (PDPS)
                document.querySelectorAll('form[action*="/cart/add"]').forEach(form => {
                    const idInput = form.querySelector('input[name="id"], input[name="product-id"]');
                    if (idInput && /^\d+$/.test(idInput.value)) {
                       // Note: variant IDs are often here, try to find product ID from JSON if nearby
                    }
                });
                // Strategy 3: Scripts (Product JSON)
                document.querySelectorAll('script[type="application/json"][data-product-json], script#ProductJson').forEach(s => {
                    try { const d = JSON.parse(s.innerHTML); if (d.id) ids.add(`gid://shopify/Product/${d.id}`); } catch(e){}
                });
                return Array.from(ids);
            };
            const productIds = getProductsOnPage();

            if (productIds.length === 0) {
                const mStr = getStored("regionMultiplier"); 
                if (mStr && parseFloat(mStr) !== 1.0) applyFallbackGlobal(parseFloat(mStr));
                else revealPrices();
                return;
            }

            try {
                console.log(`[Pincode] Fetching pricing for ${productIds.length} products in region ${regionId}...`);
                const resp = await fetch(`/apps/regional-sync-api/api/pricing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({ shop, region: regionId, products: productIds })
                });
                if (!resp.ok) { console.error(`[Pincode] Pricing API error: ${resp.status}`); revealPrices(); return; }
                const { productPricing, allowAbsurdPricing } = await resp.json();
                console.log(`[Pincode] Pricing received for ${Object.keys(productPricing).length} products. Absurd pricing allowed: ${allowAbsurdPricing}`);

                const updateLoop = () => {
                    let updatedCount = 0;
                    document.querySelectorAll('[data-product-id], [data-id], .product-card, .grid__item').forEach(container => {
                        const idAttr = container.getAttribute('data-product-id') || container.getAttribute('data-id');
                        let gid = idAttr ? (idAttr.includes('Product/') ? idAttr : `gid://shopify/Product/${idAttr}`) : null;
                        
                        if (!gid) {
                            // Deep search for ID if container doesn't have it
                            const childWithId = container.querySelector('[data-product-id], [data-id]');
                            if (childWithId) {
                                const cid = childWithId.getAttribute('data-product-id') || childWithId.getAttribute('data-id');
                                gid = cid.includes('Product/') ? cid : `gid://shopify/Product/${cid}`;
                            }
                        }

                        if (gid && productPricing[gid]) {
                            const rule = productPricing[gid];
                            const priceElements = container.querySelectorAll('.price-item, .price, .money, .amount, [data-price]');
                            let lastEffectiveMult = parseFloat(rule.multiplier) || 1.0;

                            priceElements.forEach(el => {
                                if (el.getAttribute('data-regional-applied') === 'true') return;
                                
                                // Strict Regex: Only match sane numbers that look like prices
                                const priceRegex = /\b\d{1,7}(?:[\.,]\d{2,3})?\b/;
                                const match = el.innerText.trim().match(priceRegex);
                                
                                if (match) {
                                    let orig = parseFloat(match[0].replace(/,/g, ''));
                                    if (!isNaN(orig) && orig > 0 && orig < 1000000) {
                                         let np = orig;
                                         if (rule.ruleType === 'percentage') np = orig * rule.multiplier;
                                         else if (rule.ruleType === 'fixed_adjustment') np = orig + rule.multiplier;
                                         else if (rule.ruleType === 'fixed_price') np = rule.multiplier;
                                         
                                         lastEffectiveMult = np / orig;
                                        const formattedPrice = np.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        el.innerHTML = el.innerText.replace(match[0], formattedPrice);
                                        el.setAttribute('data-regional-applied', 'true');
                                        updatedCount++;
                                    }
                                }
                            });
                            container.querySelectorAll('form[action*="/cart/add"]').forEach(f => {
                                let inp = f.querySelector('input[name="properties[_regionMultiplier]"]');
                                if (!inp) { inp = document.createElement('input'); inp.type = 'hidden'; inp.name = 'properties[_regionMultiplier]'; f.appendChild(inp); }
                                inp.value = (lastEffectiveMult || 1.0).toFixed(4);
                            });
                        }
                    });
                    if (updatedCount > 0) console.log(`[Pincode] Updated ${updatedCount} price elements.`);
                    revealPrices();
                };
                updateLoop();
                new MutationObserver(updateLoop).observe(document.body, { childList: true, subtree: true });
            } catch (e) { console.error("[Pincode] Pricing loop error:", e); revealPrices(); }
        }

        function applyFallbackGlobal(multiplier) {
            const update = () => {
                document.querySelectorAll('.price-item, .price, .money, .amount, [data-price]').forEach(el => {
                    if (el.getAttribute('data-regional-applied') === 'true') return;
                    const match = el.innerText.trim().match(/\d[\d,.]*/); 
                    if (match) {
                        const orig = parseFloat(match[0].replace(/,/g, ''));
                        if (!isNaN(orig)) {
                            el.innerHTML = el.innerText.replace(match[0], (orig * multiplier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            el.setAttribute('data-regional-applied', 'true');
                        }
                    }
                });
                revealPrices();
            };
            update();
            new MutationObserver(update).observe(document.body, { childList: true, subtree: true });
        }

        if (submitBtn) {
            submitBtn.addEventListener("click", async () => {
                const pin = input.value.trim(); 
                if (!pin) return;
                
                // 6-digit validation
                if (!/^\d{6}$/.test(pin)) {
                    errorMsg.innerText = "Please enter a valid 6-digit pincode.";
                    errorMsg.style.display = "block";
                    return;
                }
                
                const originalText = submitBtn.innerText;
                submitBtn.disabled = true; submitBtn.innerText = "Verifying...";
                try {
                    const resp = await fetch(`/apps/regional-sync-api/api/region?pincode=${pin}&shop=${shop}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                    const data = await resp.json();
                    if (data.matched) {
                        setCookie("regionId", data.regionId, 30); setCookie("regionName", data.region, 30); setCookie("regionMultiplier", data.priceMultiplier.toString(), 30); setCookie("lastCheckedPincode", pin, 30);
                        localStorage.setItem("regionId", data.regionId); localStorage.setItem("regionName", data.region); localStorage.setItem("regionMultiplier", data.priceMultiplier.toString()); localStorage.setItem("lastCheckedPincode", pin);
                        window.location.reload();
                    } else { 
                        errorMsg.innerText = data.message || "Invalid pincode."; errorMsg.style.display = "block"; 
                        const wl = document.getElementById("pincode-waitlist-container"); if (wl) wl.style.display = "block";
                        submitBtn.disabled = false; submitBtn.innerText = originalText;
                    }
                } catch (e) {
                    errorMsg.innerText = "Error verifying pincode. Please try again."; errorMsg.style.display = "block";
                    submitBtn.disabled = false; submitBtn.innerText = originalText;
                }
            });
        }

        if (document.getElementById("pincode-locate")) {
            document.getElementById("pincode-locate").addEventListener("click", () => {
                const btn = document.getElementById("pincode-locate"); if (!navigator.geolocation) return;
                btn.disabled = true;
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                        const data = await resp.json();
                        if (data.address?.postcode && input) { input.value = data.address.postcode.replace(/\s/g, ''); submitBtn.click(); }
                    } catch (e) {} finally { btn.disabled = false; }
                }, () => { btn.disabled = false; });
            });
        }

        document.addEventListener("click", async (e) => {
            if (e.target.closest('[data-open-pincode-modal]')) { 
                e.preventDefault(); 
                if (modal) {
                    modal.style.display = "flex"; 
                    const config = await configPromise;
                    if (config && config.disableScroll) {
                        toggleScroll(true);
                    }
                }
            }
            if (e.target.id === "pincode-modal-close") { 
                if (modal) {
                    modal.style.display = "none"; 
                    toggleScroll(false);
                }
            }
            if (e.target.id === "pincode-modal") { 
                if (modal.getAttribute('data-locked') !== 'true') {
                    modal.style.display = "none"; 
                    toggleScroll(false);
                }
            }
        }); // End click listener

        // --- Dynamic Component & Widget Rendering ---
        const WidgetRenderer = {
            pincode_widget: (settings) => {
                const pincode = getStored("lastCheckedPincode") || "--";
                const style = settings.style || 'standard';
                const fontSize = settings.fontSize || '14px';
                const iconColor = settings.iconColor || '#000000';
                const message = settings.message || 'Regional Delivery';

                return `
                    <div class="pincode-widget-container style-${style}" style="--widget-font-size: ${fontSize}; --widget-text-color: ${iconColor};" data-open-pincode-modal>
                        <div class="pincode-widget-message">${message}</div>
                        <div class="pincode-widget-details">
                            <span>${pincode}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                    </div>
                `;
            }
        };

        async function initRegionalWidgets() {
            const widgets = document.querySelectorAll('.regional-pincode-widget-block');
            if (widgets.length === 0) return;

            const regionId = getStored("regionId");
            if (!regionId) return;

            try {
                const resp = await fetch(`/apps/regional-sync-api/api/region-config?region=${regionId}&shop=${shop}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!resp.ok) return;
                const data = await resp.json();
                
                widgets.forEach(w => {
                    const id = w.getAttribute('data-component-id');
                    if (!id || id === "") return; // Skip universal widgets
                    
                    const section = data.homepage?.sections?.find(s => s.id === id);
                    if (section && WidgetRenderer[section.type]) {
                        w.querySelector('.regional-widget-content').innerHTML = WidgetRenderer[section.type](section.settings);
                    }
                });
            } catch (e) {
                console.error("[Pincode] Widget init error:", e);
            }
        }

        initRegionalWidgets();
        
        // Update any fallback pincode displays
        const currentPincode = getStored("lastCheckedPincode") || "--";
        document.querySelectorAll('.pincode-display').forEach(el => {
            el.innerText = currentPincode;
        });
    }); // End DOMContentLoaded (line 52)
})();
