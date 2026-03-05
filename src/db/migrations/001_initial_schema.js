exports.up = function (knex) {
  return knex.schema
    .createTable('customers', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.string('company_name').notNullable();
      t.string('email').notNullable().unique();
      t.string('province', 2).notNullable();
      t.string('postal_code', 7);
      t.timestamps(true, true);
    })
    .createTable('vendors', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.string('seller_id').notNullable().unique();
      t.string('business_name').notNullable();
      t.string('email').notNullable();
      t.decimal('rating', 3, 2).defaultTo(0);
      t.enum('fulfillment_type', ['FBA', 'FBM']).defaultTo('FBM');
      t.specificType('ships_to_provinces', 'text[]');
      t.boolean('accepts_quotes').defaultTo(true);
      t.timestamps(true, true);
    })
    .createTable('quote_requests', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('customer_id').notNullable().references('id').inTable('customers');
      t.enum('status', ['draft', 'open', 'quoted', 'accepted', 'expired', 'cancelled'])
        .defaultTo('draft');
      t.string('shipping_province', 2).notNullable();
      t.string('shipping_postal_code', 7);
      t.date('desired_delivery_date');
      t.text('notes');
      t.timestamp('expires_at');
      t.timestamps(true, true);
    })
    .createTable('quote_items', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('quote_request_id').notNullable()
        .references('id').inTable('quote_requests').onDelete('CASCADE');
      t.string('asin', 10).notNullable();
      t.string('product_title');
      t.integer('quantity').notNullable();
      t.decimal('target_unit_price', 10, 2);
      t.timestamps(true, true);
    })
    .createTable('vendor_quotes', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('quote_request_id').notNullable()
        .references('id').inTable('quote_requests').onDelete('CASCADE');
      t.uuid('vendor_id').notNullable().references('id').inTable('vendors');
      t.string('asin', 10).notNullable();
      t.decimal('unit_price', 10, 2).notNullable();
      t.integer('min_quantity').defaultTo(1);
      t.integer('lead_time_days');
      t.text('vendor_notes');
      t.timestamp('valid_until').notNullable();
      t.enum('status', ['pending', 'submitted', 'accepted', 'rejected', 'expired'])
        .defaultTo('pending');
      t.timestamps(true, true);

      t.unique(['quote_request_id', 'vendor_id', 'asin']);
    })
    .createTable('vendor_discount_tiers', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('vendor_id').notNullable().references('id').inTable('vendors');
      t.string('asin', 10).notNullable();
      t.integer('min_quantity').notNullable();
      t.decimal('discount_percent', 5, 2).notNullable();
      t.timestamps(true, true);

      t.unique(['vendor_id', 'asin', 'min_quantity']);
    })
    .createTable('purchase_orders', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('quote_request_id').notNullable()
        .references('id').inTable('quote_requests');
      t.uuid('vendor_quote_id').notNullable()
        .references('id').inTable('vendor_quotes');
      t.uuid('customer_id').notNullable().references('id').inTable('customers');
      t.uuid('vendor_id').notNullable().references('id').inTable('vendors');
      t.decimal('subtotal', 12, 2).notNullable();
      t.decimal('tax_amount', 12, 2).notNullable();
      t.decimal('total', 12, 2).notNullable();
      t.string('tax_breakdown_json');
      t.enum('status', ['created', 'confirmed', 'shipped', 'delivered', 'cancelled'])
        .defaultTo('created');
      t.timestamps(true, true);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('purchase_orders')
    .dropTableIfExists('vendor_discount_tiers')
    .dropTableIfExists('vendor_quotes')
    .dropTableIfExists('quote_items')
    .dropTableIfExists('quote_requests')
    .dropTableIfExists('vendors')
    .dropTableIfExists('customers');
};
