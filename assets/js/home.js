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
			showLoading,
			showHome
		}
	}

	function showLoading() {
		if ($('#home')) $('#home').remove()
		$('<div>', {
			id: 'update',
			class: 'vh-100'
		}).appendTo($('body'))

		bodymovin.loadAnimation({
			container: document.getElementById('update'),
			renderer: 'svg',
			loop: true,
			autoplay: true,
			path: `https://lottie.host/c4c9d843-8160-4c8f-8115-4d77857a3d5c/Y57nO5st7O.json`
		})
	}

	async function showHome() {
		if ($('#update')) $('#update').remove()
		gridDiv = $('<div>', {
			class: 'row h-100',
			style: 'padding-bottom: .5rem;'
		})

		gridDiv.appendTo(
			$('<div>', {
				id: 'home',
				class: 'container-fluid vh-100 p-0'
			}).appendTo($('body'))
		)

		const fab = $('<button>', {
			id: 'btnSetting',
			class: 'btn-floating btn-large waves-effect waves-light deep-orange position-fixed',
			style: 'bottom: 16px; right: 16px;'
		})
		$('<i>', {
			class: 'material-icons'
		}).text('settings').appendTo(fab)
		fab.appendTo($('body'))

		fab.on('click', async function() {
			const result = await $.Setting(Repo).open()
			if (result == 1) {
				onReloadLiveService()
			} else if (result == -1) {
				showLoading()
				await Repo.onUpdateData(true)
				showHome()
			}
		})

		await onReloadLiveService()
	}

	async function onReloadLiveService() {
		const savedBusList = await Promise.all(
			(await Repo.getSavedBusList()).map( async (savedBus) => {
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
				return {
					bus_service_no: savedBus.bus_service_no,
					bus_stop_code: savedBus.bus_stop_code,
					bus_stop_name: (await Repo.getBusStopByStopCode(savedBus.bus_stop_code))?.bus_stop_name ?? '',
					bus_operation: operation
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
					class: 'column',
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
			class: 'w-100 bg-light d-flex header',
			style: 'margin-top: .5rem;'
		})
		headerDiv.appendTo(colDiv)
		setPopover(
			headerDiv,
			`${savedBus.bus_service_no} - ${savedBus.bus_stop_name} (${savedBus.bus_stop_code})`,
			savedBus.bus_operation
		)

		const busServiceNo = $('<div>', {
			class: 'h-100 text-white red d-flex justify-content-center align-items-center fw-bold busServiceNo'
		}).text(savedBus.bus_service_no)
		busServiceNo.appendTo(headerDiv)
		
		$('<p>', {
			class: 'w-100 m-0'
		}).text(savedBus.bus_stop_name).appendTo(
			$('<div>', {
				class: 'h-100 red-text align-items-center fw-bold busStopName flex-grow-1'
			}).appendTo(headerDiv)
		)

		const btnDetail = $('<i>', {
			class: 'material-icons align-self-center btn-flat waves-effect d-flex align-items-center'
		}).text('info_outline')
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
			id: `busLive${savedBus.bus_service_no}${savedBus.bus_stop_code}`,
			class: `d-flex justify-content-center align-items-center`,
			style: 'height: calc(100% - 56px - .5rem);',
		})
		liveDiv.appendTo(colDiv)

		liveDiv.append(getCardLoading())
	}

	function getCardLoading() {
		return `
			<div class="preloader-wrapper medium active">
				<div class="spinner-layer spinner-blue">
					<div class="circle-clipper left">
						<div class="circle"></div>
					</div>
					<div class="gap-patch">
						<div class="circle"></div>
					</div>
					<div class="circle-clipper right">
						<div class="circle"></div>
					</div>
				</div>

				<div class="spinner-layer spinner-red">
					<div class="circle-clipper left">
						<div class="circle"></div>
					</div>
					<div class="gap-patch">
						<div class="circle"></div>
					</div>
					<div class="circle-clipper right">
						<div class="circle"></div>
					</div>
				</div>

				<div class="spinner-layer spinner-yellow">
					<div class="circle-clipper left">
						<div class="circle"></div>
					</div>
					<div class="gap-patch">
						<div class="circle"></div>
					</div>
					<div class="circle-clipper right">
						<div class="circle"></div>
					</div>
				</div>

				<div class="spinner-layer spinner-green">
					<div class="circle-clipper left">
						<div class="circle"></div>
					</div>
					<div class="gap-patch">
						<div class="circle"></div>
					</div>
					<div class="circle-clipper right">
						<div class="circle"></div>
					</div>
				</div>
			</div>
		`
	}

	async function onListenLiveBus(savedBusList, row) {
		if(timeoutId) clearTimeout(timeoutId)

		const busArrivalList = await Repo.onFetchBusArrival(savedBusList)
		nextBusList = []

		busArrivalList.forEach( service => {
			const key = `${service.bus_service_no}-${service.bus_stop_code}`
			nextBusList[key] = _.first(service.bus_service_list)
			if (BusDetail?.getKey() == key) {
				BusDetail?.setLiveBusTiming(_.first(service.bus_service_list))
			}

			const busLiveDiv = $(`#busLive${service.bus_service_no}${service.bus_stop_code}`)
			busLiveDiv.empty()

			const rowDiv = $('<div>', {
				class: 'row w-100 h-100 m-0 g-2'
			})
			rowDiv.appendTo(busLiveDiv)

			getBusArrival(
				rowDiv,
				_.first(service.bus_service_list),
				row
			)
		})

		timeoutId = setTimeout(() => {
			onListenLiveBus(savedBusList, row)
		}, 1000 * 10)
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
					html.append(`Not in operation.`)
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
			placement: 'auto',
			padding: false,
			onShow: (e) => {
			},
			onHide: (e) => {
				tag.webuiPopover('destroy')
				setPopover(tag, title, operations)
			}
		})
	}
}(jQuery))
