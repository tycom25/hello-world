const db = require('./index');

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await db('purchase_orders').del();
  await db('vendor_discount_tiers').del();
  await db('vendor_quotes').del();
  await db('quote_items').del();
  await db('quote_requests').del();
  await db('vendors').del();
  await db('customers').del();

  // Sample customers
  const [customer] = await db('customers')
    .insert([
      {
        company_name: 'Maple Leaf Office Supplies',
        email: 'procurement@mapleleaf.ca',
        province: 'ON',
        postal_code: 'M5V3L9',
      },
      {
        company_name: 'Pacific Coast Tech',
        email: 'buying@pacificcoast.ca',
        province: 'BC',
        postal_code: 'V6B1A1',
      },
    ])
    .returning('*');

  // Sample vendors
  const [vendor1, vendor2] = await db('vendors')
    .insert([
      {
        seller_id: 'A1B2C3D4E5',
        business_name: 'National Electronics Wholesale',
        email: 'quotes@newholesale.ca',
        rating: 4.7,
        fulfillment_type: 'FBA',
        ships_to_provinces: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'],
        accepts_quotes: true,
      },
      {
        seller_id: 'F6G7H8I9J0',
        business_name: 'Prairie Office Direct',
        email: 'sales@prairieoffice.ca',
        rating: 4.3,
        fulfillment_type: 'FBM',
        ships_to_provinces: ['ON', 'QC', 'AB', 'MB', 'SK'],
        accepts_quotes: true,
      },
    ])
    .returning('*');

  // Sample discount tiers
  await db('vendor_discount_tiers').insert([
    { vendor_id: vendor1.id, asin: 'B09V3KXJPB', min_quantity: 50, discount_percent: 8.0 },
    { vendor_id: vendor1.id, asin: 'B09V3KXJPB', min_quantity: 200, discount_percent: 15.0 },
    { vendor_id: vendor1.id, asin: 'B09V3KXJPB', min_quantity: 500, discount_percent: 22.0 },
    { vendor_id: vendor2.id, asin: 'B09V3KXJPB', min_quantity: 100, discount_percent: 10.0 },
    { vendor_id: vendor2.id, asin: 'B09V3KXJPB', min_quantity: 300, discount_percent: 18.0 },
  ]);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
