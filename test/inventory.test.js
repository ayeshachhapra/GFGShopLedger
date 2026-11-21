const assert = require('node:assert/strict');
const { test } = require('node:test');

const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

function stockLevels(product) {
  return [product.stock, product.reserved, inventory.getSellableStock(product)];
}

test('one sellable unit accepts quantity one, rejects two, and accepts zero', () => {
  const products = [{ id: 6, name: 'Ghee', stock: 1, reserved: 0 }];

  assert.deepEqual(inventory.check(products, [{ id: 6, qty: 1 }]), { ok: true });
  assert.deepEqual(inventory.check(products, [{ id: 6, qty: 2 }]), {
    ok: false, msg: 'Ghee is out of stock (1 sellable available)',
  });
  assert.equal(inventory.check(products, [{ id: 6, qty: 0 }]).ok, true);
});

test('checkout can sell the last unit above the wholesale hold', () => {
  const products = [{ id: 12, name: 'Chilli powder', stock: 4, reserved: 3 }];

  assert.equal(inventory.getSellableStock(products[0]), 1);
  assert.equal(inventory.check(products, [{ id: 12, qty: 1 }]).ok, true);
  assert.equal(inventory.check(products, [{ id: 12, qty: 2 }]).ok, false);
});

test('cancelling a pending order restores physical stock exactly once', () => {
  const product = { id: 6, name: 'Ghee', stock: 4, reserved: 1 };
  const items = [{ id: 6, sku: 'DRY-001', name: 'Ghee', hsn: '0405', price: 450, qty: 2 }];
  const db = {
    products: [product],
    orders: [{ id: 1007, status: 'pending', paymentMode: 'cash', items }],
  };

  assert.deepEqual(stockLevels(product), [4, 1, 3]);
  inventory.reserve(db.products, items);
  assert.deepEqual(stockLevels(product), [2, 1, 1]);

  const result = orders.cancel(db, 1007);
  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.deepEqual(stockLevels(product), [4, 1, 3]);

  assert.equal(orders.cancel(db, 1007).ok, false);
  assert.deepEqual(stockLevels(product), [4, 1, 3]);
});

test('repeated cart lines cannot collectively exceed sellable stock', () => {
  const products = [{ id: 6, name: 'Ghee', stock: 3, reserved: 1 }];
  const items = [{ id: 6, qty: 1 }, { id: '6', qty: 1 }];

  assert.equal(inventory.check(products, items).ok, true);
  assert.equal(inventory.check(products, [...items, { id: 6, qty: 1 }]).ok, false);
  assert.deepEqual(stockLevels(products[0]), [3, 1, 2]);
});

test('cancellation also restores stock for older productId line items', () => {
  const product = { id: 6, name: 'Ghee', stock: 2, reserved: 1 };
  const db = {
    products: [product],
    orders: [{ id: 1007, status: 'pending', items: [{ productId: 6, qty: 1 }] }],
  };

  assert.equal(orders.cancel(db, 1007).ok, true);
  assert.deepEqual(stockLevels(product), [3, 1, 2]);
});
