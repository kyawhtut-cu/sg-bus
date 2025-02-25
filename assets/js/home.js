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
			`<div id="update" class="vh-100"></div>`
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
			'class': 'row h-100'
		})
		$('body').append(
			$('<div>', {
				'class': 'container-fluid vh-100 p-0',
				'id': 'home'
			}).append(gridDiv)
		)

		const fab = $('<button>', {
			'id': 'btnSetting',
			'class': 'btn-floating btn-large waves-effect waves-light deep-orange',
			'style': 'position: fixed; bottom: 16px; right: 16px;'
		}).append(
			$('<i>', {
				'class': 'material-icons'
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

		onFetchLiveBus(savedBusList)
	}

	function getLiveBus(savedBus, largeColumnCount) {
		const col = $(`<div>`, {
			'class': 'column',
			'style': 'padding-top: .5rem'
		})
		if (largeColumnCount == 12) {
			col.addClass('col-12')
		} else {
			col.addClass(`col-lg-${largeColumnCount} col-md-12 col-sm-12`)
		}

		col.append(
			`
				<div class="w-100 header">
					<div class="busServiceNo">${savedBus.bus_service_no}</div>
					<div class="busStopName">${savedBus.bus_stop_name}</div>
				</div>
			`
		)
		const liveDiv = $('<div>', {
			'id': `busLive${savedBus.bus_service_no}${savedBus.bus_stop_code}`,
			'style': 'height: calc(100% - 56px); display: flex; align-items: center; justify-content: center;',
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

	function getBusArrival(busServiceList) {
		const row = $('<div>', {
			'class': 'row mb-0',
			'style': 'width: 70%;'
		})
		if (!busServiceList || busServiceList.NextBus.EstimatedArrival == '') {
			row.append(
				`
					<div style="display: flex; justify-content: center; font-size: 32px; font-weight: 700;" class="grey-text text-lighten-1">Not in operation.</div>
				`
			)
			return row
		}
		const isHasBusTwo = busServiceList.NextBus2.EstimatedArrival != ''
		const isHasBusThree = busServiceList.NextBus3.EstimatedArrival != ''
		
		// Col 1
		row.append(
			$('<div>', {
				'class': `col-${isHasBusTwo ? 6 : 12}`,
				'style': `padding: .5rem .5rem 0 0; ${isHasBusTwo ? `` : `display: flex; justify-content: center;`};`
			}).append(
				getNextBusCard(!isHasBusTwo, busServiceList.NextBus)
			)
		)

		if (isHasBusTwo) {
			// Col 2
			row.append(
				$('<div>', {
					'class': 'col-6',
					'style': `padding: .5rem .5rem 0 0;`
				}).append(
				getNextBusCard(false, busServiceList.NextBus2))
			)
		}

		if (isHasBusThree) {
			// Col 3
			row.append(
				$('<div>', {
					'class': 'col-12',
					'style': `padding: .5rem .5rem 0 0; display: flex; justify-content: center;`
				}).append(
				getNextBusCard(true, busServiceList.NextBus3))
			)
			
		}

		return row
	}

	function getNextBusCard(isOnlyOne, nextBus) {
		const min = convertArrivalMin(nextBus.EstimatedArrival)
		const div = $('<div>', {
			'class': 'grey lighten-1 grey-text text-darken-4',
			'style': `${!isOnlyOne ? `` : `width: 50%;`} height: 82px; border-left: solid 8px ${nextBus.Load == 'SEA' ? `#00D748` : nextBus.Load == 'SDA' ? `#FFDD00` : `#FF1AC6`}; font-size: ${min == 'Arr' ? `42px` : `56px`}; font-weight: 700; padding-left: .5rem; display: flex; align-items: center; position: relative; border-radius: 8px;`
		})
		div.append(min)
		if (nextBus.Type == "BD") {
			div.append($('<i>', {
				'style': `width: 24px; height: 24px; position: absolute; top: .5rem; right: .5rem; font-size: 24px; background-image: url('bendy-bus.svg'); background-size: contain; background-repeat: no-repeat; display: inline-block;`
			}))
		} else if (nextBus.Type == "DD") {
			div.append($('<i>', {
				'style': `width: 24px; height: 24px; position: absolute; top: .5rem; right: .5rem; font-size: 24px; background-image: url('double-bus.svg'); background-size: contain; background-repeat: no-repeat; display: inline-block;`
			}))
		} else {
			div.append($('<i>', {
				'class': 'material-icons',
				'style': 'position: absolute; top: .5rem; right: .5rem; font-size: 24px;'
			}).text('directions_bus'))
		}
		if (nextBus.Feature == "WAB") {
			div.append($('<i>', {
				'class': 'material-icons',
				'style': 'position: absolute; top: calc(28px + .5rem); right: .5rem; font-size: 24px;'
			}).text('accessible'))
		}
		return div
	}

	async function onFetchLiveBus(savedBusList) {
		if(timeoutId) clearTimeout(timeoutId)

		const result = await Promise.all(
			savedBusList.map((savedBus) => {
				return Repo.onFetchBusArrival(
					savedBus.bus_service_no,
					savedBus.bus_stop_code
				)
			})
		)
		result.forEach( service => {
			const busLiveDiv = $(`#busLive${service.bus_service_no}${service.bus_stop_code}`)
			busLiveDiv.empty()
			busLiveDiv.append(getBusArrival(_.first(service.bus_service_list)))
		})

		timeoutId = setTimeout(() => {
			onFetchLiveBus(savedBusList)
		}, 1000 * 30)
	}

	function convertArrivalMin(value) {
		if (!value || value === "") {
			return "No More Next Bus"
		}

		const arrival = new Date(value)

		const now = new Date()

		const sec = Math.floor((arrival - now) / 1000)
		let min = Math.floor(sec / 60)

		if (min === 0) {
			min = 1
		}

		if (sec <= 30) {
			return "Arr"
		}

		return min.toString()
	}
}(jQuery))
