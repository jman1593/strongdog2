var CCTLMultiplayerGui = function(){
    
    this._cssClassDomain = "ctl-multiplayer-";
    this._idCurDialog;
    this._idLoadingDialog;
    this._szLocalStorageNicknamePath = GAME_NAME + "_nickname";
    
    var szNickName = localStorage.getItem(this._szLocalStorageNicknamePath);
    var szRandomNick = "";//s_oNetworkManager.generateRandomName();
    this._szNickName = ( (szNickName === null || szNickName === undefined) ? szRandomNick : szNickName);
  
  
    jQuery(document).on( "click", "." + this._cssClassDomain + "room-list li", function(){
        //buildRoomList
        g_oCTLMultiplayer.closeCurrentDialog();
        
        var szRoomName = jQuery(this).text();

        if( jQuery(this).attr("data-private") === "true" ){
            g_oCTLMultiplayer.showTypeRoomPassword(szRoomName);
        }else{
            g_oCTLMultiplayer.showLoading(TEXT_NETWORK_CONNECTING);
            on_ctl_multiplayer_join_room(szRoomName);
        }
    });
    
    jQuery(document).on("click", ".ctl-multiplayer-icons-cancel", function(){
        g_oCTLMultiplayer.closeCurrentDialog();
    });
    
};

CCTLMultiplayerGui.prototype.refreshRoomList = function( aRoomList ){
    var html = '';

    for( var i = 0; i < aRoomList.length; i++ ){    
        html += '<li data-private="' + aRoomList[i].private + '">'
            
            html += '<span>';
            html += aRoomList[i].name;
            html += '</span>';
           
            if( aRoomList[i].private === true ){
                html += '<i class="' + this._cssClassDomain + 'icons-lock"></i>';
            }
            
        html += '</li>'
    }
    
    jQuery('.'+this._cssClassDomain+'room-list').html(html);
};


CCTLMultiplayerGui.prototype.showRoomList = function( aRoomList ){
    var html = '';

    html += '<button onclick="on_ctl_multiplayer_refresh_room_list()" type="button" class="'+this._cssClassDomain+'update '+this._cssClassDomain+'btn-gray">';
        html += '<i class="'+this._cssClassDomain+'icons-arrows-cw"></i>';
        html += '<span>update</span>';
    html += '</button>'
    html += '<ul class="'+this._cssClassDomain+'room-list">';
    html += '</ul>';


    this._idCurDialog = this.showDialog( "Join a Match:", html, 
    [ 
        {   txt : "create match", 
            cb : "on_ctl_multiplayer_show_create_match", 
            classes : "" },          
        
        {   txt : "play random opponent", 
            cb : "on_ctl_multiplayer_join_quick_match", 
            classes : "ctl-multiplayer-play-random-opponent-btn" },  
        

        
        {   txt : "play offline", 
            cb : "on_ctl_multiplayer_play_offline", 
            classes : "ctl-multiplayer-btn-play-offline" }/*, 
        
        {   txt : "back", 
            cb : "g_oCTLMultiplayer.closeCurrentDialog", 
            classes : "" }*/
    ], "ctl-multiplayer-join-a-match-dlg" );
    
    this.refreshRoomList(aRoomList);
    
};

CCTLMultiplayerGui.prototype.showTypeRoomPassword = function(szRoomName){
    
    var html = '';
    
    html += '<div class="'+ this._cssClassDomain +'form-group">';
        html += '<label>Type Room Password</label>';
        html += '<input type="password" name="password" data-room-name="'+szRoomName+'">';
    html += '</div>';

    this._idCurDialog = this.showDialog( "Type Room Password", html, 
    [ 
        {   txt : "ok", 
            cb : "on_ctl_multiplayer_send_password", 
            classes : "" },
        {   txt : "back", 
            cb : "on_ctl_multiplayer_close_type_room_password", 
            classes : "" }
    ] );
};


CCTLMultiplayerGui.prototype.showCreateRoom = function(){
    
    var html = '';
    
    html += '<div class="'+ this._cssClassDomain +'form-group">';
        html += '<label>Name Room</label>';
        html += '<input type="text" name="roomname" disabled="disabled" value="'+ this._szNickName + '\'s room">';
    html += '</div>';
    
    html += '<div class="'+ this._cssClassDomain +'form-group">';    
        html += '<label>Password (optional)</label>';
        html += '<input type="password" name="password">';
        html += '<p>If you don\'t set a password this room will be public.</p>'
    html += '</div>';
    
    this._idCurDialog = this.showDialog( "Create room", html, 
    [ 
        {   txt : "create", 
            cb : "on_ctl_multiplayer_create_room", 
            classes : "" }/*,
        {   txt : "back", 
            cb : "on_ctl_multiplayer_close_create_room", 
            classes : "" }*/
    ] );
};


CCTLMultiplayerGui.prototype.showChooseNickName = function(){
    if(this._szNickName === "" || this._szNickName === null || this._szNickName === undefined){
        this._szNickName = s_oNetworkManager.generateRandomName();
    }

    var html = '<input type="text" name="nickname" disabled="disabled" maxlength="20" value="'+ this._szNickName +'">';
    //html += '<ul class="'+this._cssClassDomain+'room-list">';
    //html += '</ul>';
    html += '<button onclick="g_oCTLMultiplayer._generateNewRandomName()" type="button" class="'+this._cssClassDomain+'new-nickname '+this._cssClassDomain+'btn-gray">';
        html += '<i class="'+this._cssClassDomain+'icons-arrows-cw"></i>';
        html += '<span>generate new</span>';
    html += '</button>'
    
    this._idCurDialog = this.showDialog( "CHOOSE NICKNAME", html, 
    [ 
        {   txt : "ok", 
            cb : "on_ctl_multiplayer_send_nickname", 
            classes : "" }/*,
        {   txt : "close", 
            cb : "g_oCTLMultiplayer.closeCurrentDialog", 
            classes : "" }*/
    ] );
};

CCTLMultiplayerGui.prototype._generateNewRandomName = function(){
    var szRandomName = s_oNetworkManager.generateRandomName();
    this._szNickName = szRandomName;
    
    jQuery("input[name=nickname]").val(this._szNickName);
};

CCTLMultiplayerGui.prototype.showGeneralDialog = function(szText, szCallback){
    //var html = '<input type="text" name="nickname" value="'+ this._szNickName +'">';
    this._idCurDialog = this.showDialog( szText, '', 
    [ 
        {   txt : "back", 
            cb : szCallback, 
            classes : "" }
    ] );
};

CCTLMultiplayerGui.prototype.showOfflineDialog = function(szText, szCallback){
    //var html = '<input type="text" name="nickname" value="'+ this._szNickName +'">';
    
    this._idCurDialog = this.showDialog( szText, '', 
    [ 
        {   txt : "PLAY OFFLINE", 
            cb : szCallback, 
            classes : "ctl-multiplayer-btn-play-offline" }
    ],"ctl-multiplayer-join-a-match-dlg" );
};

CCTLMultiplayerGui.prototype.closeLoadingDialog = function(){
    this.closeDlg(this._idLoadingDialog);
};
CCTLMultiplayerGui.prototype.closeCurrentDialog = function(){
    this.closeDlg(this._idCurDialog);
};


/*framework starts here*/

CCTLMultiplayerGui.prototype.makeCode = function() {
    var code = "";
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 32; i++ )
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code; 
};

CCTLMultiplayerGui.prototype.showDialog = function( szTitle, szHtmlContent, aBtn, id ){
    var szHtml = "";

    if(!id){
        id = this.makeCode();
    }

    szHtml += "<div id='"+id+"' class='"+this._cssClassDomain+"dlg-wrapper'>";
        szHtml += "<div class='"+this._cssClassDomain+"dlg-block'></div>";
        szHtml += "<div class='"+this._cssClassDomain+"dlg-content'>";

            szHtml += '<i class="'+this._cssClassDomain+'icons-cancel"></i>';

            szHtml += "<div class='"+this._cssClassDomain+"dlg-header'>";
                szHtml += "<h1>"+szTitle+"</h1>";                    
            szHtml += "</div>";

            szHtml += "<div class='"+this._cssClassDomain+"dlg-content-body'>";
            szHtml += szHtmlContent;
            szHtml += "</div>";

            if( aBtn && aBtn.length > 0 ){
                szHtml += "<div class='"+this._cssClassDomain+"dlg-footer'>";
                for( var i=0; i < aBtn.length; i++){
                    szHtml += "<button type='button' onclick='" + aBtn[i].cb +
                              "(\""+id+"\");' class='"+this._cssClassDomain+"-mini" + 
                              " "+ aBtn[i].classes +"'>"+
                              aBtn[i].txt+"</button>";
                }
                
                szHtml += this.buildExtraFooter();
                
                szHtml += "</div>";
            }

        szHtml += "</div>";
    szHtml += "</div>";

    jQuery("body").append(szHtml);

    return id;
}; 

CCTLMultiplayerGui.prototype.buildExtraFooter = function(){
    
    var szHtml = "";
    /*
    szHtml += '<div class="'+this._cssClassDomain+'copyright">';
        szHtml += '<a href="http://www.codethislab.com" target="_blank">www.codethislab.com</a>';
    szHtml += "</div>";
    */
    return szHtml;
    
};

CCTLMultiplayerGui.prototype.showLoading = function( szTitle, oBtnCallback ){
    var szHtml = "";
    this._idLoadingDialog = this.makeCode();

    if(!szTitle){
        szTitle = "Loading...";
    }

    szHtml += "<div id='"+this._idLoadingDialog+"' class='"+this._cssClassDomain+"dlg-wrapper " + 
            this._cssClassDomain+"fixed'>";
        szHtml += "<div class='"+this._cssClassDomain+"dlg-block'></div>";
        szHtml += "<div class='"+this._cssClassDomain+"dlg-content'>";

            szHtml += "<div class='"+this._cssClassDomain+"dlg-header'>";
                szHtml += "<h1>"+szTitle+"</h1>";
            szHtml += "</div>";
            szHtml += "<div class='"+this._cssClassDomain+"dlg-content-body "+this._cssClassDomain+"align-center'>";
                szHtml += '<i class="'+this._cssClassDomain+'icons-spin5 animate-spin"></i>';
            szHtml += "</div>";
            
            if( oBtnCallback ){
                szHtml += "<div class='"+this._cssClassDomain+"dlg-footer "+this._cssClassDomain+"center'>";
                //for( var i=0; i < aBtn.length; i++){
                    szHtml += "<button type='button' onclick='" + oBtnCallback +
                              "(\""+this._idLoadingDialog+"\");' class='"+this._cssClassDomain+"-mini" + 
                              " "+ "" +"'>"+
                              "back"+"</button>";
                //}

                szHtml += this.buildExtraFooter();
                
                szHtml += "</div>";
            }
            
        szHtml += "</div>";
    szHtml += "</div>";

    

    jQuery("body").append(szHtml);
};  

CCTLMultiplayerGui.prototype.closeDlg = function(idDlg){
    jQuery('#'+idDlg).remove();
};    

CCTLMultiplayerGui.prototype.closeAllDialog = function(){
    g_oCTLMultiplayer.closeLoadingDialog();
    g_oCTLMultiplayer.closeCurrentDialog();
}; 

CCTLMultiplayerGui.prototype.getIDDialog = function(){
    return this._idLoadingDialog;
}; 

CCTLMultiplayerGui.prototype.setNickName = function( szNickName ){
    this._szNickName = ( (szNickName === null || szNickName === undefined) ? "" : szNickName);
    localStorage.setItem(this._szLocalStorageNicknamePath,this._szNickName);
};

CCTLMultiplayerGui.prototype.getNickname = function(){
    return this._szNickName;
};    

var g_oCTLMultiplayer = new CCTLMultiplayerGui();