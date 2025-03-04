(function (jQuery) {
	"use strict"

	let ajax = {}
	let baseURL = ``
	let accountKey = ``

	jQuery.Api = function () {
		return new Api()
	}

	function Api() {
		baseURL = `http://datamall2.mytransport.sg/ltaodataservice/`
		accountKey = `Lc5r7QyZRJeKhsjxvRKnbw==`
	}

	Api.prototype.get = async function (path) {

		// if (ajax != null && ajax[path] != null) {
		// 	ajax[path].abort()
		// }

		return await fetchData(`get`, path)
	}

	Api.prototype.post = async function ({path, method = `post`, jsonData}) {

		// if (ajax != null && ajax[path] != null) {
		// 	ajax[path].abort()
		// }

		return await fetchData(method, path, jsonData)
	}

	function getProxyUrl(url) {
		return `https://kyawhtut.com/proxy.php?url=${encodeURIComponent(url)}`
	}

	function parseError(jqXHR, exception) {
		let msg = ``
		let status = jqXHR.status

		if (status === `(failed)net:ERR_INTERNET_DISCONNECTED`) {
			msg = `Uncaught Error.\n${jqXHR.responseText}`
		} else if (status === 0) {
			msg = `Not connect.\nVerify Network.`
		} else if (status === 413) {
			msg = `Image size is too large`
		} else if (status === 404) {
			msg = `Requested page not found [404]`
		} else if (status === 405) {
			msg = `Image size is too large`
		} else if (status === 500) {
			msg = `Internal Server Error [500]`
		} else if (exception === `parsererror`) {
			msg = `Requested JSON parse failed.`
		} else if (exception === `timeout`) {
			msg = `Time out error.`
		} else if (exception === `abort`) {
			msg = `Ajax request aborted.`
		} else {
			msg = `Uncaught Error.\n${jqXHR.responseText}`
		}

		return msg
	}

	function fetchData(method, path, payload = null) {
		return new Promise((resolve, reject) => {
			let option = {
				url: getProxyUrl(baseURL + path),
				headers: {
					'AccountKey': accountKey
				},
				type: method,
				success: function (data) {
					_.remove(ajax, ajax[path])
					resolve(data)
				},
				error: function (error) {
					_.remove(ajax, ajax[path])
					reject(error)
				}
			}

			if (payload != null) {
				option["data"] = JSON.stringify(payload)
				option["contentType"] = `application/json; charset=utf-8`
			}

			//ajax[path] = 
			$.ajax(option)
		})
	}
}(jQuery))
