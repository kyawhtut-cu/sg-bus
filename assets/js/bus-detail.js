(function (jQuery) {

	let Repo = null
	let busServiceNo = null
	let busStopCode = null

	jQuery.BusDetail = function (repo) {
		Repo = repo

		return {
			open,
			getKey,
			setLiveBusTiming
		}
	}

	async function open(serviceNo, stopCode, nextBusList) {
		busServiceNo = serviceNo
		busStopCode = stopCode
		const busStop = await Repo.getBusStopByStopCode(busStopCode)
		const busService = await Repo.getBusServiceByServiceNo(busServiceNo)
		console.log(busStop)
		console.log(busService)

		const headerDiv = $('<div>', {
			class: 'align-items-center mb-0'
		})
		headerDiv.append(
			$('<h4>').text(busService.bus_service_no)
		)

		const busServiceDiv = $('<div>', {
			id: 'busService',
			class: 'row g-1 m-0',
			style: 'min-height: 120px;'
		})

		const busRouteDiv = $('<div>', {
			class: 'row m-0 pb-2',
			style: 'height: calc(100% - 124px); overflow-y: auto;'
		})
		busService.bus_direction_list.forEach( direction => {
			const directionTitleDiv = $('<div>', {
				class: 'd-flex align-items-center'
			}).text(`Direction - ${direction}`)

			const busRouteList = _.filter(busService.bus_route_list, { direction : direction })
			const busRouteListDiv = $('<div>', {
			})
			busRouteList.forEach( (route, index) => {
				const routeInfoDiv = $('<div>', {
					class: 'd-flex align-items-center'
				})
				routeInfoDiv.append(
					$('<span>', {
						class: 'red',
						style: 'width: 8px; height: 8px; border-radius: 50%; margin-right: 5px;'
					})
				)
				routeInfoDiv.append(route.bus_stop_code)

				const isLast = index + 1 >= busRouteList.length
				const line = $('<div>', {
					class: `${isLast ? `` : `h-100`} position-absolute red`,
					style: `top: ${index != 0 ? 0 : `8px`}; left: 3px; width: 2px; ${isLast ? `height: 8px;` : ``}`
				})

				const routeDiv = $('<div>', {
					class: 'position-relative yellow',
					style: 'min-height: 70px; width: 120px;'
				})
				routeDiv.append(routeInfoDiv)
				routeDiv.append(line)

				busRouteListDiv.append(routeDiv)
			})

			const directionDiv = $('<div>', {
				class: `col-${12 / busService.bus_direction_list.length}`
			})
			directionDiv.append(directionTitleDiv)
			directionDiv.append(busRouteListDiv)

			busRouteDiv.append(directionDiv)
		})
		
		const busDetailDiv = $('<div>', {
			style: 'flex-grow: 1; overflow-y: auto;'
		})
		busDetailDiv.append(busServiceDiv)
		busDetailDiv.append(busRouteDiv)

		const contentDiv = $('<div>', {
			style: 'height: calc(100% - 56px); display: flex; flex-direction: column;'
		})
		contentDiv.append(
			$('<div>', {
				class: 'container-fluid',
				style: 'padding: .912rem 24px 0px 24px;'
			}).append(headerDiv)
		)
		contentDiv.append(busDetailDiv)

		const btnDismiss = $('<button>', {
			class: 'waves-effect waves-light btn-flat d-flex justify-content-center align-items-center'
		})
		btnDismiss.text('Dismiss')

		const footerDiv = $('<div>', {
			class: 'modal-footer',
			style: 'border-top: unset;'
		})
		footerDiv.append(btnDismiss)

		const dialogDiv = $('<div>', {
			class: 'modal modal-fixed-footer'
		})

		dialogDiv.append(contentDiv)
		dialogDiv.append(footerDiv)

		$('body').append(dialogDiv)

		return new Promise((resolve, reject) => {
			dialogDiv.modal({
				opacity: 0.2,
				inDuration: 300,
				outDuration: 200,
				dismissible: true,
				onCloseEnd: () => {
					resolve()
					setTimeout(() => {
						dialogDiv.remove()
					}, 300)
				}
			})
			btnDismiss.on('click', function () {
				dialogDiv.modal('close')
			})

			dialogDiv.modal('open')
			setLiveBusTiming(nextBusList)
		})
	}

	function getKey() {
		return `${busServiceNo}-${busStopCode}`
	}

	function setLiveBusTiming(nextBusList) {
		const busServiceDiv = $('#busService')
		busServiceDiv.empty()

		if (!nextBusList || nextBusList.NextBus.EstimatedArrival == '') {
			busServiceDiv.append(
				$('<div>', {
					class: 'col-12'
				}).append(
					$('<div>', {
						class: `w-100 d-flex justify-content-center align-items-center grey-text text-lighten-1 fw-bold`,
						style: `height: 120px; font-size: 32px;`
					}).text(`Not in operation.`)
				)
			)
			return
		}

		const isHasBusTwo = nextBusList.NextBus2.EstimatedArrival != ''
		const isHasBusThree = nextBusList.NextBus3.EstimatedArrival != ''

		busServiceDiv.append(
			$('<div>', {
				class: `col-${isHasBusTwo && isHasBusThree ? 4 : isHasBusTwo ? 6 : 12}`,
				style: 'height: 120px;'
			}).append(
				getNextBusCard(nextBusList.NextBus)
			)
		)

		if (isHasBusTwo) {
			busServiceDiv.append(
				$('<div>', {
					class: `col-${isHasBusThree ? 4 : 6}`,
					style: 'height: 120px;'
				}).append(
					getNextBusCard(nextBusList.NextBus2)
				)
			)
		}

		if (isHasBusThree) {
			busServiceDiv.append(
				$('<div>', {
					class: 'col-4',
					style: 'height: 120px;'
				}).append(
					getNextBusCard(nextBusList.NextBus3)
				)
			)
			
		}

		console.log(nextBusList)
	}

	function getNextBusCard(nextBus) {
		const min = $.convertArrivalMin(nextBus.EstimatedArrival)
		const div = $('<div>', {
			class: `w-100 h-100 black ${nextBus.Load == 'SEA' ? `green-text text-accent-4` : nextBus.Load == 'SDA' ? `amber-text` : `red-text`} fw-bold d-flex justify-content-center align-items-center position-relative`,
			style: `font-size: calc(calc(120px) / ${min == 'Left' || min == 'Arr' ? 3 : 2}); border-radius: 8px; line-height: 0;`
		})
		div.append(min)
		div.append(
			$('<span>', {
				class: 'position-absolute',
				style: `bottom: 1rem; left: .5rem; font-size: 15px;`
			}).text(
				nextBus.Type == 'BD' ? 'Bendy' : nextBus.Type == 'DD' ? 'Double' : 'Single'
			)
		)
		if (nextBus.Feature == "WAB") {
			div.append($('<i>', {
				class: 'material-icons position-absolute',
				style: 'bottom: .5rem; right: .5rem;'
			}).text('accessible'))
		}
		return div
	}
}(jQuery))
