/* JewelleryApp - jewellery pricing & invoice maths
 *
 * Weight based line:
 *   effective weight = net wt x (1 + wastage% / 100)
 *   metal value      = effective weight x rate per gram (of the purity)
 *   making           = PER_GRAM: net wt x value | PERCENT: metal value x value% | FLAT: value
 *   line amount      = metal value + making + stone value + other charges (hallmark etc.)
 * Fixed price line (coins with MRP, gemstones, articles): amount = fixed price x qty
 *
 * Invoice: discount is spread across lines pro-rata, GST is charged per line HSN rate
 * (CGST+SGST for intra-state, IGST for inter-state), old gold exchange is deducted after tax.
 */
(function (global) {
  'use strict';

  const MAKING_TYPES = [
    { value: 'PERCENT', label: '% of metal value' },
    { value: 'PER_GRAM', label: 'Per gram (₹/g)' },
    { value: 'FLAT', label: 'Flat per piece (₹)' },
  ];

  function calcLine(l) {
    const out = Object.assign({}, l);
    out.qty = U.n(l.qty) || 1;
    if (l.pricing === 'FIXED') {
      out.metalValue = 0;
      out.making = 0;
      out.amount = U.r2(U.n(l.fixedPrice) * out.qty + U.n(l.otherCharges));
      return out;
    }
    const netWt = U.n(l.netWt);
    const effWt = netWt * (1 + U.n(l.wastagePct) / 100);
    const metalValue = effWt * U.n(l.rate);
    let making = 0;
    if (l.makingType === 'PER_GRAM') making = netWt * U.n(l.makingValue);
    else if (l.makingType === 'PERCENT') making = metalValue * U.n(l.makingValue) / 100;
    else making = U.n(l.makingValue) * out.qty;
    out.effWt = U.r3(effWt);
    out.metalValue = U.r2(metalValue);
    out.making = U.r2(making);
    out.amount = U.r2(metalValue + making + U.n(l.stoneValue) + U.n(l.otherCharges));
    return out;
  }

  function calcOldGold(o) {
    const out = Object.assign({}, o);
    out.netWt = U.r3(U.n(o.grossWt) * (1 - U.n(o.deductionPct) / 100));
    out.value = U.r2(out.netWt * U.n(o.rate));
    return out;
  }

  function calcInvoice(inv) {
    const lines = (inv.lines || []).map(calcLine);
    const oldGold = (inv.oldGold || []).map(calcOldGold);
    const subTotal = U.r2(U.sum(lines, 'amount'));
    const discount = Math.min(U.n(inv.discount), subTotal);
    let taxable = 0, cgst = 0, sgst = 0, igst = 0;
    lines.forEach((l) => {
      const share = subTotal ? l.amount / subTotal : 0;
      l.discountShare = U.r2(discount * share);
      l.taxable = U.r2(l.amount - l.discountShare);
      const tax = l.taxable * U.n(l.gstPct) / 100;
      if (inv.interState) {
        l.igst = U.r2(tax); l.cgst = 0; l.sgst = 0;
      } else {
        l.cgst = U.r2(tax / 2); l.sgst = U.r2(tax / 2); l.igst = 0;
      }
      taxable += l.taxable; cgst += l.cgst; sgst += l.sgst; igst += l.igst;
    });
    const totalTax = cgst + sgst + igst;
    const invoiceValue = taxable + totalTax;
    const oldGoldValue = U.sum(oldGold, 'value');
    const net = invoiceValue - oldGoldValue;
    const grandTotal = Math.round(net);
    const payments = (inv.payments || []).filter((p) => U.n(p.amount));
    const paid = U.sum(payments, 'amount');
    return Object.assign({}, inv, {
      lines, oldGold, payments,
      subTotal: U.r2(subTotal),
      discount: U.r2(discount),
      taxable: U.r2(taxable),
      cgst: U.r2(cgst), sgst: U.r2(sgst), igst: U.r2(igst),
      totalTax: U.r2(totalTax),
      invoiceValue: U.r2(invoiceValue),
      oldGoldValue: U.r2(oldGoldValue),
      roundOff: U.r2(grandTotal - net),
      grandTotal,
      paid: U.r2(paid),
      balance: U.r2(grandTotal - paid),
    });
  }

  // Build a fresh invoice line from a stock piece, item master and current rates
  function lineFromStock(piece, item, hsn, rates) {
    return calcLine({
      stockId: piece.id,
      tagNo: piece.tagNo,
      huid: piece.huid || '',
      itemId: item.id,
      itemName: item.name,
      hsn: item.hsn,
      gstPct: hsn ? U.n(hsn.gstPct) : 3,
      pricing: item.pricing,
      purityId: piece.purityId,
      qty: piece.qty || 1,
      grossWt: piece.grossWt,
      stoneWt: piece.stoneWt,
      netWt: piece.netWt,
      wastagePct: piece.wastagePct != null && piece.wastagePct !== '' ? piece.wastagePct : item.wastagePct,
      rate: rates[piece.purityId] || 0,
      makingType: piece.makingType || item.makingType,
      makingValue: piece.makingValue != null && piece.makingValue !== '' ? piece.makingValue : item.makingValue,
      stoneValue: piece.stoneValue || 0,
      otherCharges: piece.otherCharges || 0,
      fixedPrice: piece.fixedPrice || 0,
    });
  }

  global.Pricing = { MAKING_TYPES, calcLine, calcOldGold, calcInvoice, lineFromStock };
})(window);
