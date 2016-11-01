var moment = require('moment');

var Interface = {
    getDateMsDifference: getDateMsDifference
}

module.exports = Interface;

function getDateMsDifference(futureDate) {
  var future = moment(futureDate).format('x');
  var now = moment().format('x');
  var diff = Math.abs(future - now);
  return diff;
}
