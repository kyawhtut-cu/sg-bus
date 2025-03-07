(function (jQuery) {
	"use strict"

	jQuery.SG_BUS_DB = "sg_bus"
	jQuery.SG_BUS_RESPONSE_DB = "sg_bus_response"

	const db = new Dexie(jQuery.SG_BUS_DB)
	const responseDb = new Dexie(jQuery.SG_BUS_RESPONSE_DB)
	const saveDb = new Dexie('save_bus')

	jQuery.Db = function () {
		return new Db()
	}

	function Db() {
		return {
			initData,
			getSavedBusList,
			getBusStopList,
			getResponseBusStopList,
			getResponseBusServiceList,
			getResponseBusRouteList,
			getBusStopByStopCode,
			getBusServiceByServiceNo,
			onInsertLiveBusServiceList,
			onInsertBusStopList,
			onInsertBusServiceList,
			onInsertBusRouteResponseList,
			onInsertBusServiceResponseList,
			onInsertBusStopResponseList,
			onClearBusRouteResponse,
			onClearBusServiceResponse,
			onClearBusStopResponse,
			onClearLiveBusService,
			onClearBusStop,
			onClearBusService,
			onDropDb
		}
	}

	const initData = async () => {
		responseDb.version(1).stores(
			{
				bus_route_response: '++id, BusStopCode, RoadName, Description, Latitude, Longitude',
				bus_service_response: '++id, ServiceNo, Operator, Direction, Category, OriginCode, DestinationCode, AM_Peak_Freq, AM_Offpeak_Freq, PM_Peak_Freq, PM_Offpeak_Freq, LoopDesc',
				bus_stop_response: '++id, ServiceNo, Operator, Direction, StopSequence, BusStopCode, Distance, WD_FirstBus, WD_LastBus, SAT_FirstBus, SAT_LastBus, SUN_FirstBus, SUN_LastBus'
			}
		)

		db.version(1).stores(
			{
				bus_stop_table: 'bus_stop_code, bus_stop_name, road_name, bus_service_no_list, latitude, longitude',
				bus_service_table: 'bus_service_no, bus_operator, bus_category, bus_route_list, bus_direction_list, bus_way_point, bus_loop_stop_code'
			}
		)

		saveDb.version(1).stores(
			{
				live_bus_service: '++id, bus_stop_code, bus_service_no'
			}
		)

		await db.open()
		await responseDb.open()
		await saveDb.open()
	}

	const getSavedBusList = async () => {
		return saveDb.live_bus_service.toArray()
	}

	const getBusStopList = async () => {
		return db.bus_stop_table.toArray()
	}

	const getResponseBusStopList = async () => {
		return responseDb.bus_stop_response.toArray()
	}

	const getResponseBusServiceList = async () => {
		return responseDb.bus_service_response.toArray()
	}

	const getResponseBusRouteList = async () => {
		return responseDb.bus_route_response.toArray()
	}

	const getBusStopByStopCode = async (stopCode) => {
		return _.first(
			await db.bus_stop_table.where('bus_stop_code').equals(stopCode).toArray()
		)
	}

	const getBusServiceByServiceNo = async (serviceNo) => {
		return _.first(
			await db.bus_service_table.where('bus_service_no').equals(serviceNo).toArray()
		)
	}

	const onInsertLiveBusServiceList = async (list) => {
		await saveDb.live_bus_service.bulkAdd(list)
	}

	const onInsertBusRouteResponseList = async (list) => {
		await responseDb.bus_route_response.bulkAdd(list)
	}

	const onInsertBusServiceResponseList = async (list) => {
		await responseDb.bus_service_response.bulkAdd(list)
	}

	const onInsertBusStopResponseList = async (list) => {
		await responseDb.bus_stop_response.bulkAdd(list)
	}

	const onInsertBusStopList = async (list) => {
		await db.bus_stop_table.bulkAdd(list)
	}

	const onInsertBusServiceList = async (list) => {
		await db.bus_service_table.bulkAdd(list)
	}

	const onClearBusRouteResponse = async () => {
		responseDb.bus_route_response.clear()
	}
	const onClearBusServiceResponse = async () => {
		responseDb.bus_service_response.clear()
	}

	const onClearBusStopResponse = async () => {
		responseDb.bus_stop_response.clear()
	}

	const onClearLiveBusService = async () => {
		saveDb.live_bus_service.clear()
	}

	const onClearBusStop = async () => {
		db.bus_stop_table.clear()
	}

	const onClearBusService = async () => {
		db.bus_service_table.clear()
	}

	const onDropDb = async (dbName) => {
		return Dexie.delete(dbName).then(() => {
			console.log('Database deleted successfully!')
		}).catch((error) => {
			console.error('Error deleting database:', error)
		})
	}
}(jQuery))
