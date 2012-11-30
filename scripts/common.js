var tracPlugin = {};
(function(tp){
    var date = new Date();
    var oInitPluginConfigData = {
                              "version": '1.0.1119',
                              "author": {'tom': 'http://www.mchen.info', 
                                         'paul': 'http://blog.zetng.com'
                              },
                              "worklog_config": {
                                         "url": 'http://trac.iqnode.cn:8010/Kronos',
                                         "username": 'Your login name',
                                         "username_cn": 'Your name(chinese/english)',
                                         "blog_categories": 'Work Log',
                                         "blog_show_number": 20
                              }
    };
    var isFirstRun = false;
    var oPluginConfigData = {};
    var oTracookie = null;
    var aTracBlogDataList = [];
    var sPluginDataName = 'oWorkLogPluginConfigData';
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

        oPluginConfigData = this.fnGetConfig();

        if( isFirstRun ){
            var sNotice = "欢迎使用trac日志工具,这是你的第一次，请先设置本插件，然后<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录trac</a>再使用。当前版本: " + oPluginConfigData.version;
            this.fnShowNotice(sNotice);
        }
        else{
            this.fnHiddenNotice();
        }

        if( false === this.fnCheckTracLogined() ){
            this.fnLoginTracWebSite();
        }

        $("#blog_url").val(oPluginConfigData.worklog_config.url);
        $("#blog_user_name").val(oPluginConfigData.worklog_config.username);
        $("#blog_password").val('hello word!');
        $("#blog_user_name_cn").val(oPluginConfigData.worklog_config.username_cn);
        $("#blog_categories").val(oPluginConfigData.worklog_config.blog_categories);
        $("#del_add_work_log_input").attr('checked', oPluginConfigData.worklog_config.del_add_work_log_input === 1 ? true : false);
        $("#add_work_log_by_input").attr('checked', oPluginConfigData.worklog_config.add_work_log_by_input === 1 ? true : false);
        $("#btn_Generate_speed").attr("disabled", true);
        $("#btn_Generate_by_checked").attr("disabled", true);
        var sShorName = this.fnGetShortName();
        $("#short_name_s").html(sShorName);
        $("input[id=short_name]").val(sShorName);
        var stitle = this.fnGetTitle();
        $("#title_s").html(stitle);
        $("input[id=title]").val(stitle);
        if( oPluginConfigData.worklog_config.add_work_log_by_input == 1){
            $("div[id=worklog_contents_input]").css("display", "");
            $("div[id=worklog_contents_textarea]").css("display", "none");
            $("input[id=saveDaftWorklog]").css("display", "none");
            this.fnCreateBlogInput('today_worklog_contents', false);
            this.fnCreateBlogInput('tomrrow_worklog_contents', false);
        }
        else{
            $("div[id=worklog_contents_input]").css("display", "none");
            $("div[id=worklog_contents_textarea]").css("display", "");
            $("input[id=saveDaftWorklog]").css("display", "");
            $("#submitting").html("");
            var sWorklogDaft = "'''今日工作'''\r\n   * 请在这里输入今日工作内容\r\n\r\n'''明日工作'''\r\n   * 请在这里输入明日工作内容";
            if( 'undefined' !=  typeof oPluginConfigData.worklog_config.work_log_daft ){
                sWorklogDaft = oPluginConfigData.worklog_config.work_log_daft;
            }
            $("textarea[id=" + sWorklogContentId['textarea'] + "]").val(sWorklogDaft)
        }
        this.fnGetBlogList();
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
        if( oPluginConfigData.worklog_config.add_work_log_by_input == 1){
            contents = this.fnCreateWoklogContents(sWorklogContentId['today']) + this.fnCreateWoklogContents(sWorklogContentId['tomrrow']);
        }
        else{
            contents = this.fnCreateWoklogContentsbyTextarea();
        }

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
        if( oPluginConfigData.worklog_config.add_work_log_by_input == 1){
            $("#" + sWorklogContentId['today']).html("");
            $("#" + sWorklogContentId['tomrrow']).html("");
            this.fnCreateBlogInput('today_worklog_contents', false);
            this.fnCreateBlogInput('tomrrow_worklog_contents', false);
        }
        else{
            oPluginConfigData.worklog_config.work_log_daft = "'''今日工作'''\r\n   * 请在这里输入今日工作内容\r\n\r\n'''明日工作'''\r\n   * 请在这里输入明日工作内容";
            this.fnSetConfig(oPluginConfigData);
            $("textarea[id=" + sWorklogContentId['textarea'] + "]").val(oPluginConfigData.worklog_config.work_log_daft);
        }
    };

    tp.fnCreateWoklogContentsbyTextarea = function(){
        var contents = $("textarea[id=" + sWorklogContentId['textarea'] + "]").val();
        
        if( contents.length <= 0 ){
            this.fnShowNotice('请填写日志!');
            return "";
        }

        return contents.replace(/([^\']{3})[\r|\n]{1,2}/ig, "$1[[BR]]\r\n");
    };

    tp.fnCreateWoklogContents = function(oUl, level){
        var self = this;
        if( 'undefined' == typeof oUl ){
            oUl = $('#' + sWorklogContentId['today']);
        }

        if( 'string' == typeof oUl ){
            oUl = $('#' + oUl);
        }

        var sContents = "";
        if( 'undefined' == typeof level ){
            level = 1;
            sContents = $(oUl).attr("id") == sWorklogContentId['today'] ? "'''今日工作'''\r\n" : "'''明日工作'''\r\n";
        }
        
        //var index = 1;
        oUl.children("li").each(function(){
            /*if( 1 === level ){
                sContents = sContents + '    ' + index.toString() + ', ';
                index++;
            }
            else{*/
                sContents = sContents + self.fnCreateSpace(level) + '* ';
            //}

            sContents = sContents + $($("span > input[type=text]", $(this))[0]).val() + " [[BR]]\r\n";
            var childs = $("div > ul", $(this));
            if( childs.length >= 1){
                sContents = sContents + self.fnCreateWoklogContents($(childs[0]), (level + 1));
            }
        });

        return sContents + "\r\n";
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

    tp.fnCreateBlogInput = function(sTargetId, bChild){
        if( 'undefined' == typeof sTargetId ){
            sTargetId = sWorklogContentId['today'];
        }

        if( 'undefined' == typeof bChild ){
            bChild = false;
        }

        if( bChild ){
            var oSiblingChild = this.fnSearchSiblingInput(sTargetId);
            if( false === oSiblingChild ){
                var oDiv = $("<div class='log_child'></div>");
                var sInputId = sTargetId + '_0';
                var oUl = $("<ul id='" + sInputId + "'></ul>");
                oUl.appendTo(oDiv);
                oDiv.appendTo($("li[id=" + sTargetId + "]"));
            }
            else{
                var oLastChild = $(oSiblingChild[oSiblingChild.length - 1]);
                var iFixId = parseInt(oLastChild.attr("id").match(/_[\d]+$/ig)[0].replace("_", "")) + 1;
                var sInputId = sTargetId + '_' + iFixId;
                var oChild = oLastChild;
            }
        }
        else{
            if( sWorklogContentId['tomrrow'] !== sTargetId && sWorklogContentId['today'] !== sTargetId ){
                var iFixId = parseInt($("#" + sTargetId).attr("id").match(/_[\d]+$/ig)[0].replace("_", "")) + 1;
                var sInputId = sTargetId.replace(/_[\d]+$/ig, "_" + iFixId);
                var oChild = $("#" + sTargetId);
            }
            else{
                var oUl = $("ul[id=" + sTargetId + "]");
                var sInputId = sTargetId + '_0';
            }
        }

        var oLi = $("<li id='" + sInputId + "'></li>");
        if( 'undefined' != typeof oUl ){
            oLi.appendTo(oUl);
        }
        else{
            oLi.insertAfter(oChild);
        }
        var oInput = $("<input id='" + sInputId + "' value='' name='" + sInputId + "' type='text' />");
        var oInputSpan = $("<span></span>");
        oInput.appendTo(oInputSpan);
        oInputSpan.appendTo(oLi);
        if( !bChild ){
            var oAddSpan = $("<span></span>");
            var oAdd = $("<img src='../images/add.jpg' title='添加一条日志'/>");
            oAdd.appendTo(oAddSpan);
            oAdd.click(function(){
                tp.fnCreateBlogInput(sInputId, false);
            });
            oAddSpan.appendTo(oLi);
        }
        var oAddCSpan = $("<span></span>");
        var oAddC = $("<img src='../images/add_c.jpg' title='添加一条子日志'/>");
        oAddC.appendTo(oAddCSpan);
        oAddC.click(function(){
            tp.fnCreateBlogInput(sInputId, true);
        });
        oAddCSpan.appendTo(oLi);
        var oRemoveSpan = $("<span></span>");
        var oRemove = $("<img src='../images/remove.jpg' title='删除这条日志'/>");
        oRemove.appendTo(oRemoveSpan);
        oRemove.click(function(){
            if( oLi.parent().is("ul[id=" + sWorklogContentId + "]") && $("ul[id=" + sWorklogContentId + "]").children("li").length <= 1 ){
                alert("不能删除所有日志输入框!");
            }
            else{
                var bConfirmRemove = true;
                if( oPluginConfigData.worklog_config.del_add_work_log_input === 1 ){
                    bConfirmRemove = confirm("是否删除本条日志记录及其子记录?");
                }
                if( bConfirmRemove ){
                    oLi.remove();
                }
            }
        });
        oRemoveSpan.appendTo(oLi);

        return true;
    };

    tp.fnSearchSiblingInput = function(sParentId){
        if( 'undefiend' == typeof sParentId ){
            return false;
        }
        
        var oDiv = $("li[id=" + sParentId + "]").children("div");
        if( oDiv.length === 0 ){
            return false;
        }

        var oUl = $(oDiv[0]).children("ul");
        if( oUl.length === 0 ){
            return false;
        }

        var oChilds = $(oUl[0]).children("li");
        if( oChilds.length > 0 ){
            return oChilds;
        }

        return false;
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

    tp.fnLoginTracWebSite = function(){
        var url = oPluginConfigData.worklog_config.url + '/login';
        var self = this;
        this.fnSendAjaxData(url, [], function(){
            self.fnGetTraCookies()
        });
    };
    

    tp.fnSendAjaxData = function(url, data, successFun, type, header, completeFun){
        var self = this;
        $.ajax({
            url: url,
            beforeSend : function(req) {
                req.setRequestHeader('Authorization', "Basic " + oPluginConfigData.worklog_config.auth);
            },
            data: data,
            success: function(data){
                if( 'function' == typeof successFun ){
                    successFun(data);
                }
            },
            type: ('undefined' == typeof type) ? 'GET' : type,
            headers: ('undefined' == typeof header) ? {} : header,
            complete: function(XHR, statusCode){
                if( 'function' == typeof completeFun ){
                    completeFun(XHR, statusCode);
                }
            },
            statusCode:{403: function(){
                    self.fnShowNotice("服务器权限认证失败，请输入正确的用户名和密码!<br/>如果你没有登录Trac,请先<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录Trac</a>,并忽略前面的提示消息。");
                },
                401: function(){
                    self.fnShowNotice("服务器要求认证权限，请输入正确的用户名和密码!<br/>如果你没有登录Trac,请先<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录Trac</a>,并忽略前面的提示消息。");
                },
                404: function(){
                    self.fnShowNotice("无法连接服务。");
                }
            }
        });
    };

    tp.fnCheckAjaxUrl = function(url, data, successFun, type, header){
        var self = this;
        $.ajax({
            url: url,
            beforeSend : function(req) {
                req.setRequestHeader('Authorization', "Basic " + oPluginConfigData.worklog_config.auth);
            },
            data: data,
            success: function(data){
                if( 'function' == typeof successFun ){
                    successFun(200);
                }
            },
            type: ('undefined' == typeof type) ? 'GET' : type,
            headers: ('undefined' == typeof header) ? {} : header,
            statusCode:{403: function(){
                    if( 'function' == typeof successFun ){
                        successFun(403);
                    }
                },
                    401: function(){
                    if( 'function' == typeof successFun ){
                        successFun(401);
                    }
                },
                    404: function(){
                    if( 'function' == typeof successFun ){
                        successFun(404);
                    }
                }
            }
        });
    };

    tp.fnCheckTracLogined = function(){
        var oCookies = null == oTracookie ? this.fnGetTraCookies() : oTracookie;
        if( 'undefined' != typeof oCookies && null !== oCookies ){
            return true;
        }

        return false;
    };

    tp.fnGetTraCookies = function(){
        chrome.cookies.getAll(this.fnGetUrlInfo(), function(cookies){
            if( null != cookies ){
                oTracookie = {};
                for( var i=0; i < cookies.length; i++ ){
                    oTracookie[cookies[i].name] = cookies[i].value;
                }
            }

            return oTracookie;
        });
    };

    tp.fnGetUrlInfo = function(){
        var sUrl = oPluginConfigData.worklog_config.url;
        var sUrlRex = /^http\:\/\/([^\/]*)/ig;
        var sPathRex = /^\/([^\/]*)/ig;
        var aDomain = sUrl.match(sUrlRex);
        var sDomain = (aDomain[0].replace("http://", "").split(":"))[0];
        var sPath = sPathRex.exec(sUrl.replace(aDomain[0], ""));
        
        if( null != sPath ){
            return {'domain': sDomain,'path': sPath[0]};
        }
        else{
            return {'domain': sDomain};
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
        oPluginConfigData.worklog_config.del_add_work_log_input = $('#del_add_work_log_input')[0].checked ? 1 : 0;
        oPluginConfigData.worklog_config.add_work_log_by_input = $('#add_work_log_by_input')[0].checked ? 1 : 0;
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

    tp.fnGetConfig = function(){
        var _localStorage = window.localStorage;
        if( !_localStorage ){
            alert('你的浏览器不支持本地存储数据,请先在chrome中打开本地存储数据选项。chrome://configures');
            return ;
        }
        
        var oConfigData = _localStorage.getItem(sPluginDataName);
        if( null == oConfigData || 'undefined' == typeof oConfigData || "undefined" == oConfigData ){
            this.fnSetConfig();
            isFirstRun = true;
            return oInitPluginConfigData;
        }

        isFirstRun = false;
        return JSON.parse(oConfigData);
    };

    tp.fnSetConfig = function(data){
        if( 'undefined' == typeof data ){
            data = oInitPluginConfigData;
        }

        window.localStorage.setItem(sPluginDataName, JSON.stringify(data));
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