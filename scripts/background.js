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
   }
});

//chrome.alarms.create("checkBlogList", {periodInMinutes: 0.1});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name == "checkBlogList")
    {
       window.localStorage.setItem("background_data_alarm", alarm.scheduledTime );
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
                                         "check_blog_samp": 0
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
            this.fnCheckTrac(oConfig.worklog_config.check_trac_samp);
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

    tp.fnAjaxTest =  function(){
        var self = this;
        self.fnAjax({
            url: 'http://rss.tom.me',
            data: {'action': 'add'},
            type: 'POST',
            success: function(data){
                console.log(data);
            }
        });
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

    tp.fnSendAjaxHeader = function(oXhr, oUserHeader){
        var oDefault = {'Accept': '*/*',
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
         }

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

        window.localStorage.setItem(sPluginDataName, JSON.stringify(data));
    };
})(tracPluginBackGround);

