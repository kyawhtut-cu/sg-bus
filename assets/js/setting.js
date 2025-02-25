(function (jQuery) {

	let Repo = null

	let dialogDiv = null
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
		const columnCountSelect = $('<select>', {
			'id': 'columnCount'
		})
		columnCountSelect.append(`<option value="" disabled selected>Choose columns</option>`)
		const columnCount = Repo.getColumnCount()
		for (let i = 1; i < 13; i++) {
			const option = new Option(i, i)
			if(i == columnCount) $(option).prop('selected', true)
			columnCountSelect.append(option)
		}
		const columnCountDiv = $('<div>', {
			'class': 'input-field col-md-5 col-sm-12 mb-0'
		})
		columnCountDiv.append(columnCountSelect)
		columnCountDiv.append(
			$('<label>').text('Choose number of columns')
		)

		const headerDiv = $('<div>', {
			'class': 'row align-items-center mb-0'
		})
		headerDiv.append(
			$('<h4>', {
				'class': 'col-md-7 col-sm-12'
			}).text('Setting')
		)
		headerDiv.append(columnCountDiv)

		settingCardList = $('<div>', {
			'style': 'flex-grow: 1; overflow-y: auto; padding: 0 24px;'
		})

		const contentDiv = $('<div>', {
			'style': 'height: calc(100% - 56px); display: flex; flex-direction: column;'
		})
		contentDiv.append(
			$('<div>', {
				'class': 'container-fluid',
				'style': 'padding: .912rem 24px 0px 24px;'
			}).append(headerDiv)
		)
		contentDiv.append(settingCardList)

		const btnAddNew = $('<button>', {
			'class': 'waves-effect waves-light btn-center btn-flat'
		})
		btnAddNew.append(
			$('<i>', {
				'class': 'material-icons'
			}).text('add')
		)
		btnAddNew.text('Add New')
		btnAddNew.on('click', onClickAddNew)

		const btnCancel = $('<button>', {
			'id': 'btnCancel',
			'class': 'waves-effect waves-light btn-center btn-flat'
		})
		btnCancel.text('Cancel')

		const btnSave = $('<button>', {
			'id': 'btnSave',
			'class': 'waves-effect waves-light btn-center btn-flat'
		})
		btnSave.text('Save')
		
		const footerDiv = $('<div>', {
			'class': 'modal-footer',
			'style': 'border-top: unset;'
		})
		footerDiv.append(btnAddNew)
		footerDiv.append(btnCancel)
		footerDiv.append(btnSave)

		dialogDiv = $('<div>', {
			'class': 'modal modal-fixed-footer'
		})

		dialogDiv.append(contentDiv)
		dialogDiv.append(footerDiv)

		$('body').append(dialogDiv)

		columnCountSelect.formSelect()

		dialogDiv.modal({
			opacity: 0.2,
			inDuration: 300,
			outDuration: 200,
			dismissible: false
		})
	}

	async function open() {
		init()

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

				onAddCard(object, savedBusList.length == index + 1)
				
				return object
			})
		)

		return new Promise((resolve, reject) => {
			$('#btnCancel').on('click', function () {
				$('#columnCount').val(Repo.getColumnCount())
				$('#columnCount').formSelect()

				busServiceList = []
				busStopList = []
				
				dialogDiv.modal('close')
				onDestroy()
				resolve(false)
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

				dialogDiv.modal('close')
				onDestroy()
				resolve(isHasChanges)
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
		onAddCard(_.last(busServiceList), true)

		settingCardList.animate(
			{
				scrollTop: settingCardList[0].scrollHeight
			},
			300
		)
	}

	function onAddCard(busService, isApplyAutoComplete) {
		settingCardList.append(getCard(busService))

		$(`#busServiceNo${busService.index}`).formSelect()

		if (!isApplyAutoComplete) return
		let data = {}
		busStopList.forEach(busStop => data[busStop.bus_stop_name] = null )
		$(`input.busStopName`).autocomplete({
			data,
			limit: 5,
			onAutocomplete: function(val) {
			},
			minLength: 0
		})
	}

	function getCard(busService) {
		/* Bus Stop Input */
		const busStopNameInput = $('<input>', {
			'id': `busStopName${busService.index}`,
			'type': 'text',
			'class': 'autocomplete busStopName',
			'value': busService.bus_stop_name ?? ``
		})
		busStopNameInput.on('blur', function () {
			setTimeout(function() {
				if (busService.bus_stop_name != busStopNameInput.val()) {
					busService = _.set(busService, 'bus_service_no', '')
				}
				busService = _.set(busService, 'bus_stop_name', busStopNameInput.val())
				busService = _.set(
					busService,
					'bus_stop_code',
					_.find(
						busStopList, 
						{
							bus_stop_name : busService.bus_stop_name
						}
					)?.bus_stop_code
				)
				onDataUpdateByIndex(
					busService.index,
					busService
				)
				setBusServiceNoList(
					busService,
					busServiceNoInput
				)
				busServiceNoInput.formSelect()
			}, 100)
		})
		const busStopNameLabel = $('<label>', {
			'for': `busStopName${busService.index}`
		}).text('Bus Stop Name')
		if(busService.bus_stop_name) {
			busStopNameLabel.addClass('active')
		}
		const busStopName = $('<div>', {
			'class': 'input-field w-100'
		})
		busStopName.append(busStopNameInput)
		busStopName.append(busStopNameLabel)

		/* Bus Service No Input */
		const busServiceNoInput = $('<select>', {
			'id': `busServiceNo${busService.index}`
		})
		setBusServiceNoList(busService, busServiceNoInput)
		busServiceNoInput.on('change', function() {
			busService = _.set(busService, 'bus_service_no', $(this).val())
			busService = _.set(busService, 'is_error', false)
			busService = _.set(busService, 'is_show_error', false)
			onDataUpdateByIndex(
				busService.index,
				busService
			)
		})
		const busServiceNoLabel = $('<label>').text('Bus Service No.')
		const busServiceNo = $('<div>', {
			'class': 'input-field w-100'
		})
		busServiceNo.append(busServiceNoInput)
		busServiceNo.append(busServiceNoLabel)

		const btnTrash = $('<i>', {
			'class': 'material-icons waves-effect btn-flat setting-trash'
		}).text('delete_forever')

		btnTrash.on('click', function () {
			card.remove()
			_.remove(busServiceList, busService)
		})

		const label = $('<h4>', {
			'class': 'grey-text text-lighten-1'
		})
		label.text(busService.bus_label)

		const card = $('<div>', {
			'class': 'card-panel',
			'style': 'position: relative;'
		})
		card.append(label)
		card.append(busStopName)
		card.append(busServiceNo)
		card.append(btnTrash)
		
		return card
	}

	function setBusServiceNoList(busService, select) {
		select.empty()

		const selectedBusServiceNo = busService.bus_service_no
		const optionList = _.find(
			busStopList, 
			{
				bus_stop_name : busService.bus_stop_name
			}
		)?.bus_service_no_list?.map( serviceNo => {
			const option = new Option(serviceNo, serviceNo)
			$(option).prop('selected', serviceNo == selectedBusServiceNo)
			return option
		}) ?? []
		select.prop('disabled', _.isEmpty(optionList))

		const defaultOption = new Option("Choose Bus Service No.", "-1")
		$(defaultOption).prop('disabled', true)
		$(defaultOption).prop('selected', selectedBusServiceNo ? false : true)
		select.append(defaultOption)

		optionList.forEach( option => {
			select.append(option)
		})

		busService = _.set(busService, 'is_error', selectedBusServiceNo == '')
		if(selectedBusServiceNo != '') {
			busService = _.set(busService, 'is_show_error', false)
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

	function onDestroy() {
		setTimeout(() => {
			dialogDiv.remove()
		}, 1000)
	}

}(jQuery))
