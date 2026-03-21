// @ts-check

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 */

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  const selectedPincode = input.cart.attribute?.value;
  
  if (!selectedPincode) {
    return { operations: [] };
  }

  const normalizedSelected = selectedPincode.trim().replace(/\s/g, "");

  const errors = input.cart.deliveryGroups
    .flatMap(group => {
      const shippingZip = group.deliveryAddress?.zip?.trim().replace(/\s/g, "");
      if (shippingZip && shippingZip !== normalizedSelected) {
        return [{
          message: `Pincode mismatch. Your pricing was calculated for pincode ${selectedPincode}. Please ensure your shipping address matches.`,
          target: "$.cart.deliveryGroups[0].deliveryAddress.zip",
        }];
      }
      return [];
    });

  const operations = errors.length > 0 ? [
    {
      validationAdd: {
        errors
      },
    },
  ] : [];

  return { operations };
};