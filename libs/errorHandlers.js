/**
 * Error Handeling Functions
 */

var Interface = {
  logError: logError
};

module.exports = Interface;

/**
 * Logs the passed in Error
 * @param  {Object} error Instance of Error Object
 * @return {void}
 */
function logError (error) {
  console.log(error);
}
