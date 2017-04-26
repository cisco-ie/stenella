'use strict';
const moment = require('moment');

const Interface = {
  getDateMsDifference: getDateMsDifference
};

module.exports = Interface;

function getDateMsDifference(date) {
  let futureDate = date;
  if (typeof futureDate === 'string') {
    futureDate = parseInt(futureDate, 10);
  }
  const future = moment(futureDate).format('x');
  const now = moment().format('x');
  const diff = future - now;
  return diff;
}
