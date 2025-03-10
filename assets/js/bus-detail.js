(function (jQuery) {

	let Repo = null
	let busServiceNo = null
	let busStopCode = null
	let busServiceRouteList = []

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

		const dialogDiv = $('<div>', {
			class: 'modal modal-fixed-footer',
			style: 'height: 90%; max-height: unset!important; top: 0!important; bottom: 10%!important;'
		})
		dialogDiv.appendTo($('body'))

		const contentDiv = $('<div>', {
			style: 'height: calc(100% - 56px); display: flex; flex-direction: column;'
		})
		contentDiv.appendTo(dialogDiv)

		const footerDiv = $('<div>', {
			class: 'modal-footer',
			style: 'border-top: unset;'
		})
		footerDiv.appendTo(dialogDiv)

		const headerDiv = $('<div>', {
				class: 'container-fluid',
				style: 'padding: .912rem 24px 0px 24px;'
		})
		headerDiv.appendTo(contentDiv)
		$('<h4>').text(busService.bus_service_no).appendTo(
			$('<div>', {
				class: 'align-items-center mb-0'
			}).appendTo(headerDiv)
		)

		const busDetailDiv = $('<div>', {
			style: 'flex-grow: 1;'
		})
		busDetailDiv.appendTo(contentDiv)

		const busServiceDiv = $('<div>', {
			id: 'busService',
			class: 'row g-1 m-0',
			style: 'min-height: 120px;'
		})
		busServiceDiv.appendTo(busDetailDiv)
		setLiveBusTiming(nextBusList)

		const busRouteDiv = $('<div>', {
			style: 'height: calc(100% - 116px);'
		})
		busRouteDiv.appendTo(busDetailDiv)

		const busDirectionTab = $('<ul>', {
			class: 'tabs z-depth-1'
		})
		busDirectionTab.appendTo(busRouteDiv)

		let directionList = busService.bus_direction_list
		busServiceRouteList = busService.bus_route_list
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

		directionList.forEach( async (direction) => {
			const busRouteList = _.filter(busServiceRouteList, { direction : direction })
			const isCurrentDirection = _.some(busRouteList, { bus_stop_code : busStop.bus_stop_code })

			const tab = $('<li>', {
				class: 'tab col s3'
			})
			tab.appendTo(busDirectionTab)
			$('<a>', {
				href: `#tab${direction}`,
				class: `${isCurrentDirection ? 'active' : ''}`
			}).text(`Direction ${direction}`).appendTo(tab)

			const tabContent = $('<div>', {
				id: `tab${direction}`,
				class: 'w-100 justify-content-center',
				style: 'height: calc(100% - 56px); overflow-y: auto;'
			})
			tabContent.appendTo(busRouteDiv)

			const busRouteListDiv = $('<div>', {
				class: 'w-100 position-relative'
			})
			busRouteListDiv.appendTo(tabContent)

			let isFound = false
			const promises = busRouteList.map( async (route, index) => {
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
						${isRight ? '' : 'text-align: right;'}
					`
				}).text(routeBusStop.bus_stop_name)
				routeInfoDiv.appendTo(busRouteListDiv)

				const routeLine = $('<div>', {
					class: `position-absolute bus-stop-line ${isLast ? 'isLast' : ''}`,
					style: `
						top: ${70 * index + (index == 0 ? 8 : 0) + 10}px;
					`
				})
				routeLine.appendTo(busRouteListDiv)

				const bulletTop = 70 * index + 23
				const routeBulletAnimation = $('<span>', {
					class: 'position-absolute bus-stop-point ripple',
					style: `top: ${bulletTop}px;`
				})
				routeBulletAnimation.appendTo(busRouteListDiv)

				const routeBullet = $('<span>', {
					class: 'position-absolute bus-stop-point',
					style: `top: ${bulletTop}px;`
				})
				routeBullet.appendTo(busRouteListDiv)
				$('<i>', {
					class: 'material-icons'
				}).text('location_on').appendTo(routeBullet)

				const information = $('<span>', {
					class: 'position-absolute bus-stop-point info',
					style: `top: ${bulletTop}px;`
				})
				information.appendTo(busRouteListDiv)
				setPopover(
					information,
					`${routeBusStop.bus_stop_name} (${routeBusStop.bus_stop_code})`,
					[
						{
							day: `Sat`,
							first: route.sat_first_bus,
							last: route.sat_last_bus
						},
						{
							day: `WD`,
							first: route.wd_first_bus,
							last: route.wd_last_bus
						},
						{
							day: `Sun`,
							first: route.sun_first_bus,
							last: route.sun_last_bus
						}
					]
				)

				if (!isFound && route.bus_stop_code == busStop.bus_stop_code) {
					isFound = true
					return index == 0 ? 0 : bulletTop
				} else {
					return 0
				}
			})

			$('<div>', {
				class: 'position-absolute',
				style: `
					min-height: 16px;
					top: ${70 * busRouteList.length + 10}px;
					opacity: 0;
				`
			}).text('empty').appendTo(busRouteListDiv)

			const scrollPosition = _.sum(await Promise.all(promises))
			if (scrollPosition > 30) {
				tabContent.animate(
					{
						scrollTop: scrollPosition - 35
					},
					300
				)
			}
		})

		const btnDismiss = $('<button>', {
			class: 'waves-effect waves-light btn-flat d-flex justify-content-center align-items-center'
		}).text('Dismiss')
		btnDismiss.appendTo(footerDiv)

		$('.tabs').tabs()
		setTimeout(() => {
			$('.tabs').tabs('updateTabIndicator')
		}, 500)

		return new Promise((resolve, reject) => {
			dialogDiv.modal({
				opacity: 0.2,
				inDuration: 300,
				outDuration: 200,
				dismissible: true,
				onCloseEnd: () => {
					busServiceRouteList = []
					Repo = null
					busServiceNo = null
					busStopCode = null
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
			$('<div>', {
				class: `w-100 d-flex justify-content-center align-items-center grey-text text-lighten-1 fw-bold`,
				style: `height: 120px; font-size: 32px;`
			}).text(`Not in operation.`).appendTo(
				$('<div>', {
					class: 'col-12'
				}).appendTo(busServiceDiv)
			)
			return
		}

		const isHasBusTwo = nextBusList.NextBus2.EstimatedArrival != ''
		const isHasBusThree = nextBusList.NextBus3.EstimatedArrival != ''

		getNextBusCard(nextBusList.NextBus).appendTo(
			$('<div>', {
				class: `col-${isHasBusTwo && isHasBusThree ? 4 : isHasBusTwo ? 6 : 12}`,
				style: 'height: 120px;'
			}).appendTo(busServiceDiv)
		)

		if (isHasBusTwo) {
			getNextBusCard(nextBusList.NextBus2).appendTo(
				$('<div>', {
					class: `col-${isHasBusThree ? 4 : 6}`,
					style: 'height: 120px;'
				}).appendTo(busServiceDiv)
			)
		}

		if (isHasBusThree) {
			getNextBusCard(nextBusList.NextBus3).appendTo(
				$('<div>', {
					class: 'col-4',
					style: 'height: 120px;'
				}).appendTo(busServiceDiv)
			)
		}
	}

	function getNextBusCard(nextBus) {
		const min = $.convertArrivalMin(nextBus.EstimatedArrival)

		const div = $('<div>', {
			class: `w-100 h-100 black ${nextBus.Load == 'SEA' ? `green-text text-accent-4` : nextBus.Load == 'SDA' ? `amber-text` : `red-text`} fw-bold d-flex justify-content-center align-items-center position-relative`,
			style: `font-size: calc(calc(120px) / ${min == 'Left' || min == 'Arr' ? 3 : 2}); border-radius: 8px; line-height: 0;`
		})
		div.text(min)

		$('<span>', {
			class: 'position-absolute',
			style: `bottom: 1rem; left: .5rem; font-size: 15px;`
		}).text(
			nextBus.Type == 'BD' ? 'Bendy' : nextBus.Type == 'DD' ? 'Double' : 'Single'
		).appendTo(div)

		if (nextBus.Feature == "WAB") {
			$('<i>', {
				class: 'material-icons position-absolute',
				style: 'bottom: .5rem; right: .5rem;'
			}).text('accessible').appendTo(div)
		}
		return div
	}

	function setPopover(tag, title, operations) {
		tag.webuiPopover({
			title: title,
			content: function() {
				const table = $('<table>', {
					class: 'striped centered',
					style: 'width: 250px;'
				})
				
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
				
				return table[0].outerHTML
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
