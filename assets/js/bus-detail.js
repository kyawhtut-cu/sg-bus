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

		const busDirectionTab = $('<ul>', {
			class: 'tabs z-depth-1'
		})
		let busDirectionContentList = []
		busService.bus_direction_list.forEach( direction => {
			const directionTab = $('<li>', {
				class: 'tab col s3'
			}).append(
				`<a href="#tab${direction}" ${direction == 1 ? 'class="active"' : ''}>Direction ${direction}</a>`
			)
			busDirectionTab.append(directionTab)

			const busRouteListDiv = $('<div>', {
				class: 'w-100 position-relative'
			})
			const busRouteList = _.filter(busService.bus_route_list, { direction : direction })
			busRouteList.forEach( async (route, index) => {
				const isRight = index % 2 === 0
				const isLast = index + 1 >= busRouteList.length

				const routeBusStop = await Repo.getBusStopByStopCode(route.bus_stop_code)
				const routeInfoDiv = $('<div>', {
					class: `position-absolute d-flex fw-bold ${isRight ? '' : 'justify-content-end'}`,
					style: `
						width: calc(50% - 33px);
						min-height: 70px;
						max-height: ${70 * (index + 2) - 8}px;
						overflow: auto;
						${isRight ? '' : 'left: 8px;'}
						${isRight ? 'right: 8px;' : ''}
						top: ${70 * index + 24}px;
						font-size: 18px;
						line-height: 1;
					`
				})
				routeInfoDiv.append(routeBusStop.bus_stop_name)
				routeInfoDiv.appendTo(busRouteListDiv)

				$('<div>', {
					class: `position-absolute bus-stop-line ${isLast ? 'isLast' : ''}`,
					style: `
						top: ${70 * index + (index == 0 ? 8 : 0) + 10}px;
					`
				}).appendTo(busRouteListDiv)

				$('<span>', {
					class: 'position-absolute bus-stop-point bus-stop-point-ripple',
					style: `
						top: ${70 * index + 23}px;
					`
				}).appendTo(busRouteListDiv)
				$('<span>', {
					class: 'position-absolute bus-stop-point',
					style: `top: ${70 * index + 23}px;`,
					'data-title': routeBusStop.bus_stop_name,
					'data-content': `SAT First: ${route.sat_first_bus}<br>SAT Last: ${route.sat_last_bus}<br>SUN First: ${route.sun_first_bus}<br>SUN Last: ${route.sun_last_bus}<br>WD First: ${route.wd_first_bus}<br>WD Last: ${route.wd_last_bus}`,
					'data-placement': "auto"
				}).append('<i class="material-icons">location_on</i>').appendTo(busRouteListDiv)
			})
			busRouteListDiv.append(
				$('<div>', {
					class: 'position-absolute',
					style: `
						min-height: 16px;
						top: ${70 * busRouteList.length + 10}px;
						opacity: 0;
					`
				}).append('empty')
			)

			busDirectionContentList.push(
				$('<div>', {
					id: `tab${direction}`,
					class: 'w-100 justify-content-center',
					style: 'height: calc(100% - 56px); overflow-y: auto;'
				}).append(busRouteListDiv)
			)
		})

		const busRouteDiv = $('<div>', {
			style: 'height: calc(100% - 116px);'
		})
		busRouteDiv.append(busDirectionTab)
		busDirectionContentList.forEach( div => {
			busRouteDiv.append(div)
		})

		const busServiceDiv = $('<div>', {
			id: 'busService',
			class: 'row g-1 m-0',
			style: 'min-height: 120px;'
		})
		
		const busDetailDiv = $('<div>', {
			style: 'flex-grow: 1;'
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
			class: 'modal modal-fixed-footer',
			style: 'height: 90%; max-height: unset!important; top: 0!important; bottom: 10%!important;'
		})

		dialogDiv.append(contentDiv)
		dialogDiv.append(footerDiv)
		contentDiv.append('<a href="#" data-title="Title" data-content="Contents..." data-placement="auto">show pop</a>')

		$('body').append(dialogDiv)

		setTimeout(() => {
			$('span').webuiPopover({
				trigger: 'hover'
			})
		}, 3000)

		$('.tabs').tabs()
		setTimeout(() => {
			$('.tabs').tabs('updateTabIndicator')
		}, 500)

		setLiveBusTiming(nextBusList)

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
