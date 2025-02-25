(function (jQuery) {

	let Api = null

	jQuery.ApiService = function () {
		Api = $.Api()

		return {
			onFetchBusArrival,
			onFetchBusRouteList,
			onFetchBusStopList,
			onFetchBusServiceList
		}
	}

	const onFetchBusArrival = async (busServiceNo, busStopCode) => {
		try {
			const response = await Api.get(`BusArrivalv2?ServiceNo=${busServiceNo}&BusStopCode=${busStopCode}`)

			return {
				bus_service_no: busServiceNo,
				bus_stop_code: busStopCode,
				bus_service_list: response.Services
			}
		} catch (error) {
			return null
		}
	}

	const onFetchBusRouteList = async (index = 0, oldList = []) => {
		try {
			const response = await Api.get(`BusRoutes?$skip=${index * 500}`)
			
			if (!_.isEmpty(response.value)) {
				return await onFetchBusRouteList(index + 1, oldList.concat(response.value))
			} else {
				return oldList
			}
		} catch (error) {
			console.error('Error:', error)
			return oldList
		}
	}

	const onFetchBusStopList = async (index = 0, oldList = []) => {
		try {
			const response = await Api.get(`BusStops?$skip=${index * 2000}`)
			
			if (!_.isEmpty(response.value)) {
				return await onFetchBusStopList(index + 1, oldList.concat(response.value))
			} else {
				return oldList
			}
		} catch (error) {
			console.error('Error:', error)
			return oldList
		}
	}

	const onFetchBusServiceList = async (index = 0, oldList = []) => {
		try {
			const response = await Api.get(`BusServices?$skip=${index * 500}`)
			
			if (!_.isEmpty(response.value)) {
				return await onFetchBusServiceList(index + 1, oldList.concat(response.value))
			} else {
				return oldList
			}
		} catch (error) {
			console.error('Error:', error)
			return oldList
		}
	}
}(jQuery))
