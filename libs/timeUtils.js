const moment = require('moment');

const Interface = {
  getDateMsDifference: getDateMsDifference
};

module.exports = Interface;

function getDateMsDifference(date) {
  const futureDate = (typeof date === 'string') ? parseInt(date, 10) : date;
  const future = moment(futureDate).format('x');
  const now = moment().format('x');
  return future - now;
}
