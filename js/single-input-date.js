(function(){
	
	var strictRule = /^\d{1,2}\/\d{1,2}\/\d{1,2}(\s{1,}@|\s{1,})+\d{1,2}:\d{1,2}\s{0,}(a|p)m$/i;
	var strictRuleNonCapturing = /^\d{1,2}\/\d{1,2}\/\d{1,2}(\s{1,}@|\s{1,})+\d{1,2}:\d{1,2}\s{0,}(a|p)m/i;
	
	var rules = [
		/^\d{1,2}(\/?)$/,
		/^\d{1,2}\/\d{1,2}(\/?)$/,
		/^\d{1,2}\/\d{1,2}\/\d{1,2}((\s{1,}@|\s{1,})?)$/,
		/^\d{1,2}\/\d{1,2}\/\d{1,2}(\s{1,}@|\s{1,})+\d{1,2}(:?)$/,
		/^\d{1,2}\/\d{1,2}\/\d{1,2}(\s{1,}@|\s{1,})+\d{1,2}:\d{1,2}\s{0,}((a|p)?)$/i,
		/^\d{1,2}\/\d{1,2}\/\d{1,2}(\s{1,}@|\s{1,})+\d{1,2}:\d{1,2}\s{0,}(a|p)(m?)$/i,
	];

	$.fn.singleInputDate = function(options) {

		var defaults = {
			color: '#FFCCCC',
			timeout: 500,
			onInput: undefined, //callback
			pastDates: false,
			pastTimes: true,
			onValidation: undefined, //callback
			validationMessage: {
				notAvailable: 'This date/time is not available.',
				separateDateByComma:'Separate dates/times with a comma.'
			}
		};

		var settings = $.extend(defaults, options);
		var el = $(this).highlightTextarea({debug: false });
		var validator = new SingleInputDateValidator(settings, el);
		var rule = new ValidationRule(el, settings);

		this.data('validator', validator);

		this.dates = function(format) {

			var text = el.val();

			return _(text).split(',').map(function(v){
					date = $.trim(v).replace(/(\s|@)+/g,' ').replace(/^\s/g, '');
					if(rule.isValidDate(date, true) && !rule.isPastDate(date) && strictRule.test(date)) {
						return moment(date, 'M/D/YY h:mmA').format(format ? format : 'YYYY-MM-DD HH:mm');
					}
				})
				.compact()
				.uniq()
				.value();

		};

		validator.init();

		return this;
	};

	function SingleInputDateValidator(settings, el) {
		var highlighter = el.data('highlighter');
		var onValidateTimeout = undefined;
		var onInputTimeout = undefined;
		var self = this;

		this.init = function() {

			el.keyup(function() { 

				if(settings.onInput) {
					clearTimeout(onInputTimeout);
					onInputTimeout = setTimeout(settings.onInput, 2000);
				}

				self.validate(); 
			});
			el.blur(function(){ self.validate(true); });

		};

		this.validate = function(strict) {
			clearTimeout(onValidateTimeout);
			onValidateTimeout = setTimeout(function() {
				self.asyncValidate(strict);
			}, settings.timeout);
		};

		this.asyncValidate = function(strict) {
			var rule = new ValidationRule(el, settings, strict);
			var isValid = rule.isValid();
			if(settings.onValidation) {
				settings.onValidation(isValid, rule.message);
			};

			highlighter.setRanges([{ color: settings.color, ranges: rule.errors }]);
		};
	};

	function ValidationRule(el, settings, strict) {
		var text = el.val();
		var temp = '';
		var lastIndex = 0;
		var self = this;

		var applyStrictRule = function(index) {
			if(!strictRule.test(val) || (self.isPastDate(val) && !self.isToday(val)) || !self.isValidDate(val, true)) {
				self.errors.push([lastIndex, index]);
				self.hasError = true;
				self.message = settings.validationMessage.notAvailable;
			}
		};

		var isValidDateRule = function(val) {
			self.hasError = false;
			
			var isMatchDate = function() {
				var matches = val.match(/\//g);
				return matches && matches.length >= 2 && val.substr(val.lastIndexOf('/') + 1).length >= 2;
			};

			var isValidMinute = function(){
				var matchesColon = val.match(/:/g);
				var lastColon = val.substr(val.lastIndexOf(':') + 1);
				if(matchesColon && matchesColon.length === 1 && isMatchDate()){
					var minute =  lastColon.substring(0,2);
					return isNaN(minute);
				}
				return false;
			};

			var ignoreInvalid = function(val){
				return !(_.endsWith(val, '/0') || _.endsWith(val, ':0') || _.endsWith(val, ' 0') || val == '0');
			};

			var monthDayYearPattern = /^\d{1,2}\/\d{1,2}\/\d{1,2}((\s{1,}@|\s{1,})?)/g;
			var arr = monthDayYearPattern.exec(val);
			
			if(arr){
				var time = val.substring(arr[0].length).trim();
				if(parseInt(time) > 12){
					self.hasError = true;
					self.message = settings.validationMessage.notAvailable;
				}

			}
			
			if(!self.isValidDate(val) || self.isPastDate(val) && (temp.endsWith(' ') || isMatchDate()) || isValidMinute()) {
				if(!ignoreInvalid(val) || self.isToday(val) && !isValidMinute()){
					return false;
				}
				self.hasError = true;
				self.message = settings.validationMessage.notAvailable;
			}

			return false;


		};

		var applyRules = function(strict, index) {
			val = $.trim(temp).replace(/(\s|@)+/g,' ');

			if(!val) return;
			if(strict) return applyStrictRule(index);
			
			$.each(rules, function(x, regex){    
				if(regex.test(val)) {
					return isValidDateRule(val);
				}else {
					self.hasError = true;
					var res = strictRuleNonCapturing.exec(val);
					
					if(!res) {
						self.message = settings.validationMessage.notAvailable;
					}else if(res[0] != res.input) {
						self.message = settings.validationMessage.separateDateByComma;
					}
				}    
			});

			if(self.hasError){
				self.errors.push([lastIndex, index]);
			}else if(strictRule.exec(val) && self.isPastDate(val) && !self.isToday(val)){
				self.hasError = true;
				self.message = settings.validationMessage.notAvailable;
				self.errors.push([lastIndex, index])
			}
		};

		this.message = '';
		this.hasError = false;
		this.errors = [];
		this.isValid = function() {
			for(var i=0; i < text.length; i++) {
				var s = text.substr(i, 1);
				if(s == ',') {
					applyRules(true, i);
					lastIndex = i + 1;
					temp = '';
				} else {
					temp += s;
				}
			}
			
			if(temp) {
			  applyRules(strict, i);
			}
			
			return !self.hasError && self.errors.length == 0;
		};

		this.isPastDate = function(val){

			 moment.parseTwoDigitYear = function(year) { 
				return 2000 + parseInt(year); 
			};

			if(self.isValidDate(val) && settings.pastDates){
				var outputFormat = settings.pastTimes ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
				var inputFormat = settings.pastTimes ? 'M/D/YY h:mmA' : 'M/D/YY' ;

				var now = moment().format(outputFormat);
				var date = moment(val, inputFormat).format(outputFormat);

				return moment(now).isAfter(date);
			}
			return false;
		};

		this.isValidDate = function(val, strictFormat){
			 return moment(val, 'M/D/YY h:mmA', strictFormat).isValid();
		};

		this.isToday = function(val){
			var now = moment().format('M/D/YY');
			if(settings.pastTimes){
				return (now == moment(val, 'M/D/YY').format('M/D/YY'));
			}
		};

	};

})();