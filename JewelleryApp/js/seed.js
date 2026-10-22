/* JewelleryApp - initial master data and demo records for an Indian jewellery shop.
 * Rates and party details are sample values only; update them from the Rates and Masters screens.
 */
(function (global) {
  'use strict';

  const categories = [
    ['GOLD', 'Gold Jewellery', 'Plain and studded 22K gold ornaments'],
    ['TEMPLE', 'Temple Jewellery', 'South Indian temple / antique gold'],
    ['KUNDAN', 'Kundan & Polki', 'Kundan, Polki and Jadau work'],
    ['DIAMOND', 'Diamond Jewellery', 'Diamond studded 18K gold'],
    ['PLATINUM', 'Platinum Jewellery', 'Platinum 950 ornaments'],
    ['SILVERJ', 'Silver Jewellery', 'Payal, bichhiya and other silver ornaments'],
    ['SILVERA', 'Silver Articles', 'Utensils, pooja items and gifts'],
    ['BULLION', 'Bullion & Coins', 'Gold / silver coins and bars'],
    ['GEM', 'Gemstones', 'Navratna and precious stones'],
  ].map(([code, name, description]) => ({ id: 'cat_' + code, code, name, description }));

  const metals = [
    ['GOLD', 'Gold', 'Au'],
    ['SILVER', 'Silver', 'Ag'],
    ['PLATINUM', 'Platinum', 'Pt'],
    ['NONE', 'Not applicable (stones)', '-'],
  ].map(([id, name, symbol]) => ({ id, name, symbol }));

  // Purity id doubles as the rate key on the Rates screen
  const purities = [
    ['G24K', 'GOLD', '24K (999)', 999, true],
    ['G22K', 'GOLD', '22K (916)', 916, true],
    ['G20K', 'GOLD', '20K (833)', 833, false],
    ['G18K', 'GOLD', '18K (750)', 750, true],
    ['G14K', 'GOLD', '14K (585)', 585, true],
    ['S999', 'SILVER', 'Fine Silver (999)', 999, true],
    ['S925', 'SILVER', 'Sterling Silver (925)', 925, true],
    ['PT950', 'PLATINUM', 'Platinum (950)', 950, true],
  ].map(([id, metalId, name, fineness, showRate]) => ({ id, metalId, name, fineness, showRate }));

  const hsn = [
    ['7113', 'Articles of jewellery of precious metal', 3],
    ['7114', "Articles of goldsmiths' / silversmiths' wares", 3],
    ['7118', 'Coins of gold / silver', 3],
    ['7108', 'Gold bars (unwrought / semi-manufactured)', 3],
    ['7106', 'Silver bars (unwrought / semi-manufactured)', 3],
    ['7110', 'Platinum (unwrought / semi-manufactured)', 3],
    ['7102', 'Diamonds, cut and polished', 0.25],
    ['7103', 'Precious & semi-precious stones (other than diamonds)', 3],
    ['7117', 'Imitation jewellery', 3],
  ].map(([code, description, gstPct]) => ({ id: code, code, description, gstPct }));

  const stoneTypes = [
    ['Diamond (VVS-EF)', 'ct', 95000], ['Diamond (VS-GH)', 'ct', 65000], ['Diamond (SI-IJ)', 'ct', 42000],
    ['Solitaire', 'ct', 150000], ['Ruby (Manik)', 'ct', 8000], ['Emerald (Panna)', 'ct', 9000],
    ['Yellow Sapphire (Pukhraj)', 'ct', 7500], ['Blue Sapphire (Neelam)', 'ct', 9500], ['Pearl (Moti)', 'ct', 1500],
    ['Red Coral (Moonga)', 'ct', 1200], ['Hessonite (Gomed)', 'ct', 900], ["Cat's Eye (Lehsunia)", 'ct', 1500],
    ['Polki (uncut diamond)', 'ct', 25000], ['Kundan', 'pcs', 150], ['American Diamond / CZ', 'pcs', 15],
    ['Meenakari', 'pcs', 200],
  ].map(([name, unit, rate], i) => ({ id: 'stn_' + (i + 1), name, unit, rate }));

  const paymentModes = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'NEFT / RTGS / IMPS', 'Cheque', 'Gold Scheme / Advance']
    .map((name, i) => ({ id: 'pm_' + (i + 1), name, active: true }));

  const customerGroups = [
    ['Retail', 0], ['VIP', 5], ['Wholesale', 10], ['Gold Saving Scheme', 3],
  ].map(([name, makingDiscountPct], i) => ({ id: 'cg_' + (i + 1), name, makingDiscountPct }));

  // [code, name, category, metal, purity, hsn, pricing, makingType, makingValue, wastage%, unit]
  const W = 'WEIGHT', F = 'FIXED', P = 'PERCENT', G = 'PER_GRAM', FL = 'FLAT';
  const itemRows = [
    // Gold jewellery (22K)
    ['GR-LAD', 'Ladies Ring', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GR-GEN', 'Gents Ring', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 10, 0, 'g'],
    ['GR-BND', 'Couple Band', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GR-NVR', 'Navratna Ring', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 14, 0, 'g'],
    ['GC-CHN', 'Gold Chain', 'GOLD', 'GOLD', 'G22K', '7113', W, G, 450, 0, 'g'],
    ['GC-RPC', 'Rope Chain', 'GOLD', 'GOLD', 'G22K', '7113', W, G, 500, 0, 'g'],
    ['GC-BXC', 'Box Chain', 'GOLD', 'GOLD', 'G22K', '7113', W, G, 480, 0, 'g'],
    ['GN-NKL', 'Necklace', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 14, 0, 'g'],
    ['GN-CHK', 'Choker', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 15, 0, 'g'],
    ['GN-HAR', 'Haar (Long Necklace)', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 14, 0, 'g'],
    ['GN-RHR', 'Rani Haar', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 16, 0, 'g'],
    ['GN-MSU', 'Mangalsutra', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GN-MSC', 'Mangalsutra Chain', 'GOLD', 'GOLD', 'G22K', '7113', W, G, 450, 0, 'g'],
    ['GN-THL', 'Thali / Mangalyam', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 10, 0, 'g'],
    ['GP-PND', 'Pendant', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GP-LKT', 'Locket', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GP-GOD', 'God Pendant (Om / Ganesha / Lakshmi)', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 10, 0, 'g'],
    ['GB-BNG', 'Bangles', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 10, 0, 'g'],
    ['GB-KDA', 'Kada', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 10, 0, 'g'],
    ['GB-BRC', 'Bracelet', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GB-BJB', 'Bajuband (Armlet)', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 14, 0, 'g'],
    ['GB-NZR', 'Kids Bangles / Nazariya', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 10, 0, 'g'],
    ['GE-JHM', 'Jhumka', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 14, 0, 'g'],
    ['GE-STD', 'Studs / Tops', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GE-BAL', 'Bali / Hoops', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GE-CHB', 'Chandbali', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 15, 0, 'g'],
    ['GE-SDG', 'Sui Dhaga Earrings', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GE-DGL', 'Drops / Danglers', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GE-KCH', 'Kaan Chain / Ear Chain', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GO-NPN', 'Nose Pin', 'GOLD', 'GOLD', 'G22K', '7113', W, FL, 400, 0, 'g'],
    ['GO-NTH', 'Nath (Nose Ring)', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 15, 0, 'g'],
    ['GO-MTK', 'Maang Tikka', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 14, 0, 'g'],
    ['GO-PSA', 'Passa / Jhoomar', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 15, 0, 'g'],
    ['GO-KMB', 'Kamarbandh / Waist Belt', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GO-HTP', 'Haathphool', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 15, 0, 'g'],
    ['GO-PYL', 'Gold Payal (Anklet)', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GO-BCH', 'Gold Bichhiya (Toe Ring)', 'GOLD', 'GOLD', 'G22K', '7113', W, FL, 300, 0, 'g'],
    ['GO-CFL', 'Cufflinks', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GO-TPN', 'Tie Pin', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GO-BRH', 'Brooch / Saree Pin', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    ['GO-HRP', 'Hair Pin / Juda Pin', 'GOLD', 'GOLD', 'G22K', '7113', W, P, 12, 0, 'g'],
    // Temple jewellery
    ['TJ-NKL', 'Temple Necklace', 'TEMPLE', 'GOLD', 'G22K', '7113', W, P, 16, 2, 'g'],
    ['TJ-KSM', 'Kasu Mala / Lakshmi Haar', 'TEMPLE', 'GOLD', 'G22K', '7113', W, P, 16, 2, 'g'],
    ['TJ-JHM', 'Temple Jhumka', 'TEMPLE', 'GOLD', 'G22K', '7113', W, P, 16, 2, 'g'],
    ['TJ-ODY', 'Oddiyanam (Vaddanam)', 'TEMPLE', 'GOLD', 'G22K', '7113', W, P, 15, 2, 'g'],
    ['TJ-VNK', 'Vanki (Armlet)', 'TEMPLE', 'GOLD', 'G22K', '7113', W, P, 15, 2, 'g'],
    ['TJ-MTK', 'Nethi Chutti', 'TEMPLE', 'GOLD', 'G22K', '7113', W, P, 15, 2, 'g'],
    // Kundan & Polki
    ['KP-KNS', 'Kundan Necklace Set', 'KUNDAN', 'GOLD', 'G22K', '7113', W, P, 18, 0, 'g'],
    ['KP-PLK', 'Polki Necklace', 'KUNDAN', 'GOLD', 'G22K', '7113', W, P, 18, 0, 'g'],
    ['KP-JDE', 'Jadau Earrings', 'KUNDAN', 'GOLD', 'G22K', '7113', W, P, 18, 0, 'g'],
    ['KP-MTK', 'Kundan Maang Tikka', 'KUNDAN', 'GOLD', 'G22K', '7113', W, P, 18, 0, 'g'],
    ['KP-BNG', 'Kundan Bangles', 'KUNDAN', 'GOLD', 'G22K', '7113', W, P, 18, 0, 'g'],
    ['KP-NTH', 'Kundan Nath', 'KUNDAN', 'GOLD', 'G22K', '7113', W, P, 18, 0, 'g'],
    // Diamond jewellery (18K)
    ['DM-RNG', 'Diamond Ring', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-SOL', 'Solitaire Ring', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-BND', 'Diamond Band / Eternity Ring', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-ERG', 'Diamond Earrings', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-PND', 'Diamond Pendant', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-NKL', 'Diamond Necklace', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-BNG', 'Diamond Bangle', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-BRC', 'Diamond Bracelet', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    ['DM-NPN', 'Diamond Nose Pin', 'DIAMOND', 'GOLD', 'G18K', '7113', W, FL, 800, 0, 'g'],
    ['DM-MSU', 'Diamond Mangalsutra', 'DIAMOND', 'GOLD', 'G18K', '7113', W, P, 15, 0, 'g'],
    // Platinum
    ['PT-RNG', 'Platinum Ring', 'PLATINUM', 'PLATINUM', 'PT950', '7113', W, P, 15, 0, 'g'],
    ['PT-BND', 'Platinum Couple Bands', 'PLATINUM', 'PLATINUM', 'PT950', '7113', W, P, 15, 0, 'g'],
    ['PT-CHN', 'Platinum Chain', 'PLATINUM', 'PLATINUM', 'PT950', '7113', W, P, 14, 0, 'g'],
    ['PT-BRC', 'Platinum Bracelet', 'PLATINUM', 'PLATINUM', 'PT950', '7113', W, P, 14, 0, 'g'],
    ['PT-PND', 'Platinum Pendant', 'PLATINUM', 'PLATINUM', 'PT950', '7113', W, P, 15, 0, 'g'],
    ['PT-ERG', 'Platinum Earrings', 'PLATINUM', 'PLATINUM', 'PT950', '7113', W, P, 15, 0, 'g'],
    // Silver jewellery
    ['SJ-PYL', 'Payal / Pajeb (Anklets)', 'SILVERJ', 'SILVER', 'S925', '7113', W, G, 25, 0, 'g'],
    ['SJ-BCH', 'Bichhiya (Toe Rings)', 'SILVERJ', 'SILVER', 'S925', '7113', W, FL, 80, 0, 'g'],
    ['SJ-KDA', 'Silver Kada', 'SILVERJ', 'SILVER', 'S925', '7113', W, G, 20, 0, 'g'],
    ['SJ-CHN', 'Silver Chain', 'SILVERJ', 'SILVER', 'S925', '7113', W, G, 20, 0, 'g'],
    ['SJ-RNG', 'Silver Ring', 'SILVERJ', 'SILVER', 'S925', '7113', W, FL, 150, 0, 'g'],
    ['SJ-BRC', 'Silver Bracelet', 'SILVERJ', 'SILVER', 'S925', '7113', W, G, 25, 0, 'g'],
    ['SJ-ERG', 'Silver Earrings', 'SILVERJ', 'SILVER', 'S925', '7113', W, FL, 150, 0, 'g'],
    ['SJ-KMB', 'Silver Kamarbandh', 'SILVERJ', 'SILVER', 'S925', '7113', W, G, 25, 0, 'g'],
    ['SJ-OXN', 'Oxidised Silver Necklace', 'SILVERJ', 'SILVER', 'S925', '7113', W, G, 30, 0, 'g'],
    ['SJ-NZR', 'Kids Silver Nazariya', 'SILVERJ', 'SILVER', 'S925', '7113', W, FL, 100, 0, 'g'],
    // Silver articles
    ['SA-GLS', 'Silver Glass', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    ['SA-THL', 'Silver Thali (Plate)', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    ['SA-KTR', 'Silver Katori (Bowl)', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    ['SA-SPN', 'Silver Spoon', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    ['SA-BBS', 'Baby Feeding Set', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 20, 0, 'g'],
    ['SA-PJT', 'Pooja Thali Set', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 20, 0, 'g'],
    ['SA-DYA', 'Silver Diya', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    ['SA-KLS', 'Silver Kalash / Lota', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    ['SA-IDL', 'Silver Idol (Ganesha / Lakshmi)', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 30, 0, 'g'],
    ['SA-FRM', 'Silver Photo Frame', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 25, 0, 'g'],
    ['SA-DBB', 'Kumkum Dabbi / Gift Box', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 25, 0, 'g'],
    ['SA-TRY', 'Silver Tray', 'SILVERA', 'SILVER', 'S925', '7114', W, G, 15, 0, 'g'],
    // Bullion & coins
    ['BC-GC1', 'Gold Coin 1 g (24K)', 'BULLION', 'GOLD', 'G24K', '7118', W, FL, 250, 0, 'pcs'],
    ['BC-GC2', 'Gold Coin 2 g (24K)', 'BULLION', 'GOLD', 'G24K', '7118', W, FL, 350, 0, 'pcs'],
    ['BC-GC5', 'Gold Coin 5 g (24K)', 'BULLION', 'GOLD', 'G24K', '7118', W, FL, 600, 0, 'pcs'],
    ['BC-GC8', 'Gold Coin 8 g / Sovereign (22K)', 'BULLION', 'GOLD', 'G22K', '7118', W, FL, 800, 0, 'pcs'],
    ['BC-GC10', 'Gold Coin 10 g (24K)', 'BULLION', 'GOLD', 'G24K', '7118', W, FL, 1000, 0, 'pcs'],
    ['BC-GB50', 'Gold Bar 50 g (24K)', 'BULLION', 'GOLD', 'G24K', '7108', W, FL, 2500, 0, 'pcs'],
    ['BC-GB100', 'Gold Bar 100 g (24K)', 'BULLION', 'GOLD', 'G24K', '7108', W, FL, 4000, 0, 'pcs'],
    ['BC-SC10', 'Silver Coin 10 g (999)', 'BULLION', 'SILVER', 'S999', '7118', W, FL, 100, 0, 'pcs'],
    ['BC-SC20', 'Silver Coin 20 g (999)', 'BULLION', 'SILVER', 'S999', '7118', W, FL, 150, 0, 'pcs'],
    ['BC-SC50', 'Silver Coin 50 g (999)', 'BULLION', 'SILVER', 'S999', '7118', W, FL, 250, 0, 'pcs'],
    ['BC-SB1K', 'Silver Bar 1 kg (999)', 'BULLION', 'SILVER', 'S999', '7106', W, FL, 1500, 0, 'pcs'],
    // Gemstones (sold at fixed price per stone)
    ['GM-MNK', 'Ruby (Manik)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-PNA', 'Emerald (Panna)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-PKH', 'Yellow Sapphire (Pukhraj)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-NLM', 'Blue Sapphire (Neelam)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-MTI', 'Pearl (Moti)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-MNG', 'Red Coral (Moonga)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-GMD', 'Hessonite (Gomed)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-LHS', "Cat's Eye (Lehsunia)", 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-OPL', 'Opal', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'ct'],
    ['GM-NVR', 'Navratna Set (9 stones)', 'GEM', 'NONE', '', '7103', F, FL, 0, 0, 'pcs'],
    ['GM-DIA', 'Loose Diamond (certified)', 'GEM', 'NONE', '', '7102', F, FL, 0, 0, 'ct'],
  ];

  const items = itemRows.map((r) => ({
    id: 'itm_' + r[0],
    code: r[0], name: r[1], categoryId: 'cat_' + r[2], metalId: r[3], purityId: r[4], hsn: r[5],
    pricing: r[6], makingType: r[7], makingValue: r[8], wastagePct: r[9], unit: r[10],
    reorderLevel: r[6] === 'FIXED' ? 1 : 2, active: true,
  }));

  const vendors = [
    { id: 'ven_1', code: 'V001', name: 'Shree Ganesh Ornaments Pvt Ltd', type: 'Manufacturer', contactPerson: 'Mahesh Soni', phone: '9820012345', email: 'sales@shreeganesh.example', gstin: '27AAECS1234F1Z5', city: 'Mumbai', state: 'Maharashtra', address: 'Zaveri Bazaar, Kalbadevi, Mumbai', openingBalance: 0 },
    { id: 'ven_2', code: 'V002', name: 'Rajkot Silver Crafts', type: 'Wholesaler', contactPerson: 'Bharat Patel', phone: '9824023456', email: 'info@rajkotsilver.example', gstin: '24AAFFR5678K1Z2', city: 'Rajkot', state: 'Gujarat', address: 'Soni Bazaar, Rajkot', openingBalance: 0 },
    { id: 'ven_3', code: 'V003', name: 'Kolkata Karigar Works', type: 'Karigar / Job Worker', contactPerson: 'Subhash Das', phone: '9830034567', email: '', gstin: '19ABCPD4321L1Z9', city: 'Kolkata', state: 'West Bengal', address: 'Bowbazar, Kolkata', openingBalance: 0 },
    { id: 'ven_4', code: 'V004', name: 'Surat Diamond House', type: 'Manufacturer', contactPerson: 'Nilesh Shah', phone: '9825045678', email: 'orders@suratdiamond.example', gstin: '24AAGCS8765M1Z1', city: 'Surat', state: 'Gujarat', address: 'Varachha Road, Surat', openingBalance: 0 },
    { id: 'ven_5', code: 'V005', name: 'Jaipur Gems & Kundan', type: 'Wholesaler', contactPerson: 'Rakesh Agarwal', phone: '9829056789', email: '', gstin: '08AAJFJ2345N1Z3', city: 'Jaipur', state: 'Rajasthan', address: 'Johari Bazaar, Jaipur', openingBalance: 0 },
  ];

  const customers = [
    { id: 'cus_walkin', code: 'C0000', name: 'Walk-in Customer', phone: '', groupId: 'cg_1', city: '', notes: 'Default customer for counter sales' },
    { id: 'cus_1', code: 'C0001', name: 'Priya Sharma', phone: '9876543210', email: 'priya@example.com', groupId: 'cg_2', city: 'Pune', state: 'Maharashtra', address: 'Kothrud, Pune', dob: '1988-11-04', anniversary: '2012-02-14', pan: '', gstin: '', notes: 'Prefers temple jewellery' },
    { id: 'cus_2', code: 'C0002', name: 'Rahul Verma', phone: '9812345678', email: '', groupId: 'cg_1', city: 'Pune', state: 'Maharashtra', address: 'Aundh, Pune', dob: '1985-10-28', anniversary: '2015-11-20', pan: '', gstin: '', notes: '' },
    { id: 'cus_3', code: 'C0003', name: 'Anjali Iyer', phone: '9898989898', email: 'anjali@example.com', groupId: 'cg_4', city: 'Pune', state: 'Maharashtra', address: 'Baner, Pune', dob: '1992-03-15', anniversary: '', pan: '', gstin: '', notes: 'Gold saving scheme member' },
    { id: 'cus_4', code: 'C0004', name: 'Mehta Jewels (B2B)', phone: '9822000111', email: 'accounts@mehtajewels.example', groupId: 'cg_3', city: 'Nashik', state: 'Maharashtra', address: 'MG Road, Nashik', dob: '', anniversary: '', pan: 'AAAFM1234P', gstin: '27AAAFM1234P1Z6', notes: 'Wholesale buyer' },
    { id: 'cus_5', code: 'C0005', name: 'Sunita Reddy', phone: '9900112233', email: '', groupId: 'cg_1', city: 'Pune', state: 'Maharashtra', address: 'Viman Nagar, Pune', dob: '1979-10-30', anniversary: '2003-05-09', pan: '', gstin: '', notes: '' },
  ];

  const users = [
    ['admin', 'Shop Owner', 'Admin', 'admin123'],
    ['manager', 'Store Manager', 'Manager', 'manager123'],
    ['sales', 'Sales Executive', 'Sales', 'sales123'],
  ].map(([username, name, role, pw]) => {
    const salt = U.salt();
    return { id: 'usr_' + username, username, name, role, salt, passwordHash: U.hashPassword(pw, salt), active: true };
  });

  const settings = {
    shopName: 'Swarna Mahal Jewellers',
    tagline: 'Purity you can trust since 1985',
    loginWelcome: 'Welcome back! Sign in to manage sales, stock and customers.',
    logo: '',
    loginBg: '',
    primaryColor: '#7a1f2b',
    accentColor: '#c9a227',
    address: 'Shop No. 12, Laxmi Road, Pune 411030',
    phone: '020-24450000',
    email: 'contact@swarnamahal.example',
    gstin: '27ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    bisLicence: 'HM/C-1234567',
    state: 'Maharashtra',
    stateCode: '27',
    invoicePrefix: 'INV',
    purchasePrefix: 'PUR',
    tagPrefix: 'T',
    hallmarkCharge: 45,
    terms: '1. Goods once sold will be exchanged as per shop policy only.\n2. Hallmarked jewellery as per BIS standards (HUID).\n3. Old gold will be accepted at prevailing rate less applicable deduction.\n4. Subject to local jurisdiction.',
    showDemoHint: true,
    rateApiUrl: '',
  };

  function buildRates(today) {
    // Seven days of sample history ending today (per gram, INR)
    const base = { G24K: 12850, G22K: 11780, G20K: 10705, G18K: 9640, G14K: 7520, S999: 165, S925: 153, PT950: 4350 };
    const drift = [-1.6, -1.1, -0.8, -0.3, 0.2, -0.2, 0];
    return drift.map((pct, i) => {
      const values = {};
      Object.keys(base).forEach((k) => { values[k] = Math.round(base[k] * (1 + pct / 100)); });
      // UTC timestamps like live entries; today's entry is an hour old so a fresh save is always latest
      const at = new Date(Date.now() - (6 - i) * 86400000 - 3600000).toISOString();
      return { id: 'rate_' + i, at, values, source: 'Manual', by: 'admin' };
    });
  }

  function buildStock(today) {
    // [item code, gross wt, stone wt, stone value, vendor, huid?, fixed price]
    const rows = [
      ['GR-LAD', 4.12, 0, 0, 'ven_1'], ['GR-LAD', 3.56, 0.2, 1200, 'ven_1'], ['GR-GEN', 7.85, 0, 0, 'ven_1'],
      ['GC-CHN', 10.25, 0, 0, 'ven_1'], ['GC-CHN', 15.6, 0, 0, 'ven_1'], ['GC-RPC', 20.1, 0, 0, 'ven_1'],
      ['GN-NKL', 32.4, 1.2, 4500, 'ven_3'], ['GN-MSU', 12.8, 0.5, 900, 'ven_1'], ['GN-RHR', 58.3, 0, 0, 'ven_3'],
      ['GB-BNG', 24.6, 0, 0, 'ven_1'], ['GB-BNG', 22.9, 0, 0, 'ven_1'], ['GB-KDA', 18.4, 0, 0, 'ven_3'],
      ['GB-BRC', 9.7, 0, 0, 'ven_1'], ['GE-JHM', 8.6, 0.4, 600, 'ven_3'], ['GE-STD', 2.35, 0, 0, 'ven_1'],
      ['GE-CHB', 11.2, 0.6, 1800, 'ven_3'], ['GO-NPN', 0.45, 0.05, 350, 'ven_1'], ['GO-MTK', 6.3, 0.3, 700, 'ven_3'],
      ['TJ-NKL', 45.2, 2.1, 6500, 'ven_3'], ['TJ-JHM', 14.8, 0.9, 2200, 'ven_3'],
      ['KP-KNS', 62.5, 8.4, 38000, 'ven_5'], ['KP-JDE', 18.2, 2.6, 12500, 'ven_5'],
      ['DM-RNG', 3.9, 0.12, 28500, 'ven_4'], ['DM-ERG', 5.2, 0.24, 46000, 'ven_4'], ['DM-PND', 2.8, 0.1, 19500, 'ven_4'],
      ['DM-SOL', 4.1, 0.1, 95000, 'ven_4'], ['PT-RNG', 6.4, 0, 0, 'ven_4'], ['PT-BND', 11.8, 0, 0, 'ven_4'],
      ['SJ-PYL', 85.4, 0, 0, 'ven_2'], ['SJ-PYL', 62.1, 0, 0, 'ven_2'], ['SJ-BCH', 12.3, 0, 0, 'ven_2'],
      ['SA-GLS', 120.5, 0, 0, 'ven_2'], ['SA-PJT', 310.2, 0, 0, 'ven_2'], ['SA-IDL', 45.8, 0, 0, 'ven_2'],
      ['SA-DYA', 38.6, 0, 0, 'ven_2'], ['BC-GC1', 1, 0, 0, 'ven_1'], ['BC-GC5', 5, 0, 0, 'ven_1'],
      ['BC-GC10', 10, 0, 0, 'ven_1'], ['BC-SC10', 10, 0, 0, 'ven_2'], ['BC-SC50', 50, 0, 0, 'ven_2'],
      ['GM-PKH', 0, 0, 0, 'ven_5', 18500], ['GM-NLM', 0, 0, 0, 'ven_5', 24000], ['GM-MTI', 0, 0, 0, 'ven_5', 3500],
    ];
    return rows.map((r, i) => {
      const item = items.find((it) => it.code === r[0]);
      const gross = r[1], stoneWt = r[2];
      const isGold = item.metalId === 'GOLD' || item.metalId === 'PLATINUM';
      return {
        id: 'stk_' + (i + 1),
        tagNo: settings.tagPrefix + String(1001 + i),
        itemId: item.id,
        purityId: item.purityId,
        qty: 1,
        grossWt: gross,
        stoneWt,
        netWt: U.r3(gross - stoneWt),
        stoneValue: r[3],
        stoneDetails: r[3] ? 'Studded' : '',
        wastagePct: '',
        makingType: '',
        makingValue: '',
        otherCharges: isGold && item.pricing === 'WEIGHT' ? settings.hallmarkCharge : 0,
        fixedPrice: r[5] || 0,
        huid: isGold && item.categoryId !== 'cat_BULLION' ? 'H' + (734210 + i * 37).toString(36).toUpperCase().slice(-5) : '',
        size: '',
        vendorId: r[4],
        purchaseId: '',
        costPrice: 0,
        location: i % 3 === 0 ? 'Locker' : 'Counter ' + ((i % 2) + 1),
        status: 'IN_STOCK',
        receivedOn: U.addDays(today, -20 + (i % 10)),
      };
    });
  }

  function build() {
    const today = U.today();
    const rates = buildRates(today);
    const stock = buildStock(today);
    const data = {
      version: 1,
      settings: Object.assign({}, settings),
      users, categories, metals, purities, hsn, stoneTypes, paymentModes, customerGroups,
      items, vendors, customers, rates, stock,
      purchases: [], vendorPayments: [], invoices: [], receipts: [],
      counters: { invoice: 0, purchase: 0, tag: 1000 + stock.length, customer: customers.length - 1, receipt: 0 },
      audit: [],
    };

    // A few demo invoices so dashboard and reports have content
    const demo = [
      { day: -5, customerId: 'cus_1', tags: ['T1001', 'T1015'], pay: 'UPI', old: null },
      { day: -3, customerId: 'cus_2', tags: ['T1004'], pay: 'Cash', old: { grossWt: 6.2, purityId: 'G22K', deductionPct: 8 } },
      { day: -2, customerId: 'cus_3', tags: ['T1036', 'T1039'], pay: 'Credit Card', old: null },
      { day: -1, customerId: 'cus_5', tags: ['T1024'], pay: 'NEFT / RTGS / IMPS', partial: 0.8 },
      { day: 0, customerId: 'cus_walkin', tags: ['T1031'], pay: 'Cash' },
    ];
    demo.forEach((d) => {
      const date = U.addDays(today, d.day);
      const rateSnap = rates[6 + d.day].values;
      const lines = d.tags.map((tag) => {
        const piece = stock.find((s) => s.tagNo === tag);
        const item = items.find((it) => it.id === piece.itemId);
        return Pricing.lineFromStock(piece, item, hsn.find((h) => h.id === item.hsn), rateSnap);
      });
      const oldGold = d.old ? [Object.assign({ description: 'Old gold ornament', rate: rateSnap[d.old.purityId] }, d.old)] : [];
      let inv = Pricing.calcInvoice({ lines, oldGold, discount: 0, interState: false, payments: [] });
      const payAmt = d.partial ? Math.round(inv.grandTotal * d.partial) : inv.grandTotal;
      data.counters.invoice += 1;
      inv = Pricing.calcInvoice(Object.assign(inv, { payments: [{ mode: d.pay, amount: payAmt, ref: '' }] }));
      const fy = U.finYear(date);
      const record = Object.assign(inv, {
        id: 'inv_' + data.counters.invoice,
        invoiceNo: settings.invoicePrefix + '/' + fy + '/' + String(data.counters.invoice).padStart(4, '0'),
        date, customerId: d.customerId, status: 'ACTIVE', createdBy: 'sales', createdAt: date + 'T12:00:00', notes: '',
      });
      data.invoices.push(record);
      d.tags.forEach((tag) => {
        const piece = stock.find((s) => s.tagNo === tag);
        piece.status = 'SOLD';
        piece.soldInvoiceId = record.id;
      });
    });
    return data;
  }

  global.Seed = { build };
})(window);
