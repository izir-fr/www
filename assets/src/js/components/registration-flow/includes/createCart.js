// get selected event data for validation and recap
var getSelectedEpreuve = (form) => {
  var totalCart = 0
  var defautArray = {
    id: null,
    produit: null,
    qty: null,
    price: null,
    subTotal: null
  }

  form.data.cart.epreuve = []
  form.data.cart.options = []
  form.option.epreuve_format.team = false
  form.option.epreuve_format.individuel = false

  $('.epreuves').each((key, val) => {
    var id = $(val).find('input[name=id]')[0].value
    var produit = $(val).find('input[name=ref]')[0].value
    var qty = $(val).find('.quantity')[0].value
    var price = $(val).find('input[name=tarif]')[0].value
    var subTotal = qty * price
    $(val).find('.cart-subtotal').text(subTotal)

    var eventChoice = {
      id: id,
      produit: produit,
      qty: qty,
      price: price,
      subTotal: subTotal
    }

    totalCart += eventChoice.subTotal * 1

    if (eventChoice.subTotal > 0) {
      form.data.cart.epreuve.push(eventChoice)
    }

    // epreuve format save in form option
    if (subTotal >= 1) {
      var epreuveFormat = $(val).find('input[name=epreuve_format]')[0].value
      if (epreuveFormat === 'team') {
        form.option.epreuve_format.team = true
        form.option.team.min = $(val).find('input[name=team_min]')[0].value
        form.option.team.max = $(val).find('input[name=team_max]')[0].value
      } else if (epreuveFormat === 'individuel') {
        form.option.epreuve_format.individuel = true
      } else {
        form.option.epreuve_format.team = false
        form.option.epreuve_format.individuel = false
      }
    }
  })

  $('.options').each((key, val) => {
    var produit = $(val).find('input[name=ref]')[0].value
    var qty = $(val).find('input[name=quantity]')[0].value
    var price = $(val).find('input[name=tarif]')[0].value
    var subTotal = qty * price
    $(val).find('.cart-subtotal').text(subTotal)

    var optionChoice = {
      produit: produit,
      qty: qty,
      price: price,
      subTotal: subTotal
    }

    totalCart += optionChoice.subTotal * 1

    if (optionChoice.subTotal > 0) {
      form.data.cart.options.push(optionChoice)
    }
  })

  if ($('input[name=don]').length >= 1) {
    var don = $('input[name=don]').val() * 1
    form.data.cart.dons = don
    totalCart += don
  }

  $('#totalview')[0].innerHTML = totalCart
  form.data.cart.totalCart = totalCart

  if (form.data.cart.epreuve.length === 0) {
    form.data.cart.epreuve.push(defautArray)
  }

  return form
}

module.exports = getSelectedEpreuve
