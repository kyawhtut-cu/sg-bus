(function (jQuery) {

	let ApiService = null
	let Db = null

	jQuery.Repo = function (db, apiService) {
		ApiService = apiService
		Db = db

		// localStorage.removeItem('lastUpdatedTime')
		// localStorage.removeItem('lastInsertedTime')

		return {
			onUpdateData,
			isNeedToDataUpdate,
			getBusStopList,
			getSavedBusList,
			getBusStopByStopCode,
			onInsertLiveBusServiceList,
			getColumnCount,
			setColumnCount,
			onFetchBusArrival
		}
	}

	async function onUpdateData() {
		if(!isNeedToDataUpdate()) return

		await onLoadData()

		await onInsertData()
	}

	function isNeedToDataUpdate() {
		return needsToUpdate('lastUpdatedTime') || needsToUpdate('lastUpdatedTime')
	}

	async function getBusStopList() {
		return Db.getBusStopList()
	}

	async function getSavedBusList() {
		return Db.getSavedBusList()
	}

	async function getBusStopByStopCode(stopCode) {
		return Db.getBusStopByStopCode(stopCode)
	}

	async function onInsertLiveBusServiceList(list) {
		await Db.onClearLiveBusService()
		await Db.onInsertLiveBusServiceList(list)
	}

	function getColumnCount() {
		return localStorage.getItem('column_count')
	}

	function setColumnCount(value) {
		localStorage.setItem('column_count', value)
	}

	async function onFetchBusArrival(busServiceNo, busStopCode) {
		return ApiService.onFetchBusArrival(
			busServiceNo,
			busStopCode
		)
	}

	async function onLoadData() {
		if(!needsToUpdate('lastUpdatedTime')) return
		const [busRouteList, busStopList, busServiceList] = await Promise.all([
			ApiService.onFetchBusRouteList(),
			ApiService.onFetchBusStopList(),
			ApiService.onFetchBusServiceList()
		])

		await Db.onClearBusRouteResponse()
		await Db.onClearBusServiceResponse()
		await Db.onClearBusStopResponse()

		await Db.onInsertBusRouteResponseList(busRouteList)
		await Db.onInsertBusServiceResponseList(busServiceList)
		await Db.onInsertBusStopResponseList(busStopList)

		localStorage.setItem('lastUpdatedTime', new Date().toString())
	}

	async function onInsertData() {
		if(!needsToUpdate('lastInsertedTime')) return

		const responseBusRouteList = await Db.getResponseBusRouteList()
		const responseBusStopList = await Db.getResponseBusStopList()
		const responseBusServiceList = await Db.getResponseBusServiceList()
		
		let busServiceList = {}
		responseBusServiceList.filter ( service => {
			return service.OriginCode != '' && service.DestinationCode != ''
		}).forEach( service => {
			if(!busServiceList.hasOwnProperty(service.ServiceNo)) {
				busServiceList[service.ServiceNo] = {
					bus_service_no: service.ServiceNo,
					bus_operator: service.Operator,
					bus_category: service.Category,
					bus_direction_list: [],
					bus_way_point: [],
					bus_route_list: []
				}
			}

			let cacheBusService = busServiceList[service.ServiceNo]
			if (cacheBusService != null) {
				let routeList = responseBusRouteList.filter( route => {
					return route.ServiceNo == service.ServiceNo && route.Direction == service.Direction
				})
				cacheBusService['bus_direction_list'] = cacheBusService.bus_direction_list.concat(
					[service.Direction]
				)
				cacheBusService['bus_way_point'] = cacheBusService.bus_way_point.concat(
					[
						{
							origin_code: service.OriginCode,
							destination_code: service.DestinationCode
						}
					]
				)
				cacheBusService['bus_route_list'] = _.sortBy(cacheBusService.bus_route_list.concat(
					routeList.map(route => {
						return {
							bus_stop_code: route.BusStopCode,
							distance: route.Distance,
							direction: route.Direction
						}
					})
				), 'Direction')
				busServiceList[service.ServiceNo] = cacheBusService
			}
		})

		await Db.onClearBusStop()
		await Db.onInsertBusStopList(
			responseBusStopList.map( busStop => {
				return {
					'bus_stop_code': busStop.BusStopCode,
					'bus_stop_name': busStop.Description,
					'road_name': busStop.RoadName,
					'bus_service_no_list': responseBusRouteList.filter( route => {
						return route.BusStopCode == busStop.BusStopCode
					}).map( route => route.ServiceNo ),
					'latitude': busStop.Latitude,
					'longitude': busStop.Longitude
				}
			})
		)
		console.log("Bus Stop List inserted")

		await Db.onClearBusService()
		await Db.onInsertBusServiceList(
			Object.entries(busServiceList).map(([key, value]) => value )
		)
		console.log("Bus Service List inserted")

		localStorage.setItem('lastInsertedTime', new Date().toString())
	}

	function needsToUpdate(key) {
		const lastUpdatedTime = localStorage.getItem(key)

		if (!lastUpdatedTime) {
			return true
		}

		const lastUpdatedDate = new Date(lastUpdatedTime)

		const currentDate = new Date()

		const timeDifference = currentDate - lastUpdatedDate

		const daysDifference = timeDifference / (1000 * 3600 * 24)

		if (daysDifference > 7) {
			return true
		}

		return false
	}
}(jQuery))
