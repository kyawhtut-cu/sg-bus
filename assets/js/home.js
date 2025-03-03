(function (jQuery) {
	"use strict"

	let Repo = null
	let timeoutId = null

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
		$('body').append(
			$('<div>', {
				id: 'update',
				class: 'vh-100'
			})
		)

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
			class: 'row h-100'
		})
		$('body').append(
			$('<div>', {
				id: 'home',
				class: 'container-fluid vh-100 p-0'
			}).append(gridDiv)
		)

		const fab = $('<button>', {
			id: 'btnSetting',
			class: 'btn-floating btn-large waves-effect waves-light deep-orange position-fixed',
			style: 'bottom: 16px; right: 16px;'
		}).append(
			$('<i>', {
				class: 'material-icons'
			}).text('settings')
		)
		fab.on('click', async function() {
			const isDataChanged = await $.Setting(Repo).open()
			if (isDataChanged) onReloadLiveService()
		})
		$('body').append(fab)

		await onReloadLiveService()
	}

	async function onReloadLiveService() {
		const savedBusList = await Promise.all(
			(await Repo.getSavedBusList()).map( async (savedBus) => {
				return {
					bus_service_no: savedBus.bus_service_no,
					bus_stop_code: savedBus.bus_stop_code,
					bus_stop_name: _.first(await Repo.getBusStopByStopCode(savedBus.bus_stop_code))?.bus_stop_name ?? ''
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
				gridDiv.append(getLiveBus(col, colClass))
			})
		})

		onListenLiveBus(savedBusList, liveBusGrid.length)
	}

	function getLiveBus(savedBus, largeColumnCount) {
		const col = $(`<div>`, {
			class: 'column',
			style: 'padding-top: .25rem'
		})
		if (largeColumnCount == 12) {
			col.addClass('col-12')
		} else {
			col.addClass(`col-lg-${largeColumnCount} col-md-12 col-sm-12`)
		}

		const headerDiv = $('<div>', {
			class: 'w-100 bg-light d-flex header'
		})
		headerDiv.append(
			$('<div>', {
				class: 'h-100 text-white red d-flex justify-content-center align-items-center fw-bold busServiceNo'
			}).text(savedBus.bus_service_no)
		)
		headerDiv.append(
			$('<div>', {
				class: 'h-100 red-text d-flex justify-content-center align-items-center fw-bold busStopName'
			}).text(savedBus.bus_stop_name)
		)
		col.append(headerDiv)

		const liveDiv = $('<div>', {
			id: `busLive${savedBus.bus_service_no}${savedBus.bus_stop_code}`,
			class: ` d-flex justify-content-center align-items-center`,
			style: 'height: calc(100% - 56px);',
		})
		liveDiv.append(getCardLoading())
		col.append(liveDiv)

		return col
	}

	function getCardLoading() {
		return `
			<div style="height: calc(100% - 56px); display: flex; align-items: center; justify-content: center">
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
			</div>
		`
	}

	async function onListenLiveBus(savedBusList, row) {
		if(timeoutId) clearTimeout(timeoutId)

		const busArrivalList = await Repo.onFetchBusArrival(savedBusList)

		busArrivalList.forEach( service => {
			const busLiveDiv = $(`#busLive${service.bus_service_no}${service.bus_stop_code}`)
			busLiveDiv.empty()
			busLiveDiv.append(
				getBusArrival(
					_.first(service.bus_service_list),
					row
				)
			)
		})

		timeoutId = setTimeout(() => {
			onListenLiveBus(savedBusList, row)
		}, 1000 * 10)
	}

	function getBusArrival(busServiceList, rowCount) {
		const row = $('<div>', {
			class: 'row w-100 h-100',
			style: 'margin-bottom: .25rem;'
		})
		if (!busServiceList || busServiceList.NextBus.EstimatedArrival == '') {
			row.append(
				$('<div>', {
					class: 'col-12'
				}).append(
					$('<div>', {
						class: `w-100 h-100 d-flex justify-content-center align-items-center grey-text text-lighten-1 fw-bold`,
						style: `font-size: 32px;"`
					}).text(`Not in operation.`)
				)
			)
			return row
		}
		const isHasBusTwo = busServiceList.NextBus2.EstimatedArrival != ''
		const isHasBusThree = busServiceList.NextBus3.EstimatedArrival != ''
		
		// Col 1
		row.append(
			$('<div>', {
				class: `col-lg-${isHasBusTwo ? 6 : 12} col-md-12 col-sm-12 ${isHasBusTwo ? `` : `d-flex justify-content-center`}`,
				style: `padding: .5rem .5rem 0 0;`
			}).append(
				getNextBusCard(!isHasBusTwo, busServiceList.NextBus, rowCount)
			)
		)

		if (isHasBusTwo) {
			// Col 2
			row.append(
				$('<div>', {
					class: 'col-lg-6 col-md-12 col-sm-12',
					style: `padding: .5rem .5rem 0 0;`
				}).append(
					getNextBusCard(false, busServiceList.NextBus2, rowCount)
				)
			)
		}

		if (isHasBusThree) {
			// Col 3
			row.append(
				$('<div>', {
					class: 'col-12 d-flex justify-content-center',
					style: `padding: .5rem .5rem 0 0;`
				}).append(
					getNextBusCard(true, busServiceList.NextBus3, rowCount)
				)
			)
			
		}

		return row
	}

	function getNextBusCard(isOnlyOne, nextBus, row) {
		const min = convertArrivalMin(nextBus.EstimatedArrival)
		const div = $('<div>', {
			class: `w-100 h-100 black ${nextBus.Load == 'SEA' ? `green-text text-accent-4` : nextBus.Load == 'SDA' ? `amber-text` : `red-text`} fw-bold d-flex justify-content-center align-items-center position-relative`,
			style: `font-size: calc(100vh / ${row * (min == 'Left' || min == 'Arr' ? 4.5 : 3)}); border-radius: 8px; line-height: 0;`
		})
		div.append(min)
		div.append(
			$('<span>', {
				class: 'position-absolute',
				style: `bottom: 1.3rem; left: 1rem; font-size: calc(100vh / 50);`
			}).text(
				nextBus.Type == 'BD' ? 'Bendy' : nextBus.Type == 'DD' ? 'Double' : 'Single'
			)
		)
		if (nextBus.Feature == "WAB") {
			div.append($('<i>', {
				class: 'material-icons position-absolute',
				style: 'bottom: .5rem; right: 1rem;'
			}).text('accessible'))
		}
		return div
	}

	async function onFetchLiveBus(savedBusList) {
		let result = await Promise.all(
			savedBusList.map( savedBus => {
				return Repo.onFetchBusArrival(
					savedBus.bus_service_no,
					savedBus.bus_stop_code
				)
			})
		)
		return result.filter( service => service != null)
	}

	function convertArrivalMin(value) {
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
