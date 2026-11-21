const assert = require('node:assert/strict');
const { test } = require('node:test');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

function summarizeInvoice(figures) {
  const { subtotal, discount, tax, total, rows } = figures;
  return { subtotal, discount, tax, total, lines: rows.map(({ gstPercent, lineTax }) => [gstPercent, lineTax]) };
}

function summarizeCheckout(figures) {
  const { subtotal, discount, tax, total, lines } = figures;
  return { subtotal, discount, tax, total, lines: lines.map(({ gstPercent, tax }) => [gstPercent, tax]) };
}

test('invoice and checkout use the same GST for mixed 5% and 12% items', () => {
  const items = [
    { id: 7, sku: 'DRY-002', name: 'Table butter', hsn: '0405', price: 140, qty: 2 },
    { id: 2, sku: 'GRN-002', name: 'Toor dal', hsn: '0713', price: 165, qty: 2 },
  ];
  const order = { items, coupon: '' };
  const expected = {
    subtotal: 610, discount: 0, tax: 50.1, total: 660.1, lines: [[12, 33.6], [5, 16.5]],
  };
  assert.deepEqual(summarizeInvoice(invoice.computeInvoiceFigures(order)), expected);
  assert.deepEqual(summarizeCheckout(pricing.computeTotals(items, order.coupon)), expected);
});

test('invoice and checkout apply SAVE10 before GST for order #1002', () => {
  const items = [
    { id: 1, sku: 'GRN-001', name: 'Basmati rice', hsn: '1006', price: 640, qty: 1 },
    { id: 4, sku: 'OIL-001', name: 'Sunflower oil', hsn: '1512', price: 190, qty: 2 },
  ];
  const order = { items, coupon: 'SAVE10' };
  const expected = {
    subtotal: 1020, discount: 102, tax: 45.9, total: 963.9, lines: [[5, 28.8], [5, 17.1]],
  };
  assert.deepEqual(summarizeInvoice(invoice.computeInvoiceFigures(order)), expected);
  assert.deepEqual(summarizeCheckout(pricing.computeTotals(items, order.coupon)), expected);
});

test('invoice and checkout apply the ₹150 SAVE10 cap for order #1004', () => {
  const items = [
    { id: 5, sku: 'OIL-002', name: 'Groundnut oil', hsn: '1508', price: 1120, qty: 2 },
  ];
  const order = { items, coupon: 'SAVE10' };
  const expected = {
    subtotal: 2240, discount: 150, tax: 104.5, total: 2194.5, lines: [[5, 104.5]],
  };
  assert.deepEqual(summarizeInvoice(invoice.computeInvoiceFigures(order)), expected);
  assert.deepEqual(summarizeCheckout(pricing.computeTotals(items, order.coupon)), expected);
});

test('invoice and checkout agree for undiscounted 18% items in order #1008', () => {
  const items = [
    { id: 8, sku: 'BEV-001', name: 'Masala chai', hsn: '0902', price: 140, qty: 1 },
    { id: 12, sku: 'BEV-003', name: 'Kokum concentrate', hsn: '2106', price: 180, qty: 2 },
  ];
  const order = { items, coupon: '' };
  const expected = { subtotal: 500, discount: 0, tax: 90, total: 590, lines: [[18, 25.2], [18, 64.8]] };
  assert.deepEqual(summarizeInvoice(invoice.computeInvoiceFigures(order)), expected);
  assert.deepEqual(summarizeCheckout(pricing.computeTotals(items, order.coupon)), expected);
});

test('invoice apportions capped SAVE10 before GST across mixed HSN slabs', () => {
  const items = [
    { id: 5, sku: 'OIL-002', name: 'Groundnut oil', hsn: '1508', price: 1120, qty: 2 },
    { id: 7, sku: 'DRY-002', name: 'Table butter', hsn: '0405', price: 260, qty: 1 },
  ];
  const coupon = 'SAVE10';
  const expected = { subtotal: 2500, discount: 150, tax: 134.61, total: 2484.61, lines: [[5, 105.28], [12, 29.33]] };

  assert.deepEqual(summarizeCheckout(pricing.computeTotals(items, coupon)), expected);
  const figures = invoice.computeInvoiceFigures({ items, coupon });
  assert.deepEqual(summarizeInvoice(figures), expected);
  assert.equal(figures.cgst, 67.31);
  assert.equal(figures.sgst, 67.3);
});
