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
                if( !response.bLogined ){
                    self.fnCallBackProcess('login');
                }
            });

            /*self.fnCallBackProcess('test_ajax');*/

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
            
            if('undefined' != typeof oPluginConfigData.aTracBlogDataList){
                self.fnShowBlogList(oPluginConfigData.aTracBlogDataList);
            }
            else{
                self.fnCallBackProcess('get_blog_list');
            }
        });
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
            oPluginConfigData.worklog_config.work_log_daft = contents;
            this.fnCallBackProcess('set_config', oPluginConfigData);
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
        /*oPluginConfigData.worklog_config.del_add_work_log_input = $('#del_add_work_log_input')[0].checked ? 1 : 0;
        oPluginConfigData.worklog_config.add_work_log_by_input = $('#add_work_log_by_input')[0].checked ? 1 : 0;*/
        oPluginConfigData.worklog_config.check_trac_samp = $("#check_trac_samp").val();
        oPluginConfigData.worklog_config.check_blog_samp = $("#check_blog_samp").val();
        if( oPluginConfigData.worklog_config.check_blog_samp > 0 ){
            this.fnCallBackProcess('set_check_blog_list_by_alarm', oPluginConfigData.worklog_config.check_blog_samp);
        }
        this.fnCallBackProcess('set_config', oPluginConfigData);
        var oSaveBtn = $('input[id=saveSetting_btn]');
        oSaveBtn.val("已保存").attr('disabled', true);
        setTimeout(function(){
            oSaveBtn.val("保存").attr('disabled', false);
        }, 5000);
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