
var PaymentUtils = function() {
	var self = this;
	this.paymentFields = typeof JotForm !== "undefined" && JotForm.paymentFields;
	this.required = false; // For Validation
	// for store builder in jotform apps
	var fromStoreBuilder = window.JFAppsManager;
	var currencySymbolsByCode = {
		AUD: '$',
		BRL: 'R$',
		CAD: '$',
		CLP: '$',
		EUR: 'â‚¬',
		GBP: 'Â£',
		HKD: '$',
		JPY: 'Â¥',
		NZD: '$',
		SGD: '$',
		TRY: 'â‚º',
		USD: '$',
	};

	this.getForm = function() {
		return (JotForm.forms[0] == undefined || typeof JotForm.forms[0] == "undefined" ) ? $($$('.jotform-form')[0].id) : JotForm.forms[0];
	};

	this.isPaymentField = function(qid) {
		return Boolean($$('li.form-line[data-qid="' + qid + '" ]')[0]);
	};

	this.getProducts = function() {
		return window.productID;
	};

	this.getDonationField = function() {
		return $$('input[id*="_donation"]')[0];
	};

	this.getSelectedProducts = function() {
		var products = this.getProducts();
		var selectedProducts = [];
		$H(window.productID).each(function (pair) {
			if ($(pair.value) && $(pair.value).checked) {
				selectedProducts.push({
					id: pair.value,
					index: pair.key
				});
			}
		});

		return selectedProducts;
	}

	this.observeProducts = function(callback) {
		var paymentField = this.getPaymentField();
		var inputs = $(paymentField) ? $(paymentField).select('[type="checkbox"], [type="radio"]') : [];
		inputs.each(function(input) {
			if (!input) return;

			input.observe('change', function() {
				callback(input);
			})
		});

		const productContainers = $(paymentField) ? $(paymentField).select('.form-product-item-detail') : [];
		productContainers.each(function(productContainer) {
			if (!productContainer) return;
			const inputs = $(productContainer).select('[type="checkbox"], [type="radio"]');
			const dropdowns = $(productContainer).select('select');

			dropdowns.each(function(dropdown) {
				if (!dropdown) return;

				dropdown.observe('change', function(e) {
					if (!e.isTrusted) { return; }
					inputs.each(function(input) {
						if (!input) return;
						if (dropdown.value === 0 && input.checked === true) {
							input.checked = false;
							input.triggerEvent('change');
						} else if (input.checked === false) {
							input.checked = true;
							input.triggerEvent('change');
						}
					});
				});
			});
		});
	}

	this.getCurrencySymbolByCode = function() {
		var currencyCode = this.getCurrency();
		if (this.isDonation()) {
			currencyCode = document.querySelector('.donation_currency').innerText;
		}
		return currencySymbolsByCode[currencyCode] ? currencySymbolsByCode[currencyCode] : currencyCode;
	};

	// NEEDS REFACTOR
	this.getCurrencySymbols = function(code) {
		return currencySymbolsByCode[code];
	}

	this.getPaymentSummaryForCheckout = function() {
		var selectedProducts = this.getSelectedProducts();
		if (selectedProducts.length < 1) { return; }

		var paymentSummary = [];
		$this = this;
		selectedProducts.forEach(function(product) {
			var inputId = product.id;
      		var pid = product.id.split('_')[2];
			if (window.CardForm) {
				var clonedNameNode = document.querySelector('#product__title_' + pid).cloneNode(true);
				var clonedDescNode = clonedNameNode.querySelector('#product__description_' + pid);
				clonedNameNode.removeChild(clonedDescNode);

				var name = clonedNameNode.innerText;
				var price = document.querySelector('#' + inputId + '_price').innerText;
			} else {
				var name = document.querySelector('#product-name-' + inputId).innerText;
				var desc = '';
				if (document.querySelector('#product-name-description-' + inputId)) {
					desc = document.querySelector('#product-name-description-' + inputId).innerText;
				}
				var price = '';
				if (document.querySelector('#' + inputId + '_price')) {
					price = document.querySelector('#' + inputId + '_price').innerText;
				}
			}
			price = price === 'Free' || price === '' ? '0.00' : price;

			var backgroundImg;
			var imgSrc;
			var imageArea;
			// check if there is an image, then get src
			if (window.CardForm) {
				imageArea = document.querySelector('[data-pid="' + pid + '"] .product__header .product__image img');
				if (imageArea && !imageArea.classList.contains('null')) {
					backgroundImg = imageArea;
					if (backgroundImg) {
						imgSrc = backgroundImg.src;
					}
				}
			} else {
				imageArea = document.querySelector('[pid="' + pid + '"].form-product-item .form-product-item-detail .p_image .image_area');
				if (imageArea && !imageArea.classList.contains('upload_image')) {
					backgroundImg = imageArea.style.backgroundImage;
					if (backgroundImg) {
						imgSrc = backgroundImg.slice(4, -1).replace(/"/g, "");
					}
				}
				if (typeof imgSrc === 'undefined' && document.querySelector('[pid="' + pid + '"].form-product-item img')) {
					imgSrc = document.querySelector('[pid="' + pid + '"].form-product-item img').src;
				}
			}

			// PRICE & QUANTITY CALCULATION
			var productQty = JotForm.pricingInformations.items.filter(function (p) { // returns current product and product's values
				return p.finalProductID.split('_')[0] === pid;
			});
			
			var quantity = 0;
			var price = 0;

			if (productQty.length === 1) { // if product has no subproduct
				price = productQty[0].total_amount; // adding price for current product in checkout modal
				quantity = productQty[0].quantity; // adding quantity for current product in checkout modal
			} else if (productQty.length > 1) { // if product has subproduct
				// all calculations are addition in here because we're showing subproducts as 1 main product
				productQty.forEach(function (qty) {quantity += qty.quantity}) // calculating quantity for subproduct
				productQty.filter(function (subP) {
					price += subP.total_amount; // should come typeof *number* to avoid price.toFixed(2) crash
				})
			}

			// UNEXPECTED CASE, IF QUANTITY IS SOMEHOW ZERO
			if (quantity === '0' && (price > 0 || price !== '0')) {
				price = '0.00';
			}
			// UNEXPECTED CASE, CONVERT STRING FREE TO 0.00
			if (typeof price === 'string' && price.indexOf('Free') > -1) {
				price = '0.00';
			}

			if (price !== '0.00') {
				price = price.toFixed(2);
			}
			price = $this.getCurrencySymbolByCode() + price;

			paymentSummary.push({ name, desc, price, imgSrc, quantity });
		});

		return paymentSummary;
	};

	this.getTaxSurchargeData = function() {
		if (!JotForm.surchargeFieldId) { return {}; }

        const qid = JotForm.surchargeFieldId;
        const inputs = document.querySelectorAll(`#id_${qid} input, #id_${qid} select`);
        const val = Array.from(inputs).reduce((inputs, currentInput) => { return { ...inputs, [currentInput.getAttribute('data-component')]: currentInput.value } }, {});
        return { [qid]: val };
	};

	this.getSelectedProductInputs = function() {
		const items = document.querySelectorAll('.form-product-item');
        let selectedProducts = [];

        for (let i = 0; i < items.length; i++) {
            const pid = items[i].getAttribute(window.FORM_MODE === 'cardform' ? 'data-pid' : 'pid');
            let inputClass = '.form-product-input';
            if (window.FORM_MODE === 'cardform') {
                inputClass = items[i].querySelector('input.radioProduct-input') ? '.radioProduct-input' : '.checkboxProduct-input';
            }
            const productInput = items[i].querySelector(inputClass);

            if (productInput && productInput.checked && !items[i].classList.contains('sold_out_product')) {
                if (productInput.classList.contains('form-product-has-subproducts')) {
                    const itemPrices = Object.values(JotForm.prices).filter(price => price.quantityField && price.quantityField.includes(`quantity_${pid}`));

                    const selectedProduct = itemPrices.reduce((acc, currentPrice) => {
                        const quantityVal = document.getElementById(currentPrice.quantityField).value;
                        if (Number(quantityVal) <= 0) { return acc; }

                        const _customOptionValues = Object.entries(currentPrice).reduce((accumulator, p) => p[0].includes('customField_') || p[0].includes('quantityField') ? [...accumulator, document.getElementById(p[1]).value] : accumulator, []);
                        _customOptionValues.splice(currentPrice.expandedValueIndex, 0, currentPrice.expandedValue);

						const customOptionValues = _customOptionValues.reduce((acc, curr, i) => {
							acc[i] = curr;
							return acc;
						}, {});
                        return [...acc, { customOptionValues, quantity: quantityVal }]
                    }, []);

                    if (Object.entries(selectedProduct).length > 0) {
                        selectedProducts = [...selectedProducts, { [pid]: selectedProduct }];
                    }
                } else {
                    const productInputData = JotForm.prices[productInput.id];
                    if (!productInputData) {
                        continue;
                    }
                    const selectProductQuantity = typeof productInputData.quantityField !== 'undefined' ? document.getElementById(productInputData.quantityField).value : 1;
                    if (selectProductQuantity === '0') {
                        continue;
                    }

                    const _customOptionValues = Object.entries(productInputData).reduce((accumulator, p) => p[0].includes('custom_') || p[0].includes('quantityField') ? [...accumulator, document.getElementById(p[1]).value] : accumulator, []);
                    if (_customOptionValues.length === 0) { _customOptionValues.push('1'); }

					const customOptionValues = _customOptionValues.reduce((acc, curr, i) => {
						acc[i] = curr;
						return acc;
					}, {});

                    selectedProducts = [ ...selectedProducts, { [pid]: { 0: { customOptionValues, quantity: selectProductQuantity } } } ];
                }
            }
        }
        return selectedProducts;
	};

	this.getPaymentFieldsToSelectedProducts = function() {
		let paymentFieldWrapper = document.querySelector('.product-container-wrapper');

		if (window.FORM_MODE === 'cardform') {
			paymentFieldWrapper = document.querySelector('.jfProductModule-wrapper');
		}

		if (paymentFieldWrapper) {
			const fieldInputs = paymentFieldWrapper.querySelectorAll('input, select');
			const fieldNameIgnoreList = [
				'simple_fpc',
				'payment_transaction_uuid', 
				'payment_version', 
				'payment_total_checksum',
				'payment_discount_value'
			];

			/** Functions */
			const checkProductSelectorInput = id => /^input_\d+_\d+$/.test(id);
			const checkQuantityInput = id => /^input_\d+_quantity_\d+_\d+$/.test(id);
			const checkQuantityInputExtended = id => /^input_\d+_quantity_\d+_\d+_\d+$/.test(id);
			const checkExpandedProduct = id => /^\d+_expanded$/.test(id);
			const checkSpecialProductInput = (id, specialNumber) => new RegExp(`\\[special_${specialNumber}\\]`).test(id);
			const checkSpecialProductInputExtended = (id, specialNumber) => new RegExp(`\\[special_${specialNumber}_\\d+\\]\\[item_\\d+\\]`).test(id);
			const groupExtendedInputs = (inputs) => {
				let groupedData = {};
				let zeroQuantityData = {};
				let quantityData = {};
		
				inputs.forEach(({ id, name, value }) => {
						const match = name.match(/(\w+\[\w+\])\[(\w+)\]/);
						if (!match || !match[1] && !match[2]) return;
		
						const key = match[1];
						const index = match[2].split('_')[1];

						if (checkQuantityInputExtended(id)) {
							if (Number(value) <= 0) { zeroQuantityData[key] = true; return; }
							quantityData[key] = value;
						}
						groupedData[key] = {...(groupedData[key] || {}), [index]: value};
				});
		
				for (let key in zeroQuantityData) {
					if (zeroQuantityData.hasOwnProperty(key)) {
							delete groupedData[key];
					}
				}

				groupedData = Object.entries(groupedData).reduce((acc, [key, value]) => {
					const quantity = quantityData[key];
					return { ...acc, [key]: { customOptionValues: value, quantity: Number(quantity) } };
				}, {});

				return groupedData;
			}
			const getProductId = data => data.split('_')[0];
			/** Functions: End */

			const fieldInputsArray = Array.from(fieldInputs).filter(input => !fieldNameIgnoreList.includes(input.name));
			const getAllProduct = Array.from(fieldInputsArray).filter(input => checkProductSelectorInput(input.id));
			let selectedProducts = [];
		
			Array.from(getAllProduct).forEach(product => {
				if (product.checked === true && product.value && product.name) {
					const pid = getProductId(product.value);
					const isExpandedProduct = checkExpandedProduct(product.value);

					const specialProductInputs = Array.from(fieldInputsArray).filter(input => (checkSpecialProductInput(input.name, pid) || checkSpecialProductInputExtended(input.name, pid)));

					if (specialProductInputs.length === 0) {
						selectedProducts.push({ [pid]: { 0: { customOptionValues: { 0: '1' }, quantity: 1 } } });
					} else {
						if (!isExpandedProduct) {
							const customOptionValues = specialProductInputs.reduce((acc, input) => {
								const index = input.id.split('_').pop();
								return { ...acc, [index]: input.value };
							}, {});
							const quantity = specialProductInputs.find(input => checkQuantityInput(input.id));
							if (quantity && Number(quantity.value) <= 0) { return; }
							selectedProducts = [ ...selectedProducts, {[pid]: { 0: { customOptionValues, quantity: quantity ? Number(quantity.value) : 1 }}}];
						} else {
							const groupedData = groupExtendedInputs(specialProductInputs);
							if (Object.entries(groupedData).length > 0) { 
								selectedProducts = [ ...selectedProducts, { [pid]: Object.values(groupedData) }];	
							}
						}
					}
				}
			});
			return selectedProducts;
		}
	};

	this.getSelectedSubscriptionCustomData = function() {
		const products = document.querySelectorAll(window.FORM_MODE === 'cardform' ? '.product--subscription' : '.form-product-item');
        const productInputSelector = window.FORM_MODE === 'cardform' ? '.radioProduct-input' : '.form-product-input';
        const selectedSub = products && Array.from(products).find(product => product.querySelector(productInputSelector).checked);
        if (!selectedSub) { return {}; }

        const pid = selectedSub.getAttribute(window.FORM_MODE === 'cardform' ? 'data-pid' : 'pid');
        const customInputs = selectedSub.querySelectorAll('.form-product-custom_price');
        const subscription = { [pid]: { 0: { quantity: '1' } } };
        Array.from(customInputs).forEach(input => {
            if (input.id.includes('_custom_first_payment_price')) { subscription[pid][0].firstPayment = input.value; }
            if (input.id.includes('_custom_price')) { subscription[pid][0].price = input.value; }
        });

        return [subscription];
	};

	this.getSubscriptionPriceSummary = function() {
		const customData = this.getSelectedSubscriptionCustomData();
        const selectedSubscriptionPid = customData[0] && Object.keys(customData[0])[0];
        if (!selectedSubscriptionPid) { return {}; }
        const { firstPayment: customFirst, price: customRecur } = customData[0][selectedSubscriptionPid][0];
        const paymentFieldId = document.querySelector('input[name="simple_fpc"]').value;
        const pricesData = JotForm.prices[`input_${paymentFieldId}_${selectedSubscriptionPid}`];
        const { firstPaymentDiscount, recurPaymentDiscount } = JotForm.pricingInformations.general;

        const first = typeof customFirst !== 'undefined' ? customFirst : (pricesData.firstPaymentVal || 0);
        const recurring = typeof customRecur !== 'undefined' ? customRecur : (pricesData.recurring || 0);
        const first_discounted = (firstPaymentDiscount && JotForm.morePreciseToFixed(first - firstPaymentDiscount) > 0) ? JotForm.morePreciseToFixed(first - firstPaymentDiscount) : 0;
        const recurring_discounted = (recurPaymentDiscount && JotForm.morePreciseToFixed(recurring - recurPaymentDiscount) > 0) ? JotForm.morePreciseToFixed(recurring - recurPaymentDiscount) : 0;

        return {
            first: JotForm.morePreciseToFixed(first),
            recurring: JotForm.morePreciseToFixed(recurring),
            first_discounted,
            recurring_discounted,
            recurrence_interval: pricesData.recurrence_interval,
            recurrence_unit: pricesData.recurrence_unit,
            first_interval: pricesData.first_interval,
            first_unit: pricesData.first_unit,
            trial_interval: pricesData.trial_interval,
            trial_unit: pricesData.trial_unit,
            number_of_recurrence: pricesData.recurringtimes
        };
	};

	this.attachPaymentSummaryToForm = function() {
		const form = this.getForm();
		if (window.paymentType === 'product') {
			form.insert(new Element('input', {
				type: 'hidden',
				name: 'surchargeData'
			}).putValue(JSON.stringify(this.getTaxSurchargeData())));
			form.insert(new Element('input', {
				type: 'hidden',
				name: 'selectedProductsList'
			}).putValue(JSON.stringify(this.getSelectedProductInputs())));
			form.insert(new Element('input', {
				type: 'hidden',
				name: 'paymentFieldsToSelectedProducts'
			}).putValue(JSON.stringify(this.getPaymentFieldsToSelectedProducts())));
		}

		if (window.paymentType === 'subscription') {
			form.insert(new Element('input', {
				type: 'hidden',
				name: 'selectedSubscription'
			}).putValue(JSON.stringify(this.getSelectedSubscriptionCustomData())));
		}
		if (!!JotForm.donationField) {
			form.insert(new Element('input', {
				type: 'hidden',
				name: 'paymentSummary'
			}).putValue(JSON.stringify({ total: JotForm.donationField.value })));
		}
		if (JotForm.pricingInformations && JotForm.pricingInformations.general) {
			const {
				oldShippingTotal,
				shipping,
				taxTotalWithoutDiscount,
				tax_total,
				item_total,
				net_amount,
				discount,
				shippingDiscountVal
			} = JotForm.pricingInformations.general;
			const taxDiscountValue = parseFloat(JotForm.morePreciseToFixed(taxTotalWithoutDiscount - tax_total)) || 0;
			const shippingDiscountValue = parseFloat(shippingDiscountVal) || 0;
			const shippingDiscountApplied = JotForm.discounts.shipping;
			const isProductCoupon = Object.keys(JotForm.discounts).length > 0 && JotForm.discounts.code !== 'sub' && JotForm.discounts.code !== 'shipping';

			const paymentSummary = {
				shipping: JotForm.morePreciseToFixed(shippingDiscountApplied ? oldShippingTotal : shipping) || 0,
				shipping_discounted: JotForm.morePreciseToFixed(shipping) || 0,
				subtotal_discounted: JotForm.morePreciseToFixed(item_total - parseFloat(discount)) || 0,
				tax: JotForm.morePreciseToFixed(taxTotalWithoutDiscount) || 0,
				tax_discounted: JotForm.morePreciseToFixed(tax_total) || 0,
				subtotal: JotForm.morePreciseToFixed(item_total) || 0,
				total: JotForm.morePreciseToFixed(net_amount) || 0,
				...(window.paymentType === 'product' && { discount: JotForm.morePreciseToFixed(shippingDiscountValue + taxDiscountValue + parseFloat(discount)) || 0 }),
				...(window.paymentType === 'subscription' && { ...this.getSubscriptionPriceSummary() })
			};
			form.insert(new Element('input', {
				type: 'hidden',
				name: 'paymentSummary'
			}).putValue(JSON.stringify(paymentSummary)));
		}
	};

	this.observeDonationField = function(callback) {
		var donationField = self.getDonationField();
		var isCustomAmount = donationField && donationField.getAttribute('data-custom-amount-field') > 0;

		if (isCustomAmount) {
			var customAmountField = $('input_' + donationField.getAttribute('data-custom-amount-field'));
			if (!customAmountField) { return; }
			customAmountField.observe('change', callback);
		} else if (donationField) {
			$(donationField).observe('change', callback);
		}
	}

	this.paymentType = function() {
		return (typeof window.paymentType == 'undefined') ? 'donation' : window.paymentType;
	};

	this.isDonation = function(){
		return Boolean(!this.getProducts());
	};

	this.convertMonthNameToNumber = function(monthname) {
		if (!monthname) { return -1; }
		var arr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var findedIndex = arr.indexOf(monthname) + 1;
		if (findedIndex === 0) { return -1; }
		return findedIndex < 10 ? '0' + findedIndex : findedIndex;
	}

	this.getPaymentField = function() {
		var fpc = $$('input[name="simple_fpc"]')[0];
		return fpc && fpc.up('.form-line');
	}

	this.getPaymentFieldID = function(){
		var paymentField = this.getPaymentField();
		return paymentField.id.split("_")[1];
	};

	this.formHasErrors = function() {
		var hasErrors = false;
		$$("li.form-line").each(function(e,index){
			if( e.hasClassName('form-line-error')) {
				hasErrors = true;
			}
		});

		return hasErrors;
	};

	this.hasProductsSet = function() {
		var isSet = false, self = this;

		if(!this.isDonation()) {
			$H(this.getProducts()).each(function(pair){
				var elem = $(pair.value);

				if(elem && elem.checked) {
					isSet = true;
				}
			});
		} else {
			var donationElem = $('input_' + this.getPaymentFieldID() + '_donation');
			if (donationElem) {
				self.removeRequired(donationElem);
				if (this.isDonationInputValid(donationElem.getValue())) {
					isSet = true;
				}
			}
		}

		// if from app and is any product selected
		if (fromStoreBuilder && fromStoreBuilder.checkoutKey && fromStoreBuilder.cartProductItemCount > 0) {
			isSet = true;
		}

		return isSet;
	};

	this.hasCreditCardSet = function(type) {
		if (type === "1") {
			var a = this.getPaymentElements(type);
			var cc_number = a.cc_number.getValue();
			var cc_ccv = a.cc_ccv.getValue();
			var cc_exp_month = a.cc_exp_month.getValue();
			var cc_exp_year = a.cc_exp_year.getValue();
			var cc_firstName = a.cc_firstName.getValue();
			var cc_lastName = a.cc_lastName.getValue();
			return Boolean( cc_number && cc_ccv && cc_exp_month && cc_exp_year && cc_firstName && cc_lastName );
		} else {
			// Will be continue
		}
	};

	this.getPaymentElements = function(type) {
		if (type === "1") {
			return {
					cc_number: $$('.cc_number')[0],
					cc_ccv: $$('.cc_ccv')[0],
					cc_exp_month: $$('.cc_exp_month')[0],
					cc_exp_year: $$('.cc_exp_year')[0],
					cc_firstName: $$('.cc_firstName')[0],
					cc_lastName: $$('.cc_lastName')[0]
			};
		}
	};

	this.getCountryCode = function(country) {
		var countries = {
			'Afghanistan': 'AF',
			'Aland Islands': 'AX',
			'Albania': 'AL',
			'Algeria': 'DZ',
			'American Samoa': 'AS',
			'Andorra': 'AD',
			'Angola': 'AO',
			'Anguilla': 'AI',
			'Antarctica': 'AQ',
			'Antigua and Barbuda': 'AG',
			'Argentina': 'AR',
			'Armenia': 'AM',
			'Aruba': 'AW',
			'Australia': 'AU',
			'Austria': 'AT',
			'Azerbaijan': 'AZ',
			'Bahamas': 'BS',
			'Bahrain': 'BH',
			'Bangladesh': 'BD',
			'Barbados': 'BB',
			'Belarus': 'BY',
			'Belgium': 'BE',
			'Belize': 'BZ',
			'Benin': 'BJ',
			'Bermuda': 'BM',
			'Bhutan': 'BT',
			'Bolivia': 'BO',
			'Bonaire, Saint Eustatius and Saba': 'BQ',
			'Bosnia and Herzegovina': 'BA',
			'Botswana': 'BW',
			'Bouvet Island': 'BV',
			'Brazil': 'BR',
			'British Indian Ocean Territory': 'IO',
			'British Virgin Islands': 'VG',
			'Brunei': 'BN',
			'Bulgaria': 'BG',
			'Burkina Faso': 'BF',
			'Burundi': 'BI',
			'Cambodia': 'KH',
			'Cameroon': 'CM',
			'Canada': 'CA',
			'Cape Verde': 'CV',
			'Cayman Islands': 'KY',
			'Central African Republic': 'CF',
			'Chad': 'TD',
			'Chile': 'CL',
			'China': 'CN',
			'Christmas Island': 'CX',
			'Cocos Islands': 'CC',
			'Colombia': 'CO',
			'Comoros': 'KM',
			'Cook Islands': 'CK',
			'Costa Rica': 'CR',
			'Croatia': 'HR',
			'Cuba': 'CU',
			'Curacao': 'CW',
			'Cyprus': 'CY',
			'Czech Republic': 'CZ',
			'Democratic Republic of the Congo': 'CD',
			'Denmark': 'DK',
			'Djibouti': 'DJ',
			'Dominica': 'DM',
			'Dominican Republic': 'DO',
			'East Timor': 'TL',
			'Ecuador': 'EC',
			'Egypt': 'EG',
			'El Salvador': 'SV',
			'Equatorial Guinea': 'GQ',
			'Eritrea': 'ER',
			'Estonia': 'EE',
			'Ethiopia': 'ET',
			'Falkland Islands': 'FK',
			'Faroe Islands': 'FO',
			'Fiji': 'FJ',
			'Finland': 'FI',
			'France': 'FR',
			'French Guiana': 'GF',
			'French Polynesia': 'PF',
			'French Southern Territories': 'TF',
			'Gabon': 'GA',
			'Gambia': 'GM',
			'Georgia': 'GE',
			'Germany': 'DE',
			'Ghana': 'GH',
			'Gibraltar': 'GI',
			'Greece': 'GR',
			'Greenland': 'GL',
			'Grenada': 'GD',
			'Guadeloupe': 'GP',
			'Guam': 'GU',
			'Guatemala': 'GT',
			'Guernsey': 'GG',
			'Guinea': 'GN',
			'Guinea-Bissau': 'GW',
			'Guyana': 'GY',
			'Haiti': 'HT',
			'Heard Island and McDonald Islands': 'HM',
			'Honduras': 'HN',
			'Hong Kong': 'HK',
			'Hungary': 'HU',
			'Iceland': 'IS',
			'India': 'IN',
			'Indonesia': 'ID',
			'Iran': 'IR',
			'Iraq': 'IQ',
			'Ireland': 'IE',
			'Isle of Man': 'IM',
			'Israel': 'IL',
			'Italy': 'IT',
			'Ivory Coast': 'CI',
			'Jamaica': 'JM',
			'Japan': 'JP',
			'Jersey': 'JE',
			'Jordan': 'JO',
			'Kazakhstan': 'KZ',
			'Kenya': 'KE',
			'Kiribati': 'KI',
			'Kosovo': 'XK',
			'Kuwait': 'KW',
			'Kyrgyzstan': 'KG',
			'Laos': 'LA',
			'Latvia': 'LV',
			'Lebanon': 'LB',
			'Lesotho': 'LS',
			'Liberia': 'LR',
			'Libya': 'LY',
			'Liechtenstein': 'LI',
			'Lithuania': 'LT',
			'Luxembourg': 'LU',
			'Macao': 'MO',
			'Macedonia': 'MK',
			'Madagascar': 'MG',
			'Malawi': 'MW',
			'Malaysia': 'MY',
			'Maldives': 'MV',
			'Mali': 'ML',
			'Malta': 'MT',
			'Marshall Islands': 'MH',
			'Martinique': 'MQ',
			'Mauritania': 'MR',
			'Mauritius': 'MU',
			'Mayotte': 'YT',
			'Mexico': 'MX',
			'Micronesia': 'FM',
			'Moldova': 'MD',
			'Monaco': 'MC',
			'Mongolia': 'MN',
			'Montenegro': 'ME',
			'Montserrat': 'MS',
			'Morocco': 'MA',
			'Mozambique': 'MZ',
			'Myanmar': 'MM',
			'Namibia': 'NA',
			'Nauru': 'NR',
			'Nepal': 'NP',
			'Netherlands': 'NL',
			'New Caledonia': 'NC',
			'New Zealand': 'NZ',
			'Nicaragua': 'NI',
			'Niger': 'NE',
			'Nigeria': 'NG',
			'Niue': 'NU',
			'Norfolk Island': 'NF',
			'North Korea': 'KP',
			'Northern Mariana Islands': 'MP',
			'Norway': 'NO',
			'Oman': 'OM',
			'Pakistan': 'PK',
			'Palau': 'PW',
			'Palestinian Territory': 'PS',
			'Panama': 'PA',
			'Papua New Guinea': 'PG',
			'Paraguay': 'PY',
			'Peru': 'PE',
			'Philippines': 'PH',
			'Pitcairn': 'PN',
			'Poland': 'PL',
			'Portugal': 'PT',
			'Puerto Rico': 'PR',
			'Qatar': 'QA',
			'Republic of the Congo': 'CG',
			'Reunion': 'RE',
			'Romania': 'RO',
			'Russia': 'RU',
			'Rwanda': 'RW',
			'Saint Barthelemy': 'BL',
			'Saint Helena': 'SH',
			'Saint Kitts and Nevis': 'KN',
			'Saint Lucia': 'LC',
			'Saint Martin': 'MF',
			'Saint Pierre and Miquelon': 'PM',
			'Saint Vincent and the Grenadines': 'VC',
			'Samoa': 'WS',
			'San Marino': 'SM',
			'Sao Tome and Principe': 'ST',
			'Saudi Arabia': 'SA',
			'Senegal': 'SN',
			'Serbia': 'RS',
			'Seychelles': 'SC',
			'Sierra Leone': 'SL',
			'Singapore': 'SG',
			'Sint Maarten': 'SX',
			'Slovakia': 'SK',
			'Slovenia': 'SI',
			'Solomon Islands': 'SB',
			'Somalia': 'SO',
			'South Africa': 'ZA',
			'South Georgia and the South Sandwich Islands': 'GS',
			'South Korea': 'KR',
			'South Sudan': 'SS',
			'Spain': 'ES',
			'Sri Lanka': 'LK',
			'Sudan': 'SD',
			'Suriname': 'SR',
			'Svalbard and Jan Mayen': 'SJ',
			'Swaziland': 'SZ',
			'Sweden': 'SE',
			'Switzerland': 'CH',
			'Syria': 'SY',
			'Taiwan': 'TW',
			'Tajikistan': 'TJ',
			'Tanzania': 'TZ',
			'Thailand': 'TH',
			'Togo': 'TG',
			'Tokelau': 'TK',
			'Tonga': 'TO',
			'Trinidad and Tobago': 'TT',
			'Tunisia': 'TN',
			'Turkey': 'TR',
			'Turkmenistan': 'TM',
			'Turks and Caicos Islands': 'TC',
			'Tuvalu': 'TV',
			'U.S. Virgin Islands': 'VI',
			'Uganda': 'UG',
			'Ukraine': 'UA',
			'United Arab Emirates': 'AE',
			'United Kingdom': 'GB',
			'United States': 'US',
			'United States Minor Outlying Islands': 'UM',
			'Uruguay': 'UY',
			'Uzbekistan': 'UZ',
			'Vanuatu': 'VU',
			'Vatican': 'VA',
			'Venezuela': 'VE',
			'Vietnam': 'VN',
			'Wallis and Futuna': 'WF',
			'Western Sahara': 'EH',
			'Yemen': 'YE',
			'Zambia': 'ZM',
			'Zimbabwe': 'ZW'
		};
		
		return countries[country] || false;
	}

	this.getBillingFieldsValue = function(fieldName, qid, returnType) {
			if (fieldName === 'name') {
					var cc_firstName = $$('.cc_firstName')[0] ? $$('.cc_firstName')[0].getValue() : null;
					var cc_lastName = $$('.cc_lastName')[0] && $$('.cc_lastName')[0].getValue();

					return cc_firstName + " " + cc_lastName;
			} else if (fieldName === 'email') {
					var emailField = $$('li#id_'+ qid + ' input#input_' + qid)[0];

					if (!emailField) { return null; }
					var email = emailField.getValue();

					if (!email) return null;
					return email;
			} else if (fieldName === 'phone') {
					var parent = 'li#id_'+ qid;
					var c_code = $$(parent + ' input[type="tel"][data-component="countryCode"]')[0]; // Country Code
					var a_code = $$(parent + ' input[type="tel"][data-component="areaCode"]')[0]; // Area Code
					var phone = $$(parent + ' input[type="tel"][data-component="phone"]')[0]; // Phone Number
	
					if (!phone) return null;

					var str = '';
					var arr = {};
					if (c_code && c_code.getValue()) {
						str += '+' + c_code.getValue();
						arr.country_code = c_code.getValue();
					}
	
					if (a_code && a_code.getValue()) {
						str += a_code.getValue();
						arr.area_code = a_code.getValue();
					}
	
					if (phone && phone.getValue()) {
						str += phone.getValue();
						arr.phone = phone.getValue();
					}
	
					if (returnType === "array") return arr;

					return str;
			} else if (fieldName === 'address') {
					var addressObject = {};
					var addr = $$('li#id_'+ qid + ' .form-address-line')[0];

					if (addr) {
							addr = addr.up('.form-address-table');

							var countryValue = addr.select('.form-address-country')[0] && addr.select('.form-address-country')[0].getValue();

							addressObject.line1 = addr.select('[data-component="address_line_1"]')[0].getValue();
							addressObject.line2 = addr.select('[data-component="address_line_2"]')[0].getValue();
							addressObject.city = addr.select('[data-component="city"]')[0].getValue();
							addressObject.state = addr.select('[data-component="state"]')[0].getValue();
							addressObject.postal_code = addr.select('[data-component="zip"]')[0].getValue();
							addressObject.address_country = countryValue && this.getCountryCode(countryValue);
					}

					return addressObject;
			} else if (fieldName === "customData") {
					var field = $$('li#id_' + qid + ' input[data-type="input-textbox"]')[0];

					if (field) {
							return field.getValue();
					}

					return false;
			}
	}

	this.clearPaymentElements = function(type) {
		if (type === "1") {
			var a = this.getPaymentElems('1');
			a.cc_number.setValue('');
			a.cc_ccv.setValue('');
			a.cc_exp_month.setValue('');
			a.cc_exp_year.setValue('');
			a.cc_firstName.setValue('');
			a.cc_lastName.setValue('');

			if (this.isDonation()) {
				var paymentID = this.getPaymentFieldID();
				if ($('input_' + paymentID + '_donation')) {
					$('input_' + paymentID + '_donation').setValue('');
				}
			}
		}
	};

	this.removeRequired = function(elem) {
		var dClassName = elem.className;
		var dRegex = /validate\[(.*)\]/;

		if (dClassName.indexOf('required') > -1) {
			this.required = true;
		}

		if (dClassName.search(dRegex) > -1) {
			elem.className = dClassName.replace(dRegex, '');
		}
	};

	this.isDonationInputValid = function(dAmount) {
			if ( dAmount == "" || dAmount == 0 ) return false;
			return Boolean(dAmount && /^\d+(?:[\.,]\d+)?$/.test(dAmount));
	};

	this.getPrice = function(type) {
		if (!JotForm.pricingInformations) { // If the payment type not equal to sell products, then use this condition.
			if (type === "total" || type === "item_total") {
				return parseFloat(JotForm.paymentTotal);
			} else {
				return 0
			}
		}

		var prices = {
			total: JotForm.pricingInformations.general.net_amount || JotForm.paymentTotal || 0,
			item_total: JotForm.pricingInformations.general.item_total || 0,
			tax_total: JotForm.pricingInformations.general.tax_total || 0,
			discount: JotForm.pricingInformations.general.discount || 0,
			shipping: JotForm.pricingInformations.general.shipping || 0
		}

		if (prices.discount == 0) {
			prices.total = JotForm.pricingInformations.general.total_amount;
		}

		if (prices.total == 0 && this.isDonation()) {
			var donationElem = $('input_' + this.getPaymentFieldID() + '_donation');
			var storage =  window.JotStorage ? window.JotStorage : window.jQuery.jStorage || window.$.jStorage;

			var storageKey = 
					'form_' + $this.thisForm.getAttribute('id') +
					donationElem.id +
					donationElem.getAttribute('name') +
					'_jF';

			if (storage && storage.get(storageKey)) {
					totalAmount = parseFloat(storage.get(storageKey));
			}
		}

		return prices[type];
	};

	// Note: The currency won't came in User Defined Amount. Use v4-fields instead. FE: PaypalSPB, PaypalComplete.
	// Note2: I implemented JotForm Payment Configs. Use it :)
	this.getCurrency = function() {
		return (JotForm.currencyFormat && JotForm.currencyFormat.curr) || (JotForm.pricingInformations && JotForm.pricingInformations.general.currency) || (JotForm.paymentProperties && JotForm.paymentProperties.currency);
	};

	this.addElementToForm = function(props) {
		var form = this.getForm();

		form.insert(new Element(props.element, {
			name: props.name,
			type: props.type,
		}).putValue(props.value));
	}

	// Validations..

	this.correctErrors = function(elements) {
		elements.forEach(function(item){
			if (item) { JotForm.corrected(item) };
		});
	};

	this.observePaymentMethods = function(callback) {
		if (window.paymentType === 'subscription') { return; }
		const field = $$('[data-type="control_paymentmethods"]')[0];
		field.observe('click', function() {
			callback();
		});

		field.observe('change', function() {
			callback();
		});
	}

	// Check Is 100% percent coupon applied.
	this.checkCouponFullApplied = function() {
		if (JotForm.couponApplied && self.getPrice('total') <= 0 && self.hasProductsSet() && self.getPrice('discount') === self.getPrice('item_total')) {
			return true;
		}
		return false;
	}

	// if there is min order amount in the form, require payment field selection
	this.checkMinTotalOrderAmount = function(showError, input) {
		var ret = true;
		var isMinTotal = typeof JotForm.isValidMinTotalOrderAmount === 'function' ? !JotForm.isValidMinTotalOrderAmount() : JotForm.hasMinTotalOrderAmount() === true && JotForm.paymentTotal < parseInt(JotForm.minTotalOrderAmount);

		if (isMinTotal) {
			ret = false;
		}

		if (showError && ret == false && input) {
			JotForm.errored(input, self.getMintotalOrderAmountText());
		}

		return ret;
	}

	this.isProductTotalZero = function() {
		if (self.paymentType() === 'product' && self.hasProductsSet() && self.getPrice('total') <= 0) {
			return true;
		}
		return false;
	}

	this.getMintotalOrderAmountText = function() {
		return JotForm.texts.ccDonationMinLimitError.replace('{minAmount}', JotForm.minTotalOrderAmount).replace('{currency}', JotForm.currencyFormat.curr);
	}

	this.productClickObserver = function() {
		var products = this.getProducts();
		$H(products).each(function(pair) {
			var elem  = $(pair.value);
			if($(pair.value)) {
				elem.observe('click', function () {
					JotForm.corrected(elem);
				});
			}
		});
	}

	this.submitButtonHandler = function(process) {
		if (process === "setOldText") {
			$$('.form-submit-button').each(function(btn) {
				var btnText = (typeof btn.textContent !== 'undefined') ? btn.textContent : btn.innerText;
				btn.oldText = btnText;
				btn.setAttribute('data-oldtext', btnText);
			});
		} else if (process == 'restore') {
			setTimeout(function() {
				$$('.form-submit-button').each(function(button) {
						if (button.innerHTML.indexOf('<img') === -1) {
								var oldText = button.readAttribute('data-oldtext');
								button.innerHTML = oldText;
						}
						button.enable();
				});
			}, 50);
		}
	};

	this.enableRequiredField = function() {
		var enabledInputs = [];
		$$('#id_' + self.getPaymentFieldID() + ' .form-checkbox, .form-radio').each(function (el) {
			if (el.disabled && el.checked) {
				el.enable();
				enabledInputs.push(el);
			}
		});

		return enabledInputs;
	};

	this.disableRequiredField = function(inputs) {
		inputs.forEach(function(input) {
			input.disabled = true;
		});
	}

	// Control Form
	this.checkFormValidation = function(elements, hasCreditCardSet) {
		var paymentField = self.getPaymentField();
	
		var isPaymentFieldRequired = window.FORM_MODE == 'cardform' ?
		paymentField.select('.jfRequiredStar').length > 0 :
		paymentField.classList.contains('jf-required');

		if ((!JotForm.isVisible(paymentField) && !JotForm.isSectionTouched(paymentField))  //  inside a hidden (not collapsed) form collapse
						|| !JotForm.validateAll() // failed validation
						|| self.formHasErrors()
		){
				return false;
		}

		if (paymentField.getStyle('display') === "none" && !isPaymentFieldRequired) {
			return true;
		}

		self.correctErrors(elements);


		// If the coupon has been applied and affected 100% and the amount is 0 then exit this form validation. 
		if (self.checkCouponFullApplied()) {
			return true;
		}

		// If payment type is donation and the price is equal to or lower than 0, show error.
		if (self.hasProductsSet() && (self.getPrice('total') <= 0 && (self.paymentType() == 'donation'))) {
			return false;
		}

		// If the product has selected and if the card fields not setted.
		if ((self.hasProductsSet() && !hasCreditCardSet())) {
			return false;
		}

		return true;
	}

	this.checkPaymentValidation = function(hasCreditCardSet) {
		return self.hasProductsSet() && hasCreditCardSet();
	}

	this.observeFormSubmitAction = function(elements, hasCreditCardSet, input, callback) {
		// Note for developers: If you will use this function, please add gateway name to stoppedGateway function inside validator function.

		Event.observe(this.getForm(), 'submit', function (event) {
			if (self.hasProductsSet() && self.getPrice('total') <= 0 ) {
				return;
			}
			self.submitButtonHandler('setOldText');

			var enabledRequiredFields = self.enableRequiredField();
			var isValidated = self.checkFormValidation(elements, hasCreditCardSet);

			// If the coupon has been applied and affected 100% and the amount is 0 then exit this form validation. 
			if (self.checkCouponFullApplied()) {
				return;
			}

			if (isValidated) {
				// If the payment area filled then stop the event before resubmit.
				if (self.hasProductsSet() && hasCreditCardSet()) {
					Event.stop(event);
				}

				// If he forms that collects response but payment is not required, submitting form
				var isPaymentFieldRequired = self.getPaymentField().select('.jf-required').length > 0;
				if (!isPaymentFieldRequired && JotForm.paymentTotal === 0) { // we can also check data.items length
					callback(false);
					return;
				}

				callback(true);
			} else {
				Event.stop(event);
				var errors = "";

				if (self.hasProductsSet() && !hasCreditCardSet()) {
					errors += JotForm.texts.ccMissingDetails + ' ';
				} else if (!self.hasProductsSet() && hasCreditCardSet()) {
					if (self.isDonation()) {
						errors += JotForm.texts.ccMissingDonation;
					} else {
						errors += JotForm.texts.ccMissingProduct;
					}
				}

				if (errors.length > 0) {
					JotForm.errored(input, errors);
				}

				self.disableRequiredField(enabledRequiredFields);
				callback(false);
			}
		});
	}

	// REQUEST HANDLER

	this._xdr = function(url, method, data, callback, errback) {
		var req;
		if(XMLHttpRequest) {
				this.createXHRRequest(url, method, data, callback, errback);
		} else if(XDomainRequest) {
				req = new XDomainRequest();
				req.open(method, url);
				req.onerror = errback;
				req.onload = function() {
						callback(req.responseText);
				};
				req.send(data);
		} else {
				errback(new Error('CORS not supported'));
		}
	}

	this.createXHRRequest = function(url, method, data, callback, errback) {
			var req = new XMLHttpRequest();
			if('withCredentials' in req) {
					req.open(method, url, true);
					req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
					req.onerror = errback;
					req.onreadystatechange = function() {
							if (req.readyState === 4) {
								callback(req.responseText);
							}
					};
					req.send(data);
			}
	}

	//---Serialize objects for POST and PUT
	this.serialize = function(data) {
		var str = [];
		for(var p in data) {
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(data[p]));
		}
		return str.join("&");
	}

	this.getAPIEndpoint = function() {
		var origin = window.location.origin;

		if(origin && origin.indexOf('jotform.pro') > -1) {
				return origin + '/API';
		} else {
				return 'https://api.jotform.com';
		}
	}

}
