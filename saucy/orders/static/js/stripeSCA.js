var _StripeSCAValidation = function()
{
    this.required = false;
    this.thisForm = null;
    this.products = {};
    this.billing_address_qid = false;
    this.shipping_address_qid = false;
    this.email_qid = false;
    this.phone_qid = false;
    this.currency = "";
    this.customer_id = null;
    this.lastFourDigit = null;
    this.cardNumberError = true;
    this.cardExpiryError = true;
    this.cardCcvError = true;
    this.stripeToken = "";
    var $this = this;
    this.processID = Date.now().toString();
    this.formValidationErrorClass = 'form-validation-error';
    // to prevent rage enter press, control the submit flow
    this.toggleSubmitFlow = false;
    this.jfTransactionLogID = false;
    this.isCardDataValid = true;

    /**
     * Initialization
     */
    this.init = function(pubKey)
    {
        //if the Form provided by JotForm object is empty
        //get it directly from the DOM
        this.thisForm = (JotForm.forms[0] == undefined || typeof JotForm.forms[0] == "undefined" ) ? $($$('.jotform-form')[0].id) : JotForm.forms[0];
        var formID = this.thisForm.getAttribute('id');
        this.setCurrency();
        this.isStripePE = true;
        if (typeof JotForm.tempStripeCEForms !== 'undefined' && JotForm.tempStripeCEForms.includes(formID)) {
            this.isStripePE = false;
        }
        if (window.location.search === '?stripeLinks=1' || (typeof JotForm.stripeLink !== 'undefined' && JotForm.stripeLink === 'Yes')) {
            this.isStripePE = true;
        }

        if (this.isStripePE) {
            this.stripe = Stripe(pubKey, {
                betas: ['elements_enable_deferred_intent_beta_1', 'deferred_intent_pe_optional_amount_beta_0'],
            });
            this.showPaymentElements();
            this.initializePaymentElements();
        } else {
            this.stripe = Stripe(pubKey);
            this.handleMount();
        }

        //if not a donation
        if(!this.isDonation()) {
            var products = this.getProducts();
            var self = this;
            
            $H(products).each(function(pair) {
                var elem  = $(pair.value);
                if($(pair.value)) {
                    //for each of the product attach an event
                    elem.observe('click', function () {
                        self.correctErrors();
                    });
                }
            });
        }

        //form observer
        this.formObserver();
    };

    this.showPaymentElements = function () {
        if (window.FORM_MODE === 'cardform') {
            document.querySelector("div[id=payment-element].payment-element").style.display='block';
            document.querySelector("div[data-type=cc_number]").style.display='none';
            document.querySelector("div[data-type=cc_ccv]").style.display='none';
            document.querySelector("div[data-type=cc_exp_month]").style.display='none';
        } else {
            document.querySelector("div[id=payment-element].payment-element").style.display='block';

            var formAddressTable = document.getElementsByClassName('form-address-table');
            if (formAddressTable.length > 0 && window.getComputedStyle(formAddressTable[0]).getPropertyValue('max-width') !== 'none') {
                var formAddressTableMaxWidth = window.getComputedStyle(formAddressTable[0]).getPropertyValue('max-width');
                document.querySelector("div[id=payment-element].payment-element").style.width = formAddressTableMaxWidth;
            }

            document.getElementsByClassName('if_cc_field')[0].style.display='none';
            document.getElementsByClassName('cc_cardExpiryMount')[0].style.display='none';
        }
    };

    this.getPaymentMethodTypes = function () {
        // return ['card', 'link', 'afterpay_clearpay', 'klarna'];
        // return ['card', 'link', 'afterpay_clearpay'];
        if (window.location.search === '?stripeLinks=1' || (typeof JotForm.stripeLink !== 'undefined' && JotForm.stripeLink === 'Yes')) {
            return ['card', 'link'];
        }
        return ['card'];
    };

    this.paymentElementAppearance = function () {
        var inputBackgroundColor = window.getComputedStyle(document.getElementsByClassName('form-textbox')[0]).getPropertyValue('background-color');
        // var inputFontSize = window.getComputedStyle(document.getElementsByClassName('form-sub-label')[0]).getPropertyValue('font-size');  We can use them for further development
        // var inputFontColor = window.getComputedStyle(document.getElementsByClassName('form-sub-label')[0]).getPropertyValue('color');

        return {
            variables: {
                // colorPrimary: '#0570de',
                colorPrimary: '#2c3345',
                // fontSizeBase: 'fontSize2Xs',
                colorBackground: inputBackgroundColor,
                // colorText: '#30313d',
                colorText: '#2c3345',
                colorDanger: '#df1b41',
                fontFamily: 'roboto, sans-serif',
                spacingUnit: '0px',
                // See all possible variables https://stripe.com/docs/elements/appearance-api#variables
            },
            rules: {
                '.AccordionItem': {
                    border: 'none'
                },
                '.Tab--selected': {
                    backgroundColor: 'var(--colorBackground)',
                    boxShadow: 'none',
                    border: 'none',
                },
                '.Label': {
                    opacity: '0',
                    fontSize: '0px'
                },
                '.Input': {
                    borderColor: '#b8bdc9',
                    fontSize: '14px'
                },
                '.Input:focus': {
                    borderColor: '#2e69ff',
                },
                '.Error': {
                    fontSize: 0
                }
            },
            // labels: 'floating'
        };
    };

    this.setupOptions = function () {
        if (this.paymentType() === 'subscription' || JotForm.isLaterCharge === 'later') {
            return {
                mode: 'setup', //payment or setup
                currency: this.currency.toLowerCase(),
                appearance: this.paymentElementAppearance(),
                payment_method_types: this.getPaymentMethodTypes()
            };
        }
        var isPreview = getQuerystring('preview');
        return {
            mode: 'payment', //payment or setup
            amount: this.getTotalAmount() === 0 || isIframeEmbedForm() || isPreview ? null : this.getTotalAmount(),
            currency: this.currency.toLowerCase(),
            appearance: this.paymentElementAppearance(),
            payment_method_types: this.getPaymentMethodTypes()
        };
    }

    this.paymentElementOptions = function () {
        return {
            layout: {
                type: 'tabs', // for only credit cards use tabs, if there is more payment methods use accordion
                defaultCollapsed: true
            },
            wallets: {
                googlePay: 'never',
                applePay: 'never'
            },
            // fields: {
            //     billingDetails: {
            //         address: {
            //             country: 'never'
            //         }
            //     }
            // },
            // paymentMethodOrder: ['klarna', 'card', 'link']
        };
    }

    this.updateElementAmount = function () {
        if (this.paymentType() === 'subscription' || JotForm.isLaterCharge === 'later') {
            return true;
        }
        if (this.elements && typeof this.elements !== undefined) {
            var amount = Math.trunc(this.getTotalAmount());
            this.elements.update({ amount: amount <= 0 ? null : amount });
        }
    };

    this.updateElementEmail = function (email) {
        if (this.elements && typeof this.elements !== undefined) {
            var billingDetails = {
                defaultValues: {
                    billingDetails: {
                        email: email
                    }
                }
            };
            this.paymentElement.update(billingDetails);
            console.log('PaymentElements',  this.elements.getElement('payment'));
        }
    };



    /**
     * Initialize Stripe payment elements.
     */
    this.initializePaymentElements = function() {
        var $this = this;
        var formType = window.FORM_MODE; // for style changes according to cardform or v4

        try {
            var setupOptions = this.setupOptions();
            $this.elements = this.stripe.elements(setupOptions);

            // Create and mount the Payment Element
            var paymentElementOptions = this.paymentElementOptions();
            $this.paymentElement = $this.elements.create('payment', paymentElementOptions);
            $this.paymentElement.mount('#payment-element');
            $this.paymentElement.on('change', function(event) {
                $this.isCardDataValid = event.complete;
                if (event.complete) {
                    JotForm.corrected($('stripesca_dummy'));
                }
            });
        } catch (e) {
            this.errored($('stripesca_dummy'), e);
        }

        // TODO:: [payment elements] New Stripe Validation is required for payment elements errors
        // this.handleStripeValidations();
    };

    /**
     * Mount stripe elements.
    */
    this.handleMount = function() {
      var $this = this;
      var formType = window.FORM_MODE;
      var style = {};

      if (formType === 'cardform') {
            style = {
                base: {
                    fontSize: '1.1em',
                    fontFamily: 'roboto, sans-serif',
                    '::placeholder': {
                        color: '#aaa',
                        fontWeight: '400',
                        fontSize: '1.1em'
                      },
                },
            }
        } else {
            style = {
                base: {
                    fontFamily: 'roboto, sans-serif',
                }
            }
        }

        var elements = this.stripe.elements();
        
        var cc_number_sublabel = 'â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢';
        if (document.getElementById('sublabel_cc_number') && document.getElementById('sublabel_cc_number').textContent && document.getElementById('sublabel_cc_number').textContent.replace(/\s/g, '') !== '') {
          cc_number_sublabel = document.getElementById('sublabel_cc_number').textContent;
        }
        var cc_number = elements.create('cardNumber', {
          placeholder: cc_number_sublabel,
          style: style
        });
  
        var cc_cvv_sublabel = 'CVC';
        if (document.getElementById('sublabel_cc_ccv') && document.getElementById('sublabel_cc_ccv').textContent && document.getElementById('sublabel_cc_ccv').textContent.replace(/\s/g, '') !== '') {
          cc_cvv_sublabel = document.getElementById('sublabel_cc_ccv').textContent;
        }
        var cc_ccv = elements.create('cardCvc', {
          placeholder: cc_cvv_sublabel,
          style: style
        });
        
        var cc_card_expiry_sublabel = 'MM/YY';
        if (document.getElementById('sublabel_cc_card_expiry') && document.getElementById('sublabel_cc_card_expiry').textContent && document.getElementById('sublabel_cc_card_expiry').textContent.replace(/\s/g, '') !== '') {
          cc_card_expiry_sublabel = document.getElementById('sublabel_cc_card_expiry').textContent;
        }
        var cc_card_expiry = elements.create('cardExpiry', {
          placeholder: cc_card_expiry_sublabel,
          style: style
        });
        
        
        cc_number.mount('.cc_numberMount');
        cc_ccv.mount('.cc_ccvMount');
        cc_card_expiry.mount('.cc_cardExpiryMount');

        $this.cc_number = cc_number;
        $this.cc_ccv = cc_ccv;
        $this.cc_card_expiry = cc_card_expiry;

        this.handleStripeValidations();

        this.cardNumber = cc_number;
    };

    /**
     * Set the qid for fields
     */

    this.setFields = function(billing_qid, shipping_qid, email_qid, phone_qid, custom_field_qid)
    {
        this.billing_address_qid = (!billing_qid || billing_qid=='none') ? false : billing_qid;
        this.shipping_address_qid = (!shipping_qid || shipping_qid=='none') ? false : shipping_qid;
        this.email_qid = (!email_qid || email_qid=='none') ? false : email_qid;
        this.phone_qid = (!phone_qid || phone_qid=='none') ? false : phone_qid;
        this.custom_field_qid = (!custom_field_qid || custom_field_qid=='none') ? false : custom_field_qid;
    };

    /**
     * Set the currency code for stripe intent
     */
    this.setCurrency = function()
    {
        var stripeWrapper = document.querySelector('.stripe-payment-wrapper');
        var currency = stripeWrapper ? stripeWrapper.getAttribute('data-stripe-currency') : JotForm.pricingInformations.general.currency;
        this.currency = currency;
    };

    /**
     * Stripe need to as cent for currency.
     */
    this.getTotalAmount = function() {
        var totalAmount = typeof JotForm.paymentTotal !== 'undefined' ?
            parseFloat(JotForm.paymentTotal) :
            (JotForm.pricingInformations ? parseFloat(JotForm.pricingInformations.general.net_amount) : 0);
            
        // reason of these changes is allowing to submit subscriptions with first payment & 100% discount coupon
        var firstPaymentDiscount = JotForm.pricingInformations && JotForm.pricingInformations.general ? JotForm.pricingInformations.general.firstPaymentDiscount : 0;
        var isCardform = window.FORM_MODE === 'cardform';
        var discountTypes = ['100.00-percent-first', '100-percent-first']; // for only 100% discount coupons
        // total & subscription check
        if (totalAmount === 0 && window.paymentType === 'subscription') {
            // firstPaymentDiscount whether exist or not
            if (firstPaymentDiscount && firstPaymentDiscount !== 0) { 
                // get checked subs pid & compare in JotForm.discounts check 100.00-percent-first
                var checkedProduct = '';
                if (isCardform) {
                    checkedProduct = Array.from(document.getElementsByClassName('product--subscription product--selected'))[0].dataset.pid;
                } else {
                    Array.from(document.getElementsByClassName('form-radio  form-product-input')).find(function(i) {
                        if (i.checked === true) {
                            checkedProduct = i.id.split('_')[2];
                        };
                    });
                }
                if (JotForm.discounts && discountTypes.includes(JotForm.discounts[checkedProduct])) {
                    totalAmount = JotForm.pricingInformations.general.firstPaymentDiscount;
                }
            }
        } 

        if (totalAmount == 0 && this.isDonation()) {
            var donationElem = $('input_' + this.getPaymentFieldID() + '_donation');
            var storage =  window.JotStorage;
            if (typeof storage === 'undefined') {
                storage =  window.jQuery ? window.jQuery.jStorage : window.$.jStorage;
            }
            var storageKey = 
                'form_' + $this.thisForm.getAttribute('id') +
                donationElem.id +
                donationElem.getAttribute('name') +
                '_jF';

            if (storage && storage.get(storageKey)) {
                totalAmount = parseFloat(storage.get(storageKey));
            }
        }
        // Stripe Payment Element expects amount in cents
        if (this.isStripePE) {
            totalAmount = Math.round(totalAmount * 100);
        }

        // If initial value of the amount is bigger than 0 but less than min usd amount of Stripe,
        // set amount as 0 to pass null to Stripe (deferred_intent_pe_optional_amount_beta_0)
        if (totalAmount < 50) {
            totalAmount = 0;
        }
        return totalAmount || 0;
    };

    /**
     * get products if any
     * global product id (array-like) object passed from question_definitions.js
     */
    this.getProducts = function()
    {
        return window.productID;
    };

    /**
    * check if payment form is donation, subscription or product purchase 
    **/
    this.paymentType = function() {
        return (typeof window.paymentType == 'undefined') ? 'donation' : window.paymentType;
    };

    this.addElementToForm = function(name, type, element, value)
    {
        this.thisForm.insert(new Element(element, {
            name: name,
            type: type,
        }).putValue(value));
    }

    /**
     * Get the ID of the payment question tool
     */
    this.getPaymentFieldID = function() {
        return (($('stripesca_dummy').up('li.form-line').id).split("_"))[1];
    };

    /**
     * Check whether the payment is donation or not
     */
    this.isDonation = function() {
        // if there is no product id and -window.paymentType is product or subscription- if paymentType is undefined, we can say that it is donation
        return typeof window.paymentType === 'undefined' && Boolean(!this.getProducts());
    };

    /**
     * Validate donation input field
     */
    this.isDonationInputValid = function(dAmount)
    {
        if ( dAmount == "" || dAmount == 0 ) return false;
        return Boolean(dAmount && /^\d+(?:[\.,]\d+)?$/.test(dAmount));
    };

    /**
     * Check if form has errors
     */
    this.formHasErrors = function()
    {
        var hasErrors = false;
        $$("li.form-line").each(function (e) {
            if (e.hasClassName('form-line-error') || e.select('.form-validation-error').length > 0) {
                hasErrors = true;
            }
        });

        if (typeof ValidatePaymentGateways !== 'undefined' && ValidatePaymentGateways.validate('stripe') === false) {
            hasErrors = true;
        }

        return hasErrors;
    };

    /**
     * Get Form Field Values
    */

    this.getField = function(fieldName, qid)
    {
        if (fieldName === 'name') {
            var cc_firstName = $$('.cc_firstName')[0].getValue();
            var cc_lastName = $$('.cc_lastName')[0].getValue();
            
            return cc_firstName + " " + cc_lastName;   
        } else if (fieldName === 'email') {
            var paymentEmailField = $$('.form-address-table input.cc_email[data-component="cc_email"]')[0];
            var emailField = $$('li#id_'+ qid + ' input#input_' + qid)[0];
            var email = null;
            
            if (paymentEmailField) {
                email = paymentEmailField.getValue();
            } else if (emailField) {
                email = emailField.getValue();
            }

            if (!email) return null;
            return email;
        } else if (fieldName === 'phone') {
            var parent = 'li#id_'+ qid;
            var c_code = $$(parent + ' input[type="tel"][data-component="countryCode"]')[0]; // Country Code
            var a_code = $$(parent + ' input[type="tel"][data-component="areaCode"]')[0]; // Area Code
            var phone = $$(parent + ' input[type="tel"][data-component="phone"]')[0]; // Phone Number
    
            if (!phone) return null;

            var str = '';
            if (c_code && c_code.getValue()) {
                str += '+' + c_code.getValue();
            }
    
            if (a_code && a_code.getValue()) {
                str += a_code.getValue();
            }
    
            if (phone && phone.getValue()) {
                str += phone.getValue();
            }
    
            return str;
        } else if (fieldName === 'address') {
            var addressObject = {};
            var addr = $$('li#id_'+ qid + ' .form-address-line')[0];

            if (addr) {
                addr = addr.up('.form-address-table');
                addressObject.line1 = addr.select('[data-component="address_line_1"]')[0].getValue();
                addressObject.line2 = addr.select('[data-component="address_line_2"]')[0].getValue();
                addressObject.city = addr.select('[data-component="city"]')[0].getValue();
                addressObject.state = addr.select('[data-component="state"]')[0].getValue();
                addressObject.postal_code = addr.select('[data-component="zip"]')[0].getValue();
            }
            // addressObject.address_country = addr.select('.form-address-country')[0].getValue();

            return addressObject;
        } else if (fieldName === "customData") {
            var field = $$('li#id_' + qid + ' input[data-type="input-textbox"]')[0];

            if (field) {
                return field.getValue();
            }

            return false;
        }
    }

    /**
     * Check if a product is set
     * for donation, check if not empty
     */
    this.hasProductsSet = function() {
        var isSet = false;
        var self = this;

        // check whether a product is selected or not for non-donation
        if(!this.isDonation())
        {
            // check if donation or product/subscription
            $H(this.getProducts()).each(function(pair){
                var elem = $(pair.value);

                //if the product as a class name validate, set the requried var to true
                //remove any validation for the field sto works best with stripe validation
                if (elem) {
                    self.removeRequired(elem);
                }

                if(elem && elem.checked) {
                    isSet = true;
                }
            });

            if (window.paymentType === 'product' && (window.JFAppsManager && window.JFAppsManager.checkoutKey && window.JFAppsManager.cartProductItemCount > 0)) {
                isSet = true;
            }
        }
        else
        {
            var donationElem = $('input_' + this.getPaymentFieldID() + '_donation');
            if ( donationElem )
            {
                self.removeRequired( donationElem );
                if ( this.isDonationInputValid( donationElem.getValue() ) )
                {
                    isSet = true;
                }
            }
        }

        //remove any required for the payment inputs to work best with stripe validation
        self.removeRequiredForPayments();

        return isSet;
    };

     /**
     * Check if CC details is filled up
     */
    this.hasCreditCardSet = function() {
        // TODO:: [payment elements] For Payment Elements, check credit card set by listening payment elements
        if (this.isStripePE) {
            return true;
        }
        return !Boolean(this.cardNumberError || this.cardExpiryError || this.cardCcvError);
    };

    this.validateStripe = function() {
        JotForm.corrected($('stripesca_dummy'));
        var validationStripe = this.hasCreditCardSet();

        if (validationStripe === false) {
            var messages = this.getErrorMessage();
            
            if (messages) {
                this.errored($('stripesca_dummy'), messages);
            }
        }

        return validationStripe;
    }


    /**
     * Get payment associated elements
     */
    this.getPaymentElems = function()
    {
        //get cc elements
        return [
            $$('.cc_firstName')[0],
            $$('.cc_lastName')[0],
            $('stripesca_dummy'),
        ]
    };

    /**
     * Clear payment inputs
     */
    this.clearPaymentDetails = function()
    {
        // TODO:: [payment elements] clear pe details if needed
        if (typeof this.cc_number !== 'undefined') {
            this.cc_number.clear();
            this.cc_ccv.clear();
            this.cc_card_expiry.clear();
        }

        if (this.isDonation()) {
            var paymentID = this.getPaymentFieldID();
            if ($('input_' + paymentID + '_donation')) {
                $('input_' + paymentID + '_donation').setValue('');
            }
        }
    };

    /**
     * Correct any jotform errors
     */
    this.correctErrors = function()
    {
        var f = this.getPaymentElems();

        f.forEach(function(item)Â {
            if (item) {
                JotForm.corrected(item);
            }
        });
    };

    this.resetButton = function()
    {
        setTimeout(function() {
            $$('.form-submit-button').each(function(bu) {
                if (bu.innerHTML.indexOf('<img') === -1) {
                    var oldText = bu.readAttribute('data-oldtext');
                    if (oldText) { bu.innerHTML = oldText; }
                }
                bu.enable();
            });
        }, 50);
    };

    this.errored = function (el, message) {

        const stripedMessage = message ? message.toString().replace( /(<([^>]+)>)/ig, ' ') : message

        JotForm.errored(el, stripedMessage);
        // on multi-page forms, attach error to submit button if it is in a page separate from the Stripe fields

        if (!$('stripesca_dummy').isVisible()
            && !$('stripesca_dummy').up('li').hasClassName('form-field-hidden') // not hidden by condition
            && !$('stripesca_dummy').up('ul').hasClassName('form-field-hidden') // not inside a form collapse hidden by a condition
            && $$('ul.form-section.page-section').length > 1)  // this is a multipage form
        {
            // get the visible submit button
            if (true) {
                // clear prior stripe errors
                $$('.form-stripe-error').invoke('remove');
                $$('.form-submit-button').each(function (button) {
                    var errorBox = new Element('div', {className: 'form-button-error form-stripe-error'});
                    errorBox.insert('<p>' + message+ '</p>');
                    $(button.parentNode.parentNode).insert(errorBox);
                });
            }

        }
    }

    /**
     * Remove any required validation for the payment
     * to work best with stripe validation
     */
    this.removeRequiredForPayments = function()
    {
        $('stripesca_dummy').up('.form-address-table').select('input,select').each(function(elem){
            $this.removeRequired(elem);
        });
    };

    /**
     * Will remove any instace of required[<any required type>] from an element
    */
    this.removeRequired = function(elem)
    {
        //remove any validation for the field sto works best with stripe validation
        //if the product as a class name validate, set the requried var to true
        var dClassName = elem.className;
        if(dClassName.indexOf('required') > -1) {
            this.required = true;
        }
        var dRegex = /validate\[(.*)\]/;
        if ( dClassName.search(dRegex) > -1 ){
            elem.className = dClassName.replace(dRegex, '');
        }
    };

    /**
     * Stripe Description Creator
    */
    this.descriptionCreator = function() {
        var description = "";

        if (this.isDonation()) {
            description = "JotForm - Donation";
        } else {
            if (!JotForm.pricingInformations && (!JotForm.pricingInformations.items || JotForm.pricingInformations.items.length <= 0)) {
                description = "Your payment form is " + this.thisForm.getAttribute('id');
            } else {
                JotForm.pricingInformations.items.forEach(function(item, key) {
                    description += item.name;
    
                    if (item.description) {
                        description += " (" + item.description + ')';
                    }
    
                    if (key !== JotForm.pricingInformations.items.length - 1) {
                        description += ',';
                    }
                });
            }
        }

        return description;
    };

    this.getCCerrorList = function() {
        var CCerrorList = [
            {
                key: 'cc',
                node: $$('.StripeElement.form-textbox.cc_numberMount')[0],
                isErrored: this.cardNumberError,
                errorText: JotForm.texts.ccInvalidNumber
            },
            {
                key: 'ccv',
                node: $$('.StripeElement.form-textbox.cc_ccvMount')[0],
                isErrored: this.cardCcvError,
                errorText: JotForm.texts.ccInvalidCVC
            },
            {
                key: 'exp',
                node: $$('.StripeElement.form-textbox.cc_cardExpiryMount')[0],
                isErrored: this.cardExpiryError,
                errorText: JotForm.texts.ccInvalidExpireDate
            }
        ];

        return CCerrorList;
    };

    this.getCCerrorByKey = function(key) {
        return this.getCCerrorList().filter(function(item) { return item.key === key })[0];
    };

    /* Remove error class if any (from card fields for now) */
    this.removeErrorClass = function(node) {
        if (node.hasClassName(this.formValidationErrorClass)) {
            node.classList.remove(this.formValidationErrorClass);
        }
    };

    this.getErrorMessage = function() {
        var error = "";

        this.getCCerrorList().forEach(function(item) {
            if (item.isErrored) {
                item.node.addClassName(this.formValidationErrorClass);
                error += '<p>' + item.errorText + '</p>';
            } else {
                $this.removeErrorClass(item.node);
            }
        });

        return error;
    };

    this.validateFields = function(errorObj) {
        // no need to validate cc if paymentTotal is zero
        if (JotForm.paymentTotal !== 0) {
            JotForm.corrected($('stripesca_dummy'));
            if (errorObj.isErrored) {
                errorObj.node.addClassName(this.formValidationErrorClass);
                this.errored($('stripesca_dummy'), errorObj.errorText);
                this.toggleSubmitFlow = false;
            } else {
                this.removeErrorClass(errorObj.node);
            }
        }
    };

    this.handleStripeValidations = function() {
        /* CC Number Validation */
        this.cc_number.addEventListener('blur', function(){
            $this.validateFields($this.getCCerrorByKey('cc'));
        });

        this.cc_number.addEventListener('change', function(event){
            if (event.error || event.empty ||Â !event.complete) {
                $this.cardNumberError = true;
            } else {
                $this.cardNumberError = false;
            }
        });

        /* CVC Validation */
        this.cc_ccv.addEventListener('blur', function(){
            $this.validateFields($this.getCCerrorByKey('ccv'));
        });

        this.cc_ccv.addEventListener('change', function(event){
            if (event.error || event.empty ||Â !event.complete) {
                $this.cardCcvError = true;
            } else {
                $this.cardCcvError = false;
            }
        });

        /* Expiration Validation */
        this.cc_card_expiry.addEventListener('blur', function(){
            $this.validateFields($this.getCCerrorByKey('exp'));
        });

        this.cc_card_expiry.addEventListener('change', function(event){
            if (event.error || event.empty ||Â !event.complete) {
                $this.cardExpiryError = true;
            } else {
                $this.cardExpiryError = false;
            }
        });
    }

    this.handleServerResponse = function(response, pubKey, formId, logID, callback) {
        // handleNextAction
        this.stripe = Stripe(pubKey ? pubKey : response.pubKey);
        var $this = this;

        var requiresAction = false;
        var clientSecret = false;
        console.log('Status Response', response.status);
        if ((response.status === 'requires_action' || response.status === 'requires_source_action') && response.client_secret) {
            requiresAction = true;
            clientSecret = response.client_secret;
        }
        // basic subscription
        if (response.object === 'subscription' && response.latest_invoice.payment_intent &&
            response.latest_invoice.payment_intent.status === 'requires_action' && response.latest_invoice.payment_intent.client_secret
        ) {
            requiresAction = true;
            clientSecret = response.latest_invoice.payment_intent.client_secret;
        }
        // subscription with trial
        if (response.object === 'setup_intent' && response.status === 'requires_action') {
            requiresAction = true;
            clientSecret = response.client_secret;
        }

        if (response.error) { // Show error from server on payment form
            $this.errored($('stripesca_dummy'), response.error.message || response.error);
            $this.resetButton();
        } else {
            if (requiresAction && clientSecret) {
                // Use Stripe.js to handle required card action
                this.stripe.handleNextAction({
                    clientSecret: clientSecret
                }).then(function(result) {
                    var intent = result.paymentIntent ? result.paymentIntent : result.setupIntent;
                    // Show error in payment form
                    if (result.error || !intent || !intent.id) {
                        var title = result.error.code || 'undefined error code';
                        var message = result.error.message;
                        $this.replaceWithErrorPage(formId, logID,'AUTHENTICATION FAILED', message);
                    } else {
                        callback(true);
                    }
                });
            } else {
                switch (response.status) {
                    case 'succeeded':
                        callback(true);
                        break;
                    case 'trialing':
                    case 'active':
                        if (response.object === 'subscription') {
                            callback(true);
                        }
                        break;
                    case 'requires_confirmation':
                        if (response.object === 'setup_intent') {
                            callback(true);
                        }
                        break;
                    default:
                        callback(true);
                        break;
                }
            }
        }
    };

    this.createPaymentMethodForPE = function (billingData, callback) {
        var $this = this;
        return new Promise(function (resolve, reject) {
            var elements = $this.elements;
            var paymentMethod = $this.stripe.createPaymentMethod({
                elements,
                params: {
                    billing_details: billingData
                }
            });
            if (paymentMethod) {
                resolve(paymentMethod);
            }
        }).then(function (resp) {
            if (resp.paymentMethod) {
                callback(resp.paymentMethod, false);
                return true;
            }
            if (resp.error) {
                callback(false, resp.error.message);
                return false;
            }
        }).catch(function (error) {
            callback(false, error);
            return false;
        })
    };

    this.handleErrors = function (error) {
        var $this = this;
        $this.errored($('stripesca_dummy'), error);
        JotForm.showButtonMessage();
        $this.resetButton();
        $this.toggleSubmitFlow = false;
        return false;
    };

    this.formObserver = function() {
        var self = this;
        //catch the form being submit and verify payment details
        Event.observe(self.thisForm, 'submit', function (event) {
            if ($$('[data-component="paymentDonation"]')) {
                JotForm.stripe.updateElementAmount();
            }

            if (self.toggleSubmitFlow) { return; }
            self.toggleSubmitFlow = true;
            // get original button text and restore it later
            $$('.form-submit-button').each(function(btn) {
                var btnText = (typeof btn.textContent !== 'undefined') ? btn.textContent : btn.innerText;
                btn.oldText = btnText;
                btn.setAttribute('data-oldtext', btnText);
            });

            // TODO:: [payment elements] new validateAll function is needed to validate PE field
            var paymentField = $('id_' + self.getPaymentFieldID());
            var isValid = JotForm.validateAll();
            var isPaymentConditionalRequired = $$('li[data-type="control_stripe"] label span.form-required').length === 1; // requirement validation for legacy forms w/'form-required' class

            if (JotForm.isVisible(paymentField)) { // if user gets an error about credit card field square_dummy disappears so submit process cannot complete
                if ((self.required || isPaymentConditionalRequired) && !JotForm.isPaymentSelected()) {
                    self.correctErrors();
                    Event.stop(event);
                    JotForm.errored($('stripesca_dummy'), JotForm.texts.required);
                }
            } else { // if payment field is not visible
                if (!JotForm.isPaymentSelected()) { // if payment field is not selected
                    self.clearPaymentDetails();
                    return;
                }
            }

            if (    (!JotForm.isVisible(paymentField) && JotForm.getSection(paymentField).id)  //  inside a hidden (not collapsed) form collapse
                    || $('id_' + self.getPaymentFieldID()).getStyle('display') === "none"   //  hidden by condition
                    || !isValid                                               //  failed validation
                    || (self.getTotalAmount() <= 0 && ['product', 'donation', 'subscription'].includes(self.paymentType()))  // do not require payer info if payment total is zero on product purchase
            ){
                if(isValid) {
                    // Enable selected by default product fields before submit
                    $$('#id_' + self.getPaymentFieldID() + ' .form-checkbox, .form-radio').each(function (el) {
                        el.enable();
                    });
                }

                if (!self.formHasErrors()) {
                    JotForm.showButtonMessage();
                    self.resetButton();
                    self.toggleSubmitFlow = false;
                    return;
                }
            }
            
            //correct errors first
            self.correctErrors();
            
            // If payment field is empty and not required, or if it is hidden
            if (!self.formHasErrors() && ((!self.hasProductsSet() && !self.hasCreditCardSet()) && !self.required)) {
                //clear if the payment is invalid 
                if ((!self.hasProductsSet() && !self.hasCreditCardSet())){
                    self.clearPaymentDetails();
                }
            } else {
                //stop the form to submit
                Event.stop(event);
                //check for input validation
                var stripeErrors = '';
                //get cc infos if any, return blank if no data
  
                // if there is min order amount in the form, require payment field selection
                if (JotForm.hasMinTotalOrderAmount() === true) {
                    if (typeof JotForm.isValidMinTotalOrderAmount === 'function') {
                        if (!JotForm.isValidMinTotalOrderAmount()) {
                            var errorTxt = JotForm.texts.ccDonationMinLimitError.replace('{minAmount}', JotForm.minTotalOrderAmount).replace('{currency}', JotForm.currencyFormat.curr);
                            stripeErrors += errorTxt + '<br>';
                        }
                    } else {
                        if (JotForm.paymentTotal < parseInt(JotForm.minTotalOrderAmount)) {
                            var errorTxt = JotForm.texts.ccDonationMinLimitError.replace('{minAmount}', JotForm.minTotalOrderAmount).replace('{currency}', JotForm.currencyFormat.curr);
                            stripeErrors += errorTxt + '<br>';
                        }
                    }
                  
                }
              
              
                if (self.hasProductsSet() && !self.hasCreditCardSet()) {
                    self.validateStripe();
                    stripeErrors += JotForm.texts.ccMissingDetails + '<br>';
                } else if (!self.hasProductsSet() && self.hasCreditCardSet()) {
                    if (self.isDonation()) {
                        stripeErrors += JotForm.texts.ccMissingDonation;
                    } else {
                        stripeErrors += JotForm.texts.ccMissingProduct;
                    }
                }

                //now check for CCC if all inputs are valid
                if (stripeErrors.length < 1) {
                    var billingData = {
                        name: $this.getField('name')
                    };

                    if ($this.email_qid && $this.getField('email', $this.email_qid)) {
                        billingData.email = $this.getField('email', $this.email_qid);
                    }

                    if ($this.phone_qid && $this.getField('phone', $this.phone_qid)) {
                        billingData.phone = $this.getField('phone', $this.phone_qid);
                    }

                    if ($this.billing_address_qid) {
                        billingData.address = $this.getField('address', $this.billing_address_qid);
                    }

                    if (self.isStripePE === false) {
                        // TODO:: remove this [card elements] (legacy)
                        self.stripe.createPaymentMethod('card', self.cardNumber, {
                            billing_details: billingData
                        }).then(function(result) {
                            if (result.error) {
                                $this.errored($('stripesca_dummy'), result.error.message || result.error);
                                JotForm.showButtonMessage();
                                self.resetButton();
                                $this.toggleSubmitFlow = false;
                                return;
                            } else {
                                $this.lastFourDigit = result.paymentMethod.card.last4;
                                $this.paymentMethodId = result.paymentMethod.id;
                                $this.resubmitForm();
                            }
                        });
                    } else {
                        // TODO:: [payment elements] charge flow
                        // Create a PaymentMethod using the details collected by the PaymentElement
                        self.createPaymentMethodForPE(billingData, function (paymentMethod, error) {
                            if (paymentMethod) {
                                if (paymentMethod.type === 'card') {
                                    $this.lastFourDigit = paymentMethod.card.last4;
                                }
                                $this.paymentMethodId = paymentMethod.id;
                                $this.addElementToForm('isStripePE', 'hidden', 'input', 'true');
                                $this.resubmitForm();
                            }
                            if (error) {
                                return self.handleErrors(error);
                            }
                        });
                    }
                } else {
                    return self.handleErrors(stripeErrors);
                }
            }
        });
    };

    this.resubmitForm = function () {
        // Send browser information to browser
        if (this.formHasErrors()) {
            JotForm.showButtonMessage();
            this.resetButton();
            this.toggleSubmitFlow = false;
            return;
        }
        var browserInfoVal = JotForm.browserInformations();
        this.addElementToForm('browserDetails', 'hidden', 'input', browserInfoVal);

        // Enable Elements..
        $$('#id_' + this.getPaymentFieldID() + ' .form-checkbox, .form-radio').each(function (el) {
            el.enable();
        });

        $this.addElementToForm('stripePaymentMethodId', 'hidden', 'input', this.paymentMethodId);

        // include last four digits for customer matching
        var lastFourFieldName = $$('.cc_firstName')[0].name.replace('[cc_firstName]', '[cc_lastFourDigits]');
        this.addElementToForm(lastFourFieldName, 'hidden', 'input', this.lastFourDigit);
        this.thisForm.submit();
    }

    /**
     * SUBSCRIPTIONS
     */


    this.retrieveSubscriptionIntent = function(fid, qid, pid, callback) {
        new Ajax.Request('/server.php', {
            parameters: {
                action: 'retrieveStripeIntent',
                fid: fid,
                qid: qid,
                pid: pid
            },
            evalJSON: 'force',
            onComplete: function(t) {
                callback(t.responseJSON.message);
            }
        });   
    }

    this.reauthenticateIntent = function(intent, pubKey, callback) {
        this.stripe = Stripe(pubKey ? pubKey : intent.pubKey);

        try {
            this.stripe.handleCardPayment(
                intent.client_secret
            ).then(function(response) {
                if (!response.error && response.paymentIntent.status === 'succeeded') {
                    callback(true);
                } else {
                    title = response.error.decline_code || response.error.code;
                    message = response.error.message;

                    callback(false, message);
                }
            });
        } catch(err) {
            console.log(err);
        }
    }

    this.reauthenticateSubscription = function(intent, pubKey, fid, logID, callback) {
        this.stripe = Stripe(pubKey ? pubKey : intent.pubKey);
        try {
            if (intent.object === "setup_intent") {
                 this.stripe.confirmCardSetup(
                     intent.client_secret
                 ).then(function(response) {
                    if (!response.error && response.setupIntent.status === 'succeeded') {
                        callback(true);
                    } else {
                        title = response.error.decline_code || response.error.code;
                        message = response.error.message;
                        $this.showErrorPage(fid, logID, 'SCA_AUTH_FAILED: ' + title, message, callback);
                    }
                 });
            } else if (intent.object === "payment_intent") {
                this.stripe.confirmCardPayment(
                    intent.client_secret
                ).then(function(response) {
                   if (!response.error && response.paymentIntent.status === 'succeeded') {
                       callback(true);
                   } else {
                       title = response.error.decline_code || response.error.code;
                       message = response.error.message;
                       $this.showErrorPage(fid, logID, 'SCA_AUTH_FAILED: ' + title, message, callback);
                   }
                });
            }
        } catch(err) {
            console.log(err);
        }
    }

    this.replaceWithErrorPage = function(formID, logID, title, message) {
        if (window !== window.top) {
            window.parent.postMessage({ action: 'submission-error', payload: { title: title, message: message } });
        }

        var url =`/server/showPaymentErrorPage?formID=${encodeURIComponent(formID)}&title=${encodeURIComponent(title)}&transactionLogID=${encodeURIComponent(logID)}&message=${encodeURIComponent(message)}&gateway=STRIPE`;
        window.location.replace(url);
    }

    this.showErrorPage = function(formID, logID, title, message, callback) {
        new Ajax.Request('/server/showPaymentErrorPage', {
            method: "GET",
            parameters: {
                formID: formID,
                title: title,
                transactionLogID: logID,
                message: message,
                gateway: "STRIPE"
            },
            onComplete: function(t) {
                callback(false, t.responseText);

                if (window !== window.top) {
                    window.parent.postMessage({ action: 'submission-error', payload: { title: title, message: message } });
                }
            }
        });
    }

    this.completeSubmission = function(fid, sid, qid, data, callback) {
        if (data) {
            var paymentUtils = new PaymentUtils();
            var origin = window.location.origin;
            var apiUrlBase = origin.indexOf('jotform.pro') > -1 ? origin + "/API" : "https://api.jotform.com";
            var url = apiUrlBase + "/payment/logger";

            // Don't add to meta data if charge later enabled.
            if (data.isChargeLater === 'Yes') {
                // this.saveAuthDoneMessage(fid, sid, data);
            } else {
                var postedData = {
                    action: 'addMeta',
                    form_id: fid,
                    submission_id: sid,
                    paymentType: data.paymentType,
                    gateway: 'STRIPE',
                    sandbox: data.isSandbox,
                    currency: data.currency,
                    amount: data.amount,
                    id: typeof data.jfTransactionLogID !== 'undefined' ? data.jfTransactionLogID : '',
                };

                // this.saveAuthDoneMessage(fid, sid, data);
            }

            var params = "params=" + JSON.stringify(postedData);

            paymentUtils._xdr(url, 'post', params,
              function(response) {
                // This is neccessary for double submission.
                if (window.history.replaceState) {
                    window.history.replaceState( null, null, window.location.href);
                }

                window.location.href = data.returnURL;
              },
              function (error) {
                console.error("ERROR: ", error);
              }
            );
        } else {
            callback(true);
        }
    }

    this.saveAuthDoneMessage = function(fid, sid, data) {
        var paymentUtils = new PaymentUtils();
        var origin = window.location.origin;
        var apiUrlBase = origin.indexOf('jotform.pro') > -1 ? origin + "/API" : "https://api.jotform.com";
        var url = apiUrlBase + "/payment/logger";
        var  eventLog = [
            data.amount,
            data.currency,
            data.isChargeLater,
            data.isSandbox,
            data.paymentType
        ];
        var postedData = {
            action: 'addEvents',
            form_id: fid,
            sid: sid,
            gateway: 'STRIPE',
            eventType: 'SCA_AUTH_DONE',
            eventData: JSON.stringify(eventLog),
        };

        var params = "params=" + JSON.stringify(postedData);

        paymentUtils._xdr(url, 'post', params,
          function(response) {
            console.log("RESPONSE:", response);
          },
          function (error) {
            console.error("ERROR: ", error);
          }
        );
    }

    this.updatePlaceHolder = function(stripeElement, placeholder) {
        if(stripeElement && stripeElement.update) {
            stripeElement.update({placeholder});
        }
    }
};
