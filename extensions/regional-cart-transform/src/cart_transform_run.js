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
  const cartMultiplier = input.cart.attribute?.value ? parseFloat(input.cart.attribute.value) : 1.0;

  const operations = input.cart.lines.map(line => {
    // Prefer line-level multiplier (from properties), fallback to cart-level
    const lineMultiplierValue = line.attribute?.value;
    const lineMultiplier = lineMultiplierValue ? parseFloat(lineMultiplierValue) : cartMultiplier;

    if (isNaN(lineMultiplier) || lineMultiplier === 1.0) {
      return null;
    }

    const originalPrice = parseFloat(line.cost.amountPerQuantity.amount);
    const newPrice = originalPrice * lineMultiplier;
    
    console.log(`Line ${line.id}: ${originalPrice} -> ${newPrice.toFixed(2)} (Multiplier: ${lineMultiplier})`);

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