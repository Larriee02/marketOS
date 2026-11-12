// Multi-industry starter catalogs. Seeded per account with 0 stock so any trade business
// (Provisions, Gadgets, Electronics, Fashion, Fabrics, Pharmacy, Car Dealership, Cosmetics, Wholesale)
// can start counting and selling immediately instead of typing every item by hand.

const PROVISION_CATALOG = [
  ['PRV-001', 'Peak Milk Powder Sachet (Roll x12)', 'Milk & Drinks', 'Roll', 2600, 3000, 8, 'Oke-Arin Wholesale'],
  ['PRV-002', 'Milo Activ-Go Sachet (Roll x10)', 'Milk & Drinks', 'Roll', 2100, 2500, 8, 'Oke-Arin Wholesale'],
  ['NDL-003', 'Indomie Super Pack 120g (Carton x40)', 'Noodles & Pasta', 'Carton', 14200, 16000, 6, 'Mushin Market Depot'],
  ['NDL-004', 'Indomie Super Pack 120g (Single)', 'Noodles & Pasta', 'Piece', 355, 450, 20, 'Mushin Market Depot'],
  ['GRN-005', 'Golden Penny Semovita 2kg', 'Swallow & Grains', 'Bag', 2850, 3300, 10, 'Trade Fair Wholesaler'],
  ['GRN-006', 'Dangote Granulated Sugar 500g', 'Provisions', 'Pack', 1150, 1400, 10, 'Oke-Arin Wholesale'],
  ['OIL-007', 'Devon Kings Cooking Oil 1L Pouch', 'Cooking Oil', 'Pouch', 2400, 2800, 6, 'Trade Fair Wholesaler'],
  ['CND-008', 'Titus Sardine in Oil 125g', 'Canned Food', 'Tin', 1150, 1400, 12, 'Oke-Arin Wholesale'],
  ['SNK-009', 'Golden Morn Maize Cereal 900g', 'Cereals & Snacks', 'Pack', 3600, 4200, 5, 'Mushin Market Depot'],
  ['HHS-010', 'Sunlight Detergent Powder 900g', 'Soap & Household', 'Pack', 1650, 2000, 8, 'Trade Fair Wholesaler'],
  ['DRK-011', 'Eva Table Water 75cl (Pack x12)', 'Milk & Drinks', 'Pack', 2400, 3000, 6, 'Local Beverage Truck'],
  ['BRD-012', 'Agege / Sliced Family Loaf Bread', 'Bread & Bakery', 'Loaf', 1200, 1500, 5, 'Morning Bakery Supplier'],
];

const CATALOG_BY_BUSINESS_TYPE = {
  'Provision & Supermarket': PROVISION_CATALOG,
  'Gadgets & Phone Accessories': [
    ['GDG-001', 'iPhone 15 Pro 256GB (Factory Unlocked)', 'Smartphones', 'Unit', 1450000, 1620000, 2, 'Computer Village Hub'],
    ['GDG-002', 'Samsung Galaxy A55 5G 128GB', 'Smartphones', 'Unit', 460000, 520000, 3, 'Samsung Authorized Dist.'],
    ['GDG-003', 'Anker PowerCore 20,000mAh Power Bank', 'Power Banks & Chargers', 'Piece', 42000, 52000, 5, 'Gadget Wholesale Plaza'],
    ['GDG-004', 'Apple 20W USB-C Fast Charger Adapter', 'Power Banks & Chargers', 'Piece', 18000, 25000, 8, 'Computer Village Hub'],
    ['GDG-005', 'AirPods Pro (2nd Gen) Wireless Earbuds', 'Audio & Earbuds', 'Box', 290000, 340000, 3, 'Gadget Wholesale Plaza'],
    ['GDG-006', 'Oraimo FreePods 4 ANC Earbuds', 'Audio & Earbuds', 'Box', 28000, 36000, 6, 'Oraimo Distributor'],
    ['GDG-007', 'Tempered Glass Screen Protector (Pro Series)', 'Cases & Screen Guards', 'Piece', 1200, 3500, 15, 'Accessory Depot'],
    ['GDG-008', 'MagSafe Silicone Phone Case', 'Cases & Screen Guards', 'Piece', 3500, 7500, 10, 'Accessory Depot'],
  ],
  'Electronics & Appliances': [
    ['ELC-001', 'Hisense 55" 4K UHD Smart LED TV', 'Televisions & Displays', 'Unit', 480000, 560000, 2, 'Alaba Electronics Depot'],
    ['ELC-002', 'LG 1.5HP Dual Inverter Split AC', 'Air Conditioners & Fans', 'Unit', 420000, 495000, 2, 'LG Direct Distributor'],
    ['ELC-003', 'Luminous 3.5kVA Pure Sine Wave Inverter', 'Solar & Inverters', 'Unit', 310000, 370000, 2, 'Solar Power Wholesale'],
    ['ELC-004', '220Ah Tubular Deep Cycle Inverter Battery', 'Solar & Inverters', 'Unit', 245000, 290000, 3, 'Solar Power Wholesale'],
    ['ELC-005', 'Binatone 16" Rechargeable Standing Fan', 'Air Conditioners & Fans', 'Unit', 72000, 88000, 4, 'Alaba Electronics Depot'],
    ['ELC-006', 'Haier Thermocool 200L Chest Freezer', 'Refrigerators & Freezers', 'Unit', 360000, 425000, 2, 'Appliance Hub'],
    ['ELC-007', 'JBL PartyBox Encore Essential Speaker', 'Sound Systems & Home Theater', 'Unit', 265000, 320000, 2, 'Audio Pro Lagos'],
    ['ELC-008', 'Kenwood 2-in-1 Heavy Duty Blender', 'Kitchen Appliances', 'Box', 45000, 58000, 5, 'Appliance Hub'],
  ],
  'Fashion & Clothing Store': [
    ['FSH-001', 'Classic Men’s Pique Cotton Polo Shirt', 'Men’s Wear', 'Piece', 9500, 15000, 8, 'Balogun Fashion Hub'],
    ['FSH-002', 'Slim-Fit Stretch Denim Jeans', 'Men’s Wear', 'Piece', 14000, 22000, 6, 'Apparel Wholesale'],
    ['FSH-003', 'Women’s Tailored Midi Wrap Dress', 'Women’s Wear', 'Piece', 16500, 26000, 5, 'Boutique Suppliers'],
    ['FSH-004', 'Unisex Classic White Leather Sneakers', 'Footwear & Sneakers', 'Pair', 24000, 36000, 5, 'Footwear Trade Center'],
    ['FSH-005', 'Structured Leather Tote Handbag', 'Bags & Wallets', 'Piece', 18000, 28500, 4, 'Boutique Suppliers'],
    ['FSH-006', '3-Piece Men’s Formal Cotton Boxers Pack', 'Men’s Wear', 'Pack', 6500, 10500, 10, 'Balogun Fashion Hub'],
    ['FSH-007', 'Kids’ 2-Piece Casual Hoodie & Jogger Set', 'Kids & Baby Wear', 'Set', 11000, 17500, 6, 'Apparel Wholesale'],
    ['FSH-008', 'Stainless Steel Chronograph Wristwatch', 'Watches & Jewelry', 'Box', 22000, 35000, 4, 'Luxury Accessories'],
  ],
  'Fabrics, Textiles & Materials': [
    ['FAB-001', 'High-Target Original Ankara Wax Print (6 Yards)', 'Ankara & Wax Prints', 'Bundle', 12500, 16500, 8, 'Balogun Textile Market'],
    ['FAB-002', 'Swiss Voile Dry Lace (5 Yards)', 'Lace & Guipure', 'Bundle', 38000, 48000, 5, 'Lagos Island Lace Depot'],
    ['FAB-003', 'Executive Guinea Brocade (Per Yard)', 'Guinea Brocade & Atiku', 'Yard', 3200, 4500, 25, 'Kano Textile Traders'],
    ['FAB-004', 'Italian Cashmere Wool Suiting (Per Yard)', 'Suiting & Cashmere', 'Yard', 6500, 9000, 15, 'Aba / Onitsha Textile'],
    ['FAB-005', 'Premium Silk Crepe Chiffon (Per Yard)', 'Silk, Chiffon & Crepe', 'Yard', 2400, 3500, 20, 'Balogun Textile Market'],
    ['FAB-006', 'Original Aso-Oke Bridal Set (Complete)', 'Aso-Oke & Traditional', 'Set', 55000, 75000, 3, 'Iseyin Weavers Guild'],
    ['FAB-007', 'Heavy Satin Lining Roll (30 Yards)', 'Tailoring Accessories', 'Roll', 28000, 36000, 4, 'Tailoring Supply Hub'],
    ['FAB-008', 'Industrial Sewing Thread Box (12 Cones)', 'Tailoring Accessories', 'Box', 4200, 6000, 10, 'Tailoring Supply Hub'],
  ],
  'Pharmacy & Health Store': [
    ['PHM-001', 'Emzor Paracetamol 500mg (Box x100)', 'Pain Relief & Fever', 'Box', 2800, 3800, 10, 'Idumota Pharma Depot'],
    ['PHM-002', 'Coartem / Lonart DS Antimalarial Pack', 'Antibiotics & Antimalarials', 'Pack', 2400, 3200, 12, 'Fidson / Pharma Dist.'],
    ['PHM-003', 'Vitamin C 1000mg Effervescent (Tube x20)', 'Vitamins & Supplements', 'Tube', 3100, 4200, 8, 'HealthPlus Wholesale'],
    ['PHM-004', 'Omron Digital Blood Pressure Monitor', 'Medical Devices & First Aid', 'Unit', 38000, 48000, 3, 'MedEquip Nigeria'],
    ['PHM-005', 'Accu-Chek Active Glucometer + 50 Strips', 'Chronic Care & Diabetes', 'Box', 26000, 33500, 4, 'MedEquip Nigeria'],
    ['PHM-006', 'Benylin Chesty Cough Syrup 100ml', 'Cough, Cold & Allergy', 'Bottle', 2900, 3800, 10, 'Idumota Pharma Depot'],
    ['PHM-007', 'Augmentin 625mg Antibiotics (Pack x14)', 'Antibiotics & Antimalarials', 'Pack', 11500, 14500, 6, 'GSK Authorized Dist.'],
    ['PHM-008', 'Complete Home First Aid Kit Box', 'Medical Devices & First Aid', 'Box', 9500, 13000, 5, 'MedEquip Nigeria'],
  ],
  'Car Dealership & Auto Trade': [
    ['CAR-001', 'Toyota Camry 2020 XSE (Foreign Used)', 'Sedans & Saloons', 'Vehicle', 18500000, 21000000, 1, 'Apapa Auto Terminal'],
    ['CAR-002', 'Lexus RX 350 2018 Full Option', 'SUVs & Crossovers', 'Vehicle', 29000000, 33000000, 1, 'Berger Auto Lot'],
    ['CAR-003', 'Toyota Corolla 2016 LE Sedan', 'Sedans & Saloons', 'Vehicle', 11800000, 13500000, 1, 'Apapa Auto Terminal'],
    ['CAR-004', 'Honda Accord 2019 Sport', 'Sedans & Saloons', 'Vehicle', 15500000, 17800000, 1, 'Berger Auto Lot'],
    ['CAR-005', 'Solite 75Ah Maintenance-Free Car Battery', 'Batteries & Electrical', 'Unit', 92000, 112000, 4, 'Ladipo Auto Parts'],
    ['CAR-006', 'Michelin 215/55R17 All-Season Tyre', 'Tires & Rims', 'Piece', 115000, 138000, 4, 'Tyre Plaza Lagos'],
    ['CAR-007', 'Mobil 1 5W-30 Full Synthetic Engine Oil 4L', 'Oils, Fluids & Filters', 'Bottle', 42000, 52000, 6, 'Ladipo Auto Parts'],
    ['CAR-008', 'Original Ceramic Front Brake Pad Set', 'Engine & Mechanical Parts', 'Set', 28000, 38000, 5, 'Ladipo Auto Parts'],
  ],
  'Cosmetics, Beauty & Skincare': [
    ['CSM-001', 'CeraVe Foaming Facial Cleanser 236ml', 'Skincare & Serums', 'Bottle', 15500, 21000, 6, 'Beauty Trade Hub'],
    ['CSM-002', 'The Ordinary Niacinamide 10% + Zinc 30ml', 'Skincare & Serums', 'Bottle', 9500, 14000, 8, 'Beauty Trade Hub'],
    ['CSM-003', 'La Roche-Posay Anthelios Sunscreen 50ml', 'Skincare & Serums', 'Tube', 18000, 24500, 5, 'Skincare Importers'],
    ['CSM-004', 'Lattafa Khamrah Eau De Parfum 100ml', 'Perfumes & Fragrances', 'Box', 28000, 38000, 4, 'Fragrance Wholesale'],
    ['CSM-005', 'Brazilian Bone Straight Human Hair Wig 18"', 'Hair & Wigs', 'Piece', 145000, 185000, 2, 'Hair & Beauty Plaza'],
    ['CSM-006', 'Maybelline Fit Me Matte Foundation 30ml', 'Makeup & Cosmetics', 'Bottle', 10500, 15000, 6, 'Beauty Trade Hub'],
    ['CSM-007', 'Nivea Radiant & Beauty Body Lotion 400ml', 'Body Lotions & Soaps', 'Bottle', 5200, 7200, 10, 'FMCG Beauty Dist.'],
    ['CSM-008', 'Professional 12-Piece Makeup Brush Set', 'Beauty Accessories', 'Set', 6800, 10500, 6, 'Beauty Trade Hub'],
  ],
  'Wholesale & General Merchandise': [
    ['WHS-001', 'Bulk Packaging Carton (50x50cm Heavy Duty)', 'Home & Kitchen', 'Carton', 18000, 24000, 10, 'Trade Fair Warehouse'],
    ['WHS-002', 'Industrial Cordless Drill & Bit Kit', 'Hardware & Tools', 'Set', 52000, 68000, 4, 'Hardware Plaza'],
    ['WHS-003', 'A4 Printing Paper Carton (5 Reams x 500)', 'Office & Stationery', 'Carton', 26500, 32000, 8, 'Stationery Depot'],
    ['WHS-004', '12-Piece Non-Stick Granite Cookware Set', 'Home & Kitchen', 'Set', 78000, 98000, 3, 'Trade Fair Warehouse'],
    ['WHS-005', 'Heavy-Duty Padlock 60mm (Box x12)', 'Hardware & Tools', 'Box', 22000, 29000, 5, 'Hardware Plaza'],
    ['WHS-006', '50kg Long Grain Parboiled Rice', 'Bulk Food & Drinks', 'Bag', 76000, 84000, 5, 'Mile 12 Wholesale'],
  ],
};

const LEGACY_TYPE_MAP = {
  'Supermarket & Grocery': 'Provision & Supermarket',
  'Provision & Convenience Store': 'Provision & Supermarket',
  'Provision Store': 'Provision & Supermarket',
  'Supermarket & Provisions': 'Provision & Supermarket',
  'Beverage & Drinks Outlet': 'Provision & Supermarket',
  'Cosmetics & Household Retail': 'Cosmetics, Beauty & Skincare',
  'Wholesale & Distribution': 'Wholesale & General Merchandise',
  'General Merchandise': 'Wholesale & General Merchandise',
  'Retail Store': 'Wholesale & General Merchandise',
};

function getStarterCatalogForBusiness(businessType) {
  const normalized = LEGACY_TYPE_MAP[businessType] || businessType;
  return CATALOG_BY_BUSINESS_TYPE[normalized] || PROVISION_CATALOG;
}

const STARTER_CATALOG = PROVISION_CATALOG;

async function seedStarterCatalog(q, userId, businessType = 'Provision & Supermarket') {
  const items = getStarterCatalogForBusiness(businessType);
  for (const [sku, name, category, unit, cost, sell, reorder, supplier] of items) {
    await q.query(
      `INSERT INTO products (user_id, sku, name, category, unit, cost_price, selling_price,
                             stock_quantity, reorder_level, supplier_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)
       ON CONFLICT (user_id, sku) DO NOTHING`,
      [userId, sku, name, category, unit, cost, sell, reorder, supplier]
    );
  }
}

module.exports = {
  STARTER_CATALOG,
  CATALOG_BY_BUSINESS_TYPE,
  getStarterCatalogForBusiness,
  seedStarterCatalog,
};
