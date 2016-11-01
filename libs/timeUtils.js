var moment = require('moment');

var Interface = {
    getDateMsDifference: getDateMsDifference
}

module.exports = Interface;

function getDateMsDifference(futureDate) {
    console.log(futureDate);
  if (typeof futureDate === 'string')
    futureDate = parseInt(futureDate);

  var future = moment(futureDate).format('x');
  var now = moment().format('x');
  var diff = future - now;
  return diff;
}
