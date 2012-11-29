function generateArchive()
{
	var iDays = $('#iDays').val();
	chrome.extension.getBackgroundPage().generate(iDays);
}
function getShortName(){
    
}
$(function(){
    $("#tabs").tabs();
	if(!localStorage["iDays"]){
		localStorage["iDays"] = 5;
	}
	$('#iDays').val(localStorage["iDays"]);
	$('#btnGenerate').click(generateArchive);
})
