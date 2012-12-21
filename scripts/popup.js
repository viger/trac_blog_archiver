var tracPlugin = {};
(function(tp){
    var date = new Date();
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

            if( !oPluginConfigData.worklog_config.is_configed ){
                var sNotice = "欢迎使用trac日志工具,这是你的第一次，请先设置本插件，然后<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录trac</a>再使用。当前版本: " + oPluginConfigData.version;
                self.fnShowNotice(sNotice);
            }
            else{
                self.fnHiddenNotice();
                self.fnCallBackProcess('check_logined', undefined, function(response){
                    if( !response.bLogined ){
                        self.fnCallBackProcess('login');
                    }
                    else{
                        self.fnReflushBlogList(oPluginConfigData);
                    }
                });
            }

            $("#blog_url").val(oPluginConfigData.worklog_config.url);
            $("#blog_user_name").val(oPluginConfigData.worklog_config.username);
            $("#blog_password").val('hello word!');
            $("#blog_user_name_cn").val(oPluginConfigData.worklog_config.username_cn);
            $("#blog_categories").val(oPluginConfigData.worklog_config.blog_categories);
            if( 'undefined' != typeof oPluginConfigData.worklog_config.check_blog_samp ){
                $("#check_blog_samp").find("option[value='" + oPluginConfigData.worklog_config.check_blog_samp + "']").attr("selected",true);
            }

            if( 'undefined' != typeof oPluginConfigData.worklog_config.check_trac_samp ){
                $("#check_trac_samp").find("option[value='" + oPluginConfigData.worklog_config.check_trac_samp + "']").attr("selected",true);
            }
            $("#blog_show_number").val(oPluginConfigData.worklog_config.blog_show_number);
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
            var sendBlogTimeOld = parseInt(oPluginConfigData.send_blog.time_samp) + 28800000 - date.getTime();
            if( 'undefined' !=  typeof oPluginConfigData.work_log_data && 'undefined' !=  typeof oPluginConfigData.work_log_data.daft && oPluginConfigData.work_log_data.daft != "" ){
                sWorklogDaft = oPluginConfigData.work_log_data.daft;
            }
            $("textarea[id=" + sWorklogContentId['textarea'] + "]").val(sWorklogDaft);

            if( true === oPluginConfigData.send_blog.stats  && sendBlogTimeOld > 0 ){
                self.fnChangeSubmitWorklogStats(oPluginConfigData.send_blog_notice, true);
            }
            else{
                self.fnChangeSubmitWorklogStats('', false);
            }
            
            if( 1 == oPluginConfigData.work_log_data.auto_send ){
                document.getElementById("worklog_auto_send").checked = true;
                $("input[id=worklog_auto_send_time]").val(oPluginConfigData.work_log_data.auto_send_timer);
            }
            else{
                document.getElementById("worklog_auto_send").checked = false;
                $("input[id=worklog_auto_send_time]").val("18:10");
            }
        });
    };

    tp.fnReflushBlogList = function(oPluginConfigData){
         if('undefined' != typeof oPluginConfigData && oPluginConfigData.hasOwnProperty('aTracBlogDataList')  && 'undefined' != typeof oPluginConfigData.aTracBlogDataList){
                this.fnShowBlogList(oPluginConfigData.aTracBlogDataList);
            }
            else{
                $("span[id=loading_blog_list]").css("display", "block");
                this.fnCallBackProcess('get_blog_list');
            }
    };

    tp.fnCallBackProcess = function(action, vData, fnCallBack){
        if( 'undefined' == typeof action ){
            return ;
        }
        
        var request = {'action': action};
        if( 'undefined' != typeof vData ){
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
            oPluginConfigData.work_log_data.daft = contents;
            oPluginConfigData.work_log_data.is_save_daft = 1;
            oPluginConfigData.work_log_data.shortname =this.fnGetShortName();
            oPluginConfigData.work_log_data.title =this.fnGetTitle();
            this.fnCallBackProcess('set_config', oPluginConfigData);
            $("#submitting").html("草稿已保存!");
        }
    };

    tp.fnAddAutoSendAlarm = function(){
        var sTimer = $("input[id=worklog_auto_send_time]").val();
        var now = new Date();
        if( sTimer != ""){
            var aTimer = sTimer.split(":");
            if((parseInt(aTimer[0]) >= 0 &&　parseInt(aTimer[0]) < 24) && (parseInt(aTimer[1]) >=0 && parseInt(aTimer[1]) < 60)){
                var sWhen = sTimer + " " + (now.getMonth() + 1).toString() + "/" + now.getDate().toString() + "/" + now.getFullYear().toString();
                var when = Date.parse(sWhen);
                oPluginConfigData.work_log_data.auto_send = 1;
                oPluginConfigData.work_log_data.auto_send_timer = sTimer;
                this.fnCallBackProcess('set_config', oPluginConfigData);
                this.fnCallBackProcess('add_worklog_auto_send_alarm', when);
            }
        }
    };

    tp.fnRemoveAutoSendAlarm = function(){
        oPluginConfigData.work_log_data.auto_send = 0;
        oPluginConfigData.work_log_data.auto_send_timer = 0;
        this.fnCallBackProcess('set_config', oPluginConfigData);
        this.fnCallBackProcess('remove_worklog_auto_send_alarm');
    };

    tp.fnSubmitWorklog = function(){
        var sShortname = $("input[id=short_name]").val();
        var sTitle = $("input[id=title]").val();
        var contents = this.fnCreateWoklogContentsbyTextarea();
        this.fnChangeSubmitWorklogStats("已转交后台发送,你可以处理其他事务，但是你不能关闭浏览器...", true);
        
        this.fnCallBackProcess('send_work_log', {'shortname': sShortname,
                                                 'contents': contents,
                                                 'title': sTitle
                              });
    };

    tp.fnChangeSubmitWorklogStats = function(msg, disabled){
        if('undefined' != typeof disabled){
            $("#addWorklog").attr('disabled', disabled);
        }
        
        $("#submitting").html(msg);
    };

    tp.fnResetWoklogContents =  function(){
            /*$("textarea[id=" + sWorklogContentId['textarea'] + "]").val("'''今日工作'''\r\n   * 请在这里输入今日工作内容\r\n\r\n'''明日工作'''\r\n   * 请在这里输入明日工作内容");*/
            document.getElementById("worklog_auto_send").checked = false;
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
                sWeekLog += oPluginConfigData.aTracBlogDataList[i].body;
            }
        }
        else{
            if( vData.length < 1 ){
                this.fnShowNotice("生成日志最少需要一天吧，亲！");
                return ;
            }

            $.each(vData, function(i, n){
                sWeekLog += oPluginConfigData.aTracBlogDataList[n].body;
            });
        }
        
        sWeekLog += '\r\n本周工作\r\n';
        $("div[id=generate_week_log_result]").css("display", "");
        $("div[id=generate_week_log_list]").css("display", "none");
        $("#generate_week_log_result_title").val(this.fnGetTitle("周报"));
        $("#generate_week_log_result_textarea").text(sWeekLog);
    };

    tp.fnShowBlogList = function(oData){
        oData = 'undefined' == typeof oData ? oPluginConfigData.aTracBlogDataList : oData;
        var oShowList = $("ul[id=work_log_blog_list]");
        $("span[id=loading_blog_list]").css("display", "none");
        $("#btn_Generate_speed").attr("disabled", false);
        $("#btn_Generate_by_checked").attr("disabled", false);
        if( oData.length > 0){
            for( var i=0; i < oData.length && i < 20; i++){
                var oCheckBox = $("<input type='checkbox' value='c_" + i + "' url='" + oData[i]['href'] + "' name='blog_list_checkbox' style='width:25px;margin-right:10px;' />");
                var oSpan = $("<span>" + oData[i]['title'] + "</span>");
                var oLi = $("<li></li>");
                oCheckBox.appendTo(oLi);
                oSpan.appendTo(oLi);
                oLi.appendTo(oShowList);
            }
        }
        else{
           $("span[id=loading_blog_list]").html("你还没有发布日志吧~");
        }
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
        oPluginConfigData.worklog_config.check_trac_samp = $("#check_trac_samp").val();
        var blog_show_number = oPluginConfigData.worklog_config.blog_show_number;
        oPluginConfigData.worklog_config.blog_show_number = $("#blog_show_number").val();
        oPluginConfigData.worklog_config.check_blog_samp = $("#check_blog_samp").val();
        oPluginConfigData.worklog_config.is_configed = true;
        if( oPluginConfigData.worklog_config.check_blog_samp > 0 ){
            this.fnCallBackProcess('set_check_blog_list_by_alarm', oPluginConfigData.worklog_config.check_blog_samp);
        }
        else{
             this.fnCallBackProcess('remove_check_blog_list_by_alarm');
        }
        this.fnCallBackProcess('set_config', oPluginConfigData);
        if( blog_show_number != oPluginConfigData.worklog_config.blog_show_number ){
            this.fnCallBackProcess('get_blog_list');
        }
        var oSaveBtn = $('input[id=saveSetting_btn]');
        oSaveBtn.val("已保存").attr('disabled', true);
        setTimeout(function(){
            oSaveBtn.val("保存").attr('disabled', false);
        }, 5000);
        this.init();
    };

    tp.fnGetTitle = function(prefix){
        var sUsername = oPluginConfigData.worklog_config.username_cn;
        prefix = ("undefined" == typeof prefix) ? "工作日志" : prefix;

        return prefix + " " + this.fnGetStringDate() + " " + sUsername;
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
    $("#tabs").tabs();

    tracPlugin.init();

    $("#saveSetting_btn").click(function(){
        tracPlugin.fnSetPluginConfig();
    });

    $("#addWorklog").click(function(){
        tracPlugin.fnSubmitWorklog();
    });

    $(document).delegate("#worklog_contents_textarea", "keyup change", function(){
        tracPlugin.fnSaveDaftWorklog();
    });

    $("input[id=btn_get_blog_list]").click(function(){
        tracPlugin.fnReflushBlogList();
    });

    $("input[id=worklog_auto_send]").click(function(){
        if( this.checked == true ){
            tracPlugin.fnAddAutoSendAlarm();
        }
        else{
            tracPlugin.fnRemoveAutoSendAlarm();
        }
    });

    $("input[id=worklog_auto_send_time]").change(function(){
        if( document.getElementById("worklog_auto_send").checked == true ){
            tracPlugin.fnAddAutoSendAlarm();
        }
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