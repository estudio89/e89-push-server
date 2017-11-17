

function delayedSend(sender, message, identifiers, sendFunction) {
	var step = parseInt(process.env.SEND_STEP) || 100;
	var startSlice = 0;
	var endSlice = step;
	var delay = parseInt(process.env.SEND_DELAY) || 3000;

	var timeoutFunc = function() {
		console.log("[" + sender + "]: " + "Sending to identifiers " + startSlice + " to " + endSlice)
		try {
			sendFunction(message, identifiers.slice(startSlice, endSlice));
		} catch (err) {
			console.log("[" + sender + "]: Error when sending - " + err.message);
			var Raven = require('raven');
			Raven.captureException(err, {level: 'warning', extra: { sender: sender, identifiers: identifiers}});
		}

		startSlice = endSlice;
		endSlice += step;

		if (startSlice < identifiers.length) {
			setTimeout(timeoutFunc, delay)
		}

	};

	timeoutFunc();

}


module.exports = { 'delayedSend': delayedSend };