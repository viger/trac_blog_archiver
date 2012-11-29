Date.prototype.getYmd=function(sep){
	return [this.getFullYear(),this.getMonth()+1,this.getDate()].join(sep?sep:'-');
}
function generateBlogArchive(days)
{
	if(/blog\/author\/(.+)$/g.test(location.href))
	{
		var author=location.href.split('/').pop();
		var worklogs=[];
		$('div.blog-body:lt('+(days)+')').each(function(k,v){
			if($(v).find('ol:eq(0)').length)
			{
				worklogs.unshift($(v).find('ol:eq(0)').html());
			}
			else
			{
				worklogs.unshift($(v).find('ul:eq(0)').html());
			}
		});
		var last_week_start = new Date(new Date().getTime()-7*86400*1000).getYmd();
		var last_week_end = new Date(new Date().getTime()-3*86400*1000).getYmd();
		var this_week_start = new Date().getYmd();
		var this_week_end = new Date(new Date().getTime()+5*86400*1000).getYmd();
		var report=$('<div />');
		var title = [author, "周报", this_week_start].join(' ');
		var last_week_title = "上周("+last_week_start+" - "+last_week_end+")完成工作";
		var this_week_title = "本周("+this_week_start+" - "+this_week_end+")工作计划";
		report.append($('<h2 />').html(title));
		report.append($('<h3 />').html(last_week_title)).append($('<ol />').html(worklogs.join("\n")));
		report.append($('<h3 />').html(this_week_title)).append($('<ol />').append($("<li/>").html("工作计划1")));
		$('#blog-main').prepend(report);
	}
}

chrome.extension.onRequest.addListener(function(req, sender, sendResponse)
{
	console.log(req);
	if(req.act=='genereate')
	{
		generateBlogArchive(req.days);
	}
	sendResponse({status:true, message:"done"});
});