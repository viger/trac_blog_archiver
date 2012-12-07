var tracPlugin = {};
(function(tp){
    var date = new Date();
    var isFirstRun = false;
    var oPluginConfigData = {};
    var aTracBlogDataList = [];
    var sWorklogContentId = {'today': 'today_worklog_contents',
                             'tomrrow': 'tomrrow_worklog_contents',
                             'textarea': 'worklog_contents',
                            };

    tp.fnGetShortName = function(){
        var sUsername = oPluginConfigData.worklog_config.username;

        return sUsername.replace(/[. ]+/g, "") + "_worklog_" + this.fnGetIntDate();
    };

    tp.init = function(){
        if (!chrome.cookies) {
            chrome.cookies = chrome.experimental.cookies;
        }

        var self = this;

        self.fnCallBackProcess('get_config', undefined, function(response){
            oPluginConfigData = response.oData;

            if( isFirstRun ){
                var sNotice = "欢迎使用trac日志工具,这是你的第一次，请先设置本插件，然后<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录trac</a>再使用。当前版本: " + oPluginConfigData.version;
                self.fnShowNotice(sNotice);
            }
            else{
                self.fnHiddenNotice();
            }

            self.fnCallBackProcess('check_logined', undefined, function(response){
                console.log(response.bLogined, 'response.bLogined');
                if( !response.bLogined ){
                    self.fnCallBackProcess('login');
                }
            });

            self.fnCallBackProcess('test_ajax');

            $("#blog_url").val(oPluginConfigData.worklog_config.url);
            $("#blog_user_name").val(oPluginConfigData.worklog_config.username);
            $("#blog_password").val('hello word!');
            $("#blog_user_name_cn").val(oPluginConfigData.worklog_config.username_cn);
            $("#blog_categories").val(oPluginConfigData.worklog_config.blog_categories);
            $("#btn_Generate_speed").attr("disabled", true);
            $("#btn_Generate_by_checked").attr("disabled", true);
            var sShorName = self.fnGetShortName();
            $("#short_name_s").html(sShorName);
            $("input[id=short_name]").val(sShorName);
            var stitle = self.fnGetTitle();
            $("#title_s").html(stitle);
            $("input[id=title]").val(stitle);
            $("div[id=worklog_contents_input]").css("display", "none");
            $("div[id=worklog_contents_textarea]").css("display", "");
            $("input[id=saveDaftWorklog]").css("display", "");
            $("#submitting").html("");
            var sWorklogDaft = "'''今日工作'''\r\n   * 请在这里输入今日工作内容\r\n\r\n'''明日工作'''\r\n   * 请在这里输入明日工作内容";
            if( 'undefined' !=  typeof oPluginConfigData.worklog_config.work_log_daft ){
                sWorklogDaft = oPluginConfigData.worklog_config.work_log_daft;
            }
            $("textarea[id=" + sWorklogContentId['textarea'] + "]").val(sWorklogDaft)
        });
    };

    tp.fnCallBackProcess = function(action, vData, fnCallBack){
        if( 'undefined' == typeof action ){
            return ;
        }
        
        var request = {'action': action};
        if( 'undefined' == typeof vData ){
            request.data = vData;
        }

        if( 'undefined' == typeof fnCallBack ){
            chrome.extension.sendMessage('', request);
        }
        else{
            chrome.extension.sendMessage('', request, fnCallBack);
        }
    };

    tp.console = function(msg){
        console.log(msg);
    };

    tp.fnShowNotice = function(msg){
        $(".notice").html(msg);
        $(".notice").css("display", "block");
    };

    tp.fnHiddenNotice = function(){
        $(".notice").html("");
        $(".notice").css("display", "none");
    };

    tp.fnSaveDaftWorklog = function(){
        var contents = $("textarea[id=" + sWorklogContentId['textarea'] + "]").val();
        
        if( contents.length <= 0 ){
            this.fnShowNotice('请填写日志!');
            return "";
        }
        else{
            oPluginConfigData.worklog_config.work_log_daft = contents;
            this.fnSetConfig(oPluginConfigData);
            $("#submitting").html("草稿已保存!");
        }
    };

    tp.fnSubmitWorklog = function(){
        var sShortname = $("input[id=short_name]").val();
        var sTitle = $("input[id=title]").val();
        var contents = '';
        /*if( oPluginConfigData.worklog_config.add_work_log_by_input == 1){
            contents = this.fnCreateWoklogContents(sWorklogContentId['today']) + this.fnCreateWoklogContents(sWorklogContentId['tomrrow']);
        }
        else{*/
            contents = this.fnCreateWoklogContentsbyTextarea();
        //}

        if( contents !== "" ){
            var sUrl = oPluginConfigData.worklog_config.url + '/blog/' + sShortname;
            var self = this;
            $("#addWorklog").attr('disabled', true);
            $("#submitting").html("正在检查日志是否存在，请耐心等待(请勿关闭该窗口)...");
            this.fnCheckAjaxUrl(sUrl, {}, function(iStatusCode){
                var sAction = 'new';
                var url = oPluginConfigData.worklog_config.url + '/blog/create';
                if( iStatusCode == 200 ){
                    sAction = 'edit';
                    url = oPluginConfigData.worklog_config.url + '/blog/edit/' + sShortname + '?';
                }

                var oData = {'name': sShortname, 
                            'title': sTitle,
                            'body': contents,
                            'author': oPluginConfigData.worklog_config.username,
                            'categories': oPluginConfigData.worklog_config.blog_categories,
                            'action': sAction,
                            /*'blog-preview': 'Preview post'*/
                            'blog-save': 'Save post'
                };

                $("#submitting").html("正在发送日志到服务器，请耐心等待(请勿关闭该窗口)...");
                self.fnSendAjaxData(url, {}, function(data){
                    var sFormToken = $("input[name=__FORM_TOKEN]", data).val();
                    oData['__FORM_TOKEN'] = sFormToken;
                    self.fnSendAjaxData(url, oData, function(datas){
                        $("#submitting").html(sAction == 'new' ? "日志发布成功!" : "日志更新成功!");
                        self.fnResetWoklogContents();
                        $("#addWorklog").attr('disabled', false);
                    }, 'POST', oTracookie);
                }, 'GET', oTracookie);
            }, 'GET', oTracookie);
        }
    };

    tp.fnResetWoklogContents =  function(){
        /*if( oPluginConfigData.worklog_config.add_work_log_by_input == 1){
            $("#" + sWorklogContentId['today']).html("");
            $("#" + sWorklogContentId['tomrrow']).html("");
            this.fnCreateBlogInput('today_worklog_contents', false);
            this.fnCreateBlogInput('tomrrow_worklog_contents', false);
        }
        else{*/
            oPluginConfigData.worklog_config.work_log_daft = "'''今日工作'''\r\n   * 请在这里输入今日工作内容\r\n\r\n'''明日工作'''\r\n   * 请在这里输入明日工作内容";
            this.fnSetConfig(oPluginConfigData);
            $("textarea[id=" + sWorklogContentId['textarea'] + "]").val(oPluginConfigData.worklog_config.work_log_daft);
        //}
    };

    tp.fnCreateWoklogContentsbyTextarea = function(){
        var contents = $("textarea[id=" + sWorklogContentId['textarea'] + "]").val();
        
        if( contents.length <= 0 ){
            this.fnShowNotice('请填写日志!');
            return "";
        }

        return contents.replace(/([^\']{3})[\r|\n]{1,2}/ig, "$1[[BR]]\r\n");
    };

    tp.fnCreateSpace = function(level){
        if( 1 === level ){
            return '   ';
        }
        
        var sSpace = "";
        for(var i=0; i< level;i++){
            sSpace = sSpace + "   ";
        }

        return sSpace;
    };

    tp.fnCreateWeeklog = function(vData){
        var sWeekLog = '上周工作\r\n';
        if( 'number' == typeof vData ){
            if( vData < 1 ){
                this.fnShowNotice("生成日志最少需要一天吧，亲！");
                return ;
            }
            
            for( var i=0;i<vData;i++ ){
                sWeekLog += aTracBlogDataList[i].body;
            }
        }
        else{
            if( vData.length < 1 ){
                this.fnShowNotice("生成日志最少需要一天吧，亲！");
                return ;
            }

            $.each(vData, function(i, n){
                sWeekLog += aTracBlogDataList[n].body;
            });
        }
        
        sWeekLog += '\r\n本周工作\r\n';
        $("div[id=generate_week_log_result]").css("display", "");
        $("div[id=generate_week_log_list]").css("display", "none");
        $("#generate_week_log_result_textarea").text(sWeekLog);
    };

    tp.fnGetBlogList = function(){
        var url = oPluginConfigData.worklog_config.url + '/blog/author/' + oPluginConfigData.worklog_config.username;
        var self = this;
        this.fnSendAjaxData(url, [], function(data){
            //var sBlogListReg = new RegExp('<h1 class="blog-title" id="(.*)"><a href="(.*)">(.*)<\/a>(.|\n*)<div class="blog-body">(.|\n*)<\/div>', 'ig');
            $("#btn_Generate_speed").attr("disabled", false);
            $("#btn_Generate_by_checked").attr("disabled", false);
            var sBlogListReg = new RegExp('<h1 class="blog-title"(.|\n|\r)*?<ul class="metainfo"', 'ig');
            var aBlogList = data.match(sBlogListReg);
            //console.log(aBlogList);
            var sBlogAReg = new RegExp('<a href="(.*)">(.*)<\/a>', 'ig');
            var sBlogHrefReg = new RegExp('href="(.*)"', 'ig');
            var sBlogTitleReg = new RegExp('>(.*)<', 'ig');
            var oShowList = $("ul[id=work_log_blog_list]");
            if( aBlogList != null && aBlogList.length > 0 ){
                $("span[id=loading_blog_list]").css("display", "none");
                for(var i=0; i< aBlogList.length; i++ ){
                    var sListString = aBlogList[i];
                    var aAString = sListString.match(sBlogAReg);
                    var aHref = aAString[0].match(sBlogHrefReg);
                    var sHref = aHref[0].replace("href=\"", "").replace('"', '');
                    var aTitle = aAString[0].match(sBlogTitleReg);
                    var sTtile = aTitle[0].substr(1, aTitle[0].length - 2);
                    aTracBlogDataList.push({'title': sTtile, 'href': sHref, 'body': self.fnGetLogBody(sListString)});
                    if( i < 20){
                        var oCheckBox = $("<input type='checkbox' value='c_" + i + "' url='" + sHref + "' name='blog_list_checkbox' style='width:25px;margin-right:10px;' />");
                        var oSpan = $("<span>" + sTtile + "</span>");
                        var oLi = $("<li></li>");
                        oCheckBox.appendTo(oLi);
                        oSpan.appendTo(oLi);
                        oLi.appendTo(oShowList);
                    }
                }
            }
            else{
                $("span[id=loading_blog_list]").html("你还没有发布日志吧~");
            }
        }, 'GET', oTracookie);
    };

    tp.fnGetLogBody =  function(sData){
        var sTodayLogReg = new RegExp('<\/strong>(.|\n|\r)*?<strong>', 'ig');
        var aTodayList = sData.match(sTodayLogReg);
        if( aTodayList != null && aTodayList.length > 0 ){
            var sTodayList = aTodayList[0];
            return this.fnGetBodyByFlag(sTodayList);
        }
        return "";
    };

    tp.fnGetBodyByFlag = function(sData, level){
        if( 'undefined' == typeof level ){
            level = 0;
        }

        var sListReg = new RegExp('<[p|li]{1,2}>(.|\n|\r)*?<\/[p|li]{1,2}>', 'ig');
        var sFristFlagReg = new RegExp("<(.*?)>", 'ig');
        var aData = sData.match(sListReg);
        if( aData!= null && aData.length > 0 ){
            var sSTR = "";
            for( var i=0;i<aData.length;i++ ){
                var sFristFlag = aData[i].match(sFristFlagReg);
                switch(sFristFlag[0]){
                    case '<p>':
                        sSTR += this.fnGetBodyByFlag(aData[i].replace(/<p>([\s\S]*)<\/p>/i, "$1"), level+1);
                    break;
                    case '<li>':
                        sSTR += this.fnGetBodyByFlag(aData[i].replace(/<li>([\s\S]*)<\/li>/i, "$1"), level+1);
                    break;
                    /*case '<br>':
                    case '<br/>':
                        sSTR += this.fnCreateSpace(level) + '* ' + aData[i].replace("<br/>", "\r\n");
                        sSTR +=  this.fnSplitBr(aData[i], level);
                    break;
                    default:
                        sSTR += this.fnCreateSpace(level) + '* ' + aData[i].replace(/(<[^>]+>)/ig, "") + "\r\n";
                    */
                }
            }
            //level++;
            return sSTR;
        }
        else{
            return this.fnSplitBr(sData, level+1).replace(/(<[^>]+>)/ig, "");
        }
        return "";
    };

    tp.fnSplitBr = function(aData, level){
        var sSTR = "";
        var aList = aData.split(/<br[ |\/]{0,2}>/ig);
        var sNotSpaceReg = /[^\s]+/ig;
        if( aList != null && aList.length > 1 ){
            for( var i=0;i<aList.length;i++ ){
                if( aList[i].length > 0 && sNotSpaceReg.test(aList[i]) ){
                    sSTR += this.fnCreateSpace(level) + '* ' + aList[i].replace(/[\r|\n]+/g, '') + "\r\n";
                }
            }
        }
        else{
            this.fnCreateSpace(level) + '* ' + aData  + "\r\n";
        }

        return sSTR;
    };

    

    tp.fnSetPluginConfig = function(){
        var url = $("#blog_url").val();
        if( url.substr(-1, 1)  == "/" ){
            url = url.substr(0, url.length-1);
        }

        oPluginConfigData.worklog_config.url = url;
        oPluginConfigData.worklog_config.username = $("#blog_user_name").val();
        oPluginConfigData.worklog_config.auth = Base64.encode($("#blog_user_name").val() + ":" + $("#blog_password").val());
        oPluginConfigData.worklog_config.username_cn = $("#blog_user_name_cn").val();
        oPluginConfigData.worklog_config.blog_categories = $("#blog_categories").val();
        /*oPluginConfigData.worklog_config.del_add_work_log_input = $('#del_add_work_log_input')[0].checked ? 1 : 0;
        oPluginConfigData.worklog_config.add_work_log_by_input = $('#add_work_log_by_input')[0].checked ? 1 : 0;*/
        oPluginConfigData.worklog_config.check_trac_samp = $("#check_trac_samp").val();
        oPluginConfigData.worklog_config.check_blog_samp = $("#check_blog_samp").val();
        this.fnSetConfig(oPluginConfigData);
        isFirstRun = false;
        this.init();
    };

    tp.fnGetTitle = function(){
        var sUsername = oPluginConfigData.worklog_config.username_cn;

        return "工作日志 " + this.fnGetStringDate() + " " + sUsername;
    };

    tp.fnGetIntDate = function(){
        return date.getFullYear().toString() + (date.getMonth()+1).toString() + date.getDate().toString();
    };

    tp.fnGetStringDate = function(){
        var sWeekDay = '';
        switch(date.getDay()){
            case 0:
                sWeekDay = '星期日';
            break;
            case 1:
                sWeekDay = '星期一';
            break;
            case 2:
                sWeekDay = '星期二';
            break;
            case 3:
                sWeekDay = '星期三';
            break;
            case 4:
                sWeekDay = '星期四';
            break;
            case 5:
                sWeekDay = '星期五';
            break;
            case 6:
                sWeekDay = '星期六';
            break;
            default:
                sWeekDay = '耶稣受难日';
        }

        return date.getFullYear().toString() + "年" + (date.getMonth()+1).toString() + "月" + date.getDate().toString() + '日 ' + sWeekDay;
    };
})(tracPlugin);

$(document).ready(function(){
    tracPlugin.init();

    $("#saveSetting_btn").click(function(){
        tracPlugin.fnSetPluginConfig();
    });

    $("#addWorklog").click(function(){
        tracPlugin.fnSubmitWorklog();
    });

    $("input[id=saveDaftWorklog]").click(function(){
        tracPlugin.fnSaveDaftWorklog();
    });

    $("#short_name_s").click(function(){
        $("#short_name_s").css("display", "none");
        $("#short_name_i").css("display", "");
    });

    $("input[id=short_name]").blur(function(){
        $("#short_name_s").html($(this).val());
        $("#short_name_s").css("display", "");
        $("#short_name_i").css("display", "none");
    });

    $("#title_s").click(function(){
        $("#title_s").css("display", "none");
        $("#title_i").css("display", "");
    });

    $("input[id=title]").blur(function(){
        $("#title_s").html($(this).val());
        $("#title_s").css("display", "");
        $("#title_i").css("display", "none");
    });

    $("#btn_Generate_speed").click(function(){
        var iDays = $("input[id=iDays]").val();
        iDays = 'undefined' == typeof iDays || "" == iDays ? 5 : parseInt(iDays);
        tracPlugin.fnCreateWeeklog(iDays);
    });

    $("#btn_Generate_by_checked").click(function(){
        var aCheckBox = $("li>input[type=checkbox]", $("ul[id=work_log_blog_list]"));
        var aCheckedList = [];
        aCheckBox.each(function(){
            if( this.checked == true ){
                aCheckedList.push(parseInt($(this).val().replace("c_", "")));
            }
        });
        
        if( aCheckedList.length > 0 ){
            tracPlugin.fnCreateWeeklog(aCheckedList);
        }
        else{
            alert('请选择要发布的日志!');
        }
    });
    $("#btn_Generate_back").click(function(){
        $("div[id=generate_week_log_result]").css("display", "none");
        $("div[id=generate_week_log_list]").css("display", "");
    });
});