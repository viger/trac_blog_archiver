function checkForValidUrl(tabId, changeInfo, tab) {
	if(/blog\/author\/(.+)$/g.test(tab.url))
	{
		chrome.pageAction.show(tabId);
	}
};
chrome.tabs.onUpdated.addListener(checkForValidUrl);

//chrome.pageAction.onClicked.addListener(function(tab) {
//	chrome.tabs.executeScript(tab.id,{code:"generateBlogArchive(5)"});
////    chrome.pageAction.hide(tab.id);
//});
function generate(iDays)
{
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendRequest(tab.id, {act:'genereate', days: iDays}, function(response) {
			console.log(response);
		});
	});
}