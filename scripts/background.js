chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
   switch( request.action ){
        case 'set_config':
            tracPluginBackGround.fnSetConfig(request.data);
        break;

        case 'get_config':
            var oData = tracPluginBackGround.fnGetConfig();
            if( 'function' == typeof sendResponse ){
                sendResponse({'sender': sender, 'oData': oData});
            }
        break;
        
        case 'login':
            tracPluginBackGround.fnLoginTracWebSite();
        break;
        
        case 'check_logined':
            var bLogined = tracPluginBackGround.fnCheckTracLogined();
            if( 'function' == typeof sendResponse ){
                sendResponse({'sender': sender, 'bLogined': bLogined});
            }
        break;

        case 'test_ajax':
            tracPluginBackGround.fnAjaxTest();
        break;

        case 'get_blog_list':
            tracPluginBackGround.fnGetBlogList(true);
        break;

        case 'set_check_blog_list_by_alarm':
            tracPluginBackGround.fnSetCheckBlogListAlarm(request.data);
        break;

        case 'add_worklog_auto_send_alarm':
            tracPluginBackGround.fnAddWorklogAutoSendAlarm(request.data);
        break;

        case 'remove_worklog_auto_send_alarm':
            tracPluginBackGround.fnRemoveAlarm("autoSendWorkLog");
        break;

        case 'send_work_log':
            tracPluginBackGround.fnSendWorkLog(request.data['shortname'], request.data['title'], request.data['contents']);
        break;
   }
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    switch(alarm.name)
    {
        case 'checkBlogList':
            tracPluginBackGround.fnGetBlogList();
        break;

        case 'autoSendWorkLog':
            tracPluginBackGround.fnAutoSendWorkLog();
        break;
    }
});

var tracPluginBackGround = {};

(function(tp){
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
                                         "blog_show_number": 20,
                                         "check_trac_samp": 0,
                                         "check_blog_samp": 60
                              },
                              "work_log_data":{
                                         "title": "",
                                         "daft": "",
                                         "shrotname": "",
                                         "is_save_daft": 0
                             }
    };

    var oPluginConfigData;
    var sPluginDataName = 'oWorkLogPluginConfigData';
    var oTracookie = null;

    tp.showVersion = function(){
        console.log('1.0.1204');
    };

    tp.init = function(){
        var oConfig = oPluginConfigData = this.fnGetConfig();
        
        if( 'undefined' != typeof oConfig.worklog_config.check_trac_samp && oConfig.worklog_config.check_trac_samp > 0 ){
            //this.fnCheckTrac(oConfig.worklog_config.check_trac_samp);
        }

        if( 'undefined' != typeof oConfig.worklog_config.check_blog_samp && oConfig.worklog_config.check_blog_samp > 0 ){
            this.fnUpdateBlog(oConfig.worklog_config.check_blog_samp);
        }
    };

    tp.fnLoginTracWebSite = function(){
        oPluginConfigData = 'undefined' == typeof oPluginConfigData ? this.fnGetConfig() : oPluginConfigData;
        var url = oPluginConfigData.worklog_config.url + '/login';
        var self = this;
        this.fnSendAjaxData(url, [], function(){
            self.fnGetTraCookies()
        });
    };

    tp.fnSendWorkLog = function(sShortname, sTitle, contents){
        if( contents !== "" ){
            oPluginConfigData = 'undefined' == typeof oPluginConfigData ? this.fnGetConfig() : oPluginConfigData;
            var oTracookie = this.fnGetTraCookies();
            var sUrl = oPluginConfigData.worklog_config.url + '/blog/' + sShortname;
            var self = this;
            self.fnShowNotifications("请注意:", '你设置的定时发送日志已经启动，开始发送日志了哦，亲。');
            self.fnGetCallPopupFunc('fnChangeSubmitWorklogStats', ['正在检查日志是否存在，请耐心等待...', true]);
            oPluginConfigData.send_blog_notice = '正在检查日志是否存在，请耐心等待...';
            oPluginConfigData.send_bloging = 1;
            self.fnSetConfig(oPluginConfigData);
            var iSendLogoIndex = 1;
            var oSendLogoInterval = setInterval(function(){
                iSendLogoIndex = iSendLogoIndex > 4 ? 1 : iSendLogoIndex;
                chrome.browserAction.setIcon({path: './logo/trac_logo_send_' + iSendLogoIndex + '.png'});
                iSendLogoIndex++;
            }, 500);
            
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

                self.fnGetCallPopupFunc('fnChangeSubmitWorklogStats', ['正在发送日志到服务器，请耐心等待...', true]);
                oPluginConfigData.send_blog_notice = '正在发送日志到服务器，请耐心等待...';
                self.fnSetConfig(oPluginConfigData);
                self.fnSendAjaxData(url, {}, function(data){
                    var rFormTokenRegexp = /[\s\S]*<input type="hidden" name="__FORM_TOKEN" value="(.*)?" \/>[\s\S]*/g;
                    var sFormToken = data.replace(rFormTokenRegexp, "$1");
                    oData['__FORM_TOKEN'] = sFormToken;
                    self.fnSendAjaxData(url, oData, function(datas){
                        self.fnGetCallPopupFunc('fnChangeSubmitWorklogStats', [sAction == 'new' ? "日志发布成功!" : "日志更新成功!", false]);
                        self.fnGetCallPopupFunc('fnResetWoklogContents');
                        clearInterval(oSendLogoInterval);
                        self.fnShowNotifications("恭喜你:", '日志已经成功发送,如需确认请打开trac即可。');
                        chrome.browserAction.setIcon({path: './logo/trac_logo_32.png'});
                        oPluginConfigData.send_blog_notice = '';
                        oPluginConfigData.send_bloging = 0;
                        oPluginConfigData.work_log_data.is_save_daft = 0;
                        self.fnSetConfig(oPluginConfigData);
                    }, 'POST', oTracookie);
                }, 'GET', oTracookie);
            }, 'GET', oTracookie);
        }
    };

    tp.fnAutoSendWorkLog = function(){
        oPluginConfigData = 'undefined' == typeof oPluginConfigData ? this.fnGetConfig() : oPluginConfigData;
        var aPopup = chrome.extension.getViews({type: "popup"});
        if(1 == oPluginConfigData.work_log_data.is_save_daft && aPopup.length == 0 && oPluginConfigData.send_bloging != 1){
            this.fnSendWorkLog(oPluginConfigData.work_log_data.shortname, oPluginConfigData.work_log_data.title, oPluginConfigData.work_log_data.daft);
        }
    };

    tp.fnShowNotifications = function(title, msg){
        var notification = window.webkitNotifications.createNotification(
            '../logo/trac_logo_32.png',
            title,
            msg
        );
        notification.show();
    };

    tp.fnUpdateBlog =  function(iSamp){
        if( !this.fnCheckAlarmbyName("checkBlogList") ){
            chrome.alarms.create("checkBlogList", {periodInMinutes: parseInt(iSamp)});
        }
    };

    tp.fnSetCheckBlogListAlarm = function(iSamp){
        this.fnRemoveAlarm("checkBlogList");
        chrome.alarms.create("checkBlogList", {periodInMinutes: parseInt(iSamp)});
    };

    tp.fnAddWorklogAutoSendAlarm = function(iSamp){
        this.fnRemoveAlarm("autoSendWorkLog");
        chrome.alarms.create("autoSendWorkLog", {when: parseInt(iSamp)});
    };

    tp.fnRemoveAlarm = function(sAlarmName){
         if( this.fnCheckAlarmbyName(sAlarmName) ){
            chrome.alarms.clear(sAlarmName);
        }
    };

    tp.fnCheckAlarmbyName =  function(sName){
        var bIsExists = false;
        chrome.alarms.getAll(function(alarms){ 
            if( alarms.length > 0 ){
                for(var i=0;i<alarms.length && !bIsExists; i++ ){
                    if( alarms[i].name == sName ){
                        bIsExists = true;
                    }
                }
            }
        });
        return bIsExists;
    };

    tp.fnGetCallPopupFunc = function(sFunName, vParams){
        var oPopup = this.fnGetPopupObject();
        if( oPopup != null ){
            if( oPopup.hasOwnProperty(sFunName) && 'function' == typeof oPopup[sFunName] ){
               var fnCall = oPopup[sFunName];
               switch(sFunName){
                    case 'fnShowNotice':
                        return fnCall(vParams);
                    break;
                    case 'fnChangeSubmitWorklogStats':
                        return fnCall(vParams[0], vParams[1]);
                    break;
                    case 'fnShowBlogList':
                        return fnCall(vParams);
                    break;
                    default:
                        return fnCall();
                    break;
               }
            }
        }

        return ;
    };

    tp.fnGetPopupObject = function(){
        var aPopup = chrome.extension.getViews({type: "popup"});
        if( aPopup.length > 0 ){
            var oPopup = aPopup[0];
            if( oPopup.hasOwnProperty('tracPlugin') && 'object' == typeof oPopup.tracPlugin ){
                return oPopup.tracPlugin;
            }
        }

        return null;
    };

    tp.fnGetBlogList = function(bIsMustBe){
        if( 'undefined' != typeof bIsMustBe && !bIsMustBe && !this.fnCheckinWorkTime()){
            return ;
        }
        oPluginConfigData = 'undefined' == typeof oPluginConfigData ? this.fnGetConfig() : oPluginConfigData;
        var url = oPluginConfigData.worklog_config.url + '/blog/author/' + oPluginConfigData.worklog_config.username;
        var self = this;

        this.fnSendAjaxData(url, [], function(data){
            //var sBlogListReg = new RegExp('<h1 class="blog-title" id="(.*)"><a href="(.*)">(.*)<\/a>(.|\n*)<div class="blog-body">(.|\n*)<\/div>', 'ig');
            var aTracBlogDataList = [];
            var sBlogListReg = new RegExp('<h1 class="blog-title"(.|\n|\r)*?<ul class="metainfo"', 'ig');
            var aBlogList = data.match(sBlogListReg);
            var sBlogAReg = new RegExp('<a href="(.*)">(.*)<\/a>', 'ig');
            var sBlogHrefReg = new RegExp('href="(.*)"', 'ig');
            var sBlogTitleReg = new RegExp('>(.*)<', 'ig');
            var aShowList = [];
            if( aBlogList != null && aBlogList.length > 0 ){
                for(var i=0; i < aBlogList.length; i++ ){
                    var sListString = aBlogList[i];
                    var aAString = sListString.match(sBlogAReg);
                    var aHref = aAString[0].match(sBlogHrefReg);
                    var sHref = aHref[0].replace("href=\"", "").replace('"', '');
                    var aTitle = aAString[0].match(sBlogTitleReg);
                    var sTtile = aTitle[0].substr(1, aTitle[0].length - 2);
                    var sBody = self.fnGetLogBody(sListString);
                    aTracBlogDataList.push({'title': sTtile, 'href': sHref, 'body': sBody});
                    if( oPluginConfigData.worklog_config.blog_show_number > i ){
                        aShowList.push({'title': sTtile, 'href': sHref, 'body': sBody});
                    }
                }

                oPluginConfigData.aTracBlogDataList = aTracBlogDataList;
                self.fnSetConfig(oPluginConfigData);
                self.fnGetCallPopupFunc('fnShowBlogList', aShowList);
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

    tp.fnSendAjaxData = function(url, data, successFun, type, header, completeFun){
        var self = this;
        self.fnAjax({
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
                    self.fnGetCallPopupFunc('fnShowNotice', "服务器权限认证失败，请输入正确的用户名和密码!<br/>如果你没有登录Trac,请先<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录Trac</a>,并忽略前面的提示消息。");
                },
                401: function(){
                    self.fnGetCallPopupFunc('fnShowNotice', "服务器权限认证失败，请输入正确的用户名和密码!<br/>如果你没有登录Trac,请先<a href='" + oPluginConfigData.worklog_config.url + "' target='_blank'>登录Trac</a>,并忽略前面的提示消息。");
                },
                404: function(){
                    self.fnGetCallPopupFunc('fnShowNotice', "无法连接服务。");
                }
            }
        });
    };

    tp.fnCheckAjaxUrl = function(url, data, successFun, type, header){
        var self = this;
        self.fnAjax({
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

    tp.fnAjax = function(oData){
        var xhr = this.fnCreateXmlHttpRequestObject();
        if( xhr == null ){
            return ;
        }

        if( 'undefined' == typeof oData.type ){
            oData.type = 'GET';
        }
        
        var url = oData.hasOwnProperty('url') ? oData.url : '/';
        var sQstr = '';
        if( 'undefined' != typeof oData.data ){
            if( 'object' == typeof oData.data && !(oData.data instanceof Array) ){
                for( var key in oData.data ){
                    if( 'object' == typeof oData.data && oData.data instanceof Array ){
                        for(var i = 0;i<oData.data[key]; i++ ){
                            sQstr += '&' + key + '=' + oData.data[key][i];
                        }
                    }
                    else{
                        sQstr += '&' + key + '=' + oData.data[key];
                    }
                }
            }
            else{
                sQstr = oData.data;
            }
        }

        if( 'GET' == oData.type && '' != sQstr ){
            var aUrl = url.split("?");
            if( aUrl.length > 1 ){
                url += sQstr.substr(0,1) == "&" ? sQstr : '&' + sQstr;
            }
            else{
                url += sQstr.substr(0,1) == "?" ? sQstr : '?' + sQstr;
            }

            url = url.replace("?&", "?");
        }

        xhr.open(oData.type, url, false);

        if( 'object' == typeof oData.beforeSend ){
            tp.fnSendAjaxHeader(xhr, oData.beforeSend);
        }
        else if( 'function' == typeof oData.beforeSend ){
            var fnBeforeSend = oData.beforeSend;
            tp.fnSendAjaxHeader(xhr);
            fnBeforeSend(xhr);
        }

        xhr.onreadystatechange = function(){
            if( xhr.readyState == 4 ){

                if( oData.hasOwnProperty('statusCode') && 'object' == typeof oData.statusCode ){
                    if( oData.statusCode.hasOwnProperty(xhr.status) && 'function' == typeof oData.statusCode[xhr.status] ){
                        var fnStatusCode = oData.statusCode[xhr.status];
                        fnStatusCode();
                    }
                }

                if( 200 == xhr.status ){
                    if( 'function' == typeof oData.success ){
                        var fnSuccess = oData.success;
                        fnSuccess( (xhr.responseType == "" || xhr.responseType == "text") ? xhr.responseText : xhr.responseXML );
                    }
                }
            }
            else if(xhr.readyState == 2 && oData.hasOwnProperty('responseHeader') && 'function' == typeof oData.responseHeader ) {
                var oResponseHeader = xhr.getAllResponseHeaders();
                var fnResponseHeader = oData.responseHeader;
                fnResponseHeader(oResponseHeader);
            }
        };

        if( 'POST' == oData.type ){
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        }

        if( 'undefined' == sQstr || 'GET' == oData.type ){
            xhr.send(null);
        }
        else{
            xhr.send( (sQstr.substr(0,1) == "&") ? sQstr.substr(1,sQstr.length-1):sQstr );
        }
    };

    tp.fnCreateXmlHttpRequestObject = function(){
        var xmlHttp = null;
        if (window.XMLHttpRequest)
        {
            xmlHttp=new XMLHttpRequest();
        }
        else if (window.ActiveXObject)
        {
            xmlHttp=new ActiveXObject("Microsoft.XMLHTTP");
        }

        return xmlHttp;
    };

    tp.fnCheckinWorkTime = function(){
        var date = new Date();
        var iHour = date.getHours();
        if( iHour >= 7 && iHour < 18){
            return true;
        }

        return false;
    };

    tp.fnSendAjaxHeader = function(oXhr, oUserHeader){
        /*var oDefault = {'Accept': '*\/*',
                        'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
                        'Accept-Encoding': 'gzip,deflate,sdch',
                        'Accept-Language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'max-age=0',
                        'Cookie': '',
                        'Cookie2': '',
                        'Host': '',
                        'Referer': '',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
                        };
         
         for( var key in oDefault ){
            if( 'undefined' == typeof oUserHeader || !oUserHeader.hasOwnProperty(key) ){
                oXhr.setRequestHeader(key, oDefault[key]);
            }
         }*/

        if( 'undefined' != typeof oUserHeader ){
            for( var key in oUserHeader ){
               oXhr.setRequestHeader(key, oUserHeader[key]);
            }
        }
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
        oPluginConfigData = 'undefined' == typeof oPluginConfigData ? this.fnGetConfig() : oPluginConfigData;
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
        else{
            oPluginConfigData = data;
        }

        window.localStorage.setItem(sPluginDataName, JSON.stringify(data));
    };
})(tracPluginBackGround);

tracPluginBackGround.init();

