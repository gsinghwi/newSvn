/* JewelleryApp - master data definitions (fields + list columns) used by the Masters screen and others */
(function (global) {
  'use strict';
  const esc = U.esc;

  const opt = (col, label) => () => DB.all(col).map((r) => ({ value: r.id, label: typeof label === 'function' ? label(r) : r[label || 'name'] }));
  const isAdmin = () => Auth.can(['Admin']);
  const isManager = () => Auth.can(['Admin', 'Manager']);
  const usedBy = (col, key, id, what) => (DB.all(col).some((r) => r[key] === id) ? 'Cannot delete: used by ' + what : null);
  const unique = (col, key, label) => (data, isNew, rec) => {
    const dup = DB.find(col, (r) => String(r[key]).toLowerCase() === String(data[key]).toLowerCase() && (!rec || r.id !== rec.id));
    return dup ? label + ' "' + data[key] + '" already exists' : null;
  };

  const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

  const Schemas = {
    STATES,

    items: {
      col: 'items', title: 'Items', singular: 'Item', modalSize: 'wide', canEdit: isManager,
      searchKeys: ['code', 'name', (r) => DB.name('categories', r.categoryId), 'hsn'],
      sort: (a, b) => (a.code < b.code ? -1 : 1),
      fields: [
        { name: 'code', label: 'Item code', required: true, placeholder: 'e.g. GR-LAD' },
        { name: 'name', label: 'Item name', required: true },
        { name: 'categoryId', label: 'Category', type: 'select', required: true, options: opt('categories') },
        { name: 'metalId', label: 'Metal', type: 'select', required: true, options: opt('metals') },
        { name: 'purityId', label: 'Default purity', type: 'select', options: opt('purities') },
        { name: 'hsn', label: 'HSN code', type: 'select', required: true, options: opt('hsn', (r) => r.code + ' - ' + r.gstPct + '% - ' + r.description) },
        { name: 'pricing', label: 'Pricing method', type: 'select', required: true, options: [{ value: 'WEIGHT', label: 'By weight x today\'s rate' }, { value: 'FIXED', label: 'Fixed price / MRP' }] },
        { name: 'unit', label: 'Unit', type: 'select', required: true, options: ['g', 'ct', 'pcs'] },
        { name: 'makingType', label: 'Making charge type', type: 'select', required: true, options: Pricing.MAKING_TYPES },
        { name: 'makingValue', label: 'Making charge value', type: 'number', min: 0 },
        { name: 'wastagePct', label: 'Wastage / VA %', type: 'number', min: 0, help: 'Added to net weight before applying rate' },
        { name: 'reorderLevel', label: 'Re-order level (pcs)', type: 'number', min: 0 },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
        { name: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      defaults: () => ({ pricing: 'WEIGHT', unit: 'g', makingType: 'PERCENT', makingValue: 12, wastagePct: 0, reorderLevel: 2, active: true, metalId: 'GOLD', purityId: 'G22K', hsn: '7113' }),
      beforeSave: unique('items', 'code', 'Item code'),
      canDelete: (r) => usedBy('stock', 'itemId', r.id, 'stock'),
      columns: [
        { label: 'Code', key: 'code' },
        { label: 'Item', key: 'name' },
        { label: 'Category', render: (r) => esc(DB.name('categories', r.categoryId)) },
        { label: 'Purity', render: (r) => esc(Biz.purityName(r.purityId)) },
        { label: 'HSN', key: 'hsn' },
        { label: 'Making', render: (r) => (r.pricing === 'FIXED' ? 'Fixed price' : r.makingType === 'PERCENT' ? r.makingValue + '%' : r.makingType === 'PER_GRAM' ? U.inr(r.makingValue, { whole: true }) + '/g' : U.inr(r.makingValue, { whole: true }) + '/pc') },
        { label: 'In stock', align: 'right', render: (r) => Biz.inStock().filter((s) => s.itemId === r.id).length },
        { label: 'Status', render: (r) => (r.active === false ? UI.badge('Inactive') : UI.badge('Active', 'ok')) },
      ],
    },

    categories: {
      col: 'categories', title: 'Categories', singular: 'Category', canEdit: isManager,
      fields: [
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
      ],
      beforeSave: unique('categories', 'code', 'Category code'),
      canDelete: (r) => usedBy('items', 'categoryId', r.id, 'items'),
      columns: [
        { label: 'Code', key: 'code' }, { label: 'Name', key: 'name' }, { label: 'Description', key: 'description' },
        { label: 'Items', align: 'right', render: (r) => DB.all('items').filter((i) => i.categoryId === r.id).length },
      ],
    },

    metals: {
      col: 'metals', title: 'Metals', singular: 'Metal', canEdit: isAdmin,
      fields: (v, isNew) => [
        { name: 'id', label: 'Code', required: true, readonly: !isNew, help: 'Short code, e.g. GOLD' },
        { name: 'name', label: 'Name', required: true },
        { name: 'symbol', label: 'Symbol' },
      ],
      beforeSave: (d, isNew) => (isNew && DB.get('metals', d.id) ? 'Metal code already exists' : null),
      canDelete: (r) => usedBy('purities', 'metalId', r.id, 'purities') || usedBy('items', 'metalId', r.id, 'items'),
      columns: [{ label: 'Code', key: 'id' }, { label: 'Name', key: 'name' }, { label: 'Symbol', key: 'symbol' }],
    },

    purities: {
      col: 'purities', title: 'Purities / Karat', singular: 'Purity', canEdit: isAdmin,
      fields: (v, isNew) => [
        { name: 'id', label: 'Code (rate key)', required: true, readonly: !isNew, help: 'e.g. G22K. Used as the key for daily rates' },
        { name: 'metalId', label: 'Metal', type: 'select', required: true, options: opt('metals') },
        { name: 'name', label: 'Display name', required: true, placeholder: '22K (916)' },
        { name: 'fineness', label: 'Fineness (parts per 1000)', type: 'number', required: true, min: 1 },
        { name: 'showRate', label: 'Show on dashboard & require daily rate', type: 'checkbox', full: true },
      ],
      beforeSave: (d, isNew) => (isNew && DB.get('purities', d.id) ? 'Purity code already exists' : null),
      canDelete: (r) => usedBy('stock', 'purityId', r.id, 'stock') || usedBy('items', 'purityId', r.id, 'items'),
      columns: [
        { label: 'Code', key: 'id' }, { label: 'Metal', render: (r) => esc(DB.name('metals', r.metalId)) },
        { label: 'Name', key: 'name' }, { label: 'Fineness', align: 'right', key: 'fineness' },
        { label: 'Today\'s rate', align: 'right', render: (r) => U.inr(DB.currentRates()[r.id] || 0, { whole: true }) },
      ],
    },

    hsn: {
      col: 'hsn', title: 'HSN & GST', singular: 'HSN code', canEdit: isAdmin,
      fields: (v, isNew) => [
        { name: 'code', label: 'HSN / SAC code', required: true, readonly: !isNew },
        { name: 'gstPct', label: 'GST %', type: 'number', required: true, min: 0 },
        { name: 'description', label: 'Description', full: true, required: true },
      ],
      beforeSave: (d, isNew) => {
        if (isNew && DB.get('hsn', d.code)) return 'HSN code already exists';
        if (isNew) d.id = d.code;
        return null;
      },
      canDelete: (r) => usedBy('items', 'hsn', r.id, 'items'),
      columns: [{ label: 'HSN', key: 'code' }, { label: 'Description', key: 'description' }, { label: 'GST %', align: 'right', key: 'gstPct' }],
    },

    stoneTypes: {
      col: 'stoneTypes', title: 'Stone Types', singular: 'Stone type', canEdit: isManager,
      fields: [
        { name: 'name', label: 'Stone', required: true },
        { name: 'unit', label: 'Unit', type: 'select', required: true, options: ['ct', 'pcs', 'g'] },
        { name: 'rate', label: 'Default rate (₹ per unit)', type: 'number', min: 0 },
      ],
      columns: [{ label: 'Stone', key: 'name' }, { label: 'Unit', key: 'unit' }, { label: 'Rate', align: 'right', render: (r) => U.inr(r.rate, { whole: true }) }],
    },

    paymentModes: {
      col: 'paymentModes', title: 'Payment Modes', singular: 'Payment mode', canEdit: isManager,
      fields: [{ name: 'name', label: 'Name', required: true }, { name: 'active', label: 'Active', type: 'checkbox', default: true }],
      columns: [{ label: 'Mode', key: 'name' }, { label: 'Status', render: (r) => (r.active === false ? UI.badge('Inactive') : UI.badge('Active', 'ok')) }],
    },

    customerGroups: {
      col: 'customerGroups', title: 'Customer Groups', singular: 'Customer group', canEdit: isManager,
      fields: [
        { name: 'name', label: 'Group', required: true },
        { name: 'makingDiscountPct', label: 'Making charge discount %', type: 'number', min: 0, help: 'Applied automatically on bills for customers in this group' },
      ],
      canDelete: (r) => usedBy('customers', 'groupId', r.id, 'customers'),
      columns: [{ label: 'Group', key: 'name' }, { label: 'Making discount', align: 'right', render: (r) => U.n(r.makingDiscountPct) + '%' },
        { label: 'Customers', align: 'right', render: (r) => DB.all('customers').filter((c) => c.groupId === r.id).length }],
    },

    customers: {
      col: 'customers', title: 'Customers', singular: 'Customer', modalSize: 'wide',
      searchKeys: ['code', 'name', 'phone', 'email', 'city', 'gstin'],
      sort: (a, b) => (a.code < b.code ? -1 : 1),
      fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'phone', label: 'Mobile', type: 'tel', maxlength: 15 },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'groupId', label: 'Customer group', type: 'select', options: opt('customerGroups') },
        { name: 'dob', label: 'Date of birth', type: 'date' },
        { name: 'anniversary', label: 'Anniversary', type: 'date' },
        { name: 'address', label: 'Address', full: true },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State', type: 'select', options: STATES },
        { name: 'pan', label: 'PAN', maxlength: 10, help: 'Required for purchases of ₹2 lakh and above' },
        { name: 'gstin', label: 'GSTIN (B2B)', maxlength: 15 },
        { name: 'aadhaarLast4', label: 'Aadhaar (last 4 digits)', maxlength: 4 },
        { name: 'ringSize', label: 'Ring / bangle size' },
        { name: 'notes', label: 'Notes / preferences', type: 'textarea', full: true },
      ],
      defaults: () => ({ groupId: 'cg_1', state: DB.settings.state }),
      beforeSave: (d, isNew, rec) => {
        if (d.phone && !/^[0-9+\- ]{10,15}$/.test(d.phone)) return 'Enter a valid mobile number';
        if (d.phone) {
          const dup = DB.find('customers', (c) => c.phone === d.phone && (!rec || c.id !== rec.id));
          if (dup) return 'Mobile already registered to ' + dup.name;
        }
        if (d.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(d.pan)) return 'PAN format looks wrong (e.g. ABCDE1234F)';
        if (d.gstin && !/^[0-9]{2}[A-Z0-9]{13}$/i.test(d.gstin)) return 'GSTIN should be 15 characters';
        d.pan = (d.pan || '').toUpperCase();
        d.gstin = (d.gstin || '').toUpperCase();
        if (isNew) d.code = DB.nextCode('customer', 'C');
        return null;
      },
      canDelete: (r) => (r.id === 'cus_walkin' ? 'The walk-in customer is required' : usedBy('invoices', 'customerId', r.id, 'bills')),
      columns: [
        { label: 'Code', key: 'code' },
        { label: 'Name', render: (r) => '<b>' + esc(r.name) + '</b>' },
        { label: 'Mobile', key: 'phone' },
        { label: 'City', key: 'city' },
        { label: 'Group', render: (r) => esc(DB.name('customerGroups', r.groupId)) },
        { label: 'Purchases', align: 'right', render: (r) => U.inr(DB.customerSummary(r.id).billed, { whole: true }) },
        { label: 'Due', align: 'right', render: (r) => { const o = DB.customerSummary(r.id).outstanding; return o > 0 ? UI.badge(U.inr(o, { whole: true }), 'warn') : '-'; } },
      ],
    },

    vendors: {
      col: 'vendors', title: 'Vendors', singular: 'Vendor', modalSize: 'wide', canEdit: isManager,
      searchKeys: ['code', 'name', 'contactPerson', 'phone', 'city', 'gstin'],
      fields: [
        { name: 'code', label: 'Vendor code', required: true },
        { name: 'name', label: 'Firm name', required: true },
        { name: 'type', label: 'Vendor type', type: 'select', required: true, options: ['Manufacturer', 'Wholesaler', 'Karigar / Job Worker', 'Bullion Dealer', 'Refinery', 'Other'] },
        { name: 'contactPerson', label: 'Contact person' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'gstin', label: 'GSTIN', maxlength: 15 },
        { name: 'pan', label: 'PAN', maxlength: 10 },
        { name: 'address', label: 'Address', full: true },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State', type: 'select', options: STATES },
        { name: 'bankDetails', label: 'Bank details (A/c, IFSC)', full: true },
        { name: 'openingBalance', label: 'Opening balance payable (₹)', type: 'number' },
      ],
      defaults: () => ({ code: 'V' + String(DB.all('vendors').length + 1).padStart(3, '0'), type: 'Manufacturer', openingBalance: 0 }),
      beforeSave: (d, isNew, rec) => {
        d.gstin = (d.gstin || '').toUpperCase();
        return unique('vendors', 'code', 'Vendor code')(d, isNew, rec);
      },
      canDelete: (r) => usedBy('stock', 'vendorId', r.id, 'stock') || usedBy('purchases', 'vendorId', r.id, 'purchases'),
      columns: [
        { label: 'Code', key: 'code' },
        { label: 'Vendor', render: (r) => '<b>' + esc(r.name) + '</b><br><small class="muted">' + esc(r.type) + '</small>' },
        { label: 'Contact', render: (r) => esc(r.contactPerson || '') + '<br><small class="muted">' + esc(r.phone || '') + '</small>' },
        { label: 'City', key: 'city' },
        { label: 'GSTIN', key: 'gstin' },
        { label: 'Stock pcs', align: 'right', render: (r) => Biz.inStock().filter((s) => s.vendorId === r.id).length },
        { label: 'Payable', align: 'right', render: (r) => { const p = DB.vendorSummary(r.id).payable; return p > 0 ? UI.badge(U.inr(p, { whole: true }), 'warn') : '-'; } },
      ],
    },

    users: {
      col: 'users', title: 'Users', singular: 'User', canEdit: isAdmin,
      fields: (v, isNew) => [
        { name: 'username', label: 'Username', required: true, readonly: !isNew },
        { name: 'name', label: 'Full name', required: true },
        { name: 'role', label: 'Role', type: 'select', required: true, options: ['Admin', 'Manager', 'Sales'] },
        { name: 'password', label: isNew ? 'Password' : 'New password (leave blank to keep)', type: 'password', required: isNew },
        { name: 'active', label: 'Active (can sign in)', type: 'checkbox', default: true },
      ],
      defaults: () => ({ role: 'Sales', active: true }),
      beforeSave: (d, isNew, rec) => {
        const dup = unique('users', 'username', 'Username')(d, isNew, rec);
        if (dup) return dup;
        if (d.password && d.password.length < 6) return 'Password must be at least 6 characters';
        if (rec && rec.id === Auth.user.id && (!d.active || d.role !== 'Admin')) return 'You cannot deactivate or demote yourself';
        if (d.password) { d.salt = U.salt(); d.passwordHash = U.hashPassword(d.password, d.salt); }
        delete d.password;
        return null;
      },
      canDelete: (r) => (r.id === Auth.user.id ? 'You cannot delete yourself' : null),
      columns: [
        { label: 'Username', key: 'username' }, { label: 'Name', key: 'name' },
        { label: 'Role', render: (r) => UI.badge(r.role, r.role === 'Admin' ? 'gold' : '') },
        { label: 'Status', render: (r) => (r.active ? UI.badge('Active', 'ok') : UI.badge('Disabled')) },
      ],
    },
  };

  global.Schemas = Schemas;
})(window);
