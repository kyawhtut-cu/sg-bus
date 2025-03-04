(function (jQuery) {
	"use strict"

	jQuery.convertArrivalMin = (value) => {
		if (!value || value === "") {
			return "No More Next Bus"
		}

		const arrival = new Date(value)

		const now = new Date()

		const sec = Math.floor((arrival - now) / 1000)
		let min = Math.floor(sec / 60)

		if (min == -2) {
			return "Left"
		}

		if (min <= 1 && min >= -1) {
			return "Arr"
		}

		return min.toString()
	}
}(jQuery))
