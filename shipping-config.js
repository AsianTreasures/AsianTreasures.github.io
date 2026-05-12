window.shippingConfig = {
  serviceName: "USPS Ground Advantage-style economy shipping",
  freeShippingMinimum: 100,
  freeShippingMessage: "Orders over $100 receive free mainland U.S. shipping.",
  additionalSuitMultiplier: 0.5,
  excludedDestinations: "Alaska, Hawaii, Puerto Rico, and international shipping are excluded.",
  regions: [
    {
      id: "nearby",
      label: "Nearby states (NJ, NY, PA, CT)",
      baseRate: 8.95,
      deliveryTime: "2-4 business days",
    },
    {
      id: "mainland",
      label: "Other Mainland USA",
      baseRate: 11.95,
      deliveryTime: "3-6 business days",
    },
  ],
};
