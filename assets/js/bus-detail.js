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
			style: 'height: calc(100% - 56px); flex-grow: 1;'
		})
		busDetailDiv.appendTo(contentDiv)

		const busServiceDiv = $('<div>', {
			id: 'busService',
			class: 'row g-1 m-0',
			style: 'min-height: 120px;'
		})
		busServiceDiv.appendTo(busDetailDiv)

		const busRouteDiv = $('<div>', {
			style: 'height: calc(100% - 124px);'
		})
		busRouteDiv.appendTo(busDetailDiv)

		const busDirectionTab = $('<ul>', {
			class: 'tabs z-depth-1'
		})
		busDirectionTab.appendTo(busRouteDiv)

		let directionList = busService.bus_direction_list
		busServiceRouteList = busService.bus_route_list

		let isFound = false
		busServiceRouteList = _.mapValues(
			_.groupBy(busServiceRouteList, 'direction'), 
			(routeList) => {
				return _(routeList).chunk(2).map( (chunk, index, arrayChunks) => {
					if (chunk.length === 1 && arrayChunks.length === index + 1) {
						chunk = _.concat(chunk, -1)
					}
					return index % 2 === 0 ? chunk : _.reverse(chunk)
				}).map( (chunk, index, arrayChunks) => {
					return chunk.map((value, subIndex) => {
						const row = index + 1

						let showLine = 'd-none'
						let curve = 'd-none'
						let isNeedToShowCurve = false
						let previousValue = chunk[subIndex === 0 ? subIndex + 1 : subIndex - 1]

						if (subIndex === 0 && previousValue != -1) {
							showLine = chunk.length > 1 ? 'line-right' : 'd-none'
						} else if (subIndex === chunk.length - 1 && previousValue != -1) {
							showLine = chunk.length > 1 ? 'line-left' : 'd-none'
						}

						if (row % 2 !== 0) {
							if (subIndex === 0) {
								if (index > 0) {
									curve = 'curve-above curve-left curve-above-left'
									isNeedToShowCurve = true
								}
							} else {
								if (index < arrayChunks.length - 1) {
									curve = 'curve-below curve-right curve-below-right'
									isNeedToShowCurve = true
								}
							}
						} else {
							if (subIndex === 0) {
								if (index < arrayChunks.length - 1) {
									curve = 'curve-below curve-left curve-below-left'
									isNeedToShowCurve = true
								}
							} else {
								if (index <= arrayChunks.length - 1) {
									curve = 'curve-above curve-right curve-above-right'
									isNeedToShowCurve = true
								}
							}
						}

						if (value != -1 && !isFound && value.bus_stop_code == busStop.bus_stop_code) {
							isFound = true
							value['current_bus_top'] = true
						}

						return { value, row, showLine, isNeedToShowCurve, curve }
					})
				}).flatten().value()
			}
		)

		_.map(busServiceRouteList, (busRouteList, direction) => {
			const isCurrentDirection = _.some(
				busRouteList,
				{
					value: {
						bus_stop_code : busStop.bus_stop_code
					}
				}
			)

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
				style: 'height: calc(100% - 48px);'
			})
			tabContent.appendTo(busRouteDiv)

			const busRouteListDiv = $('<div>', {
				class: 'container-fluid w-100 position-relative bus-route',
				style: 'height: calc(100% - .5rem); overflow-y: auto;'
			})
			busRouteListDiv.appendTo(tabContent)

			const rowDiv = $('<div>', {
				class: 'row m-0 g-1 route'
			})
			rowDiv.appendTo(busRouteListDiv)

			const scrollingPositionList = busRouteList.map( (data, index) => {

				const column = $('<div>', {
					class: `col-6 m-0 p-0 position-relative d-flex align-items-center justify-content-center`,
					style: `height: 100px;`
				})
				column.appendTo(rowDiv)

				if (data.value != -1) {
					column.attr('id', data.value.bus_stop_code)
					const routeBusStop = data.value.route_bus_stop

					$('<span>', {
						class: `position-absolute red line ${data.showLine}`
					}).appendTo(column)

					$('<span>', {
						class: `position-absolute curve ${data.curve}`
					}).appendTo(column)

					const routeBulletAnimation = $('<span>', {
						class: 'position-absolute bus-stop-point ripple',
					})
					if (data.value.current_bus_top) {
						routeBulletAnimation.appendTo(column)
					}

					const routeBullet = $('<span>', {
						class: 'position-absolute bus-stop-point',
					})
					routeBullet.appendTo(column)
					$('<i>', {
						class: 'material-icons'
					}).text(data.value.current_bus_top ? `my_location` : `location_on`).appendTo(routeBullet)

					const information = $('<span>', {
						class: 'position-absolute bus-stop-point info'
					})
					information.appendTo(column)
					setPopover(
						information,
						`${routeBusStop.bus_stop_name} (${routeBusStop.bus_stop_code})`,
						[
							{
								day: `Sat`,
								first: data.value.sat_first_bus,
								last: data.value.sat_last_bus
							},
							{
								day: `WD`,
								first: data.value.wd_first_bus,
								last: data.value.wd_last_bus
							},
							{
								day: `Sun`,
								first: data.value.sun_first_bus,
								last: data.value.sun_last_bus
							}
						]
					)

					$('<span>', {
						class: 'w-100 position-absolute fw-bold',
						style: `
							top: ${ data.row % 2 != 0 ? (index % 2 === 0 ? '65%' : '8%') : index % 2 != 0 ? '65%' : '8%'};
							font-size: 18px;
							text-align: center;
							text-overflow: ellipsis;
							white-space: nowrap;
							overflow: hidden;
						`
					}).text(routeBusStop.bus_stop_name).appendTo(column)
				}

				if (data.value != -1 && data.value.current_bus_top) {
					return data.row === 1 ? 0 : 100 * data.row
				} else {
					return 0
				}
			})

			const scrollPosition = _.sum(scrollingPositionList)
			if (scrollPosition > 30) {
				busRouteListDiv.animate(
					{
						scrollTop: scrollPosition - 100
					},
					300
				)
			}

			return 0
		})

		setLiveBusTiming(nextBusList)

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
						$('#busDetailDialog').remove()
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

		$(`#first`).remove()
		$(`#second`).remove()
		$(`#third`).remove()

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

		let busRouteList = _.find(
			busServiceRouteList, 
			group => _.some(
				group,
				{
					value: {
						current_bus_top: true
					}
				}
			)
		)

		const isHasBusTwo = nextBusList.NextBus2.EstimatedArrival != ''
		const isHasBusThree = nextBusList.NextBus3.EstimatedArrival != ''

		getNextBusCard(busRouteList, `first`, nextBusList.NextBus).appendTo(
			$('<div>', {
				class: `col-${isHasBusTwo && isHasBusThree ? 4 : isHasBusTwo ? 6 : 12}`,
				style: 'height: 120px;'
			}).appendTo(busServiceDiv)
		)

		if (isHasBusTwo) {
			getNextBusCard(busRouteList, `second`, nextBusList.NextBus2).appendTo(
				$('<div>', {
					class: `col-${isHasBusThree ? 4 : 6}`,
					style: 'height: 120px;'
				}).appendTo(busServiceDiv)
			)
		}

		if (isHasBusThree) {
			getNextBusCard(busRouteList, `third`, nextBusList.NextBus3).appendTo(
				$('<div>', {
					class: 'col-4',
					style: 'height: 120px;'
				}).appendTo(busServiceDiv)
			)
		}
	}

	function getNextBusCard(busRouteList, id, nextBus) {
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

		let startBusStop = _.minBy(
			busRouteList.filter(busRoute => busRoute.value != -1 ),
			(busRoute) => {
				return haversine(nextBus.Latitude, nextBus.Longitude, busRoute.value.route_bus_stop.latitude, busRoute.value.route_bus_stop.longitude)
			}
		)
		let endBusStop = null

		const startIndex = _.indexOf(busRouteList, startBusStop)
		let endIndex = startIndex

		if (nextBus.Latitude > startBusStop.value.route_bus_stop.latitude) {
			if (_.includes(startBusStop.curve, 'curve-above-right')) {
				endIndex -= 1
			} else if (_.includes(startBusStop.curve, 'curve-below-right') || _.includes(startBusStop.curve, 'curve-below-left')) {
				endIndex += 2
			} else if (_.includes(startBusStop.curve, 'curve-above-right') || _.includes(startBusStop.curve, 'curve-above-left')) {
				endIndex += 1
			}
		} else {
			if (_.includes(startBusStop.curve, 'curve-above-left') || _.includes(startBusStop.curve, 'curve-above-right')) {
				endIndex -= 2
			} else if (_.includes(startBusStop.curve, 'curve-below-right')) {
				endIndex -= 1
			} else if (_.includes(startBusStop.curve, 'curve-below-left')) {
				endIndex += 1
			}
		}
		if (endIndex > 0 && endIndex < busRouteList.length) {
			endBusStop = busRouteList[endIndex]
		}
		if (endBusStop && endBusStop.value.sequence < startBusStop.value.sequence) {
			let tmp = startBusStop
			startBusStop = endBusStop
			endBusStop = tmp
		}
		if (endBusStop === null) {
			endBusStop = startBusStop
		}
		let log = `${id} Bus is `
		if (nextBus.Latitude > startBusStop.value.route_bus_stop.latitude) {
			log += `left from ${startBusStop.value.route_bus_stop.bus_stop_name}`
		} else if (nextBus.Latitude < endBusStop.value.route_bus_stop.latitude) {
			log += `not arrive to ${endBusStop.value.route_bus_stop.bus_stop_name}`
		}

		const startLat = startBusStop.value.route_bus_stop.latitude
		const endLat = endBusStop.value.route_bus_stop.latitude

		const startStopEl = $(`#${startBusStop.value.bus_stop_code}`)
		const endStopEl = $(`#${endBusStop.value.bus_stop_code}`)

		const startOffset = startStopEl.offset()
		const endOffset = endStopEl.offset()

		const totalLatDiff = endLat - startLat
		const currentLatDiff = nextBus.Latitude - startLat

		const totalDistance = endOffset.top - startOffset.top
		const positionTop = startOffset.top + (currentLatDiff / totalLatDiff) * totalDistance

		let positionLeft = '50%'
		if (nextBus.Latitude > startLat) {
			positionLeft = 'calc(50% + 25px)'
		} else if (nextBus.Latitude < startLat) {
			positionLeft = 'calc(50% - 25px)'
		}

		if (nextBus.Latitude != '0.0' && nextBus.Longitude != '0.0') {
			$('<i>', {
				id: id,
				class: 'position-absolute material-icons',
				style: `color: blue; left: ${positionLeft}; z-index: top: ${positionTop}px;`
			}).text('directions_bus').appendTo($(`#${startBusStop.value.bus_stop_code}`));
		}

		return div
	}

	function haversine(lat1, lon1, lat2, lon2) {
		const R = 6371
		const dLat = (lat2 - lat1) * Math.PI / 180
		const dLon = (lon2 - lon1) * Math.PI / 180

		const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

		return R * c
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
