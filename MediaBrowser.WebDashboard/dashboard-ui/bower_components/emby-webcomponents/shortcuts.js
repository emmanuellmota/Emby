define(["playbackManager","inputManager","connectionManager","appRouter","globalize","loading","dom","recordingHelper"],function(playbackManager,inputManager,connectionManager,appRouter,globalize,loading,dom,recordingHelper){"use strict";function playAllFromHere(card,serverId,queue){for(var startIndex,parent=card.parentNode,className=card.classList.length?"."+card.classList[0]:"",cards=parent.querySelectorAll(className+"[data-id]"),ids=[],foundCard=!1,i=0,length=cards.length;i<length;i++)cards[i]===card&&(foundCard=!0,startIndex=i),!foundCard&&queue||ids.push(cards[i].getAttribute("data-id"));ids.length&&(queue?playbackManager.queue({ids:ids,serverId:serverId}):playbackManager.play({ids:ids,serverId:serverId,startIndex:startIndex}))}function showProgramDialog(item){require(["recordingCreator"],function(recordingCreator){recordingCreator.show(item.Id,item.ServerId)})}function getItem(button){button=dom.parentWithAttribute(button,"data-id");var serverId=button.getAttribute("data-serverid"),id=button.getAttribute("data-id"),type=button.getAttribute("data-type"),apiClient=connectionManager.getApiClient(serverId);return"Timer"===type?apiClient.getLiveTvTimer(id):"SeriesTimer"===type?apiClient.getLiveTvSeriesTimer(id):apiClient.getItem(apiClient.getCurrentUserId(),id)}function notifyRefreshNeeded(childElement,itemsContainer){(itemsContainer=itemsContainer||dom.parentWithAttribute(childElement,"is","emby-itemscontainer"))&&itemsContainer.notifyRefreshNeeded(!0)}function showContextMenu(card,options){getItem(card).then(function(item){var playlistId=card.getAttribute("data-playlistid"),collectionId=card.getAttribute("data-collectionid");if(playlistId){var elem=dom.parentWithAttribute(card,"data-playlistitemid");item.PlaylistItemId=elem?elem.getAttribute("data-playlistitemid"):null}require(["itemContextMenu"],function(itemContextMenu){connectionManager.getApiClient(item.ServerId).getCurrentUser().then(function(user){itemContextMenu.show(Object.assign({item:item,play:!0,queue:!0,playAllFromHere:!item.IsFolder,queueAllFromHere:!item.IsFolder,playlistId:playlistId,collectionId:collectionId,user:user},options||{})).then(function(result){"playallfromhere"===result.command||"queueallfromhere"===result.command?executeAction(card,options.positionTo,result.command):"removefromplaylist"===result.command||"removefromcollection"===result.command?notifyRefreshNeeded(card,options.itemsContainer):"canceltimer"===result.command?notifyRefreshNeeded(card,options.itemsContainer):(result.updated||result.deleted)&&notifyRefreshNeeded(card,options.itemsContainer)})})})})}function getItemInfoFromCard(card){return{Type:card.getAttribute("data-type"),Id:card.getAttribute("data-id"),TimerId:card.getAttribute("data-timerid"),CollectionType:card.getAttribute("data-collectiontype"),ChannelId:card.getAttribute("data-channelid"),SeriesId:card.getAttribute("data-seriesid"),ServerId:card.getAttribute("data-serverid"),MediaType:card.getAttribute("data-mediatype"),IsFolder:"true"===card.getAttribute("data-isfolder"),UserData:{PlaybackPositionTicks:parseInt(card.getAttribute("data-positionticks")||"0")}}}function showPlayMenu(card,target){var item=getItemInfoFromCard(card);require(["playMenu"],function(playMenu){playMenu.show({item:item,positionTo:target})})}function sendToast(text){require(["toast"],function(toast){toast(text)})}function executeAction(card,target,action){target=target||card;var id=card.getAttribute("data-id");id||(card=dom.parentWithAttribute(card,"data-id"),id=card.getAttribute("data-id"));var item=getItemInfoFromCard(card),serverId=item.ServerId,type=item.Type,playableItemId="Program"===type?item.ChannelId:item.Id;if("Photo"===item.MediaType&&"link"===action&&(action="play"),"link"===action)appRouter.showItem(item,{context:card.getAttribute("data-context"),parentId:card.getAttribute("data-parentid")});else if("programdialog"===action)showProgramDialog(item);else if("instantmix"===action)playbackManager.instantMix({Id:playableItemId,ServerId:serverId});else if("play"===action||"resume"===action){var startPositionTicks=parseInt(card.getAttribute("data-positionticks")||"0");playbackManager.play({ids:[playableItemId],startPositionTicks:startPositionTicks,serverId:serverId})}else if("queue"===action)playbackManager.isPlaying()?(playbackManager.queue({ids:[playableItemId],serverId:serverId}),sendToast(globalize.translate("sharedcomponents#MediaQueued"))):playbackManager.queue({ids:[playableItemId],serverId:serverId});else if("playallfromhere"===action)playAllFromHere(card,serverId);else if("queueallfromhere"===action)playAllFromHere(card,serverId,!0);else if("setplaylistindex"===action)playbackManager.setCurrentPlaylistItem(card.getAttribute("data-playlistitemid"));else if("record"===action)onRecordCommand(serverId,id,type,card.getAttribute("data-timerid"),card.getAttribute("data-seriestimerid"));else if("menu"===action){var options="false"===target.getAttribute("data-playoptions")?{shuffle:!1,instantMix:!1,play:!1,playAllFromHere:!1,queue:!1,queueAllFromHere:!1}:{};options.positionTo=target,showContextMenu(card,options)}else if("playmenu"===action)showPlayMenu(card,target);else if("edit"===action)getItem(target).then(function(item){editItem(item,serverId)});else if("playtrailer"===action)getItem(target).then(playTrailer);else if("addtoplaylist"===action)getItem(target).then(addToPlaylist);else if("custom"===action){var customAction=target.getAttribute("data-customaction");card.dispatchEvent(new CustomEvent("action-"+customAction,{detail:{playlistItemId:card.getAttribute("data-playlistitemid")},cancelable:!1,bubbles:!0}))}}function addToPlaylist(item){require(["playlistEditor"],function(playlistEditor){(new playlistEditor).show({items:[item.Id],serverId:item.ServerId})})}function playTrailer(item){var apiClient=connectionManager.getApiClient(item.ServerId);apiClient.getLocalTrailers(apiClient.getCurrentUserId(),item.Id).then(function(trailers){playbackManager.play({items:trailers})})}function editItem(item,serverId){var apiClient=connectionManager.getApiClient(serverId);return new Promise(function(resolve,reject){var serverId=apiClient.serverInfo().Id;"Timer"===item.Type?item.ProgramId?require(["recordingCreator"],function(recordingCreator){recordingCreator.show(item.ProgramId,serverId).then(resolve,reject)}):require(["recordingEditor"],function(recordingEditor){recordingEditor.show(item.Id,serverId).then(resolve,reject)}):require(["metadataEditor"],function(metadataEditor){metadataEditor.show(item.Id,serverId).then(resolve,reject)})})}function onRecordCommand(serverId,id,type,timerId,seriesTimerId){if("Program"===type||timerId||seriesTimerId){var programId="Program"===type?id:null;recordingHelper.toggleRecording(serverId,programId,timerId,seriesTimerId)}}function onClick(e){var card=dom.parentWithClass(e.target,"itemAction");if(card){var actionElement=card,action=actionElement.getAttribute("data-action");if(action||(actionElement=dom.parentWithAttribute(actionElement,"data-action"))&&(action=actionElement.getAttribute("data-action")),action)return executeAction(card,actionElement,action),e.preventDefault(),e.stopPropagation(),!1}}function onCommand(e){var cmd=e.detail.command;if("play"===cmd||"resume"===cmd||"record"===cmd||"menu"===cmd||"info"===cmd){var target=e.target,card=dom.parentWithClass(target,"itemAction")||dom.parentWithAttribute(target,"data-id");card&&(e.preventDefault(),e.stopPropagation(),executeAction(card,card,cmd))}}function on(context,options){options=options||{},!1!==options.click&&context.addEventListener("click",onClick),!1!==options.command&&inputManager.on(context,onCommand)}function off(context,options){options=options||{},context.removeEventListener("click",onClick),!1!==options.command&&inputManager.off(context,onCommand)}function getShortcutAttributesHtml(item,serverId){var html='data-id="'+item.Id+'" data-serverid="'+(serverId||item.ServerId)+'" data-type="'+item.Type+'" data-mediatype="'+item.MediaType+'" data-channelid="'+item.ChannelId+'" data-isfolder="'+item.IsFolder+'"',collectionType=item.CollectionType;return collectionType&&(html+=' data-collectiontype="'+collectionType+'"'),html}return{on:on,off:off,onClick:onClick,getShortcutAttributesHtml:getShortcutAttributesHtml}});