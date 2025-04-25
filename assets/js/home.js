(function (jQuery) {
	"use strict"

	let Repo = null
	let BusDetail = null
	let timeoutId = null
	let nextBusList = []

	let gridDiv = null

	jQuery.Home = function (repo) {
		Repo = repo
		return {
			init,
			showLoading,
			showHome
		}
	}

	async function init(isNeedToLoad) {
		if (isNeedToLoad) {
			showLoading()
			await Repo.onUpdateData()
		}

		showHome()
	}

	function showLoading() {
		$('#content').empty()

		$('<div>', {
			id: 'update',
			class: 'vh-100'
		}).appendTo($('#content'))

		bodymovin.loadAnimation({
			container: document.getElementById('update'),
			renderer: 'svg',
			loop: true,
			autoplay: true,
			path: `https://lottie.host/c4c9d843-8160-4c8f-8115-4d77857a3d5c/Y57nO5st7O.json`
		})
	}

	async function showHome() {
		$('#content').empty()

		gridDiv = $('<div>', {
			class: 'row h-100',
			style: 'padding-bottom: .5rem;'
		})

		gridDiv.appendTo(
			$('<div>', {
				id: 'home',
				class: 'container-fluid vh-100 p-0'
			}).appendTo($('#content'))
		)

		const fab = $('<div>', {
			id: 'btnFab',
			class: 'fixed-action-btn',
		})
		fab.appendTo($('#content'))

		$('<i>', {
			class: 'material-icons large'
		}).text('menu').appendTo(
			$('<a>', {
				class: 'btn-floating btn-large red waves-effect'
			}).appendTo(fab)
		)

		const subFab = $('<ul>')
		subFab.appendTo(fab)

		const updateDataBtn = $('<li>')
		updateDataBtn.appendTo(subFab)

		$('<i>', {
			class: 'material-icons'
		}).text('update').appendTo(
			$('<a>', {
				class: 'btn-floating red waves-effect'
			}).appendTo(updateDataBtn)
		)

		updateDataBtn.on('click', function() {
			clearTimeout(timeoutId)
			timeoutId = null
			init(true)
		})

		const settingButton = $('<li>')
		settingButton.appendTo(subFab)

		$('<i>', {
			class: 'material-icons'
		}).text('settings').appendTo(
			$('<a>', {
				class: 'btn-floating red waves-effect'
			}).appendTo(settingButton)
		)

		settingButton.on('click', async function() {
			const result = await $.Setting(Repo).open()
			if (result == 1) {
				onReloadLiveService()
			} else if (result == -1) {
				showLoading()
				await Repo.onUpdateData(true)
				showHome()
			}
		})

		fab.floatingActionButton()

		if (Repo.isUpdateAvailable()) {
			const updateDiv = $('<div>', {
				class: 'w-100 position-fixed top-0 z-depth-5 red z-1 d-flex align-items-center justify-content-center text-white ps-3 fs-4 fw-bold',
				style: 'height: 56px;'
			}).hide().appendTo($('#content'))

			updateDiv.text('Update Available')

			const btnDismiss = $('<i>', {
				class: 'h-100 text-white btn-flat waves-effect material-icons d-flex align-items-center position-absolute end-0',
				style: 'right: 0;'
			}).text('close')
			btnDismiss.appendTo(updateDiv)

			btnDismiss.click(() => {
				updateDiv.slideUp(500, () => {
					updateDiv.remove()
				})
			})

			updateDiv.slideDown(500, () => {
			})
		}

		await onReloadLiveService()
	}

	async function onReloadLiveService() {
		const savedBusList = await Promise.all(
			(await Repo.getSavedBusList()).map( async (savedBus, index) => {
				const busService = await Repo.getBusServiceByServiceNo(savedBus.bus_service_no)
				let operation = _.find(busService.bus_route_list, { bus_stop_code : savedBus.bus_stop_code })
				if (operation) {
					operation = [
						{
							day: `Sat`,
							first: operation.sat_first_bus,
							last: operation.sat_last_bus
						},
						{
							day: `WD`,
							first: operation.wd_first_bus,
							last: operation.wd_last_bus
						},
						{
							day: `Sun`,
							first: operation.sun_first_bus,
							last: operation.sun_last_bus
						}
					]
				} else {
					operation = []
				}

				const busStop = await Repo.getBusStopByStopCode(savedBus.bus_stop_code)

				return {
					index: index,
					bus_service_no: savedBus.bus_service_no,
					bus_stop_code: savedBus.bus_stop_code,
					bus_stop_name: busStop?.bus_stop_name ?? '',
					bus_stop_service_list: busStop?.bus_service_no_list ?? [],
					bus_operation: operation,
					bus_route_list: busService.bus_route_list
				}
			})
		)

		const liveBusGrid = _.chunk(
			savedBusList, 
			12 / Math.floor(12 / Repo.getColumnCount())
		)
		gridDiv.empty()

		liveBusGrid.forEach( row => {
			const colClass = Math.floor(12 / row.length)
			row.forEach( col => {
				const colDiv = $(`<div>`, {
					class: 'column position-relative',
					style: 'padding: 0 .5rem;'
				})
				colDiv.appendTo(gridDiv)
				bindLiveBus(colDiv, col, colClass)
			})
		})

		onListenLiveBus(savedBusList, liveBusGrid.length)
	}

	function bindLiveBus(colDiv, savedBus, largeColumnCount) {
		if (largeColumnCount == 12) {
			colDiv.addClass('col-12')
		} else {
			colDiv.addClass(`col-lg-${largeColumnCount} col-md-12 col-sm-12`)
		}

		const headerDiv = $('<div>', {
			class: 'w-100 bg-light d-flex header justify-content-space-between align-items-center',
			style: 'margin-top: .5rem;'
		})
		headerDiv.appendTo(colDiv)

		const divBusServiceNoDropdown = $('<div>', {
			class: 'busServiceNo h-100',
			style: 'flex-shrink: 0'
		})
		divBusServiceNoDropdown.appendTo(headerDiv)

		const btnBusServiceNoDropdown = $('<select>')
		btnBusServiceNoDropdown.appendTo(divBusServiceNoDropdown)

		btnBusServiceNoDropdown.on('select2:select', async function (e) {
			const data = e.params.data
			if (savedBus.bus_service_no == data.text) return

			await Repo.onUpdateSavedBusServiceNo(
				{
					bus_stop_code: savedBus.bus_stop_code,
					bus_service_no: savedBus.bus_service_no
				},
				{
					bus_stop_code: savedBus.bus_stop_code,
					bus_service_no: data.text
				}
			)

			onReloadLiveService()
		})

		btnBusServiceNoDropdown.select2({
			placeholder: 'Select Bus Service No',
			search: 'Search Bus Service No',
			data: savedBus.bus_stop_service_list.map(service => {
				return {
					id: service,
					text: service,
					selected: service == savedBus.bus_service_no
				}
			}),
			dropdownAutoWidth: true,
			templateSelection: (selection) => {
				return selection.text
			}
		})

		$('.header .busServiceNo .select2-selection__rendered').addClass('white-text')

		const divBusStopNoDropdown = $('<div>', {
			class: 'busStopName h-100',
			style: 'flex: 1;'
		})
		divBusStopNoDropdown.appendTo(headerDiv)

		const btnBusStopNoDropdown = $('<select>')
		btnBusStopNoDropdown.appendTo(divBusStopNoDropdown)

		btnBusStopNoDropdown.on('select2:select', async function (e) {
			const data = e.params.data
			if (savedBus.bus_stop_code == data.bus_stop_code) return

			await Repo.onUpdateSavedBusServiceNo(
				{
					bus_stop_code: savedBus.bus_stop_code,
					bus_service_no: savedBus.bus_service_no
				},
				{
					bus_stop_code: data.bus_stop_code,
					bus_service_no: savedBus.bus_service_no
				}
			)

			onReloadLiveService()
		})

		btnBusStopNoDropdown.select2({
			placeholder: 'Select Bus Stop',
			search: 'Search Bus Stop',
			data: _.map(
				_.groupBy(savedBus.bus_route_list, 'direction'),
				(routeList, direction) => {
					return {
						text: `Direction - ${direction}`,
						children: routeList.map((route, index) => {
							return {
								id: `${route.bus_stop_code}-${direction}`,
								text: route.route_bus_stop.bus_stop_name,
								disabled: index + 1 >= routeList.length,
								selected: route.bus_stop_code == savedBus.bus_stop_code,
								bus_stop_code: route.bus_stop_code
							}
						})
					}
				}
			),
			dropdownAutoWidth: true,
			templateSelection: (selection) => {
				return selection.text
			}
		})

		$('.header .busStopName .select2-selection__rendered').addClass('red-text')

		$('.header .select2-container').addClass('drop-down')

		$('.header .select2-selection__rendered').addClass('fs-1 fw-bold')

		const btnBusTiming = $('<i>', {
			class: 'material-icons align-self-center btn-flat waves-effect d-flex align-items-center',
			style: 'height: 56px; flex-shrink: 0;'
		}).text('info_outline')
		btnBusTiming.appendTo(headerDiv)
		setPopover(
			btnBusTiming,
			`${savedBus.bus_service_no} - ${savedBus.bus_stop_name} (${savedBus.bus_stop_code})`,
			savedBus.bus_operation
		)

		const btnDetail = $('<i>', {
			class: 'material-icons align-self-center btn-flat waves-effect d-flex align-items-center',
			style: 'height: 56px; flex-shrink: 0;'
		}).text('directions')
		btnDetail.appendTo(headerDiv)
		btnDetail.on('click', async function() {
			BusDetail = $.BusDetail(Repo)
			await BusDetail.open(
				savedBus.bus_service_no,
				savedBus.bus_stop_code,
				nextBusList[`${savedBus.bus_service_no}-${savedBus.bus_stop_code}`]
			)
			BusDetail = null
		})

		const liveDiv = $('<div>', {
			id: `busLive${savedBus.index}${savedBus.bus_service_no}${savedBus.bus_stop_code}`,
			class: `d-flex justify-content-center align-items-center`,
			style: 'height: calc(100% - 56px - .5rem);',
		})
		liveDiv.appendTo(colDiv)

		getCardLoading().appendTo(liveDiv)
	}

	function getCardLoading() {
		const preloader = $('<div>', {
			class: 'preloader-wrapper medium active'
		})


		const spinnerClassList = ['spinner-blue', 'spinner-red', 'spinner-yellow', 'spinner-green']
		const circleClassList = ['circle-clipper left', 'gap-patch', 'circle-clipper right']
		spinnerClassList.forEach( spinnerClass => {
			const spinner = $('<div>', {
				class: `spinner-layer ${spinnerClass}`
			})
			spinner.appendTo(preloader)

			circleClassList.forEach( circleClass => {
				$('<div>', {
					class: 'circle'
				}).appendTo(
					$('<div>', {
						class: circleClass
					}).appendTo(spinner)
				)
			})
		})

		return preloader
	}

	async function onListenLiveBus(savedBusList, row) {
		if(timeoutId) clearTimeout(timeoutId)

		const busArrivalList = await Repo.onFetchBusArrival(savedBusList)
		nextBusList = []

		busArrivalList.forEach( service => {
			const key = `${service.bus_service_no}-${service.bus_stop_code}`
			nextBusList[key] = _.find(
				service.bus_service_list,
				{
					ServiceNo: service.bus_service_no
				}
			)

			const busServiceList = _.find(
				service.bus_service_list,
				{
					ServiceNo: service.bus_service_no
				}
			)

			if (BusDetail?.getKey() == key) {
				BusDetail?.setLiveBusTiming(busServiceList)
			}

			const busLiveDiv = $(`#busLive${service.index}${service.bus_service_no}${service.bus_stop_code}`)
			busLiveDiv.empty()

			const rowDiv = $('<div>', {
				class: 'row w-100 h-100 m-0 g-2'
			})
			rowDiv.appendTo(busLiveDiv)

			getBusArrival(
				rowDiv,
				busServiceList,
				row
			)
		})

		timeoutId = setTimeout(() => {
			onListenLiveBus(savedBusList, row)
		}, 1000 * 20)
	}

	function getBusArrival(row, busServiceList, rowCount) {
		if (!busServiceList || busServiceList.NextBus.EstimatedArrival == '') {
			$('<div>', {
				class: `w-100 h-100 d-flex justify-content-center align-items-center grey-text text-lighten-1 fw-bold`,
				style: `font-size: 32px;"`
			}).text(`Not in operation.`).appendTo(
				$('<div>', {
					class: 'col-12'
				}).appendTo(row)
			)

			return
		}
		const isHasBusTwo = busServiceList.NextBus2.EstimatedArrival != ''
		const isHasBusThree = busServiceList.NextBus3.EstimatedArrival != ''
		
		// Col 1
		getNextBusCard(
			!isHasBusTwo, 
			busServiceList.NextBus, 
			rowCount
		).appendTo(
			$('<div>', {
				class: `col-${isHasBusTwo ? 6 : 12} ${isHasBusTwo ? `` : `d-flex justify-content-center`}`
			}).appendTo(row)
		)

		if (isHasBusTwo) {
			// Col 2
			getNextBusCard(
				false,
				busServiceList.NextBus2,
				rowCount
			).appendTo(
				$('<div>', {
					class: 'col-6'
				}).appendTo(row)
			)
		}

		if (isHasBusThree) {
			// Col 3
			getNextBusCard(
				true,
				busServiceList.NextBus3,
				rowCount
			).appendTo(
				$('<div>', {
					class: 'col-12 d-flex justify-content-center'
				}).appendTo(row)
			)
		}
	}

	function getNextBusCard(isOnlyOne, nextBus, rowCount) {
		const min = $.convertArrivalMin(nextBus.EstimatedArrival)
		const div = $('<div>', {
			class: `w-100 h-100 black ${nextBus.Load == 'SEA' ? `green-text text-accent-4` : nextBus.Load == 'SDA' ? `amber-text` : `red-text`} fw-bold d-flex justify-content-center align-items-center position-relative`,
			style: `font-size: calc(100vh / ${rowCount * (min == 'Left' || min == 'Arr' ? 4.5 : 3)}); border-radius: 8px; line-height: 0;`
		})
		div.text(min)

		$('<span>', {
			class: 'position-absolute',
			style: `bottom: 1.3rem; left: 1rem; font-size: calc(100vh / 50);`
		}).text(
			nextBus.Type == 'BD' ? 'Bendy' : nextBus.Type == 'DD' ? 'Double' : 'Single'
		).appendTo(div)

		if (nextBus.Feature == "WAB") {
			$('<i>', {
				class: 'material-icons position-absolute',
				style: 'bottom: .5rem; right: 1rem;'
			}).text('accessible').appendTo(div)
		}

		return div
	}

	function setPopover(tag, title, operations) {
		tag.webuiPopover({
			title: title,
			content: function() {
				let html = null
				if (operations.length == 0) {
					html = $('<div>', {
						class: 'd-flex justify-content-center align-items-center grey-text text-lighten-1 fw-bold',
						style: 'height: 120px; font-size: 24px;'
					})
					html.text(`Not in operation.`)
				} else {
					const table = $('<table>', {
						class: 'striped centered'
					})
					html = table
					
					const thead = $('<thead>', {
					})
					thead.appendTo(table)

					let tr = $('<tr>')
					tr.appendTo(thead)

					$('<th>').appendTo(tr)
					$('<th>').text('First').appendTo(tr)
					$('<th>').text('Last').appendTo(tr)

					const tbody = $('<tbody>')
					tbody.appendTo(table)

					operations.forEach( operation => {
						tr = $('<tr>')
						tr.appendTo(tbody)

						$('<td>', {
							class: 'fw-bold'
						}).text(operation.day).appendTo(tr)
						$('<td>', {
							class: 'fw-bold'
						}).text($.convertStringToTime(operation.first)).appendTo(tr)
						$('<td>', {
							class: 'fw-bold'
						}).text($.convertStringToTime(operation.last)).appendTo(tr)
					})
				}
				
				return html[0].outerHTML
			},
			trigger: `hover`,
			animation: 'pop',
			placement: 'vertical',
			padding: false,
			onShow: (e) => {
			},
			onHide: (e) => {
				tag.webuiPopover('destroy')
				setPopover(tag, title, operations)
			}
		})
	}

	function onBusChange() {
		console.log(560)
	}
}(jQuery))
