// @ts-check

/**
 * @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const globalMultiplier = input.cart.attribute?.value ? parseFloat(input.cart.attribute.value) : 1.0;
  
  /** @type {Record<string, number>} */
  let rules = {};
  if (input.cart.rules?.value) {
    try {
      rules = JSON.parse(input.cart.rules.value);
    } catch (e) {
      console.error("Failed to parse _regionalRules JSON", e);
    }
  }
  
  const operations = input.cart.lines.map(line => {
    // Priority 1: Line-level multiplier (e.g. from properties, for "Buy Now" support)
    // Priority 2: Product-specific multiplier from global rules map
    // Priority 3: Global cart-level multiplier fallback
    let lineMultiplier = globalMultiplier;
    
    if (line.attribute?.value) {
      lineMultiplier = Number(line.attribute.value);
    } else if (line.merchandise?.__typename === 'ProductVariant' && line.merchandise.product?.id) {
       const pid = line.merchandise.product.id;
       if (rules[pid] !== undefined) {
         lineMultiplier = Number(rules[pid]);
       }
    }

    if (isNaN(lineMultiplier) || lineMultiplier === 1.0) {
      return null;
    }

    const originalPrice = parseFloat(line.cost.amountPerQuantity.amount);
    const newPrice = originalPrice * lineMultiplier;
    
    return {
      lineUpdate: {
        cartLineId: line.id,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: newPrice.toFixed(2)
            }
          }
        }
      }
    };
  }).filter(op => op !== null);

  if (operations.length === 0) {
    return NO_CHANGES;
  }

  return {
    operations,
  };
};