var ValidatePaymentGateways = {
  isPaymentTotalZero: function() {
    return parseFloat(JotForm.paymentTotal) === 0;
  },
  validate: function(type) {
    if (this.isPaymentTotalZero()) { return true; }
    switch (type) {
      case 'stripe':
        return this.validateStripe();
      case 'square':
        return this.validateSquare(true);
      default:
        return true;
    }
  },
	validateStripe: function() {
    if (!JotForm.stripe) { return true; }
    if (!JotForm.stripe.isCardDataValid) {
      JotForm.errored($('stripesca_dummy'), 'Please fill up the credit card details');
    }
    return JotForm.stripe.isCardDataValid;
  },

  validateSquare: function (throwFromError) {
      try {
          var paymentField = $$('[data-payment="true"]')[0];
          if (JotForm.payment === 'square' && JotForm.isPaymentSelected() && JotForm.squarePayment.getSelectedPM() === '') {
              JotForm.corrected(paymentField);
              JotForm.errored(paymentField, "Please select one payment method");
              return false;
          }
          if (JotForm.payment !== 'square' || !JotForm.isPaymentSelected() || JotForm.squarePayment.getSelectedPM() !== 'creditcard' ){
              return true;
          }
          var ccFirstName = document.querySelector('.cc_firstName');
          var ccLastName = document.querySelector('.cc_lastName');
          var squareCardState = typeof JotForm.squarePayment.squareCardEvent !== 'undefined' ? JotForm.squarePayment.squareCardEvent : null;
          var isCorrected = true;
          if (ccFirstName.value === '' || ccLastName.value === '' || squareCardState === null) {
              isCorrected = false;
          }
          if (squareCardState !== null && typeof squareCardState.detail !== 'undefined' && !squareCardState.detail.currentState.isCompletelyValid) {
              isCorrected = false;
          }
          if (throwFromError && !isCorrected) {
              JotForm.corrected(paymentField);
              JotForm.errored(paymentField, JotForm.texts.ccMissingDetails);
          }
          return isCorrected;
      } catch (e) {
          // If javascript throw exception, validation is disabled
          console.log('validateSquare ::: ', e);
          return true;
      }
  }
};
