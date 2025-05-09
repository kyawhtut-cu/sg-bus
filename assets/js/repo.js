(function (jQuery) {

	let ApiService = null
	let Db = null
	const VERSION = 2
	const LAST_INSERTED_TIME = 'lastInsertedTime'
	const LAST_UPDATED_TIME = 'lastUpdatedTime'

	jQuery.Repo = function (db, apiService) {
		ApiService = apiService
		Db = db

		return {
			init,
			onUpdateData,
			isNeedToLoadData,
			isUpdateAvailable,
			getBusStopList,
			getSavedBusList,
			getBusStopByStopCode,
			getBusServiceByServiceNo,
			onInsertLiveBusServiceList,
			onUpdateSavedBusServiceNo,
			onDismissUpdate,
			getColumnCount,
			setColumnCount,
			onFetchBusArrival
		}
	}

	async function init() {
		const currentVersion = localStorage.getItem("version")
		if (VERSION != currentVersion) {
			await Db.onDropDb($.SG_BUS_DB)
			await Db.onDropDb($.SG_BUS_RESPONSE_DB)
			localStorage.removeItem(LAST_UPDATED_TIME)
			localStorage.removeItem(LAST_INSERTED_TIME)
			localStorage.setItem("version", VERSION)
		}
	}

	async function onUpdateData() {
		localStorage.removeItem(LAST_UPDATED_TIME)

		await onLoadData()

		localStorage.removeItem(LAST_INSERTED_TIME)

		await onInsertData()
	}

	function isNeedToLoadData() {
		return needsToUpdate(LAST_UPDATED_TIME) == null || needsToUpdate(LAST_INSERTED_TIME) == null
	}

	function isUpdateAvailable() {
		return needsToUpdate(LAST_UPDATED_TIME) == true || needsToUpdate(LAST_INSERTED_TIME) == true
	}

	function onDismissUpdate() {
		localStorage.setItem(LAST_UPDATED_TIME, new Date().toString())
		localStorage.setItem(LAST_INSERTED_TIME, new Date().toString())
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

	async function getBusServiceByServiceNo(serviceNo) {
		let busService = await Db.getBusServiceByServiceNo(serviceNo)

		let directionList = busService.bus_direction_list
		let busServiceRouteList = busService.bus_route_list
		const busLoopStopCodeIndex = _.findIndex(
			busServiceRouteList,
			{
				bus_stop_code : busService.bus_loop_stop_code
			}
		)
		if (directionList.length == 1 && busLoopStopCodeIndex >= 0) {
			directionList = [1, 2]
			busServiceRouteList = []
			busService.bus_route_list.forEach( (route, index) => {
				let newRoute = route
				if (index >= busLoopStopCodeIndex) {
					if (index == busLoopStopCodeIndex) {
						busServiceRouteList.push($.extend({}, newRoute))
					}
					newRoute['direction'] = 2
				}
				busServiceRouteList.push(newRoute)
			})
		}

		busServiceRouteList = await Promise.all(
			_.map(
				busServiceRouteList.slice(),
				async (busRoute) => {
					busRoute['route_bus_stop'] = await getBusStopByStopCode(busRoute.bus_stop_code)
					return busRoute
				}
			)
		)

		busService.bus_route_list = busServiceRouteList

		return busService
	}

	async function onInsertLiveBusServiceList(list) {
		await Db.onClearLiveBusService()
		await Db.onInsertLiveBusServiceList(list)
	}

	async function onUpdateSavedBusServiceNo(oldSavedBus, newSavedBus) {
		const savedBusList = await getSavedBusList()
		const obj = _.find(
			savedBusList,
			oldSavedBus,
		)
		if (obj) {
			obj.bus_service_no = newSavedBus.bus_service_no
			obj.bus_stop_code = newSavedBus.bus_stop_code
		}
		await onInsertLiveBusServiceList(savedBusList)
	}

	function getColumnCount() {
		return localStorage.getItem('column_count') ?? 1
	}

	function setColumnCount(value) {
		localStorage.setItem('column_count', value)
	}

	async function onFetchBusArrival(savedBusList) {
		const serviceList = await Promise.all(
			_.uniqBy(savedBusList, 'bus_stop_code').map( async savedBus => {
				const busServiceList = await ApiService.onFetchBusArrival(
					savedBus.bus_stop_code,
					null
				)

				return {
					bus_stop_code: savedBus.bus_stop_code,
					bus_service_list: busServiceList
				}
			})
		)

		return _.compact(
			savedBusList.map( savedBus => {
				const busServiceList = _.find(
					serviceList, 
					{
						bus_stop_code : savedBus.bus_stop_code
					}
				)?.bus_service_list
				
				if (busServiceList == null) return null
				
				return {
					index: savedBus.index,
					bus_service_no: savedBus.bus_service_no,
					bus_stop_code: savedBus.bus_stop_code,
					bus_service_list: busServiceList
				}
			})
		)
	}

	async function onLoadData() {
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

		localStorage.setItem(LAST_UPDATED_TIME, new Date().toString())
	}

	async function onInsertData() {

		const responseBusRouteList = await Db.getResponseBusRouteList()
		const responseBusStopList = await Db.getResponseBusStopList()
		const responseBusServiceList = await Db.getResponseBusServiceList()
		
		let busServiceList = {}
		responseBusServiceList.filter ( service => {
			return service.OriginCode != '' && service.DestinationCode != ''
		}).forEach( service => {
			if(!busServiceList.hasOwnProperty(service.ServiceNo)) {
				const busLoopStopeCode = _.find(responseBusStopList, { RoadName: service.LoopDesc })?.BusStopCode ?? ''
				busServiceList[service.ServiceNo] = {
					bus_service_no: service.ServiceNo,
					bus_operator: service.Operator,
					bus_category: service.Category,
					bus_direction_list: [],
					bus_way_point: [],
					bus_route_list: [],
					bus_loop_stop_code: busLoopStopeCode
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
							direction: route.Direction,
							sat_first_bus: route.SAT_FirstBus,
							sat_last_bus: route.SAT_LastBus,
							sun_first_bus: route.SUN_FirstBus,
							sun_last_bus: route.SUN_LastBus,
							wd_first_bus: route.WD_FirstBus,
							wd_last_bus: route.WD_LastBus,
							sequence: route.StopSequence
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
					'bus_service_no_list': _.uniq(
						responseBusRouteList.filter( route => {
							return route.BusStopCode == busStop.BusStopCode
						}).map( route => route.ServiceNo )
					),
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

		localStorage.setItem(LAST_INSERTED_TIME, new Date().toString())
	}

	function needsToUpdate(key) {
		const lastUpdatedTime = localStorage.getItem(key)

		if (!lastUpdatedTime) {
			return null
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
