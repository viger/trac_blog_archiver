function restoreOptions(){
	if(!localStorage["iDays"]){
		localStorage["iDays"] = 5;
	}
	document.getElementById("iDays").value = localStorage["iDays"];
}
function saveOptions()
{
	localStorage["iDays"] = document.getElementById("iDays").value;
}
$(function(){
	restoreOptions();
	$('#btSaveOptions').click(saveOptions);
})