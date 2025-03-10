(function (jQuery) {

	let Repo = null

	let settingCardList = null

	let busServiceList = []
	let busStopList = []

	jQuery.Setting = function (repo) {
		Repo = repo

		return {
			open
		}
	}

	const init = () => {
		const dialogDiv = $('<div>', {
			id: 'settingDialog',
			class: 'modal modal-fixed-footer'
		})
		dialogDiv.appendTo($('body'))

		const contentDiv = $('<div>', {
			style: 'height: calc(100% - 56px); display: flex; flex-direction: column;'
		})
		contentDiv.appendTo(dialogDiv)

		const headerDiv = $('<div>', {
			class: 'row align-items-center mb-0'
		})
		headerDiv.appendTo(
			$('<div>', {
				class: 'container-fluid',
				style: 'padding: .912rem 24px 0px 24px;'
			}).appendTo(contentDiv)
		)

		$('<h4>', {
			class: 'col-md-7 col-sm-12'
		}).text('Setting').appendTo(headerDiv)

		const columnCountDiv = $('<div>', {
			class: 'input-field col-md-5 col-sm-12 mb-0'
		})
		columnCountDiv.appendTo(headerDiv)

		const columnCountSelect = $('<select>', {
			id: 'columnCount'
		})
		columnCountSelect.appendTo(columnCountDiv)

		let columnList = []
		const columnCount = Repo.getColumnCount()
		for (let i = 1; i < 13; i++) {
			columnList.push({
				id: i,
				text: i,
				selected: i == columnCount
			})
		}
		columnCountSelect.select2({
			placeholder: 'Select colunm count',
			search: 'Search column',
			data: columnList
		})

		$('<label>', {
			class: 'active'
		}).text('Choose number of columns').appendTo(columnCountDiv)

		settingCardList = $('<div>', {
			style: 'flex-grow: 1; overflow-y: auto; padding: 0 24px;'
		})
		settingCardList.appendTo(contentDiv)

		const footerDiv = $('<div>', {
			class: 'modal-footer',
			style: 'border-top: unset;'
		})
		footerDiv.appendTo(dialogDiv)

		const btnAddNew = $('<button>', {
			class: 'waves-effect waves-light btn-flat d-flex justify-content-center align-items-center'
		})
		$('<i>', {
			class: 'material-icons',
			style: 'margin-right: 8px'
		}).text('add').appendTo(btnAddNew)
		btnAddNew.append('Add New')
		btnAddNew.appendTo(footerDiv)

		btnAddNew.on('click', onClickAddNew)

		const btnCancel = $('<button>', {
			id: 'btnCancel',
			class: 'waves-effect waves-light btn-flat d-flex justify-content-center align-items-center'
		}).text('Cancel')
		btnCancel.appendTo(footerDiv)

		const btnSave = $('<button>', {
			id: 'btnSave',
			class: 'waves-effect waves-light btn-flat d-flex justify-content-center align-items-center'
		}).text('Save')
		btnSave.appendTo(footerDiv)
	}

	async function open() {
		init()

		const dialogDiv = $('#settingDialog')

		busStopList = await Repo.getBusStopList()
		settingCardList.empty()

		const savedBusList = await Repo.getSavedBusList()

		busServiceList = await Promise.all(
			_.map(savedBusList, async (savedBus, index) => {
				let busStop = await Repo.getBusStopByStopCode(savedBus.bus_stop_code)

				const object = {
					index: index + 1,
					bus_label: `Bus ${index + 1}`,
					bus_stop_code: savedBus.bus_stop_code,
					bus_service_no: savedBus.bus_service_no,
					bus_stop_name: _.first(busStop)?.bus_stop_name ?? `Unknown`,
					is_error: false,
					is_show_error: false
				}

				onAddCard(object)
				
				return object
			})
		)

		return new Promise((resolve, reject) => {
			let result = 0
			dialogDiv.modal({
				opacity: 0.2,
				inDuration: 300,
				outDuration: 200,
				dismissible: false,
				onCloseEnd: () => {
					resolve(result)
					setTimeout(() => {
						dialogDiv.remove()
					}, 300)
				}
			})

			$('#btnCancel').on('click', function () {
				$('#columnCount').val(Repo.getColumnCount())
				$('#columnCount').formSelect()

				busServiceList = []
				busStopList = []

				dialogDiv.modal('close')
			})

			$('#btnSave').on('click', async function () {
				let isHasChanges = Repo.getColumnCount() != $('#columnCount').val()

				const oldList = (await Repo.getSavedBusList()).map( busService => {
					delete busService.id
					return busService
				})
				const newList = busServiceList.map( busService => {
					if (busService.is_error) return null
					return {
						bus_stop_code: busService.bus_stop_code,
						bus_service_no: busService.bus_service_no
					}
				}).filter( busService => busService != null )

				if (!_.isEqual(oldList, newList)) {
					isHasChanges = true
					await Repo.onInsertLiveBusServiceList(newList)
				}

				Repo.setColumnCount($('#columnCount').val())

				result = isHasChanges ? 1 : 0
				dialogDiv.modal('close')
			})

			dialogDiv.modal('open')
		})
	}

	function onClickAddNew() {
		const index = _.last(busServiceList)?.index ?? 0
		const newCard = {
			index: index + 1,
			bus_label: `Bus ${index + 1}`,
			bus_stop_code: ``,
			bus_service_no: ``,
			bus_stop_name: ``,
			is_error: true,
			is_show_error: false
		}

		busServiceList.push(newCard)
		onAddCard(_.last(busServiceList))

		settingCardList.animate(
			{
				scrollTop: settingCardList[0].scrollHeight
			},
			300
		)
	}

	function onAddCard(busService) {
		const card = $('<div>', {
			class: 'card-panel hoverable',
			style: 'position: relative;'
		})
		card.appendTo(settingCardList)
		bindCardUi(card, busService)
	}

	function bindCardUi(card, busService) {
		const label = $('<h4>', {
			class: 'grey-text text-lighten-1'
		})
		label.text(busService.bus_label)
		label.appendTo(card)

		const busStopName = $('<div>', {
			'class': 'input-field w-100'
		})
		busStopName.appendTo(card)

		const busStopNameInput = $('<select>', {
			id: `busStopName${busService.index}`,
			class: 'busStopName',
			value: busService.bus_stop_name ?? ``
		})
		busStopNameInput.appendTo(busStopName)

		var data = []
		busStopList.forEach(busStop => data.push({
			id: busStop.bus_stop_code,
			text: `${busStop.bus_stop_code}-${busStop.bus_stop_name}`,
			bus_stop_name: busStop.bus_stop_name,
			selected: busStop.bus_stop_code == busService.bus_stop_code
		}) )

		$(`#busStopName${busService.index}`).select2({
			placeholder: 'Select Bus Stop',
			search: 'Search Bus Stop',
			data: data,
			dropdownAutoWidth: false,
			templateSelection: (selection) => {
				return selection.bus_stop_name ?? selection.text
			}
		})

		if (busService.bus_stop_code == '') {
			$(`#busStopName${busService.index}`).val(null).trigger('change')
		}

		busStopNameInput.on('select2:select', function (e) {
			const data = e.params.data
			if (busService.bus_stop_code != data.id) {
				busService = _.set(busService, 'bus_service_no', '')
			}
			busService = _.set(busService, 'bus_stop_name', data.bus_stop_name)
			busService = _.set(
				busService,
				'bus_stop_code',
				data.id
			)
			onDataUpdateByIndex(
				busService.index,
				busService
			)
			setBusServiceNoList(busService)
		})

		const busStopNameLabel = $('<label>', {
			class: 'active'
		}).text('Bus Stop Name')
		busStopNameLabel.appendTo(busStopName)


		const busServiceNo = $('<div>', {
			class: 'input-field w-100'
		})
		busServiceNo.appendTo(card)

		const busServiceNoInput = $('<select>', {
			id: `busServiceNo${busService.index}`
		})
		busServiceNoInput.appendTo(busServiceNo)

		setBusServiceNoList(busService)

		busServiceNoInput.on('select2:select', function(e) {
			const data = e.params.data
			busService = _.set(busService, 'bus_service_no', data.id)
			busService = _.set(busService, 'is_error', false)
			busService = _.set(busService, 'is_show_error', false)
			onDataUpdateByIndex(
				busService.index,
				busService
			)
		})

		const busServiceNoLabel = $('<label>', {
			class: 'active'
		}).text('Bus Service No.')
		busServiceNoLabel.appendTo(busServiceNo)

		const btnTrash = $('<i>', {
			class: 'material-icons waves-effect btn-flat setting-trash position-absolute'
		}).text('delete_forever')
		btnTrash.appendTo(card)

		btnTrash.on('click', function () {
			card.remove()
			_.remove(busServiceList, busService)
		})
	}

	function setBusServiceNoList(busService) {
		$(`#busServiceNo${busService.index}`).empty()
		var data = []
		_.find(
			busStopList,
			{
				bus_stop_code: busService.bus_stop_code
			}
		)?.bus_service_no_list?.forEach ( serviceNo => {
			data.push({
				id: serviceNo,
				text: serviceNo,
				selected: busService.bus_service_no == serviceNo
			})
		})
		$(`#busServiceNo${busService.index}`).select2({
			placeholder: 'Select Bus Service No.',
			search: 'Search Bus Service No.',
			data: data
		})

		busService = _.set(busService, 'is_error', busService.bus_service_no == '')

		if (busService.bus_service_no == '') {
			busService = _.set(busService, 'is_show_error', false)
			$(`#busServiceNo${busService.index}`).val(null).trigger('change')
		}

		onDataUpdateByIndex(
			busService.index,
			busService
		)
	}

	function onDataUpdateByIndex(index, newObj) {
		_.update(busServiceList, _.findIndex(busServiceList, { index: index }), (obj) => {
			if (obj) {
				return newObj
			} else {
				return obj
			}
		})
	}

}(jQuery))
