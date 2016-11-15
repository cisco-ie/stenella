var moment = require('moment');

var Interface = {
  getDateMsDifference: getDateMsDifference
};

module.exports = Interface;

function getDateMsDifference(date) {
  var futureDate = date;
  if (typeof futureDate === 'string') {
    futureDate = parseInt(futureDate, 10);
  }
  var future = moment(futureDate).format('x');
  var now = moment().format('x');
  var diff = future - now;
  return diff;
}
