$(function(){
	$('.single-input').singleInputDate({
		pastDates:false,
		pastTimes:false,
		timeout: 100,
		onValidation: function(valid, msg){
			$('.single-input-message').html( valid ? '' : msg);
		}
	});
});