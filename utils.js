

function delayedSend(sender, message, identifiers, sendFunction) {
	var step = process.env.SEND_STEP || 1;
	var startSlice = 0;
	var endSlice = step;
	var delay = process.env.SEND_DELAY || 0;

	var timeoutFunc = function() {
		console.log("[" + sender + "]: " + "Sending to identifiers " + startSlice + " to " + endSlice)
		sendFunction(message, identifiers.slice(startSlice, endSlice));
		startSlice = endSlice;
		endSlice += step;

		if (startSlice < identifiers.length) {
			setTimeout(timeoutFunc, delay)
		}

	};

	timeoutFunc();

}


module.exports = { 'delayedSend': delayedSend };