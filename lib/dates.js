// Date utilities for ShopLedger (Indian DD/MM/YYYY format)

function pad2(n) {
  return ('0' + n).slice(-2);
}

exports.today = function () {
  var d = new Date();
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
};

// Convert stored DD/MM/YYYY dates to the same year-first keys used by the date picker.
exports.normalizeDateKey = function (str) {
  if (!str) return '';
  var s = String(str).trim();
  var storedDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (storedDate) return storedDate[3] + '-' + pad2(storedDate[2]) + '-' + pad2(storedDate[1]);
  return s;
};

exports.getFiscalYear = function (dateStr) {
  var s = exports.normalizeDateKey(dateStr);
  var parts = s.split('-');
  if (parts.length !== 3) return 'FY21-22';
  var month = parseInt(parts[1], 10);
  var year = parseInt(parts[0], 10);
  if (month >= 4) {
    return 'FY' + String(year).slice(-2) + '-' + String(year + 1).slice(-2);
  }
  return 'FY' + String(year - 1).slice(-2) + '-' + String(year).slice(-2);
};
