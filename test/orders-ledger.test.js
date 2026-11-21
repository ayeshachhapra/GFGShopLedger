const assert = require('node:assert/strict');
const { test } = require('node:test');

const dates = require('../lib/dates');
const ledger = require('../lib/ledger');
const orders = require('../lib/orders');

function orderIds(filters) {
  const db = {
    orders: [
      { id: 1001, date: '28/12/2021' },
      { id: 1004, date: '30/01/2022' },
      { id: 1008, date: '15/03/2022' },
    ],
  };
  return orders.list(db, filters).map(({ id }) => id);
}

function khataAccount(totalSettled = 1200) {
  return {
    customers: [{ id: 1, name: 'Test customer', openingBalance: 0, totalBilled: 2432.01, totalSettled, balance: 1232.01 }],
    settlements: [],
    nextSettlementId: 1,
  };
}

test('order history sorts newest first across months and years', () => {
  assert.deepEqual(orderIds(), [1008, 1004, 1001]);
});

test('date-picker filters match stored orders across months', () => {
  assert.deepEqual(orderIds({ from: '2022-01-30', to: '2022-03-15' }), [1008, 1004]);
  assert.deepEqual(orderIds({ to: '2022-01-30' }), [1004, 1001]);
  assert.deepEqual(orderIds({ from: '2022-01-30' }), [1008, 1004]);
});

test('date normalization produces year-first keys for storage and date-picker formats', () => {
  assert.equal(dates.normalizeDateKey('30/01/2022'), '2022-01-30');
  assert.equal(dates.normalizeDateKey('2022-01-30'), '2022-01-30');
});

test('fiscal year changes on 1 April for either input format', () => {
  assert.equal(dates.getFiscalYear('31/03/2022'), 'FY21-22');
  assert.equal(dates.getFiscalYear('2022-04-01'), 'FY22-23');
});

test('a numeric settlement updates the Khata balance', () => {
  const db = khataAccount();
  const result = ledger.recordSettlement(db, 1, 500);

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});

test('a string settlement is added to the settled total as a number', () => {
  const db = khataAccount();
  const result = ledger.recordSettlement(db, 1, '500');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});

test('zero and negative settlements are rejected without mutating the ledger', () => {
  const db = khataAccount();
  for (const amount of [0, -500]) {
    assert.equal(ledger.recordSettlement(db, 1, amount).ok, false);
    assert.deepEqual(db, khataAccount());
  }
});

test('invalid payments leave the Khata account and settlement log intact', () => {
  const db = khataAccount();
  for (const amount of ['invalid', '', 'Infinity', Infinity, NaN, Number.MAX_VALUE, true, [500], 0.004]) {
    assert.equal(ledger.recordSettlement(db, 1, amount).ok, false);
    assert.deepEqual(db, khataAccount());
  }
});

test('date range includes both endpoints and sorts mixed stored date formats', () => {
  const db = {
    orders: [
      { id: 1009, date: '2022-03-15' },
      { id: 1001, date: '28/12/2021' },
      { id: 1008, date: '15/03/2022' },
      { id: 1004, date: '30/01/2022' },
      { id: 1005, date: '02/02/2022' },
    ],
  };
  const results = orders.list(db, { from: '2022-01-30', to: '2022-03-15' });

  assert.deepEqual(results.map(({ id }) => id), [1009, 1008, 1005, 1004]);
  assert.deepEqual(db.orders.map(({ id }) => id), [1009, 1001, 1008, 1004, 1005]);
});

test('a stored numeric string and a decimal payment produce numeric totals', () => {
  const db = khataAccount('1200');
  const result = ledger.recordSettlement(db, 1, '500.25');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700.25);
  assert.equal(result.customer.balance, 731.76);
  assert.equal(result.settlement.amount, 500.25);
});

test('a previously corrupt settlement total is preserved for reconciliation', () => {
  const db = khataAccount('1200invalid');

  assert.deepEqual(ledger.recordSettlement(db, 1, 500), {
    ok: false,
    error: 'Customer settlement total is invalid',
  });
  assert.deepEqual(db, khataAccount('1200invalid'));
});
