
// // UI References
const idleScreen = document.getElementById('idle-screen');
const loaderScreen = document.getElementById('loader-screen');
const statusMsg = document.getElementById('status-msg');
const debugLog = document.getElementById('debug-log');
const sendersInfo = document.getElementById('senders-info');
const senderCount = document.getElementById('sender-count');
const toastEl = document.getElementById('toast');

// HELPER FUNCTIONS

function log(msg) {
    console.log('[RECEIVER] ' + msg);
    debugLog.innerText = msg;
}

function showToast(message, duration) {
    duration = duration || 4000;
    toastEl.innerText = message;
    toastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
        toastEl.classList.remove('show');
    }, duration);
}

// --- 0. INITIALIZATION ---
const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const playbackConfig = new cast.framework.PlaybackConfig();
// const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

// --- 0.1 Enable debug logger (optional) ---
// context.addEventListener(cast.framework.system.EventType.READY, () => {
//     if (!castDebugLogger.debugOverlayElement_) {
//         // Enable debug logger and show a 'DEBUG MODE' overlay at top left corner.
//         castDebugLogger.setEnabled(true);
//     }
// });

// --- 0.2 Define a custom namespace for app-specific messages ---
const CUSTOM_NAMESPACE = 'urn:x-cast:com.fossynet.presumiendomx';

// --- 1 CONTEXT EVENT LISTENERS OF CONNECTION STATUS ---
// context.addEventListener(
//     cast.framework.system.EventType.SENDER_CONNECTED,
//     function(event) {
//         log('Sender connected: ' + event.senderId);
//         statusMsg.innerText = 'Conectado';
//     }
// );

// context.addEventListener(
//     cast.framework.system.EventType.READY,
//     function(event) {
//         log('Receiver is ready');
//         statusMsg.innerText = 'Listo para transmitir';
//     }
// );

// context.addEventListener(
//     cast.framework.system.EventType.SENDER_DISCONNECTED,
//     function(event) {
//         log('Sender disconnected: ' + event.senderId);
//         if (context.getSenders().length === 0) {
//             log('All senders disconnected, stopping app');
//             statusMsg.innerText = 'Esperando conexión...';
//         }
//     }
// );


// // --- 2 PLAYER MANAGER INTERCEPTORS AND LISTENERS ---
playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD, loadRequestData => {
    

    if (!loadRequestData.media.entity) {
        // Copy the value from contentId for legacy reasons if needed
        loadRequestData.media.entity = loadRequestData.media.contentId;
    }

    return thirdparty.fetchAssetAndAuth(loadRequestData.media.entity,
                                        loadRequestData.credentials)
    .then(asset => {
        loadRequestData.media.contentUrl = asset.url;
        //   ...
        return loadRequestData;
    });
});


// // --- 2. PLAYER STATE LISTENERS ---
// playerManager.addEventListener(
//     cast.framework.events.EventType.MEDIA_STATUS,
//     function(event) {
//         var state = event.value;
//         switch(state) {
//             case cast.framework.events.EventType.IDLE:
//                 idleScreen.classList.remove('hide');
//                 loaderScreen.classList.add('hide');
//                 updateSenderUI(); 
//                 break;
//             case cast.framework.events.EventType.BUFFERING:
//             case cast.framework.events.EventType.LOADING:
//                 idleScreen.classList.remove('hide');
//                 loaderScreen.classList.add('active');
//                 break;
//             case cast.framework.events.EventType.PLAYING:
//                 idleScreen.classList.add('hide');
//                 loaderScreen.classList.remove('active');
//                 break;
//             case cast.framework.events.EventType.PAUSED:
//                 loaderScreen.classList.remove('active');
//                 break;
//         }
//         broadcastStatus('PLAYER_STATE_CHANGED', { playerState: state });
//     }
// );

// playerManager.setMessageInterceptor(
//     cast.framework.messages.MessageType.LOAD,
//     function(loadRequestData) {
//         if (loadRequestData.media && loadRequestData.media.metadata) {
//             var title = loadRequestData.media.metadata.title;
//             statusMsg.innerText = 'Loading: ' + title;
//             showToast('Loading: ' + title);
//         }
//         return loadRequestData;
//     }
// );

context.start({
    // playbackConfig: playbackConfig,
    playerManager: playerManager,
    // castDebugLogger: castDebugLogger
});
