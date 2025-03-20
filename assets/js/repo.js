(function (jQuery) {

	let ApiService = null
	let Db = null
	const VERSION = 2

	jQuery.Repo = function (db, apiService) {
		ApiService = apiService
		Db = db

		return {
			init,
			onUpdateData,
			isNeedToDataUpdate,
			getBusStopList,
			getSavedBusList,
			getBusStopByStopCode,
			getBusServiceByServiceNo,
			onInsertLiveBusServiceList,
			onUpdateSavedBusServiceNo,
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
			localStorage.removeItem('lastUpdatedTime')
			localStorage.removeItem('lastInsertedTime')
			localStorage.setItem("version", VERSION)
		}
	}

	async function onUpdateData(isForce = false) {
		if (isForce) {
			localStorage.removeItem('lastUpdatedTime')
			localStorage.removeItem('lastInsertedTime')
		}
		if(!isNeedToDataUpdate()) return

		await onLoadData(isForce)

		await onInsertData(isForce)
	}

	function isNeedToDataUpdate() {
		return needsToUpdate('lastUpdatedTime') || needsToUpdate('lastInsertedTime')
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
		return Db.getBusServiceByServiceNo(serviceNo)
	}

	async function onInsertLiveBusServiceList(list) {
		await Db.onClearLiveBusService()
		await Db.onInsertLiveBusServiceList(list)
	}

	async function onUpdateSavedBusServiceNo(newServiceNo, oldServiceNo, busStopCode) {
		const savedBusList = await getSavedBusList()
		const obj = _.find(
			savedBusList, 
			{
				bus_stop_code: busStopCode,
				bus_service_no: oldServiceNo
			}
		)
		if (obj) {
			obj.bus_service_no = newServiceNo
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
